import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

const Navbar = () => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    MentalHelp Dashboard
                </Typography>
                <Button color="inherit">Home</Button>
                <Button color="inherit">Reports</Button>
                <Button color="inherit">Settings</Button>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
