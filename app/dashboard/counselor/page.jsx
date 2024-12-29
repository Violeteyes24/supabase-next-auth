'use client';

import React from 'react';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Container } from '@mui/material';

import Navbar from '../../components/navbar';
import KPISection from '../../components/kpi_section';
import Charts from '../../components/charts';
import LogOutButton from '../../components/log_out_button';

export default function CounselorPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const kpiData = [
        { title: 'Total Users', value: 1024 },
        { title: 'Appointments This Month', value: 234 },
        { title: 'Active Counselors', value: 12 },
        { title: 'Average Mood Score', value: 7.8 },
    ];

    const chartLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const chartData = [6, 7, 8, 7.5, 9];

    // Logout function
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
            <Navbar />
            <Container sx={{ marginTop: '24px', textAlign: 'center' }}>
                <h1>Welcome, Counselor!</h1>
                <p>You are logged in as a counselor. This is your dashboard.</p>
                <KPISection data={kpiData} />
                <div style={{ marginTop: '32px' }}>
                    <Charts data={chartData} labels={chartLabels} />
                </div>
                <LogOutButton handleLogout={handleLogout} />
            </Container>
        </div>
    );
}
