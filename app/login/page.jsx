'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RegisterLinks from '../components/dashboard components/register_links'; // Function + JSX file

export default function LoginPage() {
    // State variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [user, setUser] = useState(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false); // To track if magic link was sent
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Check if the user is already logged in (run after magic link click)
    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('users') // Use "users" table
                    .select('user_type') // Fetch the "user_type" column
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user role:', error);
                    setError('Unable to fetch user role. Please try again.');
                    return;
                }

                setUser({ ...user, role: profile.user_type });
                setLoading(false); // Stop loading if the user is authenticated
            } else {
                setLoading(false); // Stop loading if no user is found
            }
        }

        getUser();
    }, []); // Runs once after initial mount (and after magic link is clicked)

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try {
            // Attempt to sign in the user with email and password
            const { data: { user }, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            // Handle sign-in error
            if (error) {
                setError('An error occurred during sign-in. Please try again.');
                console.error('Sign-In Error:', error.message);
                return;
            } else {
                console.log('Sign-In Successful. User ID:', user?.id);
            }

            // After sign-in is successful, fetch the user profile to get their role
            const { data: profile, error: profileError } = await supabase
                .from('users') // Your table name
                .select('user_type, is_director') // Fetch the "user_type" and "is_director"
                .eq('user_id', user.id) // Use user.id from sign-in result
                .single(); // Get a single row

            // Handle profile fetching error
            if (profileError) {
                setError('Unable to fetch user role. Please try again.');
                console.error('Profile Fetch Error:', profileError.message);
                return;
            }

            // Redirect based on user role
            if (profile.user_type === 'counselor') {
                router.push('/dashboard/counselor');
            } else if (profile.user_type === 'secretary') {
                router.push('/dashboard/secretary');
            } else {
                setError('Unauthorized access.');
            }

        } catch (err) {
            console.error('Unexpected error during sign-in:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    // Handle sending magic link
    const handleSendMagicLink = async () => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/auth/confirmation?email=${email}`, // Redirect to confirmation page
                },
            });
            if (error) {
                setError('An error occurred. Please try again.');
            } else {
                setMessage('A magic link has been sent to your email. Please check your inbox.');
                setMagicLinkSent(true); // Mark magic link as sent
            }
        } catch (err) {
            console.error('Unexpected error during magic link send:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    // Loading state
    if (loading) {
        return <h1>Loading...</h1>;
    }

    // Main login form
    return (
        <main className="h-screen flex items-center justify-center bg-gray-800 p-6">
            <div className="bg-gray-900 p-8 rounded-lg shadow-md w-96">
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 dark:text-white py-5">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Mental </span>
                    <mark className="px-2 text-white bg-emerald-600 rounded dark:bg-emerald-300">Help</mark>
                </h1>
                <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {(error || message) && (
                    <div className={`mb-4 text-sm ${error ? 'text-red-500' : 'text-green-500'}`}>
                        {error || message}
                    </div>
                )}
                <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {magicLinkSent && !user && (
                    <button
                        onClick={handleSignIn}
                        className="w-full p-3 mb-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                    >
                        Log in
                    </button>
                )}
                {!magicLinkSent && (
                    <button
                        onClick={handleSendMagicLink}
                        className="w-full p-3 mb-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                    >
                        Send Magic Link
                    </button>
                )}
                <h3 className="items-center justify-center mb-4">Sign Up as a:</h3>
                <RegisterLinks />
            </div>
        </main>
    );
}
