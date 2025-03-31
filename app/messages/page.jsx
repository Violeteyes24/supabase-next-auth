"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, Suspense } from "react";
import Sidebar from "../components/dashboard components/sidebar";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPlus, FaArrowLeft } from "react-icons/fa";
import { BiMessageDetail } from "react-icons/bi";
import { format } from "date-fns";
import { Add } from "@mui/icons-material";
import { AddConversation } from "../../actions/conversations/conversation";
import { sendMessage } from "../../actions/conversations/messages/messages";

function MessageContent() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [predefinedOptions, setPredefinedOptions] = useState([]);
  const [currentParentId, setCurrentParentId] = useState(13);
  const [users, setUsers] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newUser, setNewUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const searchParams = useSearchParams();
  const conversationId =
    searchParams.get("conversation") || conversation?.conversation_id;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setShowSidebar(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        // If there's no valid session, try refreshing it
        if (!session) {
          console.log("No valid session found, attempting to refresh...");
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh missing session:", refreshError);
            // Only redirect to login if we can't refresh the session
            router.push('/login');
            return;
          }
          
          if (refreshData.session) {
            console.log("Session successfully refreshed from initial empty state");
            setSession(refreshData.session);
          } else {
            console.log("No session after refresh, redirecting to login");
            router.push('/login');
          }
        } else {
          setSession(session);
          console.log("Session refreshed:", session ? `Valid session (${session.user.email})` : "No session");
        }
      } catch (err) {
        console.error("Unexpected error in getSession:", err);
      }
    };
    
    getSession();
    
    // Subscribe to auth state changes for persistent session handling
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
    });
    
    // Set up a periodic session refresh to prevent token expiration
    const refreshInterval = setInterval(async () => {
      try {
        console.log("Refreshing session...");
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("Error refreshing session:", error);
          return;
        }
        
        if (data.session) {
          console.log("Session refreshed successfully:", data.session.user.email);
          setSession(data.session);
        } else {
          console.warn("No session after refresh attempt");
        }
      } catch (err) {
        console.error("Error in refresh interval:", err);
      }
    }, 4 * 60 * 1000); // Refresh every 4 minutes
    
    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    // Clear messages when conversation changes
    setMessages([]);
    
    // Fetch messages for the current conversation
    if (conversationId && session) {
      fetchMessages();
    }
  }, [conversationId]);

  // Set up real-time subscriptions when session or conversationId changes
  useEffect(() => {
    if (!session) return;
    
    // Subscribe to all message changes for the current conversation
    const messageChannel = supabase
      .channel(`message-changes-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          fetchMessages();
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to predefined messages changes
    const predefinedMessageChannel = supabase
      .channel("predefined-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predefined_messages",
        },
        () => {
          fetchPredefinedOptions(currentParentId);
        }
      )
      .subscribe();

    // Subscribe to real-time conversation changes
    const conversationChannel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          console.log("Change received!", payload);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(predefinedMessageChannel);
      supabase.removeChannel(conversationChannel);
    };
  }, [session, conversationId, currentParentId]);

  useEffect(() => {
    if (session) {
      fetchConversations();
      fetchPredefinedOptions(currentParentId);
    }
  }, [session]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      // Check if session is still valid before proceeding
      if (!session || !session.user) {
        console.error("Session missing when trying to fetch messages");
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error("Failed to refresh session:", refreshError);
          router.push('/login'); // Redirect to login if refresh fails
          return;
        } else {
          console.log("Session successfully refreshed");
          setSession(refreshData.session);
        }
      }

      console.log("Fetching messages for conversation:", conversationId);
      const { data, error } = await supabase
        .from("messages")
        .select('*')
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });
        
      if (error) {
        console.error("Error fetching messages:", error);
        
        // Check specifically for auth errors
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          console.error("Authentication error detected, attempting to refresh session");
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh session after auth error:", refreshError);
            router.push('/login');
          } else {
            console.log("Session refreshed after auth error, retrying fetch");
            // Don't retry immediately to avoid infinite loops, set session instead
            setSession(refreshData.session);
          }
        }
        return;
      }
      
      // Make sure we have an array of messages
      const messageArray = Array.isArray(data) ? data : [];
      
      // Process messages to add reliable unique IDs for React keys
      const currentUserId = session?.user?.id;
      const processedMessages = messageArray.map(msg => ({
        ...msg,
        // Add a display sequence attribute to ensure rendering order
        _displaySequence: `${msg.sent_at}_${msg.sender_id === currentUserId ? '1' : '0'}`
      }));
      
      // Enhanced sorting algorithm to handle very close timestamps
      const sortedMessages = processedMessages.sort((a, b) => {
        // Create Date objects for proper comparison
        const dateA = new Date(a.sent_at);
        const dateB = new Date(b.sent_at);
        
        // Get timestamps as numbers for precise comparison
        const timeA = dateA.getTime();
        const timeB = dateB.getTime();
        
        // Check if timestamps are within 1 second of each other
        const isCloseTime = Math.abs(timeA - timeB) < 1000;
        
        // If timestamps are very close and the messages are from different senders,
        // ensure the current user's message appears below others
        if (isCloseTime && a.sender_id !== b.sender_id) {
          // If a is from current user, it should come after b
          if (a.sender_id === currentUserId) return 1;
          // If b is from current user, it should come after a
          if (b.sender_id === currentUserId) return -1;
        }
        
        // Default to normal timestamp-based sorting
        console.log(`Sorting messages: ${dateA.toISOString()} vs ${dateB.toISOString()}`);
        return timeA - timeB;
      });
      
      console.log(`Sorted ${sortedMessages.length} messages by timestamp with enhanced logic`);
      setMessages(sortedMessages);
    } catch (err) {
      console.error("Unexpected error fetching messages:", err);
      
      // Check if it's an auth error by examining the error message
      if (err.message?.includes('auth') || err.message?.includes('JWT') || err.message?.includes('session')) {
        console.error("Authentication error in catch block, redirecting to login");
        router.push('/login');
      }
    }
  };

  const fetchPredefinedOptions = async (parentId = 13) => {
    let query = supabase
      .from("predefined_messages")
      .select("*")
      .eq("message_role", "counselor");
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

const fetchConversations = async () => {
  setLoading(true);
  try {
    const currentUserId = session?.user.id;
    if (!currentUserId) {
      console.log("No user ID found");
      setConversations([]);
      return;
    }

    let { data, error } = await supabase
      .from("conversation_list_view")
      .select("*")
      .or(`user_id.eq.${currentUserId},created_by.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Fetch conversations error:", error);
      setConversations([]);
      return;
    }

    // Format the data and compute friend_id (the other participant)
    const formattedConversations = data?.map((conv) => {
      const displayName =
        conv.user_id === currentUserId ? conv.creator_name : conv.user_name;
      const profileImage =
        conv.user_id === currentUserId
          ? conv.creator_profile_image
          : conv.user_profile_image;
      return {
        ...conv,
        name: displayName || "Unknown",
        profile_image: profileImage,
        friend_id: conv.user_id === currentUserId ? conv.created_by : conv.user_id,
        sent_at: conv.last_message_sent_at || conv.created_at,
        message_content:
          conv.last_message_content || conv.conversation_type || "New conversation",
      };
    }) || [];

    // Aggregate conversations by friend (group by displayName)
    const aggregated = Object.values(
      formattedConversations.reduce((acc, conv) => {
        if (
          !acc[conv.name] ||
          new Date(conv.sent_at) > new Date(acc[conv.name].sent_at)
        ) {
          acc[conv.name] = conv;
        }
        return acc;
      }, {})
    );
    setConversations(aggregated);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    setConversations([]);
  } finally {
    setLoading(false);
  }
};

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("user_id, name")
      .eq("user_type", "student"); // Filter added to show only students

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const handleNewMessage = async (user) => {
    setMessages([]);
    // setConversation(user);
    setShowUserModal(false);
    debugger;
    if (user) {
      const data = await AddConversation({
        selectedUser: user.user_id,
        createdBy: session.user.id,
      });
      console.log(data);
      router.push(
        `/messages/?conversation=${data[0].conversation_id}`
      )
      console.log(data);
    }
  };

  // Universal timestamp utility functions
  const formatTimeWithTimezone = (timestamp, showFull = false) => {
    if (!timestamp) return "";
    try {
      // Create a date object using the timestamp
      const date = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "";
      }
      
      // Log for debugging
      console.log('Timestamp conversion:', {
        inputTimestamp: timestamp,
        systemLocalTime: date.toLocaleTimeString(),
      });
      
      if (showFull) {
        // Format with date, time and seconds for hover display
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Manila'
        });
      }
      
      // Format using Manila timezone (time only) for regular display
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "";
    }
  };
  
  // Replace the existing formatTime function with our new one
  const formatTime = formatTimeWithTimezone;
  
  // Function to create a timestamp in Manila time
  const createManilaTimestamp = () => {
    const now = new Date();
    
    // Ensure this timestamp is slightly later than any existing message
    if (messages.length > 0) {
      // Find the latest message time
      const latestMsgTime = Math.max(...messages.map(msg => new Date(msg.sent_at).getTime()));
      const currentTime = now.getTime();
      
      // If the current time is not at least 100ms later than the latest message,
      // add a small offset to ensure this message appears last
      if (currentTime - latestMsgTime < 100) {
        // Make the timestamp 100ms later than the latest message
        now.setTime(latestMsgTime + 100);
      }
    }
    
    console.log('Creating new timestamp:', {
      systemTime: now.toISOString(),
      systemLocalTime: now.toLocaleTimeString(),
      manilaTime: now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
      })
    });
    
    // Return ISO string (will be interpreted as UTC by the database)
    return now.toISOString();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId) return;
    
    try {
      // Check if session is still valid
      if (!session || !session.user) {
        console.error("Session missing when trying to send message");
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error("Failed to refresh session before send:", refreshError);
          alert("Your session has expired. Please login again.");
          router.push('/login');
          return;
        } else {
          console.log("Session successfully refreshed before send");
          setSession(refreshData.session);
        }
      }
      
      // Use our new timestamp function
      const messageTimestamp = createManilaTimestamp();
      
      // Log the timestamp
      console.log('Message timestamp:', {
        timestamp: messageTimestamp,
        formattedTime: formatTime(messageTimestamp),
        formattedFullTime: formatTime(messageTimestamp, true)
      });
      
      // Optimistically add the message to the UI
      const optimisticMessage = {
        message_id: `temp-${Date.now()}`,
        sender_id: session.user.id,
        conversation_id: conversationId,
        message_content: inputMessage,
        sent_at: messageTimestamp,
        is_read: false,
        is_delivered: false
      };
      
      // Update UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setInputMessage("");
      
      // Send the actual message
      const { success, data, error } = await sendMessage({
        sender_id: session.user.id,
        conversation_id: conversationId,
        message_content: inputMessage,
      });
      
      if (!success) {
        console.error("Failed to send message:", error);
        
        // Check if it's an auth error
        if (error && (error.message?.includes('auth') || error.message?.includes('JWT') || error.message?.includes('session'))) {
          console.error("Authentication error when sending, attempting to refresh");
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh after send error:", refreshError);
            alert("Your session has expired. Please login again.");
            router.push('/login');
          } else {
            console.log("Session refreshed after send error, please try again");
            setSession(refreshData.session);
          }
        }
        
        // Remove the optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.message_id !== optimisticMessage.message_id));
        // Restore the input
        setInputMessage(optimisticMessage.message_content);
      }
      
      // No need to call fetchMessages() as the real-time subscription will handle it
    } catch (err) {
      console.error("Error in handleSendMessage:", err);
      
      // Handle any authentication errors in the catch block
      if (err.message?.includes('auth') || err.message?.includes('JWT') || err.message?.includes('session')) {
        alert("Your session has expired. Please login again.");
        router.push('/login');
      }
    }
  };

  const handleOptionClick = async (option) => {
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
    setConversation(conversation);
    setShowUserModal(false);
    fetchPredefinedOptions(currentParentId);

    if (isMobile) {
      setShowSidebar(false);
    }

    // Fetch all conversation ids for the selected friend using two separate queries
    const friendId = conversation.friend_id;
    
    if (!friendId || !session?.user?.id) {
      console.error("Missing user IDs for conversation query");
      return;
    }
    
    // First query: user_id is friendId and created_by is current user
    const { data: convsQuery1, error: convError1 } = await supabase
      .from("conversations")
      .select("conversation_id")
      .eq("user_id", friendId)
      .eq("created_by", session.user.id);
      
    if (convError1) {
      console.error("Error in first conversation query:", convError1);
      return;
    }
    
    // Second query: user_id is current user and created_by is friendId
    const { data: convsQuery2, error: convError2 } = await supabase
      .from("conversations")
      .select("conversation_id")
      .eq("user_id", session.user.id)
      .eq("created_by", friendId);
    
    if (convError2) {
      console.error("Error in second conversation query:", convError2);
      return;
    }
    
    // Combine results
    const allConvs = [...(convsQuery1 || []), ...(convsQuery2 || [])];
    
    // If no conversations were found, just clear messages
    if (allConvs.length === 0) {
      setMessages([]);
      return;
    }
    
    const conversationIds = allConvs.map(c => c.conversation_id);

    // Now fetch messages from all relevant conversations
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
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
      console.error("Error during sign out:", error);
      return;
    }
    router.push("/login");
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Main Sidebar */}
      <div
        className={`${
          isMobile ? (showSidebar ? "block" : "hidden") : "block"
        } md:w-16 bg-gray-900 flex-shrink-0`}
      >
        <Sidebar handleLogout={handleLogout} sessionProp={session} />
      </div>

      {/* Message Sidebar */}
      <div
        className={`${
          isMobile ? (showSidebar ? "block" : "hidden") : "block"
        } w-full md:w-1/4 lg:w-1/5 bg-white border-r border-gray-200 overflow-y-auto`}
      >
        <div className="p-4 bg-gray-800 text-white font-semibold flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg">Messages</h2>
          <button
            onClick={handlePlusClick}
            className="w-8 h-8 flex items-center justify-center bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors"
          >
            <FaPlus className="text-sm" />
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-emerald-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <BiMessageDetail className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No conversations yet</p>
            <button
              onClick={handlePlusClick}
              className="mt-2 text-emerald-600 hover:text-emerald-800"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          conversations.map((conversation, index) => {
            // Determine the appropriate name and first letter for the avatar
            const displayName =
              conversation.user_id === session?.user?.id
                ? conversation.creator_name
                : conversation.user_name;
            console.log(conversation);

            const firstLetter = displayName?.charAt(0).toUpperCase() || "?";

            // Get profile image if available
            const profileImage =
              conversation.user_id === session?.user?.id
                ? conversation.creator_profile_image
                : conversation.user_profile_image;

            return (
              <div
                key={conversation.conversation_id || index}
                className={`flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors border-b border-gray-100 ${
                  conversation?.conversation_id === conversation.conversation_id
                    ? "bg-gray-100"
                    : ""
                }`}
                onClick={() => handleUserSelect(conversation)}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={displayName || "User"}
                    className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex-shrink-0 flex items-center justify-center font-semibold">
                    {firstLetter}
                  </div>
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <div className="font-medium text-gray-800 truncate">
                      {displayName || "Unknown User"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(
                        conversation.last_message_sent_at ||
                          conversation.created_at
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {conversation.last_message_content ||
                      conversation.conversation_type ||
                      "New conversation"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Chat Area */}
      <div
        className={`${
          isMobile && showSidebar ? "hidden" : "flex"
        } flex-1 flex flex-col bg-gray-100 relative`}
      >
        {isMobile && conversation && (
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-full"
          >
            <FaArrowLeft />
          </button>
        )}

        <div className="bg-gray-800 text-white py-4 px-6 shadow-md flex items-center">
          {conversation ? (
            <>
              <div className="w-full h-8 bg-gray-800 text-white rounded-full mr-3 flex items-center justify-center font-semibold">
                {conversation.user_id === session.user.id
                  ? conversation.creator_name
                  : conversation.user_name}
              </div>
              {/* <span className="font-semibold">
                {conversation.user_id === session.user.id
                  ? conversation.user_name
                  : conversation.creator_name}
              </span> */}
            </>
          ) : (
            <span className="font-semibold">Select a conversation</span>
          )}
        </div>

        {!conversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <BiMessageDetail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the sidebar or start a new one
              </p>
              <button
                onClick={handlePlusClick}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center mx-auto"
              >
                <FaPlus className="mr-2" /> New conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 my-10">
                  <p className="text-lg font-semibold mb-2">No messages yet</p>
                  <p className="text-sm text-gray-400">
                    Start a new conversation below
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isCurrentUser = msg.sender_id === session?.user.id;
                  
                  // Log timestamp details for debugging - reduce verbosity
                  console.log(`Message ${index}:`, {
                    from: isCurrentUser ? 'Me' : 'Other',
                    content: msg.message_content.substring(0, 15) + '...',
                    sent: formatTime(msg.sent_at, true),
                    rawTime: msg.sent_at
                  });
                  
                  return (
                    <div
                      key={msg.message_id || msg._displaySequence || `msg-${index}`}
                      className={`flex ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      } animate-fadeIn`}
                    >
                      {!isCurrentUser && (
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex-shrink-0 mr-2 flex items-center justify-center text-sm font-medium text-white shadow-lg">
                          {msg.sender?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="max-w-[75%] group">
                        <div
                          className={`p-3 rounded-lg shadow-md transition-all duration-200 ${
                            isCurrentUser
                              ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-br-none hover:shadow-lg"
                              : "bg-white text-gray-800 rounded-bl-none hover:shadow-lg"
                          }`}
                        >
                          <div className="text-sm opacity-90 leading-relaxed">
                            {msg.message_content}
                          </div>
                        </div>
                        <div
                          className={`text-xs mt-1 text-gray-500 ${
                            isCurrentUser ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(msg.sent_at, true)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-white p-4 border-t border-gray-200 shadow-lg">
              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <input
                  onChange={(e) => setInputMessage(e.target.value)}
                  value={inputMessage}
                  type="text"
                  placeholder="Type your message..."
                  className="text-black flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputMessage.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-2 rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  <span>Send</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhanced User Selection Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Select User</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-300 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 bg-gray-50">
              {users.length === 0 ? (
                <div className="text-center p-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No users available</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <li
                      key={user.user_id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer rounded transition-colors flex items-center"
                      onClick={() => {
                        handleNewMessage(user);
                        // setNewUser(user);
                      }}
                    >
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center mr-3 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-800">{user.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-3 flex justify-end">
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                onClick={() => setShowUserModal(false)}
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

export default function MessagePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MessageContent />
    </Suspense>
  );
}