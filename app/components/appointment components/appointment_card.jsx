'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Modal, Box, Button, TextField } from '@mui/material';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export default function AppointmentCard() {
    const [appointments, setAppointments] = useState([]);
    const supabase = createClientComponentClient();
    const [session, setSession] = useState(null);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
    const [openCancelModal, setOpenCancelModal] = useState(false);
    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs());
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
        };
        getSession();
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                appointment_id,
                user_id,
                counselor_id,
                availability_schedule_id,
                form_id,
                response_id,
                status,
                appointment_type,
                availability_schedules (
                    date,
                    start_time,
                    end_time
                ),
                users!appointments_user_id_fkey (
                    name
                )
            `)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching appointments:', error.message);
            return;
        }
        setAppointments(data);
    };

    const handleReschedule = (appointment) => {
        setSelectedAppointment(appointment);
        setStartTime(dayjs(appointment.availability_schedules.start_time, 'HH:mm'));
        setEndTime(dayjs(appointment.availability_schedules.end_time, 'HH:mm'));
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
                .eq('availability_schedule_id', selectedAppointment.availability_schedule_id);

            if (error) {
                console.error('Error rescheduling:', error.message, error.details, error.hint);
                setError('An error occurred while rescheduling.');
                return;
            }

            console.log('Appointment rescheduled:', data);
            setOpenRescheduleModal(false); // Close the modal after a successful operation
            setSuccessMessage('Appointment rescheduled successfully.');
            setError(null); // Clear error message
            fetchAppointments(); // Refresh the appointments
        } catch (error) {
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred while rescheduling.');
        }
    };

    const handleCancel = (appointment) => {
        setSelectedAppointment(appointment);
        setOpenCancelModal(true);
    };

    const handleConfirmCancel = async () => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .delete()
                .eq('appointment_id', selectedAppointment.appointment_id);

            if (error) {
                console.error('Error canceling appointment:', error.message, error.details, error.hint);
                setError('An error occurred while canceling the appointment.');
                return;
            }

            console.log('Appointment canceled:', data);
            setOpenCancelModal(false); // Close the modal after a successful operation
            setSuccessMessage('Appointment canceled successfully.');
            setError(null); // Clear error message
            fetchAppointments(); // Refresh the appointments
        } catch (error) {
            console.error('Unexpected error:', error);
            setError('An unexpected error occurred while canceling the appointment.');
        }
    };

    const formatTime = (time) => {
        return dayjs(time, 'HH:mm').format('hh:mm A');
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="border rounded-lg shadow-xl p-6 max-w bg-white">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-emerald-400 tracking-wide">Upcoming Appointments</h2>
                </div>

                {/* Table Section */}
                {appointments.length > 0 ? (
                    <div className="overflow-auto max-h-96">
                        <table className="table-auto w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900">
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Picture</th>
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Name</th>
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Reason</th>
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Date</th>
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Time</th>
                                    <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((appointment, index) => (
                                    <tr key={index} className="hover:bg-emerald-400 transition duration-200">
                                        <td className="px-4 py-3 border-b text-gray-100 text-sm">
                                            <img
                                                src="https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"
                                                alt="Profile Picture"
                                                className="w-12 h-12 rounded-full border-2 border-emerald-400"
                                            />
                                        </td>
                                        <td className="px-4 py-3 border-b text-black text-sm">{appointment.users.name}</td>
                                        <td className="px-4 py-3 border-b text-black text-sm">{appointment.reason}</td>
                                        <td className="px-4 py-3 border-b text-black text-sm">{appointment.availability_schedules.date}</td>
                                        <td className="px-4 py-3 border-b text-black text-sm">
                                            {appointment.availability_schedules.start_time} - {appointment.availability_schedules.end_time}
                                        </td>
                                        <td className="px-4 py-3 border-b text-black text-sm">
                                            <Button variant="outlined" onClick={() => handleReschedule(appointment)}>Reschedule</Button>
                                            <Button variant="outlined" color="error" onClick={() => handleCancel(appointment)}>Cancel</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm text-center">No upcoming appointments available.</p>
                )}

                {/* Footer Section */}
                <div className="flex justify-between items-center mt-6">
                    <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-md transition duration-200">
                        Confirm All
                    </button>
                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-200">
                        Cancel All
                    </button>
                </div>

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
                        <h2 className="mb-4 text-lg font-bold">Reschedule Appointment</h2>
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
                        <h2 className="mb-4 text-lg font-bold">Cancel Appointment</h2>
                        <p>Are you sure you want to cancel the appointment?</p>
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
            </div>
        </LocalizationProvider>
    );
}
