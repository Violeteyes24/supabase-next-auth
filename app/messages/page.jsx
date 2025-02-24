'use client';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from "react";
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPlus } from 'react-icons/fa';

export default function MessagePage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [predefinedOptions, setPredefinedOptions] = useState([]);
    const [currentParentId, setCurrentParentId] = useState(13);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [newUser, setNewUser] = useState(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
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
        if (session) {
            fetchConversations();
            fetchPredefinedOptions(currentParentId);
            fetchMessages();

            // Subscribe to all message changes
            const messageChannel = supabase.channel('message-changes')
                .on(
                    'postgres_changes',
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'messages',
                        filter: `conversation_id=eq.${selectedUser?.conversation_id}`
                    },
                    (payload) => {
                        console.log('Message change received:', payload);
                        fetchMessages();
                        fetchConversations();
                    }
                )
                .subscribe();

            // Subscribe to predefined messages changes
            const predefinedMessageChannel = supabase.channel('predefined-changes')
                .on(
                    'postgres_changes',
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'predefined_messages' 
                    },
                    () => {
                        fetchPredefinedOptions(currentParentId);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(messageChannel);
                supabase.removeChannel(predefinedMessageChannel);
            };
        }
    }, [session, selectedUser]); // Add selectedUser to dependency array

    const fetchMessages = async () => {
        if (!selectedUser?.conversation_id) return;

        const { data, error } = await supabase
            .from("messages")
            .select(`
                *,
                sender:sender_id(name),
                recipient:conversation_id(name)
            `)
            .eq("conversation_id", selectedUser.conversation_id)
            .order("sent_at", { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            setMessages(data || []);
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

        if (error) {
            console.error("Error fetching predefined messages:", error);
        } else {
            setPredefinedOptions(data || []);
        }
    };

    const sendMessage = async (option) => {
        console.log("Sending message:", option); // Changed from selectedMessage to option
        if (!option || !selectedUser) {
            console.error("No message or user selected");
            return;
        }

        const { error, data } = await supabase.from("messages").insert([
            {
                sender_id: session?.user.id,
                sent_at: new Date().toISOString(),
                received_at: null,
                is_read: false,
                conversation_id: selectedUser ? selectedUser.conversation_id : newUser.user_id,
                message_type: 'text',
                read_at: null,
                is_delivered: false,
                message_content: option.message_content,
            },
        ])
        .select();

        if (error) {
            console.error("Error sending message:", error);
        } else {
            fetchMessages();
        }
    };

    const fetchConversations = async () => {
        setLoading(true);
        try {
            const currentUserId = session?.user.id;

            let { data: messages, error } = await supabase
                .from("messages")
                .select(`
                    *,
                    sender:sender_id(name),
                    recipient:conversation_id(name)
                `)
                .eq("sender_id", currentUserId)
                .order("sent_at", { ascending: false });

            if (error) {
                console.log("Fetch conversations error:", error);
                return;
            }

            if (!messages || messages.length === 0) {
                setConversations([]);
            } else {
                const uniqueConversations = messages.reduce((acc, msg) => {
                    if (!acc.some(conv => conv.conversation_id === msg.conversation_id)) {
                        acc.push(msg);
                    }
                    return acc;
                }, []);

                setConversations(uniqueConversations);
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from("users")
            .select("user_id, name");

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
    };

    useEffect(() => {
        if (session) {
            fetchConversations();
            fetchPredefinedOptions(currentParentId);
        }
    }, [session]);

    const handleNewMessage = async (message) => {
        setMessages([]);
        setSelectedUser(null);
        setShowUserModal(false);
    };

    const handleOptionClick = async (option) => {
        console.log("Selected message:", option);
        await sendMessage(option);
        
        // Check if there are predefined options for the selected message_content_id
        const { data } = await supabase
            .from("predefined_messages")
            .select("*")
            .eq("message_role", "counselor")
            .eq("parent_id", option.message_content_id);

        // If there are no child options, go back to the root options (parent_id: 13)
        if (!data || data.length === 0) {
            setCurrentParentId(13);
            fetchPredefinedOptions(13);
        } else {
            setCurrentParentId(option.message_content_id);
            fetchPredefinedOptions(option.message_content_id);
        }
    };

    const handlePlusClick = () => {
        fetchUsers();
        setShowUserModal(true);
    };

    const handleUserSelect = async (conversation) => {
        console.log("Selected Conversation:", conversation);
        setSelectedUser(conversation);
        setShowUserModal(false);
        fetchPredefinedOptions(currentParentId);
        
        const { data, error } = await supabase
            .from("messages")
            .select(`
                *,
                sender:sender_id(name),
                recipient:conversation_id(name)
            `)
            .eq("conversation_id", conversation.conversation_id)
            .order("sent_at", { ascending: true });
            
        if (error) {
            console.error("Error fetching conversation messages:", error);
        } else {
            setMessages(data || []);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error during sign out:', error);
            return;
        }
        router.push('/login');
    };

    return (
        <div className="h-screen flex">
            <Sidebar handleLogout={handleLogout} />

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
                            <div className="font-bold text-gray-800">
                                {conversation.recipient?.name || "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-600">
                                {conversation.message_content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-200">
                <div className="bg-gray-900 text-white text-xl py-4 px-6 font-bold shadow-md">
                    {selectedUser?.recipient?.name || "Select a conversation"}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.sender_id === session?.user.id ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`p-4 rounded-lg shadow-md ${
                                    msg.sender_id === session?.user.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-black"
                                }`}
                            >
                                <div className="text-sm opacity-75 mb-1">
                                    {msg.sender?.name || "Unknown"}
                                </div>
                                {msg.message_content}
                            </div>
                        </div>
                    ))}
                </div>

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
                        <h2 className="text-xl font-bold mb-4 text-white">Select User</h2>
                        <ul>
                            {users.map((user) => (
                                <li
                                    key={user.user_id}
                                    className="cursor-pointer hover:bg-gray-600 p-2 rounded text-white"
                                    onClick={() => {
                                        handleNewMessage();
                                        setNewUser(user);
                                    }}
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