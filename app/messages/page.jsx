'use client'

import React, { useState } from "react";
import Sidebar from "../components/dashboard components/sidebar";

export default function MessagePage() {
    // Conversation flow
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

    const [currentStep, setCurrentStep] = useState(0);
    const [messages, setMessages] = useState([
        { sender: "System", message: conversationFlow[0].message },
    ]);

    const handleOptionClick = (nextStep) => {
        const nextMessage = conversationFlow[nextStep];
        setMessages([...messages, { sender: "System", message: nextMessage.message }]);
        setCurrentStep(nextStep);
    };

    const mockMessageList = [
        {
            sender: "John Doe",
            summary: "Hey, I need help with my account!",
            timestamp: "2m ago",
        },
        {
            sender: "Jane Smith",
            summary: "My app keeps crashing. What should I do?",
            timestamp: "5m ago",
        },
        {
            sender: "System",
            summary: "Welcome to the support center! How can I help you?",
            timestamp: "10m ago",
        },
    ];

    return (
        <div className="h-screen flex">
            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Message Sidebar */}
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto">
                <div className="p-4 font-bold text-gray-700">Messages</div>
                {mockMessageList.map((message, index) => (
                    <div
                        key={index}
                        className="flex items-center px-4 py-2 hover:bg-gray-200 cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                        <div className="ml-4">
                            <div className="font-bold text-gray-800">{message.sender}</div>
                            <div className="text-sm text-gray-600">{message.summary}</div>
                            <div className="text-xs text-gray-400">{message.timestamp}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-200">
                {/* Header */}
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    Support Chat
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender === "System" ? "justify-start" : "justify-end"
                                }`}
                        >
                            <div
                                className={`p-4 rounded-lg shadow-md ${msg.sender === "System"
                                        ? "bg-gray-200 text-black"
                                        : "bg-blue-600 text-white"
                                    } max-w-sm`}
                            >
                                {msg.message}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with Options */}
                <div className="bg-gray-900 p-4">
                    <div className="flex space-x-4 justify-center">
                        {conversationFlow[currentStep]?.options.map((option, index) => (
                            <button
                                key={index}
                                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                onClick={() => handleOptionClick(option.next)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
