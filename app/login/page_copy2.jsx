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
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Check if the user is already logged in
    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }

        getUser();
    }, [])

    // Handle sign-in with email and password
    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError('An error occurred during sign-in. Please try again.');
            } else {
                setIsPasswordValid(true); // Password is valid, show Magic Link button
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
                    emailRedirectTo: `${location.origin}/login`, // Adjust the redirect URL as needed
                },
            });
            if (error) {
                setError('An error occurred. Please try again.');
            } else {
                setError('A magic link has been sent to your email. Please check your inbox.');
            }
        } catch (err) {
            console.error('Unexpected error during magic link send:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    // Handle logout
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        setUser(null);
        router.push('/login'); // Redirect to login page after logout
    };

    // Loading state
    if (loading) {
        return <h1>Loading...</h1>;
    }

    // If user is already logged in, show a message and logout option
    if (user) {
        return (
            <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md w-96 text-center">
                    <h1 className="mb-4 text-xl font-bold text-gray-700 dark:text-gray-300">
                        You're already logged in
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="w-full p-3 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
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
                {isPasswordValid && (
                    <button
                        onClick={handleSendMagicLink}
                        className="w-full p-3 mb-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                    >
                        Send Magic Link
                    </button>
                )}
                {!isPasswordValid && (
                    <button
                        onClick={handleSignIn}
                        className="w-full p-3 mb-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                    >
                        Log in
                    </button>
                )}
                <h3 className="items-center justify-center mb-4">Sign Up as a:</h3>
                <RegisterLinks />
            </div>
        </main>
    );
}
