import OpenAI from "openai";
import { Entry, ChatMessage } from "../shared/schema.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateChatResponse(userMessage: string, conversationHistory: Array<{ role: "user" | "assistant", content: string }>) {
  try {
    const messageCount = conversationHistory.length + 1;
    const isLastMessage = messageCount >= 7;
    
    const systemPrompt = `You are DropBot, a friendly and empathetic AI companion. Chat with the user like a close friend or trusted therapist, mixing encouraging words, affirmations, and questions for deeper probing. Keep your responses concise but meaningful.${
      isLastMessage ? ' This is our final message together for now, so please conclude with a brief encouragement for the user.' : ''
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw new Error("Failed to generate chat response");
  }
}

interface AnalysisEntry {
  question: string;
  answer: string;
  chatMessages: ChatMessage[];
}

async function generateAnalysis(entries: AnalysisEntry[]) {
  try {
    let promptContent = "You are a close friend and confidant, similar to that of a therapist or coach with deep understanding of this person. Analyze these chats from the user answering a personal introspective question and the subsequent chat with a close friend. Provide insights about what's coming up for this person and provide helpful advice or wisdom to them based on what they've talked about. Here are the chat transcripts:\n\n";
    
    // Add each entry and its conversation to the prompt
    entries.forEach((entry, index) => {
      promptContent += `Entry ${index + 1}:\nQuestion: ${entry.question}\nUser's Answer: ${entry.answer}\n\n`;
      
      if (entry.chatMessages && entry.chatMessages.length > 0) {
        promptContent += "Conversation:\n";
        entry.chatMessages.forEach(msg => {
          const role = msg.isBot ? "DropBot" : "User";
          promptContent += `${role}: ${msg.content}\n`;
        });
      }
      
      promptContent += "\n---\n\n";
    });
    
    const messages = [
      { role: "system", content: "You are a thoughtful therapist or coach who analyzes journal entries and conversations to provide meaningful insights and advice." },
      { role: "user", content: promptContent }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating analysis:", error);
    throw new Error("Failed to generate analysis");
  }
}

export { generateChatResponse, generateAnalysis };
