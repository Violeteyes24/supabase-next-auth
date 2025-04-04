'use client'

import React from 'react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
    const router = useRouter();

    const handleGoBack = () => {
        router.back(); // Navigates back to the previous page
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-4">Unauthorized Access</h1>
            <p className="text-lg mb-6">You do not have the necessary permissions to view this page.</p>
            <button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleGoBack}
            >
                Go Back
            </button>
        </div>
    );
}

/*

Error:   × You're importing a component that needs `useRouter`. This React hook only works in a client component. 
To fix, mark the file (or its parent) with the `"use client"` directive.

*/