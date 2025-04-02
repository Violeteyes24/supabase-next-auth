"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
  TablePagination,
  Paper,
  TextField,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import dayjs from "dayjs";
import {
  DatePicker,
  TimePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function GroupAppointmentsManager() {
  const supabase = createClientComponentClient();

  const [individualAppointments, setIndividualAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [groupCategories] = useState([
    "Relationships",
    "Family",
    "Academic",
    "Others",
  ]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [groupReason, setGroupReason] = useState("");
  const [groupAppointments, setGroupAppointments] = useState([]);
  const [selectedGroupAppointment, setSelectedGroupAppointment] =
    useState(null);
  const [openRescheduleModal, setOpenRescheduleModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [session, setSession] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(dayjs());
  const [rescheduleStartTime, setRescheduleStartTime] = useState(dayjs());
  const [rescheduleEndTime, setRescheduleEndTime] = useState(dayjs());
  const [groupDate, setGroupDate] = useState(null);
  const [groupStartTime, setGroupStartTime] = useState(null);
  const [groupEndTime, setGroupEndTime] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [userRole, setUserRole] = useState(null);
  const [assignedCounselors, setAssignedCounselors] = useState([]);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Fetch user role
        await getUserRole(session.user.id);
      }
    };
    getSession();
  }, []);

  useEffect(() => {
    if (session && userRole) {
      if (userRole === 'secretary') {
        fetchAssignedCounselors();
      } else {
        fetchIndividualAppointments();
        fetchEligibleUsers();
        fetchGroupAppointments();
        checkAndCompleteGroupAppointments(); // Check for expired appointments on load
      }
    }
  }, [session, userRole]);

  useEffect(() => {
    if (userRole === 'secretary' && assignedCounselors.length > 0) {
      fetchEligibleUsers();
      fetchGroupAppointmentsForSecretary();
      checkAndCompleteGroupAppointments(); // Check for expired appointments for secretary
    }
  }, [assignedCounselors]);

  useEffect(() => {
    // Only set up subscription if we have the necessary state
    if (!session) return;
    
    console.log("Setting up real-time subscriptions for group appointments");
    
    // Run check immediately when component loads
    checkAndCompleteGroupAppointments();
    
    // Set up real-time subscription for appointments changes
    const appointmentChannel = supabase.channel('group-appointments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: 'appointment_type=eq.group'
        }, 
        (payload) => {
          console.log('Group appointment change received:', payload);
          checkAndCompleteGroupAppointments(); // Check appointments when changes occur
          // Refresh the appropriate data based on user role
          if (userRole === 'secretary' && assignedCounselors.length > 0) {
            fetchGroupAppointmentsForSecretary();
          } else if (userRole === 'counselor') {
            fetchGroupAppointments();
          }
        }
      )
      .subscribe();
      
    // Also subscribe to groupappointments table to track participant changes
    const participantsChannel = supabase.channel('group-participants-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groupappointments'
        },
        (payload) => {
          console.log('Group participants change received:', payload);
          // Refresh the appropriate data based on user role
          if (userRole === 'secretary' && assignedCounselors.length > 0) {
            fetchGroupAppointmentsForSecretary();
          } else if (userRole === 'counselor') {
            fetchGroupAppointments();
          }
        }
      )
      .subscribe();
      
    // Set up interval to check for expired appointments every minute
    const checkExpiredInterval = setInterval(() => {
      console.log('Running scheduled check for expired group appointments');
      checkAndCompleteGroupAppointments();
    }, 60 * 1000); // Run every minute instead of every 5 minutes

    return () => {
      console.log("Cleaning up group appointments subscriptions");
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(participantsChannel);
      clearInterval(checkExpiredInterval);
    };
  }, [session, userRole, assignedCounselors]);

  const fetchIndividualAppointments = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return;
    }

    const userId = session.user.id;
    console.log("this is the userId", userId);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("counselor_id", userId)
      .eq("appointment_type", "individual")
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching appointments:", error);
    } else {
      setIndividualAppointments(data || []);
    }
  };

  const fetchEligibleUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, name")
      .neq("user_type", "secretary")
      .neq("user_type", "counselor")
      .neq("user_id", session.user.id);

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const fetchGroupAppointments = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Error getting session:", sessionError);
      return;
    }

    const userId = session.user.id;
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        availability_schedules (
          date,
          start_time,
          end_time
        ),
        groupappointments (
          user_id,
          users (
            name
          )
        )
      `
      )
      .eq("appointment_type", "group")
      .neq("status", "completed")
      .neq("status", "cancelled")
      .eq("counselor_id", userId);

    if (error) {
      console.error("Error fetching group appointments:", error);
    } else {
      console.log("Fetched group appointments:", data);
      setGroupAppointments(data || []);
    }
  };

  const getUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("user_type")
        .eq("user_id", userId)
        .single();
        
      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }
      
      setUserRole(data.user_type);
    } catch (error) {
      console.error("Unexpected error fetching user role:", error);
    }
  };

  const fetchAssignedCounselors = async () => {
    try {
      const { data, error } = await supabase
        .from("secretary_assignments")
        .select("counselor_id")
        .eq("secretary_id", session.user.id);
        
      if (error) {
        console.error("Error fetching assigned counselors:", error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log("No counselors assigned to this secretary");
        setAssignedCounselors([]);
        return;
      }
      
      const counselorIds = data.map(assignment => assignment.counselor_id);
      console.log("Assigned counselor IDs:", counselorIds);
      setAssignedCounselors(counselorIds);
    } catch (error) {
      console.error("Unexpected error fetching assigned counselors:", error);
    }
  };

  const fetchGroupAppointmentsForSecretary = async () => {
    try {
      console.log("Fetching group appointments for secretary with counselors:", assignedCounselors);
      
      // Test query to verify the view exists
      console.log("Attempting to query secretary_appointments_view...");
      const { data: viewTest, error: viewTestError } = await supabase
        .from("secretary_appointments_view")
        .select("*")
        .eq("secretary_id", session.user.id)
        .eq("appointment_type", "group")
        .limit(5);
      
      if (viewTestError) {
        console.error("Error testing secretary_appointments_view:", viewTestError);
      } else {
        console.log("Secretary appointments view test results:", viewTest);
      }
      
      // Fetch from the view for group appointments
      const { data, error } = await supabase
        .from("secretary_appointments_view")
        .select("*")
        .eq("secretary_id", session.user.id)
        .eq("appointment_type", "group")
        .neq("status", "completed")
        .neq("status", "cancelled");
      
      if (error) {
        console.error("Error fetching group appointments for secretary:", error);
        return;
      }
      
      console.log("Group appointments from view:", data);
      
      // If no data, set empty array and return
      if (!data || data.length === 0) {
        console.log("No group appointments found for secretary's counselors");
        setGroupAppointments([]);
        return;
      }

      // Transform data to match the expected structure
      const processedAppointments = data.map(appointment => {
        // Create a base object with all the flat fields
        return {
          appointment_id: appointment.appointment_id,
          user_id: appointment.user_id,
          counselor_id: appointment.counselor_id,
          availability_schedule_id: appointment.availability_schedule_id,
          appointment_type: appointment.appointment_type,
          status: appointment.status,
          reason: appointment.reason,
          category: appointment.category,
          
          // Add the availability schedules data
          availability_schedules: {
            date: appointment.date,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            is_available: appointment.is_available
          },
          
          // Add group appointments data (this will be populated later if needed)
          groupappointments: [],
          
          // Add counselor and client names
          counselor_name: appointment.counselor_name,
          client_name: appointment.client_name,
          secretary_name: appointment.secretary_name
        };
      });
      
      // Now fetch group participants for these appointments
      for (const appointment of processedAppointments) {
        const { data: participants, error: participantsError } = await supabase
          .from("groupappointments")
          .select(`
            g_appointment_id,
            user_id,
            appointment_id,
            problem,
            users (
              user_id,
              name
            )
          `)
          .eq("appointment_id", appointment.appointment_id);
          
        if (participantsError) {
          console.error(`Error fetching participants for group appointment ${appointment.appointment_id}:`, participantsError);
        } else if (participants) {
          appointment.groupappointments = participants;
        }
      }
      
      console.log("Processed group appointments:", processedAppointments);
      setGroupAppointments(processedAppointments);
    } catch (error) {
      console.error("Unexpected error fetching group appointments:", error);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroupAppointment = async () => {
    if (selectedUsers.length < 2) {
      showSnackbar(
        "Please select at least two users for a group appointment",
        "error"
      );
      return;
    }

    if (!selectedCategory) {
      showSnackbar(
        "Please select a category for the group appointment",
        "error"
      );
      return;
    }

    // Check if date and time are provided and valid
    if (groupDate && groupStartTime && groupEndTime) {
      // Get current date and time
      const now = dayjs();
      const today = now.startOf('day');
      
      // Check if date is in the past
      if (groupDate.isBefore(today)) {
        showSnackbar("Cannot create session on a past date", "error");
        return;
      }
      
      // If the appointment is for today, check if start time is in the past
      if (groupDate.isSame(today) && groupStartTime.isBefore(now)) {
        showSnackbar("Cannot create session with a start time in the past", "error");
        return;
      }

      // Check if end time is before start time
      if (groupEndTime.isBefore(groupStartTime)) {
        showSnackbar("End time must be after start time", "error");
        return;
      }

      // Calculate duration between start and end time in minutes
      const durationMinutes = groupEndTime.diff(groupStartTime, 'minute');
      
      // Check if duration is less than 30 minutes
      if (durationMinutes < 30) {
        showSnackbar("Session duration must be at least 30 minutes", "error");
        return;
      }
    }

    try {
      // Get the current session to get the counselor ID
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Error getting session:", sessionError);
        showSnackbar("Authentication error. Please try again.", "error");
        return;
      }

      const counselorId = session.user.id;

      // Create an availability schedule if date and time are provided
      let availabilityScheduleId = null;

      if (groupDate && groupStartTime && groupEndTime) {
        const { data: schedule, error: scheduleError } = await supabase
          .from("availability_schedules")
          .insert({
            counselor_id: counselorId,
            date: groupDate.format("YYYY-MM-DD"),
            start_time: groupStartTime.format("HH:mm:ss"),
            end_time: groupEndTime.format("HH:mm:ss"),
            is_available: false, // This is now used for an appointment
          })
          .select()
          .single();

        if (scheduleError) throw scheduleError;
        availabilityScheduleId = schedule.availability_schedule_id;
      }

      // Create a new group appointment
      const { data: newAppointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          appointment_type: "group",
          status: "pending",
          reason: groupReason,
          category: selectedCategory,
          counselor_id: counselorId,
          availability_schedule_id: availabilityScheduleId,
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create group appointment entries for each selected user
      const groupAppointmentEntries = selectedUsers.map((userId) => ({
        user_id: userId,
        appointment_id: newAppointment.appointment_id,
        problem: groupReason,
      }));

      const { error: groupError } = await supabase
        .from("groupappointments")
        .insert(groupAppointmentEntries);

      if (groupError) throw groupError;

      // Reset states
      setSelectedUsers([]);
      setGroupReason("");
      setSelectedCategory("");
      setGroupDate(null);
      setGroupStartTime(null);
      setGroupEndTime(null);
      setOpenGroupModal(false);

      showSnackbar("Group appointment created successfully!", "success");
      
      // Refresh appointments based on user role
      if (userRole === 'secretary' && assignedCounselors.length > 0) {
        fetchGroupAppointmentsForSecretary();
      } else {
        fetchGroupAppointments();
      }
    } catch (error) {
      console.error("Error creating group appointment:", error);
      showSnackbar(
        `Failed to create group appointment: ${
          error.message || "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleRescheduleGroup = (appointment) => {
    setSelectedGroupAppointment(appointment);
    setRescheduleDate(dayjs());
    setRescheduleStartTime(dayjs());
    setRescheduleEndTime(dayjs());
    setOpenRescheduleModal(true);
  };

  const handleCancelGroup = (appointment) => {
    setSelectedGroupAppointment(appointment);
    setOpenCancelModal(true);
  };

  const handleConfirmReschedule = async () => {
    // Validate date and time
    const now = dayjs();
    const selectedDate = rescheduleDate.startOf('day');
    const today = now.startOf('day');
    
    // Check if selected date is in the past
    if (selectedDate.isBefore(today)) {
      showSnackbar("Cannot reschedule to a past date", "error");
      return;
    }
    
    // If rescheduling for today, check if start time is in the past
    if (selectedDate.isSame(today) && rescheduleStartTime.isBefore(now)) {
      showSnackbar("Cannot reschedule with a start time in the past", "error");
      return;
    }
    
    // Check if end time is before or equal to start time
    if (rescheduleEndTime.isBefore(rescheduleStartTime) || rescheduleEndTime.isSame(rescheduleStartTime)) {
      showSnackbar("End time must be greater than start time", "error");
      return;
    }
    
    // Calculate duration between start and end time in minutes
    const startTime = rescheduleStartTime;
    const endTime = rescheduleEndTime;
    const durationMinutes = endTime.diff(startTime, 'minute');
    
    // Check if duration is less than 30 minutes
    if (durationMinutes < 30) {
      showSnackbar("Session duration must be at least 30 minutes", "error");
      return;
    }

    try {
      // Check if there's an existing availability schedule
      if (selectedGroupAppointment.availability_schedule_id) {
        // Update existing schedule
        const { error: scheduleError } = await supabase
          .from("availability_schedules")
          .update({
            date: rescheduleDate.format("YYYY-MM-DD"),
            start_time: rescheduleStartTime.format("HH:mm:ss"),
            end_time: rescheduleEndTime.format("HH:mm:ss"),
          })
          .eq(
            "availability_schedule_id",
            selectedGroupAppointment.availability_schedule_id
          );

        if (scheduleError) throw scheduleError;
      } else {
        // Create new availability schedule
        const { data: newSchedule, error: newScheduleError } = await supabase
          .from("availability_schedules")
          .insert({
            counselor_id: session.user.id,
            date: rescheduleDate.format("YYYY-MM-DD"),
            start_time: rescheduleStartTime.format("HH:mm:ss"),
            end_time: rescheduleEndTime.format("HH:mm:ss"),
            is_available: false, // This is being used for an appointment
          })
          .select()
          .single();

        if (newScheduleError) throw newScheduleError;

        // Link the new schedule to the appointment
        const { error: updateAppointmentError } = await supabase
          .from("appointments")
          .update({
            availability_schedule_id: newSchedule.availability_schedule_id,
          })
          .eq("appointment_id", selectedGroupAppointment.appointment_id);

        if (updateAppointmentError) throw updateAppointmentError;
      }

      // Update appointment status
      const { error } = await supabase
        .from("appointments")
        .update({ status: "rescheduled" })
        .eq("appointment_id", selectedGroupAppointment.appointment_id);

      if (error) throw error;

      setOpenRescheduleModal(false);
      
      // Refresh appointments based on user role
      if (userRole === 'secretary' && assignedCounselors.length > 0) {
        fetchGroupAppointmentsForSecretary();
      } else {
        fetchGroupAppointments();
      }
      
      showSnackbar("Group appointment rescheduled successfully", "success");
    } catch (error) {
      console.error("Error rescheduling group appointment:", error);
      showSnackbar(
        "Failed to reschedule group appointment: " + error.message,
        "error"
      );
    }
  };

  const handleConfirmCancel = async () => {
    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showSnackbar(
          "You must be logged in to cancel a group appointment",
          "error"
        );
        return;
      }

      // Update appointment status to cancelled
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("appointment_id", selectedGroupAppointment.appointment_id);

      if (error) throw error;

      // Update availability schedule to be available again
      if (selectedGroupAppointment.availability_schedule_id) {
        const { error: scheduleError } = await supabase
          .from("availability_schedules")
          .update({ is_available: true })
          .eq("availability_schedule_id", selectedGroupAppointment.availability_schedule_id);

        if (scheduleError) {
          console.error("Error updating availability schedule:", scheduleError);
          // Continue with the rest of the function even if this fails
        } else {
          console.log("Successfully set availability schedule back to available");
        }
      }

      // Get information about the appointment for notification
      const participantCount =
        selectedGroupAppointment.groupappointments?.length || 0;
      const sessionCategory =
        selectedGroupAppointment.category ||
        selectedGroupAppointment.reason ||
        "Group session";

      // Format appointment date and time for notification
      let appointmentDate = "Not scheduled";
      let startTime = "Not scheduled";
      let endTime = "Not scheduled";

      if (selectedGroupAppointment.availability_schedules) {
        appointmentDate = dayjs(
          selectedGroupAppointment.availability_schedules.date
        ).format("MMMM D, YYYY");
        startTime = dayjs(
          selectedGroupAppointment.availability_schedules.start_time,
          "HH:mm"
        ).format("hh:mm A");
        endTime = dayjs(
          selectedGroupAppointment.availability_schedules.end_time,
          "HH:mm"
        ).format("hh:mm A");
      }

      // Create notification content
      const notificationContent = `Group session "${sessionCategory}" with ${participantCount} participant${
        participantCount !== 1 ? "s" : ""
      } scheduled for ${appointmentDate} at ${startTime} - ${endTime} has been cancelled.`;

      // Create notification for the counselor
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: session.user.id, // counselor's ID
          notification_content: notificationContent,
          sent_at: new Date().toISOString(),
          status: "sent",
          target_group: "system",
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Continue with the cancellation process even if notification fails
      }

      setOpenCancelModal(false);
      
      // Refresh appointments based on user role
      if (userRole === 'secretary' && assignedCounselors.length > 0) {
        fetchGroupAppointmentsForSecretary();
      } else {
        fetchGroupAppointments();
      }
      
      showSnackbar("Group appointment cancelled successfully", "info");
    } catch (error) {
      console.error("Error cancelling group appointment:", error);
      showSnackbar("Failed to cancel group appointment", "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusChipColor = (status) => {
    switch (status) {
      case "pending":
        return "primary";
      case "rescheduled":
        return "warning";
      case "cancelled":
        return "error";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper function to convert time string to Date object
  const timeToDate = (timeStr, dateStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    
    // Don't add hours - let JavaScript handle timezone conversion natively
    // Instead just log the result for debugging
    console.log(`  - Converting ${dateStr} ${timeStr} to: ${date.toLocaleString()}`);
    return date;
  };
  
  // Function to check and complete expired group appointments
  const checkAndCompleteGroupAppointments = async () => {
    try {
      if (!session) return;
      
      const userId = session.user.id;
      
      // Check if user is a counselor or secretary
      if (userRole !== 'counselor' && userRole !== 'secretary') {
        console.log('User is not a counselor or secretary');
        return;
      }
      
      // Get current date and time in Manila timezone (UTC+8)
      const now = new Date();
      console.log('--------- CHECKING EXPIRED GROUP APPOINTMENTS ---------');
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
        .eq("appointment_type", "group")
        .or('status.eq.pending,status.eq.rescheduled')
        .not('availability_schedule_id', 'is', null);
      
      // Apply additional filtering based on user role
      if (userRole === 'counselor') {
        query = query.eq("counselor_id", userId);
      } else if (userRole === 'secretary') {
        if (assignedCounselors.length === 0) return;
        query = query.in("counselor_id", assignedCounselors);
      }
      
      const { data: incompleteAppointments, error } = await query;
      
      if (error) {
        console.error("Error fetching incomplete group appointments:", error);
        return;
      }
      
      console.log(`Found ${incompleteAppointments?.length || 0} incomplete group appointments`);
      
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
          console.error("Error updating expired group appointments:", updateError);
        } else {
          console.log(`Successfully marked ${data?.length || 0} group appointments as completed:`, data);
          
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
          
          // Show notification that appointments were automatically completed
          if (data?.length > 0) {
            showSnackbar(`${data.length} group therapy ${data.length === 1 ? 'session' : 'sessions'} automatically marked as completed`, "info");
          }
          
          // Refresh the appointments lists
          if (userRole === 'secretary' && assignedCounselors.length > 0) {
            fetchGroupAppointmentsForSecretary();
          } else if (userRole === 'counselor') {
            fetchGroupAppointments();
          }
        }
      } else {
        console.log('No expired appointments found');
      }
      
      console.log('--------- FINISHED CHECKING EXPIRED APPOINTMENTS ---------');
    } catch (error) {
      console.error("Unexpected error checking expired group appointments:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: "bold", color: "#10b981" }}
        >
          Upcoming Group Therapy Sessions
        </Typography>
        {userRole === 'counselor' && (
          <Button
            variant="contained"
            onClick={() => setOpenGroupModal(true)}
            sx={{
              backgroundColor: "#10b981",
              "&:hover": { backgroundColor: "#059669" },
              textTransform: "none",
              fontWeight: "medium",
              px: 3,
              py: 1,
            }}
          >
            Create Group Session
          </Button>
        )}
      </div>

      <Paper sx={{ mb: 4, overflow: "hidden", boxShadow: 2, borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Group ID
                </TableCell>
                {userRole === "secretary" && (
                  <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                    Counselor
                  </TableCell>
                )}
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Participants
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Date
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Time
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Category
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Focus Area
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Status
                </TableCell>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: "bold" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupAppointments.length > 0 ? (
                groupAppointments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((appointment) => (
                    <TableRow
                      key={appointment.appointment_id}
                      sx={{
                        "&:hover": { backgroundColor: "#f9fafb" },
                        verticalAlign: "top",
                      }}
                    >
                      <TableCell>
                        <Typography color="text.secondary" variant="body2">
                          #{appointment.appointment_id.toString().slice(0, 8)}
                        </Typography>
                      </TableCell>
                      {userRole === "secretary" && (
                        <TableCell>
                          <Typography variant="body2" className="font-medium">
                            {appointment.counselor_name || "Unknown Counselor"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: #{appointment.counselor_id.toString().slice(0, 8)}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {appointment.groupappointments?.length > 0 ? (
                            appointment.groupappointments.map((ga, index) => (
                              <Chip
                                key={index}
                                avatar={
                                  <Avatar>
                                    {getInitials(ga.users?.name || "")}
                                  </Avatar>
                                }
                                label={ga.users?.name || "Unknown User"}
                                size="small"
                                sx={{ margin: "2px" }}
                              />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No participants data available
                            </Typography>
                          )}
                        </div>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 1 }}
                        >
                          {appointment.groupappointments?.length || 0}{" "}
                          participants
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {appointment.availability_schedules?.date
                          ? dayjs(
                              appointment.availability_schedules.date
                            ).format("MMM D, YYYY")
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        {appointment.availability_schedules?.start_time &&
                        appointment.availability_schedules?.end_time
                          ? `${dayjs(
                              appointment.availability_schedules.start_time,
                              "HH:mm"
                            ).format("hh:mm A")} - ${dayjs(
                              appointment.availability_schedules.end_time,
                              "HH:mm"
                            ).format("hh:mm A")}`
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.category || "Uncategorized"}
                          size="small"
                          sx={{
                            bgcolor:
                              appointment.category === "Relationships"
                                ? "#e0f2fe"
                                : appointment.category === "Family"
                                ? "#f0fdf4"
                                : appointment.category === "Academic"
                                ? "#fef3c7"
                                : "#f3f4f6",
                            color:
                              appointment.category === "Relationships"
                                ? "#0369a1"
                                : appointment.category === "Family"
                                ? "#15803d"
                                : appointment.category === "Academic"
                                ? "#b45309"
                                : "#4b5563",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appointment.reason || "No reason specified"}
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
                            disabled={appointment.status === "cancelled"}
                            onClick={() => handleRescheduleGroup(appointment)}
                            sx={{
                              borderColor: "#d1d5db",
                              color: "#4b5563",
                              "&:hover": {
                                borderColor: "#9ca3af",
                                backgroundColor: "rgba(156, 163, 175, 0.04)",
                              },
                            }}
                          >
                            Reschedule
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            disabled={appointment.status === "cancelled"}
                            onClick={() => handleCancelGroup(appointment)}
                            sx={{
                              "&.Mui-disabled": {
                                borderColor: "#f3f4f6",
                                color: "#9ca3af",
                              },
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
                  <TableCell colSpan={userRole === "secretary" ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Box sx={{ textAlign: "center", py: 3 }}>
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto mb-2 text-gray-300"
                      >
                        <path
                          d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <Typography variant="subtitle1" color="text.secondary">
                        No group sessions found
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        Create your first group therapy session to get started
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {groupAppointments.length > 0 && (
          <TablePagination
            component="div"
            count={groupAppointments.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{
              bgcolor: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  color: "#4b5563",
                },
            }}
          />
        )}
      </Paper>

      {/* Create Group Modal */}
      <Modal open={openGroupModal} onClose={() => setOpenGroupModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            maxWidth: "95vw",
            maxHeight: "90vh",
            overflow: "auto",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: "bold", color: "#10b981", mb: 3 }}
          >
            Create Group Therapy Session
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Date and Time Selection */}
          <div className="mt-6">
            <Typography
              variant="subtitle1"
              sx={{ mb: 2, fontWeight: "medium", color: "black" }}
            >
              Session Date and Time (Optional)
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <DatePicker
                    value={groupDate}
                    onChange={(newValue) => setGroupDate(newValue)}
                    sx={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <TimePicker
                    value={groupStartTime}
                    onChange={(newValue) => setGroupStartTime(newValue)}
                    sx={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <TimePicker
                    value={groupEndTime}
                    onChange={(newValue) => setGroupEndTime(newValue)}
                    sx={{ width: "100%" }}
                  />
                </div>
              </div>
            </LocalizationProvider>
          </div>

          {/* Group Category Selection */}
          <div>
            <Typography
              variant="subtitle1"
              sx={{ mb: 2, fontWeight: "medium", color: "black" }}
            >
              Session Category
            </Typography>
            <div className="flex flex-wrap gap-2">
              {groupCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  clickable
                  color={selectedCategory === category ? "primary" : "default"}
                  onClick={() => setSelectedCategory(category)}
                  sx={{
                    px: 1,
                    backgroundColor:
                      selectedCategory === category ? "#10b981" : "#f3f4f6",
                    color: selectedCategory === category ? "white" : "#4b5563",
                    "&:hover": {
                      backgroundColor:
                        selectedCategory === category ? "#059669" : "#e5e7eb",
                    },
                  }}
                />
              ))}
            </div>
          </div>

          {/* Group Reason */}
          <div className="mt-6">
            <Typography
              variant="subtitle1"
              sx={{ mb: 2, fontWeight: "medium", color: "black" }}
            >
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
              <Typography variant="subtitle1" sx={{ fontWeight: "medium", color: "black" }}>
                Select Participants
              </Typography>
              <Badge
                badgeContent={selectedUsers.length}
                color="primary"
                sx={{ "& .MuiBadge-badge": { backgroundColor: "#10b981" } }}
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

            <Paper
              variant="outlined"
              sx={{ maxHeight: 300, overflow: "auto", borderColor: "#e5e7eb" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ bgcolor: "#f9fafb" }}>
                      <Checkbox
                        indeterminate={
                          selectedUsers.length > 0 &&
                          selectedUsers.length < users.length
                        }
                        checked={
                          users.length > 0 &&
                          selectedUsers.length === users.length
                        }
                        onChange={() => {
                          if (selectedUsers.length === users.length) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map((u) => u.user_id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "#f9fafb", fontWeight: "medium" }}
                    >
                      Name
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.user_id}
                        hover
                        selected={selectedUsers.includes(user.user_id)}
                        onClick={() => handleUserSelect(user.user_id)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={() => handleUserSelect(user.user_id)}
                            sx={{
                              "&.Mui-checked": {
                                color: "#10b981",
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
                                bgcolor: selectedUsers.includes(user.user_id)
                                  ? "#10b981"
                                  : "#e5e7eb",
                                color: selectedUsers.includes(user.user_id)
                                  ? "white"
                                  : "#4b5563",
                                mr: 1,
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
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedUsers.length}{" "}
                {selectedUsers.length === 1 ? "participant" : "participants"}{" "}
                selected
              </Alert>
            )}
          </div>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              onClick={() => setOpenGroupModal(false)}
              sx={{
                borderColor: "#d1d5db",
                color: "#4b5563",
                "&:hover": {
                  borderColor: "#9ca3af",
                  backgroundColor: "rgba(156, 163, 175, 0.04)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={createGroupAppointment}
              disabled={
                selectedUsers.length < 2 ||
                !selectedCategory ||
                !groupReason.trim()
              }
              sx={{
                backgroundColor: "#10b981",
                "&:hover": { backgroundColor: "#059669" },
                "&.Mui-disabled": {
                  backgroundColor: "#e5e7eb",
                  color: "#9ca3af",
                },
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
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: "#10b981", fontWeight: "bold", color: "black" }}
          >
            Reschedule Group Session
          </Typography>

          {selectedGroupAppointment && (
            <Box sx={{ my: 2, p: 2, bgcolor: "#f9fafb", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Session ID: #
                {selectedGroupAppointment.appointment_id.toString().slice(0, 8)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "black" }}>
                <strong>Focus:</strong>{" "}
                {selectedGroupAppointment.reason || "Not specified"}
              </Typography>
              {userRole === "secretary" && (
                <Typography variant="body2" sx={{ mt: 1, color: "black" }}>
                  <strong>Counselor:</strong>{" "}
                  {selectedGroupAppointment.counselor_name || "Unknown"}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1, color: "black" }}>
                <strong>Participants:</strong>{" "}
                {selectedGroupAppointment.groupappointments?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "black" }}>
                <strong>Current Schedule:</strong>{" "}
                {selectedGroupAppointment.availability_schedules?.date
                  ? dayjs(selectedGroupAppointment.availability_schedules.date).format("MMM D, YYYY")
                  : "Not scheduled"}
                {selectedGroupAppointment.availability_schedules?.start_time && 
                 selectedGroupAppointment.availability_schedules?.end_time &&
                  ` | ${dayjs(selectedGroupAppointment.availability_schedules.start_time, "HH:mm").format("hh:mm A")} - 
                     ${dayjs(selectedGroupAppointment.availability_schedules.end_time, "HH:mm").format("hh:mm A")}`
                }
              </Typography>
            </Box>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <DatePicker
                  value={rescheduleDate}
                  onChange={(newValue) => setRescheduleDate(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <TimePicker
                  value={rescheduleStartTime}
                  onChange={(newValue) => setRescheduleStartTime(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <TimePicker
                  value={rescheduleEndTime}
                  onChange={(newValue) => setRescheduleEndTime(newValue)}
                  sx={{ width: "100%" }}
                />
              </div>
            </div>
          </LocalizationProvider>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              onClick={() => setOpenRescheduleModal(false)}
              sx={{
                borderColor: "#d1d5db",
                color: "#4b5563",
                "&:hover": {
                  borderColor: "#9ca3af",
                  backgroundColor: "rgba(156, 163, 175, 0.04)",
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
                "&:hover": { backgroundColor: "#059669" },
              }}
            >
              Confirm Reschedule
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={openCancelModal} onClose={() => setOpenCancelModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{ color: "#ef4444", fontWeight: "bold" }}
          >
            Cancel Group Session
          </Typography>

          {selectedGroupAppointment && (
            <Box sx={{ my: 2, p: 2, bgcolor: "#f9fafb", borderRadius: 1 }}>
              <Typography variant="body2" color="#000">
                Session ID: #
                {selectedGroupAppointment.appointment_id.toString().slice(0, 8)}
              </Typography>
              <Typography variant="body2" color="#000" sx={{ mt: 1 }}>
                <strong>Focus:</strong>{" "}
                {selectedGroupAppointment.reason || "Not specified"}
              </Typography>
              {userRole === "secretary" && (
                <Typography variant="body2" color="#000" sx={{ mt: 1 }}>
                  <strong>Counselor:</strong>{" "}
                  {selectedGroupAppointment.counselor_name || "Unknown"}
                </Typography>
              )}
              <Typography variant="body2" color="#000" sx={{ mt: 1 }}>
                <strong>Participants:</strong>{" "}
                {selectedGroupAppointment.groupappointments?.length || 0}
              </Typography>
              <Typography variant="body2" color="#000" sx={{ mt: 1 }}>
                <strong>Date:</strong>{" "}
                {selectedGroupAppointment.availability_schedules?.date
                  ? dayjs(selectedGroupAppointment.availability_schedules.date).format("MMM D, YYYY")
                  : "Not scheduled"}
              </Typography>
            </Box>
          )}

          <Alert severity="warning" sx={{ mt: 2 }}>
            Cancelling this session will notify all participants. This action
            cannot be undone.
          </Alert>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button
              variant="outlined"
              onClick={() => setOpenCancelModal(false)}
              sx={{
                borderColor: "#d1d5db",
                color: "#4b5563",
                "&:hover": {
                  borderColor: "#9ca3af",
                  backgroundColor: "rgba(156, 163, 175, 0.04)",
                },
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
