'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";  
import SignUpButton from "../../components/login components/sign_up_button";  

export default function SecretaryRegister() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const [username, setUserName] = useState('')
    const [address, setAddress] = useState('')
    const [contact_number, setContactNumber] = useState('')
    const [birthday, setBirthday] = useState('')
    const [gender, setGender] = useState('Male')
    const [department_assigned, setDepartmentAssigned] = useState('COECS')
    const [short_biography, setShortBiography] = useState('')
    const [imagePreview, setImagePreview] = useState(null)
    const [proofImagePreview, setProofImagePreview] = useState(null)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null) 
    const [imageFile, setImageFile] = useState(null)
    const [proofImageFile, setProofImageFile] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState(1)
    const totalSteps = 3
    
    // Field validation states
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [nameError, setNameError] = useState('');
    const [contactNumberError, setContactNumberError] = useState('');
    const [birthdayError, setBirthdayError] = useState('');
    
    const router = useRouter()
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
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        
        return true;
    };

    // Validate password
    const validatePassword = (password) => {
        setPasswordError('');
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        
        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return false;
        }
        
        return true;
    };

    // Validate password confirmation
    const validateConfirmPassword = (password, confirmPassword) => {
        setConfirmPasswordError('');
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            return false;
        }
        
        if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
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
        
        // Simple phone number validation
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
        return true;
    };

    // Validate current step
    const validateCurrentStep = () => {
        switch (step) {
            case 1:
                const isEmailValid = validateEmail(email);
                const isPasswordValid = validatePassword(password);
                const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);
                const isUsernameValid = validateUsername(username);
                return isEmailValid && isPasswordValid && isConfirmPasswordValid && isUsernameValid;
                
            case 2:
                const isNameValid = validateName(name);
                const isContactValid = validateContactNumber(contact_number);
                const isBirthdayValid = validateBirthday(birthday);
                return isNameValid && isContactValid && isBirthdayValid;
                
            case 3:
                // Just check if proof image is uploaded in step 3
                return true;
                
            default:
                return true;
        }
    };

    const handleSignUp = async () => {
        try {
            // Validate all fields before submission
            const isEmailValid = validateEmail(email);
            const isPasswordValid = validatePassword(password);
            const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);
            const isUsernameValid = validateUsername(username);
            const isNameValid = validateName(name);
            const isContactValid = validateContactNumber(contact_number);
            const isBirthdayValid = validateBirthday(birthday);
            
            if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isUsernameValid || 
                !isNameValid || !isContactValid || !isBirthdayValid) {
                setError('Please fix the validation errors before submitting');
                return;
            }
            
            if (!proofImageFile) {
                setError('Proof of identity is required');
                return;
            }
            
            setIsSubmitting(true);
            setError(''); 
            setSuccess('');

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
                setIsSubmitting(false);
                return;
            }

            const userId = signUpData.user?.id;

            if (!signUpData.user) {
                setError("Sign-up failed. Please try again.");
                setIsSubmitting(false);
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
                    setIsSubmitting(false);
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
                    setIsSubmitting(false);
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
                        user_type: 'secretary',
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
                        profile_image_url: profileImageUrl,
                        proof_image_url: proofImageUrl,
                    },
                ]);

            if (insertError) {
                console.error('Error inserting user profile:', insertError);
                setError('An error occurred while creating your profile.');
                setIsSubmitting(false);
                return;
            }

            setSuccess('Sign-up successful! Please check your email to verify your account before logging in.');
            
            // Show success message and redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
            
        } catch (err) {
            console.error('Unexpected Error:', err);
            setError('An error occurred during sign-up.');
        } finally {
            setIsSubmitting(false);
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
                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg w-96 text-center">
                    <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">
                        You're already logged in
                    </h1>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">
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
                                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                            {index + 1}
                        </div>
                    ))}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mb-2">
                    <div 
                        className="bg-emerald-600 h-2 rounded-full" 
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    ></div>
                </div>
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
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
                        placeholder="Enter your email address"
                        className={`w-full p-3 rounded-md border ${emailError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) validatePassword(e.target.value);
                        }}
                        placeholder="Create a strong password"
                        className={`w-full p-3 rounded-md border ${passwordError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
                    {passwordError && <p className="mt-1 text-sm text-red-500">{passwordError}</p>}
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordError) validateConfirmPassword(password, e.target.value);
                        }}
                        placeholder="Confirm your password"
                        className={`w-full p-3 rounded-md border ${confirmPasswordError ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    />
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
                        <option value="COECS">College of Engineering and Computer Science (COECS)</option>
                        <option value="CBA">College of Business Administration (CBA)</option>
                        <option value="COL">College of Law (COL)</option>
                        <option value="CAS">College of Arts and Sciences (CAS)</option>
                        <option value="IBED">Institute of Business and Entrepreneurship Development (IBED)</option>
                        <option value="CHS">College of Health Sciences (CHS)</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-300 text-sm font-medium mb-2">Short Biography</label>
                    <textarea
                        value={short_biography}
                        onChange={(e) => setShortBiography(e.target.value)}
                        placeholder="Brief description about yourself"
                        rows="3"
                        className="w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    ></textarea>
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
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Proof of Identity <span className="text-red-500">*</span>
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
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                            Please upload a valid ID or document that confirms your identity and role.
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
                    <p className="text-gray-400 mt-2">Secretary Registration</p>
                </div>
                
                {/* Progress Bar */}
                {renderProgressBar()}
                
                {/* Error/Success Message */}
                {error && (
                    <div className={`mb-4 p-3 rounded-md ${error.includes('successful') ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'}`}>
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-4 p-3 rounded-md bg-green-800 text-green-200">
                        {success}
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
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 focus:outline-none transition duration-300 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : 'Register'}
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