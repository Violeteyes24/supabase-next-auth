import { ChatOpenAI } from "@langchain/openai";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// Initialize Supabase client
const supabase = createClientComponentClient();

export async function POST(request) {
  try {
    // Query dynamic_response_openai from chatbot_view
    const { data, error } = await supabase
      .from("chatbot_view")
      .select("dynamic_response_openai, chatbot_question");
    
    console.log("chatbot_view data", data); // Log the fetched data
    
    if (error) {
      console.error("Error fetching data:", error);
      return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
    }
    
    // Subscribe to realtime changes on chatbot_view
    const channels = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chatbot_view' },
        (payload) => {
          console.log('Change received!', payload);
        }
      )
      .subscribe();
    
    const topicsList = data
      .map((row) => {
        // combine both fields if available
        return [row.dynamic_response_openai, row.chatbot_question].filter(Boolean).join(' ');
      })
      .filter(Boolean);
    
    console.log("topicsList:", topicsList);
    console.log("topicsList length:", topicsList.length);
    
    // Check if data is empty and return early if it is
    if (!data || data.length === 0 || topicsList.length === 0) {
      return NextResponse.json({ report: "No Response" });
    }
    
    // Build the prompt with table data
    const prompt = `Given the following dynamic responses from users: ${topicsList.join(
      ", "
    )}. 
Provide a general, concise report in simple words about the most frequent topic. 
Answer in the format: "The most frequent topic is academic-related". And your choices are "Relationships", "Academic", "Family", "Others". Also put the overall sentiment score. Display "No topics available" if no topic is found.`;

    // Extract OPENAI_API_KEY from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    // Call the OpenAI model with the provided apiKey
    const model = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: openaiApiKey });
    const response = await model.invoke(prompt);
    
    // Extract a string from the response; adjust if your response object structure differs.
    const reportText =
      typeof response === "string"
        ? response
        : response.content
        ? response.content
        : JSON.stringify(response);
        
    return NextResponse.json({ report: reportText });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}