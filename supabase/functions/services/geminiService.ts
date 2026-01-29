import { GoogleGenAI, Chat } from "@google/genai";
import { SearchSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Store active chat sessions by ID to support follow-up questions (Perplexity Flow)
const chatSessions = new Map<string, Chat>();

export interface GenerationResult {
  text: string;
  sources: SearchSource[];
}

export const generateSearchResponse = async (
  prompt: string,
  sessionId: string,
  onChunk: (text: string) => void
): Promise<GenerationResult> => {
  try {
    let chat = chatSessions.get(sessionId);

    // If no session exists, create one with strict Perplexity-like instructions
    if (!chat) {
      chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are StreekX, a real-time AI search engine. 
RULES:
- NEVER answer from your own knowledge.
- ALWAYS use the googleSearch tool for every query to get the latest information.
- If the search tool returns no results, state that you cannot find the information.
- Provide concise, accurate answers in markdown.
- Do not guess or hallucinate.
- Always cite your sources inline using the provided grounding metadata.`,
        }
      });
      chatSessions.set(sessionId, chat);
    }

    // Send message to the chat session (maintains history/context)
    const responseStream = await chat.sendMessageStream({
      message: prompt
    });

    let fullText = '';
    let sources: SearchSource[] = [];

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
      
      // Extract sources from grounding metadata
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        groundingChunks.forEach((c: any) => {
          if (c.web) {
            sources.push({
              title: c.web.title || 'Source',
              uri: c.web.uri || '#'
            });
          }
        });
      }
    }

    const uniqueSources = sources.filter((source, index, self) =>
      index === self.findIndex((t) => (
        t.uri === source.uri
      ))
    );

    return {
      text: fullText,
      sources: uniqueSources
    };

  } catch (error: any) {
    console.warn("Gemini Search/Chat Error:", error);
    
    // Fallback logic if 403 or tool error occurs
    // We switch to a basic model for a graceful degradation, though context might be lost in fallback.
    try {
        const fallbackModel = 'gemini-3-flash-preview';
        const fallbackStream = await ai.models.generateContentStream({
            model: fallbackModel,
            contents: prompt,
            config: {
                systemInstruction: "You are StreekX. The live search tool is temporarily unavailable. Provide a helpful response based on your training data. Briefly mention that this is an offline response."
            }
        });

        let fullText = '';
        const notice = "\n(Live search unavailable. Using offline knowledge.)\n\n";
        fullText += notice;
        onChunk(notice);

        for await (const chunk of fallbackStream) {
            const text = chunk.text;
            if (text) {
                fullText += text;
                onChunk(text);
            }
        }
        return { text: fullText, sources: [] };

    } catch (fallbackError) {
        const errorMsg = "\n\n(Error: Unable to connect to AI service. Please check your connection.)\n";
        onChunk(errorMsg);
        return { text: errorMsg, sources: [] };
    }
  }
};