'use client'

import React from "react";
import Sidebar from "../components/dashboard components/sidebar"
export default function NotificationPage () {

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    }

    return(
        <main className="h-screen flex bg-gray-800">
            <Sidebar handleLogout={handleLogout} />
            <div>
                <p>This is the Notification Page</p>
            <ul>
                <li>Notification Header</li>
                <li>Notification content summarized</li>
                <li>Notification sender Director by default</li>
                <li>is read?</li>
                <li>Draft and Send feature, only for Director</li>
            </ul>
            </div>
        </main>
    )

}