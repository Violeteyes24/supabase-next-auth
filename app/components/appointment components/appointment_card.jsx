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
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [completionStatus, setCompletionStatus] = useState("completed");
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState(dayjs().add(7, 'day'));
  const [followUpStartTime, setFollowUpStartTime] = useState(dayjs().set('hour', 9).set('minute', 0));
  const [followUpEndTime, setFollowUpEndTime] = useState(dayjs().set('hour', 10).set('minute', 0));
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
          .eq("appointment_type", "individual")
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
          .eq("appointment_type", "individual")
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

  // Helper function to convert time string to Date object
  const timeToDate = (timeStr, dateStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    
    // Log the conversion for debugging
    console.log(`  - Converting ${dateStr} ${timeStr} to: ${date.toLocaleString()}`);
    return date;
  };
  
  // Function to check and complete expired individual appointments
  const checkAndCompleteAppointments = async () => {
    try {
      if (!session) return;
      
      // Get current date and time
      const now = new Date();
      console.log('--------- CHECKING EXPIRED INDIVIDUAL APPOINTMENTS ---------');
      console.log('Current time:', now.toLocaleString());
      console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      let query = supabase
        .from("appointments")
        .select(`
          appointment_id,
          status,
          appointment_type,
          availability_schedule_id,
          availability_schedules (
            date,
            start_time,
            end_time,
            is_available
          )
        `)
        .eq("appointment_type", "individual")
        .or('status.eq.pending,status.eq.rescheduled')
        .not('availability_schedule_id', 'is', null);
      
      // Apply additional filtering based on user type
      if (userType === 'counselor') {
        query = query.eq("counselor_id", session.user.id);
      } else if (userType === 'secretary') {
        query = query.eq("secretary_id", session.user.id);
      }
      
      const { data: incompleteAppointments, error } = await query;
      
      if (error) {
        console.error("Error fetching incomplete individual appointments:", error);
        return;
      }
      
      console.log(`Found ${incompleteAppointments?.length || 0} incomplete individual appointments`);
      
      if (!incompleteAppointments || incompleteAppointments.length === 0) return;
      
      // Log raw appointment data for debugging
      console.log('Incomplete appointments (raw data):', JSON.stringify(incompleteAppointments));
      
      const expiredAppointmentIds = [];
      
      // Check each appointment to see if it's expired
      for (const appointment of incompleteAppointments) {
        if (!appointment.availability_schedules) {
          console.log(`Appointment #${appointment.appointment_id} has no schedule data`);
          continue;
        }
        
        const { date, end_time, is_available } = appointment.availability_schedules;
        
        // Convert appointment end time to Date object
        const appointmentEndTime = timeToDate(end_time, date);
        
        console.log(`Checking appointment #${appointment.appointment_id}:`);
        console.log(`  - Status: ${appointment.status}`);
        console.log(`  - Schedule date: ${date}`);
        console.log(`  - End time: ${end_time} (${appointmentEndTime.toLocaleString()})`);
        console.log(`  - Is schedule available: ${is_available}`);
        console.log(`  - Current time: ${now.toLocaleString()}`);
        console.log(`  - Is expired: ${appointmentEndTime < now}`);
        
        // Check if the appointment has ended
        if (appointmentEndTime < now) {
          console.log(`  - EXPIRED: Appointment #${appointment.appointment_id} will be marked as completed`);
          expiredAppointmentIds.push(appointment.appointment_id);
        } else {
          console.log(`  - NOT EXPIRED: Appointment #${appointment.appointment_id} has not ended yet`);
        }
      }
      
      // Update expired appointments to completed status
      if (expiredAppointmentIds.length > 0) {
        console.log(`Marking ${expiredAppointmentIds.length} expired appointments as completed:`, expiredAppointmentIds);
        
        // Force direct console output of the update parameters for debugging
        console.log('UPDATE appointments SET status = "completed" WHERE appointment_id IN', expiredAppointmentIds);
        
        const { data, error: updateError } = await supabase
          .from("appointments")
          .update({ status: "completed" })
          .in("appointment_id", expiredAppointmentIds)
          .select();
        
        if (updateError) {
          console.error("Error updating expired individual appointments:", updateError);
        } else {
          console.log(`Successfully marked ${data?.length || 0} individual appointments as completed:`, data);
          
          // Double check that appointments were actually updated
          for (const id of expiredAppointmentIds) {
            const { data: checkData, error: checkError } = await supabase
              .from("appointments")
              .select("appointment_id, status")
              .eq("appointment_id", id)
              .single();
              
            if (checkError) {
              console.error(`Error verifying update for appointment ${id}:`, checkError);
            } else {
              console.log(`Verification - Appointment ${id} now has status: ${checkData.status}`);
            }
          }
          
          // Show success message
          if (data?.length > 0) {
            setSuccessMessage(`${data.length} ${data.length === 1 ? 'appointment' : 'appointments'} automatically marked as completed`);
          }
          
          // Refresh the appointments list
          fetchAppointments();
        }
      } else {
        console.log('No expired individual appointments found');
      }
      
      console.log('--------- FINISHED CHECKING EXPIRED INDIVIDUAL APPOINTMENTS ---------');
    } catch (error) {
      console.error("Unexpected error checking expired individual appointments:", error);
    }
  };

  // Modify the useEffect for initial load
  useEffect(() => {
    const initializeComponent = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      await fetchAppointments();
      
      // Check for expired appointments immediately when component loads
      if (session) {
        checkAndCompleteAppointments();
      }
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
          checkAndCompleteAppointments(); // Check appointments when changes occur
        }
      )
      .subscribe();
      
    // Set up interval to check for expired appointments every minute
    const checkExpiredInterval = setInterval(() => {
      console.log('Running scheduled check for expired individual appointments');
      checkAndCompleteAppointments();
    }, 60 * 1000); // Run every minute
    
    return () => {
      supabase.removeChannel(appointmentChannel);
      clearInterval(checkExpiredInterval);
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

  const handleComplete = (appointment) => {
    setSelectedAppointment(appointment);
    setCompletionStatus("completed");
    setCompletionNotes("");
    // Set default follow-up time as 1 week from the original appointment at same time
    const appointmentDate = dayjs(appointment.date || (appointment.availability_schedules && appointment.availability_schedules.date));
    const appointmentStartTime = dayjs(appointment.start_time || (appointment.availability_schedules && appointment.availability_schedules.start_time), "HH:mm");
    const appointmentEndTime = dayjs(appointment.end_time || (appointment.availability_schedules && appointment.availability_schedules.end_time), "HH:mm");
    
    setFollowUpDate(appointmentDate.add(7, 'day'));
    setFollowUpStartTime(appointmentStartTime);
    setFollowUpEndTime(appointmentEndTime);
    
    setOpenCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("You must be logged in to complete an appointment.");
        return;
      }

      // Validate follow-up details if follow-up is selected
      if (completionStatus === "follow_up_needed") {
        const today = dayjs().startOf('day');
        if (followUpDate.isBefore(today)) {
          setErrorMessage('Cannot schedule follow-up to a past date.');
          setOpenErrorModal(true);
          return;
        }

        if (followUpEndTime.isBefore(followUpStartTime)) {
          setErrorMessage('End time must be after start time.');
          setOpenErrorModal(true);
          return;
        }

        const startMinutes = followUpStartTime.hour() * 60 + followUpStartTime.minute();
        const endMinutes = followUpEndTime.hour() * 60 + followUpEndTime.minute();
        if (endMinutes - startMinutes < 30) {
          setErrorMessage('Time slot must be at least 30 minutes long.');
          setOpenErrorModal(true);
          return;
        }
      }

      // First, update the current appointment status
      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ 
          status: completionStatus === "follow_up_needed" ? "completed" : completionStatus
        })
        .eq("appointment_id", selectedAppointment.appointment_id);

      if (appointmentError) {
        console.error("Error updating appointment status:", appointmentError);
        setError("An error occurred while updating the appointment.");
        return;
      }

      // If follow-up needed, create a new availability schedule and appointment
      let followUpAppointmentId = null;
      if (completionStatus === "follow_up_needed") {
        // Create a new availability schedule for the follow-up
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("availability_schedules")
          .insert({
            counselor_id: selectedAppointment.counselor_id,
            date: followUpDate.format('YYYY-MM-DD'),
            start_time: followUpStartTime.format("HH:mm"),
            end_time: followUpEndTime.format("HH:mm"),
            is_available: false
          })
          .select()
          .single();

        if (scheduleError) {
          console.error("Error creating follow-up schedule:", scheduleError);
          setError("An error occurred while creating follow-up appointment.");
          return;
        }

        // Create a new appointment as a follow-up
        const { data: followUpData, error: followUpError } = await supabase
          .from("appointments")
          .insert({
            user_id: selectedAppointment.user_id,
            counselor_id: selectedAppointment.counselor_id,
            availability_schedule_id: scheduleData.availability_schedule_id,
            status: "pending",
            appointment_type: selectedAppointment.appointment_type,
            reason: "Follow-up to previous appointment",
            is_group_eligible: selectedAppointment.is_group_eligible,
            category: selectedAppointment.category
          })
          .select()
          .single();

        if (followUpError) {
          console.error("Error creating follow-up appointment:", followUpError);
          setError("An error occurred while creating follow-up appointment.");
          return;
        }

        followUpAppointmentId = followUpData.appointment_id;
      }

      // Store notes as a separate entry if provided
      if (completionNotes.trim() !== "") {
        const { error: notesError } = await supabase
          .from("counseling_notes")
          .insert({
            appointment_id: selectedAppointment.appointment_id,
            user_id: selectedAppointment.user_id,
            counselor_id: selectedAppointment.counselor_id,
            notes: completionNotes,
            created_at: new Date().toISOString()
          })
          .select();
          
        if (notesError) {
          console.error("Error saving notes:", notesError);
          // Continue with the appointment update but log the error
        }
      }

      // Create a notification based on the completion status
      const studentName = selectedAppointment.client_name || (selectedAppointment.users && selectedAppointment.users.name) || "Unknown Student";
      const appointmentDate = dayjs(selectedAppointment.date || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.date)).format("MMMM D, YYYY");
      const startTime = formatTime(selectedAppointment.start_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.start_time));
      const endTime = formatTime(selectedAppointment.end_time || (selectedAppointment.availability_schedules && selectedAppointment.availability_schedules.end_time));
      const appointmentType = selectedAppointment.appointment_type || "Consultation";
      
      let notificationContent = "";
      
      if (completionStatus === "completed") {
        notificationContent = `${studentName}'s ${appointmentType} appointment scheduled for ${appointmentDate} at ${startTime} - ${endTime} has been completed.`;
      } else if (completionStatus === "no_show") {
        notificationContent = `${studentName} did not show up for their ${appointmentType} appointment scheduled for ${appointmentDate} at ${startTime} - ${endTime}.`;
      } else if (completionStatus === "follow_up_needed") {
        const followUpDateFormatted = followUpDate.format("MMMM D, YYYY");
        const followUpStartFormatted = formatTime(followUpStartTime.format("HH:mm"));
        const followUpEndFormatted = formatTime(followUpEndTime.format("HH:mm"));
        
        notificationContent = `${studentName}'s ${appointmentType} appointment has been completed. A follow-up appointment has been scheduled for ${followUpDateFormatted} at ${followUpStartFormatted} - ${followUpEndFormatted}.`;
      }
      
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

      // Create a notification for the student about the follow-up
      if (completionStatus === "follow_up_needed") {
        const followUpDateFormatted = followUpDate.format("MMMM D, YYYY");
        const followUpStartFormatted = formatTime(followUpStartTime.format("HH:mm"));
        const followUpEndFormatted = formatTime(followUpEndTime.format("HH:mm"));
        
        const studentNotificationContent = `You have a follow-up ${appointmentType} appointment scheduled for ${followUpDateFormatted} at ${followUpStartFormatted} - ${followUpEndFormatted}.`;
        
        const { error: studentNotifError } = await supabase
          .from("notifications")
          .insert({
            user_id: selectedAppointment.user_id,
            notification_content: studentNotificationContent,
            sent_at: new Date().toISOString(),
            status: "sent",
            target_group: "system"
          });

        if (studentNotifError) {
          console.error("Error creating student notification:", studentNotifError);
        }
      }

      const statusMap = {
        "completed": "Appointment marked as completed",
        "no_show": "Appointment marked as no-show",
        "follow_up_needed": "Appointment completed and follow-up scheduled"
      };

      setSuccessMessage(statusMap[completionStatus] || "Appointment status updated successfully");
      setError(null);

      setTimeout(() => {
        setOpenCompleteModal(false);
        fetchAppointments();
      }, 1500);
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("An unexpected error occurred while updating the appointment.");
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
            Upcoming Individual Appointments
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
                          <button
                            className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-100"
                            onClick={() => handleComplete(appointment)}
                          >
                            Complete
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

        <Modal
          open={openCompleteModal}
          onClose={() => setOpenCompleteModal(false)}
          aria-labelledby="complete-modal-title"
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
              id="complete-modal-title"
              className="text-xl font-bold text-gray-900 mb-2"
            >
              Complete Appointment
            </h2>
            {selectedAppointment && (
              <div className="mb-4">
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
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

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Appointment Status:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="complete-status"
                        name="appointment-status"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        checked={completionStatus === "completed"}
                        onChange={() => setCompletionStatus("completed")}
                      />
                      <label htmlFor="complete-status" className="ml-2 block text-sm text-gray-700">
                        Completed
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="no-show-status"
                        name="appointment-status"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        checked={completionStatus === "no_show"}
                        onChange={() => setCompletionStatus("no_show")}
                      />
                      <label htmlFor="no-show-status" className="ml-2 block text-sm text-gray-700">
                        No Show
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="follow-up-status"
                        name="appointment-status"
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        checked={completionStatus === "follow_up_needed"}
                        onChange={() => setCompletionStatus("follow_up_needed")}
                      />
                      <label htmlFor="follow-up-status" className="ml-2 block text-sm text-gray-700">
                        Follow-up Needed
                      </label>
                    </div>
                  </div>
                </div>

                {completionStatus === "follow_up_needed" && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">
                      Schedule Follow-up Appointment
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Follow-up Date
                        </label>
                        <DatePicker
                          value={followUpDate}
                          onChange={(newValue) => setFollowUpDate(newValue)}
                          sx={{ width: "100%" }}
                          disablePast
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <TimePicker
                          value={followUpStartTime}
                          onChange={(newValue) => setFollowUpStartTime(newValue)}
                          sx={{ width: "100%" }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <TimePicker
                          value={followUpEndTime}
                          onChange={(newValue) => setFollowUpEndTime(newValue)}
                          sx={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="completion-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="completion-notes"
                    rows={3}
                    className="shadow-sm focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                    placeholder="Add any notes about this appointment..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outlined"
                onClick={() => setOpenCompleteModal(false)}
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
                onClick={handleConfirmComplete}
                sx={{
                  backgroundColor: completionStatus === "completed" ? "#10b981" : 
                                   completionStatus === "no_show" ? "#ef4444" : "#3b82f6",
                  "&:hover": {
                    backgroundColor: completionStatus === "completed" ? "#059669" : 
                                     completionStatus === "no_show" ? "#dc2626" : "#2563eb",
                  },
                }}
              >
                {completionStatus === "completed" ? "Mark as Completed" : 
                 completionStatus === "no_show" ? "Mark as No Show" : "Schedule Follow-up"}
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
