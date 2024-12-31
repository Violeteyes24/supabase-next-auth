'use client';

import React from 'react';

export default function AppointmentCard({ name, reason, date, time }) {

    return (
            <div className="border rounded-lg shadow-lg p-6 max-w-md bg-gray-950">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-emerald-600">Upcoming Appointments</h2>
                </div>

                {/* Table Section */}
                <table className="table-auto w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-950">
                        <th className="px-4 py-2 border font-semibold text-white">Name</th>
                        <th className="px-4 py-2 border font-semibold text-white">Reason</th>
                        <th className="px-4 py-2 border font-semibold text-white">Date</th>
                        <th className="px-4 py-2 border font-semibold text-white">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="hover:bg-gray-800 transition">
                            <td className="px-4 py-2 border text-white">{name}</td>
                        <td className="px-4 py-2 border text-white">{reason}</td>
                        <td className="px-4 py-2 border text-white">{date}</td>
                        <td className="px-4 py-2 border text-white">{time}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
    );
}
