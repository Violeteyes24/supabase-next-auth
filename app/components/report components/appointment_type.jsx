'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const AppointmentTypeChart = () => {
    const [data, setData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: appointments, error } = await supabase
                .rpc('get_appointment_types');

            if (error) {
                console.error('Error fetching appointment types:', error);
                return;
            }

            const chartData = appointments.map(app => ({
                name: app.appointment_type,
                value: app.count
            }));

            setData(chartData);
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#FF6384', '#36A2EB'];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    fill="#8884d8"
                    label
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default AppointmentTypeChart;