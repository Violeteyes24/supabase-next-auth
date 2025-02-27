'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Sidebar from '../components/dashboard components/sidebar';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

export default function ViewNotificationsPage() {
    const supabase = createClientComponentClient();
    const [notifications, setNotifications] = useState([]);
    const [session, setSession] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session) {
                fetchNotifications(session.user.id);
            }
        };
        getSession();
    }, []);

    const fetchNotifications = async (userId) => {
        console.log('Fetching notifications for user ID:', userId);

        const { data, error } = await supabase
            .from('notifications')
            .select(`
                notification_id,
                user_id,
                notification_content,
                sent_at,
                status,
                target_group,
                users (name)
            `)
            .eq('user_id', userId)
            .order('sent_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error.message);
            return;
        }

        console.log('Fetched notifications:', data);
        setNotifications(data);
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

            <div className="flex-1 flex flex-col text-black ml-20 p-6" style={{ backgroundColor: 'white' }}>
                <h1 className="text-3xl font-bold mt-4 mb-6">View Notifications</h1>

                <Box className="overflow-y-auto">
                    <List>
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <React.Fragment key={notification.notification_id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={notification.notification_content}
                                            secondary={`Sent at: ${new Date(notification.sent_at).toLocaleString()}`}
                                        />
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))
                        ) : (
                            <Typography variant="body1" color="textSecondary">
                                No notifications available.
                            </Typography>
                        )}
                    </List>
                </Box>
            </div>
        </div>
    );
}
