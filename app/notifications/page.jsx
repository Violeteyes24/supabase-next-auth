'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";
import { FaPlus, FaEdit, FaTrash, FaPaperPlane, FaBell, FaRegStickyNote } from 'react-icons/fa';
import { Switch, Snackbar, Alert, Badge, TextField, Button, Card, Typography, Chip, IconButton, Divider, CardContent, Box, Skeleton } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [notifications, setNotifications] = useState([]);
    const [cancellationNotifications, setCancellationNotifications] = useState([]);
    const [rescheduledNotifications, setRescheduledNotifications] = useState([]);
    const [statusChangeNotifications, setStatusChangeNotifications] = useState([]);
    const [groupNotifications, setGroupNotifications] = useState([]);
    const [showCancellations, setShowCancellations] = useState(false);
    const [showRescheduled, setShowRescheduled] = useState(false);
    const [showStatusChanges, setShowStatusChanges] = useState(false);
    const [showGroupNotifications, setShowGroupNotifications] = useState(false);
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
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch notifications
                    const { data: notificationsData, error: notificationsError } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('status', 'sent')
                        .order('sent_at', { ascending: false });

                    if (notificationsError) throw notificationsError;

                    // Fetch drafts
                    const { data: draftsData, error: draftsError } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('status', 'draft')
                        .eq('user_id', user.id)
                        .order('sent_at', { ascending: false });

                    if (draftsError) throw draftsError;

                    // Fetch users for the dropdown
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('user_id, name, user_type');

                    if (usersError) throw usersError;

                    // Process notifications to group by message
                    const processedNotifications = groupByMessage(notificationsData || []);
                    
                    // Filter cancellation notifications
                    const cancellations = processedNotifications.filter(notification => 
                        notification.message.includes('cancelled their') && 
                        notification.message.includes('appointment')
                    );
                    
                    // Filter rescheduled notifications
                    const rescheduled = processedNotifications.filter(notification => 
                        notification.message.includes('rescheduled their') && 
                        notification.message.includes('appointment')
                    );
                    
                    // Filter group appointment notifications
                    const groupAppts = processedNotifications.filter(notification => 
                        notification.message.includes('Group session') || 
                        (notification.message.includes('group') && notification.message.includes('appointment'))
                    );
                    
                    // Combined status changes (cancelled + rescheduled)
                    const statusChanges = processedNotifications.filter(notification => 
                        (notification.message.includes('cancelled their') || notification.message.includes('rescheduled their')) && 
                        notification.message.includes('appointment')
                    );
                    
                    // Set state with fetched data
                    setNotifications(processedNotifications || []);
                    setCancellationNotifications(cancellations || []);
                    setRescheduledNotifications(rescheduled || []);
                    setGroupNotifications(groupAppts || []);
                    setStatusChangeNotifications(statusChanges || []);
                    setDrafts(groupByMessage(draftsData || []));
                    setUsers(usersData || []);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setAlert({
                    open: true,
                    message: 'Failed to load data: ' + error.message,
                    severity: 'error'
                });
                setLoading(false);
            }
        };

        fetchNotifications();

        // Set up real-time subscription for notifications
        const notificationsSubscription = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => fetchNotifications()
            )
            .subscribe();

        return () => {
            notificationsSubscription.unsubscribe();
        };
    }, [supabase]);

    const fetchCancellationNotifications = async () => {
        try {
            setLoading(true);
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Direct query for cancellation notifications using LIKE
            const { data: cancellationData, error: cancellationError } = await supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('target_group', 'system')
                .ilike('notification_content', '%cancelled their%appointment%')
                .order('sent_at', { ascending: false });

            if (cancellationError) throw cancellationError;

            // Process and set cancellation notifications
            const processedCancellations = groupByMessage(cancellationData || []);
            setCancellationNotifications(processedCancellations || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching cancellation notifications:', error);
            setAlert({
                open: true,
                message: 'Failed to load cancellation data: ' + error.message,
                severity: 'error'
            });
            setLoading(false);
        }
    };

    const fetchRescheduledNotifications = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: rescheduledData, error: rescheduledError } = await supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('target_group', 'system')
                .ilike('notification_content', '%rescheduled their%appointment%')
                .order('sent_at', { ascending: false });

            if (rescheduledError) throw rescheduledError;

            const processedRescheduled = groupByMessage(rescheduledData || []);
            setRescheduledNotifications(processedRescheduled || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching rescheduled notifications:', error);
            setAlert({
                open: true,
                message: 'Failed to load rescheduled data: ' + error.message,
                severity: 'error'
            });
            setLoading(false);
        }
    };
    
    const fetchStatusChangeNotifications = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: statusChangeData, error: statusChangeError } = await supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('target_group', 'system')
                .or('notification_content.ilike.%cancelled their%appointment%,notification_content.ilike.%rescheduled their%appointment%')
                .order('sent_at', { ascending: false });

            if (statusChangeError) throw statusChangeError;

            const processedStatusChanges = groupByMessage(statusChangeData || []);
            setStatusChangeNotifications(processedStatusChanges || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching status change notifications:', error);
            setAlert({
                open: true,
                message: 'Failed to load status change data: ' + error.message,
                severity: 'error'
            });
            setLoading(false);
        }
    };
    
    const fetchGroupNotifications = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: groupData, error: groupError } = await supabase
                .from('notifications')
                .select('*')
                .eq('status', 'sent')
                .eq('target_group', 'system')
                .or('notification_content.ilike.%Group session%,notification_content.ilike.%group%appointment%')
                .order('sent_at', { ascending: false });

            if (groupError) throw groupError;

            const processedGroup = groupByMessage(groupData || []);
            setGroupNotifications(processedGroup || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching group notifications:', error);
            setAlert({
                open: true,
                message: 'Failed to load group notification data: ' + error.message,
                severity: 'error'
            });
            setLoading(false);
        }
    };

    // Effects to load specific notification types when filters are turned on
    useEffect(() => {
        if (showCancellations) {
            fetchCancellationNotifications();
        }
    }, [showCancellations]);
    
    useEffect(() => {
        if (showRescheduled) {
            fetchRescheduledNotifications();
        }
    }, [showRescheduled]);
    
    useEffect(() => {
        if (showStatusChanges) {
            fetchStatusChangeNotifications();
        }
    }, [showStatusChanges]);
    
    useEffect(() => {
        if (showGroupNotifications) {
            fetchGroupNotifications();
        }
    }, [showGroupNotifications]);

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

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Filter target users based on targetGroup
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

            // Create notifications for each target user
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

    const formatHighlightedMessage = (message) => {
        if (!message) return '';
        
        if (message.includes('cancelled their')) {
            const parts = message.split('cancelled their');
            // Extract student name at the beginning
            const studentName = parts[0].trim();
            // Extract appointment details after cancelled their
            const appointmentDetails = parts[1].trim();
            
            return (
                <span>
                    <span className="font-medium text-gray-800">{studentName}</span>
                    <span className="font-medium text-red-600"> cancelled their </span>
                    <span>{appointmentDetails}</span>
                </span>
            );
        }
        
        if (message.includes('has been rescheduled')) {
            const parts = message.split('appointment has been rescheduled');
            const studentInfo = parts[0].trim();
            const appointmentDetails = parts[1].trim();
            
            return (
                <span>
                    <span className="font-medium text-gray-800">{studentInfo}</span>
                    <span className="font-medium text-amber-600"> appointment has been rescheduled</span>
                    <span>{appointmentDetails}</span>
                </span>
            );
        }
        
        if (message.includes('rescheduled their')) {
            const parts = message.split('rescheduled their');
            const studentName = parts[0].trim();
            const appointmentDetails = parts[1].trim();
            
            return (
                <span>
                    <span className="font-medium text-gray-800">{studentName}</span>
                    <span className="font-medium text-amber-600"> rescheduled their </span>
                    <span>{appointmentDetails}</span>
                </span>
            );
        }
        
        if (message.includes('Group session')) {
            if (message.includes('cancelled')) {
                return (
                    <span>
                        <span className="font-medium text-purple-600">Group session </span>
                        {message.replace('Group session ', '')}
                    </span>
                );
            } else {
                return (
                    <span>
                        <span className="font-medium text-purple-600">Group session </span>
                        {message.replace('Group session ', '')}
                    </span>
                );
            }
        }
        
        return message;
    };

    // Loading skeleton component with shimmer effect
    const NotificationsSkeleton = () => (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar skeleton */}
            <div className="w-64 bg-gray-800" />
            
            <div className="flex-1 p-6 relative overflow-hidden">
                {/* Shimmer overlay */}
                <Box 
                    sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
                        animation: 'shimmer 2s infinite',
                        '@keyframes shimmer': {
                            '0%': { transform: 'translateX(-100%)' },
                            '100%': { transform: 'translateX(100%)' }
                        },
                        zIndex: 10
                    }}
                />
                
                {/* Header */}
                <div className="mb-6">
                    <Skeleton variant="text" width={300} height={40} />
                    <Skeleton variant="text" width={200} height={24} sx={{ mt: 1 }} />
                </div>
                
                {/* Form area */}
                <div className="mb-8">
                    <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1, mb: 2 }} />
                    <Skeleton variant="rectangular" width="100%" height={150} sx={{ borderRadius: 1, mb: 2 }} />
                    <div className="flex justify-between">
                        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 20 }} />
                        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 20 }} />
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex mb-4">
                    <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 20, mr: 2 }} />
                    <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 20 }} />
                </div>
                
                {/* Notification cards */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton 
                            key={i}
                            variant="rectangular" 
                            width="100%" 
                            height={150} 
                            sx={{ borderRadius: 2 }} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    const getFilteredNotifications = () => {
        if (showCancellations) {
            return cancellationNotifications;
        } else if (showRescheduled) {
            return rescheduledNotifications;
        } else if (showStatusChanges) {
            return statusChangeNotifications;
        } else if (showGroupNotifications) {
            return groupNotifications;
        } else {
            return notifications;
        }
    };

    const getNotificationIcon = (message) => {
        if (message.includes('cancelled their')) {
            return '🚫';
        } else if (message.includes('rescheduled their') || message.includes('has been rescheduled')) {
            return '🔄';
        } else if (message.includes('Group session')) {
            return '👥';
        } else {
            return getTargetGroupIcon('system');
        }
    };

    const getEmptyStateIcon = () => {
        if (showCancellations) {
            return '🗓️';
        } else if (showRescheduled) {
            return '🔄';
        } else if (showStatusChanges) {
            return '📊';
        } else if (showGroupNotifications) {
            return '👥';
        } else {
            return '📭';
        }
    };

    const getEmptyStateMessage = () => {
        if (showCancellations) {
            return 'No cancellation notifications found.';
        } else if (showRescheduled) {
            return 'No rescheduled appointment notifications found.';
        } else if (showStatusChanges) {
            return 'No appointment status change notifications found.';
        } else if (showGroupNotifications) {
            return 'No group session notifications found.';
        } else {
            return 'No sent notifications yet.';
        }
    };

    const getEmptyStateDescription = () => {
        if (showCancellations) {
            return 'When students cancel appointments, you\'ll see them here.';
        } else if (showRescheduled) {
            return 'When students reschedule appointments, you\'ll see them here.';
        } else if (showStatusChanges) {
            return 'When appointment statuses change, you\'ll see them here.';
        } else if (showGroupNotifications) {
            return 'When group sessions are created or updated, you\'ll see them here.';
        } else {
            return 'Create a new notification to get started.';
        }
    };

    if (loading) {
        return <NotificationsSkeleton />;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar handleLogout={handleLogout} />
            <div className="w-1/3 bg-white border-r overflow-y-auto relative shadow-md">
                <div className="sticky top-0 bg-white z-10">
                    <div className="p-4 font-bold text-gray-800 flex items-center justify-between border-b shadow-sm">
                        <div className="flex items-center">
                            {showNotifications ? 
                                <><FaBell className="mr-2 text-emerald-600" /> Sent Notifications 
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    {notifications.length}
                                </span></> : 
                                <><FaRegStickyNote className="mr-2 text-amber-500" /> Drafts
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    {drafts.length}
                                </span></>
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
                    {showNotifications && (
                        <div className="px-5 py-4 bg-gray-100 border-b overflow-x-auto shadow-sm">
                            <div className="text-sm font-medium mb-4 text-black">Filters:</div>
                            <div className="flex space-x-5 flex-nowrap pb-2 px-1">
                                <Button 
                                    size="small"
                                    variant={!showCancellations && !showRescheduled && !showStatusChanges && !showGroupNotifications ? "contained" : "outlined"}
                                    color="primary"
                                    onClick={() => {
                                        setShowCancellations(false);
                                        setShowRescheduled(false);
                                        setShowStatusChanges(false);
                                        setShowGroupNotifications(false);
                                    }}
                                    sx={{ textTransform: 'none', minWidth: 'auto', px: 3.5, py: 1, position: 'relative' }}
                                >
                                    All
                                </Button>
                                <Button 
                                    size="small"
                                    variant={showCancellations ? "contained" : "outlined"}
                                    color="error"
                                    onClick={() => {
                                        setShowCancellations(!showCancellations);
                                        if (!showCancellations) {
                                            setShowRescheduled(false);
                                            setShowStatusChanges(false);
                                            setShowGroupNotifications(false);
                                        }
                                    }}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', px: 3.5, py: 1, position: 'relative' }}
                                >
                                    Cancellations
                                    {cancellationNotifications.length > 0 && 
                                        <Badge 
                                            color="error" 
                                            badgeContent={cancellationNotifications.length} 
                                            max={99}
                                            sx={{ 
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                '& .MuiBadge-badge': { 
                                                    backgroundColor: showCancellations ? '#fff' : '#ef4444',
                                                    color: showCancellations ? '#ef4444' : '#fff'
                                                } 
                                            }}
                                        />
                                    }
                                </Button>
                                <Button 
                                    size="small"
                                    variant={showRescheduled ? "contained" : "outlined"}
                                    color="warning"
                                    onClick={() => {
                                        setShowRescheduled(!showRescheduled);
                                        if (!showRescheduled) {
                                            setShowCancellations(false);
                                            setShowStatusChanges(false);
                                            setShowGroupNotifications(false);
                                        }
                                    }}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', px: 3.5, py: 1, position: 'relative' }}
                                >
                                    Rescheduled
                                    {rescheduledNotifications.length > 0 && 
                                        <Badge 
                                            color="warning" 
                                            badgeContent={rescheduledNotifications.length} 
                                            max={99}
                                            sx={{ 
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                '& .MuiBadge-badge': { 
                                                    backgroundColor: showRescheduled ? '#fff' : '#f59e0b',
                                                    color: showRescheduled ? '#f59e0b' : '#fff'
                                                } 
                                            }}
                                        />
                                    }
                                </Button>
                                {/* <Button 
                                    size="small"
                                    variant={showStatusChanges ? "contained" : "outlined"}
                                    color="info"
                                    onClick={() => {
                                        setShowStatusChanges(!showStatusChanges);
                                        if (!showStatusChanges) {
                                            setShowCancellations(false);
                                            setShowRescheduled(false);
                                            setShowGroupNotifications(false);
                                        }
                                    }}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', px: 3.5, py: 1, position: 'relative' }}
                                >
                                    Status Changes
                                    {statusChangeNotifications.length > 0 && 
                                        <Badge 
                                            color="info" 
                                            badgeContent={statusChangeNotifications.length} 
                                            max={99}
                                            sx={{ 
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                '& .MuiBadge-badge': { 
                                                    backgroundColor: showStatusChanges ? '#fff' : '#3b82f6',
                                                    color: showStatusChanges ? '#3b82f6' : '#fff'
                                                } 
                                            }}
                                        />
                                    }
                                </Button> */}
                                <Button 
                                    size="small"
                                    variant={showGroupNotifications ? "contained" : "outlined"}
                                    color="secondary"
                                    onClick={() => {
                                        setShowGroupNotifications(!showGroupNotifications);
                                        if (!showGroupNotifications) {
                                            setShowCancellations(false);
                                            setShowRescheduled(false);
                                            setShowStatusChanges(false);
                                        }
                                    }}
                                    sx={{ textTransform: 'none', whiteSpace: 'nowrap', px: 3.5, py: 1, position: 'relative' }}
                                >
                                    Group Sessions
                                    {groupNotifications.length > 0 && 
                                        <Badge 
                                            color="secondary" 
                                            badgeContent={groupNotifications.length} 
                                            max={99}
                                            sx={{ 
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                '& .MuiBadge-badge': { 
                                                    backgroundColor: showGroupNotifications ? '#fff' : '#9333ea',
                                                    color: showGroupNotifications ? '#9333ea' : '#fff'
                                                } 
                                            }}
                                        />
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
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
                        (getFilteredNotifications().length > 0) ? (
                            getFilteredNotifications().map((group, index) => (
                                <div key={index} 
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150 bg-white shadow-sm mb-3
                                        ${selectedNotification === group ? 'bg-emerald-50 border-l-4 border-emerald-500' : 
                                          (group.message.includes('cancelled their') && !showCancellations) ? 
                                          'border-l-4 border-red-400' : 
                                          ((group.message.includes('rescheduled their') || group.message.includes('has been rescheduled')) && !showRescheduled) ?
                                          'border-l-4 border-amber-400' :
                                          (group.message.includes('Group session') && !showGroupNotifications) ?
                                          'border-l-4 border-purple-400' : ''}`} 
                                    onClick={() => handleNotificationClick(group)}>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg mr-4 
                                                    ${group.items[0].target_group === 'system' && group.message.includes('cancelled their') ? 
                                                      'bg-red-100 text-red-600' : 
                                                      group.items[0].target_group === 'system' && (group.message.includes('rescheduled their') || group.message.includes('has been rescheduled')) ?
                                                      'bg-amber-100 text-amber-600' :
                                                      group.items[0].target_group === 'system' && group.message.includes('Group session') ?
                                                      'bg-purple-100 text-purple-600' :
                                                      group.items[0].target_group === 'system' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                    {getNotificationIcon(group.message)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800 flex items-center flex-wrap">
                                                        {group.items[0].target_group === 'system' ? 'System' : getTargetGroupLabel(group.items[0].target_group)}
                                                        {group.message.includes('cancelled their') && 
                                                            <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full mt-1">Cancellation</span>
                                                        }
                                                        {(group.message.includes('rescheduled their') || group.message.includes('has been rescheduled')) && 
                                                            <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full mt-1">Rescheduled</span>
                                                        }
                                                        {group.message.includes('Group session') && 
                                                            <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full mt-1">Group</span>
                                                        }
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {formatDate(group.items[0].sent_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge color="primary" badgeContent={group.items.length} max={99} sx={{ ml: 2 }} />
                                        </div>
                                        <div className="text-sm text-gray-600 pl-16 line-clamp-2">
                                            {formatHighlightedMessage(group.message)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-5xl mb-4">{getEmptyStateIcon()}</div>
                                <p>{getEmptyStateMessage()}</p>
                                <p className="text-sm mt-1">{getEmptyStateDescription()}</p>
                            </div>
                        )
                    ) : (
                        drafts.length > 0 ? (
                            drafts.map((group, index) => (
                                <div key={index} className="hover:bg-gray-50 transition-colors duration-150 bg-white shadow-sm mb-3">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-lg text-amber-600 mr-4">
                                                    {getTargetGroupIcon(group.items[0].target_group)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-800">{getTargetGroupLabel(group.items[0].target_group)}</div>
                                                    <div className="text-xs text-gray-500 mt-1">Draft</div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-3">
                                                <button
                                                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                                                    onClick={() => {
                                                        setNotificationContent(group.message);
                                                        setTargetGroup(group.items[0].target_group);
                                                        setSelectedNotification(null);
                                                    }}
                                                >
                                                    <FaEdit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                                                    onClick={() => deleteDraft(group.items[0].notification_id)}
                                                >
                                                    <FaTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 pl-16 line-clamp-2">{group.message}</div>
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
                    className="fixed bottom-8 right-90 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-xl transition-colors duration-200 flex items-center justify-center"
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

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {selectedNotification ? (
                        <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
                            <div className="mb-8">
                                <div className="flex items-start mb-6">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mr-5 
                                        ${selectedNotification.items[0].target_group === 'system' && selectedNotification.message.includes('cancelled their') ? 
                                          'bg-red-100 text-red-600' :
                                          selectedNotification.items[0].target_group === 'system' && (selectedNotification.message.includes('rescheduled their') || selectedNotification.message.includes('has been rescheduled')) ?
                                          'bg-amber-100 text-amber-600' :
                                          selectedNotification.items[0].target_group === 'system' && selectedNotification.message.includes('Group session') ?
                                          'bg-purple-100 text-purple-600' :
                                          selectedNotification.items[0].target_group === 'system' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {getNotificationIcon(selectedNotification.message)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 flex items-center flex-wrap">
                                            {selectedNotification.items[0].target_group === 'system' ? 'System Notification' : getTargetGroupLabel(selectedNotification.items[0].target_group)}
                                            {selectedNotification.message.includes('cancelled their') && 
                                                <span className="ml-3 text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full">Cancellation</span>
                                            }
                                            {(selectedNotification.message.includes('rescheduled their') || selectedNotification.message.includes('has been rescheduled')) && 
                                                <span className="ml-3 text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full">Rescheduled</span>
                                            }
                                            {selectedNotification.message.includes('Group session') && 
                                                <span className="ml-3 text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full">Group</span>
                                            }
                                        </h2>
                                        <div className="text-sm text-gray-500 mt-2">
                                            {selectedNotification.items[0].target_group === 'system' ? 
                                                'System Alert' : 
                                                `Sent on ${formatDate(selectedNotification.items[0].sent_at)}`}
                                        </div>
                                    </div>
                                </div>
                                <div className={`border-t border-b py-8 my-6 px-4 rounded-md ${
                                    selectedNotification.message.includes('cancelled their') ? 'bg-red-50' : 
                                    (selectedNotification.message.includes('rescheduled their') || selectedNotification.message.includes('has been rescheduled')) ? 'bg-amber-50' :
                                    selectedNotification.message.includes('Group session') ? 'bg-purple-50' : ''
                                }`}>
                                    <div className="text-gray-700 whitespace-pre-wrap text-base">
                                        {formatHighlightedMessage(selectedNotification.message)}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                    {selectedNotification.items[0].target_group === 'system' ? (
                                        <>
                                            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-2"></span>
                                            Automated system notification
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block mr-2"></span>
                                            Delivered to {selectedNotification.items.length} recipients
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-4">
                                <button 
                                    className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors duration-200"
                                    onClick={handleCreateNewNotification}
                                >
                                    Close
                                </button>
                                {selectedNotification.items[0].target_group !== 'system' && (
                                    <button 
                                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors duration-200"
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
                        <div className="bg-white rounded-lg shadow-md p-8 max-w-3xl mx-auto">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">New Notification</h2>
                            
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
                            
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notification Content
                                </label>
                                <textarea
                                    className="w-full p-4 border border-gray-300 rounded-md h-64 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    placeholder="Type your notification message here..."
                                    value={notificationContent}
                                    onChange={(e) => setNotificationContent(e.target.value)}
                                ></textarea>
                                <div className="text-right text-sm text-gray-500 mt-2">
                                    {notificationContent.length} characters
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-4">
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