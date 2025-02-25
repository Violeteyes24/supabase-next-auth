// components/report components/DepartmentAppointmentChart.js
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const DepartmentAppointmentChart = () => {
    const [data, setData] = useState({ labels: [], datasets: [] });
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('user_id, users.department, count(appointment_id)')
                .join('users', 'appointments.user_id = users.user_id')
                .group('users.department');

            if (error) {
                console.error('Error fetching department appointments:', error);
                return;
            }

            const labels = appointments.map(app => app.department_assigned);
            const counts = appointments.map(app => app.count);

            setData({
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                    hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
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

export default DepartmentAppointmentChart;