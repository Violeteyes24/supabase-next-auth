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
            
            // Store data in global object for text reports
            if (typeof window !== 'undefined' && window.chartData) {
                window.chartData.appointmentTypes = chartData;
            }
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#db2777', '#60a5fa'];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #ccc', 
                        color: '#333',
                        borderRadius: '4px'
                    }}
                />
                <Legend 
                    wrapperStyle={{ color: '#333' }} 
                    formatter={(value) => <span style={{ color: '#333' }}>{value}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default AppointmentTypeChart;