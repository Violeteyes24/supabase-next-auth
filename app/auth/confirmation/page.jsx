// /app/auth/confirmation/page.jsx
'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ConfirmationPage() {
    const [message, setMessage] = useState('');
    /* eslint-disable react-hooks/rules-of-hooks */
    const searchParams = useSearchParams();
    const code = searchParams.get('code');  // Get 'code' query parameter
    const email = searchParams.get('email'); // Get 'email' query parameter

    useEffect(() => {
        if (code && email) {
            // You could use `code` here for further validation if needed
            setMessage(`Your email (${decodeURIComponent(email)}) has been confirmed!`);
            // You can redirect to login or perform other actions after a delay
            setTimeout(() => {
                window.location.href = '/';  // Redirect after confirmation
            }, 3000); // Adjust timeout as needed
        } else {
            setMessage('Invalid confirmation link. Please check your email and try again.');
        }
    }, [code, email]);

    return (
        <div className="confirmation-page">
            <h1>{message}</h1>
        </div>
    );
}
