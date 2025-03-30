"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Modal, Box, Button, Typography, TextField, TablePagination } from "@mui/material";
import { TimePicker, DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

export default function AppointmentCard() {
  const [appointments, setAppointments] = useState([]);
  const supabase = createClientComponentClient();
  const [session, setSession] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [startTime, setStartTime] = useState(dayjs());
  const [endTime, setEndTime] = useState(dayjs());
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [userType, setUserType] = useState("");

  // Add an effect to monitor appointments state changes
  useEffect(() => {
    console.log("Debug - Appointments state updated:", appointments);
  }, [appointments]);

  // Modify the fetchAppointments function to use async/await properly
  const fetchAppointments = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      const userId = session.user.id;
      const currentDate = dayjs().format("YYYY-MM-DD");

      console.log("Debug - Current Date:", currentDate);
      console.log("Debug - User ID:", userId);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_type")
        .eq("user_id", userId)
        .single();

      if (userError) {
        console.error("Debug - User Type Error:", userError.message);
        return;
      }

      const userType = userData.user_type;
      setUserType(userType);

      if (userType === "secretary") {
        console.log("Debug - Fetching as secretary");
        
        const { data: secretaryAppointments, error: secretaryError } = await supabase
          .from("secretary_appointments_view")
          .select("*")
          .eq("secretary_id", userId)
          .neq("status", "cancelled")
          .neq("status", "rescheduled")
          .neq("status", "completed")
          // .gte("availability_schedules.date", currentDate);

        if (secretaryError) {
          console.error("Debug - Secretary Appointments Error:", secretaryError);
          return;
        }

        console.log("Debug - Raw Secretary Appointments:", secretaryAppointments);
        
        if (secretaryAppointments?.length > 0) {
          console.log("Debug - First Appointment:", secretaryAppointments[0]);
          console.log("Debug - Total Appointments:", secretaryAppointments.length);
          // Directly update the state
          setAppointments(secretaryAppointments);
        } else {
          console.log("Debug - No appointments found for secretary");
          setAppointments([]);
        }
      } else {
        console.log("Debug - Fetching as counselor");
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            appointment_id,
            user_id,
            counselor_id,
            availability_schedule_id,
            form_id,
            response_id,
            status,
            appointment_type,
            reason,
            availability_schedules (
                date,
                start_time,
                end_time
            ),
            users!appointments_user_id_fkey (
                name
            )
          `)
          .or('status.eq.pending,status.eq.rescheduled')
          .eq("counselor_id", userId)
          .gte("availability_schedules.date", currentDate);

        if (error) {
          console.error("Debug - Counselor Appointments Error:", error);
          return;
        }

        console.log("Debug - Raw Counselor Appointments:", data);
        
        if (data?.length > 0) {
          console.log("Debug - First Counselor Appointment:", data[0]);
          setAppointments(data);
        } else {
          console.log("Debug - No appointments found for counselor");
          setAppointments([]);
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to fetch appointments");
    }
  }, [supabase]);

  // Modify the useEffect for initial load
  useEffect(() => {
    const initializeComponent = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      await fetchAppointments();
    };

    initializeComponent();

    const appointmentChannel = supabase.channel('appointments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments' 
        }, 
        (payload) => {
          console.log('Appointment change received:', payload);
          fetchAppointments(); // Refresh appointments when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentChannel);
    };
  }, [fetchAppointments]);

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setSelectedDate(dayjs(appointment.date || (appointment.availability_schedules && appointment.availability_schedules.date)));
    setStartTime(dayjs(appointment.start_time || (appointment.availability_schedules && appointment.availability_schedules.start_time), "HH:mm"));
    setEndTime(dayjs(appointment.end_time || (appointment.availability_schedules && appointment.availability_schedules.end_time), "HH:mm"));
    setOpenRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    try {
      const today = dayjs().startOf('day');
      if (selectedDate.isBefore(today)) {
          setErrorMessage('Cannot reschedule to a past date.');
          setOpenErrorModal(true);
          return;
      }

      if (endTime.isBefore(startTime)) {
          setErrorMessage('End time must be after start time.');
          setOpenErrorModal(true);
          return;
      }

      const startMinutes = startTime.hour() * 60 + startTime.minute();
      const endMinutes = endTime.hour() * 60 + endTime.minute();
      if (endMinutes - startMinutes < 30) {
          setErrorMessage('Time slot must be at least 30 minutes long.');
          setOpenErrorModal(true);
          return;
      }

      const { data: existingSchedules, error: fetchError } = await supabase
          .from('availability_schedules')
          .select('*')
          .eq('date', selectedDate.format('YYYY-MM-DD'))
          .neq('availability_schedule_id', selectedAppointment.availability_schedule_id)
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

      const { data, error } = await supabase
        .from("availability_schedules")
        .update({
          date: selectedDate.format('YYYY-MM-DD'),
          start_time: startTime.format("HH:mm"),
          end_time: endTime.format("HH:mm"),
        })
        .eq(
          "availability_schedule_id",
          selectedAppointment.availability_schedule_id
        );

      if (error) {
        console.error(
          "Error rescheduling:",
          error.message,
          error.details,
          error.hint
        );
        setError("An error occurred while rescheduling.");
        return;
      }

      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ 
          status: "rescheduled"
        })
        .eq("appointment_id", selectedAppointment.appointment_id);

      if (appointmentError) {
        console.error("Error updating appointment status:", appointmentError);
        setError("An error occurred while updating the appointment status.");
        return;
      }

      const studentName = selectedAppointment.client_name || (selectedAppointment.users && selectedAppointment.users.name) || "Unknown Student";
      const appointmentDate = selectedDate.format("MMMM D, YYYY");
      const formattedStartTime = formatTime(startTime.format("HH:mm"));
      const formattedEndTime = formatTime(endTime.format("HH:mm"));
      const appointmentType = selectedAppointment.appointment_type || "Consultation";
      const notificationContent = `${studentName}'s ${appointmentType} appointment has been rescheduled to ${appointmentDate} at ${formattedStartTime} - ${formattedEndTime}.`;
      
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: selectedAppointment.counselor_id,
          notification_content: notificationContent,
          sent_at: new Date().toISOString(),
          status: "sent",
          target_group: "system"
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      console.log("Appointment rescheduled:", data);
      setOpenRescheduleModal(false);
      setSuccessMessage("Appointment rescheduled successfully.");
      setError(null);
      fetchAppointments();
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("An unexpected error occurred while rescheduling.");
    }
  };

  const handleCancel = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("You must be logged in to cancel an appointment.");
        return;
      }

      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ 
          status: "cancelled", 
          reason: "Cancelled by user"
        })
        .eq("appointment_id", selectedAppointment.appointment_id);

      if (appointmentError) {
        console.error("Error updating appointment status:", appointmentError);
        setError("An error occurred while canceling the appointment.");
        return;
      }

      const { error: scheduleError } = await supabase
        .from("availability_schedules")
        .update({ is_available: true })
        .eq("availability_schedule_id", selectedAppointment.availability_schedule_id);

      if (scheduleError) {
        console.error(
          "Error updating availability schedule:",
          scheduleError.message,
          scheduleError.details,
          scheduleError.hint
        );
        setError("An error occurred while canceling the appointment.");
        return;
      }

      const studentName = selectedAppointment.client_name || (selectedAppointment.users && selectedAppointment.users.name) || "Unknown Student";
      const appointmentDate = dayjs(selectedAppointment.date || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.date)).format("MMMM D, YYYY");
      const startTime = formatTime(selectedAppointment.start_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.start_time));
      const endTime = formatTime(selectedAppointment.end_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.end_time));
      const appointmentType = selectedAppointment.appointment_type || "Consultation";
      const notificationContent = `${studentName} has cancelled their ${appointmentType} appointment scheduled for ${appointmentDate} at ${startTime} - ${endTime}.`;
      
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: selectedAppointment.counselor_id,
          notification_content: notificationContent,
          sent_at: new Date().toISOString(),
          status: "sent",
          target_group: "system"
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }

      console.log("Appointment canceled successfully");
      setSuccessMessage("Appointment canceled successfully.");
      setError(null);

      setTimeout(() => {
        setOpenCancelModal(false);
        fetchAppointments();
      }, 1500);
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("An unexpected error occurred while canceling the appointment.");
    }
  };

  const formatTime = (time) => {
    return dayjs(time, "HH:mm").format("hh:mm A");
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="border rounded-lg shadow-xl p-6 bg-white">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 rounded">
            <p>{successMessage}</p>
            <button
              className="ml-2 text-green-700 font-bold"
              onClick={() => setSuccessMessage(null)}
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            <p>{error}</p>
            <button
              className="ml-2 text-red-700 font-bold"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: "bold", color: "#10b981" }}
          >
            Upcoming Appointments
          </Typography>
          <div className="text-sm text-gray-500">
            {dayjs().format("dddd, MMMM D, YYYY")}
          </div>
        </div>

        {appointments.length > 0 ? (
          <div className="rounded-lg border border-gray-200">
            <div className="overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Appointment type and Reason{" "}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((appointment, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover border-2 border-emerald-400"
                                src="https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"
                                alt="Profile"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.client_name || (appointment.users && appointment.users.name) || "Unknown Student"}
                              </div>
                              <div className="text-sm text-gray-500">
                                Student #{appointment.user_id?.slice(0, 8) || "N/A"}
                              </div>
                              {userType === "secretary" && (
                                <div className="text-xs text-emerald-600">
                                  Counselor: {appointment.counselor_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {appointment.appointment_type || "Consultation"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.reason || "General session"}
                          </div>
                          {appointment.status === "rescheduled" && (
                            <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full inline-block">
                              Rescheduled
                            </div>
                          )}
                          {appointment.category && (
                            <div className="text-xs text-emerald-600">
                              Category: {appointment.category}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {dayjs(appointment.date || (appointment.availability_schedules && appointment.availability_schedules.date)).format("MMMM D, YYYY")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {`${formatTime(appointment.start_time || (appointment.availability_schedules && appointment.availability_schedules.start_time))} - ${formatTime(appointment.end_time || (appointment.availability_schedules && appointment.availability_schedules.end_time))}`}
                          </div>
                          {appointment.is_group_eligible && (
                            <div className="text-xs text-blue-600">
                              Group Session Eligible
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600 shadow-sm hover:bg-emerald-100"
                            onClick={() => handleReschedule(appointment)}
                          >
                            Reschedule
                          </button>
                          <button
                            className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100"
                            onClick={() => handleCancel(appointment)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <TablePagination
              component="div"
              count={appointments.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{
                bgcolor: '#f9fafb',
                borderTop: '1px solid #e5e7eb',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: '#4b5563'
                }
              }}
            />
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center border rounded-lg border-dashed border-gray-300 bg-gray-50">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No appointments
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You have no upcoming appointments at this time.
            </p>
          </div>
        )}

        {appointments.length > 0 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Best of luck Counselor!
            </div>
            <div className="space-x-2">
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-sm transition duration-200 text-sm">
                Confirm All
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition duration-200 text-sm">
                Cancel All
              </button>
            </div>
          </div>
        )}

        <Modal
          open={openRescheduleModal}
          onClose={() => setOpenRescheduleModal(false)}
          aria-labelledby="reschedule-modal-title"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "white",
              borderRadius: "8px",
              boxShadow: 24,
              p: 4,
              width: 400,
              maxWidth: "90%",
            }}
          >
            <h2
              id="reschedule-modal-title"
              className="text-xl font-bold text-gray-900 mb-6"
            >
              Reschedule Appointment
            </h2>
            {selectedAppointment && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  Current schedule: {" "}
                  {dayjs(selectedAppointment.date || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.date)).format("MMMM D, YYYY")}
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {formatTime(selectedAppointment.start_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.start_time))} - {formatTime(selectedAppointment.end_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.end_time))}
                </p>
                {userType === "secretary" && (
                  <p className="text-sm text-emerald-600">
                    Counselor: {selectedAppointment.counselor_name}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <TimePicker
                  value={startTime}
                  onChange={(newValue) => setStartTime(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <TimePicker
                  value={endTime}
                  onChange={(newValue) => setEndTime(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outlined"
                onClick={() => setOpenRescheduleModal(false)}
                sx={{
                  borderColor: "#d1d5db",
                  color: "#4b5563",
                  "&:hover": {
                    borderColor: "#9ca3af",
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmReschedule}
                sx={{
                  backgroundColor: "#10b981",
                  "&:hover": {
                    backgroundColor: "#059669",
                  },
                }}
              >
                Save Changes
              </Button>
            </div>
          </Box>
        </Modal>

        <Modal
          open={openCancelModal}
          onClose={() => setOpenCancelModal(false)}
          aria-labelledby="cancel-modal-title"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "white",
              borderRadius: "8px",
              boxShadow: 24,
              p: 4,
              width: 400,
              maxWidth: "90%",
            }}
          >
            <h2
              id="cancel-modal-title"
              className="text-xl font-bold text-gray-900 mb-2"
            >
              Cancel Appointment
            </h2>
            {selectedAppointment && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to cancel this appointment?
                </p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAppointment.client_name || (selectedAppointment.users && selectedAppointment.users.name) || "Unknown Student"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {dayjs(selectedAppointment.date || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.date)).format("MMMM D, YYYY")}{" "}
                    |{" "}
                    {formatTime(selectedAppointment.start_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.start_time))}
                    -{" "}
                    {formatTime(selectedAppointment.end_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.end_time))}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedAppointment.appointment_type || "Consultation"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outlined"
                onClick={() => setOpenCancelModal(false)}
                sx={{
                  borderColor: "#d1d5db",
                  color: "#4b5563",
                  "&:hover": {
                    borderColor: "#9ca3af",
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                Keep Appointment
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmCancel}
                sx={{
                  backgroundColor: "#ef4444",
                  "&:hover": {
                    backgroundColor: "#dc2626",
                  },
                }}
              >
                Cancel Appointment
              </Button>
            </div>
          </Box>
        </Modal>

        <Modal open={openErrorModal} onClose={() => setOpenErrorModal(false)}>
          <Box sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            borderRadius: "8px",
            boxShadow: 24,
            p: 4,
            width: 400,
            maxWidth: "90%",
          }}>
            <div className="flex items-center justify-center text-red-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-4 text-xl font-bold text-gray-800 text-center">Error</h2>
            <p className="text-center mb-6 text-black">{errorMessage}</p>
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
    </LocalizationProvider>
  );
}
