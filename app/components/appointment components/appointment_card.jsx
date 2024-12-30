'use client';

import React from 'react';

export default function AppointmentCard({ name, reason, date, time }) {

    return (
            <div className="border rounded-lg shadow-lg p-6 max-w-md bg-white">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-600">Upcoming Appointments</h2>
                </div>

                {/* Table Section */}
                <table className="table-auto w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-4 py-2 border font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-2 border font-semibold text-gray-700">Reason</th>
                            <th className="px-4 py-2 border font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-2 border font-semibold text-gray-700">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="hover:bg-gray-50 transition">
                            <td className="px-4 py-2 border text-gray-800">{name}</td>
                            <td className="px-4 py-2 border text-gray-800">{reason}</td>
                            <td className="px-4 py-2 border text-gray-800">{date}</td>
                            <td className="px-4 py-2 border text-gray-800">{time}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
    );
}
