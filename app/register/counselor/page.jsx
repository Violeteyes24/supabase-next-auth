'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import SignUpButton from "../../components/login components/sign_up_button";

export default function CounselorRegister() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [confirmPasswordError, setConfirmPasswordError] = useState('')
    const router = useRouter()
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('')
    const [username, setUserName] = useState('')
    const [address, setAddress] = useState('')
    const [contact_number, setContactNumber] = useState('')
    const [birthday, setBirthday] = useState('')
    const [gender, setGender] = useState('Male')
    const [department_assigned, setDepartmentAssigned] = useState('COECS')
    const [short_biography, setShortBiography] = useState('')
    const [credentials, setCredentials] = useState('')
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState();
    const [proofImageFile, setProofImageFile] = useState(null);
    const [proofImagePreview, setProofImagePreview] = useState(null);
    const [imageUrl, setImageUrl] = useState([])
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const totalSteps = 3;
    
    // Password visibility toggle state
    const [showPassword, setShowPassword] = useState(false);
    
    // Field validation states
    const [emailError, setEmailError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [nameError, setNameError] = useState('');
    const [contactNumberError, setContactNumberError] = useState('');
    const [birthdayError, setBirthdayError] = useState('');
    const [credentialsError, setCredentialsError] = useState('');

    const supabase = createClientComponentClient();

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }

        getUser();
    }, [])

    // Validate email format
    const validateEmail = (email) => {
        setEmailError('');
        if (!email) {
            setEmailError('Email is required');
            return false;
        }
        
        if (!email.includes('@hnu.edu.ph')) {
            setEmailError('Email must be a valid HNU email (must contain @hnu.edu.ph)');
            return false;
        }
        
        return true;
    };

    // Validate username
    const validateUsername = (username) => {
        setUsernameError('');
        if (!username) {
            setUsernameError('Username is required');
            return false;
        }
        
        if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            return false;
        }
        
        return true;
    };

    // Validate name
    const validateName = (name) => {
        setNameError('');
        if (!name) {
            setNameError('Full name is required');
            return false;
        }
        return true;
    };

    // Validate contact number
    const validateContactNumber = (number) => {
        setContactNumberError('');
        if (!number) {
            setContactNumberError('Contact number is required');
            return false;
        }
        
        // Simple phone number validation - adjust for your specific requirements
        const phoneRegex = /^\d{10,11}$/;
        if (!phoneRegex.test(number.replace(/[^0-9]/g, ''))) {
            setContactNumberError('Please enter a valid phone number (10-11 digits)');
            return false;
        }
        
        return true;
    };

    // Validate birthday
    const validateBirthday = (birthday) => {
        setBirthdayError('');
        if (!birthday) {
            setBirthdayError('Date of birth is required');
            return false;
        }
        
        // Check if the user is at least 18 years old
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            setBirthdayError('You must be at least 18 years old to register as a counselor');
            return false;
        }
        
        return true;
    };

    // Validate credentials
    const validateCredentials = (credentials) => {
        setCredentialsError('');
        if (!credentials) {
            setCredentialsError('Professional credentials are required');
            return false;
        }
        return true;
    };

    // Validate confirm password
    const validateConfirmPassword = (confirmPasswordValue) => {
        setConfirmPasswordError('')
        if (confirmPasswordValue !== password) {
            setConfirmPasswordError('Passwords do not match')
            return false
        }
        return true
    }

    // Validate current step
    const validateCurrentStep = () => {
        switch (step) {
            case 1:
                const isEmailValid = validateEmail(email);
                const isUsernameValid = validateUsername(username);
                const isConfirmValid = validateConfirmPassword(confirmPassword);
                return isEmailValid && isUsernameValid && isConfirmValid;
                
            case 2:
                const isNameValid = validateName(name);
                const isContactValid = validateContactNumber(contact_number);
                const isBirthdayValid = validateBirthday(birthday);
                return isNameValid && isContactValid && isBirthdayValid;
                
            case 3:
                const areCredentialsValid = validateCredentials(credentials);
                return areCredentialsValid;
                
            default:
                return true;
        }
    };

    const handleSignUp = async () => {
        try {
            setError(''); // Clear any previous errors
            
            // Validate all fields before submission
            const isEmailValid = validateEmail(email);
            const isUsernameValid = validateUsername(username);
            const isNameValid = validateName(name);
            const isContactValid = validateContactNumber(contact_number);
            const isBirthdayValid = validateBirthday(birthday);
            const areCredentialsValid = validateCredentials(credentials);
            
            if (!isEmailValid || !isUsernameValid || !isNameValid || 
                !isContactValid || !isBirthdayValid || !areCredentialsValid) {
                setError('Please fix the validation errors before submitting');
                return;
            }
            
            if (password !== confirmPassword) {
                setConfirmPasswordError("Passwords do not match")
                setError('Please fix the validation errors before submitting')
                return
            }

            if (!proofImageFile) {
                setError('Proof of identity is required');
                return;
            }

            // Sign up the user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            }, {
                emailRedirectTo: `${location.origin}/auth/callback`,
            });

            if (signUpError) {
                console.error('Sign-Up Error:', signUpError);
                setError(signUpError.message);
                return;
            }

            const userId = signUpData.user?.id;

            if (!signUpData.user) {
                setError("Sign-up failed. Please try again.");
                return;
            }

            let profileImageUrl = null;
            let proofImageUrl = null;

            // Upload Profile Image if selected
            if (imageFile) {
                const { data, error: uploadError } = await supabase
                    .storage
                    .from('profile_pictures')
                    .upload(`users/${userId}-${Date.now()}`, imageFile, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Image Upload Error:', uploadError);
                    setError('Failed to upload profile image.');
                    return;
                }

                profileImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile_pictures/${data.path}`;
            }

            // Upload Proof Image if selected
            if (proofImageFile) {
                const { data, error: uploadError } = await supabase
                    .storage
                    .from('proof_images')
                    .upload(`users/${userId}-${Date.now()}-proof`, proofImageFile, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Proof Image Upload Error:', uploadError);
                    setError('Failed to upload proof image.');
                    return;
                }

                proofImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/proof_images/${data.path}`;
            }

            // Insert user data into the database
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        user_id: signUpData.user?.id || null,
                        user_type: 'counselor',
                        approval_status: 'pending',
                        is_director: false,
                        name,
                        username,
                        address,
                        contact_number,
                        birthday,
                        gender,
                        department_assigned,
                        short_biography,
                        credentials,
                        profile_image_url: profileImageUrl,
                        proof_image_url: proofImageUrl,
                    },
                ]);

            if (insertError) {
                console.error('Error inserting user profile:', insertError);
                setError('An error occurred while creating your profile.');
                return;
            }

            // Notify user to verify email
            setError('Sign-up successful! Please verify your email before logging in.');
            
            // Show success message and direct to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
            
        } catch (err) {
            console.error('Unexpected Error:', err);
            setError('An error occurred during sign-up.');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        setUser(null)
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleProofImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofImageFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setProofImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveProofImage = () => {
        setProofImageFile(null);
        setProofImagePreview(null);
    };

    const nextStep = () => {
        if (validateCurrentStep() && step < totalSteps) {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-emerald-100">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
                <p className="mt-4 text-emerald-800 font-medium">Loading...</p>
            </div>
        );
    }

    if (user) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-emerald-100">
                <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-center">
                    <h1 className="mb-4 text-2xl font-bold text-gray-800">
                        You're already logged in
                    </h1>
                    <p className="mb-6 text-gray-600">
                        Would you like to log out and create a new account?
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full p-3 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none transition duration-300 transform hover:scale-105"
                    >
                        Logout
                    </button>
                </div>
            </div>
        )
    }

    // Render progress bar
    const renderProgressBar = () => {
        return (
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <div 
                            key={index} 
                            className={`flex items-center justify-center rounded-full h-8 w-8 text-sm font-medium 
                                ${index + 1 === step 
                                    ? 'bg-emerald-600 text-white' 
                                    : index + 1 < step 
                                        ? 'bg-emerald-200 text-emerald-800' 
                                        : 'bg-gray-200 text-gray-500'}`}
                        >
                            {index + 1}
                        </div>
                    ))}
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
                    <div 
                        className="bg-emerald-600 h-2 rounded-full" 
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    ></div>
                </div>
                <div className="text-center text-sm text-gray-500">
                    Step {step} of {totalSteps}: {
                        step === 1 ? 'Account Information' :
                        step === 2 ? 'Personal Information' :
                        'Professional Details'
                    }
                </div>
            </div>
        );
    };

    // Step 1: Account Information
    const renderStepOne = () => {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailError) validateEmail(e.target.value);
                        }}
                        placeholder="Enter your HNU email address"
                        className={`w-full p-3 rounded-md border ${emailError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a strong password"
                            className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            style={{
                                // Hide browser's password toggle button
                                '-webkit-text-security': showPassword ? 'none' : 'disc',
                                'appearance': 'none',
                                '-webkit-appearance': 'none',
                            }}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                // Eye icon with slash (hidden)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                </svg>
                            ) : (
                                // Eye icon (visible)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                if (confirmPasswordError) validateConfirmPassword(e.target.value)
                            }}
                            placeholder="Confirm your password"
                            className={`w-full p-3 rounded-md border ${confirmPasswordError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                            style={{
                                '-webkit-text-security': showPassword ? 'none' : 'disc',
                                appearance: 'none',
                                '-webkit-appearance': 'none'
                            }}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                // Eye icon with slash (hidden)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                </svg>
                            ) : (
                                // Eye icon (visible)
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {confirmPasswordError && <p className="mt-1 text-sm text-red-500">{confirmPasswordError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                            setUserName(e.target.value);
                            if (usernameError) validateUsername(e.target.value);
                        }}
                        placeholder="Choose a username"
                        className={`w-full p-3 rounded-md border ${usernameError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {usernameError && <p className="mt-1 text-sm text-red-500">{usernameError}</p>}
                </div>
            </>
        );
    };

    // Step 2: Personal Information
    const renderStepTwo = () => {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (nameError) validateName(e.target.value);
                        }}
                        placeholder="Enter your full name"
                        className={`w-full p-3 rounded-md border ${nameError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {nameError && <p className="mt-1 text-sm text-red-500">{nameError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Address</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Your current address"
                        className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Contact Number</label>
                    <input
                        type="text"
                        value={contact_number}
                        onChange={(e) => {
                            setContactNumber(e.target.value);
                            if (contactNumberError) validateContactNumber(e.target.value);
                        }}
                        placeholder="Your phone number"
                        className={`w-full p-3 rounded-md border ${contactNumberError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {contactNumberError && <p className="mt-1 text-sm text-red-500">{contactNumberError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-medium mb-2">Date of Birth</label>
                        <input
                            type="date"
                            value={birthday}
                            onChange={(e) => {
                                setBirthday(e.target.value);
                                if (birthdayError) validateBirthday(e.target.value);
                            }}
                            className={`w-full p-3 rounded-md border ${birthdayError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                        />
                        {birthdayError && <p className="mt-1 text-sm text-red-500">{birthdayError}</p>}
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-medium mb-2">Gender</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                </div>
            </>
        );
    };

    // Step 3: Professional Details
    const renderStepThree = () => {
        return (
            <>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Department Assigned</label>
                    <select
                        value={department_assigned}
                        onChange={(e) => setDepartmentAssigned(e.target.value)}
                        className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                        <option value="COECS">COECS</option>
                        <option value="CBA">CBA</option>
                        <option value="COL">COL</option>
                        <option value="CAS">CAS</option>
                        <option value="IBED">IBED</option>
                        <option value="CHS">CHS</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Professional Credentials</label>
                    <input
                        type="text"
                        value={credentials}
                        onChange={(e) => {
                            setCredentials(e.target.value);
                            if (credentialsError) validateCredentials(e.target.value);
                        }}
                        placeholder="Your qualifications and certifications"
                        className={`w-full p-3 rounded-md border ${credentialsError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {credentialsError && <p className="mt-1 text-sm text-red-500">{credentialsError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Short Biography</label>
                    <textarea
                        value={short_biography}
                        onChange={(e) => setShortBiography(e.target.value)}
                        placeholder="Brief description about yourself and experience"
                        rows="3"
                        className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Profile Picture
                        </label>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors">
                            <input
                                type="file"
                                id="imageInput"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <label htmlFor="imageInput" className="cursor-pointer block">
                                {imagePreview ? (
                                    <div className="relative w-full h-32 mx-auto mb-2">
                                        <img 
                                            src={imagePreview} 
                                            alt="Profile Preview" 
                                            className="object-cover w-full h-full rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-32 flex items-center justify-center bg-gray-700 rounded-lg mb-2">
                                        <span className="text-gray-400">No image selected</span>
                                    </div>
                                )}
                                <span className="text-emerald-500 font-medium hover:text-emerald-400">
                                    {imagePreview ? "Change Image" : "Upload Profile Picture"}
                                </span>
                            </label>
                            {imagePreview && (
                                <button 
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                    Remove Image
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Proof of Identity
                        </label>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors">
                            <input
                                type="file"
                                id="proofImageInput"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProofImageChange}
                            />
                            <label htmlFor="proofImageInput" className="cursor-pointer block">
                                {proofImagePreview ? (
                                    <div className="relative w-full h-32 mx-auto mb-2">
                                        <img 
                                            src={proofImagePreview} 
                                            alt="Proof Preview" 
                                            className="object-cover w-full h-full rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-32 flex items-center justify-center bg-gray-700 rounded-lg mb-2">
                                        <span className="text-gray-400">No image selected</span>
                                    </div>
                                )}
                                <span className="text-emerald-500 font-medium hover:text-emerald-400">
                                    {proofImagePreview ? "Change Image" : "Upload Identity Proof"}
                                </span>
                            </label>
                            {proofImagePreview && (
                                <button 
                                    type="button"
                                    onClick={handleRemoveProofImage}
                                    className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                    Remove Image
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Please upload an ID or certificate proving your counselor credentials.
                        </p>
                    </div>
                </div>
            </>
        );
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-cyan-500 p-6">
            <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md transition-all duration-500">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                        Mental <span className="px-2 text-white bg-emerald-600 rounded">Help</span>
                    </h1>
                    <p className="text-gray-400 mt-2">Counselor Registration</p>
                </div>
                
                {/* Progress Bar */}
                {renderProgressBar()}
                
                {/* Error Message */}
                {error && (
                    <div className={`mb-4 p-3 rounded-md ${error.includes('successful') ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'}`}>
                        {error}
                    </div>
                )}
                
                {/* Form Steps */}
                <form onSubmit={(e) => e.preventDefault()}>
                    {step === 1 && renderStepOne()}
                    {step === 2 && renderStepTwo()}
                    {step === 3 && renderStepThree()}
                    
                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-6">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 focus:outline-none transition duration-300"
                            >
                                Back
                            </button>
                        ) : (
                            <div></div>
                        )}
                        
                        {step < totalSteps ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 focus:outline-none transition duration-300"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSignUp}
                                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 focus:outline-none transition duration-300"
                            >
                                Register
                            </button>
                        )}
                    </div>
                </form>
                
                <div className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-emerald-400 hover:underline">
                        Log in here
                    </Link>
                </div>
            </div>
        </main>
    );
}