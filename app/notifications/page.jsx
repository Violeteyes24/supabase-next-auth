'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";
import { FaPlus, FaEdit, FaTrash, FaPaperPlane, FaBell, FaRegStickyNote } from 'react-icons/fa';
import { Switch, Snackbar, Alert, Badge } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [notifications, setNotifications] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [notificationContent, setNotificationContent] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [status, setStatus] = useState('sent');
    const [showNotifications, setShowNotifications] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [alert, setAlert] = useState({
        open: false,
        message: '',
        severity: 'info' // 'error', 'warning', 'info', 'success'
    });

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error("No session found");
                return;
            }

            const userId = session.user.id;

            const { data: sentNotifications, error: sentError } = await supabase
                .from("notifications")
                .select(`
                    notification_id,
                    user_id,
                    notification_content,
                    sent_at,
                    status,
                    target_group, 
                    users (name)
                `)
                .eq("status", "sent")
                .eq("user_id", userId)
                .order("sent_at", { ascending: false });

            const { data: draftNotifications, error: draftError } = await supabase
                .from("notifications")
                .select(`
                    notification_id,
                    user_id,
                    notification_content,
                    sent_at,
                    status,
                    target_group, 
                    users (name)
                `)
                .eq("status", "draft")
                .eq("user_id", userId);

            if (sentError || draftError) {
                console.error("Error fetching notifications:", sentError || draftError);
            } else {
                setNotifications(groupByMessage(sentNotifications || []));
                setDrafts(groupByMessage(draftNotifications || []));
            }
        };

        fetchNotifications();
        fetchUsers();

        const notificationSubscription = supabase
            .channel("realtime-notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications" },
                (payload) => {
                    setNotifications((prevNotifications) => [
                        { ...payload.new },
                        ...prevNotifications,
                    ]);
                }
            )
            .subscribe();

        // Modified appointment cancellation subscription
        let appointmentSubscription;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error("No session found for appointment subscription");
                return;
            }
            const currentUserId = session.user.id;
            appointmentSubscription = supabase
                .channel("realtime-appointments")
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "appointments",
                        filter: `status=eq.cancelled`
                    },
                    async (payload) => {
                        if (payload.new.user_id === currentUserId) {
                            // Get the name of the person who cancelled
                            const { data: cancellerData, error: cancellerError } = await supabase
                                .from("users")
                                .select("name")
                                .eq("user_id", payload.new.counselor_id)
                                .single();
                            console.log("canceller: ", data)
                            const cancellerName = cancellerError ? "Unknown" : cancellerData.name;
                            const message = `Your appointment has been cancelled by ${cancellerName}`;
                            
                            showAlert(message, "warning");
                            
                            // Add a system notification to the list
                            const systemNotification = {
                                message: message,
                                items: [{
                                    notification_id: "system-" + new Date().getTime(),
                                    target_group: "system",
                                    sent_at: new Date().toISOString(),
                                    sender: "System"
                                }]
                            };
                            
                            setNotifications(prev => [systemNotification, ...prev]);
                        }
                    }
                )
                .subscribe();
        })();

        return () => {
            supabase.removeChannel(notificationSubscription);
            if (appointmentSubscription) {
                supabase.removeChannel(appointmentSubscription);
            }
        };
    }, [users]);

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, user_type");

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
    };

    const showAlert = (message, severity = 'info') => {
        setAlert({
            open: true,
            message,
            severity
        });
    };

    const handleCloseAlert = () => {
        setAlert(prev => ({ ...prev, open: false }));
    };

    const saveNotification = async (newStatus) => {
        if (!notificationContent.trim()) {
            showAlert('Please enter notification content', 'error');
            return;
        }

        let targetUsers = [];
        switch (targetGroup) {
            case 'all': targetUsers = users; break;
            case 'counselors': targetUsers = users.filter(user => user.user_type === 'counselor'); break;
            case 'secretaries': targetUsers = users.filter(user => user.user_type === 'secretary'); break;
            case 'counselors_and_secretaries': targetUsers = users.filter(user => user.user_type === 'counselor' || user.user_type === 'secretary'); break;
            case 'students': targetUsers = users.filter(user => user.user_type === 'student'); break;
            default: targetUsers = [];
        }

        if (targetUsers.length === 0) {
            showAlert(`No ${targetGroup} found to send notification to`, 'warning');
            return;
        }

        try {
            const notificationsToInsert = targetUsers.map(user => ({
                user_id: user.user_id,
                notification_content: notificationContent,
                sent_at: newStatus === "sent" ? new Date().toISOString() : null,
                status: newStatus,
                target_group: targetGroup
            }));

            const { error } = await supabase
                .from("notifications")
                .insert(notificationsToInsert);

            if (error) throw error;

            showAlert(
                `Notification ${newStatus === 'sent' ? 'sent' : 'saved as draft'} successfully to ${targetUsers.length} ${targetGroup}!`,
                'success'
            );
            setNotificationContent('');
            
        } catch (error) {
            console.error(`Error saving notification:`, error);
            showAlert(`Failed to ${newStatus === 'sent' ? 'send' : 'save'} notification: ${error.message}`, 'error');
        }
    };

    const deleteDraft = async (draftId) => {
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("notification_id", draftId);

            if (error) throw error;
            
            setDrafts(drafts.filter(draft => draft.notification_id !== draftId));
            showAlert('Draft deleted successfully', 'success');
            
        } catch (error) {
            console.error("Error deleting draft:", error);
            showAlert('Failed to delete draft: ' + error.message, 'error');
        }
    };

    const groupByMessage = (items) => {
        const grouped = items.reduce((acc, item) => {
            const message = item.notification_content;
            if (!acc[message]) {
                acc[message] = [];
            }
            acc[message].push(item);
            return acc;
        }, {});
        return Object.entries(grouped).map(([message, items]) => ({ message, items }));
    };

    const handleNotificationClick = (notification) => {
        setSelectedNotification(notification);
    };

    const getTargetGroupLabel = (targetGroup) => {
        switch (targetGroup) {
            case 'all': return 'All Users';
            case 'counselors': return 'All Counselors';
            case 'secretaries': return 'All Secretaries';
            case 'counselors_and_secretaries': return 'All Counselors and Secretaries';
            case 'students': return 'All Students';
            case 'system': return 'System';
            default: return 'Unknown Group';
        }
    };

    const handleCreateNewNotification = () => {
        setSelectedNotification(null);
        setNotificationContent('');
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    const getTargetGroupIcon = (targetGroup) => {
        switch (targetGroup) {
            case 'all': return '👥';
            case 'counselors': return '👨‍⚕️';
            case 'secretaries': return '👩‍💼';
            case 'counselors_and_secretaries': return '👥';
            case 'students': return '👨‍🎓';
            case 'system': return '🤖';
            default: return '👤';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' + 
               date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    const getSenderName = (notification) => {
        if (notification.items[0].target_group === 'system') {
            return 'System';
        }
        return notification.items[0].users?.name || 'Unknown';
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar handleLogout={handleLogout} />
            <div className="w-1/3 bg-white border-r overflow-y-auto relative shadow-md">
                <div className="sticky top-0 bg-white z-10">
                    <div className="p-4 font-bold text-gray-800 flex items-center justify-between border-b">
                        <div className="flex items-center">
                            {showNotifications ? 
                                <><FaBell className="mr-2 text-emerald-600" /> Sent Notifications</> : 
                                <><FaRegStickyNote className="mr-2 text-amber-500" /> Drafts</>
                            }
                        </div>
                        <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">{showNotifications ? "Drafts" : "Sent"}</span>
                            <Switch
                                checked={showNotifications}
                                onChange={() => setShowNotifications(!showNotifications)}
                                color="primary"
                                size="small"
                            />
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-b">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Search notifications..." 
                                className="w-full px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="divide-y">
                    {showNotifications ? (
                        notifications.length > 0 ? (
                            notifications.map((group, index) => (
                                <div key={index} 
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150
                                        ${selectedNotification === group ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`} 
                                    onClick={() => handleNotificationClick(group)}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 
                                                    ${group.items[0].target_group === 'system' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {getTargetGroupIcon(group.items[0].target_group)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">
                                                        {group.items[0].target_group === 'system' ? 'System' : getTargetGroupLabel(group.items[0].target_group)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatDate(group.items[0].sent_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge color="primary" badgeContent={group.items.length} max={99} />
                                        </div>
                                        <div className="text-sm text-gray-600 pl-12 line-clamp-2">{group.message}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                       <div className="text-5xl mb-4">📭</div>
                                <p>No sent notifications yet.</p>
                                <p className="text-sm mt-1">Create a new notification to get started.</p>
                            </div>
                        )
                    ) : (
                        drafts.length > 0 ? (
                            drafts.map((group, index) => (
                                <div key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg text-amber-600 mr-3">
                                                    {getTargetGroupIcon(group.items[0].target_group)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">{getTargetGroupLabel(group.items[0].target_group)}</div>
                                                    <div className="text-xs text-gray-500">Draft</div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full transition-colors"
                                                    onClick={() => {
                                                        setNotificationContent(group.message);
                                                        setTargetGroup(group.items[0].target_group);
                                                        setSelectedNotification(null);
                                                    }}
                                                >
                                                    <FaEdit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors"
                                                    onClick={() => deleteDraft(group.items[0].notification_id)}
                                                >
                                                    <FaTrash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 pl-12 line-clamp-2">{group.message}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-5xl mb-4">📝</div>
                                <p>No drafts available.</p>
                                <p className="text-sm mt-1">Save a draft to see it here.</p>
                            </div>
                        )
                    )}
                </div>

                <button
                    className="fixed bottom-6 right-90 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 flex items-center justify-center"
                    onClick={handleCreateNewNotification}
                    title="Create new notification"
                >
                    <FaPlus className="w-5 h-5" />
                </button>
            </div>

            {/* Notification Form */}
            <div className="flex-1 flex flex-col">
                <div className="bg-gray-800 text-white py-4 px-6 shadow-md">
                    <h1 className="text-xl font-bold">
                        {selectedNotification ? "View Notification" : "Compose Notification"}
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {selectedNotification ? (
                        <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
                            <div className="mb-6">
                                <div className="flex items-center mb-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mr-4
                                        ${selectedNotification.items[0].target_group === 'system' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {getTargetGroupIcon(selectedNotification.items[0].target_group)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">
                                            {selectedNotification.items[0].target_group === 'system' ? 'System Notification' : getTargetGroupLabel(selectedNotification.items[0].target_group)}
                                        </h2>
                                        <div className="text-sm text-gray-500">
                                            {selectedNotification.items[0].target_group === 'system' ? 
                                                'System Alert' : 
                                                `Sent on ${formatDate(selectedNotification.items[0].sent_at)}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-b py-6 my-4">
                                    <div className="text-gray-700 whitespace-pre-wrap">
                                        {selectedNotification.message}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {selectedNotification.items[0].target_group === 'system' ? 
                                        'Automated system notification' : 
                                        `Delivered to ${selectedNotification.items.length} recipients`}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button 
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors duration-200"
                                    onClick={handleCreateNewNotification}
                                >
                                    Close
                                </button>
                                {selectedNotification.items[0].target_group !== 'system' && (
                                    <button 
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors duration-200"
                                        onClick={() => {
                                            setNotificationContent(selectedNotification.message);
                                            setTargetGroup(selectedNotification.items[0].target_group);
                                            setSelectedNotification(null);
                                        }}
                                    >
                                        Re-use Content
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">New Notification</h2>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Recipients
                                </label>
                                <select 
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                                    value={targetGroup} 
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                >
                                    <option value="all">All Users</option>
                                    <option value="counselors">All Counselors</option>
                                    <option value="secretaries">All Secretaries</option>
                                    <option value="counselors_and_secretaries">All Counselors and Secretaries</option>
                                    <option value="students">All Students</option>
                                </select>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notification Content
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-md h-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="Type your notification message here..."
                                    value={notificationContent}
                                    onChange={(e) => setNotificationContent(e.target.value)}
                                ></textarea>
                                <div className="text-right text-sm text-gray-500 mt-1">
                                    {notificationContent.length} characters
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                                <button 
                                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors duration-200 flex items-center"
                                    onClick={() => saveNotification("draft")}
                                >
                                    <FaEdit className="mr-2" /> Save as Draft
                                </button>
                                <button 
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-md text-white transition-colors duration-200 flex items-center"
                                    onClick={() => saveNotification("sent")}
                                >
                                    <FaPaperPlane className="mr-2" /> Send Notification
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* User Selection Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Select User</h2>
                        <div className="max-h-60 overflow-y-auto">
                            <ul className="divide-y">
                                {users.map((user) => (
                                    <li
                                        key={user.user_id}
                                        className="cursor-pointer hover:bg-gray-100 p-3 rounded flex items-center transition-colors"
                                        onClick={() => handleUserSelect(user)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mr-3">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{user.name}</span>
                                        <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded-full">
                                            {user.user_type}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors"
                                onClick={() => setShowUserModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Snackbar 
                open={alert.open} 
                autoHideDuration={6000} 
                onClose={handleCloseAlert}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseAlert} 
                    severity={alert.severity}
                    sx={{ width: '100%' }}
                >
                    {alert.message}
                </Alert>
            </Snackbar>
        </div>
    );
}             