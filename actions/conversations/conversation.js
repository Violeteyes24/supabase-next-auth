"use server";

import { createClient } from "../../lib/supabase/server";

export async function AddConversation(conversationObject) {
  const supabase = await createClient();
  const { selectedUser, createdBy } = conversationObject;
  console.log(conversationObject);
  const {data, error} = await supabase
    .from("conversations")
    .insert([{ conversation_type: "active", created_by: createdBy, user_id: selectedUser }])
    .select();
    console.log(data);
    return data;
}

