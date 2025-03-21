"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Modal, Box, Button, Typography, TextField, TablePagination } from "@mui/material";
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
    fetchAppointments();

    // Add real-time subscription
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

    // Cleanup subscription
    return () => {
      supabase.removeChannel(appointmentChannel);
    };
  }, []);

  const fetchAppointments = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("No session found");
      return;
    }

    const userId = session.user.id;
    const currentDate = dayjs().format("YYYY-MM-DD");

    console.log("Fetching appointments for user ID:", userId);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
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
            `
      )
      .eq("status", "pending")
      .eq("counselor_id", userId)
      .gte("availability_schedules.date", currentDate);

    if (error) {
      console.error("Error fetching appointments:", error.message);
      return;
    }

    console.log("Fetched appointments:", data);
    setAppointments(data);
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    setStartTime(dayjs(appointment.availability_schedules.start_time, "HH:mm"));
    setEndTime(dayjs(appointment.availability_schedules.end_time, "HH:mm"));
    setOpenRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    try {
      const { data, error } = await supabase
        .from("availability_schedules")
        .update({
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
      // Instead of deleting the appointment record, update the availability schedule to mark it as unavailable.
      const { data, error } = await supabase
        .from("availability_schedules")
        .update({ is_available: false })
        .eq("availability_schedule_id", selectedAppointment.availability_schedule_id);

      if (error) {
        console.error(
          "Error canceling appointment:",
          error.message,
          error.details,
          error.hint
        );
        setError("An error occurred while canceling the appointment.");
        return;
      }

      console.log("Appointment canceled:", data);
      setSuccessMessage("Appointment canceled successfully.");
      setError(null);

      // Add a delay before closing the modal then refresh appointments
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
        {/* Notification Messages */}
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

        {/* Header Section */}
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

        {/* Table Section */}
        {appointments.length > 0 ? (
          <div className="rounded-lg border border-gray-200">
            <div className="overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Client
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
                    .filter(
                      (appointment) =>
                        appointment.users && appointment.availability_schedules
                    )
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
                                {appointment.users.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Client #{appointment.user_id.slice(0, 8)}
                              </div>
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {dayjs(
                              appointment.availability_schedules.date
                            ).format("MMMM D, YYYY")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(
                              appointment.availability_schedules.start_time
                            )}{" "}
                            -{" "}
                            {formatTime(
                              appointment.availability_schedules.end_time
                            )}
                          </div>
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
              count={appointments.filter(
                appointment => appointment.users && appointment.availability_schedules
              ).length}
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

        {/* Footer Section */}
        {appointments.length > 0 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500">
              {/* Showing {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} */}
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

        {/* Reschedule Modal */}
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
                  Current schedule:{" "}
                  {dayjs(
                    selectedAppointment.availability_schedules.date
                  ).format("MMMM D, YYYY")}
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {formatTime(
                    selectedAppointment.availability_schedules.start_time
                  )}{" "}
                  -{" "}
                  {formatTime(
                    selectedAppointment.availability_schedules.end_time
                  )}
                </p>
              </div>
            )}
            <div className="space-y-4 mb-6">
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

        {/* Cancel Modal */}
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
                    {selectedAppointment.users.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    {dayjs(
                      selectedAppointment.availability_schedules.date
                    ).format("MMMM D, YYYY")}{" "}
                    |{" "}
                    {formatTime(
                      selectedAppointment.availability_schedules.start_time
                    )}{" "}
                    -{" "}
                    {formatTime(
                      selectedAppointment.availability_schedules.end_time
                    )}
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
      </div>
    </LocalizationProvider>
  );
}
