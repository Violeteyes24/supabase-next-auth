// Import necessary dependencies
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ApproveDenyPage() {
    const supabase = createClientComponentClient();
    const [registrants, setRegistrants] = useState([]);

    useEffect(() => {
        fetchRegistrants();
    }, []);

    const fetchRegistrants = async () => {
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, credentials, department_assigned, short_biography, user_type") // Adjust the columns to match your table schema
            .in("user_type", ["counselor", "secretary"]);

        console.log("Fetched registrants:", data);
        if (error) {
            console.error("Fetch registrants error:", error.message, error.details, error.hint);
        } else {
            setRegistrants(data || []);
        }
    };

    const handleApprove = (id) => {
        console.log(`Approved registrant with ID: ${id}`);
        // Add your approval logic here
    };

    const handleDeny = (id) => {
        console.log(`Denied registrant with ID: ${id}`);
        // Add your denial logic here
    };

    return (
        <div className="h-screen bg-white flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-black ml-20 p-6">
                <h1 className="text-3xl font-bold mt-4 mb-6">Approve or Deny Registrants</h1>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-emerald-200 rounded-lg">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-black">Picture</th>
                                <th className="px-4 py-2 text-left text-black">Name</th>
                                <th className="px-4 py-2 text-left text-black">User Type</th>
                                <th className="px-4 py-2 text-left text-black">Credentials</th>
                                <th className="px-4 py-2 text-left text-black">Biography</th>
                                <th className="px-4 py-2 text-left text-black">Department</th>
                                <th className="px-4 py-2 text-center text-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrants.map((registrant) => (
                                <tr key={registrant.user_id} className="border-b border-gray-700">
                                    <td className="px-4 py-2">
                                        <img
                                            src="https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"
                                            alt="Profile"
                                            className="w-12 h-12 rounded-full"
                                        />
                                    </td>
                                    <td className="px-4 py-2">{registrant.name}</td>
                                    <td className="px-4 py-2">{registrant.user_type}</td>
                                    <td className="px-4 py-2">{registrant.credentials}</td>
                                    <td className="px-4 py-2">{registrant.short_biography}</td>
                                    <td className="px-4 py-2">{registrant.department_assigned}</td>
                                    <td className="px-4 py-2 flex justify-center space-x-4">
                                        <button
                                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                            onClick={() => handleApprove(registrant.user_id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                            onClick={() => handleDeny(registrant.user_id)}
                                        >
                                            Deny
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
