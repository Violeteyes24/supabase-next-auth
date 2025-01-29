'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RegisterLinks from '../components/login components/register_links'; // Function + JSX file

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [user, setUser] = useState(null);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('user_type')
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    setError('Unable to fetch user role. Please try again.');
                    return;
                }

                setUser({ ...user, role: profile.user_type });
            }
            setLoading(false);
        }

        getUser();
    }, []);

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try {
            const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setError('Invalid email or password.');
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('user_type, is_director')
                .eq('user_id', user.id)
                .single();

            if (profileError) {
                setError('Unable to fetch user role. Please try again.');
                return;
            }

            if (profile.user_type === 'counselor') {
                router.push('/dashboard/counselor');
            } else if (profile.user_type === 'secretary') {
                router.push('/dashboard/secretary');
            } else {
                setError('Unauthorized access.');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    const handleSendMagicLink = async () => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/auth/confirmation?email=${email}`,
                },
            });

            if (error) {
                setError('An error occurred. Please try again.');
            } else {
                setMessage('A magic link has been sent to your email.');
                setMagicLinkSent(true);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    if (loading) {
        return <h1 className="text-center text-xl font-semibold text-gray-700">Loading...</h1>;
    }

    return (
        <main className="h-screen flex items-center justify-center bg-gradient-to-br from-emerald-300 to-blue-400 p-6">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
                <h1 className="mb-6 text-4xl font-extrabold text-gray-900 text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-500">
                        Mental
                    </span>{' '}
                    <mark className="px-2 text-white bg-emerald-600 rounded">Help</mark>
                </h1>

                {error && <div className="mb-4 text-sm text-red-500 text-center">{error}</div>}
                {message && <div className="mb-4 text-sm text-green-500 text-center">{message}</div>}

                <div className="space-y-4">
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {magicLinkSent ? (
                        <button
                            onClick={handleSignIn}
                            className="w-full p-3 rounded-lg bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            Log in
                        </button>
                    ) : (
                        <button
                            onClick={handleSendMagicLink}
                            className="w-full p-3 rounded-lg bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            Send Magic Link
                        </button>
                    )}
                </div>

                <h3 className="mt-6 text-center text-gray-700">Sign Up as a:</h3>
                <RegisterLinks />
            </div>
        </main>
    );
}
