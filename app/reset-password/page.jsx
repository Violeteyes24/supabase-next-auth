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
  Skeleton,
  Divider
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import SmartphoneIcon from '@mui/icons-material/Smartphone';

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
  const [resetToken, setResetToken] = useState(null);

  useEffect(() => {
    const extractTokenFromUrl = () => {
      // Check for token in various formats
      // Format 1: ?token=XXX
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.has('token')) {
        return queryParams.get('token');
      }
      
      // Format 2: #access_token=XXX (hash fragment)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      if (hashParams.has('access_token')) {
        return hashParams.get('access_token');
      }
      
      // Format 3: URL path format like /verify/XXX
      const pathMatch = window.location.pathname.match(/\/verify\/([^\/]+)/);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
      
      // Format 4: /auth/v1/verify?token=XXX
      const verifyMatch = window.location.href.match(/\/auth\/v1\/verify\?token=([^&]+)/);
      if (verifyMatch && verifyMatch[1]) {
        return verifyMatch[1];
      }
      
      return null;
    };

    const checkSession = async () => {
      try {
        setCheckingSession(true);
        
        // First try to get token from URL
        const token = extractTokenFromUrl();
        if (token) {
          setResetToken(token);
          
          // Try to set session with token
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: ''
          });
          
          if (error) {
            // If direct token usage fails, check if we have an active session
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session?.user?.email) {
              showMessage("Invalid or expired recovery link", "error");
              setTimeout(() => router.push('/login'), 3000);
            }
          }
        } else {
          // Fallback to normal session check
          const { data } = await supabase.auth.getSession();
          if (!data.session?.user?.email) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
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
  
  const openInApp = () => {
    if (resetToken) {
      window.location.href = `mentalhelp://reset-password?token=${resetToken}`;
    } else {
      showMessage("Unable to open app - no reset token found", "error");
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
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Button
              fullWidth
              variant="outlined"
              onClick={openInApp}
              startIcon={<SmartphoneIcon />}
              sx={{
                mb: 2,
                borderColor: 'teal',
                color: 'teal',
                '&:hover': { borderColor: 'darkcyan', bgcolor: 'rgba(0, 128, 128, 0.04)' },
                borderRadius: 2,
                padding: '12px 0',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Open in Mobile App
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