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
    const [totalUsers, setTotalUsers] = useState(0); // Add state for total users
    const [appointmentsThisMonth, setAppointmentsThisMonth] = useState(0); // Add state for appointments this month
    const [activeCounselors, setActiveCounselors] = useState(0); // Add state for active counselors
    const [averageMoodScore, setAverageMoodScore] = useState(0); // Add state for average mood score
    const [chartData, setChartData] = useState([]); // Add state for chart data
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
        fetchUsers(); // Call fetchUsers to get total users and active counselors
        fetchAppointments(); // Call fetchAppointments to get available appointments
        fetchMoodScores(); // Call fetchMoodScores to get average mood score and chart data

        const userChannel = supabase.channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers(); // Refetch users on any change
            })
            .subscribe();

        const appointmentChannel = supabase.channel('appointment-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_schedules' }, () => {
                fetchAppointments(); // Refetch appointments on any change
            })
            .subscribe();

        const moodChannel = supabase.channel('mood-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mood_tracker' }, () => {
                fetchMoodScores(); // Refetch mood scores on any change
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
        console.log('Users:', users);
        setTotalUsers(users.length); // Set total users count

        const activeCounselorsCount = users.filter(user => user.user_type === 'counselor').length;
        // && user.approval_status === 'approved' // Add this condition if you have an approval functionality
        setActiveCounselors(activeCounselorsCount); // Set active counselors count
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
        console.log('Appointments:', appointments);
        setAppointmentsThisMonth(appointments.length); // Set appointments this month count
    }

    async function fetchMoodScores() {
        const { data: moods, error } = await supabase
            .from('mood_tracker')
            .select('intensity, tracked_at');

        if (error) {
            console.error('Error fetching mood scores:', error);
            return;
        }
        console.log('Mood Scores:', moods);

        const totalMoodScore = moods.reduce((sum, mood) => sum + mood.intensity, 0);
        const averageMood = moods.length ? (totalMoodScore / moods.length).toFixed(1) : 0;
        setAverageMoodScore(averageMood); // Set average mood score

        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const moodData = daysOfWeek.map(day => {
            const dayMoods = moods.filter(mood => new Date(mood.tracked_at).toLocaleDateString('en-US', { weekday: 'long' }) === day);
            const dayTotalMood = dayMoods.reduce((sum, mood) => sum + mood.intensity, 0);
            const dayAverageMood = dayMoods.length ? (dayTotalMood / dayMoods.length).toFixed(1) : 0;
            return { day, mood: parseFloat(dayAverageMood) };
        });
        setChartData(moodData); // Set chart data
    }

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    const kpiData = [
        { title: 'Total Users', value: totalUsers }, // Use totalUsers state
        { title: 'Appointments This Month', value: appointmentsThisMonth }, // Use appointmentsThisMonth state
        { title: 'Active Counselors', value: activeCounselors }, // Use activeCounselors state
        { title: 'Average Mood Score', value: averageMoodScore }, // Use averageMoodScore state
    ];

    return (
        <main className="h-screen bg-white flex">
            <Sidebar handleLogout={handleLogout} />
            <Container sx={{ marginTop: '16px', textAlign: 'center' }}>
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 darkv :text-white py-5">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">
                        Welcome {userName}!
                    </span>
                    <mark className="ml-3 px-2 text-white bg-emerald-600 rounded dark:bg-emerald-300">
                        Your Dashboard
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
                    <h3 className='text-black text-2xl'>Mood State Report this week</h3>
                        <Charts data={chartData} />
                    </Grid>
                </Grid>
            </Container>
        </main>
    );
}
