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
        { text: 'Dashboard', action: () => (window.location.href = '/dashboard') },
        { text: 'Reports', action: () => (window.location.href = '/reports') },
        { text: 'Settings', action: () => (window.location.href = '/settings') },
        { text: 'Logout', action: handleLogout }, // Attach the logout function here
    ];

    return (
        <Box>
            {/* Menu Button */}
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer(true)}>
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
                    <List>
                        {menuItems.map((item, index) => (
                            <ListItem
                                key={index}
                                button
                                onClick={item.action} // Dynamic action
                                sx={{
                                    "&:hover": {
                                        backgroundColor: "rgba(0, 128, 128, 0.1)", // Subtle hover effect
                                    },
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    margin: "4px 8px",
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
