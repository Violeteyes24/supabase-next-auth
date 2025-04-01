'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Snackbar,
  Skeleton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';

export default function ResetPassword() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('info');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [formError, setFormError] = useState('');
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingSession(true);
        const { data, error } = await supabase.auth.getSession();
        
        // Check if this is a recovery session
        // If not, redirect to login
        if (!data.session?.user?.email) {
          router.push('/login');
        }
      } catch (error) {
        showMessage("Invalid or expired recovery link", "error");
        setTimeout(() => router.push('/login'), 3000);
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkSession();
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when typing
    if (formError) setFormError('');
  };

  const showMessage = (msg, sev) => {
    setMessage(msg);
    setSeverity(sev);
    setOpenSnackbar(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (passwordData.password !== passwordData.confirmPassword) {
      setFormError("Passwords don't match");
      return;
    }
    
    if (passwordData.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.password
      });
      
      if (error) throw error;
      
      showMessage('Password reset successful!', 'success');
      setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setFormError(error.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };
  
  // Loading skeleton
  const PasswordResetSkeleton = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
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
          zIndex: 10
        }}
      />
      
      <Container maxWidth="sm">
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    </div>
  );

  if (checkingSession) {
    return <PasswordResetSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <Container maxWidth="sm">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: 'teal', 
                fontWeight: 600,
                mb: 1
              }}
            >
              Reset Password
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create a new password for your account
            </Typography>
          </Box>
          
          <Box component="form" onSubmit={handlePasswordReset} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="New Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={passwordData.password}
              onChange={handlePasswordChange}
              margin="normal"
              InputProps={{
                sx: { borderRadius: 2 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              margin="normal"
              error={Boolean(formError)}
              helperText={formError}
              InputProps={{
                sx: { borderRadius: 2 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={<LockResetIcon />}
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: 'teal',
                '&:hover': { bgcolor: 'darkcyan' },
                borderRadius: 2,
                padding: '12px 0',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                onClick={() => router.push('/login')}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                  textTransform: 'none'
                }}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
      
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
    </div>
  );
} 