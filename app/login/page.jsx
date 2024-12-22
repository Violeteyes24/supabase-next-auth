'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RegisterLinks from '../components/register_links'; // function + jsx file
import SignInButton from '../components/sign_in_button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleSignIn = async () => {
        if (!email) {
            setError('Please enter your email.');
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`, // Adjust the redirect URL as needed
                },
            });

            if (error) {
                setError('An error occurred. Please try again.');
            } else {
                setMessage('A magic link has been sent to your email. Please check your inbox.');
            }
        } catch (err) {
            console.error('Unexpected error during sign-in:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push('/login'); // Redirect to dashboard if user is already logged in
            }
        };

        checkUser();
    }, [router, supabase.auth]);

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
                {error && (
                    <div className="mb-4 text-red-500 text-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="mb-4 text-green-500 text-sm">
                        {message}
                    </div>
                )}
                <button
                    onClick={handleSignIn}
                    className="w-full p-3 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
                >
                    Send Magic Link
                </button>
                <h3 className="items-center justify-center mb-4">Sign Up as a:</h3>
                <RegisterLinks />
            </div>
        </main>
    );
}
