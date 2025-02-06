'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Sidebar from "../components/dashboard components/sidebar";
import { FaPlus } from 'react-icons/fa'; // Import the plus icon from react-icons

// Initialize Supabase Client
const supabase = createClientComponentClient();

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [notificationContent, setNotificationContent] = useState('');
    const [targetGroup, setTargetGroup] = useState('all'); // Add state for target group

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

    const fetchUsers = async () => {
        console.log("Fetching users");
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, user_type");

        console.log("Fetched users:", data);
        console.log("Fetch users error:", error);

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
    };

    const handlePlusClick = () => {
        fetchUsers();
        setShowUserModal(true);
    };

    const handleUserSelect = (user) => {
        console.log("Selected user:", user);
        setSelectedUser(user);
        setShowUserModal(false);
    };

    const sendNotification = async () => {
        console.log("Sending notification:", notificationContent);
        if (!notificationContent) {
            console.error("No notification content provided");
            return;
        }

        let targetUsers = [];

        switch (targetGroup) {
            case 'all':
                targetUsers = users;
                break;
            case 'counselors':
                targetUsers = users.filter(user => user.user_type === 'counselor');
                break;
            case 'secretaries':
                targetUsers = users.filter(user => user.user_type === 'secretary');
                break;
            case 'counselors_and_secretaries':
                targetUsers = users.filter(user => user.user_type === 'counselor' || user.user_type === 'secretary');
                break;
            case 'students':
                targetUsers = users.filter(user => user.user_type === 'student');
                break;
            default:
                targetUsers = [];
        }

        const notificationsToSend = targetUsers.map(user => ({
            user_id: user.user_id,
            notification_content: notificationContent,
            sent_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("notifications").insert(notificationsToSend);

        console.log("Send notification error:", error);

        if (error) {
            console.error("Error sending notification:", error);
        } else {
            setNotificationContent(''); // Clear the input field after sending
        }
    };

    return (
        <div className="h-screen flex">
            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Notifications Panel */}
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto">
                <div className="p-4 font-bold text-gray-700 flex items-center justify-between">
                    Notifications
                    <FaPlus className="cursor-pointer" onClick={handlePlusClick} />
                </div>
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

            {/* Main Notification Area */}
            <div className="flex-1 flex flex-col bg-gray-200">
                {/* Header */}
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    {selectedUser ? selectedUser.name : "Select a User"}
                </div>

                {/* Notification Input */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <textarea
                        className="w-full p-4 rounded-lg shadow-md bg-white text-black"
                        rows="4"
                        placeholder="Type your notification here..."
                        value={notificationContent}
                        onChange={(e) => setNotificationContent(e.target.value)}
                    />
                    <div className="flex space-x-4">
                        <select
                            className="p-2 rounded-lg shadow-md bg-white text-black"
                            value={targetGroup}
                            onChange={(e) => setTargetGroup(e.target.value)}
                        >
                            <option value="all">All Users</option>
                            <option value="counselors">All Counselors</option>
                            <option value="secretaries">All Secretaries</option>
                            <option value="counselors_and_secretaries">All Counselors and Secretaries</option>
                            <option value="students">All Students</option>
                        </select>
                        <button
                            className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            onClick={sendNotification}
                        >
                            Send Notification
                        </button>
                    </div>
                </div>
            </div>

            {/* User Selection Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-gray-700 p-4 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Select User</h2>
                        <ul>
                            {users.map((user) => (
                                <li
                                    key={user.user_id}
                                    className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    {user.name}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            onClick={() => setShowUserModal(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
