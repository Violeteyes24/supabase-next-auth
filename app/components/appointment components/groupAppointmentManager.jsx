'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Modal, 
  Box, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  TextField,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import dayjs from 'dayjs';

export default function GroupAppointmentsManager() {
  const supabase = createClientComponentClient();
  
  const [individualAppointments, setIndividualAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [groupCategories] = useState([
    'Relationships', 
    'Family', 
    'Academic', 
    'Others'
  ]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [groupReason, setGroupReason] = useState('');
  const [groupAppointments, setGroupAppointments] = useState([]);
  const [selectedGroupAppointment, setSelectedGroupAppointment] = useState(null);
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [session, setSession] = useState(null);
  
        useEffect(() => {
          const getSession = async () => {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            setSession(session);
          };
          getSession();
        }, []);

  useEffect(() => {
    fetchIndividualAppointments();
    fetchEligibleUsers();
    fetchGroupAppointments();
  }, []);

  const fetchIndividualAppointments = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return;
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('counselor_id', userId)
      .eq('appointment_type', 'individual')
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setIndividualAppointments(data || []);
    }
  };

  const fetchEligibleUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, name');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const fetchGroupAppointments = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      return;
    }
  
    const userId = session.user.id;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        groupappointments (
          user_id,
          users (
            name
          )
        )
      `)
      .eq('appointment_type', 'group')
      .eq("counselor_id", userId);
  
    if (error) {
      console.error('Error fetching group appointments:', error);
    } else {
      setGroupAppointments(data || []);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroupAppointment = async () => {
    if (selectedUsers.length < 2) {
      showSnackbar('Please select at least two users for a group appointment', 'error');
      return;
    }
  
    if (!selectedCategory) {
      showSnackbar('Please select a category for the group appointment', 'error');
      return;
    }
  
    try {
      // Get the current session to get the counselor ID
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Error getting session:', sessionError);
        showSnackbar('Authentication error. Please try again.', 'error');
        return;
      }
  
      const counselorId = session.user.id;
  
      // Create a new group appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          appointment_type: 'group',
          status: 'pending',
          reason: groupReason,
          category: selectedCategory,
          counselor_id: counselorId  // Add the counselor_id field
        })
        .select()
        .single();
  
      if (appointmentError) throw appointmentError;
  
      // Create group appointment entries for each selected user
      const groupAppointmentEntries = selectedUsers.map(userId => ({
        user_id: userId,
        appointment_id: newAppointment.appointment_id,
        problem: groupReason
      }));
  
      const { error: groupError } = await supabase
        .from('groupappointments')
        .insert(groupAppointmentEntries);
  
      if (groupError) throw groupError;
  
      // Reset states
      setSelectedUsers([]);
      setGroupReason('');
      setSelectedCategory('');
      setOpenGroupModal(false);
  
      showSnackbar('Group appointment created successfully!', 'success');
      fetchGroupAppointments();
    } catch (error) {
      console.error('Error creating group appointment:', error);
      showSnackbar(`Failed to create group appointment: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleRescheduleGroup = (appointment) => {
    setSelectedGroupAppointment(appointment);
    setOpenRescheduleModal(true);
  };

  const handleCancelGroup = (appointment) => {
    setSelectedGroupAppointment(appointment);
    setOpenCancelModal(true);
  };

  const handleConfirmReschedule = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rescheduled' })
        .eq('appointment_id', selectedGroupAppointment.appointment_id);

      if (error) throw error;
      
      setOpenRescheduleModal(false);
      fetchGroupAppointments();
      showSnackbar('Group appointment rescheduled successfully', 'success');
    } catch (error) {
      console.error('Error rescheduling group appointment:', error);
      showSnackbar('Failed to reschedule group appointment', 'error');
    }
  };

  const handleConfirmCancel = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('appointment_id', selectedGroupAppointment.appointment_id);

      if (error) throw error;
      
      setOpenCancelModal(false);
      fetchGroupAppointments();
      showSnackbar('Group appointment cancelled successfully', 'info');
    } catch (error) {
      console.error('Error cancelling group appointment:', error);
      showSnackbar('Failed to cancel group appointment', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusChipColor = (status) => {
    switch(status) {
      case 'pending': return 'primary';
      case 'rescheduled': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#10b981' }}>
          Group Therapy Sessions
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => setOpenGroupModal(true)}
          sx={{ 
            backgroundColor: '#10b981', 
            '&:hover': { backgroundColor: '#059669' },
            textTransform: 'none',
            fontWeight: 'medium',
            px: 3,
            py: 1
          }}
        >
          Create Group Session
        </Button>
      </div>

      <Paper sx={{ mb: 4, overflow: 'hidden', boxShadow: 2, borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Group ID</TableCell>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Participants</TableCell>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Focus Area</TableCell>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupAppointments.length > 0 ? (
                groupAppointments.map((appointment) => (
                  <TableRow 
                    key={appointment.appointment_id}
                    sx={{ 
                      '&:hover': { backgroundColor: '#f9fafb' },
                      verticalAlign: 'top'
                    }}
                  >
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        #{appointment.appointment_id.toString().slice(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {appointment.groupappointments?.map((ga, index) => (
                          ga.users?.name && (
                            <Chip
                              key={index}
                              avatar={<Avatar>{getInitials(ga.users.name)}</Avatar>}
                              label={ga.users.name}
                              size="small"
                              sx={{ margin: '2px' }}
                            />
                          )
                        ))}
                      </div>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {appointment.groupappointments?.length || 0} participants
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={appointment.category || 'Uncategorized'} 
                        size="small"
                        sx={{ 
                          bgcolor: appointment.category === 'Relationships' ? '#e0f2fe' :
                                  appointment.category === 'Family' ? '#f0fdf4' :
                                  appointment.category === 'Academic' ? '#fef3c7' : '#f3f4f6',
                          color: appointment.category === 'Relationships' ? '#0369a1' :
                                appointment.category === 'Family' ? '#15803d' :
                                appointment.category === 'Academic' ? '#b45309' : '#4b5563',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {appointment.reason || 'No reason specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={appointment.status} 
                        color={getStatusChipColor(appointment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={appointment.status === 'cancelled'}
                          onClick={() => handleRescheduleGroup(appointment)}
                          sx={{ 
                            borderColor: '#d1d5db',
                            color: '#4b5563',
                            '&:hover': {
                              borderColor: '#9ca3af',
                              backgroundColor: 'rgba(156, 163, 175, 0.04)'
                            }
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={appointment.status === 'cancelled'}
                          onClick={() => handleCancelGroup(appointment)}
                          sx={{
                            '&.Mui-disabled': {
                              borderColor: '#f3f4f6',
                              color: '#9ca3af'
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 text-gray-300">
                        <path d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <Typography variant="subtitle1" color="text.secondary">
                        No group sessions found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Create your first group therapy session to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Group Modal */}
      <Modal 
        open={openGroupModal} 
        onClose={() => setOpenGroupModal(false)}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#10b981', mb: 3 }}>
            Create Group Therapy Session
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Group Category Selection */}
          <div>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
              Session Category
            </Typography>
            <div className="flex flex-wrap gap-2">
              {groupCategories.map(category => (
                <Chip
                  key={category}
                  label={category}
                  clickable
                  color={selectedCategory === category ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(category)}
                  sx={{ 
                    px: 1,
                    backgroundColor: selectedCategory === category ? '#10b981' : '#f3f4f6',
                    color: selectedCategory === category ? 'white' : '#4b5563',
                    '&:hover': {
                      backgroundColor: selectedCategory === category ? '#059669' : '#e5e7eb',
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Group Reason */}
          <div className="mt-6">
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
              Session Focus Area
            </Typography>
            <TextField
              fullWidth
              label="Describe the purpose of this group session"
              variant="outlined"
              multiline
              rows={2}
              value={groupReason}
              onChange={(e) => setGroupReason(e.target.value)}
              placeholder="E.g., Coping with academic stress, Building healthy relationships, etc."
            />
          </div>

          {/* User Selection */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                Select Participants
              </Typography>
              <Badge 
                badgeContent={selectedUsers.length} 
                color="primary"
                sx={{ '& .MuiBadge-badge': { backgroundColor: '#10b981' } }}
              >
                <Typography variant="body2" color="text.secondary">
                  Selected
                </Typography>
              </Badge>
            </div>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Search participants..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', borderColor: '#e5e7eb' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: '#f9fafb' }}>
                      <Checkbox
                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                        checked={users.length > 0 && selectedUsers.length === users.length}
                        onChange={() => {
                          if (selectedUsers.length === users.length) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map(u => u.user_id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ bgcolor: '#f9fafb', fontWeight: 'medium' }}>Name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <TableRow 
                        key={user.user_id}
                        hover
                        selected={selectedUsers.includes(user.user_id)}
                        onClick={() => handleUserSelect(user.user_id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={() => handleUserSelect(user.user_id)}
                            sx={{
                              '&.Mui-checked': {
                                color: '#10b981',
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                bgcolor: selectedUsers.includes(user.user_id) ? '#10b981' : '#e5e7eb',
                                color: selectedUsers.includes(user.user_id) ? 'white' : '#4b5563',
                                mr: 1 
                              }}
                            >
                              {getInitials(user.name)}
                            </Avatar>
                            <Typography variant="body2">{user.name}</Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 3 }}>
                        No matching participants found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </div>

          <div className="mt-6">
            {selectedUsers.length > 0 && (
              <Alert 
                severity="info" 
                sx={{ mb: 2 }}
              >
                {selectedUsers.length} {selectedUsers.length === 1 ? 'participant' : 'participants'} selected
              </Alert>
            )}
          </div>

          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => setOpenGroupModal(false)}
              sx={{ 
                borderColor: '#d1d5db',
                color: '#4b5563',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: 'rgba(156, 163, 175, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={createGroupAppointment}
              disabled={selectedUsers.length < 2 || !selectedCategory || !groupReason.trim()}
              sx={{ 
                backgroundColor: '#10b981', 
                '&:hover': { backgroundColor: '#059669' },
                '&.Mui-disabled': {
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af'
                }
              }}
            >
              Create Group Session
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Reschedule Modal */}
      <Modal 
        open={openRescheduleModal} 
        onClose={() => setOpenRescheduleModal(false)}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#10b981', fontWeight: 'bold' }}>
            Reschedule Group Session
          </Typography>
          
          {selectedGroupAppointment && (
            <Box sx={{ my: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Session ID: #{selectedGroupAppointment.appointment_id.toString().slice(0, 8)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Focus:</strong> {selectedGroupAppointment.reason || 'Not specified'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Participants:</strong> {selectedGroupAppointment.groupappointments?.length || 0}
              </Typography>
            </Box>
          )}
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Are you sure you want to reschedule this group session? You will need to notify all participants of the new schedule.
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => setOpenRescheduleModal(false)}
              sx={{ 
                borderColor: '#d1d5db',
                color: '#4b5563',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: 'rgba(156, 163, 175, 0.04)'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleConfirmReschedule}
              sx={{ 
                backgroundColor: '#10b981', 
                '&:hover': { backgroundColor: '#059669' }
              }}
            >
              Confirm Reschedule
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Cancel Modal */}
      <Modal 
        open={openCancelModal} 
        onClose={() => setOpenCancelModal(false)}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#ef4444', fontWeight: 'bold' }}>
            Cancel Group Session
          </Typography>
          
          {selectedGroupAppointment && (
            <Box sx={{ my: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Session ID: #{selectedGroupAppointment.appointment_id.toString().slice(0, 8)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Focus:</strong> {selectedGroupAppointment.reason || 'Not specified'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Participants:</strong> {selectedGroupAppointment.groupappointments?.length || 0}
              </Typography>
            </Box>
          )}
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            Cancelling this session will notify all participants. This action cannot be undone.
          </Alert>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => setOpenCancelModal(false)}
              sx={{ 
                borderColor: '#d1d5db',
                color: '#4b5563',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: 'rgba(156, 163, 175, 0.04)'
                }
              }}
            >
              Keep Session
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleConfirmCancel}
            >
              Cancel Session
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}