// Import necessary dependencies
'use client';

import React from 'react';
import Sidebar from "../components/dashboard components/sidebar";

export default function ApproveDenyPage() {
    const registrants = [
        {
            id: 1,
            picture: "https://via.placeholder.com/50",
            name: "John Doe",
            credentials: "PhD in Psychology",
            biography: "Experienced clinical psychologist with over 10 years of expertise in mental health services.",
            department: "Psychology",
        },
        {
            id: 2,
            picture: "https://via.placeholder.com/50",
            name: "Jane Smith",
            credentials: "Master's in Counseling",
            biography: "Dedicated counselor specializing in adolescent therapy and family dynamics.",
            department: "Counseling",
        },
        {
            id: 3,
            picture: "https://via.placeholder.com/50",
            name: "Alice Johnson",
            credentials: "Bachelor's in Social Work",
            biography: "Passionate social worker focused on community outreach and rehabilitation programs.",
            department: "Social Work",
        },
    ];

    const handleApprove = (id) => {
        console.log(`Approved registrant with ID: ${id}`);
        // Add your approval logic here
    };

    const handleDeny = (id) => {
        console.log(`Denied registrant with ID: ${id}`);
        // Add your denial logic here
    };

    return (
        <div className="h-screen bg-gray-800 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-white ml-20 p-6">
                <h1 className="text-3xl font-bold mt-4 mb-6">Approve or Deny Registrants</h1>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-gray-900 rounded-lg">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-gray-400">Picture</th>
                                <th className="px-4 py-2 text-left text-gray-400">Name</th>
                                <th className="px-4 py-2 text-left text-gray-400">Credentials</th>
                                <th className="px-4 py-2 text-left text-gray-400">Biography</th>
                                <th className="px-4 py-2 text-left text-gray-400">Department</th>
                                <th className="px-4 py-2 text-center text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrants.map((registrant) => (
                                <tr key={registrant.id} className="border-b border-gray-700">
                                    <td className="px-4 py-2">
                                        <img
                                            src={registrant.picture}
                                            alt="Profile"
                                            className="w-12 h-12 rounded-full"
                                        />
                                    </td>
                                    <td className="px-4 py-2">{registrant.name}</td>
                                    <td className="px-4 py-2">{registrant.credentials}</td>
                                    <td className="px-4 py-2">{registrant.biography}</td>
                                    <td className="px-4 py-2">{registrant.department}</td>
                                    <td className="px-4 py-2 flex justify-center space-x-4">
                                        <button
                                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                            onClick={() => handleApprove(registrant.id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                            onClick={() => handleDeny(registrant.id)}
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
