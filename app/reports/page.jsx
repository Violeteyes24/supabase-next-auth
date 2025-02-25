'use client';

import React from 'react';
import { Container, Grid, Paper} from '@mui/material';
import Sidebar from '../components/dashboard components/sidebar';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
    


// Dynamically import components with SSR disabled
const FrequencyChart = dynamic(() => import('../components/report components/frequent_topic'), { ssr: false });
const EmotionalStateChart = dynamic(() => import('../components/report components/emotional_state'), { ssr: false });
const DemographicChart = dynamic(() => import('../components/report components/demographics'), { ssr: false });
const FeedbackChart = dynamic(() => import('../components/report components/user_feedback'), { ssr: false });
const AppointmentTypeChart = dynamic(() => import('../components/report components/appointment_type'), { ssr: false });
const DepartmentAppointmentChart = dynamic(() => import('../components/report components/department_appointments'), { ssr: false });

export default function ReportsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error during sign out:', error);
            return;
        }

        router.push('/login');
    };

    const fetchReport = async() =>{

    }

    return (
        <main 
        className="h-screen flex bg-white" 
        style={{ 
            flexDirection: 'column', 
            flex: 1,
            flexWrap: 'wrap', 
            overflow: 'visible' 
        }}
    >
        <Sidebar handleLogout={handleLogout} />
        <Container sx={{ marginTop: '32px', flex: 1 }}>
            <h1 className="mb-8 text-3xl font-bold text-center text-gray-800 dark:text-white">
                Reports Dashboard
            </h1>
            <Grid container spacing={4}>
                {/* Row 1 */}
                <Grid item xs={12} sm={6}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <FrequencyChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Frequent Topics</h1>
                        </div>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <EmotionalStateChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Overall Mood State</h1>
                        </div>
                    </Paper>
                </Grid>
                {/* Row 2 */}
                <Grid item xs={12} sm={6}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <DemographicChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Demographic Report</h1>
                        </div>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <FeedbackChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Feedback Report</h1>
                        </div>
                    </Paper>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <AppointmentTypeChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Demographics - Appointment Type Report</h1>
                        </div>
                    </Paper>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid #ccc', 
                            backgroundColor: '#A7F3D0'
                        }}
                    >
                        <DepartmentAppointmentChart />
                        <div className="text-center mt-4">
                            <h1 className="text-2xl font-bold">Demographics - Department Report</h1>
                        </div>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    </main>
    );
}
