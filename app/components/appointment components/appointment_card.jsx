'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AppointmentCard() {
    const [appointments, setAppointments] = useState([]);
    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        const { data, error } = await supabase
            .from('availability_schedules')
            .select('*')
            .eq('is_available', true)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching appointments:', error.message);
            return;
        }

        setAppointments(data);
    };

    return (
        <div className="border rounded-lg shadow-xl p-6 max-w-lg bg-white overflow-auto max-h-96">
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
                            <tr key={index} className="hover:bg-emerald-400 transition duration-200">
                                <td className="px-4 py-3 border-b text-gray-100 text-sm">
                                    <img
                                        src="https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"
                                        alt="Profile Picture"
                                        className="w-12 h-12 rounded-full border-2 border-emerald-400"
                                    />
                                </td>
                                <td className="px-4 py-3 border-b text-black text-sm">{appointment.name}</td>
                                <td className="px-4 py-3 border-b text-black text-sm">{appointment.reason}</td>
                                <td className="px-4 py-3 border-b text-black text-sm">{appointment.date}</td>
                                <td className="px-4 py-3 border-b text-black text-sm">{appointment.time}</td>
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
