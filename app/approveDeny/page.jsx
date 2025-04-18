// Import necessary dependencies
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from 'next/navigation';
import { Modal, Box, Button, FormControl, InputLabel, Select, MenuItem, Typography, Snackbar, Alert, Skeleton, Paper, Divider, Grid } from '@mui/material';
import { CheckCircle, Cancel } from "@mui/icons-material";

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
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
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
    const [counselors, setCounselors] = useState([]);
    // New state for status conflict modal
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusModalMessage, setStatusModalMessage] = useState('');
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [statusHistory, setStatusHistory] = useState([]);
    const [historyUser, setHistoryUser] = useState(null);
    // New state for creating a director
    const [openDirectorModal, setOpenDirectorModal] = useState(false);
    const [directorForm, setDirectorForm] = useState({
        email: '',
        password: '',
        name: '',
        username: '',
        department_assigned: 'COECS',
        contact_number: '',
        gender: 'Male',
        birthday: '',
    });
    const [directorFormErrors, setDirectorFormErrors] = useState({});
    // Add state for director creation password verification modal
    const [directorPasswordModal, setDirectorPasswordModal] = useState({
        open: false,
        password: '',
        errorMessage: '',
    });
    // Password confirmation for sensitive actions
    const [confirmPasswordModal, setConfirmPasswordModal] = useState({
        open: false,
        password: '',
        actionType: '', // 'approve', 'deny', 'createDirector'
        userId: null, // For approve/deny actions
        errorMessage: '',
    });
    // New state for counselor department assignment
    const [openDepartmentModal, setOpenDepartmentModal] = useState(false);
    const [selectedCounselorForDept, setSelectedCounselorForDept] = useState(null);
    const [selectedDepartmentForCounselor, setSelectedDepartmentForCounselor] = useState('');
    const [counselorsList, setCounselorsList] = useState([]);
    const [departmentOptions] = useState([
        'COECS', 'COED', 'COL', 'CAS', 'CBA', 'CCJE', 'SHTM'
    ]);

    // Log initial state and after first render
    useEffect(() => {
        console.log("Component mounted - Initial state:", {
            registrantsLength: registrants.length,
            filteredRegistrantsLength: filteredRegistrants.length
        });
        
        // This will run once after component mounts
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    // Fetch registrants
                    const { data: registrantsData, error: registrantsError } = await supabase
                        .from("users")
                        .select("*")
                        .neq("is_director", true)
                        // .eq("status", "pending");
                        
                    if (registrantsError) throw registrantsError;
                        
                    // Fetch counselors
                    const { data: counselorsData, error: counselorsError } = await supabase
                        .from("users")
                        .select("*")
                        .eq("user_type", "counselor");
                        
                    if (counselorsError) throw counselorsError;
                    
                    setRegistrants(registrantsData || []);
                    setFilteredRegistrants(registrantsData || []);
                    setCounselors(counselorsData || []);
                    setCounselorsList(counselorsData || []); // Set the counselors list
                    setLoading(false);
                    fetchCurrentUser();
                    fetchSecretaryAssignments();
                }
            } catch (error) {
                console.error("Error fetching data:", error.message);
                setLoading(false);
            }
        };

        fetchData();
        
        // Subscribe to real-time changes in users table
        const usersSubscription = supabase
            .channel("users-changes")
            .on("postgres_changes", 
                { event: "*", schema: "public", table: "users" },
                () => fetchData()
            )
            .subscribe();
            
        // Subscribe to real-time changes in assignments table
        const assignmentsSubscription = supabase
            .channel("assignments-changes")
            .on("postgres_changes", 
                { event: "*", schema: "public", table: "assignments" },
                () => fetchData()
            )
            .subscribe();
            
        return () => {
            usersSubscription.unsubscribe();
            assignmentsSubscription.unsubscribe();
        };
    }, [supabase]);

    // Effect for filtering registrants based on search and user type
    useEffect(() => {
        console.log("Filter effect running with:", { 
            registrantsLength: registrants.length, 
            searchTerm, 
            selectedUserType,
            selectedDepartment,
            selectedStatus
        });
        
        if (!registrants.length) {
            setFilteredRegistrants([]);
            return;
        }

        let filtered = [...registrants];
        
        // Filter by user type if not "all"
        if (selectedUserType !== 'all') {
            filtered = filtered.filter(reg => reg.user_type === selectedUserType);
            console.log("After user type filter:", filtered.length);
        }
        
        // Filter by department if not "all"
        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(reg => reg.department_assigned === selectedDepartment);
            console.log("After department filter:", filtered.length);
        }
        
        // Filter by status if not "all"
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(reg => reg.approval_status === selectedStatus);
            console.log("After status filter:", filtered.length);
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
            console.log("After search term filter:", filtered.length);
        }
        
        setFilteredRegistrants(filtered);
        console.log("Final filtered registrants:", filtered.length);
    }, [registrants, searchTerm, selectedUserType, selectedDepartment, selectedStatus]);

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
        console.log("fetchSecretaryAssignments function called");
        
        // Instead of filtering by current user, get all assignments
        try {
            console.log("About to query secretary_assignments table");
            
            const { data, error } = await supabase
                .from('secretary_assignments')
                .select('*, secretary:secretary_id(user_id, name), counselor:counselor_id(user_id, name)');
                
            console.log("Query completed");
            console.log("Data received:", data);
            console.log("Error:", error);
            
            if (error) {
                console.error("Error fetching secretary assignments:", error);
            } else {
                // Create a map of counselor ID to assigned secretaries
                const assignmentsMap = {};
                
                console.log("Processing assignments, count:", data?.length || 0);
                
                for (const assignment of data || []) {
                    if (!assignmentsMap[assignment.counselor_id]) {
                        assignmentsMap[assignment.counselor_id] = [];
                    }
                    assignmentsMap[assignment.counselor_id].push(assignment);
                }
                
                console.log("Final processed assignments map:", assignmentsMap);
                setCounselorAssignments(assignmentsMap);
            }
        } catch (e) {
            console.error("Exception in fetchSecretaryAssignments:", e);
        }
    };

    const handleApprove = async (id) => {
        // Check if already approved first
        const registrant = registrants.find(reg => reg.user_id === id);
        if (registrant && registrant.approval_status === 'approved') {
            setStatusModalMessage("This user is already approved.");
            setOpenStatusModal(true);
            return;
        }
        
        // Open password confirmation modal
        setConfirmPasswordModal({
            open: true,
            password: '',
            actionType: 'approve',
            userId: id,
            errorMessage: '',
        });
    };

    const handleDeny = async (id) => {
        // Check if already denied first
        const registrant = registrants.find(reg => reg.user_id === id);
        if (registrant && registrant.approval_status === 'denied') {
            setStatusModalMessage("This user is already denied.");
            setOpenStatusModal(true);
            return;
        }
        
        // Open password confirmation modal
        setConfirmPasswordModal({
            open: true,
            password: '',
            actionType: 'deny',
            userId: id,
            errorMessage: '',
        });
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

    // Function to get all available departments from registrants
    const getUniqueDepartments = () => {
        const departments = registrants
            .map(reg => reg.department_assigned)
            .filter(dept => dept) // Remove null/undefined values
            .filter((dept, index, self) => self.indexOf(dept) === index) // Get unique values
            .sort(); // Sort alphabetically
            
        return departments;
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

    // Loading skeleton component with shimmer effect
    const ApproveDenySkeleton = () => (
        <div className="flex h-screen bg-gray-100">
            <div className="w-64 bg-gray-800" /> {/* Sidebar placeholder */}
            <div className="flex-1 p-6 relative overflow-hidden">
                {/* Shimmer overlay */}
                <Box 
                    sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
                        animation: 'shimmer 2s infinite',
                        '@keyframes shimmer': {
                            '0%': { transform: 'translateX(-100%)' },
                            '100%': { transform: 'translateX(100%)' }
                        },
                        zIndex: 10
                    }}
                />
                
                {/* Header */}
                <div className="mb-6">
                    <Skeleton variant="text" width={300} height={40} />
                    <Skeleton variant="text" width={200} height={24} sx={{ mt: 1 }} />
                </div>
                
                {/* Search and filter */}
                <div className="mb-6 flex">
                    <Skeleton variant="rectangular" width={250} height={56} sx={{ borderRadius: 1, mr: 2 }} />
                    <Skeleton variant="rectangular" width={250} height={56} sx={{ borderRadius: 1 }} />
                </div>
                
                {/* Table */}
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: '4px 4px 0 0' }} />
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" width="100%" height={52} />
                ))}
            </div>
        </div>
    );

    // New function to view status history
    const handleViewHistory = async (id, name) => {
        try {
            const { data, error } = await supabase
                .from('status_history')
                .select('*')
                .eq('user_id', id)
                .order('timestamp', { ascending: false });
                
            if (error) {
                console.error("Error fetching status history:", error);
                showSnackbar("Failed to load status history", "error");
            } else {
                setStatusHistory(data || []);
                setHistoryUser({id, name});
                setOpenHistoryModal(true);
            }
        } catch (err) {
            console.error("Unexpected error in handleViewHistory:", err);
            showSnackbar("An error occurred while loading history", "error");
        }
    };

    // Handle director form change
    const handleDirectorFormChange = (e) => {
        const { name, value } = e.target;
        setDirectorForm(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field if it exists
        if (directorFormErrors[name]) {
            setDirectorFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validate director form
    const validateDirectorForm = () => {
        const errors = {};
        
        // Validate email
        if (!directorForm.email) {
            errors.email = 'Email is required';
        } else if (!directorForm.email.includes('@')) {
            errors.email = 'Please enter a valid email';
        // } else if (!directorForm.email.endsWith('@hnu.edu.ph')) {
        //     errors.email = 'Email must be an HNU email address (@hnu.edu.ph)';
        }
        
        // Validate password
        if (!directorForm.password) {
            errors.password = 'Password is required';
        } else if (directorForm.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        // Validate name
        if (!directorForm.name) {
            errors.name = 'Name is required';
        }
        
        // Validate username
        if (!directorForm.username) {
            errors.username = 'Username is required';
        }
        
        // Validate contact number
        if (!directorForm.contact_number) {
            errors.contact_number = 'Contact number is required';
        } else if (!/^\d{10,11}$/.test(directorForm.contact_number.replace(/[^0-9]/g, ''))) {
            errors.contact_number = 'Contact number must be 10-11 digits';
        }
        
        // Validate birthday
        if (!directorForm.birthday) {
            errors.birthday = 'Birthday is required';
        } else {
            const birthDate = new Date(directorForm.birthday);
            const today = new Date();
            
            // Check if birth date is in the future
            if (birthDate > today) {
                errors.birthday = 'Birthday cannot be in the future';
            } else {
                // Check if at least 18 years old
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    // Not yet had birthday this year
                    if (age - 1 < 18) {
                        errors.birthday = 'Director must be at least 18 years old';
                    }
                } else {
                    // Had birthday this year already
                    if (age < 18) {
                        errors.birthday = 'Director must be at least 18 years old';
                    }
                }
            }
        }
        
        setDirectorFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle "Create Director" button click - show password verification modal first
    const handleCreateDirectorClick = () => {
        setDirectorPasswordModal({
            open: true,
            password: '',
            errorMessage: '',
        });
    };

    // Handle verification for director creation
    const handleDirectorPasswordVerify = async () => {
        if (!directorPasswordModal.password) {
            setDirectorPasswordModal(prev => ({
                ...prev,
                errorMessage: 'Please enter your password',
            }));
            return;
        }

        try {
            // Get current user email
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user || !user.email) {
                setDirectorPasswordModal(prev => ({
                    ...prev,
                    errorMessage: 'Could not retrieve current user information',
                }));
                return;
            }
            
            // Verify password
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: directorPasswordModal.password,
            });
            
            if (error) {
                setDirectorPasswordModal(prev => ({
                    ...prev,
                    errorMessage: 'Invalid password. Please try again.',
                }));
                return;
            }
            
            // Password is correct, close password modal and open director form modal
            setDirectorPasswordModal({
                open: false,
                password: '',
                errorMessage: '',
            });
            
            // Open the director creation form modal
            setOpenDirectorModal(true);
            
        } catch (error) {
            console.error('Error verifying password:', error);
            setDirectorPasswordModal(prev => ({
                ...prev,
                errorMessage: 'An error occurred. Please try again.',
            }));
        }
    };

    // Create director
    const handleCreateDirector = async () => {
        if (!validateDirectorForm()) {
            return;
        }
        
        // Proceed with director creation
        await executeCreateDirector();
    };

    // Execute director creation after password confirmation
    const executeCreateDirector = async () => {
        try {
            // First create the auth user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: directorForm.email,
                password: directorForm.password,
            });
            
            if (signUpError) {
                console.error('Error creating director auth:', signUpError);
                showSnackbar(signUpError.message, 'error');
                return;
            }
            
            if (!signUpData.user) {
                showSnackbar('Failed to create director account', 'error');
                return;
            }
            
            // Create the user profile with director flag
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        user_id: signUpData.user.id,
                        user_type: 'counselor', // Directors are typically counselors with special privileges
                        approval_status: 'approved', // Auto-approve directors
                        is_director: true,
                        name: directorForm.name,
                        username: directorForm.username,
                        department_assigned: directorForm.department_assigned,
                        gender: directorForm.gender,
                        contact_number: directorForm.contact_number,
                        birthday: directorForm.birthday,
                        // Set default values for required fields
                        address: 'HNU Campus',
                        short_biography: 'System Director',
                        credentials: 'System Director',
                    },
                ]);
                
            if (insertError) {
                console.error('Error creating director profile:', insertError);
                showSnackbar('Failed to create director profile', 'error');
                return;
            }
            
            showSnackbar('Director created successfully', 'success');
            setOpenDirectorModal(false);
            setDirectorForm({
                email: '',
                password: '',
                name: '',
                username: '',
                department_assigned: 'COECS',
                contact_number: '',
                gender: 'Male',
                birthday: '',
            });
        } catch (error) {
            console.error('Unexpected error creating director:', error);
            showSnackbar('An unexpected error occurred', 'error');
        }
    };

    // Execute approve after password confirmation
    const executeApprove = async (id) => {
        try {
            // Optimistically update UI first
            setRegistrants(prev => 
                prev.map(reg => 
                    reg.user_id === id ? {...reg, approval_status: 'approved'} : reg
                )
            );
            
            const timestamp = new Date().toISOString();
            
            // Update user status
            const { data, error } = await supabase
                .from('users')
                .update({ 
                    approval_status: 'approved',
                    approved_at: timestamp,
                    approved_by: currentUser?.user_id
                })
                .eq('user_id', id)
                .select();

            if (error) {
                console.error("Error approving registrant:", error.message, error.details, error.hint);
                // Revert the optimistic update on error
                fetchRegistrants();
            } else {
                console.log("Registrant approved:", data);
                
                // Create status history record
                const { error: historyError } = await supabase
                    .from('status_history')
                    .insert({
                        user_id: id,
                        status: 'approved',
                        changed_by: currentUser?.user_id,
                        changed_by_name: currentUser?.name,
                        timestamp: timestamp
                    });
                
                if (historyError) {
                    console.error("Error recording approval history:", historyError);
                }
                
                // Send approval email
                try {
                    // Call the approval email function with just the user ID
                    const response = await fetch('/api/send-approval-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: id
                        }),
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to send approval email');
                    }
                    
                    showSnackbar("User approved and notification email sent", "success");
                } catch (emailError) {
                    console.error("Error sending approval email:", emailError);
                    showSnackbar("User approved but failed to send email", "warning");
                }
            }
        } catch (err) {
            console.error("Unexpected error in handleApprove:", err);
            fetchRegistrants(); // Revert on unexpected error
        }
    };

    // Execute deny after password confirmation
    const executeDeny = async (id) => {
        try {
            // Optimistically update UI first
            setRegistrants(prev => 
                prev.map(reg => 
                    reg.user_id === id ? {...reg, approval_status: 'denied'} : reg
                )
            );
            
            const timestamp = new Date().toISOString();
            
            // Update user status
            const { data, error } = await supabase
                .from('users')
                .update({ 
                    approval_status: 'denied',
                    denied_at: timestamp,
                    denied_by: currentUser?.user_id
                })
                .eq('user_id', id)
                .select();

            if (error) {
                console.error("Error denying registrant:", error.message, error.details, error.hint);
                // Revert the optimistic update on error
                fetchRegistrants();
            } else {
                console.log("Registrant denied:", data);
                
                // Create status history record
                const { error: historyError } = await supabase
                    .from('status_history')
                    .insert({
                        user_id: id,
                        status: 'denied',
                        changed_by: currentUser?.user_id,
                        changed_by_name: currentUser?.name,
                        timestamp: timestamp
                    });
                
                if (historyError) {
                    console.error("Error recording denial history:", historyError);
                }
                
                // Send denial email
                try {
                    // Call the denial email function with just the user ID
                    const response = await fetch('/api/send-denial-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: id
                        }),
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to send denial email');
                    }
                    
                    showSnackbar("User denied and notification email sent", "success");
                } catch (emailError) {
                    console.error("Error sending denial email:", emailError);
                    showSnackbar("User denied but failed to send email", "warning");
                }
            }
        } catch (err) {
            console.error("Unexpected error in handleDeny:", err);
            fetchRegistrants(); // Revert on unexpected error
        }
    };

    // Handle password confirmation for approve/deny actions
    const handleConfirmPassword = async () => {
        // Store current search term to restore it later
        const currentSearchTerm = searchTerm;
        
        try {
            // Verify current user's password
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user || !user.email) {
                setConfirmPasswordModal(prev => ({
                    ...prev,
                    errorMessage: 'Could not retrieve current user information.',
                }));
                return;
            }
            
            // Use the actual email from the authenticated user
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: confirmPasswordModal.password,
            });
            
            if (error) {
                setConfirmPasswordModal(prev => ({
                    ...prev,
                    errorMessage: 'Invalid password. Please try again.',
                }));
                return;
            }
            
            // Password is correct, proceed with the action
            switch(confirmPasswordModal.actionType) {
                case 'approve':
                    await executeApprove(confirmPasswordModal.userId);
                    break;
                case 'deny':
                    await executeDeny(confirmPasswordModal.userId);
                    break;
                default:
                    break;
            }
            
            // Close confirmation modal
            setConfirmPasswordModal({
                open: false,
                password: '',
                actionType: '',
                userId: null,
                errorMessage: '',
            });
            
        } catch (error) {
            console.error('Error confirming password:', error);
            setConfirmPasswordModal(prev => ({
                ...prev,
                errorMessage: 'An error occurred. Please try again.',
            }));
        } finally {
            // Restore the search term in case it was changed during the auth process
            if (searchTerm !== currentSearchTerm) {
                setSearchTerm(currentSearchTerm);
            }
        }
    };

    // Function to handle assigning departments to counselors
    const handleAssignDepartment = (counselor) => {
        if (!currentUser?.is_director) {
            showSnackbar("Only directors can assign departments to counselors", "error");
            return;
        }
        
        setSelectedCounselorForDept(counselor);
        setSelectedDepartmentForCounselor(counselor.department_assigned || '');
        setOpenDepartmentModal(true);
    };

    // Function to submit department assignment
    const handleDepartmentSubmit = async () => {
        if (!selectedCounselorForDept || !selectedDepartmentForCounselor) {
            showSnackbar("Please select a department", "error");
            return;
        }

        try {
            const { error } = await supabase
                .from('users')
                .update({ department_assigned: selectedDepartmentForCounselor })
                .eq('user_id', selectedCounselorForDept.user_id);

            if (error) {
                console.error("Error assigning department:", error);
                showSnackbar("Failed to assign department", "error");
            } else {
                showSnackbar("Department assigned successfully", "success");
                
                // Update local state
                setCounselorsList(prev => prev.map(c => 
                    c.user_id === selectedCounselorForDept.user_id 
                        ? {...c, department_assigned: selectedDepartmentForCounselor} 
                        : c
                ));
                
                setOpenDepartmentModal(false);
            }
        } catch (err) {
            console.error("Unexpected error in handleDepartmentSubmit:", err);
            showSnackbar("An error occurred", "error");
        }
    };

    if (loading) {
        return <ApproveDenySkeleton />;
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar handleLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col text-gray-800 ml-20 p-8 overflow-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-emerald-700">Registrant Approval</h1>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <span className="text-sm text-gray-500">Total Registrants: {filteredRegistrants.length}</span>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-white rounded-xl shadow-md p-6 flex-1 overflow-hidden flex flex-col max-h-[60vh]">
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
                        <div>
                            <select
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                            >
                                <option value="all">All Departments</option>
                                {getUniqueDepartments().map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="denied">Denied</option>
                            </select>
                        </div>
                        {(searchTerm || selectedUserType !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all') && (
                            <button
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedUserType('all');
                                    setSelectedDepartment('all');
                                    setSelectedStatus('all');
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Table Container with Shadow */}
                    <div className="overflow-auto rounded-lg border border-gray-200 flex-1">
                        {/* Table Header */}
                        <div className="overflow-auto w-full h-full">
                            <table className="min-w-full divide-y divide-gray-200 table-auto">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Picture</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">User Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Department</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                                Loading registrants...
                                            </td>
                                        </tr>
                                    ) : filteredRegistrants.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {searchTerm || selectedUserType !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all'
                                                    ? "No matching registrants found" 
                                                    : "No registrants found"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRegistrants.map((registrant, index) => (
                                            <tr key={registrant.user_id || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <img
                                                        src={registrant.profile_image_url || "https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"}
                                                        alt="Profile"
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                                                        onClick={() => handleProfileClick(registrant)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    <span onClick={() => handleProfileClick(registrant)} className="hover:underline cursor-pointer">
                                                        {registrant.name || "Unnamed"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{registrant.user_type || "Unknown"}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{registrant.department_assigned || "No Department"}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(registrant.approval_status)}`}>
                                                        {registrant.approval_status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-1">
                                                        <button
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleApprove(registrant.user_id)}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleDeny(registrant.user_id)}
                                                        >
                                                            Deny
                                                        </button>
                                                        <button
                                                            className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleView(registrant.user_id)}
                                                        >
                                                            View ID
                                                        </button>
                                                        <button
                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors duration-150 ease-in-out"
                                                            onClick={() => handleViewHistory(registrant.user_id, registrant.name)}
                                                        >
                                                            History
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
                <div className="bg-white rounded-xl shadow-md p-6 mt-8 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">Secretary Assignments</h2>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleCreateDirectorClick}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium"
                            >
                                Create Director
                            </button>
                            <button
                                onClick={handleAssignSecretary}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium"
                            >
                                Assign New Secretary
                            </button>
                        </div>
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

                {/* Counselor Department Assignments Section - Only visible to directors */}
                {currentUser?.is_director && (
                    <div className="bg-white rounded-xl shadow-md p-6 mt-8 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-700">Counselor Department Assignments</h2>
                            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                <span className="text-sm text-gray-600">Total: {counselorsList.filter(c => c.user_type === 'counselor' && !c.is_director).length}</span>
                            </div>
                        </div>
                        
                        {counselorsList.filter(c => c.user_type === 'counselor' && !c.is_director).length === 0 ? (
                            <p className="text-gray-500 text-sm mt-4">No counselors found.</p>
                        ) : (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 table-auto">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Counselor</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Department</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {counselorsList
                                            .filter(c => c.user_type === 'counselor' && !c.is_director)
                                            .map((counselor) => (
                                                <tr key={counselor.user_id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center">
                                                                <span className="text-lg font-semibold">{counselor.name?.charAt(0)}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{counselor.name}</p>
                                                                <p className="text-xs text-gray-500">{counselor.username || counselor.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {counselor.department_assigned ? (
                                                            <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-lg text-xs font-medium">
                                                                {counselor.department_assigned}
                                                            </span>
                                                        ) : (
                                                            <span className="bg-gray-100 text-gray-800 py-1 px-2 rounded-lg text-xs font-medium">
                                                                Not Assigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(counselor.approval_status)}`}>
                                                            {counselor.approval_status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => handleAssignDepartment(counselor)}
                                                            className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                                            disabled={counselor.approval_status !== 'approved'}
                                                        >
                                                            Assign Department
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
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
            
            {/* Status Conflict Modal */}
            <Modal
                open={openStatusModal}
                onClose={() => setOpenStatusModal(false)}
                aria-labelledby="status-conflict-modal"
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
                        width: 400,
                        maxWidth: '90vw'
                    }}
                >
                    <div className="flex items-center space-x-2 mb-3">
                        <Typography variant="h6" component="h2" sx={{ color: '#4b5563', fontWeight: 'bold' }}>
                            Status Update
                        </Typography>
                    </div>
                    <Divider sx={{ mb: 3 }} />
                    <Typography sx={{ mb: 3, color: 'black' }}>
                        {statusModalMessage}
                    </Typography>
                    <div className="flex justify-end">
                        <Button 
                            variant="contained" 
                            onClick={() => setOpenStatusModal(false)}
                            sx={{
                                bgcolor: '#6B7280',
                                '&:hover': { bgcolor: '#4B5563' }
                            }}
                        >
                            OK
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Status History Modal */}
            <Modal
                open={openHistoryModal}
                onClose={() => setOpenHistoryModal(false)}
                aria-labelledby="status-history-modal"
            >
                <Box 
                    sx={{ 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 600,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 24,
                        p: 4
                    }}
                >
                    <Typography id="modal-modal-title" color="black" variant="h6" component="h2" sx={{ mb: 2 }}>
                        Status History for {historyUser?.name}
                    </Typography>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    {statusHistory.length === 0 ? (
                        <Typography sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                            No status change history found for this user.
                        </Typography>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {statusHistory.map((record) => (
                                            <tr key={record.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(record.status)}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {record.changed_by_name || "Unknown"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(record.timestamp).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                            <Button 
                                onClick={() => setOpenHistoryModal(false)}
                                variant="contained"
                                sx={{ 
                                    bgcolor: 'gray.700',
                                    '&:hover': { bgcolor: 'gray.800' }
                                }}
                            >
                                Close
                            </Button>
                        </Box>
                    </Box>
                </Modal>

            {/* Password Confirmation Modal */}
            <Modal
                open={confirmPasswordModal.open}
                onClose={() => setConfirmPasswordModal(prev => ({...prev, open: false}))}
                aria-labelledby="password-confirmation-modal"
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
                        width: 400,
                        maxWidth: '90vw'
                    }}
                >
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Your Password</h2>
                    <p className="text-gray-600 mb-4">
                        For security purposes, please enter your password to confirm this action.
                    </p>
                    
                    <div className="mb-4">
                        <label className="text-black block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                        <input
                            type="password"
                            value={confirmPasswordModal.password}
                            onChange={(e) => setConfirmPasswordModal(prev => ({...prev, password: e.target.value, errorMessage: ''}))}
                            className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                        />
                        {confirmPasswordModal.errorMessage && (
                            <p className="mt-1 text-xs text-red-600">{confirmPasswordModal.errorMessage}</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button
                            variant="outlined"
                            onClick={() => setConfirmPasswordModal(prev => ({...prev, open: false}))}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirmPassword}
                            disabled={!confirmPasswordModal.password}
                            sx={{
                                bgcolor: '#3b82f6',
                                '&:hover': {
                                    bgcolor: '#2563eb'
                                },
                                '&.Mui-disabled': {
                                    bgcolor: '#e5e7eb',
                                    color: '#9ca3af'
                                }
                            }}
                        >
                            Confirm
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Director Creation Modal */}
            <Modal
                open={openDirectorModal}
                onClose={() => setOpenDirectorModal(false)}
                aria-labelledby="create-director-modal"
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Director</h2>
                    <p className="text-gray-600 mb-4">
                        Directors have full system access and can approve/deny registrations, assign secretaries, and manage system settings.
                    </p>
                    
                    <div className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={directorForm.email}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="director@example.com"
                            />
                            {directorFormErrors.email && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.email}</p>
                            )}
                        </div>
                        
                        {/* Password */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={directorForm.password}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="********"
                            />
                            {directorFormErrors.password && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.password}</p>
                            )}
                        </div>
                        
                        {/* Name */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={directorForm.name}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                            {directorFormErrors.name && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.name}</p>
                            )}
                        </div>
                        
                        {/* Username */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={directorForm.username}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="director_username"
                            />
                            {directorFormErrors.username && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.username}</p>
                            )}
                        </div>
                        
                        {/* Contact Number */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                            <input
                                type="text"
                                name="contact_number"
                                value={directorForm.contact_number}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="09123456789"
                            />
                            {directorFormErrors.contact_number && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.contact_number}</p>
                            )}
                        </div>
                        
                        {/* Department */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                                name="department_assigned"
                                value={directorForm.department_assigned}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="COECS">COECS</option>
                                <option value="COED">COED</option>
                                <option value="COL">COL</option>
                                <option value="CAS">CAS</option>
                                <option value="CBA">CBA</option>
                                <option value="CCJE">CCJE</option>
                                <option value="SHTM">SHTM</option>
                            </select>
                        </div>
                        
                        {/* Gender */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select
                                name="gender"
                                value={directorForm.gender}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        {/* Birthday */}
                        <div>
                            <label className="text-black block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                name="birthday"
                                value={directorForm.birthday}
                                onChange={handleDirectorFormChange}
                                className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                            />
                            {directorFormErrors.birthday && (
                                <p className="mt-1 text-xs text-red-600">{directorFormErrors.birthday}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button
                            variant="outlined"
                            onClick={() => setOpenDirectorModal(false)}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateDirector}
                            sx={{
                                bgcolor: '#3b82f6',
                                '&:hover': {
                                    bgcolor: '#2563eb'
                                }
                            }}
                        >
                            Create Director
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Director Password Verification Modal */}
            <Modal
                open={directorPasswordModal.open}
                onClose={() => setDirectorPasswordModal(prev => ({...prev, open: false}))}
                aria-labelledby="director-password-verification-modal"
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
                        width: 400,
                        maxWidth: '90vw'
                    }}
                >
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Authentication Required</h2>
                    <p className="text-gray-600 mb-4">
                        Please enter your password to proceed with creating a new director account.
                    </p>
                    
                    <div className="mb-4">
                        <label className="text-black block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                        <input
                            type="password"
                            value={directorPasswordModal.password}
                            onChange={(e) => setDirectorPasswordModal(prev => ({
                                ...prev, 
                                password: e.target.value,
                                errorMessage: ''
                            }))}
                            className="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your password"
                        />
                        {directorPasswordModal.errorMessage && (
                            <p className="mt-1 text-xs text-red-600">{directorPasswordModal.errorMessage}</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                        <Button
                            variant="outlined"
                            onClick={() => setDirectorPasswordModal(prev => ({...prev, open: false}))}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleDirectorPasswordVerify}
                            sx={{
                                bgcolor: '#3b82f6',
                                '&:hover': {
                                    bgcolor: '#2563eb'
                                }
                            }}
                        >
                            Verify
                        </Button>
                    </div>
                </Box>
            </Modal>

            {/* Department Assignment Modal */}
            <Modal
                open={openDepartmentModal}
                onClose={() => setOpenDepartmentModal(false)}
                aria-labelledby="department-assignment-modal"
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
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Assign Department</h2>
                    
                    {selectedCounselorForDept && (
                        <div className="mb-4">
                            <p className="text-gray-600">
                                Assign a department for <span className="font-semibold">{selectedCounselorForDept.name}</span>
                            </p>
                        </div>
                    )}

                    {/* Department Selection */}
                    <FormControl fullWidth variant="outlined" className="mb-4">
                        <InputLabel id="department-select-label">Department</InputLabel>
                        <Select
                            labelId="department-select-label"
                            value={selectedDepartmentForCounselor}
                            onChange={(e) => setSelectedDepartmentForCounselor(e.target.value)}
                            label="Department"
                        >
                            <MenuItem value="">
                                <em>Select a department</em>
                            </MenuItem>
                            {departmentOptions.map((dept) => (
                                <MenuItem key={dept} value={dept}>
                                    {dept}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                            variant="outlined" 
                            onClick={() => setOpenDepartmentModal(false)}
                            sx={{
                                borderColor: '#d1d5db',
                                color: '#4b5563'
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={handleDepartmentSubmit}
                            disabled={!selectedDepartmentForCounselor}
                            sx={{
                                bgcolor: '#14b8a6',
                                '&:hover': {
                                    bgcolor: '#0d9488'
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
        </div>
    );
}