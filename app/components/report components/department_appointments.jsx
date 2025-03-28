'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const DepartmentAppointmentChart = () => {
    const [data, setData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: appointments, error } = await supabase
                .rpc('get_department_appointments');

            if (error) {
                console.error('Error fetching department appointments:', error);
                return;
            }

            const chartData = appointments.map(app => ({
                name: app.department,
                value: app.count
            }));

            setData(chartData);
            
            // Store data in global object for text reports
            if (typeof window !== 'undefined' && window.chartData) {
                window.chartData.departmentAppointments = chartData;
            }
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

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

export default DepartmentAppointmentChart;