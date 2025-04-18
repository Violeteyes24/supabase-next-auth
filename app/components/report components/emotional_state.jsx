'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const EmotionalStateChart = () => {
    const [emotionalData, setEmotionalData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await supabase
                .from('mood_tracker')
                .select('tracked_at, intensity')
                .order('tracked_at', { ascending: true });

            if (error) {
                console.error('Error fetching data:', error);
            } else {
                const aggregatedData = data.reduce((acc, item) => {
                    const date = new Date(item.tracked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Feb 25"
                    
                    if (!acc[date]) {
                        acc[date] = { date, emotion: item.intensity, count: 1 };
                    } else {
                        acc[date].emotion += item.intensity;
                        acc[date].count += 1;
                    }
                    
                    return acc;
                }, {});

                const formattedData = Object.values(aggregatedData).map(item => ({
                    date: item.date,
                    emotion: (item.emotion / item.count).toFixed(2), // Average intensity per day
                }));

                setEmotionalData(formattedData);
                
                // Store data in global object for text reports
                if (typeof window !== 'undefined' && window.chartData) {
                    window.chartData.emotionalState = formattedData;
                }
            }
        };

        fetchData();
    }, []);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={emotionalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                    dataKey="date" 
                    label={{ value: 'Date', position: 'insideBottom', offset: -5, fill: '#333' }} 
                    tick={{ fill: '#333' }}
                    stroke="#333"
                />
                <YAxis 
                    label={{ value: 'Emotion Intensity', angle: -90, position: 'insideLeft', fill: '#333' }} 
                    tick={{ fill: '#333' }}
                    stroke="#333"
                />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', color: '#333' }} />
                <Legend wrapperStyle={{ color: '#333' }} />
                <Line type="basis" dataKey="emotion" stroke="#16a34a" strokeWidth={2} activeDot={{ r: 8, fill: '#16a34a' }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default EmotionalStateChart;
