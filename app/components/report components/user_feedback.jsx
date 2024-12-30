'use client';

import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false });

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
