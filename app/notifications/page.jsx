'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";
import { FaPlus, FaEdit, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { Switch, Snackbar, Alert } from '@mui/material';
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

        const subscription = supabase
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

        return () => {
            supabase.removeChannel(subscription);
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

    return (
        <div className="flex h-screen">
            <Sidebar handleLogout={handleLogout} />
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto relative">
                <div className="p-4 font-bold text-gray-700 flex items-center justify-between">
                    <span>{showNotifications ? "Notifications" : "Drafts"}</span>
                    <Switch
                        checked={showNotifications}
                        onChange={() => setShowNotifications(!showNotifications)}
                        color="primary"
                    />
                </div>
                {showNotifications ? (
                    notifications.length > 0 ? (
                        notifications.map((group, index) => (
                            <div key={index} className="mb-4">
                                <div className="text-xs text-gray-500 mb-2">{new Date(group.items[0].sent_at).toLocaleString()}</div>
                                <div className="flex items-center px-4 py-2 hover:bg-gray-200 cursor-pointer rounded-lg shadow-md mb-2" onClick={() => handleNotificationClick(group)}>
                                    <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                                    <div className="ml-4 flex-1">
                                        <div className="font-bold text-gray-800">{getTargetGroupLabel(group.items[0].target_group)}</div>
                                        <div className="text-sm text-gray-600">{group.message}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-gray-600">No notifications yet.</div>
                    )
                ) : (
                    drafts.length > 0 ? (
                        drafts.map((group, index) => (
                            <div key={index} className="mb-4">
                                <div className="text-xs text-gray-500 mb-2">{new Date(group.items[0].sent_at).toLocaleString()}</div>
                                <div className="flex items-center px-4 py-2 hover:bg-yellow-200 cursor-pointer rounded-lg shadow-md mb-2">
                                    <div className="ml-4 flex-1">
                                        <div className="font-bold text-gray-800">{getTargetGroupLabel(group.items[0].target_group)}</div>
                                        <div className="text-sm text-gray-600">{group.message.slice(0, 30)}...</div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            className="bg-blue-500 text-white px-2 py-1 rounded"
                                            onClick={() => setNotificationContent(group.message)}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="bg-red-500 text-white px-2 py-1 rounded"
                                            onClick={() => deleteDraft(group.items[0].notification_id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-gray-600">No drafts available.</div>
                    )
                )}
                <button
                    className="fixed bottom-4 right-4 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700"
                    onClick={handleCreateNewNotification}
                >
                    <FaPlus />
                </button>
            </div>

            {/* Notification Form */}
            <div className="flex-1 flex flex-col bg-gray-200">
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    {selectedUser ? selectedUser.name : "Compose Notification"}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedNotification ? (
                        <div className="p-4 bg-white rounded-lg shadow-md">
                            <div className="font-bold text-gray-800">{getTargetGroupLabel(selectedNotification.items[0].target_group)}</div>
                            <div className="text-sm text-gray-600">{selectedNotification.message}</div>
                            <div className="text-xs text-gray-500">{new Date(selectedNotification.items[0].sent_at).toLocaleString()}</div>
                        </div>
                    ) : (
                        <textarea
                            className="w-full p-4 rounded-lg shadow-md bg-white text-black"
                            rows="4"
                            placeholder="Type your notification here..."
                            value={notificationContent}
                            onChange={(e) => setNotificationContent(e.target.value)}
                        />
                    )}
                    <div className="flex space-x-4">
                        <select className="p-2 rounded-lg bg-white text-black" value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
                            <option value="all">All Users</option>
                            <option value="counselors">All Counselors</option>
                            <option value="secretaries">All Secretaries</option>
                            <option value="counselors_and_secretaries">All Counselors and Secretaries</option>
                            <option value="students">All Students</option>
                        </select>
                        <button className="bg-emerald-600 text-white px-4 py-2 rounded" onClick={() => saveNotification("sent")}>
                            <FaPaperPlane className="inline mr-2" /> Send
                        </button>
                        <button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={() => saveNotification("draft")}>
                            <FaEdit className="inline mr-2" /> Save as Draft
                        </button>
                    </div>
                </div>
            </div>

            {/* User Selection Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-gray-700 p-4 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Select User</h2>
                        <ul>
                            {users.map((user) => (
                                <li
                                    key={user.user_id}
                                    className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    {user.name}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            onClick={() => setShowUserModal(false)}
                        >
                            Cancel
                        </button>
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

// check notification feature and analyze group notification logic