'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const FrequencyChart = () => {
    const [data, setData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data: topics, error } = await supabase
                .from('chatbot_view')
                .select('chat_question_id, chatbot_question, count(chat_question_id)')
                .group('chat_question_id, chatbot_question')
                .order('count', { ascending: false });

            if (error) {
                console.error('Error fetching frequent topics:', error);
                return;
            }

            const chartData = topics.map(topic => ({
                name: topic.chatbot_question,
                value: topic.count
            }));

            setData(chartData);
        };

        fetchData();
    }, [supabase]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

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

export default FrequencyChart;
