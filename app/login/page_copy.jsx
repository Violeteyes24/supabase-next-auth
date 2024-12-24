'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RegisterLinks from '../components/register_links'; // function + jsx file
import SignInButton from "../components/sign_in_button";

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSucces] = useState < Boolean > (true); // otp attempt
    const supabase = createClientComponentClient();

    useEffect(() => {
        const handleAuth = async () => {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`, // Adjust the redirect URL as needed
                },
            });

            if (error) {
                console.error('Error during authentication:', error);
                // Handle error (e.g., show a notification)
            } else {
                // Redirect to the dashboard or desired page
                router.push('/dashboard');
            }
        };

        handleAuth();
    }, [router]);

    return <div>Loading...</div>;
};

const handleSignUp = async () => { // not used 
    const res = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${location.origin}/auth/callback`
        }
    })
    setUser(res.data.user)
    router.refresh();
    setEmail('')
    setPassword('')
}

const handleSignIn = async (email, password, setError) => {
    // Basic validation to ensure email and password are provided
    if (!email || !password) {
        setError('Please enter both email and password.');
        return;
    }

    const handleSignIn = async (email, setError) => {
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
                // Notify the user to check their email for the magic link
            }
        } catch (err) {
            console.error('Unexpected error during sign-in:', err);
            setError('An unexpected error occurred. Please try again.');
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        setUser(null);
        // Ensure the router is ready
        if (router.isReady) {
            // Refresh the router state
            router.refresh();
            // Redirect to login page
            router.push('/login');
        };
    }

    console.log({ loading, user })

    if (loading) {
        return <h1>loading..</h1>
    }

    if (user) { // need to learn how to make this a component, because I will replace this with different homepages for Director, counselor and secretary
        setSuccess(true);
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
        )
    }

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
                {/* <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {error && (
                    <div className="mb-4 text-red-500 text-sm">
                        {error}
                    </div>
                )} */}
                {success && <div className="my-5 bg-green-100 px-2 text-white"></div>}
                <SignInButton
                    handleSignIn={handleSignIn}
                    setError={setError}
                    email={email}
                    password={password}
                />
                <h3 className="items-center justify-center mb-4">Sign Up as a:</h3>
                <RegisterLinks />
            </div>
        </main>
    )
}


/*

TO DO: 

1. Role based access next js 
    - if isDirector is true, /dashboard/director
    - if user_type = counselor, /dashboard/counselor
    - if user_type = secretary, /dashboard/secretary
2. Home Page / Admin Dashboard template
3. Fetch data from forms
4. Connect Supabase to React Native.
5. Update Log in functionality of React

What's happening?

- When clicking Sign up button, logs in and goes to /register/counselor or /register/secretary depending on where you Signed up as.
- It still invokes the "Sign Up" Functionality, and appears on my authentication table.
- I want to redirect them to the login page after signing up.
- might put a link to /counselor/Dashboard home
- when I log out, it  will go back to /register/counselor or /register/secretary or /login. It should only go to /login

TO BE PERFECTED:

1. Sign Up: Existing Email validation (Figure out Policies, RLS, debugging etc.)

*/