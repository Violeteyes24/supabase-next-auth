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
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordError, setPasswordError] = useState('');
    const [formErrors, setFormErrors] = useState({});

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
        
        // Clear error for this field when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleDateChange = (date) => {
        // Don't allow future dates for birthday
        if (date && date.isAfter(dayjs())) {
            setFormErrors(prev => ({
                ...prev,
                birthday: "Birthday cannot be in the future"
            }));
            return;
        }
        
        // Check if user is at least 18 years old
        const eighteenYearsAgo = dayjs().subtract(18, 'year');
        if (date && date.isAfter(eighteenYearsAgo)) {
            setFormErrors(prev => ({
                ...prev,
                birthday: "You must be at least 18 years old"
            }));
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            birthday: date
        }));
        
        // Clear birthday error when user selects a valid date
        if (formErrors.birthday) {
            setFormErrors(prev => ({
                ...prev,
                birthday: null
            }));
        }
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
        
        // Validate all required fields
        const errors = {};
        if (!formData.name) errors.name = "Name is required";
        if (!formData.username) errors.username = "Username is required";
        if (!formData.address) errors.address = "Address is required";
        if (!formData.contact_number) errors.contact_number = "Contact number is required";
        else if (!/^\d{11}$/.test(formData.contact_number)) errors.contact_number = "Contact number must be 11 digits";
        if (!formData.birthday) errors.birthday = "Birthday is required";
        else if (formData.birthday.isAfter(dayjs())) errors.birthday = "Birthday cannot be in the future";
        else {
            // Check if user is at least 18 years old
            const eighteenYearsAgo = dayjs().subtract(18, 'year');
            if (formData.birthday.isAfter(eighteenYearsAgo)) {
                errors.birthday = "You must be at least 18 years old";
            }
        }
        if (!formData.gender) errors.gender = "Gender is required";
        if (!formData.short_biography) errors.short_biography = "Short biography is required";
        if (!formData.credentials) errors.credentials = "Credentials are required";
        
        // If there are errors, show them and stop the submission
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            showMessage('Please fill in all required fields correctly', 'error');
            return;
        }
        
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

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing again
        if (passwordError) setPasswordError('');
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleUpdatePassword = async () => {
        // Clear previous errors
        setPasswordError('');
        
        // Validate passwords
        if (!passwordData.currentPassword) {
            setPasswordError("Current password is required");
            return;
        }
        
        if (!passwordData.newPassword) {
            setPasswordError("New password is required");
            return;
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }
        
        if (passwordData.newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }
        
        try {
            setLoading(true);
            
            // Get current user to obtain email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                throw new Error("Unable to retrieve user information");
            }
            
            // Verify current password by attempting to sign in
            // Note: This won't affect the current session
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordData.currentPassword,
            });
            
            if (signInError) {
                setPasswordError("Current password is incorrect");
                setLoading(false);
                return;
            }
            
            // If current password is correct, update to the new password
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });
            
            if (error) {
                throw error;
            }
            
            // Reset form and close dialog
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setOpenPasswordDialog(false);
            showMessage('Password updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating password:', error);
            setPasswordError(error.message || 'Error updating password');
        } finally {
            setLoading(false);
        }
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
                        <Button
                            variant="outlined"
                            startIcon={<LockIcon />}
                            onClick={() => setOpenPasswordDialog(true)}
                            sx={{
                                borderColor: 'teal',
                                color: 'teal',
                                '&:hover': { 
                                    borderColor: 'darkcyan',
                                    backgroundColor: 'rgba(0, 128, 128, 0.05)'
                                },
                                borderRadius: 2,
                                textTransform: 'none'
                            }}
                        >
                            Change Password
                        </Button>
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
                                    required
                                    error={!!formErrors.name}
                                    helperText={formErrors.name}
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
                                    required
                                    error={!!formErrors.username}
                                    helperText={formErrors.username}
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
                                    required
                                    error={!!formErrors.address}
                                    helperText={formErrors.address}
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
                                    required
                                    error={!!formErrors.contact_number}
                                    helperText={formErrors.contact_number}
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
                                        required
                                        maxDate={dayjs().subtract(18, 'year')}
                                        slotProps={{
                                            textField: {
                                                required: true,
                                                error: !!formErrors.birthday,
                                                helperText: formErrors.birthday,
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
                                    required
                                    error={!!formErrors.gender}
                                    helperText={formErrors.gender}
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
                        
                        {/* Academic Information section - commented out since users are counselors and secretaries
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
                        */}
                        
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
                                    required
                                    error={!!formErrors.short_biography}
                                    helperText={formErrors.short_biography}
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
                                    required
                                    error={!!formErrors.credentials}
                                    helperText={formErrors.credentials}
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
                
                {/* Password Change Dialog */}
                <Dialog 
                    open={openPasswordDialog} 
                    onClose={() => setOpenPasswordDialog(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ color: 'teal', fontWeight: 500 }}>
                        Change Your Password
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={3} sx={{ mt: 0.5 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Current Password"
                                    name="currentPassword"
                                    type="text"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                    inputProps={{
                                        style: {
                                            WebkitTextSecurity: showPasswords.current ? 'none' : 'disc',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                        }
                                    }}
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => togglePasswordVisibility('current')}
                                                    edge="end"
                                                >
                                                    {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Password"
                                    name="newPassword"
                                    type="text"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                    inputProps={{
                                        style: {
                                            WebkitTextSecurity: showPasswords.new ? 'none' : 'disc',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                        }
                                    }}
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => togglePasswordVisibility('new')}
                                                    edge="end"
                                                >
                                                    {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Confirm New Password"
                                    name="confirmPassword"
                                    type="text"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    margin="normal"
                                    error={Boolean(passwordError)}
                                    helperText={passwordError}
                                    inputProps={{
                                        style: {
                                            WebkitTextSecurity: showPasswords.confirm ? 'none' : 'disc',
                                            appearance: 'none',
                                            WebkitAppearance: 'none',
                                        }
                                    }}
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => togglePasswordVisibility('confirm')}
                                                    edge="end"
                                                >
                                                    {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button 
                            onClick={() => setOpenPasswordDialog(false)}
                            variant="outlined"
                            sx={{ 
                                borderRadius: 2,
                                textTransform: 'none',
                                borderColor: 'grey.400',
                                color: 'grey.700'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdatePassword}
                            variant="contained"
                            disabled={loading}
                            sx={{ 
                                bgcolor: 'teal',
                                '&:hover': { bgcolor: 'darkcyan' },
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                minWidth: '100px'
                            }}
                        >
                            {loading ? 'Updating...' : 'Update'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </div>
    );
}