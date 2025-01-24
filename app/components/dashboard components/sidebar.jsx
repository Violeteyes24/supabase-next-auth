'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import { Drawer, List, ListItem, ListItemText, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';


const Sidebar = ({ handleLogout }) => {

    const supabase = createClientComponentClient();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null); // State to hold user data

    useEffect(() => {
        // Fetch user from supabase.auth
        const getUser = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                console.log('User:', user);

                if (userError) {
                    console.error('Error fetching user:', userError);
             
                    return;
                }

                if (user) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('user_type, is_director')
                        .eq('user_id', user.id)
                        .single(); // Assuming user_id matches in your users table

                    if (error) {
                        console.error('Error fetching user details:', error);
              
                        return;
                    }

                    console.log('User details:', data);
                    setUser(data); // Set user data
                }

  
            } catch (err) {
                console.error('Unexpected error fetching user:', err);
     
            }
        };

        getUser(); // Call the function to fetch user
    }, []); // Empty array means this effect will run once when the component is mounted

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setIsOpen(open);
    };

    const menuItems = [
        { text: 'Dashboard', action: () => (window.location.href = '/dashboard/counselor') },
        { text: 'Reports', action: () => (window.location.href = '/reports') },
        { text: 'Appointments', action: () => (window.location.href = '/appointment') },
        { text: 'Messages', action: () => (window.location.href = '/messages') },
        { text: 'Notifications', action: () => (window.location.href = '/notifications') },
        // Conditionally include "Approve and Deny" if user is counselor and director
        ...(user?.user_type === 'counselor' && user?.is_director
            ? [{ text: 'Approve and Deny', action: () => (window.location.href = '/approveDeny') }]
            : []),
        { text: 'Logout', action: handleLogout },
    ];

    return (
        <Box>
            {/* Menu Button */}
            <IconButton edge="start" color="black" aria-label="menu" style={{ marginLeft: '5px' }} onClick={toggleDrawer(true)}>
                <MenuIcon />
            </IconButton>

            {/* Sidebar Drawer */}
            <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
                <Box
                    sx={{ width: 250 }}
                    role="presentation"
                    onClick={toggleDrawer(false)}
                    onKeyDown={toggleDrawer(false)}
                >
                    <List
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100vh',
                            overflow: 'hidden',
                        }}
                    >
                        {menuItems.map((item, index) => (
                            <ListItem
                                key={index}
                                button={true}
                                onClick={item.action}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 128, 128, 0.1)',
                                    },
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    margin: '4px 8px',
                                    ...(item.text === 'Logout' && {
                                        marginTop: 'auto',
                                    }),
                                }}
                            >
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: 'teal',
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
