'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const emotionalData = [
    { day: 'Monday', emotion: 6 },
    { day: 'Tuesday', emotion: 7 },
    { day: 'Wednesday', emotion: 8 },
    { day: 'Thursday', emotion: 7.5 },
    { day: 'Friday', emotion: 9 },
];

const EmotionalStateChart = () => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={emotionalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="emotion" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default EmotionalStateChart;
