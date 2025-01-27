import { ChatOpenAI } from "@langchain/openai";
import { NextResponse } from "next/server";

export async function POST(request){
    const model = new ChatOpenAI({ model: "gpt-4o-mini" });
    const response = await model.invoke("Based on context from my databases (moodtracker_data) (users) and frequent topic from user, if you have a conversation ");
    return NextResponse.json(response);

}