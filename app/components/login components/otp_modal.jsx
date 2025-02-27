import React from 'react';

export default function OTPModal({ otp, setOtp, handleVerifyOtp, setShowOtpModal }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Enter OTP</h2>
                <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="OTP"
                    className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <button
                    onClick={handleVerifyOtp}
                    className="w-full p-3 rounded-lg bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                >
                    Verify OTP
                </button>
                <button
                    onClick={() => setShowOtpModal(false)}
                    className="w-full p-3 rounded-lg bg-gray-600 text-white text-lg font-semibold hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
