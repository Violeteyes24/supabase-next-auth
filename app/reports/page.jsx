'use client';

import React from 'react';
import { Container, Grid, Paper } from '@mui/material';
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

    return (
        <main className="h-screen flex bg-gray-100">
            <Sidebar handleLogout={handleLogout} />
            <Container sx={{ marginTop: '32px', flex: 1 }}>
                <h1 className="mb-8 text-4xl font-bold text-center text-gray-800 dark:text-black">
                    Reports Dashboard
                </h1>
                <Grid container spacing={4}>
                    {/* Row 1 */}
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <EmotionalStateChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Overall Mood State</h2>
                            </div>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <FrequencyChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Frequent Topics</h2>
                            </div>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <DemographicChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Demographic Report</h2>
                            </div>
                        </Paper>
                    </Grid>
                    {/* Row 2 */}
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <FeedbackChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Feedback Report</h2>
                            </div>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <AppointmentTypeChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Appointment Type Report</h2>
                            </div>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper 
                            elevation={3} 
                            sx={{ 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: '1px solid #ccc', 
                                backgroundColor: '#A7F3D0',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                                }
                            }}
                        >
                            <DepartmentAppointmentChart />
                            <div className="text-center mt-4">
                                <h2 className="text-2xl font-semibold">Department Report</h2>
                            </div>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </main>
    );
}