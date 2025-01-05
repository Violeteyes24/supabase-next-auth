'use client';

import React, { useEffect, useState } from 'react';
import { Container, Grid } from '@mui/material';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

import Sidebar from '../../components/dashboard components/sidebar';
import KPISection from '../../components/dashboard components/kpi_section';
import Charts from '../../components/dashboard components/charts';
import AppointmentCard from '../../components/appointment components/appointment_card';

export default function CounselorPage() {
    const supabase = createClientComponentClient();
    const [userName, setUserName] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function getUser() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                console.log('Dashboard User:', user);

                if (userError) {
                    console.error('Error fetching user:', userError);
                    return;
                }

                if (user) {
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('name')
                        .eq('user_id', user.id) // Assuming 'user_id' matches in your table
                        .single();

                    if (profileError) {
                        console.error('Error fetching profile:', profileError);
                        return;
                    }

                    console.log('Dashboard Profile:', profile);
                    setUserName(profile?.name || ''); // Set userName or empty string
                }
            } catch (err) {
                console.error('Unexpected error fetching user:', err);
            }
        }

        getUser();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    const kpiData = [
        { title: 'Total Users', value: 1024 },
        { title: 'Appointments This Month', value: 234 },
        { title: 'Active Counselors', value: 12 },
        { title: 'Average Mood Score', value: 7.8 },
    ];

    const chartData = [
        { day: 'Monday', mood: 6 },
        { day: 'Tuesday', mood: 7 },
        { day: 'Wednesday', mood: 8 },
        { day: 'Thursday', mood: 7.5 },
        { day: 'Friday', mood: 9 },
    ];

    return (
        <main className="h-screen bg-gray-800 flex">
            <Sidebar handleLogout={handleLogout} />
            <Container sx={{ marginTop: '16px', textAlign: 'center' }}>
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 darkv :text-white py-5">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">
                        Welcome {userName}!
                    </span>
                    <mark className="ml-3 px-2 text-white bg-emerald-600 rounded dark:bg-emerald-300">
                        Kapoyag atiman ani nila oi
                    </mark>
                </h1>
                <KPISection data={kpiData} />
                <Grid container spacing={4} sx={{ marginTop: '32px' }}>
                    <Grid item xs={12} sm={6}>
                        <AppointmentCard
                            name="Zachary Albert Legaria"
                            reason="Mental Disorder: Depression because of Capstone"
                            date="January 1, 2024"
                            time="12:00am"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Charts data={chartData} />
                    </Grid>
                </Grid>
            </Container>
        </main>
    );
}
