// Import necessary dependencies
'use client';

import React, { useState } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";

export default function AppointmentPage() {
    const [selectedDate, setSelectedDate] = useState('March 14, 2024'); // Default selected date

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    // Sample time slots for demonstration
    const timeSlots = [
        { time: "8:30 - 9:30", attendees: 8 },
        { time: "11:30 - 12:30", attendees: 23 },
        { time: "12:45 - 14:00", attendees: 3 },
    ];

    const days = ["11", "12", "13", "14", "15", "16", "17"]; // Mock days for the calendar UI

    return (
        <div className="h-screen bg-gray-800 flex">
            {/* Sidebar */}
            <Sidebar handleLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-white ml-20">
                <h1 className="text-3xl font-bold mt-10 mb-6">Appointment Page</h1>

                {/* Calendar UI */}
                <div className="bg-gray-900 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Availability</h2>

                    {/* Days Navigation */}
                    <div className="flex space-x-4 mb-4 overflow-x-auto">
                        {days.map((day, index) => (
                            <button
                                key={index}
                                className={`rounded-full px-4 py-2 ${selectedDate === `March ${day}, 2024`
                                        ? 'bg-yellow-500 text-black'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setSelectedDate(`March ${day}, 2024`)}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Time Slots */}
                    <div className="space-y-4">
                        {timeSlots.map((slot, index) => (
                            <div
                                key={index}
                                className="flex justify-between items-center bg-gray-700 p-4 rounded-lg"
                            >
                                <span>{slot.time}</span>
                                <span className="flex items-center space-x-2">
                                    <span>{slot.attendees} attendees</span>
                                    <span className="text-gray-400">...</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Appointment Card Example */}
                <div className="mt-10">
                    <AppointmentCard
                        name="Zachary Albert Legaria"
                        reason="Mental Disorder: Depression because of Capstone"
                        date="January 1, 2024"
                        time="12:00am"
                    />
                </div>
            </div>
        </div>
    );
}
