'use client'

import React, { useState } from "react";
import Sidebar from "../components/dashboard components/sidebar"

export default function MessagePage () {

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    }

    const conversationFlow = [
        {
            sender: "System",
            message: "Welcome to the support center! How can I help you?",
            options: [
                { label: "Account Issues", next: 1 },
                { label: "Technical Support", next: 2 },
                { label: "Other", next: 3 },
            ],
        },
        {
            sender: "System",
            message: "Please describe your account issue:",
            options: [
                { label: "Login Problem", next: 4 },
                { label: "Account Locked", next: 4 },
            ],
        },
        {
            sender: "System",
            message: "What technical issue are you facing?",
            options: [
                { label: "App Crash", next: 4 },
                { label: "Slow Performance", next: 4 },
            ],
        },
        {
            sender: "System",
            message: "Can you tell us more about your concern?",
            options: [
                { label: "Yes", next: 4 },
                { label: "No", next: 4 },
            ],
        },
        {
            sender: "System",
            message: "Thank you for your feedback! We'll get back to you shortly.",
            options: [],
        },
    ];

    // State to track the current conversation step
    const [currentStep, setCurrentStep] = useState(0);
    const [messages, setMessages] = useState([
        { sender: "System", message: conversationFlow[0].message },
    ]);

    // Handle button clicks to progress the conversation
    const handleOptionClick = (nextStep) => {
        const nextMessage = conversationFlow[nextStep];
        setMessages([...messages, { sender: "System", message: nextMessage.message }]);
        setCurrentStep(nextStep);
    };
    
    return (
        <div className="h-screen bg-blue-950 flex flex-col">
            {/* Header */}
            <Sidebar handleLogout={handleLogout} />
            <div className="bg-blue-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                Support Chat
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-blue-950">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            msg.sender === "System" ? "justify-start" : "justify-end"
                        }`}
                    >
                        <div
                            className={`p-4 rounded-lg shadow-md ${
                                msg.sender === "System"
                                    ? "bg-gray-200 text-black"
                                    : "bg-blue-600 text-white"
                            } max-w-sm`}
                        >
                            {msg.message}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer with Buttons */}
            <div className="bg-blue-900 p-4">
                <div className="flex space-x-4 justify-center">
                    {conversationFlow[currentStep]?.options.map((option, index) => (
                        <button
                            key={index}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            onClick={() => handleOptionClick(option.next)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}