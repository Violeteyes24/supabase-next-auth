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
  TextField
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
      .eq('counselor_id', session?.user?.id)
      .eq('appointment_type', 'individual')
      .eq('status', 'pending');

    console.log('Fetching individual appointments:', data); // Add this line to log the fetched appointments

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
      .eq('appointment_type', 'group');

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
      alert('Please select at least two users for a group appointment');
      return;
    }

    try {
      // Create a new group appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          appointment_type: 'group',
          status: 'pending',
          reason: groupReason
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

      alert('Group appointment created successfully!');
    } catch (error) {
      console.error('Error creating group appointment:', error);
      alert('Failed to create group appointment');
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
      alert('Group appointment rescheduled successfully');
    } catch (error) {
      console.error('Error rescheduling group appointment:', error);
      alert('Failed to reschedule group appointment');
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
      alert('Group appointment cancelled successfully');
    } catch (error) {
      console.error('Error cancelling group appointment:', error);
      alert('Failed to cancel group appointment');
    }
  };

  return (
    <div>
      <Button 
        variant="contained" 
        onClick={() => setOpenGroupModal(true)}
        sx={{ mb: 2 }}
      >
        Create Group Appointment
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Appointment ID</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupAppointments.map((appointment) => (
              <TableRow key={appointment.appointment_id}>
                <TableCell>{appointment.appointment_id}</TableCell>
                <TableCell>
                  {appointment.groupappointments?.map(ga => 
                    ga.users?.name
                  ).join(', ')}
                </TableCell>
                <TableCell>{appointment.reason}</TableCell>
                <TableCell>{appointment.status}</TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    onClick={() => handleRescheduleGroup(appointment)}
                    sx={{ mr: 1 }}
                  >
                    Reschedule
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleCancelGroup(appointment)}
                  >
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal 
        open={openGroupModal} 
        onClose={() => setOpenGroupModal(false)}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h6" gutterBottom color='black'>
            Create Group Appointment
          </Typography>

          {/* Group Category Selection */}
          <div>
            <Typography variant="subtitle1" color='black'>Select Group Category</Typography>
            {groupCategories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'contained' : 'outlined'}
                onClick={() => setSelectedCategory(category)}
                sx={{ mr: 1, mb: 1 }}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* User Selection */}
          <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>Name</TableCell>
                  {/* <TableCell>Email</TableCell> */}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.user_id)}
                        onChange={() => handleUserSelect(user.user_id)}
                      />
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    {/* <TableCell>{user.email}</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Group Reason */}
          <TextField
            fullWidth
            label="Group Appointment Reason"
            variant="outlined"
            sx={{ mt: 2 }}
            value={groupReason}
            onChange={(e) => setGroupReason(e.target.value)}
          />

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="contained" 
              onClick={createGroupAppointment}
              disabled={selectedUsers.length < 2}
              sx={{ color: 'black' }}
            >
              Create Group Appointment
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => setOpenGroupModal(false)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

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
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h6" gutterBottom>
            Reschedule Group Appointment
          </Typography>
          <Typography>
            Are you sure you want to reschedule this group appointment?
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="contained" onClick={handleConfirmReschedule}>
              Confirm Reschedule
            </Button>
            <Button variant="outlined" onClick={() => setOpenRescheduleModal(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

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
          boxShadow: 24,
          p: 4
        }}>
          <Typography variant="h6" gutterBottom>
            Cancel Group Appointment
          </Typography>
          <Typography>
            Are you sure you want to cancel this group appointment?
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="contained" color="error" onClick={handleConfirmCancel}>
              Confirm Cancel
            </Button>
            <Button variant="outlined" onClick={() => setOpenCancelModal(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}