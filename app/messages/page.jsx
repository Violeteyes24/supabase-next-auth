'use client'

import React, { useState, useEffect } from "react";
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPlus } from 'react-icons/fa'; // Import the plus icon from react-icons

export default function MessagePage() {

    const supabase = createClientComponentClient();
    const [session, setSession] = useState(null);

    // const [currentStep, setCurrentStep] = useState(0);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [predefinedOptions, setPredefinedOptions] = useState([]);
    const [currentParentId, setCurrentParentId] = useState(13); // Set the initial parent_id to 13
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null); // Add state to store the selected message

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            // console.log("Session:", session);
            setSession(session);
        };
        getSession();
    }, []);

    useEffect(() => {
        console.log("Messages state updated:", messages);
    }, [messages]);

    useEffect(() => {
        console.log("Predefined options state updated:", predefinedOptions);
    }, [predefinedOptions]);

    useEffect(() => {
        if (selectedMessage && selectedUser) {
            sendMessage();
        }
    }, [selectedMessage, selectedUser]);

    useEffect(() => {
        if (session) {
            fetchConversations();
            fetchPredefinedOptions(currentParentId); // Ensure predefined options are fetched on load
            fetchMessages(); // Fetch messages when session is set

            const messageChannel = supabase.channel('message-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                    fetchMessages(); // Refetch messages on any change
                })
                .subscribe();

            const predefinedMessageChannel = supabase.channel('predefined-message-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'predefined_messages' }, () => {
                    fetchPredefinedOptions(currentParentId); // Refetch predefined options on any change
                })
                .subscribe();

            return () => {
                supabase.removeChannel(messageChannel);
                supabase.removeChannel(predefinedMessageChannel);
            };
        }
    }, [session]);

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from("messages")
            .select(`
                *,
                predefined_messages (
                    message_content
                )
            `)
            .or(`sender_id.eq.${session?.user.id},receiver_id.eq.${session?.user.id}`)
            .order("sent_at", { ascending: true });

        console.log("Fetched messages:", data);
        console.log("Fetch messages error:", error);

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            setMessages(data || []);
            fetchPredefinedOptions(currentParentId); // Fetch predefined options starting from the initial parent_id
        }
    };

    const fetchPredefinedOptions = async (parentId = 13) => {
        console.log("Fetching predefined options for parent ID:", parentId);
        let query = supabase.from("predefined_messages").select("*").eq("message_role", "counselor");
        if (parentId !== null) {
            query = query.eq("parent_id", parentId);
        } else {
            query = query.is("parent_id", null);
        }
        const { data, error } = await query;

        console.log("Fetched predefined messages:", data);
        // console.log("Fetch predefined messages error:", error);

        if (error) {
            console.error("Error fetching predefined messages:", error);
        } else {
            setPredefinedOptions(data || []);
        }
    };

    const sendMessage = async () => {
        console.log("Sending message:", selectedMessage);
        if (!selectedMessage || !selectedUser) {
            console.error("No message or user selected");
            return;
        }
        const { error } = await supabase.from("messages").insert([
            {
                sender_id: session?.user.id, // User selecting the message
                receiver_id: selectedUser.user_id, // Send to the selected user
                sent_at: new Date().toISOString(),
                received_at: null,
                is_read: false,
                conversation_id: null,
                message_type: 'text',
                read_at: null,
                is_delivered: false,
                message_content_id: selectedMessage.message_content_id // Use message_content_id instead of message_content
            },
        ]);

        console.log("Send message error:", error);

        if (error) {
            console.error("Error sending message:", error);
        } else {
            fetchMessages(); // Refresh messages after sending
        }
    };

    const fetchConversations = async () => {
        // console.log("Fetching conversations");
        setLoading(true);
        try {
            const currentUserId = session?.user.id;

            let { data, error } = await supabase
                .from("messages")
                .select(`
                    sender_id,
                    receiver_id,
                    sent_at,
                    predefined_messages (
                        message_content
                    )
                `)
                .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
                .order("sent_at", { ascending: false });

            console.log("Fetched conversations:", data);
            if (error) {
                console.log("Fetch conversations error:", error);
                return;
            }

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
                            message_content: msg.predefined_messages ? msg.predefined_messages.message_content : "No content",
                        };
                    }
                }

                const userIds = Object.keys(uniqueConversations);
                if (userIds.length > 0) {
                    let { data: users, error: userError } = await supabase
                        .from("users")
                        .select("user_id, name")
                        .in("user_id", userIds);

                    console.log("Fetched users:", users);
                    // console.log("Fetch users error:", userError);

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

    const fetchUsers = async () => {
        console.log("Fetching users");
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name");

        console.log("Fetched users:", data);
        console.log("Fetch users error:", error);

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
    };

    useEffect(() => {
        if (session) {
            fetchConversations();
            fetchPredefinedOptions(currentParentId); // Ensure predefined options are fetched on load
        }
    }, [session]);

    const handleOptionClick = (option) => {
        console.log("Selected message:", option);
        setCurrentParentId(option.message_content_id);
        setSelectedMessage(option); // Store the selected message
        fetchPredefinedOptions(option.message_content_id); // Fetch next set of options based on selected parent ID
    };

    const handlePlusClick = () => {
        fetchUsers();
        setShowUserModal(true);
    };

    const handleUserSelect = (user) => {
        console.log("Selected user:", user);
        setSelectedUser(user);
        setShowUserModal(false);
        fetchPredefinedOptions(currentParentId); // Fetch predefined options for the new conversation
        fetchConversations(); // Fetch messages for the selected user
    };

    return (
        <div className="h-screen flex">
            {/* Navigation Sidebar */}
            <Sidebar />

            {/* Message Sidebar */}
            <div className="w-1/4 bg-gray-100 border-r overflow-y-auto">
                <div className="p-4 font-bold text-gray-700 flex items-center justify-between">
                    Messages
                    <FaPlus className="cursor-pointer" onClick={handlePlusClick} />
                </div>
                {conversations.map((conversation, index) => (
                    <div
                        key={index}
                        className="flex items-center px-4 py-2 hover:bg-gray-200 cursor-pointer"
                        onClick={() => handleUserSelect(conversation)}
                    >
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                        <div className="ml-4">
                            <div className="font-bold text-gray-800">{conversation.name}</div> 
                            <div className="text-sm text-gray-600">{conversation.message_content}</div>
                            {/* This is the part where I display the last message of the conversation right? if I click this, this should 
                            all display the messages of the conversation */}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-200">
                {/* Header */}
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    {selectedUser ? selectedUser.name : "Name of the Person"}
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender_id === session?.user.id ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`p-4 rounded-lg shadow-md ${msg.sender_id === session?.user.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-black"
                                    } max-w-sm`}
                            >
                                {msg.predefined_messages ? msg.predefined_messages.message_content : "No content"}
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
                                onClick={() => handleOptionClick(option)}
                            >
                                {option.message_content}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Selection Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-gray-700 p-4 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Select User</h2>
                        <ul>
                            {users.map((user) => (
                                <li
                                    key={user.user_id}
                                    className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    {user.name}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            onClick={() => setShowUserModal(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
