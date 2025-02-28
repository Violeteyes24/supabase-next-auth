"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Auth() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        handleNavigation(data.session.user.id);
      }
    };
    checkSession();
  }, []);

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

  async function handleNavigation(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("user_type")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching user role:", error.message);
      return;
    }

    const userType = data?.user_type;
    if (userType === "counselor") {
      router.push("/dashboard/counselor");
    } else if (userType === "secretary") {
      router.push("/dashboard/secretary");
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
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition duration-200 text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
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
              <button
                onClick={() => router.push("/register/counselor")}
                disabled={loading}
                className="text-green-600 hover:text-green-800 font-medium"
              >
                Sign up as a counselor
              </button>
              <button
                onClick={() => router.push("/register/secretary")}
                disabled={loading}
                className="text-green-600 hover:text-green-800 font-medium"
              >
                or as a secretary
              </button>
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
    </div>
  );
}
