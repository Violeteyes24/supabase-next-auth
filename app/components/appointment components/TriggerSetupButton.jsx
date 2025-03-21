'use client';

import { useState, useEffect } from 'react';
import { Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TriggerSetupButton() {
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCounselor, setIsCounselor] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkUserType = async () => {
      // Get the current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Query the users table to get the user_type
        const { data, error } = await supabase
          .from('users')
          .select('user_type')
          .eq('user_id', session.user.id)
          .single();
        
        if (!error && data) {
          setIsCounselor(data.user_type === 'counselor');
        }
      }
    };
    
    checkUserType();
  }, []);

  const setupTrigger = async () => {
    setLoading(true);
    try {
      // First try to directly call the RPC function in case the API has permissions issues
      try {
        const { error: rpcError } = await supabase.rpc('create_appointment_completion_trigger');
        if (!rpcError) {
          setSuccessOpen(true);
          setLoading(false);
          return;
        }
      } catch (rpcError) {
        console.log('Direct RPC call failed, trying via API endpoint', rpcError);
      }
      
      // If direct RPC fails, try the API endpoint
      const response = await fetch('/api/setup-triggers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up triggers');
      }
      
      setSuccessOpen(true);
    } catch (error) {
      console.error('Error setting up triggers:', error);
      setErrorMessage(error.message || 'An error occurred setting up the trigger. Please ask an administrator for help.');
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // If not a counselor, don't render anything
  if (!isCounselor) {
    return null;
  }

  return (
    <div className="mt-4">
      <Button
        variant="outlined"
        onClick={setupTrigger}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
        sx={{ 
          borderColor: '#10b981',
          color: '#10b981',
          '&:hover': {
            borderColor: '#059669',
            backgroundColor: 'rgba(16, 185, 129, 0.08)'
          }
        }}
      >
        {loading ? 'Setting Up...' : 'Setup Appointment Completion Trigger'}
      </Button>
      
      <Snackbar open={successOpen} autoHideDuration={6000} onClose={() => setSuccessOpen(false)}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Appointment completion trigger set up successfully!
        </Alert>
      </Snackbar>
      
      <Snackbar open={errorOpen} autoHideDuration={6000} onClose={() => setErrorOpen(false)}>
        <Alert onClose={() => setErrorOpen(false)} severity="error" sx={{ width: '100%' }}>
          {errorMessage || 'An error occurred while setting up the trigger.'}
        </Alert>
      </Snackbar>
    </div>
  );
} 