'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Create a styled component approach without needing global CSS
const ConfirmationContent = () => {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const email = searchParams.get('email');
    
    // Login page URL
    const loginPageUrl = 'https://supabase-next-auth-5w52ovdq1-violeteyes24s-projects.vercel.app/';

    useEffect(() => {
        if (code && email) {
            setStatus('success');
            setMessage(`Your email (${decodeURIComponent(email)}) has been confirmed!`);
            
            // Redirect after successful confirmation
            const timer = setTimeout(() => {
                window.location.href = loginPageUrl;
            }, 3000);
            
            return () => clearTimeout(timer);
        } else {
            setStatus('error');
            setMessage('Invalid confirmation link. Please check your email and try again.');
        }
    }, [code, email]);

    // Inline style for the progress animation
    const progressAnimationStyle = {
        animation: 'progress 3s linear',
        width: '100%',
        height: '100%'
    };

    // Inline style for the background pattern
    const backgroundStyle = {
        backgroundColor: '#f0fdf4',
        backgroundImage: `
            radial-gradient(circle at 25px 25px, rgba(134, 239, 172, 0.15) 2px, transparent 0),
            radial-gradient(circle at 75px 75px, rgba(134, 239, 172, 0.15) 2px, transparent 0),
            radial-gradient(circle at 50px 50px, rgba(134, 239, 172, 0.15) 2px, transparent 0)
        `,
        backgroundSize: '100px 100px'
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={backgroundStyle}>
            {/* Define the keyframes for the progress animation */}
            <style jsx>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
            
            {/* Semi-transparent card overlay */}
            <div className="max-w-md w-full p-8 bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-lg">
                <div className="text-center">
                    {status === 'loading' && (
                        <div className="flex justify-center mb-4">
                            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    
                    {status === 'success' && (
                        <div className="flex justify-center mb-4">
                            <div className="text-5xl">✅</div>
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="flex justify-center mb-4">
                            <div className="text-5xl">❌</div>
                        </div>
                    )}
                    
                    <h1 className={`text-2xl font-bold mb-4 ${
                        status === 'success' ? 'text-green-700' : 
                        status === 'error' ? 'text-red-700' : 'text-gray-700'
                    }`}>
                        {status === 'loading' ? 'Verifying your email...' : message}
                    </h1>
                    
                    {status === 'success' && (
                        <>
                            <p className="text-gray-700 mb-6">Thank you for joining us. You'll be redirected to the login page shortly.</p>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full" style={progressAnimationStyle}></div>
                            </div>
                        </>
                    )}
                    
                    {status === 'error' && (
                        <div className="mt-6">
                            <p className="text-gray-700 mb-4">Please try again or contact our support team for assistance.</p>
                            <a 
                                href={loginPageUrl}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
                            >
                                Return to Login
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-green-50">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <ConfirmationContent />
        </Suspense>
    );
}