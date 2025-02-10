'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";
import { Modal, Box, Button, TextField, IconButton } from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function AppointmentPage() {

    const supabase = createClientComponentClient();
    const [selectedDate, setSelectedDate] = useState(dayjs()); // Current date as default
    const [openModal, setOpenModal] = useState(false);
    const [openConfirmModal, setOpenConfirmModal] = useState(false); // For confirmation
    const [openRescheduleModal, setOpenRescheduleModal] = useState(false); // For rescheduling
    const [openCancelModal, setOpenCancelModal] = useState(false); // For canceling
    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs());
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null); // For success message
    const [errorMessage, setErrorMessage] = useState('');
    const [openErrorModal, setOpenErrorModal] = useState(false);
    const [availabilitySchedules, setAvailabilitySchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null); // For rescheduling and canceling
    const [openDatePicker, setOpenDatePicker] = useState(false); // For date picker

    useEffect(() => {
        fetchAvailabilitySchedules();

        const scheduleChannel = supabase.channel('schedule-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_schedules' }, () => {
                fetchAvailabilitySchedules(); // Refetch availability schedules on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(scheduleChannel);
        };
    }, [selectedDate]);

    const fetchAvailabilitySchedules = async () => {
        const { data, error } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('date', selectedDate.format('YYYY-MM-DD'));

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
            setError('End time must be after start time.');
            return;
        }

        setError(''); // Clear previous errors

        // Check for time conflicts
        const { data: existingSchedules, error: fetchError } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('date', selectedDate.format('YYYY-MM-DD')) // Filter by the selected date
            .gte('start_time', startTime.format('HH:mm')) // Ensure start time is not before the new time slot
            .lt('end_time', endTime.format('HH:mm')); // Ensure end time does not overlap with existing schedules

        if (fetchError) {
            console.error('Error fetching existing schedules:', fetchError.message);
            setError('An error occurred while checking for schedule conflicts.');
            return;
        }

        if (existingSchedules.length > 0) {
            setError('Hey, that schedule already exists.');
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
                setError('Unable to fetch user data. Please log in again.');
                return;
            }

            const counselorId = user.id; // Use the user's ID as the counselor_id

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
                setError('An error occurred while checking for conflicts.');
                return;
            }

            if (existingSchedules.length > 0) {
                setError('Hey, that schedule already exists.');
                setOpenErrorModal(true);  // Show the error modal if a conflict is found
                return; // Prevent further execution
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
                setError('An error occurred while adding your availability schedule.');
                return;
            }

            console.log('Availability schedule added:', data);
            setOpenModal(false); // Close the modal after a successful operation
            setSuccessMessage('Schedule added successfully.');
            setError(null); // Clear error message
            fetchAvailabilitySchedules(); // Refresh the availability schedules
        } catch (error) {
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred while adding the schedule.');
        }

        setOpenConfirmModal(false); // Close the confirmation modal
    };

    const handleReschedule = (schedule) => {
        setSelectedSchedule(schedule);
        setStartTime(dayjs(schedule.start_time, 'HH:mm'));
        setEndTime(dayjs(schedule.end_time, 'HH:mm'));
        setOpenRescheduleModal(true);
    };

    const handleConfirmReschedule = async () => {
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
                setError('An error occurred while rescheduling.');
                return;
            }

            console.log('Schedule rescheduled:', data);
            setOpenRescheduleModal(false); // Close the modal after a successful operation
            setSuccessMessage('Schedule rescheduled successfully.');
            setError(null); // Clear error message
            fetchAvailabilitySchedules(); // Refresh the availability schedules
        } catch (error) {
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred while rescheduling.');
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
                setError('An error occurred while canceling the schedule.');
                return;
            }

            console.log('Schedule canceled:', data);
            setOpenCancelModal(false); // Close the modal after a successful operation
            setSuccessMessage('Schedule canceled successfully.');
            setError(null); // Clear error message
            fetchAvailabilitySchedules(); // Refresh the availability schedules
        } catch (error) {
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred while canceling the schedule.');
        }
    };

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const formatTime = (time) => {
        return dayjs(time, 'HH:mm').format('hh:mm A');
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="h-screen bg-white flex">
                {/* Sidebar */}
                <Sidebar handleLogout={handleLogout} />

                {/* Main Content */}
                <div className="flex-1 flex flex-col text-black ml-20">
                    <h1 className="text-3xl font-bold mt-10 mb-6">Appointment Page</h1>

                    {/* Calendar UI */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Availability</h2>
                        <div className="flex items-center mb-4">
                            <h3 className="text-lg">{selectedDate.format('MMMM YYYY')}</h3>
                            <IconButton onClick={() => setOpenDatePicker(true)}>
                                <CalendarTodayIcon />
                            </IconButton>
                        </div>

                        {/* Days Navigation */}
                        <div className="flex space-x-4 mb-4 overflow-x-auto">
                            {days.map((day, index) => (
                                <button
                                    key={index}
                                    className={`rounded-full px-4 py-2 ${selectedDate.format('dddd') === day
                                        ? 'bg-emerald-500 text-black'
                                        : 'bg-emerald-200 text-black'
                                        }`}
                                    onClick={() => setSelectedDate(dayjs().day(index + 1))} // `day()` takes a number: Sunday=0, Monday=1, etc.
                                >
                                    {day} ({dayjs().day(index + 1).format('DD')})
                                </button>
                            ))}
                        </div>

                        {/* Time Slots */}
                        <div className="space-y-4">
                            {availabilitySchedules.map((schedule, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center bg-emerald-200 p-4 rounded-lg"
                                >
                                    <span>{`${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`}</span>
                                    <span className="flex items-center space-x-2">
                                        <span>{schedule.is_available ? 'Available' : 'Not Available'}</span>
                                        <Button variant="outlined" onClick={() => handleReschedule(schedule)}>Reschedule</Button>
                                        <Button variant="outlined" color="error" onClick={() => handleCancel(schedule)}>Cancel</Button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Appointment Card */}
                    <div className="mt-10">
                        <AppointmentCard
                            name="Zachary Albert Legaria"
                            reason="Mental Disorder: Depression because of Capstone"
                            date="January 1, 2024"
                            time="12:00am"
                        />
                    </div>

                    {/* Add Schedule Button */}
                    <div className="fixed bottom-8 right-8">
                        <Button
                            variant="contained"
                            color="primary"
                            style={{ borderRadius: '50%', width: '56px', height: '56px', fontSize: '24px' }}
                            onClick={() => setOpenModal(true)}
                        >
                            +
                        </Button>
                    </div>

                    {/* Error or Success Message */}
                    {error && <p className="text-red-500">{error}</p>}
                    {successMessage && <p className="text-green-500">{successMessage}</p>}
                </div>

                {/* Modal for Adding Availability */}
                <Modal open={openModal} onClose={() => setOpenModal(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <h2 className="mb-4 text-lg font-bold">Add Availability</h2>
                        <DatePicker
                            label="Select Date"
                            value={selectedDate}
                            onChange={(newValue) => setSelectedDate(newValue)}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                        <TimePicker
                            label="Start Time"
                            value={startTime}
                            onChange={(newValue) => setStartTime(newValue)}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                        <TimePicker
                            label="End Time"
                            value={endTime}
                            onChange={(newValue) => setEndTime(newValue)}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                        <div className="mt-4 flex justify-between">
                            <Button variant="contained" onClick={handleAddSchedule}>
                                Confirm
                            </Button>
                            <Button variant="outlined" onClick={() => setOpenModal(false)}>
                                Cancel
                            </Button>
                        </div>
                    </Box>
                </Modal>

                {/* Date Picker Modal */}
                <Modal open={openDatePicker} onClose={() => setOpenDatePicker(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <DatePicker
                            label="Select Date"
                            value={selectedDate}
                            onChange={(newValue) => {
                                setSelectedDate(newValue);
                                setOpenDatePicker(false);
                            }}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                    </Box>
                </Modal>

                {/* Confirmation Modal */}
                <Modal open={openConfirmModal} onClose={() => setOpenConfirmModal(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <h2 className="mb-4 text-lg font-bold">Confirm Schedule</h2>
                        <p>Are you sure you want to add the availability schedule from {startTime.format('HH:mm')} to {endTime.format('HH:mm')}?</p>
                        <div className="mt-4 flex justify-between">
                            <Button variant="contained" onClick={handleConfirmAddSchedule}>
                                Yes
                            </Button>
                            <Button variant="outlined" onClick={() => setOpenConfirmModal(false)}>
                                No
                            </Button>
                        </div>
                    </Box>
                </Modal>

                {/* Reschedule Modal */}
                <Modal open={openRescheduleModal} onClose={() => setOpenRescheduleModal(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <h2 className="mb-4 text-lg font-bold">Reschedule Availability</h2>
                        <TimePicker
                            label="Start Time"
                            value={startTime}
                            onChange={(newValue) => setStartTime(newValue)}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                        <TimePicker
                            label="End Time"
                            value={endTime}
                            onChange={(newValue) => setEndTime(newValue)}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                        />
                        <div className="mt-4 flex justify-between">
                            <Button variant="contained" onClick={handleConfirmReschedule}>
                                Confirm
                            </Button>
                            <Button variant="outlined" onClick={() => setOpenRescheduleModal(false)}>
                                Cancel
                            </Button>
                        </div>
                    </Box>
                </Modal>

                {/* Cancel Modal */}
                <Modal open={openCancelModal} onClose={() => setOpenCancelModal(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <h2 className="mb-4 text-lg font-bold">Cancel Availability</h2>
                        <p>Are you sure you want to cancel the availability schedule from {selectedSchedule?.start_time} to {selectedSchedule?.end_time}?</p>
                        <div className="mt-4 flex justify-between">
                            <Button variant="contained" color="error" onClick={handleConfirmCancel}>
                                Yes
                            </Button>
                            <Button variant="outlined" onClick={() => setOpenCancelModal(false)}>
                                No
                            </Button>
                        </div>
                    </Box>
                </Modal>

                {/* Error Modal */}
                <Modal open={openErrorModal} onClose={() => setOpenErrorModal(false)}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            boxShadow: 24,
                            p: 4,
                            width: 300,
                        }}
                    >
                        <h2 className="mb-4 text-lg font-bold">Error</h2>
                        <p>{errorMessage}</p>
                        <div className="mt-4 flex justify-center">
                            <Button variant="outlined" onClick={() => setOpenErrorModal(false)}>
                                Close
                            </Button>
                        </div>
                    </Box>
                </Modal>

            </div>
        </LocalizationProvider>
    );
}
