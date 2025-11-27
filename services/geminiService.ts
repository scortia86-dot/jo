import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
let apiKey: string | undefined = undefined;

// Try retrieving from Vite environment (import.meta.env)
try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    apiKey = import.meta.env.VITE_API_KEY;
  }
} catch (e) {
  // Ignore
}

// Fallback to process.env (Node.js / Standard)
if (!apiKey) {
  try {
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY;
    }
  } catch (e) {
    // Ignore
  }
}

if (!apiKey) {
  console.warn("Gemini API Key is missing. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

export const extractActivitiesFromDoc = async (data: string, mimeType: string) => {
  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze the provided document data (which could be a school calendar, work schedule, or plan).
    Extract the main work activities for each month, specifically for the academic year starting from March 2025 to February 2026.
    
    Guidelines:
    1. Organize by month (3월, 4월, ... 1월, 2월).
    2. Ignore routine/daily tasks. Focus on key events, major reports, and deadlines.
    3. Return a JSON array.
  `;

  const parts: any[] = [];

  // Handle Text/CSV vs Binary/Base64
  // If the mimeType indicates text, we pass it as a text part to avoid base64 decoding issues in the model if it wasn't encoded.
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    parts.push({
      text: `DOCUMENT CONTENT:\n${data}`
    });
  } else {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: data
      }
    });
  }

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              month: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["month", "activities"]
          }
        }
      }
    });

    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};
