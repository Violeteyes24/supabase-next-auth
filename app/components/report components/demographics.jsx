'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const DemographicsChart = () => {
    const [data, setData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: demographics, error } = await supabase
                .rpc('get_demographics');

            if (error) {
                console.error('Error fetching demographics:', error);
                return;
            }

            setData(demographics);
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d'];

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
