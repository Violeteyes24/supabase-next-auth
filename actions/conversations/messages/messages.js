"use server";

import { createClient } from "../../../lib/supabase/server";

/**
 * PostgreSQL table schema for the 'messages' table.
 *
 * @typedef {Object} Message
 * @property {UUID} message_id - Primary key, auto-generated UUID for each message
 * @property {UUID} sender_id - Foreign key referencing users.user_id, nullable
 * @property {timestamp} sent_at - When the message was sent, defaults to current timestamp
 * @property {timestamp} received_at - When the message was received, nullable
 * @property {boolean} is_read - Flag indicating if message has been read, defaults to false
 * @property {UUID} conversation_id - Foreign key referencing conversations.conversation_id
 * @property {string} message_type - Type of message, defaults to 'text'
 * @property {timestamp} read_at - When the message was read, nullable
 * @property {boolean} is_delivered - Flag indicating if message was delivered, defaults to false
 * @property {integer} message_content_id - Foreign key to predefined_messages table, nullable
 * @property {string} message_content - Content of the message, nullable
 *
 * @description
 * Table contains message data with foreign key relationships to users, conversations,
 * and predefined_messages tables. It includes message status tracking (read/delivered)
 * and supports both custom and predefined message content.
 */

/**
 * Server action to send a new message and store it in the database
 *
 * @param {Object} messageData - The message data to insert
 * @param {UUID} messageData.sender_id - The ID of the user sending the message
 * @param {UUID} messageData.conversation_id - The ID of the conversation this message belongs to
 * @param {string} messageData.message_content - The content of the message
 * @param {string} [messageData.message_type='text'] - The type of message
 * @param {integer} [messageData.message_content_id] - ID of predefined message if applicable
 * @returns {Promise<{success: boolean, data?: Message, error?: any}>} Result object with success status and data or error
 */
export async function sendMessage(messageData) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();
    // Set default values if not provided
    console.log(messageData);
    const messageToInsert = {
        sender_id: messageData.sender_id,
        conversation_id: messageData.conversation_id,
        message_content: messageData.message_content,
        message_type: messageData.message_type || "text",
        sent_at: new Date().toISOString(),
        is_delivered: false,
        is_read: false,
    };

    // Add message_content_id if provided
    if (messageData.message_content_id) {
      messageToInsert.message_content_id = messageData.message_content_id;
    }

    // Insert the message into the database
    const { data, error } = await supabase
      .from("messages")
      .insert(messageToInsert)
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error in sendMessage:", error);
    return { success: false, error: error.message };
  }
}
