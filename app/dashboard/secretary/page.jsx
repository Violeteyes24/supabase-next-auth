'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from "react";
// import LogOutButton from '../../components/login components/log_out_button'
import Sidebar from '../../components/dashboard components/sidebar';

export default function SecretaryPage() {

    const supabase = createClientComponentClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('users') // Use "users" table
                    .select('user_type') // Fetch the "user_type" column
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                    setError('Unable to fetch user role. Please try again.');
                    return;
                }

                setUser({ ...user, role: profile.user_type });
                setLoading(false); // Stop loading if the user is authenticated
            } else {
                setLoading(false); // Stop loading if no user is found
            }
        }

        getUser();
    }, []); // Runs once after initial mount (and after magic link is clicked)

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    return (
        <div>
            <Sidebar handleLogout={handleLogout}/>
            <h1>Welcome, Secretary!</h1>
            <p>You are logged in as a secretary. This is your dashboard.</p>
            {/* <LogOutButton handleLogout={handleLogout} /> */}
        </div>
    );
}
