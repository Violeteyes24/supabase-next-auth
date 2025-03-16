// Import necessary dependencies
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from 'next/navigation';
import { Modal, Box, Button, FormControl, InputLabel, Select, MenuItem, Typography, Snackbar, Alert } from '@mui/material';

export default function ApproveDenyPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [registrants, setRegistrants] = useState([]);
    const [filteredRegistrants, setFilteredRegistrants] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [proofImage, setProofImage] = useState(null);
    const [openViewModal, setOpenViewModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [openProfileModal, setOpenProfileModal] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [openImageModal, setOpenImageModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserType, setSelectedUserType] = useState('all');
    // New state variables for secretary assignments
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [availableSecretaries, setAvailableSecretaries] = useState([]);
    const [availableCounselors, setAvailableCounselors] = useState([]);
    const [selectedSecretary, setSelectedSecretary] = useState('');
    const [selectedCounselor, setSelectedCounselor] = useState('');
    const [currentCounselor, setCurrentCounselor] = useState(null);
    const [counselorAssignments, setCounselorAssignments] = useState({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        fetchRegistrants();
        fetchCurrentUser();

        const userChannel = supabase.channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchRegistrants(); // Refetch registrants on any change
            })
            .subscribe();

        const assignmentChannel = supabase.channel('assignment-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'secretary_assignments' }, () => {
                fetchSecretaryAssignments(); // Refetch assignments on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(userChannel);
            supabase.removeChannel(assignmentChannel);
        };
    }, []);

    // Effect for filtering registrants based on search and user type
    useEffect(() => {
        if (!registrants.length) {
            setFilteredRegistrants([]);
            return;
        }

        let filtered = [...registrants];
        
        // Filter by user type if not "all"
        if (selectedUserType !== 'all') {
            filtered = filtered.filter(reg => reg.user_type === selectedUserType);
        }
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(reg => 
                reg.name?.toLowerCase().includes(term) || 
                reg.credentials?.toLowerCase().includes(term) || 
                reg.department_assigned?.toLowerCase().includes(term) ||
                reg.short_biography?.toLowerCase().includes(term)
            );
        }
        
        setFilteredRegistrants(filtered);
    }, [registrants, searchTerm, selectedUserType]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', user.id)
                .single();
                
            if (data) {
                setCurrentUser(data);
                // We now fetch all assignments regardless of user type
                fetchSecretaryAssignments();
            }
        }
    };

    const fetchSecretaryAssignments = async () => {
        // Instead of filtering by current user, get all assignments
        const { data, error } = await supabase
            .from('secretary_assignments')
            .select('*, secretary:secretary_id(user_id, name), counselor:counselor_id(user_id, name)');
                
        if (error) {
            console.error("Error fetching secretary assignments:", error);
        } else {
            // Create a map of counselor ID to assigned secretaries
            const assignmentsMap = {};
            
            for (const assignment of data || []) {
                if (!assignmentsMap[assignment.counselor_id]) {
                    assignmentsMap[assignment.counselor_id] = [];
                }
                assignmentsMap[assignment.counselor_id].push(assignment);
            }
            
            setCounselorAssignments(assignmentsMap);
        }
    };

    const fetchRegistrants = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name, credentials, department_assigned, short_biography, user_type, approval_status, profile_image_url")
            .in("user_type", ["counselor", "secretary", "student"])
            .not("is_director", "eq", true);

        console.log("Fetched registrants:", data);
        if (error) {
            console.error("Fetch registrants error:", error.message, error.details, error.hint);
        } else {
            setRegistrants(data || []);
            setFilteredRegistrants(data || []);
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

    const handleAssignSecretary = async () => {
        // Reset selections
        setSelectedCounselor('');
        setSelectedSecretary('');
        
        // Fetch available counselors (approved counselors)
        const { data: counselors, error: counselorError } = await supabase
            .from("users")
            .select("user_id, name")
            .eq("user_type", "counselor")
            .eq("approval_status", "approved");
            
        if (counselorError) {
            console.error("Error fetching counselors:", counselorError);
            showSnackbar("Failed to load counselors", "error");
            return;
        }
        
        setAvailableCounselors(counselors || []);
        
        // Fetch available secretaries (approved secretaries)
        const { data: secretaries, error: secretariesError } = await supabase
            .from("users")
            .select("user_id, name")
            .eq("user_type", "secretary")
            .eq("approval_status", "approved");
            
        if (secretariesError) {
            console.error("Error fetching secretaries:", secretariesError);
            showSnackbar("Failed to load secretaries", "error");
            return;
        }
        
        setAvailableSecretaries(secretaries || []);
        setOpenAssignModal(true);
    };

    const handleAssignmentSubmit = async () => {
        if (!selectedSecretary || !selectedCounselor) {
            showSnackbar("Please select both a counselor and a secretary", "error");
            return;
        }
        
        // Check if this secretary is already assigned to this counselor
        const { data: existingAssignments, error: checkError } = await supabase
            .from('secretary_assignments')
            .select('*')
            .eq('counselor_id', selectedCounselor)
            .eq('secretary_id', selectedSecretary);
            
        if (checkError) {
            console.error("Error checking existing assignments:", checkError);
            showSnackbar("Error checking existing assignments", "error");
            return;
        }
        
        if (existingAssignments && existingAssignments.length > 0) {
            showSnackbar("This secretary is already assigned to this counselor", "warning");
            return;
        }
        
        // Create the new assignment
        const { data, error } = await supabase
            .from('secretary_assignments')
            .insert([
                { 
                    counselor_id: selectedCounselor,
                    secretary_id: selectedSecretary
                }
            ]);
            
        if (error) {
            console.error("Error assigning secretary:", error);
            showSnackbar("Failed to assign secretary", "error");
        } else {
            showSnackbar("Secretary assigned successfully", "success");
            fetchSecretaryAssignments(); // Refresh the assignments
            setOpenAssignModal(false);
            setSelectedSecretary('');
            setSelectedCounselor('');
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        const { error } = await supabase
            .from('secretary_assignments')
            .delete()
            .eq('sec_assignment_id', assignmentId);
            
        if (error) {
            console.error("Error removing assignment:", error);
            showSnackbar("Failed to remove secretary assignment", "error");
        } else {
            showSnackbar("Secretary assignment removed", "success");
            fetchSecretaryAssignments(); // Refresh the assignments
        }
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
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

    // Check if the current user is a counselor
    const isCurrentUserCounselor = currentUser?.user_type === 'counselor';

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar handleLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-gray-800 ml-20 p-8 overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-emerald-700">Registrant Approval</h1>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <span className="text-sm text-gray-500">Total Registrants: {filteredRegistrants.length}</span>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-white rounded-xl shadow-md p-6 flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Pending Registrants</h2>
                        <p className="text-gray-500 text-sm">Approve or deny account requests from counselors, secretaries, and students</p>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-grow max-w-md">
                            <input
                                type="text"
                                placeholder="Search by name, credentials, etc..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <select
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                value={selectedUserType}
                                onChange={(e) => setSelectedUserType(e.target.value)}
                            >
                                <option value="all">All User Types</option>
                                <option value="counselor">Counselors</option>
                                <option value="secretary">Secretaries</option>
                                <option value="student">Students</option>
                            </select>
                        </div>
                        {(searchTerm || selectedUserType !== 'all') && (
                            <button
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedUserType('all');
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
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
                                    ) : filteredRegistrants.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {searchTerm || selectedUserType !== 'all' 
                                                    ? "No matching registrants found" 
                                                    : "No registrants found"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRegistrants.map((registrant) => (
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

                {/* Secretary Assignments Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">Secretary Assignments</h2>
                        <button
                            onClick={handleAssignSecretary}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium"
                        >
                            Assign New Secretary
                        </button>
                    </div>
                    
                    {Object.keys(counselorAssignments).length === 0 ? (
                        <p className="text-gray-500 text-sm mt-4">No secretary assignments found.</p>
                    ) : (
                        <div className="mt-4">
                            {Object.entries(counselorAssignments).map(([counselorId, assignments]) => {
                                const counselorName = assignments[0]?.counselor?.name || "Unknown Counselor";
                                return (
                                    <div key={counselorId} className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                                            {counselorName}'s Secretaries
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {assignments.map((assignment) => (
                                                <div key={assignment.sec_assignment_id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center">
                                                            <span className="text-lg font-semibold">{assignment.secretary?.name?.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{assignment.secretary?.name}</p>
                                                            <p className="text-xs text-gray-500">Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveAssignment(assignment.sec_assignment_id)}
                                                        className="text-red-500 hover:text-red-700 text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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

            {/* New Secretary Assignment Modal */}
            <Modal
                open={openAssignModal}
                onClose={() => setOpenAssignModal(false)}
                aria-labelledby="assign-secretary-modal"
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
                        maxWidth: '90vw'
                    }}
                >
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Assign Secretary</h2>
                    
                    <p className="text-gray-600 mb-4">
                        Select a counselor and a secretary to assign. The secretary will be responsible for managing the counselor's appointments and schedules.
                    </p>

                    {/* Counselor Selection */}
                    <FormControl fullWidth variant="outlined" className="mb-4">
                        <InputLabel id="counselor-select-label">Counselor</InputLabel>
                        <Select
                            labelId="counselor-select-label"
                            value={selectedCounselor}
                            onChange={(e) => setSelectedCounselor(e.target.value)}
                            label="Counselor"
                        >
                            <MenuItem value="">
                                <em>Select a counselor</em>
                            </MenuItem>
                            {availableCounselors.map((counselor) => (
                                <MenuItem key={counselor.user_id} value={counselor.user_id}>
                                    {counselor.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Secretary Selection */}
                    {availableSecretaries.length === 0 ? (
                        <div className="text-center p-4 bg-gray-50 rounded-lg mb-4">
                            <p className="text-gray-500">No available secretaries found.</p>
                            <p className="text-sm text-gray-400 mt-1">Secretaries must be approved before they can be assigned.</p>
                        </div>
                    ) : (
                        <FormControl fullWidth variant="outlined" className="mb-4">
                            <InputLabel id="secretary-select-label">Secretary</InputLabel>
                            <Select
                                labelId="secretary-select-label"
                                value={selectedSecretary}
                                onChange={(e) => setSelectedSecretary(e.target.value)}
                                label="Secretary"
                            >
                                <MenuItem value="">
                                    <em>Select a secretary</em>
                                </MenuItem>
                                {availableSecretaries.map((secretary) => (
                                    <MenuItem key={secretary.user_id} value={secretary.user_id}>
                                        {secretary.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                            variant="outlined" 
                            onClick={() => setOpenAssignModal(false)}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleAssignmentSubmit}
                            disabled={!selectedSecretary || !selectedCounselor || availableSecretaries.length === 0}
                            sx={{
                                bgcolor: '#8b5cf6',
                                '&:hover': {
                                    bgcolor: '#7c3aed'
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#e5e7eb',
                                    color: '#9ca3af'
                                }
                            }}
                        >
                            Assign
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Snackbar for notifications */}
            <Snackbar 
                open={snackbarOpen} 
                autoHideDuration={6000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}