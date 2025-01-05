'use client';
// will not hardcode values of props, should be extracted from the database
import React from 'react';

export default function AppointmentCard({ appointments = [] }) {
    return (
        <div className="border rounded-lg shadow-xl p-6 max-w-lg bg-gradient-to-r from-gray-900 via-gray-950 to-black overflow-auto max-h-96">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-extrabold text-emerald-400 tracking-wide">Upcoming Appointments</h2>
            </div>

            {/* Table Section */}
            {appointments.length > 0 ? (
                <table className="table-auto w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900">
                            <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Picture</th>
                            <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Name</th>
                            <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Reason</th>
                            <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Date</th>
                            <th className="px-4 py-3 border-b font-semibold text-gray-300 text-sm">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.map((appointment, index) => (
                            <tr key={index} className="hover:bg-gray-800 transition duration-200">
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">
                                    <img
                                        src={appointment.picture}
                                        alt="Profile Picture"
                                        className="w-12 h-12 rounded-full border-2 border-emerald-400"
                                    />
                                </td>
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">{appointment.name}</td>
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">{appointment.reason}</td>
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">{appointment.date}</td>
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">{appointment.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-gray-400 text-sm text-center">No upcoming appointments available.</p>
            )}

            {/* Footer Section */}
            <div className="flex justify-between items-center mt-6">
                <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-md transition duration-200">
                    Confirm All
                </button>
                <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition duration-200">
                    Cancel All
                </button>
            </div>
        </div>
    );
}
