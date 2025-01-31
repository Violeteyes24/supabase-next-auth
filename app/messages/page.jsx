'use client'

import React, { useState, useEffect } from "react";
import Sidebar from "../components/dashboard components/sidebar";
import { supabase } from "../utils/supabaseClient"; // Ensure you have supabase client setup

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
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [predefinedOptions, setPredefinedOptions] = useState([]);

    const fetchMessages = async (id) => {
        if (!id) return;

        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
            .order("sent_at", { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            setMessages(data || []);
            fetchPredefinedOptions();
        }
    };

    const fetchPredefinedOptions = async () => {
        const { data, error } = await supabase
            .from("predefined_messages")
            .select("*");

        if (error) {
            console.error("Error fetching predefined messages:", error);
        } else {
            setPredefinedOptions(data || []);
        }
    };

    const sendMessage = async (selectedMessage) => {
        const { error } = await supabase.from("messages").insert([
            {
                sender_id: id, // User selecting the message
                receiver_id: id, // Assuming a predefined flow
                message_content: selectedMessage.message_text,
                sent_at: new Date().toISOString(),
            },
        ]);

        if (error) {
            console.error("Error sending message:", error);
        } else {
            fetchMessages(id); // Refresh messages after sending
        }
    };

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const currentUserId = session?.user.id;

            let { data, error } = await supabase
                .from("messages")
                .select("sender_id, receiver_id, sent_at, predefined_messages!inner(message_content)")
                .or(`sender_id.eq.${currentUserId}, receiver_id.eq.${currentUserId}`)
                .order("sent_at", { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                setConversations([]);
            } else {
                const uniqueConversations = {};

                for (const msg of data) {
                    const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
                    if (!uniqueConversations[otherUserId]) {
                        uniqueConversations[otherUserId] = {
                            user_id: otherUserId,
                            name: "Unknown", // To be updated later
                            message_content: msg.predefined_messages?.[0]?.message_content ?? "No content",
                        };
                    }
                }

                const userIds = Object.keys(uniqueConversations);
                if (userIds.length > 0) {
                    let { data: users, error: userError } = await supabase
                        .from("users")
                        .select("user_id, name")
                        .in("user_id", userIds);

                    if (!userError && users) {
                        users.forEach((user) => {
                            if (uniqueConversations[user.user_id]) {
                                uniqueConversations[user.user_id].name = user.name;
                            }
                        });
                    }
                }

                setConversations(Object.values(uniqueConversations));
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    return (
        <div className="h-screen flex">
            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Message Sidebar */}
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto">
                <div className="p-4 font-bold text-gray-700">Messages</div>
                {conversations.map((conversation, index) => (
                    <div
                        key={index}
                        className="flex items-center px-4 py-2 hover:bg-gray-200 cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                        <div className="ml-4">
                            <div className="font-bold text-gray-800">{conversation.name}</div>
                            <div className="text-sm text-gray-600">{conversation.message_content}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-200">
                {/* Header */}
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    Name of the Person
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender_id === id ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`p-4 rounded-lg shadow-md ${msg.sender_id === id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-black"
                                    } max-w-sm`}
                            >
                                {msg.message_content}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with Options */}
                <div className="bg-gray-900 p-4">
                    <div className="flex space-x-4 justify-center">
                        {predefinedOptions.map((option, index) => (
                            <button
                                key={index}
                                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                onClick={() => sendMessage(option)}
                            >
                                {option.message_text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
