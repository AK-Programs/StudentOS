import { GoogleGenAI } from '@google/genai';

export async function clientSideGemini(prompt: string): Promise<string> {
  const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY is missing. Please add it to your environment variables for static deployments.');
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || '';
  } catch (err: any) {
    console.error("Client-side Gemini execution failed:", err);
    throw err;
  }
}
