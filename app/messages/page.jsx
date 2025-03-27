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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
    };
    getSession();
    // Subscribe to auth state changes for persistent session handling
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      fetchConversations();
      fetchPredefinedOptions(currentParentId);
      fetchMessages();

      // Subscribe to all message changes
      const messageChannel = supabase
        .channel("message-changes")
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
    }
  }, [session, conversation]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from("messages")
      .select('*')
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    //   debugger;
      console.log(data);
    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
      
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

  useEffect(() => {
    if (session) {
      fetchConversations();
      fetchPredefinedOptions(currentParentId);
    }
  }, [session]);

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


  const handleSendMessage = async () => {
    const{success} = await sendMessage({
      sender_id: session.user.id,
      conversation_id: conversationId,
      message_content: inputMessage,
    });
    if(success){
        setInputMessage("");
        fetchMessages();
    }
    // debugger;

  }
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

    // Fetch all conversation ids for the selected friend
    const friendId = conversation.friend_id;
    const { data: convs, error: convError } = await supabase
      .from("conversations")
      .select("conversation_id")
      .or(
        `(user_id.eq.${friendId} and created_by.eq.${session.user.id}),(user_id.eq.${session.user.id} and created_by.eq.${friendId})`
      );
    if (convError) {
      console.error("Error fetching conversations for friend:", convError);
      return;
    }
    const conversationIds = convs?.map((c) => c.conversation_id) || [];

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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      return format(new Date(timestamp), "h:mm a");
    } catch (e) {
      return "";
    }
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
        <Sidebar handleLogout={handleLogout} />
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
                  return (
                    <div
                      key={index}
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
                          className={`text-xs mt-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isCurrentUser ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(msg.sent_at)}
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