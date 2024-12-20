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


    const supabase = createClientComponentClient();

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }

        getUser();
    }, [])

    const handleSignUp = async () => {
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

    const handleSignIn = async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Check for specific error codes and set corresponding messages
            if (error.code === 'auth/user-not-found') {
                setError('Email address not found.');
            } else if (error.code === 'auth/invalid-password') {
                setError('Incorrect password.');
            } else {
                setError('An error occurred. Please try again.');
            }
        } else {
            setUser(data.user);
            router.refresh();
            setEmail('');
            setPassword('');
            setError(null); // Clear any previous errors
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        setUser(null)
    }

    console.log({ loading, user })

    if (loading) {
        return <h1>loading..</h1>
    }

    if (user) { // need to learn how to make this a component, because I will replace this with different homepages for counselor and secretary
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
                <input
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
                )}
                <SignInButton handleSignIn={handleSignIn} />
                <h3 className="items-center justify-center mb-4">Sign Up as a:</h3>
                <RegisterLinks />
                </div>
            </main> 
            )

}

/*

TO DO: 

1. Review table fields.
2. Fetch data from forms
3. HNU Email Validation.
4. Password Validation.
5. OTP for every log-in attempt.
6. Home Page / Admin Dashboard template

What's happening?

- When clicking Sign up button, logs in and goes to /register/counselor or /register/secretary depending on where you Signed up as.
- It still invokes the "Sign Up" Functionality, and appears on my authentication table.
- I want to redirect them to the login page after signing up.

*/