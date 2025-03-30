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
    Alert,
    Divider,
    Avatar,
    IconButton,
    Stack,
    Tooltip,
    Skeleton
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const [imageFile, setImageFile] = useState(null);
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
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
                setProfileImageUrl(data.profile_image_url);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            showMessage('Error fetching profile data', 'error');
        } finally {
            setLoading(false);
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setProfileImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const showMessage = (msg, sev) => {
        setMessage(msg);
        setSeverity(sev);
        setOpenSnackbar(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            let imageUrl = profileImageUrl;

            // Upload Image if selected
            if (imageFile) {
                const { data, error: uploadError } = await supabase
                    .storage
                    .from('profile_pictures')
                    .upload(`users/${user.id}-${Date.now()}`, imageFile, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Image Upload Error:', uploadError);
                    showMessage('Failed to upload image.', 'error');
                    return;
                }

                imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile_pictures/${data.path}`;
            }

            // Process form data to handle numeric fields
            const processedFormData = {
                ...formData,
                birthday: formData.birthday ? formData.birthday.format('YYYY-MM-DD') : null,
                profile_image_url: imageUrl,
                program_year_level: formData.program_year_level === '' ? null : parseInt(formData.program_year_level)
            };

            const { error } = await supabase
                .from('users')
                .update(processedFormData)
                .eq('user_id', user.id);

            if (error) throw error;
            showMessage('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage('Error updating profile', 'error');
        } finally {
            setLoading(false);
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

    // Loading skeleton component with shimmer effect
    const ProfileSkeleton = () => (
        <div className="flex min-h-screen bg-gray-100">
            <Box sx={{ width: 240, bgcolor: '#1E293B' }} /> {/* Sidebar placeholder */}
            <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        mb: 4
                    }}
                >
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
                            zIndex: 1
                        }}
                    />
                    
                    {/* Header skeleton */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, position: 'relative' }}>
                        <Skeleton variant="text" width={200} height={50} sx={{ flexGrow: 1 }} />
                    </Box>
                    
                    <Divider sx={{ mb: 4 }} />
                    
                    {/* Avatar skeleton */}
                    <Box sx={{ mb: 5, textAlign: 'center', position: 'relative' }}>
                        <Skeleton 
                            variant="circular" 
                            width={150} 
                            height={150} 
                            sx={{ margin: '0 auto' }}
                        />
                        <Skeleton 
                            variant="circular" 
                            width={40} 
                            height={40} 
                            sx={{ 
                                position: 'absolute',
                                bottom: 0,
                                right: '50%',
                                transform: 'translateX(50px)'
                            }}
                        />
                    </Box>
                    
                    {/* Form skeleton */}
                    <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                        {[...Array(8)].map((_, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                                <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
                            </Grid>
                        ))}
                        <Grid item xs={12}>
                            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                        </Grid>
                        <Grid item xs={12}>
                            <Skeleton variant="rectangular" height={56} width={120} sx={{ borderRadius: 1, ml: 'auto' }} />
                        </Grid>
                    </Grid>
                </Paper>
            </Container>
        </div>
    );

    if (loading) {
        return <ProfileSkeleton />;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar handleLogout={handleLogout} />
            <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 4, 
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        mb: 4
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                color: 'teal', 
                                fontWeight: 600,
                                flexGrow: 1
                            }}
                        >
                            Edit Profile
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 4 }} />
                    
                    <Box sx={{ mb: 5, textAlign: 'center', position: 'relative' }}>
                        <Avatar
                            src={profileImageUrl}
                            alt="Profile"
                            sx={{ 
                                width: 150, 
                                height: 150, 
                                margin: '0 auto',
                                border: '4px solid #e0f2f1',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        />
                        <input
                            accept="image/*"
                            id="icon-button-file"
                            type="file"
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                        <label htmlFor="icon-button-file">
                            <IconButton 
                                component="span"
                                sx={{ 
                                    position: 'absolute',
                                    bottom: 0,
                                    right: '50%',
                                    transform: 'translateX(50px)',
                                    backgroundColor: 'teal',
                                    color: 'white',
                                    '&:hover': { backgroundColor: 'darkcyan' }
                                }}
                            >
                                <PhotoCameraIcon />
                            </IconButton>
                        </label>
                    </Box>
                    
                    <Box component="form" onSubmit={handleSubmit}>
                        <Typography 
                            variant="h6" 
                            sx={{ mb: 2, color: 'teal', fontWeight: 500 }}
                        >
                            Personal Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    name="username"
                                    value={formData.username || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
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
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Contact Number"
                                    name="contact_number"
                                    value={formData.contact_number || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        label="Birthday"
                                        value={formData.birthday}
                                        onChange={handleDateChange}
                                        sx={{ width: '100%' }}
                                        slotProps={{
                                            textField: {
                                                InputProps: {
                                                    sx: { borderRadius: 2 }
                                                }
                                            }
                                        }}
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
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                >
                                    <MenuItem value="male">Male</MenuItem>
                                    <MenuItem value="female">Female</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </TextField>
                            </Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 4 }} />
                        
                        <Typography 
                            variant="h6" 
                            sx={{ mb: 2, color: 'teal', fontWeight: 500 }}
                        >
                            Academic Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Department"
                                    name="department"
                                    value={formData.department || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Program"
                                    name="program"
                                    value={formData.program || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
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
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="School Year"
                                    name="school_year"
                                    value={formData.school_year || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 4 }} />
                        
                        <Typography 
                            variant="h6" 
                            sx={{ mb: 2, color: 'teal', fontWeight: 500 }}
                        >
                            Professional Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Short Biography"
                                    name="short_biography"
                                    multiline
                                    rows={4}
                                    value={formData.short_biography || ''}
                                    onChange={handleChange}
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
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
                                    InputProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    startIcon={<SaveIcon />}
                                    sx={{
                                        mt: 2,
                                        bgcolor: 'teal',
                                        '&:hover': { bgcolor: 'darkcyan' },
                                        borderRadius: 2,
                                        padding: '10px 24px',
                                        textTransform: 'none',
                                        fontWeight: 600
                                    }}
                                >
                                    {loading ? 'Updating...' : 'Update Profile'}
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
                    <Alert 
                        severity={severity} 
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {message}
                    </Alert>
                </Snackbar>
            </Container>
        </div>
    );
}