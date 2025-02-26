'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Sidebar from '../components/dashboard components/sidebar';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Grid,
    MenuItem,
    Paper,
    Snackbar,
    Alert
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        address: '',
        contact_number: '',
        birthday: null,
        gender: '',
        department: '',
        program: '',
        program_year_level: '',
        school_year: '',
        short_biography: '',
        credentials: ''
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                if (error) throw error;
                
                setFormData({
                    ...data,
                    birthday: data.birthday ? dayjs(data.birthday) : null
                });
                setProfileImageUrl(data.profile_image_url); // Set profile image URL
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            showMessage('Error fetching profile data', 'error');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            birthday: date
        }));
    };

    const showMessage = (msg, sev) => {
        setMessage(msg);
        setSeverity(sev);
        setOpenSnackbar(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('users')
                .update({
                    ...formData,
                    birthday: formData.birthday ? formData.birthday.format('YYYY-MM-DD') : null
                })
                .eq('user_id', user.id);

            if (error) throw error;
            showMessage('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('Error updating profile', 'error');
        }
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
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h4" gutterBottom sx={{ color: 'teal', mb: 4 }}>
                        Edit Profile
                    </Typography>
                    {profileImageUrl && (
                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <img
                                src={profileImageUrl}
                                alt="Profile"
                                style={{ width: '150px', height: '150px', borderRadius: '50%' }}
                            />
                        </Box>
                    )}
                    <Box component="form" onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    name="username"
                                    value={formData.username || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Address"
                                    name="address"
                                    multiline
                                    rows={2}
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Contact Number"
                                    name="contact_number"
                                    value={formData.contact_number || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="Birthday"
                                        value={formData.birthday}
                                        onChange={handleDateChange}
                                        renderInput={(params) => <TextField {...params} fullWidth />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Gender"
                                    name="gender"
                                    value={formData.gender || ''}
                                    onChange={handleChange}
                                >
                                    <MenuItem value="male">Male</MenuItem>
                                    <MenuItem value="female">Female</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Department"
                                    name="department"
                                    value={formData.department || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Program"
                                    name="program"
                                    value={formData.program || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Program Year Level"
                                    name="program_year_level"
                                    value={formData.program_year_level || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="School Year"
                                    name="school_year"
                                    value={formData.school_year || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Short Biography"
                                    name="short_biography"
                                    multiline
                                    rows={4}
                                    value={formData.short_biography || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Credentials"
                                    name="credentials"
                                    multiline
                                    rows={4}
                                    value={formData.credentials || ''}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    sx={{
                                        mt: 2,
                                        bgcolor: 'teal',
                                        '&:hover': { bgcolor: 'darkcyan' }
                                    }}
                                >
                                    Update Profile
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={6000}
                    onClose={() => setOpenSnackbar(false)}
                >
                    <Alert severity={severity} sx={{ width: '100%' }}>
                        {message}
                    </Alert>
                </Snackbar>
            </Container>
        </div>
    );
}
