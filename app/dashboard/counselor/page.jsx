'use client';

import React, { useEffect, useState } from 'react';
import { 
    Container, 
    Grid, 
    Box, 
    Paper, 
    Typography, 
    Avatar, 
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    IconButton,
    Snackbar,
    Alert,
    Tab,
    Tabs,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import MessageIcon from '@mui/icons-material/Message';

import Sidebar from '../../components/dashboard components/sidebar';
import KPISection from '../../components/dashboard components/kpi_section';
import Charts from '../../components/dashboard components/charts';
import AppointmentCard from '../../components/appointment components/appointment_card';

export default function CounselorPage() {
    const supabase = createClientComponentClient();
    const [userName, setUserName] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [userType, setUserType] = useState('');
    const [isDirector, setIsDirector] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    const [appointmentsThisMonth, setAppointmentsThisMonth] = useState(0);
    const [activeCounselors, setActiveCounselors] = useState(0);
    const [activeSecretaries, setActiveSecretaries] = useState(0);
    const [activeStudents, setActiveStudents] = useState(0);
    const [departmentMostCases, setDepartmentMostCases] = useState('');
    const [programMostCases, setProgramMostCases] = useState('');
    const [averageMoodScore, setAverageMoodScore] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [moodDistribution, setMoodDistribution] = useState([]);
    const [moodIntensityCategories, setMoodIntensityCategories] = useState([]);
    const [totalMoodInstances, setTotalMoodInstances] = useState(0);
    const [moodAverageIntensities, setMoodAverageIntensities] = useState([]);
    const router = useRouter();
    
    // State for chatbot management
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({ chatbot_question: '' });
    const [currentAnswer, setCurrentAnswer] = useState({ chatbot_answer: '', chat_question_id: null });
    const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
    const [openAnswerDialog, setOpenAnswerDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, type: '', id: null });
    const [tabValue, setTabValue] = useState(0);

    // State for messages management
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState({ 
        message_type: '', 
        message_role: '', 
        message_content: '' 
    });
    const [openMessageDialog, setOpenMessageDialog] = useState(false);

    // Add state for mood report tab
    const [moodReportTab, setMoodReportTab] = useState(0);

    // Add state for time period filtering
    const [moodTimePeriod, setMoodTimePeriod] = useState('month');

    // Add state for the mood analytics modal
    const [moodAnalyticsOpen, setMoodAnalyticsOpen] = useState(false);

    // Add state for student mood tracking
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentMoods, setStudentMoods] = useState([]);
    const [loadingStudentData, setLoadingStudentData] = useState(false);

    useEffect(() => {
        async function fetchUserData() {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                if (userError) {
                    console.error('Error fetching user:', userError);
                    return;
                }

                if (user) {
                    const { data: profile, error: profileError } = await supabase
                        .from('users')
                        .select('name, profile_image_url, user_type, is_director')
                        .eq('user_id', user.id)
                        .single();

                    if (profileError) {
                        console.error('Error fetching profile:', profileError);
                        return;
                    }

                    setUserName(profile?.name || '');
                    setProfileImageUrl(profile?.profile_image_url || '');
                    setUserType(profile?.user_type || '');
                    setIsDirector(profile?.is_director || false);
                    
                    // Only fetch chatbot and messages data if user is a director
                    if (profile?.is_director) {
                        fetchChatbotQuestions();
                        fetchChatbotAnswers();
                        fetchPredefinedMessages();
                        fetchStudents(); // Fetch students if director
                    }
                }
            } catch (err) {
                console.error('Unexpected error fetching user:', err);
            }
        }

        // Set up realtime subscriptions for chatbot tables
        let questionsChannel, answersChannel, messagesChannel;
        
        if (isDirector) {
            questionsChannel = supabase.channel('chatbot-questions-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_questions' }, () => {
                    fetchChatbotQuestions();
                })
                .subscribe();
                
            answersChannel = supabase.channel('chatbot-answers-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_answers' }, () => {
                    fetchChatbotAnswers();
                })
                .subscribe();
                
            messagesChannel = supabase.channel('predefined-messages-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'predefined_messages' }, () => {
                    fetchPredefinedMessages();
                })
                .subscribe();
        }

        fetchUserData();
        fetchUsers();
        fetchAppointments();
        fetchMoodScores();

        // Set up realtime subscriptions
        const userChannel = supabase.channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers();
            })
            .subscribe();

        const appointmentChannel = supabase.channel('appointment-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_schedules' }, () => {
                fetchAppointments();
            })
            .subscribe();

        const moodChannel = supabase.channel('mood-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mood_tracker' }, () => {
                fetchMoodScores();
            })
            .subscribe();

        return () => {
            if (questionsChannel) supabase.removeChannel(questionsChannel);
            if (answersChannel) supabase.removeChannel(answersChannel);
            if (messagesChannel) supabase.removeChannel(messagesChannel);
            supabase.removeChannel(userChannel);
            supabase.removeChannel(appointmentChannel);
            supabase.removeChannel(moodChannel);
        };
    }, []);

    async function fetchUsers() {
        const { data: users, error } = await supabase.from('users').select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }
        
        setTotalUsers(users.length);
        const activeCounselorsCount = users.filter(user => user.user_type === 'counselor').length;
        setActiveCounselors(activeCounselorsCount);
        
        // Count active secretaries
        const activeSecretariesCount = users.filter(user => user.user_type === 'secretary').length;
        setActiveSecretaries(activeSecretariesCount);
        
        // Count active students
        const activeStudentsCount = users.filter(user => user.user_type === 'student').length;
        setActiveStudents(activeStudentsCount);
        
        // Find department with most cases
        const departmentCounts = {};
        users.forEach(user => {
            if (user.department) {
                departmentCounts[user.department] = (departmentCounts[user.department] || 0) + 1;
            }
        });
        
        let maxDepartment = '';
        let maxCount = 0;
        Object.entries(departmentCounts).forEach(([dept, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxDepartment = dept;
            }
        });
        setDepartmentMostCases(maxDepartment || 'None');
        
        // Find program with most cases
        const programCounts = {};
        users.forEach(user => {
            if (user.program) {
                programCounts[user.program] = (programCounts[user.program] || 0) + 1;
            }
        });
        
        let maxProgram = '';
        maxCount = 0;
        Object.entries(programCounts).forEach(([prog, count]) => {
            if (count > maxCount) {
                maxCount = count;
                maxProgram = prog;
            }
        });
        setProgramMostCases(maxProgram || 'None');
        
        // Store data in global object for text reports
        updateDashboardData();
    }

    async function fetchAppointments() {
        const { data: appointments, error } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('is_available', true);

        if (error) {
            console.error('Error fetching appointments:', error);
            return;
        }
        
        setAppointmentsThisMonth(appointments.length);
        
        // Store data in global object for text reports
        updateDashboardData();
    }

    async function fetchMoodScores(period = 'month') {
        // Calculate date range based on period
        const now = new Date();
        let startDate;
        
        switch(period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
        }
        
        const formattedStartDate = startDate.toISOString();
        
        const { data: moods, error } = await supabase
            .from('mood_tracker')
            .select('mood_type, intensity, tracked_at')
            .gte('tracked_at', formattedStartDate);

        if (error) {
            console.error('Error fetching mood scores:', error);
            return;
        }

        // Set total mood instances (divided by 6 as each usage inserts 6 mood types)
        setTotalMoodInstances(Math.round(moods.length / 6));

        // Calculate average intensity per mood type
        const moodIntensitySums = {};
        const moodTypeCounts = {};
        
        moods.forEach(mood => {
            if (!moodIntensitySums[mood.mood_type]) {
                moodIntensitySums[mood.mood_type] = 0;
                moodTypeCounts[mood.mood_type] = 0;
            }
            moodIntensitySums[mood.mood_type] += mood.intensity;
            moodTypeCounts[mood.mood_type] += 1;
        });
        
        const averageIntensities = Object.keys(moodIntensitySums).map(moodType => {
            const average = moodTypeCounts[moodType] 
                ? (moodIntensitySums[moodType] / moodTypeCounts[moodType]).toFixed(1) 
                : 0;
            
            let category;
            const avgValue = parseFloat(average);
            if (avgValue >= 1 && avgValue <= 3) {
                category = 'LOW';
            } else if (avgValue >= 4 && avgValue <= 6) {
                category = 'MODERATE';
            } else if (avgValue >= 7 && avgValue <= 10) {
                category = 'HIGH';
            } else {
                category = 'N/A';
            }
            
            return {
                type: moodType,
                average: parseFloat(average),
                category
            };
        }).sort((a, b) => b.average - a.average);
        
        setMoodAverageIntensities(averageIntensities);

        // Calculate mood distribution by type
        const moodCounts = {};
        moods.forEach(mood => {
            moodCounts[mood.mood_type] = (moodCounts[mood.mood_type] || 0) + 1;
        });
        
        const moodDistributionData = Object.entries(moodCounts).map(([type, count]) => ({
            type,
            count
        })).sort((a, b) => b.count - a.count);
        
        setMoodDistribution(moodDistributionData);
        
        // Categorize mood intensities
        const intensityCategories = {
            LOW: 0,
            MODERATE: 0,
            HIGH: 0
        };
        
        moods.forEach(mood => {
            if (mood.intensity >= 1 && mood.intensity <= 3) {
                intensityCategories.LOW += 1;
            } else if (mood.intensity >= 4 && mood.intensity <= 6) {
                intensityCategories.MODERATE += 1;
            } else if (mood.intensity >= 7 && mood.intensity <= 10) {
                intensityCategories.HIGH += 1;
            }
        });
        
        const intensityCategoriesData = Object.entries(intensityCategories).map(([category, count]) => ({
            category,
            count
        }));
        
        setMoodIntensityCategories(intensityCategoriesData);

        // Keep original chart data logic for now but modify to use most common mood type by day
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const moodData = daysOfWeek.map(day => {
            const dayMoods = moods.filter(mood => 
                new Date(mood.tracked_at).toLocaleDateString('en-US', { weekday: 'long' }) === day
            );
            
            // Find most common mood for the day
            const moodTypeCount = {};
            dayMoods.forEach(mood => {
                moodTypeCount[mood.mood_type] = (moodTypeCount[mood.mood_type] || 0) + 1;
            });
            
            let mostCommonMood = 'None';
            let maxCount = 0;
            
            Object.entries(moodTypeCount).forEach(([type, count]) => {
                if (count > maxCount) {
                    mostCommonMood = type;
                    maxCount = count;
                }
            });
            
            return { day, mostCommonMood, count: maxCount };
        });
        
        setChartData(moodData);
        
        // Store data in global object for text reports
        updateDashboardData();
    }
    
    // Helper function to update the global dashboard data
    const updateDashboardData = () => {
        if (typeof window !== 'undefined' && window.chartData && window.chartData.dashboardData) {
            window.chartData.dashboardData = {
                totalUsers,
                activeCounselors,
                activeSecretaries,
                activeStudents,
                appointmentsThisMonth,
                moodDistribution,
                moodIntensityCategories,
                departmentMostCases,
                programMostCases,
                weeklyMoodData: chartData
            };
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    const kpiData = [
        { title: 'Total Users + Director', value: totalUsers, icon: 'users' },
        { title: 'Active Counselors', value: activeCounselors, icon: 'user-md' },
        { title: 'Active Secretaries', value: activeSecretaries, icon: 'smile' },
        { title: 'Active Students', value: activeStudents, icon: 'user' },
        { title: 'Appointments This Month', value: appointmentsThisMonth, icon: 'calendar' },
        { title: 'Mood Tracker Usage', value: totalMoodInstances, icon: 'chart-line' },
        { title: 'Department most cases', value: departmentMostCases, icon: 'building' },
        { title: 'Program with most cases', value: programMostCases, icon: 'graduation-cap' },
    ];

    // Helper function to get chip color based on user type
    const getUserChipColor = (type) => {
        switch(type.toLowerCase()) {
            case 'counselor':
                return {
                    bg: '#4F46E5',
                    text: 'white'
                };
            case 'admin':
                return {
                    bg: '#EF4444',
                    text: 'white'
                };
            case 'user':
            case 'student':
                return {
                    bg: '#10B981',
                    text: 'white'
                };
            case 'director':
                return {
                    bg: '#8B5CF6',
                    text: 'white'
                };
            default:
                return {
                    bg: '#6B7280',
                    text: 'white'
                };
        }
    };

    const chipColor = getUserChipColor(userType);

    // Fetch chatbot questions from database
    async function fetchChatbotQuestions() {
        try {
            const { data, error } = await supabase
                .from('chatbot_questions')
                .select('*');
                
            if (error) throw error;
            setQuestions(data || []);
        } catch (error) {
            console.error('Error fetching chatbot questions:', error);
            showSnackbar('Failed to load questions', 'error');
        } finally {
            setLoading(false);
        }
    }

    // Fetch chatbot answers from database
    async function fetchChatbotAnswers() {
        try {
            const { data, error } = await supabase
                .from('chatbot_answers')
                .select('*');
                
            if (error) throw error;
            setAnswers(data || []);
        } catch (error) {
            console.error('Error fetching chatbot answers:', error);
            showSnackbar('Failed to load answers', 'error');
        }
    }

    // Fetch predefined messages from database
    async function fetchPredefinedMessages() {
        try {
            const { data, error } = await supabase
                .from('predefined_messages')
                .select('*');
                
            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching predefined messages:', error);
            showSnackbar('Failed to load messages', 'error');
        }
    }

    // Function to fetch all students
    async function fetchStudents() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_type', 'student');
                
            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
            showSnackbar('Failed to load students', 'error');
        }
    }

    // Function to fetch mood data for a specific student
    async function fetchStudentMoods(studentId) {
        setLoadingStudentData(true);
        try {
            console.log('Fetching moods for student ID:', studentId);
            
            const { data, error } = await supabase
                .from('mood_tracker')
                .select('*')
                .eq('user_id', studentId)
                .order('tracked_at', { ascending: false });
                
            if (error) throw error;
            
            console.log('Mood data retrieved:', data?.length || 0, 'entries');
            
            // Handle no data case
            if (!data || data.length === 0) {
                setStudentMoods([]);
                setLoadingStudentData(false);
                return;
            }
            
            // Process the mood data by date
            const moodsByDate = {};
            data.forEach(mood => {
                const date = new Date(mood.tracked_at).toLocaleDateString();
                if (!moodsByDate[date]) {
                    moodsByDate[date] = {
                        entries: [],
                        moodTypes: {
                            happy: { sum: 0, count: 0 },
                            afraid: { sum: 0, count: 0 },
                            confused: { sum: 0, count: 0 },
                            angry: { sum: 0, count: 0 },
                            disappointed: { sum: 0, count: 0 },
                            stressed: { sum: 0, count: 0 }
                        },
                        timestamp: new Date(mood.tracked_at).getTime()
                    };
                }
                moodsByDate[date].entries.push(mood);
                
                // Add to correct mood type
                const moodType = mood.mood_type.toLowerCase();
                if (moodsByDate[date].moodTypes[moodType]) {
                    moodsByDate[date].moodTypes[moodType].sum += mood.intensity;
                    moodsByDate[date].moodTypes[moodType].count += 1;
                }
            });
            
            // Calculate average for each mood type by date
            const processedMoods = Object.entries(moodsByDate).map(([date, data]) => {
                const { entries, moodTypes, timestamp } = data;
                
                // Calculate average intensity for each mood type
                const averageMoods = {};
                Object.entries(moodTypes).forEach(([type, { sum, count }]) => {
                    averageMoods[type] = count > 0 ? (sum / count).toFixed(1) : 0;
                });
                
                // Calculate mood progress (simple version)
                // Check if positive emotions have high intensity and negative emotions have low intensity
                const happyIntensity = parseFloat(averageMoods.happy);
                const negativeIntensity = [
                    parseFloat(averageMoods.afraid), 
                    parseFloat(averageMoods.angry),
                    parseFloat(averageMoods.stressed),
                    parseFloat(averageMoods.confused),
                    parseFloat(averageMoods.disappointed)
                ].reduce((sum, val) => sum + val, 0) / 5; // Average of negative emotions
                
                let progressStatus = 'neutral';
                if (happyIntensity > 7 && negativeIntensity < 4) {
                    progressStatus = 'positive';
                } else if (happyIntensity < 4 && negativeIntensity > 7) {
                    progressStatus = 'negative';
                }
                
                // Get the actual date object for checking if it's recent
                const entryDate = new Date(timestamp);
                const isRecent = (new Date() - entryDate) < (24 * 60 * 60 * 1000); // Within last 24 hours
                
                // Format time from first entry
                const time = new Date(entries[0].tracked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return {
                    date,
                    time,
                    entryDate,
                    entries,
                    moodAverages: averageMoods,
                    progressStatus,
                    isRecent,
                    entryCount: entries.length
                };
            }).sort((a, b) => b.entryDate - a.entryDate); // Sort by date (newest first)
            
            setStudentMoods(processedMoods);
        } catch (error) {
            console.error('Error fetching student moods:', error);
            showSnackbar('Failed to load student mood data', 'error');
        } finally {
            setLoadingStudentData(false);
        }
    }

    // Handle selecting a student
    const handleSelectStudent = (student) => {
        console.log('Selected student:', student);
        console.log('Student user_id:', student.user_id);
        
        if (!student.user_id) {
            showSnackbar('Student has no user ID assigned', 'error');
            return;
        }
        
        setSelectedStudent(student);
        fetchStudentMoods(student.user_id);
    };

    // Helper function to get mood status icon
    const getMoodStatusIcon = (status) => {
        switch(status) {
            case 'positive':
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#10B981">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.03 0 3.8-1.11 4.75-2.75.19-.33-.05-.75-.44-.75H7.69c-.38 0-.63.42-.44.75.95 1.64 2.72 2.75 4.75 2.75z"/>
                        </svg>
                        <Typography sx={{ fontWeight: 'medium', color: '#10B981' }}>Positive</Typography>
                    </Box>
                );
            case 'negative':
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#EF4444">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm8.93 6H7.57c-.42 0-.77.3-.83.71-.1.73.4 1.29 1.05 1.29h8.42c.64 0 1.15-.57 1.05-1.29-.06-.4-.4-.7-.83-.7z"/>
                        </svg>
                        <Typography sx={{ fontWeight: 'medium', color: '#EF4444' }}>Negative</Typography>
                    </Box>
                );
            case 'neutral':
            default:
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#6B7280">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm8.5 6H7c-.55 0-1 .45-1 1s.45 1 1 1h10c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                        </svg>
                        <Typography sx={{ fontWeight: 'medium', color: '#6B7280' }}>Neutral</Typography>
                    </Box>
                );
        }
    };

    // CRUD operations for questions
    const addQuestion = async () => {
        try {
            if (!currentQuestion.chatbot_question.trim()) {
                showSnackbar('Question cannot be empty', 'error');
                return;
            }
            
            const { data, error } = await supabase
                .from('chatbot_questions')
                .insert([{ chatbot_question: currentQuestion.chatbot_question }]);
                
            if (error) throw error;
            
            showSnackbar('Question added successfully', 'success');
            handleCloseQuestionDialog();
        } catch (error) {
            console.error('Error adding question:', error);
            showSnackbar('Failed to add question', 'error');
        }
    };

    const updateQuestion = async () => {
        try {
            if (!currentQuestion.chatbot_question.trim()) {
                showSnackbar('Question cannot be empty', 'error');
                return;
            }
            
            const { error } = await supabase
                .from('chatbot_questions')
                .update({ chatbot_question: currentQuestion.chatbot_question })
                .eq('chat_question_id', currentQuestion.chat_question_id);
                
            if (error) throw error;
            
            showSnackbar('Question updated successfully', 'success');
            handleCloseQuestionDialog();
        } catch (error) {
            console.error('Error updating question:', error);
            showSnackbar('Failed to update question', 'error');
        }
    };

    const deleteQuestion = async (id) => {
        try {
            const { error } = await supabase
                .from('chatbot_questions')
                .delete()
                .eq('chat_question_id', id);
                
            if (error) throw error;
            
            showSnackbar('Question deleted successfully', 'success');
            handleCloseDeleteConfirmDialog();
        } catch (error) {
            console.error('Error deleting question:', error);
            showSnackbar('Failed to delete question', 'error');
        }
    };

    // CRUD operations for answers
    const addAnswer = async () => {
        try {
            if (!currentAnswer.chatbot_answer.trim()) {
                showSnackbar('Answer cannot be empty', 'error');
                return;
            }
            
            const { data, error } = await supabase
                .from('chatbot_answers')
                .insert([{ 
                    chatbot_answer: currentAnswer.chatbot_answer,
                    chat_question_id: currentAnswer.chat_question_id
                }]);
                
            if (error) throw error;
            
            showSnackbar('Answer added successfully', 'success');
            handleCloseAnswerDialog();
        } catch (error) {
            console.error('Error adding answer:', error);
            showSnackbar('Failed to add answer', 'error');
        }
    };

    const updateAnswer = async () => {
        try {
            if (!currentAnswer.chatbot_answer.trim()) {
                showSnackbar('Answer cannot be empty', 'error');
                return;
            }
            
            const { error } = await supabase
                .from('chatbot_answers')
                .update({ 
                    chatbot_answer: currentAnswer.chatbot_answer,
                    chat_question_id: currentAnswer.chat_question_id
                })
                .eq('chat_answer_id', currentAnswer.chat_answer_id);
                
            if (error) throw error;
            
            showSnackbar('Answer updated successfully', 'success');
            handleCloseAnswerDialog();
        } catch (error) {
            console.error('Error updating answer:', error);
            showSnackbar('Failed to update answer', 'error');
        }
    };

    const deleteAnswer = async (id) => {
        try {
            const { error } = await supabase
                .from('chatbot_answers')
                .delete()
                .eq('chat_answer_id', id);
                
            if (error) throw error;
            
            showSnackbar('Answer deleted successfully', 'success');
            handleCloseDeleteConfirmDialog();
        } catch (error) {
            console.error('Error deleting answer:', error);
            showSnackbar('Failed to delete answer', 'error');
        }
    };

    // Dialog handlers
    const handleOpenQuestionDialog = (question = null) => {
        if (question) {
            setCurrentQuestion(question);
            setIsEditing(true);
        } else {
            setCurrentQuestion({ chatbot_question: '' });
            setIsEditing(false);
        }
        setOpenQuestionDialog(true);
    };

    const handleCloseQuestionDialog = () => {
        setOpenQuestionDialog(false);
        setCurrentQuestion({ chatbot_question: '' });
        setIsEditing(false);
    };

    const handleOpenAnswerDialog = (answer = null) => {
        if (answer) {
            setCurrentAnswer(answer);
            setIsEditing(true);
        } else {
            setCurrentAnswer({ chatbot_answer: '', chat_question_id: null });
            setIsEditing(false);
        }
        setOpenAnswerDialog(true);
    };

    const handleCloseAnswerDialog = () => {
        setOpenAnswerDialog(false);
        setCurrentAnswer({ chatbot_answer: '', chat_question_id: null });
        setIsEditing(false);
    };

    const handleOpenDeleteConfirmDialog = (type, id) => {
        setDeleteConfirmDialog({ open: true, type, id });
    };

    const handleCloseDeleteConfirmDialog = () => {
        setDeleteConfirmDialog({ open: false, type: '', id: null });
    };

    // Snackbar handlers
    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Helper function to find question text by ID
    const getQuestionTextById = (questionId) => {
        const question = questions.find(q => q.chat_question_id === questionId);
        return question ? question.chatbot_question : 'No question selected';
    };
    
    // Tab change handler
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Add handler for mood report tab changes
    const handleMoodReportTabChange = (event, newValue) => {
        setMoodReportTab(newValue);
    };

    // Handle mood time period change
    const handleMoodTimePeriodChange = (event) => {
        setMoodTimePeriod(event.target.value);
        fetchMoodScores(event.target.value);
    };

    // CRUD operations for messages
    const addMessage = async () => {
        try {
            if (!currentMessage.message_content.trim() || !currentMessage.message_type || !currentMessage.message_role) {
                showSnackbar('All fields are required', 'error');
                return;
            }
            
            const { data, error } = await supabase
                .from('predefined_messages')
                .insert([{ 
                    message_type: currentMessage.message_type,
                    message_role: currentMessage.message_role,
                    message_content: currentMessage.message_content
                }]);
                
            if (error) throw error;
            
            showSnackbar('Message added successfully', 'success');
            handleCloseMessageDialog();
        } catch (error) {
            console.error('Error adding message:', error);
            showSnackbar('Failed to add message', 'error');
        }
    };

    const updateMessage = async () => {
        try {
            if (!currentMessage.message_content.trim() || !currentMessage.message_type || !currentMessage.message_role) {
                showSnackbar('All fields are required', 'error');
                return;
            }
            
            const { error } = await supabase
                .from('predefined_messages')
                .update({ 
                    message_type: currentMessage.message_type,
                    message_role: currentMessage.message_role,
                    message_content: currentMessage.message_content
                })
                .eq('message_content_id', currentMessage.message_content_id);
                
            if (error) throw error;
            
            showSnackbar('Message updated successfully', 'success');
            handleCloseMessageDialog();
        } catch (error) {
            console.error('Error updating message:', error);
            showSnackbar('Failed to update message', 'error');
        }
    };

    const deleteMessage = async (id) => {
        try {
            const { error } = await supabase
                .from('predefined_messages')
                .delete()
                .eq('message_content_id', id);
                
            if (error) throw error;
            
            showSnackbar('Message deleted successfully', 'success');
            handleCloseDeleteConfirmDialog();
        } catch (error) {
            console.error('Error deleting message:', error);
            showSnackbar('Failed to delete message', 'error');
        }
    };

    // Message dialog handlers
    const handleOpenMessageDialog = (message = null) => {
        if (message) {
            setCurrentMessage(message);
            setIsEditing(true);
        } else {
            setCurrentMessage({ message_type: '', message_role: '', message_content: '' });
            setIsEditing(false);
        }
        setOpenMessageDialog(true);
    };

    const handleCloseMessageDialog = () => {
        setOpenMessageDialog(false);
        setCurrentMessage({ message_type: '', message_role: '', message_content: '' });
        setIsEditing(false);
    };

    // Handle open and close for mood analytics modal
    const handleOpenMoodAnalytics = () => {
        setMoodAnalyticsOpen(true);
    };

    const handleCloseMoodAnalytics = () => {
        setMoodAnalyticsOpen(false);
    };

    return (
        <Box className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
            <Sidebar handleLogout={handleLogout} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    px: 3,
                    pt: 4,
                    pb: 6,
                    position: 'relative' // Add this to make it a positioning context
                }}
            >
                {/* Top Right Profile Image with User Type */}
                {profileImageUrl && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 24,
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}
                    >
                        <Chip
                            label={userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'User'}
                            sx={{ 
                                backgroundColor: chipColor.bg,
                                color: chipColor.text,
                                fontWeight: 'bold',
                                textTransform: 'capitalize'
                            }}
                        />
                        <Avatar 
                            src={profileImageUrl} 
                            alt="Profile" 
                            sx={{ 
                                width: 48, 
                                height: 48, 
                                border: '2px solid white',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                    transform: 'scale(1.05)'
                                }
                            }}
                        />
                    </Box>
                )}

                <Container maxWidth="lg">
                    {/* Header with animated gradient */}
                    <Box className="text-center mb-8">
                        <Typography 
                            variant="h3" 
                            component="h1" 
                            className="font-extrabold"
                            sx={{
                                background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)',
                                backgroundClip: 'text',
                                color: 'transparent',
                                animation: 'gradient 3s ease infinite',
                                '@keyframes gradient': {
                                    '0%': {
                                        backgroundPosition: '0% 50%'
                                    },
                                    '50%': {
                                        backgroundPosition: '100% 50%'
                                    },
                                    '100%': {
                                        backgroundPosition: '0% 50%'
                                    }
                                }
                            }}
                        >
                            Welcome, {userName}!
                        </Typography>
                        <Typography 
                            variant="subtitle1" 
                            className="mt-2 text-gray-600"
                        >
                            Here's your dashboard overview for today
                        </Typography>
                    </Box>

                    {/* Tabs for directors only */}
                    {isDirector && (
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange} 
                            sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
                            centered
                        >
                            <Tab 
                                icon={<DashboardIcon />}
                                label="Dashboard Overview" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    '&.Mui-selected': { color: '#3B82F6' }
                                }} 
                            />
                            <Tab 
                                icon={<SmartToyIcon />}
                                label="Chatbot Management" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    '&.Mui-selected': { color: '#3B82F6' }
                                }} 
                            />
                            <Tab 
                                icon={<MessageIcon />}
                                label="Messages Management" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    '&.Mui-selected': { color: '#3B82F6' }
                                }} 
                            />
                            <Tab 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><g><circle cx="12" cy="10" r="2"/><path d="M12 8v0"/><path d="M12 12v0"/></g></svg>}
                                label="Student Mood Tracking" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    '&.Mui-selected': { color: '#3B82F6' }
                                }} 
                            />
                        </Tabs>
                    )}

                    {/* Dashboard Overview - Visible to all users */}
                    {(!isDirector || (isDirector && tabValue === 0)) && (
                        <>
                            {/* KPI Section with shadows and hover effects */}
                            <Box className="mb-8">
                                <KPISection 
                                    data={kpiData} 
                                    customStyles={{
                                        card: "transition-all duration-300 hover:shadow-lg hover:translate-y-[-5px]",
                                        iconContainer: "rounded-full bg-gradient-to-r from-blue-500 to-teal-400 p-3 text-white"
                                    }}
                                />
                            </Box>

                            {/* Main Content */}
                            <Grid container spacing={4}>
                                {/* Upcoming Appointments */}
                                <Grid item xs={12} md={6}>
                                    <Paper 
                                        elevation={0} 
                                        className="rounded-xl overflow-hidden"
                                        sx={{ 
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                            height: '100%',
                                            border: '1px solid rgba(229, 231, 235, 0.8)',
                                        }}
                                    >
                                        <Box sx={{ p: 3, backgroundColor: '#f8fafc' }}>
                                            <Typography variant="h6" className="font-semibold text-gray-800">
                                                Upcoming Appointments
                                            </Typography>
                                            <Typography variant="body2" className="text-gray-500">
                                                Your next session is scheduled soon
                                            </Typography>
                                        </Box>
                                        <Box sx={{ p: 3 }}>
                                            <AppointmentCard
                                                name="Zachary Albert Legaria"
                                                reason="Mental Disorder: Depression because of Capstone"
                                                date="January 1, 2024"
                                                time="12:00am"
                                                className="border border-gray-100 hover:border-blue-200 transition-all"
                                            />
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Mood State Chart */}
                                <Grid item xs={12} md={6}>
                                    <Paper 
                                        elevation={0} 
                                        className="rounded-xl overflow-hidden"
                                        sx={{ 
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                            height: '100%',
                                            border: '1px solid rgba(229, 231, 235, 0.8)',
                                        }}
                                    >
                                        <Box sx={{ p: 3, backgroundColor: '#f8fafc' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <Typography variant="h6" className="font-semibold text-gray-800">
                                                        Mood Trends Report
                                                    </Typography>
                                                    <Typography variant="body2" className="text-gray-500">
                                                        Student mood analysis
                                                    </Typography>
                                                </div>
                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                    <InputLabel id="time-period-label">Time Period</InputLabel>
                                                    <Select
                                                        labelId="time-period-label"
                                                        id="time-period-select"
                                                        value={moodTimePeriod}
                                                        label="Time Period"
                                                        onChange={handleMoodTimePeriodChange}
                                                    >
                                                        <MenuItem value="week">Week</MenuItem>
                                                        <MenuItem value="month">Month</MenuItem>
                                                        <MenuItem value="year">Year</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Box>
                                            <Tabs 
                                                value={moodReportTab} 
                                                onChange={handleMoodReportTabChange} 
                                                sx={{ mt: 2 }}
                                                variant="fullWidth"
                                            >
                                                <Tab label="Mood Intensities" />
                                                <Tab label="Weekly Trend" />
                                            </Tabs>
                                        </Box>
                                        <Box sx={{ p: 3, height: 'calc(100% - 130px)', overflowY: 'auto' }}>
                                            {/* Mood Distribution Tab */}
                                            {moodReportTab === 0 && (
                                                <>
                                                    <Box sx={{ mb: 3 }}>
                                                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                                                            Intensity Range Guide:
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                            <Chip size="small" label="LOW: 1-3" sx={{ bgcolor: '#10B981', color: 'white' }} />
                                                            <Chip size="small" label="MODERATE: 4-6" sx={{ bgcolor: '#FBBF24', color: 'white' }} />
                                                            <Chip size="small" label="HIGH: 7-10" sx={{ bgcolor: '#EF4444', color: 'white' }} />
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                                        Mood Average Intensities:
                                                    </Typography>
                                                    {moodAverageIntensities.length > 0 ? (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {moodAverageIntensities.map((item) => (
                                                                <Box 
                                                                    key={item.type} 
                                                                    sx={{ 
                                                                        display: 'flex', 
                                                                        justifyContent: 'space-between', 
                                                                        alignItems: 'center',
                                                                        pb: 1,
                                                                        borderBottom: '1px solid #eee'
                                                                    }}
                                                                >
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Typography sx={{ textTransform: 'capitalize', fontWeight: 'medium' }}>
                                                                            {item.type}:
                                                                        </Typography>
                                                                        <Typography sx={{ fontWeight: 'bold' }}>
                                                                            {item.average}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Chip 
                                                                        label={item.category} 
                                                                        sx={{ 
                                                                            backgroundColor: 
                                                                                item.category === 'LOW' ? '#10B981' : 
                                                                                item.category === 'MODERATE' ? '#FBBF24' : '#EF4444',
                                                                            color: 'white',
                                                                            fontWeight: 'bold'
                                                                        }} 
                                                                    />
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                                            No mood data available
                                                        </Typography>
                                                    )}
                                                </>
                                            )}
                                            
                                            {/* Weekly Trend Tab */}
                                            {moodReportTab === 1 && (
                                                <Box sx={{ height: '100%' }}>
                                                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                                        Weekly Mood Trends:
                                                    </Typography>
                                                    {chartData.length > 0 ? (
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Day</TableCell>
                                                                    <TableCell>Most Common Mood</TableCell>
                                                                    <TableCell align="right">Count</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {chartData.map((data) => (
                                                                    <TableRow key={data.day}>
                                                                        <TableCell>{data.day}</TableCell>
                                                                        <TableCell sx={{ textTransform: 'capitalize' }}>{data.mostCommonMood}</TableCell>
                                                                        <TableCell align="right">{data.count}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                                            No weekly mood data available
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                        <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid rgba(229, 231, 235, 0.8)' }}>
                                            <Button 
                                                variant="contained" 
                                                color="primary" 
                                                onClick={handleOpenMoodAnalytics}
                                                sx={{ borderRadius: 8 }}
                                            >
                                                View Detailed Analytics
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </>
                    )}

                    {/* Student Mood Tracking (Only for directors) */}
                    {isDirector && tabValue === 3 && (
                        <Box sx={{ mt: 2 }}>
                            <Grid container spacing={3}>
                                {/* Student List */}
                                <Grid item xs={12} md={4}>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 3, 
                                            borderRadius: 2, 
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                                            border: '1px solid rgba(229, 231, 235, 0.8)',
                                            height: '70vh',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
                                            Students
                                        </Typography>
                                        
                                        {students.length > 0 ? (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {students.map((student) => (
                                                    <Box 
                                                        key={student.user_id}
                                                        onClick={() => handleSelectStudent(student)}
                                                        sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            p: 2,
                                                            borderRadius: 2,
                                                            cursor: 'pointer',
                                                            backgroundColor: selectedStudent?.user_id === student.user_id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                            border: selectedStudent?.user_id === student.user_id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(59, 130, 246, 0.05)'
                                                            }
                                                        }}
                                                    >
                                                        <Avatar 
                                                            src={student.profile_image_url || ''} 
                                                            alt={student.name}
                                                            sx={{ 
                                                                width: 40, 
                                                                height: 40, 
                                                                mr: 2,
                                                                bgcolor: !student.profile_image_url ? '#10B981' : undefined
                                                            }}
                                                        >
                                                            {!student.profile_image_url && student.name.charAt(0).toUpperCase()}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 'medium' }}>
                                                                {student.name}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {student.program || 'No program specified'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                                No students found
                                            </Typography>
                                        )}
                                    </Paper>
                                </Grid>
                                
                                {/* Student Mood Data */}
                                <Grid item xs={12} md={8}>
                                    <Paper 
                                        elevation={0} 
                                        sx={{ 
                                            p: 3, 
                                            borderRadius: 2, 
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                                            border: '1px solid rgba(229, 231, 235, 0.8)',
                                            height: '70vh',
                                            overflowY: 'auto'
                                        }}
                                    >
                                        {selectedStudent ? (
                                            <>
                                                {/* Student Profile Header */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                                    <Avatar 
                                                        src={selectedStudent.profile_image_url || ''} 
                                                        alt={selectedStudent.name}
                                                        sx={{ 
                                                            width: 64, 
                                                            height: 64, 
                                                            mr: 3,
                                                            bgcolor: !selectedStudent.profile_image_url ? '#10B981' : undefined
                                                        }}
                                                    >
                                                        {!selectedStudent.profile_image_url && selectedStudent.name.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                            {selectedStudent.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                                            {selectedStudent.program && (
                                                                <Chip 
                                                                    size="small" 
                                                                    label={selectedStudent.program} 
                                                                    sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }} 
                                                                />
                                                            )}
                                                            {selectedStudent.program_year_level && (
                                                                <Chip 
                                                                    size="small" 
                                                                    label={`Year ${selectedStudent.program_year_level}`} 
                                                                    sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }} 
                                                                />
                                                            )}
                                                            {selectedStudent.department && (
                                                                <Chip 
                                                                    size="small" 
                                                                    label={selectedStudent.department} 
                                                                    sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }} 
                                                                />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Mood Entries */}
                                                <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                                                    Mood Tracking History
                                                </Typography>
                                                
                                                {loadingStudentData ? (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                        <Typography>Loading mood data...</Typography>
                                                    </Box>
                                                ) : studentMoods.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {studentMoods.map((entry, index) => (
                                                            <Paper 
                                                                key={entry.date}
                                                                elevation={0}
                                                                sx={{ 
                                                                    p: 3, 
                                                                    border: '1px solid rgba(229, 231, 235, 0.8)',
                                                                    borderRadius: 2,
                                                                    borderLeft: '4px solid',
                                                                    borderLeftColor: 
                                                                        entry.progressStatus === 'positive' ? '#10B981' : 
                                                                        entry.progressStatus === 'negative' ? '#EF4444' : '#6B7280'
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Typography sx={{ fontWeight: 'medium' }}>
                                                                            {entry.date}
                                                                        </Typography>
                                                                        {entry.isRecent && (
                                                                            <Chip size="small" label="Recent" color="primary" />
                                                                        )}
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            ({entry.entryCount} {entry.entryCount === 1 ? 'entry' : 'entries'}) {entry.time}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 'medium' }}>
                                                                            Mood Status:
                                                                        </Typography>
                                                                        {getMoodStatusIcon(entry.progressStatus)}
                                                                    </Box>
                                                                </Box>
                                                                
                                                                <Box sx={{ mt: 2 }}>
                                                                    <Grid container spacing={2}>
                                                                        {Object.entries(entry.moodAverages).map(([type, intensity]) => (
                                                                            <Grid item xs={6} sm={4} key={type}>
                                                                                <Box sx={{ 
                                                                                    display: 'flex', 
                                                                                    justifyContent: 'space-between', 
                                                                                    p: 1.5,
                                                                                    borderRadius: 1,
                                                                                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                                                    border: '1px solid rgba(0, 0, 0, 0.05)'
                                                                                }}>
                                                                                    <Typography sx={{ textTransform: 'uppercase', fontWeight: 'medium' }}>
                                                                                        {type}:
                                                                                    </Typography>
                                                                                    <Typography sx={{ 
                                                                                        fontWeight: 'bold',
                                                                                        color: 
                                                                                            parseFloat(intensity) >= 7 ? '#EF4444' :
                                                                                            parseFloat(intensity) >= 4 ? '#FBBF24' : '#10B981'
                                                                                    }}>
                                                                                        {intensity}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Grid>
                                                                        ))}
                                                                    </Grid>
                                                                </Box>
                                                            </Paper>
                                                        ))}
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed #d1d5db', borderRadius: 2 }}>
                                                        <Typography color="text.secondary">
                                                            No mood entries found for this student
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </>
                                        ) : (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                        <circle cx="12" cy="10" r="3"/>
                                                    </svg>
                                                    <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                                                        Select a Student
                                                    </Typography>
                                                    <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                                                        Choose a student from the list to view their mood tracking data
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </Container>
                
                {/* Question Dialog */}
                <Dialog open={openQuestionDialog} onClose={handleCloseQuestionDialog}>
                    <DialogTitle>{isEditing ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="question"
                            label="Question"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={currentQuestion.chatbot_question}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, chatbot_question: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseQuestionDialog}>Cancel</Button>
                        <Button onClick={isEditing ? updateQuestion : addQuestion} variant="contained" color="primary">
                            {isEditing ? 'Update' : 'Add'}
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Answer Dialog */}
                <Dialog open={openAnswerDialog} onClose={handleCloseAnswerDialog}>
                    <DialogTitle>{isEditing ? 'Edit Answer' : 'Add New Answer'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ my: 2 }}>
                            <Typography variant="subtitle2" component="label" htmlFor="question-select" sx={{ mb: 1, display: 'block' }}>
                                Related Question
                            </Typography>
                            <select
                                id="question-select"
                                value={currentAnswer.chat_question_id || ''}
                                onChange={(e) => setCurrentAnswer({ ...currentAnswer, chat_question_id: e.target.value || null })}
                                style={{ 
                                    width: '100%', 
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da',
                                    marginBottom: '16px'
                                }}
                            >
                                <option value="">Select a question</option>
                                {questions.map((question) => (
                                    <option key={question.chat_question_id} value={question.chat_question_id}>
                                        {question.chatbot_question}
                                    </option>
                                ))}
                            </select>
                        </Box>
                        <TextField
                            margin="dense"
                            id="answer"
                            label="Answer"
                            type="text"
                            fullWidth
                            multiline
                            rows={4}
                            variant="outlined"
                            value={currentAnswer.chatbot_answer}
                            onChange={(e) => setCurrentAnswer({ ...currentAnswer, chatbot_answer: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseAnswerDialog}>Cancel</Button>
                        <Button 
                            onClick={isEditing ? updateAnswer : addAnswer} 
                            variant="contained" 
                            color="primary"
                            disabled={!currentAnswer.chat_question_id}
                        >
                            {isEditing ? 'Update' : 'Add'}
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Message Dialog */}
                <Dialog open={openMessageDialog} onClose={handleCloseMessageDialog} fullWidth>
                    <DialogTitle>{isEditing ? 'Edit Message' : 'Add New Message'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ my: 2 }}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel id="message-type-label">Message Type</InputLabel>
                                <Select
                                    labelId="message-type-label"
                                    id="message-type"
                                    value={currentMessage.message_type}
                                    label="Message Type"
                                    onChange={(e) => setCurrentMessage({ ...currentMessage, message_type: e.target.value })}
                                >
                                    <MenuItem value="options">options</MenuItem>
                                    <MenuItem value="response">response</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel id="message-role-label">Message Role</InputLabel>
                                <Select
                                    labelId="message-role-label"
                                    id="message-role"
                                    value={currentMessage.message_role}
                                    label="Message Role"
                                    onChange={(e) => setCurrentMessage({ ...currentMessage, message_role: e.target.value })}
                                >
                                    <MenuItem value="counselor">Counselor</MenuItem>
                                    <MenuItem value="secretary">Secretary</MenuItem>
                                    <MenuItem value="student">Student</MenuItem>
                                    <MenuItem value="director">Director</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            margin="dense"
                            id="message"
                            label="Message Content"
                            type="text"
                            fullWidth
                            multiline
                            rows={4}
                            variant="outlined"
                            value={currentMessage.message_content}
                            onChange={(e) => setCurrentMessage({ ...currentMessage, message_content: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseMessageDialog}>Cancel</Button>
                        <Button 
                            onClick={isEditing ? updateMessage : addMessage} 
                            variant="contained" 
                            color="primary"
                        >
                            {isEditing ? 'Update' : 'Add'}
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmDialog.open} onClose={handleCloseDeleteConfirmDialog}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete this {deleteConfirmDialog.type}? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteConfirmDialog}>Cancel</Button>
                        <Button 
                            onClick={() => {
                                if (deleteConfirmDialog.type === 'question') {
                                    deleteQuestion(deleteConfirmDialog.id);
                                } else if (deleteConfirmDialog.type === 'answer') {
                                    deleteAnswer(deleteConfirmDialog.id);
                                } else if (deleteConfirmDialog.type === 'message') {
                                    deleteMessage(deleteConfirmDialog.id);
                                }
                            }} 
                            variant="contained" 
                            color="error"
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Snackbar for notifications */}
                <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={6000} 
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                {/* Mood Analytics Modal */}
                <Dialog
                    open={moodAnalyticsOpen}
                    onClose={handleCloseMoodAnalytics}
                    fullWidth
                    maxWidth="md"
                >
                    <DialogTitle>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Mood Analytics Dashboard
                            <IconButton onClick={handleCloseMoodAnalytics} size="small">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ mb: 4 }}>
                            <FormControl fullWidth>
                                <InputLabel id="modal-time-period-label">Time Period</InputLabel>
                                <Select
                                    labelId="modal-time-period-label"
                                    id="modal-time-period-select"
                                    value={moodTimePeriod}
                                    label="Time Period"
                                    onChange={handleMoodTimePeriodChange}
                                >
                                    <MenuItem value="week">Last 7 Days</MenuItem>
                                    <MenuItem value="month">Last 30 Days</MenuItem>
                                    <MenuItem value="year">Last Year</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        
                        <Grid container spacing={3}>
                            {/* Mood Average Intensities Section */}
                            <Grid item xs={12} md={6}>
                                <Paper elevation={0} sx={{ p: 3, height: '100%', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                        Mood Average Intensities
                                    </Typography>
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                                            Intensity Range Guide:
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                            <Chip size="small" label="LOW: 1-3" sx={{ bgcolor: '#10B981', color: 'white' }} />
                                            <Chip size="small" label="MODERATE: 4-6" sx={{ bgcolor: '#FBBF24', color: 'white' }} />
                                            <Chip size="small" label="HIGH: 7-10" sx={{ bgcolor: '#EF4444', color: 'white' }} />
                                        </Box>
                                    </Box>
                                    {moodAverageIntensities.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {moodAverageIntensities.map((item) => (
                                                <Box 
                                                    key={item.type} 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center',
                                                        pb: 1,
                                                        borderBottom: '1px solid #eee'
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography sx={{ textTransform: 'capitalize', fontWeight: 'medium' }}>
                                                            {item.type}:
                                                        </Typography>
                                                        <Typography sx={{ fontWeight: 'bold' }}>
                                                            {item.average}
                                                        </Typography>
                                                    </Box>
                                                    <Chip 
                                                        label={item.category} 
                                                        sx={{ 
                                                            backgroundColor: 
                                                                item.category === 'LOW' ? '#10B981' : 
                                                                item.category === 'MODERATE' ? '#FBBF24' : '#EF4444',
                                                            color: 'white',
                                                            fontWeight: 'bold'
                                                        }} 
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                            No mood data available
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                            
                            {/* Weekly Trends Section */}
                            <Grid item xs={12} md={6}>
                                <Paper elevation={0} sx={{ p: 3, height: '100%', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                                        Weekly Mood Trends
                                    </Typography>
                                    {chartData.length > 0 ? (
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Day</TableCell>
                                                    <TableCell>Most Common Mood</TableCell>
                                                    <TableCell align="right">Count</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {chartData.map((data) => (
                                                    <TableRow key={data.day}>
                                                        <TableCell>{data.day}</TableCell>
                                                        <TableCell sx={{ textTransform: 'capitalize' }}>{data.mostCommonMood}</TableCell>
                                                        <TableCell align="right">{data.count}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                                            No weekly mood data available
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseMoodAnalytics}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Box>
    );
}