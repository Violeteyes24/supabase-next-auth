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
    
    // console.log("chatbot_view data", data); // Log the fetched data
    
    if (error) {
      console.error("Error fetching data:", error);
      return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
    }
    
    // Query mood_tracker data to find highest intensity moods
    const { data: moodData, error: moodError } = await supabase
      .from("mood_tracker")
      .select("mood_type, intensity");
    
    if (moodError) {
      console.error("Error fetching mood data:", moodError);
      return NextResponse.json({ error: "Error fetching mood data" }, { status: 500 });
    }
    
    // Calculate average intensity by mood type
    const moodIntensities = {};
    moodData.forEach(entry => {
      if (!moodIntensities[entry.mood_type]) {
        moodIntensities[entry.mood_type] = {
          total: 0,
          count: 0
        };
      }
      moodIntensities[entry.mood_type].total += entry.intensity;
      moodIntensities[entry.mood_type].count += 1;
    });
    
    // Find the mood with highest average intensity
    let highestMood = null;
    let highestAvg = 0;
    
    for (const [moodType, data] of Object.entries(moodIntensities)) {
      const avgIntensity = data.total / data.count;
      if (avgIntensity > highestAvg) {
        highestAvg = avgIntensity;
        highestMood = moodType;
      }
    }
    
    // console.log("Mood intensity analysis:", moodIntensities);
    // console.log("Highest intensity mood:", highestMood, "with average:", highestAvg);
    
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
    
    // console.log("topicsList:", topicsList);
    // console.log("topicsList length:", topicsList.length);
    
    // Check if data is empty and return early if it is
    if (!data || data.length === 0 || topicsList.length === 0) {
      return NextResponse.json({ report: "No Response" });
    }
    
    // Build the prompt with table data and mood information
    const moodInfo = highestMood ? 
      `The mood tracker shows "${highestMood}" has the highest average intensity at ${highestAvg.toFixed(1)}/10.` :
      "No mood tracking data available.";
    
    const prompt = `Given the following dynamic responses from users: ${topicsList.join(
      ", "
    )}. 
    
    ${moodInfo}
    
    Analyze them and generate a brief but informative report in simple words.
    
    Format:
    - Most Frequent Topic: (Choose only one from these 3: Relationships, Academic, Family) This is absolutely necessary to choose only one of the 3.
    - Summary: Briefly explain why this topic is frequently mentioned.
    - Determine the overall sentiment as Positive, Negative, or Neutral, then display the corresponding sentiment score along with the full range of classifications: Negative (0-3), Neutral (4-6), and Positive (7-10).
   - Provide the sentiment score and describe the general mood of the responses.
    - Overall Mood: Determine the overall mood of the responses based on the mood tracker data, noting that "${highestMood || 'N/A'}" has the highest intensity.
    
    If no topic is found, return "No topics available."`;
    

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