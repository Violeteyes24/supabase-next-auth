'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import SignUpButton from "@/app/components/sign_up_button";

export default function CounselorRegister() {
   
        const [email, setEmail] = useState('')
        const [password, setPassword] = useState('')
        const router = useRouter()
        const [user, setUser] = useState(null);
        const [loading, setLoading] = useState(true);
        const [name, setName] = useState('')
        const [username, setUserName] = useState('')
        const [address, setAddress] = useState('')
        const [contact_number, setContactNumber] = useState('')
        const [birthday, setBirthday] = useState ('')
        const [gender, setGender] = useState ('')
        const [department_assigned, setDepartmentAssigned] = useState ('')
        const [short_biography, setShortBiography] = useState ('')
        const [credentials, setCredentials] = useState('')
        const [imagePreview, setImagePreview] = useState(null);
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

        // const validateEmail = (email) => {
        //     const regex = /^[a-zA-Z0-9._%+-]+@hnu\.edu\.ph$/;
        //     return regex.test(email);
        // };

        const handleSignUp = async () => {

            // if (!validateEmail(email)) {
            //     setError('Please enter a valid HNU email address.');
            //     return;
            // }

            // setError('');

            try {
                // Query the `auth.users` table to check if the email exists
                const { data: existingUsers, error: fetchError } = await supabase
                    .from('auth.users')
                    .select('email')
                    .eq('email', email);

                if (fetchError) {
                    console.error('Fetch Error:', fetchError);
                    setError('Failed to check email. Please try again later.');
                    return;
                }

                if (existingUsers && existingUsers.length > 0) {
                    setError('This email is already in use. Please use a different email.');
                    return;
                }

                // If email does not exist, proceed with sign-up
                const { data, error } = await supabase.auth.signUp(
                    { email, password },
                    { emailRedirectTo: `${location.origin}/auth/callback` }
                );

                if (error) {
                    setError(error.message);
                    return;
                }

                // Redirect to confirmation page
                router.push('/auth/confirmation');
            } catch (err) {
                console.error('Unexpected Error:', err);
                setError('An error occurred during sign-up.');
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
                const reader = new FileReader();
                reader.onload = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file); // Convert the file to a base64 string
            }
        };

        console.log({ loading, user })

        if (loading) {
            return <h1>loading..</h1>
        }

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
            )
        }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-800 p-6 overflow-y-auto">
            <div className="bg-gray-900 p-8 rounded-lg shadow-md w-96">
                <h1 className="mb-4 text-3xl font-extrabold text-gray-900 dark:text-white md:text-3xl lg:text-3xl py-5"><span className="text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Mental </span><mark className="px-2 text-white bg-emerald-600 rounded dark:bg-emerald-300">Help</mark></h1>
                <h3 className="items-center justify-center mb-4">Counselor's form</h3>
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
                <input
                    type="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Username"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="address"
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="contact_number"
                    name="contact_number"
                    value={contact_number}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="ContactNumber"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="birthday"
                    name="birthday"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    placeholder="Birthday"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="gender"
                    name="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="Gender"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="department_assigned"
                    name="department_assigned"
                    value={department_assigned}
                    onChange={(e) => setDepartmentAssigned(e.target.value)}
                    placeholder="Department Assigned"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="short_biography"
                    name="short_biography"
                    value={short_biography}
                    onChange={(e) => setShortBiography(e.target.value)}
                    placeholder="Short Biography"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                    type="credentials"
                    name="credentials"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="Credentials"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <label htmlFor="imageInput" className="block mb-2 text-sm font-medium text-gray-700">
                    Upload an Image for Proof
                </label>
                <input
                    type="file"
                    id="imageInput"
                    name="image"
                    accept="image/*"
                    className="mb-4 w-full p-3 rounded-md border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    onChange={handleImageChange}
                />
                <SignUpButton handleSignUp={handleSignUp} />
                <div className="flex items-center justify-center">
                    <Link href={'/login'} className="text-white-500 hover:underline">
                        Click here to go login.
                    </Link>
                </div>

            </div>
        </main>
    )

}
