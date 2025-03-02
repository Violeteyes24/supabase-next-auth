import { ChatOpenAI } from "@langchain/openai";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// Initialize Supabase using .env.local variables
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// if (!supabaseUrl || !supabaseKey) {
//   throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
// }
const supabase = createClientComponentClient();

export async function POST(request) {
  // Query dynamic_response_openai from chatbot_view
  const { data, error } = await supabase
    .from("chatbot_view")
    .select("dynamic_response_openai");
  if (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }
  const topicsList = data
    .map((row) => row.dynamic_response_openai)
    .filter(Boolean);

  // Build the prompt with table data
  const prompt = `Given the following dynamic responses from users: ${topicsList.join(
    ", "
  )}. 
Provide a general, concise report in simple words about the most frequent topic. 
Answer in the format: "The most frequent topic is academic-related".`;

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
      : response.text
      ? response.text
      : JSON.stringify(response);
      
  return NextResponse.json({ report: reportText });
}