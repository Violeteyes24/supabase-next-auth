'use client';

import React from 'react';
import { Container, Grid } from '@mui/material';
import Sidebar from '../components/dashboard components/sidebar';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import components with SSR disabled
const FrequencyChart = dynamic(() => import('../components/report components/frequent_topic'), { ssr: false });
const EmotionalStateChart = dynamic(() => import('../components/report components/emotional_state'), { ssr: false });
const DemographicChart = dynamic(() => import('../components/report components/demographics'), { ssr: false });
const FeedbackChart = dynamic(() => import('../components/report components/user_feedback'), { ssr: false });

export default function ReportsPage() {
    const router = useRouter();

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error during sign out:', error);
            return;
        }

        router.push('/login');
    };

    return (
        <main className="h-screen flex bg-gray-800">
            <Sidebar handleLogout={handleLogout} />
            <Container sx={{ marginTop: '32px' }}>
                <h1 className="mb-8 text-3xl font-bold text-center text-gray-800 dark:text-white">
                    Reports Dashboard
                </h1>

                <Grid container spacing={4}>
                    {/* Row 1 */}
                    <Grid item xs={12} sm={6}>
                        <FrequencyChart />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <EmotionalStateChart />
                    </Grid>
                    {/* Row 2 */}
                    <Grid item xs={12} sm={6}>
                        <DemographicChart />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FeedbackChart />
                    </Grid>
                </Grid>
            </Container>
        </main>
    );
}
