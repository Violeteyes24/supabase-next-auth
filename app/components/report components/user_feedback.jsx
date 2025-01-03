'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const FeedbackChart = () => {
    
    const feedbackData = [
        { rating: '1 Star', count: 10 },
        { rating: '2 Stars', count: 15 },
        { rating: '3 Stars', count: 30 },
        { rating: '4 Stars', count: 45 },
        { rating: '5 Stars', count: 50 },
    ];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <BarChart width={400} height={300} data={feedbackData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
        </div>
    );
};

export default FeedbackChart;
