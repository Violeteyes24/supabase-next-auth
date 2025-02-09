'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";

// Initialize Supabase Client
const supabase = createClientComponentClient();

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);

    // Fetch notifications from Supabase
    useEffect(() => {
        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .order("sent_at", { ascending: false });

            if (error) {
                console.error("Error fetching notifications:", error);
            } else {
                setNotifications(data);
            }
        };

        fetchNotifications();

        // Set up real-time listener
        const subscription = supabase
            .channel("realtime-notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications" },
                (payload) => {
                    setNotifications((prevNotifications) => [
                        { ...payload.new },
                        ...prevNotifications,
                    ]);
                }
            )
            .subscribe();
            
        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <div className="h-screen flex">
            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Notifications Panel */}
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto">
                <div className="p-4 font-bold text-gray-700">Notifications</div>
                {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                        <div
                            key={index}
                            className="flex items-center px-4 py-2 hover:bg-gray-200 cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                            <div className="ml-4">
                                <div className="font-bold text-gray-800">
                                    {notification.user_id || "System"}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {notification.notification_content}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(notification.sent_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-gray-600">No notifications yet.</div>
                )}
            </div>
        </div>
    );
}
