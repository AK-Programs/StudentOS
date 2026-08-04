import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiInstance: GoogleGenAI | null = null;

export function getGoogleGenAI(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return aiInstance;
  } catch (err) {
    console.error('Failed to initialize Gemini SDK Client:', err);
    return null;
  }
}

export function sanitizeHistory(history: any[] = []): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  const filtered = history.filter(
    h => h && typeof h.content === 'string' && h.content.trim().length > 0
  );
  if (filtered.length === 0) return [];

  const sanitized: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const msg of filtered) {
    const role: 'user' | 'assistant' =
      msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';

    if (sanitized.length === 0) {
      sanitized.push({ role, content: msg.content.trim() });
    } else {
      const last = sanitized[sanitized.length - 1];
      if (last.role === role) {
        last.content += '\n' + msg.content.trim();
      } else {
        sanitized.push({ role, content: msg.content.trim() });
      }
    }
  }

  return sanitized;
}

/**
 * Universal AI completions provider supporting OpenRouter and local native Gemini SDK.
 */
export async function generateAICompletion(systemInstruction: string, prompt: string, history: any[] = []): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const ai = getGoogleGenAI();

  const sanitizedHistory = sanitizeHistory(history);

  // 1. Parse Image Base64 from prompt if present
  let imageUrl: string | null = null;
  let cleanPrompt = prompt;

  const imageMatch = prompt.match(/Image Data: (data:(image\/[a-zA-Z+.-]+);base64,([A-Za-z0-9+/=\s\r\n]+))/);
  if (imageMatch) {
    imageUrl = imageMatch[1].trim();
    cleanPrompt = prompt.replace(/Image Data: data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=\s\r\n]+/, '[See attached diagram/image]');
  }

  // 2. Detect any file or attachment in prompt
  const hasAttachments = 
    prompt.includes('[Attached Document:') || 
    prompt.includes('[Attached Diagram/Image:') ||
    prompt.includes('.pdf') ||
    prompt.includes('.docx') ||
    prompt.includes('.pptx') ||
    prompt.includes('.ppt') ||
    prompt.includes('.txt') ||
    prompt.includes('.csv') ||
    prompt.includes('.json') ||
    prompt.includes('.md') ||
    imageUrl !== null;

  if (openRouterKey) {
    try {
      let model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
      if (hasAttachments) {
        model = "google/gemini-2.5-flash";
        console.log(`[AI Server] Attachment detected. Overriding OpenRouter model to "${model}" for rich, high-context document understanding.`);
      } else {
        console.log(`[AI Server] Directing API request to OpenRouter using model "${model}"...`);
      }
      
      const messages = [
        { role: 'system', content: systemInstruction },
        ...sanitizedHistory.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        { 
          role: 'user', 
          content: imageUrl 
            ? [
                { type: 'text', text: cleanPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            : cleanPrompt
        }
      ];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://ai.studio/build',
          'X-Title': 'StudentOS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error (status ${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return text;
      }
      throw new Error('Empty response message content returned from OpenRouter.');
    } catch (err: any) {
      console.warn(`[AI Server] OpenRouter request failed, fallback to native Gemini SDK client if available. Error:`, err.message || err);
    }
  }

  if (ai) {
    const contentsList: any[] = [];
    
    let startIdx = 0;
    if (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'assistant') {
      contentsList.push({
        role: 'user',
        parts: [{ text: `[Prior Tutor Context]: ${sanitizedHistory[0].content}` }]
      });
      startIdx = 1;
    }

    for (let i = startIdx; i < sanitizedHistory.length; i++) {
      const msg = sanitizedHistory[i];
      contentsList.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    if (imageUrl) {
      const rawBase64 = imageUrl.split(';base64,')[1];
      const mimeType = imageUrl.split(';base64,')[0].replace('data:', '');
      
      contentsList.push({
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeType, data: rawBase64 } },
          { text: cleanPrompt }
        ]
      });
    } else {
      contentsList.push({
        role: 'user',
        parts: [{ text: cleanPrompt }]
      });
    }

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash'
    ];
    
    let lastError = null;
    for (const modelName of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Server] Invoking native Gemini SDK ${modelName} (Attempt ${attempt}/2) with ${imageUrl ? 'multimodal' : 'text'} payload...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentsList,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            }
          });
          if (response && response.text) {
            return response.text;
          }
        } catch (err: any) {
          console.warn(`[AI Server] Model ${modelName} failed on attempt ${attempt}:`, err.message || err);
          lastError = err;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        }
      }
    }
    throw lastError || new Error('All model fallback queries exhausted in native Gemini SDK.');
  }

  throw new Error('No AI Provider available. Please configure OPENROUTER_API_KEY or GEMINI_API_KEY inside the Secrets panel.');
}
