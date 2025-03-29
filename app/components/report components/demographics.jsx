'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const DemographicsChart = () => {
    const [data, setData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            // Fetch only the gender from "users" table
            const { data: users, error } = await supabase
                .from('users')
                .select('gender');
            if (error) {
                console.error('Error fetching users:', error);
                return;
            }
            let femaleCount = 0, maleCount = 0, otherCount = 0;
            users.forEach(row => {
                const gender = row.gender ? row.gender.toLowerCase() : '';
                if (gender === 'female') {
                    femaleCount++;
                } else if (gender === 'male') {
                    maleCount++;
                } else {
                    otherCount++;
                }
            });
            const chartData = [
                { name: 'Female', value: femaleCount },
                { name: 'Male', value: maleCount },
                { name: 'Other', value: otherCount }
            ];
            setData(chartData);
            
            // Store data in global object for text reports
            if (typeof window !== 'undefined' && window.chartData) {
                window.chartData.demographics = chartData;
            }
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1'];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <PieChart width={400} height={300}>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </div>
    );
};

export default DemographicsChart;
