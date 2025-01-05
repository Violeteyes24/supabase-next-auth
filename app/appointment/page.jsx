/* Need to have a creation of availability schedule. 

1. have a '+' button to create an available schedule
2. display calendar UI to input time and date
3. after user input, display pop up to confirm or cancel
4. if confirmed, date and time will be put on availability_schedule table
5. cancel retains the availability as it is. 

table: availability_schedules

fields: availability_schedule_id(uuid), counselor_id(uuid), start_time(time), end_time(time), date(date), is_available (bool)

*/
'use client';

import React, { useState } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";

export default function AppointmentPage() {
    const [selectedDate, setSelectedDate] = useState('March 14, 2024'); // I want the date to be selected is the current date

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    
    const timeSlots = [ // I want this to be {users.name where = user_type = 'student'} its okay to not fetch the user yet because there is no student user yet.
        { time: "8:30 - 9:30", student: 8 }, // am
        { time: "10:30 - 11:30", student: 23 }, // am
        { time: "1:30 - 2:30", student: 3 }, // pm
        { time: "3:30 - 4:30", student: 3 }, // pm
    ];

    // need to make this Monday - Friday with the corresponding day to the current calendar
    const days = ["11", "12", "13", "14", "15", "16", "17"];

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
                                    <span>{slot.student} student</span>
                                    <span className="text-gray-400">...</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Appointment Card Example */}
                {/* I want this to have the props of my database, still same comment above, user_type student but okay if its not fetched */}
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
