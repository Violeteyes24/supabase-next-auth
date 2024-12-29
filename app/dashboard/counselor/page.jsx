'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // Assuming you're using Supabase
import { useRouter } from "next/navigation";
import LogOutButton from '../../components/log_out_button';

export default function CounselorPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();

    // Define the handleLogout function
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login'); // Redirect to login page after logout
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome, Counselor!</h1>
            <p>You are logged in as a counselor. This is your dashboard.</p>
            <LogOutButton handleLogout={handleLogout} /> {/* Pass handleLogout as a prop */}
        </div>
    );
}
