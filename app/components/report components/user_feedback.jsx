'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const FeedbackChart = () => {
    const [feedbackData, setFeedbackData] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchData = async () => {
            const { data, error } = await supabase
                .from('app_ratings')
                .select('rating, count:rating')
                .order('rating', { ascending: true });

            if (error) {
                console.error('Error fetching data:', error);
            } else {
                const aggregatedData = data.reduce((acc, item) => {
                    const existing = acc.find(d => d.rating === item.rating);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        acc.push({ rating: item.rating, count: 1 });
                    }
                    return acc;
                }, []);

                const formattedData = aggregatedData.map(item => ({
                    rating: `${item.rating} Star${item.rating > 1 ? 's' : ''}`,
                    count: item.count,
                }));
                setFeedbackData(formattedData);
                
                // Store data in global object for text reports
                if (typeof window !== 'undefined' && window.chartData) {
                    window.chartData.feedback = formattedData;
                }
            }
        };

        fetchData();
    }, []);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={feedbackData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="rating" tick={{ fill: '#333' }} stroke="#333" />
                <YAxis tick={{ fill: '#333' }} stroke="#333" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', color: '#333' }} />
                <Legend wrapperStyle={{ color: '#333' }} />
                <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default FeedbackChart;
