"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Paper,
} from "@mui/material";
import { MdNotificationsActive } from "react-icons/md";
import { Skeleton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ViewNotificationsPage() {
  const supabase = createClientComponentClient();
  const [notifications, setNotifications] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", session.user.id);
        console.log("Session ID: ", session.user.id);
        if (error) {
          console.error("Error fetching notifications:", error);
        } else {
          console.log("Fetched notifications:", data);
          setNotifications(data);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Loading skeleton component with shimmer effect
  const ViewNotificationsSkeleton = () => (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-gray-800" />

      <div className="flex-1 p-8 relative overflow-hidden">
        {/* Shimmer overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)",
            animation: "shimmer 2s infinite",
            "@keyframes shimmer": {
              "0%": { transform: "translateX(-100%)" },
              "100%": { transform: "translateX(100%)" },
            },
            zIndex: 10,
          }}
        />

        {/* Header */}
        <div className="mb-8">
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={200} height={24} sx={{ mt: 1 }} />
        </div>

        {/* Notifications list */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={120}
                sx={{ borderRadius: 2, mb: 1 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ViewNotificationsSkeleton />;
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error during sign out:", error);
      return;
    }
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar handleLogout={handleLogout} />
      <div className="flex-1 p-8">
        <div className="flex items-center mb-8">
          <MdNotificationsActive className="text-blue-500 text-4xl mr-4" />
          <div>
            <h1 className="text-2xl font-bold text-black">Your Notifications</h1>
            <p className="text-gray-600">
              Stay updated with important announcements
            </p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">
              You have no notifications at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Paper
                key={notification.notification_id}
                elevation={1}
                className="p-4 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <Typography variant="h6" className="font-medium">
                      {notification.notification_content}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-gray-500 block mt-2"
                    >
                      Sent at: {new Date(notification.sent_at).toLocaleString()}
                    </Typography>
                  </div>
                  {/* <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => {
                      // Implement delete functionality
                    }}
                  >
                    <DeleteIcon />
                  </IconButton> */}
                </div>
              </Paper>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
