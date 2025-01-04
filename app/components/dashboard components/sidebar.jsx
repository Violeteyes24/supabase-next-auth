'use client';

import { useState } from 'react';
import { Drawer, List, ListItem, ListItemText, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Sidebar = ({ handleLogout }) => {
    const [isOpen, setIsOpen] = useState(false);

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
        { text: 'Notifications', action: () => (window.location.href = '/notifications')},
        { text: 'Approve and Deny', action: () => (window.location.href = '/approveDeny') },
        { text: 'Logout', action: handleLogout }, // Attach the logout function here
    ];

    return (
        <Box>
            {/* Menu Button */}
            <IconButton edge="start" color="inherit" aria-label="menu" style={{ marginLeft: '5px' }} onClick={toggleDrawer(true)}>
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
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "100vh", // Ensure the List takes the full viewport height
                            overflow: "hidden"
                        }}
                    >
                        {menuItems.map((item, index) => (
                            <ListItem
                                key={index}
                                button={true} // Pass boolean explicitly
                                onClick={item.action} // Dynamic action
                                sx={{
                                    "&:hover": {
                                        backgroundColor: "rgba(0, 128, 128, 0.1)", // Subtle hover effect
                                    },
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    margin: "4px 8px",
                                    ...(item.text === "Logout" && {
                                        marginTop: "auto", // Push "Logout" to the bottom
                                    }),
                                }}
                            >
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        color: "teal",
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
