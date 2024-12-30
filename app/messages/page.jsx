'use client'

import React from "react";
import Sidebar from "../components/dashboard components/sidebar"

export default function MessagePage () {

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    }
    
    return (
        <div className="h-screen bg-black">
            <Sidebar handleLogout={ handleLogout } />
            <h1>This is the Message Page</h1>
        </div>
    )
}