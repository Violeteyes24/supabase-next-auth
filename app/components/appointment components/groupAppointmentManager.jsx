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

  useEffect(() => {
    fetchIndividualAppointments();
    fetchEligibleUsers();
  }, []);

  const fetchIndividualAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_type', 'individual')
      .eq('status', 'pending');

      console.log(data);

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

  return (
    <div>
      <Button 
        variant="contained" 
        onClick={() => setOpenGroupModal(true)}
      >
        Create Group Appointment
      </Button>

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
    </div>
  );
}