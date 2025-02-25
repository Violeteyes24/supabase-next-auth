'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AppointmentTypeChart = () => {
    const [data, setData] = useState({ labels: [], datasets: [] });
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('appointment_type, count(appointment_id)')
                .group('appointment_type');

            if (error) {
                console.error('Error fetching appointment types:', error);
                return;
            }

            const labels = appointments.map(app => app.appointment_type);
            const counts = appointments.map(app => app.count);

            setData({
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#FF6384', '#36A2EB'],
                    hoverBackgroundColor: ['#FF6384', '#36A2EB']
                }]
            });
        };

        fetchData();
    }, [supabase]);

    return (
        <div>
            <Pie data={data} />
        </div>
    );
};

export default AppointmentTypeChart;