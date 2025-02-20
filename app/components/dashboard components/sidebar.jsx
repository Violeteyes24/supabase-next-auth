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

const Sidebar = ({ handleLogout }) => {
    const supabase = createClientComponentClient();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.error('Error fetching user:', userError);
                    return;
                }
                if (user) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('user_type, is_director')
                        .eq('user_id', user.id)
                        .single();
                    if (error) {
                        console.error('Error fetching user details:', error);
                        return;
                    }
                    setUser(data);
                }
            } catch (err) {
                console.error('Unexpected error fetching user:', err);
            }
        };
        getUser();
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
        { text: 'Notifications', icon: <NotificationsIcon />, action: () => (window.location.href = '/notifications') },
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
                                button
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
