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

    const validateForm = () => {
        if (!email || !password || !name || !username || !address || !contact_number || !birthday) {
            setError('Please fill in all required fields');
            return false;
        }
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }
        
        if (!proofImageFile) {
            setError('Please upload proof of identity');
            return false;
        }
        
        return true;
    };

    const handleSignUp = async () => {
        try {
            if (!validateForm()) {
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
            
            // Clear form fields after successful submission
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setName('');
            setUserName('');
            setAddress('');
            setContactNumber('');
            setBirthday('');
            setGender('Male');
            setDepartmentAssigned('COECS');
            setShortBiography('');
            setImageFile(null);
            setImagePreview(null);
            setProofImageFile(null);
            setProofImagePreview(null);
            
        } catch (err) {
            console.error('Unexpected Error:', err);
            setError('An error occurred during sign-up.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignIn = async () => {
        const res = await supabase.auth.signInWithPassword({
            email,
            password
        })
        setUser(res.data.user)
        router.refresh();
        setEmail('')
        setPassword('')
    }

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

    if (loading) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-emerald-200">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-16 w-16 bg-emerald-500 rounded-full mb-4"></div>
                    <div className="h-4 w-24 bg-emerald-500 rounded"></div>
                </div>
            </div>
        )
    }

    if (user) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-emerald-200">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md w-96 text-center">
                    <h1 className="mb-4 text-xl font-bold text-gray-700 dark:text-gray-300">
                        You're already logged in
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="w-full p-3 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none transition duration-300"
                    >
                        Logout
                    </button>
                </div>
            </div>
        )
    }
    
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-300 to-emerald-500 p-6 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md my-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Mental </span>
                        <mark className="px-2 text-white bg-emerald-600 rounded dark:bg-emerald-500">Help</mark>
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Secretary Registration Form</p>
                </div>
                
                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-300 dark:border-green-600 rounded">
                        <p className="font-medium">{success}</p>
                    </div>
                )}
                
                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-300 dark:border-red-600 rounded">
                        <p className="font-medium">{error}</p>
                    </div>
                )}
                
                {/* Form */}
                <div className="space-y-4">
                    {/* Account Information Section */}
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Account Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Personal Information Section */}
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Personal Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={username}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="johndoe"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Birthday <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="birthday"
                                        name="birthday"
                                        value={birthday}
                                        onChange={(e) => setBirthday(e.target.value)}
                                        className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        id="gender"
                                        name="gender"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="123 Main St, City"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Contact Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="contact_number"
                                    name="contact_number"
                                    value={contact_number}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    placeholder="+1 (555) 123-4567"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Professional Information Section */}
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Professional Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="department_assigned" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Department
                                </label>
                                <select
                                    id="department_assigned"
                                    name="department_assigned"
                                    value={department_assigned}
                                    onChange={(e) => setDepartmentAssigned(e.target.value)}
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="COECS">College of Engineering and Computer Science (COECS)</option>
                                    <option value="CBA">College of Business Administration (CBA)</option>
                                    <option value="COL">College of Law (COL)</option>
                                    <option value="CAS">College of Arts and Sciences (CAS)</option>
                                    <option value="IBED">Institute of Business and Entrepreneurship Development (IBED)</option>
                                    <option value="CHS">College of Health Sciences (CHS)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="short_biography" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Short Biography
                                </label>
                                <textarea
                                    id="short_biography"
                                    name="short_biography"
                                    value={short_biography}
                                    onChange={(e) => setShortBiography(e.target.value)}
                                    placeholder="Tell us a bit about yourself..."
                                    rows="3"
                                    className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                    
                    {/* Document Uploads Section */}
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Document Uploads
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="imageInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Profile Picture
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        id="imageInput"
                                        name="image"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    <label 
                                        htmlFor="imageInput" 
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300"
                                    >
                                        Choose File
                                    </label>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {imageFile ? imageFile.name : "No file chosen"}
                                    </span>
                                </div>
                                {imagePreview && (
                                    <div className="mt-3">
                                        <img 
                                            src={imagePreview} 
                                            alt="Profile preview" 
                                            className="h-20 w-20 object-cover rounded-full border-2 border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label htmlFor="proofImageInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Proof of Identity <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="file"
                                        id="proofImageInput"
                                        name="proof_image"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleProofImageChange}
                                        required
                                    />
                                    <label 
                                        htmlFor="proofImageInput" 
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300"
                                    >
                                        Choose File
                                    </label>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {proofImageFile ? proofImageFile.name : "No file chosen"}
                                    </span>
                                </div>
                                {proofImagePreview && (
                                    <div className="mt-3">
                                        <img 
                                            src={proofImagePreview} 
                                            alt="Proof ID preview" 
                                            className="h-32 object-contain rounded border-2 border-emerald-500"
                                        />
                                    </div>
                                )}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Please upload a valid ID or document that confirms your identity and role.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    <button
                        onClick={handleSignUp}
                        disabled={isSubmitting}
                        className={`w-full p-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition duration-300 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                    
                    {/* Login Link */}
                    <div className="text-center mt-4">
                        <p className="text-gray-600 dark:text-gray-400">
                            Already have an account?{" "}
                            <Link href={'/login'} className="text-emerald-600 hover:text-emerald-800 hover:underline dark:text-emerald-500 dark:hover:text-emerald-400 font-medium">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}