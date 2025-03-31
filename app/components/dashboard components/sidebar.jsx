'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { Drawer, List, ListItem, ListItemText, IconButton, Box, Divider, Typography, ListItemIcon } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventIcon from '@mui/icons-material/Event';
import ChatIcon from '@mui/icons-material/Chat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter } from 'next/navigation';

const Sidebar = ({ handleLogout, sessionProp }) => {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(sessionProp);

    useEffect(() => {
        // Update local session if sessionProp changes
        if (sessionProp) {
            setSession(sessionProp);
        }
    }, [sessionProp]);

    useEffect(() => {
        const getUser = async () => {
            try {
                // First try to use the passed session prop
                if (session?.user) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('user_type, is_director')
                        .eq('user_id', session.user.id)
                        .single();
                    
                    if (error) {
                        console.error('Error fetching user details:', error);
                        return;
                    }
                    
                    setUser(data);
                    return;
                }
                
                // If no session prop, get user from auth
                const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Error fetching session:', sessionError);
                    return;
                }
                
                if (!authSession) {
                    console.log('No auth session found in sidebar');
                    return;
                }
                
                setSession(authSession);
                
                const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
                
                if (userError) {
                    console.error('Error fetching user:', userError);
                    
                    // Try to refresh session if we get auth errors
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    
                    if (refreshError || !refreshData.session) {
                        console.error('Failed to refresh session in sidebar:', refreshError);
                        return;
                    }
                    
                    setSession(refreshData.session);
                    return;
                }
                
                if (authUser) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('user_type, is_director')
                        .eq('user_id', authUser.id)
                        .single();
                        
                    if (error) {
                        console.error('Error fetching user details:', error);
                        return;
                    }
                    
                    setUser(data);
                }
            } catch (err) {
                console.error('Unexpected error fetching user in sidebar:', err);
            }
        };
        
        getUser();
        
        // Set up periodic session refresh
        const refreshInterval = setInterval(async () => {
            try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                    console.error('Error refreshing session in sidebar:', error);
                } else if (data.session) {
                    setSession(data.session);
                }
            } catch (err) {
                console.error('Unexpected error refreshing session in sidebar:', err);
            }
        }, 4 * 60 * 1000); // Every 4 minutes
        
        return () => clearInterval(refreshInterval);
    }, []);

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setIsOpen(open);
    };

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, action: () => (window.location.href = '/dashboard/counselor') },
        { text: 'Profile', icon: <PersonIcon />, action: () => (window.location.href = '/profile') },
        { text: 'Reports', icon: <AssessmentIcon />, action: () => (window.location.href = '/reports') },
        { text: 'Appointments', icon: <EventIcon />, action: () => (window.location.href = '/appointment') },
        { text: 'Messages', icon: <ChatIcon />, action: () => (window.location.href = '/messages') },
        ...(user?.is_director
            ? [{ text: 'Notifications', icon: <NotificationsIcon />, action: () => (window.location.href = '/notifications') }]
            : [{ text: 'View Notifications', icon: <NotificationsIcon />, action: () => (window.location.href = '/view-notifications') }]),
        ...(user?.user_type === 'counselor' && user?.is_director
            ? [{ text: 'Approve and Deny', icon: <CheckCircleIcon />, action: () => (window.location.href = '/approveDeny') }]
            : []),
        { text: 'Logout', icon: <ExitToAppIcon />, action: handleLogout },
    ];

    return (
        <Box>
            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ ml: 2, color: 'teal' }} onClick={toggleDrawer(true)}>
                <MenuIcon fontSize="large" />
            </IconButton>

            <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
                <Box
                    sx={{
                        width: 260,
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#f5f5f5',
                        padding: 2,
                    }}
                    role="presentation"
                    onClick={toggleDrawer(false)}
                    onKeyDown={toggleDrawer(false)}
                >
                    <Typography variant="h6" align="center" gutterBottom sx={{ color: 'teal', fontWeight: 'bold' }}>
                        Navigation
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                        {menuItems.map((item, index) => (
                            <ListItem
                                key={index}
                                button={true}
                                onClick={item.action}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 128, 128, 0.2)',
                                    },
                                    padding: '14px 20px',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    transition: 'background-color 0.3s ease-in-out',
                                }}
                            >
                                <ListItemIcon sx={{ color: item.text === 'Logout' ? 'red' : 'teal' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: item.text === 'Logout' ? 'red' : 'teal',
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
        </Box>
    );
};

export default Sidebar;
