'use client';

// import dynamic from 'next/dynamic';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

// const PieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart), { ssr: false });
// const Pie = dynamic(() => import('recharts').then((mod) => mod.Pie), { ssr: false });
// const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell), { ssr: false });
// const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });

const DemographicsChart = () => {
    const demographicData = [
        { name: '18-24', value: 40 },
        { name: '25-34', value: 35 },
        { name: '35-44', value: 20 },
        { name: '45+', value: 5 },
    ];
    const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d'];

    return (
        <div style={{ width: '100%', height: 300 }}>
            <PieChart width={400} height={300}>
                <Pie
                    data={demographicData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label
                >
                    {demographicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </div>
    );
};

export default DemographicsChart;
