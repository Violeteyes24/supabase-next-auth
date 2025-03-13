"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Grid,
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
} from "@mui/material";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/dashboard components/sidebar";
import KPISection from "../../components/dashboard components/kpi_section";
import Charts from "../../components/dashboard components/charts";
import AppointmentCard from "../../components/appointment components/appointment_card";

export default function CounselorPage() {
  const supabase = createClientComponentClient();
  const [userName, setUserName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [userType, setUserType] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [appointmentsThisMonth, setAppointmentsThisMonth] = useState(0);
  const [activeCounselors, setActiveCounselors] = useState(0);
  const [averageMoodScore, setAverageMoodScore] = useState(0);
  const [chartData, setChartData] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error fetching user:", userError);
          return;
        }

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("name, profile_image_url, user_type")
            .eq("user_id", user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return;
          }

          setUserName(profile?.name || "");
          setProfileImageUrl(profile?.profile_image_url || "");
          setUserType(profile?.user_type || "");
        }
      } catch (err) {
        console.error("Unexpected error fetching user:", err);
      }
    }

    getUser();
    fetchUsers();
    fetchAppointments();
    fetchMoodScores();

    // Set up realtime subscriptions
    const userChannel = supabase
      .channel("user-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    const appointmentChannel = supabase
      .channel("appointment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_schedules" },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    const moodChannel = supabase
      .channel("mood-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mood_tracker" },
        () => {
          fetchMoodScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
      supabase.removeChannel(appointmentChannel);
      supabase.removeChannel(moodChannel);
    };
  }, []);

  async function fetchUsers() {
    const { data: users, error } = await supabase.from("users").select("*");

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setTotalUsers(users.length);
    const activeCounselorsCount = users.filter(
      (user) => user.user_type === "counselor"
    ).length;
    setActiveCounselors(activeCounselorsCount);
  }

  async function fetchAppointments() {
    const { data: appointments, error } = await supabase
      .from("availability_schedules")
      .select("*")
      .eq("is_available", true);

    if (error) {
      console.error("Error fetching appointments:", error);
      return;
    }

    setAppointmentsThisMonth(appointments.length);
  }

  async function fetchMoodScores() {
    const { data: moods, error } = await supabase
      .from("mood_tracker")
      .select("intensity, tracked_at");

    if (error) {
      console.error("Error fetching mood scores:", error);
      return;
    }

    const totalMoodScore = moods.reduce((sum, mood) => sum + mood.intensity, 0);
    const averageMood = moods.length
      ? (totalMoodScore / moods.length).toFixed(1)
      : 0;
    setAverageMoodScore(averageMood);

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const moodData = daysOfWeek.map((day) => {
      const dayMoods = moods.filter(
        (mood) =>
          new Date(mood.tracked_at).toLocaleDateString("en-US", {
            weekday: "long",
          }) === day
      );
      const dayTotalMood = dayMoods.reduce(
        (sum, mood) => sum + mood.intensity,
        0
      );
      const dayAverageMood = dayMoods.length
        ? (dayTotalMood / dayMoods.length).toFixed(1)
        : 0;
      return { day, mood: parseFloat(dayAverageMood) };
    });
    setChartData(moodData);
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error during sign out:", error);
      return;
    }
    router.push("/login");
  };

  const kpiData = [
    { title: "Total Users", value: totalUsers, icon: "users" },
    {
      title: "Appointments This Month",
      value: appointmentsThisMonth,
      icon: "calendar",
    },
    { title: "Active Counselors", value: activeCounselors, icon: "user-md" },
    { title: "Average Mood Score", value: averageMoodScore, icon: "smile" },
  ];

  // Helper function to get chip color based on user type
  const getUserChipColor = (type) => {
    switch (type.toLowerCase()) {
      case "counselor":
        return {
          bg: "#4F46E5",
          text: "white",
        };
      case "admin":
        return {
          bg: "#EF4444",
          text: "white",
        };
      case "user":
      case "student":
        return {
          bg: "#10B981",
          text: "white",
        };
      default:
        return {
          bg: "#6B7280",
          text: "white",
        };
    }
  };

  const chipColor = getUserChipColor(userType);

  return (
    <Box className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
      <Sidebar handleLogout={handleLogout} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: "auto",
          px: 3,
          pt: 4,
          pb: 6,
          position: "relative", // Add this to make it a positioning context
        }}
      >
        {/* Top Right Profile Image with User Type */}
        {profileImageUrl && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 24,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Chip
              label={
                userType
                  ? userType.charAt(0).toUpperCase() + userType.slice(1)
                  : "User"
              }
              sx={{
                backgroundColor: chipColor.bg,
                color: chipColor.text,
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            />
            <Avatar
              src={profileImageUrl}
              alt="Profile"
              sx={{
                width: 48,
                height: 48,
                border: "2px solid white",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                cursor: "pointer",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            />
          </Box>
        )}

        <Container maxWidth="lg">
          {/* Header with animated gradient */}
          <Box className="text-center mb-8">
            <Typography
              variant="h3"
              component="h1"
              className="font-extrabold"
              sx={{
                background: "linear-gradient(90deg, #3B82F6 0%, #10B981 100%)",
                backgroundClip: "text",
                color: "transparent",
                animation: "gradient 3s ease infinite",
                "@keyframes gradient": {
                  "0%": {
                    backgroundPosition: "0% 50%",
                  },
                  "50%": {
                    backgroundPosition: "100% 50%",
                  },
                  "100%": {
                    backgroundPosition: "0% 50%",
                  },
                },
              }}
            >
              Welcome, {userName}!
            </Typography>
            <Typography variant="subtitle1" className="mt-2 text-gray-600">
              Here's your dashboard overview for today
            </Typography>
          </Box>

          {/* KPI Section with shadows and hover effects */}
          <Box className="mb-8">
            <KPISection
              data={kpiData}
              customStyles={{
                card: "transition-all duration-300 hover:shadow-lg hover:translate-y-[-5px]",
                iconContainer:
                  "rounded-full bg-gradient-to-r from-blue-500 to-teal-400 p-3 text-white",
              }}
            />
          </Box>

          {/* Main Content */}
          <Grid container spacing={4}>
            {/* Upcoming Appointments */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                className="rounded-xl overflow-hidden"
                sx={{
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  height: "100%",
                  border: "1px solid rgba(229, 231, 235, 0.8)",
                }}
              >
                <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-800"
                  >
                    Upcoming Appointments
                  </Typography>
                  <Typography variant="body2" className="text-gray-500">
                    Your next session is scheduled soon
                  </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  <AppointmentCard
                    name="Zachary Albert Legaria"
                    reason="Mental Disorder: Depression because of Capstone"
                    date="January 1, 2024"
                    time="12:00am"
                    className="border border-gray-100 hover:border-blue-200 transition-all"
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Mood State Chart */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                className="rounded-xl overflow-hidden"
                sx={{
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  height: "100%",
                  border: "1px solid rgba(229, 231, 235, 0.8)",
                }}
              >
                <Box sx={{ p: 3, backgroundColor: "#f8fafc" }}>
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-800"
                  >
                    Mood State Report
                  </Typography>
                  <Typography variant="body2" className="text-gray-500">
                    Weekly average mood scores
                  </Typography>
                </Box>
                <Box sx={{ p: 3, height: "calc(100% - 80px)" }}>
                  <Charts
                    data={chartData}
                    chartColors={{
                      stroke: "#3B82F6",
                      fill: "rgba(59, 130, 246, 0.1)",
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
