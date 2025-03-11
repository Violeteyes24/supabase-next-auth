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
    const [loading, setLoading] = useState(true);
    const [openProfileModal, setOpenProfileModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [openImageModal, setOpenImageModal] = useState(false);

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
        setLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, credentials, department_assigned, short_biography, user_type, approval_status, profile_image_url") // added profile_image_url
            .in("user_type", ["counselor", "secretary"])
            .not("is_director", "eq", true);

        console.log("Fetched registrants:", data);
        if (error) {
            console.error("Fetch registrants error:", error.message, error.details, error.hint);
        } else {
            setRegistrants(data || []);
        }
        setLoading(false);
    };

    const handleApprove = async (id) => {
        const { data, error } = await supabase
            .from('users')
            .update({ approval_status: 'approved' })
            .eq('user_id', id)
            .select();

        if (error) {
            console.error("Error approving registrant:", error.message, error.details, error.hint);
        } else {
            console.log("Registrant approved:", data);
        }
    };

    const handleDeny = async (id) => {
        const { data, error } = await supabase
            .from('users')
            .update({ approval_status: 'denied' })
            .eq('user_id', id)
            .select();

        if (error) {
            console.error("Error denying registrant:", error.message, error.details, error.hint);
        } else {
            console.log("Registrant denied:", data);
        }
    };

    const handleView = async (id) => {
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

    const handleProfileClick = (registrant) => {
        setSelectedProfile(registrant);
        setOpenProfileModal(true);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    // Function to get status badge styling
    const getStatusBadgeClass = (status) => {
        switch(status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'denied':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar handleLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-gray-800 ml-20 p-8 overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-emerald-700">Registrant Approval</h1>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <span className="text-sm text-gray-500">Total Registrants: {registrants.length}</span>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-white rounded-xl shadow-md p-6 flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Pending Registrants</h2>
                        <p className="text-gray-500 text-sm">Approve or deny account requests from counselors and secretaries</p>
                    </div>

                    {/* Table Container with Shadow */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 flex-1 flex flex-col">
                        {/* Table Header */}
                        <div className="overflow-x-auto flex-1">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Picture</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credentials</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biography</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                Loading registrants...
                                            </td>
                                        </tr>
                                    ) : registrants.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                No registrants found
                                            </td>
                                        </tr>
                                    ) : (
                                        registrants.map((registrant) => (
                                            <tr key={registrant.user_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <img
                                                        src={registrant.profile_image_url || "https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"} // use profile_image_url if exists, else use placeholder
                                                        alt="Profile"
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                                                        onClick={() => handleProfileClick(registrant)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <span onClick={() => handleProfileClick(registrant)} className="hover:underline cursor-pointer">
                                                        {registrant.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{registrant.user_type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{registrant.credentials}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{registrant.short_biography}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{registrant.department_assigned}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(registrant.approval_status)}`}>
                                                        {registrant.approval_status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleApprove(registrant.user_id)}
                                                            disabled={registrant.approval_status === 'approved'}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleDeny(registrant.user_id)}
                                                            disabled={registrant.approval_status === 'denied'}
                                                        >
                                                            Deny
                                                        </button>
                                                        <button
                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleView(registrant.user_id)}
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced View Modal */}
            <Modal 
                open={openViewModal} 
                onClose={() => setOpenViewModal(false)}
                aria-labelledby="proof-image-modal"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'white',
                        borderRadius: '8px',
                        boxShadow: 24,
                        p: 4,
                        width: 500,
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}
                >
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Verification Document</h2>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {proofImage ? (
                            <img src={proofImage} alt="Proof" className="w-full h-auto" />
                        ) : (
                            <div className="p-8 text-center text-gray-500 bg-gray-50">
                                <p>No verification document available.</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <Button 
                            variant="outlined" 
                            onClick={() => setOpenViewModal(false)}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Close
                        </Button>
                        {selectedUser && proofImage && (
                            <>
                                <Button 
                                    variant="contained" 
                                    onClick={() => {
                                        handleApprove(selectedUser);
                                        setOpenViewModal(false);
                                    }}
                                    sx={{
                                        bgcolor: '#10b981',
                                        '&:hover': {
                                            bgcolor: '#059669'
                                        }
                                    }}
                                >
                                    Approve
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={() => {
                                        handleDeny(selectedUser);
                                        setOpenViewModal(false);
                                    }}
                                    sx={{
                                        bgcolor: '#ef4444',
                                        '&:hover': {
                                            bgcolor: '#dc2626'
                                        }
                                    }}
                                >
                                    Deny
                                </Button>
                            </>
                        )}
                    </div>
                </Box>
            </Modal>

            {/* New Profile Modal */}
            <Modal 
                open={openProfileModal} 
                onClose={() => setOpenProfileModal(false)}
                aria-labelledby="profile-modal"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'white',
                        borderRadius: '8px',
                        boxShadow: 24,
                        p: 4,
                        width: 500,
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}
                >
                    {selectedProfile && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {/* Make the profile picture clickable to expand */}
                                <img
                                    src={selectedProfile.profile_image_url || "https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full object-cover border border-gray-200 cursor-pointer"
                                    onClick={() => setOpenImageModal(true)}
                                />
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{selectedProfile.name}</h2>
                                    <p className="text-sm text-gray-600 capitalize">{selectedProfile.user_type}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">Credentials</h3>
                                <p className="text-gray-800">{selectedProfile.credentials}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">Biography</h3>
                                <p className="text-gray-800">{selectedProfile.short_biography}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">Department</h3>
                                <p className="text-gray-800">{selectedProfile.department_assigned}</p>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button 
                                    variant="outlined" 
                                    onClick={() => setOpenProfileModal(false)}
                                    sx={{
                                        borderColor: '#d1d5db',
                                        color: '#4b5563'
                                    }}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </Box>
            </Modal>

            {/* New Image Modal for enlarged profile picture */}
            <Modal 
                open={openImageModal} 
                onClose={() => setOpenImageModal(false)}
                aria-labelledby="enlarged-image-modal"
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'white',
                        borderRadius: '8px',
                        boxShadow: 24,
                        p: 4,
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}
                >
                    {selectedProfile && (
                        <img
                            src={selectedProfile.profile_image_url || "https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"}
                            alt="Enlarged Profile"
                            className="w-full h-auto"
                        />
                    )}
                    <div className="flex justify-end mt-4">
                        <Button 
                            variant="outlined" 
                            onClick={() => setOpenImageModal(false)}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Close
                        </Button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}