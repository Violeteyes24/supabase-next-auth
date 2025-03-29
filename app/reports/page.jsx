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
// const FrequencyChart = dynamic(() => import('../components/report components/frequent_topic'), { ssr: false });
const FrequentTopicText = dynamic(() => import('../components/report components/frequent_topic_text'), { ssr: false });
const EmotionalStateChart = dynamic(() => import('../components/report components/emotional_state'), { ssr: false });
const DemographicChart = dynamic(() => import('../components/report components/demographics'), { ssr: false });
const FeedbackChart = dynamic(() => import('../components/report components/user_feedback'), { ssr: false });
const AppointmentTypeChart = dynamic(() => import('../components/report components/appointment_type'), { ssr: false });
const DepartmentAppointmentChart = dynamic(() => import('../components/report components/department_appointments'), { ssr: false });

// Create a global object to store chart data for text reports
if (typeof window !== 'undefined') {
    window.chartData = {
        emotionalState: [],
        frequentTopics: null,
        demographics: [],
        feedback: [],
        appointmentTypes: [],
        departmentAppointments: []
    };
}

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
            // Create a new PDF document
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });
            
            // PDF settings
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 40;
            const titleFontSize = 16;
            const subTitleFontSize = 12;
            const contentFontSize = 10;
            let yPos = margin;
            
            // Add title
            pdf.setFontSize(titleFontSize);
            pdf.setFont('helvetica', 'bold');
            const title = "MentalHelp Analytics Reports";
            pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
            yPos += 30;
            
            // Add subtitle with date
            pdf.setFontSize(subTitleFontSize);
            pdf.setFont('helvetica', 'normal');
            const today = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            pdf.text(`Generated on ${today}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 30;
            
            // Helper function to add report section
            const addReportSection = (title, data, formatter) => {
                if (yPos > pdf.internal.pageSize.getHeight() - 100) {
                    pdf.addPage();
                    yPos = margin;
                }
                
                // Add section title
                pdf.setFontSize(subTitleFontSize);
                pdf.setFont('helvetica', 'bold');
                pdf.text(title, margin, yPos);
                yPos += 20;
                
                // Add content
                pdf.setFontSize(contentFontSize);
                pdf.setFont('helvetica', 'normal');
                
                const content = formatter(data);
                const splitText = pdf.splitTextToSize(content, pageWidth - (margin * 2));
                
                pdf.text(splitText, margin, yPos);
                yPos += (splitText.length * 14) + 20;
            };
            
            // Use the global chart data if available, otherwise fall back to DOM extraction
            const globalChartData = window.chartData || {};
            
            // 1. Emotional State Chart
            if (globalChartData.emotionalState && globalChartData.emotionalState.length > 0) {
                const emotionalData = globalChartData.emotionalState;
                addReportSection("1. Overall Mood State", emotionalData, (data) => {
                    return "Emotional state distribution of users:\n\n" + 
                           data.map(item => `Date: ${item.date}, Emotion Intensity: ${item.emotion}`).join('\n') + 
                           "\n\nInterpretation: This data represents the average emotional state intensity of users tracked over time.";
                });
            } else {
                // Fallback to DOM extraction
                const emotionalStateCharts = document.querySelectorAll('#chart-0');
                if (emotionalStateCharts.length > 0) {
                    const emotionalStateData = Array.from(emotionalStateCharts[0].querySelectorAll('g.recharts-layer')).map(el => {
                        const dataEl = el.querySelector('text.recharts-text');
                        return dataEl ? dataEl.textContent : '';
                    }).filter(Boolean);
                    
                    addReportSection("1. Overall Mood State", emotionalStateData, (data) => {
                        return "Emotional state distribution of users:\n\n" + 
                               data.join('\n') + 
                               "\n\nInterpretation: This data represents the average emotional state intensity of users tracked over time.";
                    });
                }
            }
            
            // 2. Frequent Topics
            if (globalChartData.frequentTopics) {
                addReportSection("2. Frequent Topics", globalChartData.frequentTopics, (data) => {
                    return "Most discussed topics by frequency:\n\n" + data;
                });
            } else {
                // Fallback to DOM extraction
                const frequentTopicsCharts = document.querySelectorAll('#chart-1');
                if (frequentTopicsCharts.length > 0) {
                    const reportTextElements = Array.from(frequentTopicsCharts[0].querySelectorAll('p'));
                    const reportText = reportTextElements.map(el => el.textContent).join('\n');
                    
                    addReportSection("2. Frequent Topics", reportText || "No frequent topics data available", (data) => {
                        return "Most discussed topics by frequency:\n\n" + data;
                    });
                }
            }
            
            // 3. Demographics Chart
            if (globalChartData.demographics && globalChartData.demographics.length > 0) {
                const demographicData = globalChartData.demographics;
                addReportSection("3. Demographic Report", demographicData, (data) => {
                    return "User distribution by demographic factors:\n\n" + 
                           data.map(item => `${item.name}: ${item.value}`).join('\n') + 
                           "\n\nThis represents the gender distribution of users in the system.";
                });
            } else {
                // Fallback to DOM extraction
                const demographicsCharts = document.querySelectorAll('#chart-2');
                if (demographicsCharts.length > 0) {
                    const demographicLabels = Array.from(demographicsCharts[0].querySelectorAll('.recharts-pie-label-text')).map(el => el.textContent);
                    
                    addReportSection("3. Demographic Report", demographicLabels, (data) => {
                        return "User distribution by demographic factors:\n\n" + 
                               data.join('\n') + 
                               "\n\nThis represents the gender distribution of users in the system.";
                    });
                }
            }
            
            // 4. Feedback Chart
            if (globalChartData.feedback && globalChartData.feedback.length > 0) {
                const feedbackData = globalChartData.feedback;
                addReportSection("4. Feedback Report", feedbackData, (data) => {
                    return "User satisfaction metrics:\n\n" + 
                           data.map(item => `${item.rating}: ${item.count} users`).join('\n') + 
                           "\n\nThis represents the distribution of user ratings for the application.";
                });
            } else {
                // Fallback to DOM extraction
                const feedbackCharts = document.querySelectorAll('#chart-3');
                if (feedbackCharts.length > 0) {
                    const feedbackLabels = Array.from(feedbackCharts[0].querySelectorAll('.recharts-cartesian-axis-tick-value')).map(el => el.textContent);
                    
                    addReportSection("4. Feedback Report", feedbackLabels, (data) => {
                        return "User satisfaction metrics:\n\n" + 
                               data.join('\n') + 
                               "\n\nThis represents the distribution of user ratings for the application.";
                    });
                }
            }
            
            // 5. Appointment Types
            if (globalChartData.appointmentTypes && globalChartData.appointmentTypes.length > 0) {
                const appointmentData = globalChartData.appointmentTypes;
                addReportSection("5. Appointment Types", appointmentData, (data) => {
                    return "Distribution of appointment categories:\n\n" + 
                           data.map(item => `${item.name}: ${item.value} appointments`).join('\n') + 
                           "\n\nThis shows the breakdown of different appointment types in the system.";
                });
            } else {
                // Fallback to DOM extraction
                const appointmentCharts = document.querySelectorAll('#chart-4');
                if (appointmentCharts.length > 0) {
                    const appointmentLabels = Array.from(appointmentCharts[0].querySelectorAll('.recharts-pie-label-text')).map(el => el.textContent);
                    
                    addReportSection("5. Appointment Types", appointmentLabels, (data) => {
                        return "Distribution of appointment categories:\n\n" + 
                               data.join('\n') + 
                               "\n\nThis shows the breakdown of different appointment types in the system.";
                    });
                }
            }
            
            // 6. Department Analysis
            if (globalChartData.departmentAppointments && globalChartData.departmentAppointments.length > 0) {
                const departmentData = globalChartData.departmentAppointments;
                addReportSection("6. Department Analysis", departmentData, (data) => {
                    return "Appointments by department:\n\n" + 
                           data.map(item => `${item.name}: ${item.value} appointments`).join('\n') + 
                           "\n\nThis shows the distribution of appointments across different departments.";
                });
            } else {
                // Fallback to DOM extraction
                const departmentCharts = document.querySelectorAll('#chart-5');
                if (departmentCharts.length > 0) {
                    const departmentLabels = Array.from(departmentCharts[0].querySelectorAll('.recharts-pie-label-text')).map(el => el.textContent);
                    
                    addReportSection("6. Department Analysis", departmentLabels, (data) => {
                        return "Appointments by department:\n\n" + 
                               data.join('\n') + 
                               "\n\nThis shows the distribution of appointments across different departments.";
                    });
                }
            }
            
            // Add footer
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                pdf.text(`Page ${i} of ${totalPages} | © ${new Date().getFullYear()} MentalHelp`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 20, { align: 'center' });
            }
            
            // Save the PDF
            pdf.save('mental_help_reports.pdf');
            
        } catch (error) {
            console.error('Error generating text report PDF:', error);
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
                            Analytics and insights for MentalHelp
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
                                Download Text Reports
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
                        <p>© {new Date().getFullYear()} MentalHelp • Reports v2.0</p>
                    </footer>
                </Container>
            </div>
        </main>
    );
}
