import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getAIClient(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AI Client] GEMINI_API_KEY is not set. AI features will be disabled.');
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[AI Client] Successfully initialized GoogleGenAI client.');
    return aiInstance;
  } catch (err: any) {
    console.error('[AI Client] Failed to initialize Gemini SDK Client. Stack trace:\n', err.stack || err);
    return null;
  }
}
