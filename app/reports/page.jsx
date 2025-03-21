'use client';

import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Button, Skeleton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Sidebar from '../components/dashboard components/sidebar';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Dynamically import components with SSR disabled
const FrequencyChart = dynamic(() => import('../components/report components/frequent_topic'), { ssr: false });
const FrequentTopicText = dynamic(() => import('../components/report components/frequent_topic_text'), { ssr: false });
const EmotionalStateChart = dynamic(() => import('../components/report components/emotional_state'), { ssr: false });
const DemographicChart = dynamic(() => import('../components/report components/demographics'), { ssr: false });
const FeedbackChart = dynamic(() => import('../components/report components/user_feedback'), { ssr: false });
const AppointmentTypeChart = dynamic(() => import('../components/report components/appointment_type'), { ssr: false });
const DepartmentAppointmentChart = dynamic(() => import('../components/report components/department_appointments'), { ssr: false });

export default function ReportsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Simulate loading time for dynamic components
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1500);
        
        return () => clearTimeout(timer);
    }, []);
    
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    const handleDownloadPDF = async (elementId, title) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            const canvas = await html2canvas(element);
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${title.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    const handleDownloadAllPDF = async () => {
        try {
            const charts = document.querySelectorAll('[id^="chart-"]');
            const chartsArray = Array.from(charts);
            
            // Create a temporary container with smaller dimensions
            const container = document.createElement('div');
            container.style.width = '1200px'; // Reduced from 2480px
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(2, 1fr)';
            container.style.gap = '10px'; // Reduced gap
            container.style.padding = '20px'; // Reduced padding
            document.body.appendChild(container);

            // Create smaller clones of the charts
            const clonedCharts = await Promise.all(chartsArray.map(async (chart, index) => {
                const clone = chart.cloneNode(true);
                clone.style.width = '550px'; // Reduced from 1150px
                clone.style.height = '400px'; // Adjusted height
                clone.style.background = cardStyles[index].backgroundColor;
                clone.style.padding = '10px'; // Reduced padding
                clone.style.borderRadius = '8px';
                container.appendChild(clone);
                return clone;
            }));

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create PDF with smaller dimensions
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [842, 595] // Standard A4 landscape size
            });

            // Capture with better scaling
            const canvas = await html2canvas(container, {
                scale: 2, // Increased scale for better quality
                useCORS: true,
                logging: false,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            // Add to PDF with proper scaling
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 842, 595); // Fit to A4 landscape

            document.body.removeChild(container);
            pdf.save('all_reports_single_page.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    // Custom card styles with gradient backgrounds
    const cardStyles = [
        { 
            backgroundColor: 'linear-gradient(135deg, #a3e635 0%, #22c55e 100%)', 
            color: '#1a2e05'
        },
        { 
            backgroundColor: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)', 
            color: '#0c3256'
        },
        { 
            backgroundColor: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', 
            color: '#2e1065'
        },
        { 
            backgroundColor: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', 
            color: '#431407'
        },
        { 
            backgroundColor: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', 
            color: '#500724'
        },
        { 
            backgroundColor: 'linear-gradient(135deg, #fdba74 0%, #f59e0b 100%)', 
            color: '#451a03'
        }
    ];

    // Loading skeleton component with shimmer effect
    const ReportsSkeleton = () => (
        <main className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="w-64 bg-gray-800" /> {/* Sidebar placeholder */}
            <div className="flex-1 overflow-auto py-8 px-4">
                <Container maxWidth="xl">
                    <div className="mb-10 text-center">
                        <Skeleton 
                            variant="text" 
                            width={300} 
                            height={60} 
                            sx={{ 
                                mx: 'auto',
                                animation: 'pulse 1.5s ease-in-out 0.5s infinite',
                                '@keyframes pulse': {
                                    '0%': { opacity: 0.6 },
                                    '50%': { opacity: 1 },
                                    '100%': { opacity: 0.6 }
                                }
                            }} 
                        />
                        <Skeleton variant="text" width={250} height={24} sx={{ mx: 'auto', mt: 1 }} />
                        <Skeleton 
                            variant="rectangular" 
                            width={200} 
                            height={40} 
                            sx={{ 
                                mx: 'auto', 
                                mt: 3,
                                borderRadius: 1
                            }} 
                        />
                    </div>
                
                    <Grid container spacing={4}>
                        {[...Array(6)].map((_, index) => (
                            <Grid item xs={12} md={6} lg={4} key={index}>
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        position: 'relative',
                                        padding: { xs: '16px', md: '24px' }, 
                                        borderRadius: '24px',
                                        height: 300,
                                        background: cardStyles[index].backgroundColor,
                                        color: cardStyles[index].color,
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Shimmer overlay */}
                                    <div 
                                        style={{ 
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                                            animation: 'shimmer 2s infinite',
                                            zIndex: 10
                                        }}
                                    />

                                    <div className="flex flex-col h-full">
                                        <div className="flex-1 flex items-center justify-center">
                                            <Skeleton 
                                                variant="rectangular" 
                                                width="100%" 
                                                height={160} 
                                                sx={{ 
                                                    bgcolor: 'rgba(255,255,255,0.1)', 
                                                    borderRadius: 2,
                                                }}
                                            />
                                        </div>
                                        <div className="mt-6">
                                            <Skeleton 
                                                variant="text" 
                                                width="60%" 
                                                height={32} 
                                                sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} 
                                            />
                                            <Skeleton 
                                                variant="text" 
                                                width="80%" 
                                                height={20} 
                                                sx={{ bgcolor: 'rgba(255,255,255,0.1)', mt: 1 }} 
                                            />
                                        </div>
                                    </div>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                    
                    <div className="mt-16 text-center text-gray-500 text-sm">
                        <Skeleton variant="text" width={240} height={16} sx={{ mx: 'auto' }} />
                    </div>
                </Container>
            </div>
        </main>
    );

    if (loading) {
        return <ReportsSkeleton />;
    }

    return (
        <main className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <Sidebar handleLogout={handleLogout} />
            <div className="flex-1 overflow-auto py-8 px-4">
                <Container maxWidth="xl">
                    <div className="mb-10">
                        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white text-center">
                            Reports Dashboard
                        </h1>
                        <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
                            Analytics and insights for your organization
                        </p>
                        <div className="flex justify-center mt-4">
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadAllPDF}
                                sx={{
                                    background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                    },
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                }}
                            >
                                Download All Reports
                            </Button>
                        </div>
                    </div>
                
                    <Grid container spacing={4}>
                        {[
                            { component: <EmotionalStateChart />, title: "Overall Mood State", description: "Emotional state distribution of users" },
                            { component: <FrequentTopicText />, title: "Frequent Topics", description: "Most discussed topics by frequency" },
                            { component: <DemographicChart />, title: "Demographic Report", description: "User distribution by demographic factors" },
                            { component: <FeedbackChart />, title: "Feedback Report", description: "User satisfaction metrics and trends" },
                            { component: <AppointmentTypeChart />, title: "Appointment Types", description: "Distribution of appointment categories" },
                            { component: <DepartmentAppointmentChart />, title: "Department Analysis", description: "Appointments by department" }
                        ].map((item, index) => (
                            <Grid item xs={12} md={6} lg={4} key={index}>
                                <Paper 
                                    elevation={0}
                                    sx={{ 
                                        position: 'relative',
                                        padding: { xs: '16px', md: '24px' }, 
                                        borderRadius: '24px',
                                        height: '100%',
                                        background: cardStyles[index].backgroundColor,
                                        color: cardStyles[index].color,
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                        transition: 'all 0.3s ease-in-out',
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                                        },
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div id={`chart-${index}`} className="flex-1">
                                        {item.component}
                                    </div>
                                    <div className="mt-6">
                                        <h2 className="text-2xl font-bold">{item.title}</h2>
                                        <p className="mt-1 opacity-80">{item.description}</p>
                                    </div>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                    
                    <footer className="mt-16 text-center text-gray-500 text-sm">
                        <p>© {new Date().getFullYear()} Your Organization • Dashboard v2.0</p>
                    </footer>
                </Container>
            </div>
        </main>
    );
}
