"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import LoadingButton from "../components/loading_button";
import { Box, Skeleton } from "@mui/material";

export default function Auth() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [otp, setOtp] = useState("");
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [isPendingModalVisible, setPendingModalVisible] = useState(false);
  const [isForgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      setCheckingSession(true);
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        handleNavigation(data.session.user.id);
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  // Loading skeleton component with shimmer effect
  const LoginSkeleton = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
      {/* Shimmer overlay */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
          animation: 'shimmer 2s infinite',
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' }
          },
          zIndex: 10
        }}
      />
      
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Skeleton variant="rectangular" width={180} height={50} sx={{ mx: 'auto', borderRadius: 1 }} />
          <Skeleton variant="text" width={200} height={24} sx={{ mx: 'auto', mt: 2 }} />
        </div>

        <div className="space-y-5">
          <div>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mt: 1 }} />
          </div>

          <div>
            <Skeleton variant="text" width={100} height={20} />
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mt: 1 }} />
          </div>

          <div className="pt-2">
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 8 }} />
          </div>

          <div className="flex items-center my-4">
            <div className="flex-grow">
              <Skeleton variant="text" height={10} />
            </div>
            <Skeleton variant="text" width={30} sx={{ mx: 4 }} />
            <div className="flex-grow">
              <Skeleton variant="text" height={10} />
            </div>
          </div>

          <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 8 }} />

          <div className="mt-6 text-center">
            <Skeleton variant="text" width={250} height={20} sx={{ mx: 'auto' }} />
            <div className="flex justify-center gap-2 mt-2">
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={120} height={20} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (checkingSession) {
    return <LoginSkeleton />;
  }

  async function signInWithEmail() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        handleNavigation(data.user.id);
      }
    } catch (err) {
      alert("An error occurred during sign-in.");
    }
    setLoading(false);
  }

  async function requestOtp() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (error) {
        alert(error.message);
      } else {
        alert("OTP sent to your email. Check your inbox.");
        setOtpModalVisible(true);
      }
    } catch (err) {
      alert("An error occurred while sending OTP.");
    }
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        alert(error.message);
      } else {
        alert("Verification email sent. Check your inbox.");
      }
    } catch (err) {
      alert("An error occurred during sign-up.");
    }
    setLoading(false);
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        alert(`Verification failed: ${error.message}`);
      } else {
        setOtpModalVisible(false);
        alert("Verification successful!");
        handleNavigation(data.user.id);
      }
    } catch (err) {
      alert("An error occurred during verification.");
    }
    setLoading(false);
  }

  async function handlePasswordReset() {
    if (!resetEmail || !resetEmail.trim()) {
      alert("Please enter your email address");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        alert(error.message);
      } else {
        alert("Password reset instructions sent to your email");
        setForgotPasswordModalVisible(false);
        setResetEmail("");
      }
    } catch (err) {
      alert("An error occurred while sending password reset email.");
    }
    setLoading(false);
  }

  async function handleNavigation(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("user_type, approval_status")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching user role:", error.message);
      return;
    }

    const userType = data?.user_type;
    const userStatus = data?.approval_status;
    
    if (userStatus === "pending" || userStatus === "denied") {
      setPendingModalVisible(true);
      return;
    }
    
    if (userType === "counselor") {
      router.push("/dashboard/counselor");
    } else if (userType === "secretary") {
      router.push("/dashboard/counselor");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center">
            <span className="text-black">Mental</span>
            <span className="bg-green-500 text-white px-3 py-1 rounded-md ml-1">
              Help
            </span>
          </h1>
          <p className="text-gray-600 mt-2 font-medium">
            Your mental health companion
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition duration-200 text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@address.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition duration-200 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  'WebkitTextSecurity': showPassword ? 'none' : 'disc',
                  'appearance': 'none',
                  'WebkitAppearance': 'none',
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => setForgotPasswordModalVisible(true)}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={signInWithEmail}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex justify-center items-center"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-middle" />
              ) : (
                "Sign in with Password"
              )}
            </button>
          </div>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-gray-500 text-sm">or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={requestOtp}
            disabled={loading}
            className="w-full bg-green-100 hover:bg-green-200 text-green-800 font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            Sign in with OTP
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <LoadingButton
                href="/register/counselor"
                className="text-green-600 hover:text-green-800 font-medium"
              >
                Sign up as a counselor 
              </LoadingButton>
              <LoadingButton 
                href="/register/secretary"
                className="text-green-600 hover:text-green-800 font-medium"
              >
                or as a secretary
              </LoadingButton>
            </p>
          </div>
        </div>
      </div>

      {isOtpModalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Enter 6-Digit OTP Code
            </h2>
            <p className="text-gray-600 mb-4">
              We've sent a verification code to your email address.
            </p>

            <input
              type="text"
              className="w-full p-3 text-black text-center text-xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="• • • • • •"
              maxLength={6}
            />

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className={`${
                  otp.length === 6
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-300 cursor-not-allowed"
                } text-white font-medium py-3 px-4 rounded-lg transition duration-200 sm:flex-1`}
              >
                Verify OTP
              </button>

              <button
                onClick={() => setOtpModalVisible(false)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium py-3 px-4 rounded-lg transition duration-200 sm:flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isPendingModalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Account Pending Approval
            </h2>
            <p className="text-gray-600 mb-4">
              Your account is currently pending or denied and needs director approval. You'll receive an email once your account has been approved.
            </p>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setPendingModalVisible(false)}
                className="bg-green-500 text-white hover:bg-green-600 font-medium py-3 px-4 rounded-lg transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isForgotPasswordModalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Reset Your Password
            </h2>
            <p className="text-gray-600 mb-4">
              Enter your email address, and we'll send you instructions to reset your password.
            </p>

            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition duration-200 text-black"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="email@address.com"
            />

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
              <button
                onClick={handlePasswordReset}
                disabled={loading || !resetEmail}
                className={`${
                  resetEmail
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-300 cursor-not-allowed"
                } text-white font-medium py-3 px-4 rounded-lg transition duration-200 sm:flex-1`}
              >
                {loading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-middle" />
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <button
                onClick={() => setForgotPasswordModalVisible(false)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium py-3 px-4 rounded-lg transition duration-200 sm:flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
