'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";
import { Modal, Box, Button, TextField, IconButton, Switch, FormControlLabel, Skeleton, Paper, Typography, Grid, Divider, Pagination } from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import GroupAppointmentsManager from "../components/appointment components/groupAppointmentManager";
import { useRouter } from 'next/navigation';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function AppointmentPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [openModal, setOpenModal] = useState(false);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
    const [openCancelModal, setOpenCancelModal] = useState(false);
    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs());
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [openErrorModal, setOpenErrorModal] = useState(false);
    const [availabilitySchedules, setAvailabilitySchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [currentMonthDays, setCurrentMonthDays] = useState([]);
    const [session, setSession] = useState(null);
    const [completedAppointments, setCompletedAppointments] = useState([]);
    const [showGroupCompleted, setShowGroupCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completedLoading, setCompletedLoading] = useState(false);
    const [completedPage, setCompletedPage] = useState(1);
    const [completedRowsPerPage] = useState(5);
    
    // Get current time in local timezone
    const getCurrentTime = () => {
      const now = new Date();
      return now.toLocaleTimeString(); // Example: "10:45:30 AM"
    };
    
    // Helper to convert time string to Date object for comparison
    const timeToDate = (timeStr, dateStr) => {
      const [hours, minutes] = timeStr.split(':');
      const [year, month, day] = dateStr.split('-');
      return new Date(year, month - 1, day, hours, minutes);
    };
    
    // Function to check and complete expired appointments
    const checkAndCompleteAppointments = async (userId) => {
      try {
        // First, check if user is a counselor
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_type')
          .eq('user_id', userId)
          .single();
          
        if (userError || userData?.user_type !== 'counselor') {
          return;
        }
        
        // Get current date in YYYY-MM-DD format
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        
        // Get all incomplete appointments for this counselor
        const { data: appointments, error: aptError } = await supabase
          .from('appointments')
          .select('*, availability_schedules(*)')
          .eq('counselor_id', userId)
          .neq('status', 'completed')
          .order('availability_schedule_id');
          debugger;
        if (aptError) {
          console.error('Error fetching appointments:', aptError);
          return;
        }
        
        // Identify expired appointments
        const expiredAppointments = appointments.filter(apt => {
          if (!apt.availability_schedules) return false;
          
          const aptDate = apt.availability_schedules.date;
          const endTime = apt.availability_schedules.end_time;
          
          // Compare date and time with current time
          const appointmentEndTime = timeToDate(endTime, aptDate);
          return appointmentEndTime <= now;
        });
        
        // Update status to completed for expired appointments
        if (expiredAppointments.length > 0) {
          // Update appointment status
          for (const apt of expiredAppointments) {
            await supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('appointment_id', apt.appointment_id);
              
            // Update availability schedule
            await supabase
              .from('availability_schedules')
              .update({ is_available: false })
              .eq('availability_schedule_id', apt.availability_schedule_id);
          }
          
          console.log(`${expiredAppointments.length} appointments automatically completed`);
        }
        
        // Get all incomplete group appointments for this counselor
        const { data: groupAppointments, error: groupAptError } = await supabase
          .from('appointments')
          .select('*, availability_schedules(*)')
          .eq('counselor_id', userId)
          .eq('appointment_type', 'group')
          .neq('status', 'completed')
          .order('availability_schedule_id');
          
          debugger;
          
        if (groupAptError) {
          console.error('Error fetching group appointments:', groupAptError);
          return;
        }
        
        // Identify expired group appointments
        const expiredGroupAppointments = groupAppointments.filter(apt => {
          if (!apt.availability_schedules) return false;
          
          const aptDate = apt.availability_schedules.date;
          const endTime = apt.availability_schedules.end_time;
          
          // Compare date and time with current time
          const appointmentEndTime = timeToDate(endTime, aptDate);
          return appointmentEndTime <= now;
        });
        
        // Update status to completed for expired group appointments
        if (expiredGroupAppointments.length > 0) {
          // Update appointment status
          for (const apt of expiredGroupAppointments) {
            await supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('appointment_id', apt.appointment_id);
              
            // Update availability schedule
            await supabase
              .from('availability_schedules')
              .update({ is_available: false })
              .eq('availability_schedule_id', apt.availability_schedule_id);
          }
          
          console.log(`${expiredGroupAppointments.length} group appointments automatically completed`);
        }
      } catch (error) {
        console.error('Error checking appointments:', error);
      }
    };

    useEffect(() => {
      const getSession = async () => {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        
        // If user is logged in, check and complete expired appointments
        if (session?.user) {
          const userId = session.user.id;
          await checkAndCompleteAppointments(userId);
          await fetchCompletedAppointments(userId);
        }
        setLoading(false);
      };
      getSession();
    }, []);

    useEffect(() => {
        fetchAvailabilitySchedules();
        updateDaysNavigation(selectedDate);

        const scheduleChannel = supabase.channel('schedule-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_schedules' }, () => {
                fetchAvailabilitySchedules();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(scheduleChannel);
        };
    }, [selectedDate]);

    useEffect(() => {
        const appointmentChannel = supabase.channel('appointments-channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
              console.log('Appointments change received!', payload);
          })
          .subscribe();
    
        return () => {
            supabase.removeChannel(appointmentChannel);
        }
    }, []);

    // Update days navigation based on selected date
    const updateDaysNavigation = (date) => {
        const days = [];
        
        // Start with 2 days before the selected date
        for (let i = -2; i <= 3; i++) {
            days.push(date.add(i, 'day'));
        }
        
        setCurrentMonthDays(days);
    };

    // Show success toast message
    const displaySuccessToast = (message) => {
        setToastMessage(message);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };
    const fetchAvailabilitySchedules = async () => {

        const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            console.error("No session found");
            return;
          }

          const userId = session.user.id;


        const { data, error } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('date', selectedDate.format('YYYY-MM-DD'))
            .eq("counselor_id", userId)

        if (error) {
            console.error('Error fetching availability schedules:', error.message);
            setError('An error occurred while fetching availability schedules.');
        } else {
            setAvailabilitySchedules(data || []);
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

    const handleAddSchedule = async () => {
        if (endTime.isBefore(startTime)) {
            setErrorMessage('End time must be after start time.');
            setOpenErrorModal(true);
            return;
        }

        setError('');

        // Check for time conflicts
        const { data: existingSchedules, error: fetchError } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('date', selectedDate.format('YYYY-MM-DD'))
            .gte('start_time', startTime.format('HH:mm'))
            .lt('end_time', endTime.format('HH:mm'));

        if (fetchError) {
            console.error('Error fetching existing schedules:', fetchError.message);
            setErrorMessage('An error occurred while checking for schedule conflicts.');
            setOpenErrorModal(true);
            return;
        }

        if (existingSchedules?.length > 0) {
            setErrorMessage('This time slot conflicts with an existing schedule.');
            setOpenErrorModal(true);
            return;
        }

        // Open confirmation modal if no conflicts
        setOpenConfirmModal(true);
    };

    const handleConfirmAddSchedule = async () => {
        try {
            // Fetch the authenticated user
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                setErrorMessage('Unable to fetch user data. Please log in again.');
                setOpenErrorModal(true);
                return;
            }
            
            const counselorId = session.user.id;

            // Validate if there's already an existing schedule for the selected date and time range
            const { data: existingSchedules, error: fetchError } = await supabase
                .from('availability_schedules')
                .select('*')
                .eq('counselor_id', counselorId)
                .eq('date', selectedDate.format('YYYY-MM-DD'))
                .gte('start_time', startTime.format('HH:mm'))
                .lt('end_time', endTime.format('HH:mm'));

            if (fetchError) {
                console.error('Error fetching existing schedules:', fetchError.message);
                setErrorMessage('An error occurred while checking for conflicts.');
                setOpenErrorModal(true);
                return;
            }

            if (existingSchedules?.length > 0) {
                setErrorMessage('This time slot conflicts with an existing schedule.');
                setOpenErrorModal(true);
                return;
            }

            // Insert the availability schedule into the database if no conflicts
            const { data, error } = await supabase
                .from('availability_schedules')
                .insert([
                    {
                        counselor_id: counselorId,
                        start_time: startTime.format("HH:mm"),
                        end_time: endTime.format("HH:mm"),
                        date: selectedDate.format("YYYY-MM-DD"),
                        is_available: true,
                    },
                ]);

            if (error) {
                console.error('Error adding schedule:', error.message, error.details, error.hint);
                setErrorMessage('An error occurred while adding your availability schedule.');
                setOpenErrorModal(true);
                return;
            }

            setOpenModal(false);
            setOpenConfirmModal(false);
            displaySuccessToast('Schedule added successfully');
            fetchAvailabilitySchedules();
        } catch (error) {
            console.error('Unexpected error:', error);
            setErrorMessage('An unexpected error occurred while adding the schedule.');
            setOpenErrorModal(true);
        }
    };

    const handleReschedule = (schedule) => {
        setSelectedSchedule(schedule);
        setStartTime(dayjs(schedule.start_time, 'HH:mm'));
        setEndTime(dayjs(schedule.end_time, 'HH:mm'));
        setOpenRescheduleModal(true);
    };

    const handleConfirmReschedule = async () => {
        if (endTime.isBefore(startTime)) {
            setErrorMessage('End time must be after start time.');
            setOpenErrorModal(true);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('availability_schedules')
                .update({
                    start_time: startTime.format("HH:mm"),
                    end_time: endTime.format("HH:mm"),
                })
                .eq('availability_schedule_id', selectedSchedule.availability_schedule_id);

            if (error) {
                console.error('Error rescheduling:', error.message, error.details, error.hint);
                setErrorMessage('An error occurred while rescheduling.');
                setOpenErrorModal(true);
                return;
            }

            setOpenRescheduleModal(false);
            displaySuccessToast('Schedule rescheduled successfully');
            fetchAvailabilitySchedules();
        } catch (error) {
            console.error('Unexpected error:', error);
            setErrorMessage('An unexpected error occurred while rescheduling.');
            setOpenErrorModal(true);
        }
    };

    const handleCancel = (schedule) => {
        setSelectedSchedule(schedule);
        setOpenCancelModal(true);
    };

    const handleConfirmCancel = async () => {
        try {
            const { data, error } = await supabase
                .from('availability_schedules')
                // .update({ is_available: true })
                .delete()
                .eq('availability_schedule_id', selectedSchedule.availability_schedule_id);

            if (error) {
                console.error('Error canceling schedule:', error.message, error.details, error.hint);
                setErrorMessage('An error occurred while canceling the schedule.');
                setOpenErrorModal(true);
                return;
            }

            setOpenCancelModal(false);
            displaySuccessToast('Schedule canceled successfully');
            fetchAvailabilitySchedules();
        } catch (error) {
            console.error('Unexpected error:', error);
            setErrorMessage('An unexpected error occurred while canceling the schedule.');
            setOpenErrorModal(true);
        }
    };

    const formatTime = (time) => {
        return dayjs(time, 'HH:mm').format('hh:mm A');
    };

    // Handle date change from date picker
    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        updateDaysNavigation(newDate);
        setOpenDatePicker(false);
    };

    // Modal styles
    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        width: 350,
        borderRadius: 2,
    };

    // New function to fetch completed appointments
    const fetchCompletedAppointments = async (userId) => {
      try {
        setCompletedLoading(true);
        
        // First, check if user is a counselor
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_type')
          .eq('user_id', userId)
          .single();
          
        if (userError || userData?.user_type !== 'counselor') {
          setCompletedLoading(false);
          return;
        }
        
        // Fetch completed individual appointments
        if (!showGroupCompleted) {
          const { data, error } = await supabase
            .from('appointments')
            .select('*, availability_schedules(*), users!appointments_user_id_fkey(*)')
            .eq('counselor_id', userId)
            .eq('status', 'completed')
            .eq('appointment_type', 'individual')
            .order('availability_schedules(date)', { ascending: false });
            
          if (error) {
            console.error('Error fetching completed appointments:', error);
            setCompletedLoading(false);
            return;
          }
          
          setCompletedAppointments(data || []);
        } 
        // Fetch completed group appointments
        else {
          const { data: groupData, error: groupError } = await supabase
            .from('appointments')
            .select(`
              *,
              availability_schedules(*),
              groupappointments(*, users(*))
            `)
            .eq('counselor_id', userId)
            .eq('status', 'completed')
            .eq('appointment_type', 'group')
            .order('availability_schedules(date)', { ascending: false });
            
          if (groupError) {
            console.error('Error fetching completed group appointments:', groupError);
            setCompletedLoading(false);
            return;
          }
          
          setCompletedAppointments(groupData || []);
        }
        setCompletedLoading(false);
      } catch (error) {
        console.error('Error fetching completed appointments:', error);
        setCompletedLoading(false);
      }
    };

    // Add an effect to refetch when toggle changes
    useEffect(() => {
        const fetchData = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            
            if (!session) {
                console.error("No session found");
                return;
            }
            
            const userId = session.user.id;
            fetchCompletedAppointments(userId);
        };
        
        fetchData();
    }, [showGroupCompleted]);

    // Toggle between completed individual and group appointments
    const handleToggleCompleted = () => {
        setCompletedLoading(true);
        setShowGroupCompleted(!showGroupCompleted);
        setCompletedPage(1); // Reset pagination to first page when toggling
        fetchCompletedAppointments(session.user.id, !showGroupCompleted);
    };

    // CompletedAppointmentsSkeleton component
    const CompletedAppointmentsSkeleton = () => (
        <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
                <div key={index} className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-200 shadow-sm animate-pulse">
                    <div className="flex flex-col space-y-2 w-3/4">
                        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                </div>
            ))}
        </div>
    );

    // Loading skeleton component with shimmer effect
    const AppointmentSkeleton = () => (
        <div className="bg-gray-100 min-h-screen flex">
            <Box sx={{ width: 240, bgcolor: '#1E293B' }} /> {/* Sidebar placeholder */}
            <div className="flex-1 p-6">
                {/* Calendar navigation skeleton */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 4, 
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Skeleton variant="text" width={200} height={40} />
                        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 2 }}>
                        {[...Array(6)].map((_, i) => (
                            <Skeleton 
                                key={i} 
                                variant="rectangular" 
                                width={80} 
                                height={90} 
                                sx={{ borderRadius: 2, flexShrink: 0 }} 
                            />
                        ))}
                    </Box>
                </Paper>

                {/* Appointments section skeleton */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 4, 
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Skeleton variant="text" width={250} height={32} />
                        <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Time slots skeleton */}
                    <Grid container spacing={3}>
                        {[...Array(4)].map((_, index) => (
                            <Grid item xs={12} md={6} lg={3} key={index}>
                                <Skeleton 
                                    variant="rectangular" 
                                    height={140} 
                                    sx={{ 
                                        borderRadius: 2,
                                        mb: 1
                                    }} 
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Skeleton variant="rectangular" width={70} height={30} sx={{ borderRadius: 1 }} />
                                    <Skeleton variant="rectangular" width={70} height={30} sx={{ borderRadius: 1 }} />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>

                {/* Group appointments section skeleton */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden'
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Skeleton variant="text" width={230} height={32} />
                        <Skeleton variant="rectangular" width={170} height={40} sx={{ borderRadius: 1 }} />
                    </Box>

                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                </Paper>
            </div>
        </div>
    );

    // Handle completed appointments pagination
    const handleCompletedPageChange = (event, value) => {
        setCompletedPage(value);
    };

    if (loading) {
        return <AppointmentSkeleton />;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="h-screen bg-gray-50 flex">
                {/* Sidebar */}
                <Sidebar handleLogout={handleLogout} />

                {/* Main Content */}
                <div className="flex-1 flex flex-col text-black ml-20 overflow-y-auto">
                    {/* Header */}
                    <div className="bg-white shadow-sm px-6 py-4 sticky top-0 z-10">
                        <h1 className="text-2xl font-bold text-emerald-700">Appointment Management</h1>
                    </div>

                    {/* Calendar UI */}
                    <div className="bg-white p-6 rounded-lg shadow-md mx-6 my-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">Your Availability Schedule</h2>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">{selectedDate.format('MMMM YYYY')}</span>
                                <IconButton 
                                    onClick={() => setOpenDatePicker(true)}
                                    sx={{ color: '#10b981' }}
                                >
                                    <CalendarTodayIcon />
                                </IconButton>
                            </div>
                        </div>

                        {/* Days Navigation */}
                        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                            {currentMonthDays.map((day, index) => {
                                const isSelected = selectedDate.format('YYYY-MM-DD') === day.format('YYYY-MM-DD');
                                return (
                                    <button
                                        key={index}
                                        className={`rounded-full px-4 py-2 font-medium transition-all duration-200 ${
                                            isSelected
                                                ? 'bg-emerald-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-emerald-100'
                                        }`}
                                        onClick={() => setSelectedDate(day)}
                                    >
                                        <div className="text-center">
                                            <div className="text-sm">{day.format('ddd')}</div>
                                            <div className="text-lg font-bold">{day.format('DD')}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Time Slots */}
                        <div className="space-y-3">
                            {availabilitySchedules.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <div className="mb-2"><AccessTimeIcon sx={{ fontSize: 48, color: '#d1d5db' }} /></div>
                                    <p className="text-lg font-medium">No availability set for this day</p>
                                    <p className="mb-4">Add your available time slots to book appointments</p>
                                    <Button 
                                        variant="outlined" 
                                        color="primary"
                                        onClick={() => setOpenModal(true)}
                                        startIcon={<AddIcon />}
                                    >
                                        Add Availability
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {availabilitySchedules.map((schedule, index) => (
                                        <div
                                            key={index}
                                            className={`flex justify-between items-center p-4 rounded-lg ${
                                                schedule.is_available 
                                                    ? 'bg-emerald-50 border border-emerald-200' 
                                                    : 'bg-red-50 border border-red-200'
                                            } shadow-sm transition-all hover:shadow-md`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2 rounded-full shadow-sm">
                                                    <AccessTimeIcon sx={{ color: '#10b981' }} />
                                                </div>
                                                <span className="font-medium">{`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                    schedule.is_available 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {schedule.is_available ? 'Available' : 'Not Available'}
                                                </span>
                                                <IconButton 
                                                    onClick={() => handleReschedule(schedule)}
                                                    size="small"
                                                    sx={{ color: '#4b5563' }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    onClick={() => handleCancel(schedule)}
                                                    size="small"
                                                    sx={{ color: '#ef4444' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-center pt-4">
                                        <Button 
                                            variant="outlined" 
                                            color="primary"
                                            onClick={() => setOpenModal(true)}
                                            startIcon={<AddIcon />}
                                        >
                                            Add Availability
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Appointment Card */}
                    <div className="px-6 pb-20">
                        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                            {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h2> */}
                            <AppointmentCard />
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                            {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">Group Appointments</h2> */}
                            <GroupAppointmentsManager />
                        </div>

                        {/* Completed Appointments Section */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Completed Appointments</h2>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={showGroupCompleted}
                                            onChange={handleToggleCompleted}
                                            color="primary"
                                            disabled={completedLoading}
                                        />
                                    }
                                    label={
                                        <div className="flex items-center">
                                            {completedLoading && (
                                                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2"></span>
                                            )}
                                            {showGroupCompleted ? "Group Appointments" : "Individual Appointments"}
                                        </div>
                                    }
                                />
                            </div>

                            {completedLoading ? (
                                <CompletedAppointmentsSkeleton />
                            ) : completedAppointments.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p className="text-lg font-medium">No completed {showGroupCompleted ? 'group' : 'individual'} appointments found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {completedAppointments
                                            .slice((completedPage - 1) * completedRowsPerPage, 
                                                   completedPage * completedRowsPerPage)
                                            .map((appointment) => (
                                                <div
                                                    key={appointment.appointment_id}
                                                    className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-200 shadow-sm"
                                                >
                                                    <div className="flex flex-col">
                                                        {!showGroupCompleted && appointment.users && (
                                                            <p className="font-medium text-emerald-700">
                                                                {appointment.users.name}
                                                            </p>
                                                        )}
                                                        {showGroupCompleted && (
                                                            <>
                                                                <p className="font-medium text-emerald-700">
                                                                    Group Session ({appointment.groupappointments?.length || 0} participants)
                                                                </p>
                                                                <div className="mt-1">
                                                                    {appointment.groupappointments && appointment.groupappointments.length > 0 ? (
                                                                        <div className="grid grid-cols-1 gap-1">
                                                                            {appointment.groupappointments.map((participant, index) => (
                                                                                <p key={participant.g_appointment_id} className="text-sm text-gray-600">
                                                                                    {participant.users?.name}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-500 italic">No participants data available</p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                        <p className="text-gray-600">
                                                            {appointment.availability_schedules && 
                                                                `${dayjs(appointment.availability_schedules.date).format('MMM DD, YYYY')} • 
                                                                ${formatTime(appointment.availability_schedules.start_time)} - 
                                                                ${formatTime(appointment.availability_schedules.end_time)}`}
                                                        </p>
                                                        <p className="text-gray-500 text-sm mt-1">
                                                            {appointment.reason ? appointment.reason : (showGroupCompleted ? 'Group counseling' : 'Individual counseling')}
                                                        </p>
                                                    </div>
                                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                                                        Completed
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                    
                                    {/* Pagination */}
                                    {completedAppointments.length > completedRowsPerPage && (
                                        <div className="flex justify-center mt-6">
                                            <Pagination 
                                                count={Math.ceil(completedAppointments.length / completedRowsPerPage)}
                                                page={completedPage}
                                                onChange={handleCompletedPageChange}
                                                color="primary"
                                                shape="rounded"
                                                sx={{ 
                                                    '& .MuiPaginationItem-root': { 
                                                        color: '#4b5563',
                                                        '&.Mui-selected': {
                                                            backgroundColor: '#10b981',
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: '#059669'
                                                            }
                                                        }
                                                    } 
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Add Schedule Button */}
                    <div className="fixed bottom-8 right-8">
                        <Button
                            variant="contained"
                            color="primary"
                            style={{ 
                                borderRadius: '50%', 
                                width: '60px', 
                                height: '60px', 
                                backgroundColor: '#10b981',
                                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' 
                            }}
                            onClick={() => setOpenModal(true)}
                        >
                            <AddIcon />
                        </Button>
                    </div>

                    {/* Success Toast */}
                    <div 
                        className={`fixed bottom-4 right-4 bg-emerald-500 text-white py-3 px-6 rounded-lg shadow-lg transform transition-transform duration-300 flex items-center gap-2 ${
                            showSuccessToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {toastMessage}
                    </div>

                    {/* Modal for Adding Availability */}
                    <Modal open={openModal} onClose={() => setOpenModal(false)}>
                        <Box sx={modalStyle}>
                            <h2 className="mb-6 text-xl font-bold text-gray-800">Add Availability</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <DatePicker
                                        value={selectedDate}
                                        onChange={(newValue) => setSelectedDate(newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <TimePicker
                                        value={startTime}
                                        onChange={(newValue) => setStartTime(newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <TimePicker
                                        value={endTime}
                                        onChange={(newValue) => setEndTime(newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outlined" onClick={() => setOpenModal(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddSchedule}
                                    style={{ backgroundColor: '#10b981' }}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </Box>
                    </Modal>

                    {/* Date Picker Modal */}
                    <Modal open={openDatePicker} onClose={() => setOpenDatePicker(false)}>
                        <Box sx={modalStyle}>
                            <h2 className="mb-6 text-xl font-bold text-gray-800">Select Date</h2>
                            <DatePicker
                                value={selectedDate}
                                onChange={handleDateChange}
                                sx={{ width: '100%' }}
                            />
                            <div className="mt-6 flex justify-end">
                                <Button 
                                    variant="outlined" 
                                    onClick={() => setOpenDatePicker(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Box>
                    </Modal>

                    {/* Confirmation Modal */}
                    <Modal open={openConfirmModal} onClose={() => setOpenConfirmModal(false)}>
                        <Box sx={modalStyle}>
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Confirm Schedule</h2>
                            <p className="text-gray-600 mb-2">Are you sure you want to add the availability schedule?</p>
                            <div className="bg-gray-100 p-3 rounded-lg mb-4">
                                <p className="font-medium text-black">Date: <span className="text-gray-700">{selectedDate.format('MMMM DD, YYYY')}</span></p>
                                <p className="font-medium text-black">Time: <span className="text-gray-700">{startTime.format('hh:mm A')} - {endTime.format('hh:mm A')}</span></p>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="outlined" onClick={() => setOpenConfirmModal(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleConfirmAddSchedule}
                                    style={{ backgroundColor: '#10b981' }}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </Box>
                    </Modal>

                    {/* Reschedule Modal */}
                    <Modal open={openRescheduleModal} onClose={() => setOpenRescheduleModal(false)}>
                        <Box sx={modalStyle}>
                            <h2 className="mb-6 text-xl font-bold text-gray-800">Reschedule Availability</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <TimePicker
                                        value={startTime}
                                        onChange={(newValue) => setStartTime(newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <TimePicker
                                        value={endTime}
                                        onChange={(newValue) => setEndTime(newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outlined" onClick={() => setOpenRescheduleModal(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleConfirmReschedule}
                                    style={{ backgroundColor: '#10b981' }}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </Box>
                    </Modal>

                    {/* Cancel Modal */}
                    <Modal open={openCancelModal} onClose={() => setOpenCancelModal(false)}>
                        <Box sx={modalStyle}>
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Delete Availability</h2>
                            <p className="text-gray-600 mb-4">Are you sure you want to delete this availability schedule?</p>
                            {selectedSchedule && (
                                <div className="bg-gray-100 p-3 rounded-lg mb-2">
                                    <p className="font-medium">Date: <span className="text-gray-700">{selectedDate.format('MMMM DD, YYYY')}</span></p>
                                    <p className="font-medium">Time: <span className="text-gray-700">{formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}</span></p>
                                </div>
                            )}
                            <p className="text-red-500 text-sm italic mt-2">This action cannot be undone.</p>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outlined" onClick={() => setOpenCancelModal(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color="error" 
                                    onClick={handleConfirmCancel}
                                >
                                    Delete
                                </Button>
                            </div>
                        </Box>
                    </Modal>

                    {/* Error Modal */}
                    <Modal open={openErrorModal} onClose={() => setOpenErrorModal(false)}>
                        <Box sx={modalStyle}>
                            <div className="flex items-center justify-center text-red-500 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="mb-4 text-xl font-bold text-gray-800 text-center">Error</h2>
                            <p className="text-center mb-6">{errorMessage}</p>
                            <div className="flex justify-center">
                                <Button 
                                    variant="contained" 
                                    onClick={() => setOpenErrorModal(false)}
                                    style={{ backgroundColor: '#6b7280' }}
                                >
                                    Close
                                </Button>
                            </div>
                        </Box>
                    </Modal>
                </div>
            </div>
        </LocalizationProvider>
    );
}