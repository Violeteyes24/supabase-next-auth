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

    useEffect(() => {
        async function getUser() {
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
                        
                        // Set up realtime subscriptions for chatbot tables
                        const questionsChannel = supabase.channel('chatbot-questions-changes')
                            .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_questions' }, () => {
                                fetchChatbotQuestions();
                            })
                            .subscribe();
                            
                        const answersChannel = supabase.channel('chatbot-answers-changes')
                            .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbot_answers' }, () => {
                                fetchChatbotAnswers();
                            })
                            .subscribe();
                            
                        const messagesChannel = supabase.channel('predefined-messages-changes')
                            .on('postgres_changes', { event: '*', schema: 'public', table: 'predefined_messages' }, () => {
                                fetchPredefinedMessages();
                            })
                            .subscribe();
                            
                        return () => {
                            supabase.removeChannel(questionsChannel);
                            supabase.removeChannel(answersChannel);
                            supabase.removeChannel(messagesChannel);
                        };
                    }
                }
            } catch (err) {
                console.error('Unexpected error fetching user:', err);
            }
        }

        getUser();
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

    async function fetchMoodScores() {
        const { data: moods, error } = await supabase
            .from('mood_tracker')
            .select('intensity, tracked_at');

        if (error) {
            console.error('Error fetching mood scores:', error);
            return;
        }

        const totalMoodScore = moods.reduce((sum, mood) => sum + mood.intensity, 0);
        const averageMood = moods.length ? (totalMoodScore / moods.length).toFixed(1) : 0;
        setAverageMoodScore(averageMood);

        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const moodData = daysOfWeek.map(day => {
            const dayMoods = moods.filter(mood => 
                new Date(mood.tracked_at).toLocaleDateString('en-US', { weekday: 'long' }) === day
            );
            const dayTotalMood = dayMoods.reduce((sum, mood) => sum + mood.intensity, 0);
            const dayAverageMood = dayMoods.length ? (dayTotalMood / dayMoods.length).toFixed(1) : 0;
            return { day, mood: parseFloat(dayAverageMood) };
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
                averageMoodScore,
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
        { title: 'Average Mood Score', value: averageMoodScore, icon: 'smile' },
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
                                            <Typography variant="h6" className="font-semibold text-gray-800">
                                                Mood State Report
                                            </Typography>
                                            <Typography variant="body2" className="text-gray-500">
                                                Weekly average mood scores
                                            </Typography>
                                        </Box>
                                        <Box sx={{ p: 3, height: 'calc(100% - 80px)' }}>
                                            <Charts 
                                                data={chartData}
                                                chartColors={{
                                                    stroke: '#3B82F6',
                                                    fill: 'rgba(59, 130, 246, 0.1)'
                                                }}
                                            />
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </>
                    )}

                    {/* Chatbot Management (Only for directors) */}
                    {isDirector && tabValue === 1 && (
                        <Box sx={{ mt: 2 }}>
                            {/* Questions Section */}
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    p: 3, 
                                    mb: 4, 
                                    borderRadius: 2, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                                    border: '1px solid rgba(229, 231, 235, 0.8)' 
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                                        Questions
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenQuestionDialog()}
                                        sx={{ borderRadius: 8 }}
                                    >
                                        Add Question
                                    </Button>
                                </Box>
                                
                                <TableContainer>
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Question</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {questions.length > 0 ? (
                                                questions.map((question) => (
                                                    <TableRow key={question.chat_question_id}>
                                                        <TableCell>{question.chatbot_question}</TableCell>
                                                        <TableCell align="right">
                                                            <IconButton 
                                                                color="primary" 
                                                                onClick={() => handleOpenQuestionDialog(question)}
                                                                size="small"
                                                            >
                                                                <EditIcon />
                                                            </IconButton>
                                                            <IconButton 
                                                                color="error" 
                                                                onClick={() => handleOpenDeleteConfirmDialog('question', question.chat_question_id)}
                                                                size="small"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} align="center">
                                                        {loading ? 'Loading questions...' : 'No questions found'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                            
                            {/* Answers Section */}
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    p: 3, 
                                    borderRadius: 2, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                                    border: '1px solid rgba(229, 231, 235, 0.8)' 
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                                        Answers
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenAnswerDialog()}
                                        disabled={questions.length === 0}
                                        sx={{ borderRadius: 8 }}
                                    >
                                        Add Answer
                                    </Button>
                                </Box>
                                
                                <TableContainer>
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Related Question</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Answer</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {answers.length > 0 ? (
                                                answers.map((answer) => (
                                                    <TableRow key={answer.chat_answer_id}>
                                                        <TableCell>{getQuestionTextById(answer.chat_question_id)}</TableCell>
                                                        <TableCell>{answer.chatbot_answer}</TableCell>
                                                        <TableCell align="right">
                                                            <IconButton 
                                                                color="primary" 
                                                                onClick={() => handleOpenAnswerDialog(answer)}
                                                                size="small"
                                                            >
                                                                <EditIcon />
                                                            </IconButton>
                                                            <IconButton 
                                                                color="error" 
                                                                onClick={() => handleOpenDeleteConfirmDialog('answer', answer.chat_answer_id)}
                                                                size="small"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} align="center">
                                                        {loading ? 'Loading answers...' : 'No answers found'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Box>
                    )}

                    {/* Messages Management (Only for directors) */}
                    {isDirector && tabValue === 2 && (
                        <Box sx={{ mt: 2 }}>
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    p: 3, 
                                    borderRadius: 2, 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                                    border: '1px solid rgba(229, 231, 235, 0.8)' 
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                                        Predefined Messages
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenMessageDialog()}
                                        sx={{ borderRadius: 8 }}
                                    >
                                        Add Message
                                    </Button>
                                </Box>
                                
                                <TableContainer>
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Content</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {messages.length > 0 ? (
                                                messages.map((message) => (
                                                    <TableRow key={message.message_content_id}>
                                                        <TableCell>{message.message_type}</TableCell>
                                                        <TableCell>{message.message_role}</TableCell>
                                                        <TableCell>
                                                            {message.message_content.length > 100 
                                                                ? `${message.message_content.substring(0, 100)}...` 
                                                                : message.message_content}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton 
                                                                color="primary" 
                                                                onClick={() => handleOpenMessageDialog(message)}
                                                                size="small"
                                                            >
                                                                <EditIcon />
                                                            </IconButton>
                                                            <IconButton 
                                                                color="error" 
                                                                onClick={() => handleOpenDeleteConfirmDialog('message', message.message_content_id)}
                                                                size="small"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center">
                                                        {loading ? 'Loading messages...' : 'No messages found'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
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
            </Box>
        </Box>
    );
}