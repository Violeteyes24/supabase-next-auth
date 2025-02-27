// Import necessary dependencies
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from 'next/navigation';
import { Modal, Box, Button } from '@mui/material';

export default function ApproveDenyPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [registrants, setRegistrants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [proofImage, setProofImage] = useState(null);
    const [openViewModal, setOpenViewModal] = useState(false);

    useEffect(() => {
        fetchRegistrants();

        const userChannel = supabase.channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchRegistrants(); // Refetch registrants on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(userChannel);
        };
    }, []);

    const fetchRegistrants = async () => {
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, credentials, department_assigned, short_biography, user_type, approval_status") // Adjust the columns to match your table schema
            .in("user_type", ["counselor", "secretary"]);

        console.log("Fetched registrants:", data);
        if (error) {
            console.error("Fetch registrants error:", error.message, error.details, error.hint);
        } else {
            setRegistrants(data || []);
        }
    };

    const handleApprove = async (id) => {
        console.log(`Approved registrant with ID: ${id}`);

        const { data, error } = await supabase
            .from('users')
            .update({ approval_status: 'approved' })
            .eq('user_id', id)
            .select(); // Ensure updated rows are returned

        if (error) {
            console.error("Error approving registrant:", error.message, error.details, error.hint);
        } else {
            console.log("Registrant approved:", data);
            // No need to call fetchRegistrants() here as real-time updates will handle it
        }

    };

    const handleDeny = async (id) => {
        console.log(`Denied registrant with ID: ${id}`);

        const { data, error } = await supabase
            .from('users')
            .update({ approval_status: 'denied' })
            .eq('user_id', id) // Update the approval status for the selected user
            .select(); // Ensure updated rows are returned

        if (error) {
            console.error("Error denying registrant:", error.message, error.details, error.hint);
        } else {
            console.log("Registrant denied:", data);
            // No need to call fetchRegistrants() here as real-time updates will handle it
        }
    };

    const handleView = async (id) => {
        console.log(`Viewing registrant with ID: ${id}`);

        const { data, error } = await supabase
            .from('users')
            .select('proof_image_url')
            .eq('user_id', id)
            .single();

        if (error) {
            console.error("Error fetching proof image:", error.message, error.details, error.hint);
        } else {
            setSelectedUser(id);
            setProofImage(data.proof_image_url);
            setOpenViewModal(true);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    return (
        <div className="flex h-screen">
            <Sidebar handleLogout={handleLogout} />

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
                                <th className="px-4 py-2 text-left text-black">Approval Status</th>
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
                                    <td className="px-4 py-2">{registrant.approval_status}</td>
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
                                        <button
                                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                            onClick={() => handleView(registrant.user_id)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            <Modal open={openViewModal} onClose={() => setOpenViewModal(false)}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        p: 4,
                        width: 400,
                    }}
                >
                    <h2 className="mb-4 text-lg font-bold">Proof Image</h2>
                    {proofImage ? (
                        <img src={proofImage} alt="Proof" className="w-full h-auto" />
                    ) : (
                        <p>No proof image available.</p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button variant="contained" onClick={() => setOpenViewModal(false)}>
                            Close
                        </Button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}
