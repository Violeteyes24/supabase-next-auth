'use client'

import React from "react";
import Sidebar from "../components/dashboard components/sidebar";
import AppointmentCard from "../components/appointment components/appointment_card";

export default function AppointmentPage() {
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    return (
        <div className="h-screen bg-blue-950 flex">
            {/* Sidebar */}
                <Sidebar handleLogout={handleLogout} />
            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center items-center text-white ml-20">
                <h1 className="text-3xl font-bold mt-10 mb-6">Appointment Page</h1>
                <AppointmentCard
                    name="Zachary Albert Legaria"
                    reason="Mental Disorder: Depression because of Capstone"
                    date="January 1, 2024"
                    time="12:00am"
                />
            </div>
        </div>
    );
}
