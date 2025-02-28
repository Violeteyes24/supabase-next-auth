'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";
import { Modal, Box, Button, TextField, IconButton } from '@mui/material';
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
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                setErrorMessage('Unable to fetch user data. Please log in again.');
                setOpenErrorModal(true);
                return;
            }

            const counselorId = user.id;

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
                                availabilitySchedules.map((schedule, index) => (
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
                                ))
                            )}
                        </div>
                    </div>

                    {/* Appointment Card */}
                    <div className="px-6 pb-20">
                        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                            {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h2> */}
                            <AppointmentCard />
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">Group Appointments</h2> */}
                            <GroupAppointmentsManager />
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
                                <p className="font-medium">Date: <span className="text-gray-700">{selectedDate.format('MMMM DD, YYYY')}</span></p>
                                <p className="font-medium">Time: <span className="text-gray-700">{startTime.format('hh:mm A')} - {endTime.format('hh:mm A')}</span></p>
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