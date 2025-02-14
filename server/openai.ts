import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateChatResponse(userMessage: string, conversationHistory: Array<{ role: "user" | "assistant", content: string }>) {
  try {
    const systemPrompt = `You are DropBot, a friendly and empathetic AI companion. Chat with the user like a close friend or trusted therapist, mixing encouraging words, affirmations, and questions for deeper probing. Keep your responses concise but meaningful.`;

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

export { generateChatResponse };
