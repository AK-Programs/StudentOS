/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket as WSWebSocket } from 'ws';

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini SDK Client lazy setup
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

function sanitizeHistory(history: any[] = []): { role: 'user' | 'assistant'; content: string }[] {
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
async function generateAICompletion(systemInstruction: string, prompt: string, history: any[] = []): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const ai = getGoogleGenAI();

  const sanitizedHistory = sanitizeHistory(history);

  // 1. Parse Image Base64 from prompt if present
  let imageUrl: string | null = null;
  let cleanPrompt = prompt;

  const imageMatch = prompt.match(/Image Data: (data:(image\/[a-zA-Z+.-]+);base64,([A-Za-z0-9+/=\s\r\n]+))/);
  if (imageMatch) {
    imageUrl = imageMatch[1].trim();
    const mimeType = imageMatch[2];
    const base64Data = imageMatch[3].trim();
    
    // Replace the huge image base64 in prompt with a simple, clean placeholder
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


// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});



// Secure API endpoint for AI Teacher and Buddy conversations
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, history, persona, level, subject, mode } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Construct context based on chatbot Persona
  let systemInstruction = 'You are a supportive, encouraging study assistant.';
  
  if (persona === 'elara') {
    systemInstruction = `You are Professor Elara, a kind, highly analytical Mathematics and Science teacher. 
    You break complex equations into intuitive visuals. Talk to the student with encouragement and scientific clarity. 
    Focus on helping them understand the "why" behind the solutions. Current student level: ${level || 'Secondary'}.`;
  } else if (persona === 'ruby') {
    systemInstruction = `You are Dr. Ruby, an ultra-engaging, slightly strict but highly motivating Literature and History teacher. 
    You expect rigorous thought, structured essays, and deep criticism. Give them structured guidance and push them to excel. 
    Current student level: ${level || 'Secondary'}.`;
  } else if (persona === 'solara') {
    systemInstruction = `You are Coach Solara, an energetic Computer Science and practical applications instructor. 
    You explain coding in gaming or everyday concepts, use code blocks often, and advise on best development workflows. 
    Current student level: ${level || 'Secondary'}.`;
  } else if (persona === 'study_buddy') {
    systemInstruction = `You are StudentOS AI Buddy, a friendly peer study partner made by Naitik Kashyap. 
    You help with scheduling, summarize files, rewrite notes, and review quizzes. You use friendly emojis, study peer slang, and motivate!`;
  }

  // Inject learning style mode
  if (mode === 'socratic') {
    systemInstruction += '\n\nMETHOD: Socratic Method. Do NOT provide direct solutions. Instead, guide the student towards finding the answer by asking scaffolding questions and breaking down complexity step-by-step.';
  } else if (mode === 'explanatory') {
    systemInstruction += '\n\nMETHOD: Conceptual Explainer. Give comprehensive analogies, clear definitions, clear conceptual breakdowns of formulas or claims, and intuitive study summaries.';
  } else if (mode === 'coder') {
    systemInstruction += '\n\nMETHOD: Programming Coach. Format solutions with clean, well-commented code blocks, write concise variable maps, outline space/time complexities, and detail systematic debug recommendations.';
  } else if (mode === 'quiz_gen') {
    systemInstruction += '\n\nMETHOD: Knowledge Examiner / Quiz Mode. Propose one relevant, clear, challenging subject question or scenario and ask the student to solve it. Provide constructive evaluation, grade their answer, and award simulated performance feedback upon their feedback.';
  }

  try {
    const reply = await generateAICompletion(systemInstruction, prompt, history);
    return res.json({ text: reply });
  } catch (apiErr: any) {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!openRouterKey && !geminiKey) {
      const sanitized = sanitizeHistory(history);
      if (sanitized.length > 0) {
        const allUserTexts = [
          ...sanitized.filter(m => m.role === 'user').map(m => m.content),
          prompt
        ];
        const fullText = allUserTexts.join('\n');

        const nameMatch = fullText.match(/(?:my name is|i am|call me|name's)\s+([A-Za-z]+)/i);
        const detectedName = nameMatch ? nameMatch[1] : null;

        const subMatch = fullText.match(/(?:favourite|favorite|like|enjoy|studying|subject)\s+(?:subject\s+is\s+|is\s+|subject\s+)?([A-Za-z]+)/i);
        const detectedSubject = subMatch ? subMatch[1] : null;

        const p = prompt.toLowerCase();
        if (p.includes('my name') || p.includes('who am i') || p.includes('what is my name')) {
          if (detectedName) return res.json({ text: `Your name is **${detectedName}**!` });
          return res.json({ text: `You haven't told me your name yet! What should I call you?` });
        }

        if (p.includes('subject') && (p.includes('like') || p.includes('favourite') || p.includes('favorite') || p.includes('which'))) {
          if (detectedSubject) return res.json({ text: `Your favorite subject is **${detectedSubject}**!` });
          return res.json({ text: `You haven't mentioned your favorite subject yet! Is it Physics, Math, Chemistry, or Computer Science?` });
        }

        return res.json({
          text: `That makes sense! Let's build on that concept. Regarding **"${prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}"**, what specific part would you like to explore next?`
        });
      }

      // Initial greeting for brand-new blank thread only
      const fallbacks: { [key: string]: string } = {
        elara: `Greetings! I am Professor Elara. I'm excited to help you explore ${subject || 'Science & Math'}. What topic shall we dive into?`,
        ruby: `Welcome! I am Dr. Ruby. Let's analyze ${subject || 'Literature & History'} with academic rigor. What question do you have today?`,
        solara: `Hey there! Coach Solara here. Ready to tackle ${subject || 'Computer Science'} code and concepts? Ask away!`,
        study_buddy: `Hey buddy! 🚀 I'm your StudentOS AI Buddy. What are we studying today?`
      };

      return res.json({ 
        text: fallbacks[persona] || `I'm here to support you! Let's work on ${subject || 'this topic'} together. Ask me anything!`
      });
    }

    console.error('AI chat completions error:', apiErr);
    return res.status(500).json({ 
      error: 'Engine error', 
      details: apiErr.message,
      text: `[AI Connection Issue] I'm sorry, I hit a snag: ${apiErr.message}. Let me answer manually: Let's focus on studying ${subject || 'your course materials'} step-by-step. What specific question do you have?`
    });
  }
});


// Secure API endpoint for Orion Diagram Generator
app.post('/api/ai/diagram', async (req, res) => {
  const { query, type = 'diagram' } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const aiDiagram = getGoogleGenAI();
    if (!aiDiagram) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });
    
    let instructions = '';
    if (type === 'mindmap') {
      instructions = `Generate a structured MIND MAP on a 2D whiteboard.
- Place a central main topic node (type: "circle", larger radius like 60, centered at x: 400, y: 300) containing the main query text.
- Create 4-6 branch nodes (type: "circle" or "rect") placed in a circular pattern around the center (e.g., at angles like 0, 60, 120, 180, 240, 300 degrees, roughly 180px distance away from center).
- Connect each branch node to the center node with an arrow (type: "arrow", points: [startX, startY, endX, endY], where start is near center and end is near branch).
- Add descriptive short keyword texts near or inside each node.`;
    } else if (type === 'assistant') {
      instructions = `Generate a structured teaching outline LESSON BOARD.
- Draw a prominent heading banner at the top (type: "rect", x: 100, y: 50, width: 600, height: 60, fill: a nice theme color like "#312e81") with the title.
- Draw 3-4 side-by-step explanatory cards (type: "rect") placed vertically or in a clean horizontal grid.
- Inside or beside each card, add text blocks (type: "text") containing educational bullet points, insights, and key questions to ask students.`;
    } else {
      instructions = `Generate a standard educational VISUAL FLOWCHART or DIAGRAM.
- Draw steps or parts (type: "rect" or "circle" elements) representing components, stages, or timeline nodes.
- Connect sequential steps or parts with arrow elements (type: "arrow").
- Add clear text descriptions (type: "text") inside or directly above/below each component.`;
    }

    const prompt = `
You are an educational whiteboard generator.
Create a ${type.toUpperCase()} layout for: "${query}".

${instructions}

Allowed elements:
- "rect": { "type": "rect", "x": 100, "y": 100, "width": 100, "height": 50, "fill": "#312e81", "text": "Label" }
- "circle": { "type": "circle", "x": 100, "y": 100, "radius": 50, "fill": "#10b981", "text": "Label" }
- "text": { "type": "text", "x": 100, "y": 100, "text": "Label", "fill": "#ffffff", "fontSize": 16 }
- "arrow": { "type": "arrow", "points": [100, 100, 200, 200], "stroke": "#ffffff" }

Keep it simple. Return ONLY a valid JSON array of objects. Do not loop. Do not add markdown.
`;
    const response = await aiDiagram.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.25, maxOutputTokens: 1000 }
    });
    
    let text = response.text || "[]";
    text = text.replace(/^\`\`\`(json)?/m, '').replace(/\`\`\`$/m, '').trim();
    
    const elements = JSON.parse(text);
    return res.json({ elements });
  } catch (err: any) {
    console.error('[AI Server] Diagram error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Mermaid AI Diagram Generator Endpoint
app.post('/api/ai/mermaid', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ success: false, error: 'Query is required' });

  const qLower = String(query).toLowerCase();

  // Rich educational Mermaid fallback presets for common subjects
  let fallbackCode = `graph TD\n  Topic[${query}] --> Key1[Primary Mechanism]\n  Topic --> Key2[Core Observations]\n  Key1 --> Sub1[Practical Applications]\n  Key2 --> Sub2[Key Equations & Rules]`;

  if (qLower.includes("newton") || qLower.includes("motion") || qLower.includes("force")) {
    fallbackCode = `graph TD\n  Laws[Newton's Laws of Motion] --> L1[1st Law: Inertia]\n  Laws --> L2[2nd Law: F = m * a]\n  Laws --> L3[3rd Law: Action & Reaction]\n  L1 --> L1Ex[Objects resist state changes]\n  L2 --> L2Ex[Force equals mass times acceleration]\n  L3 --> L3Ex[Equal & opposite forces]`;
  } else if (qLower.includes("digest") || qLower.includes("stomach") || qLower.includes("gut")) {
    fallbackCode = `graph TD\n  Mouth[1. Mouth & Salivary Enzymes] --> Esophagus[2. Esophagus Peristalsis]\n  Esophagus --> Stomach[3. Stomach Acid Breakdown]\n  Stomach --> SmallInt[4. Small Intestine Nutrient Absorption]\n  SmallInt --> LargeInt[5. Large Intestine Water Reabsorption]\n  LargeInt --> Excretion[6. Waste Elimination]`;
  } else if (qLower.includes("circulat") || qLower.includes("heart") || qLower.includes("blood")) {
    fallbackCode = `graph LR\n  VenaCava[Vena Cava] --> RightAtrium[Right Atrium]\n  RightAtrium --> RightVentricle[Right Ventricle]\n  RightVentricle -->|Pulmonary Artery| Lungs[Lungs - Oxygenation]\n  Lungs -->|Pulmonary Vein| LeftAtrium[Left Atrium]\n  LeftAtrium --> LeftVentricle[Left Ventricle]\n  LeftVentricle -->|Aorta| Body[Body Tissues]`;
  } else if (qLower.includes("photosynthes") || qLower.includes("plant energy")) {
    fallbackCode = `mindmap\n  root((Photosynthesis Process))\n    Light Reactions\n      Sunlight Absorption\n      H2O Splitting\n      O2 Release\n    Calvin Cycle\n      CO2 Fixation\n      Glucose Synthesis`;
  } else if (qLower.includes("water") && qLower.includes("cycle")) {
    fallbackCode = `graph TD\n  Ocean[Oceans & Lakes] -->|Evaporation| Vapor[Water Vapor]\n  Trees[Vegetation] -->|Transpiration| Vapor\n  Vapor -->|Condensation| Clouds[Cloud Formation]\n  Clouds -->|Precipitation| Rain[Rain & Snow]\n  Rain -->|Surface Runoff| Ocean`;
  } else if (qLower.includes("algorithm") || qLower.includes("flow") || qLower.includes("code")) {
    fallbackCode = `graph TD\n  Start([Start]) --> Input[/Read Input Data/]\n  Input --> Check{Is Condition Valid?}\n  Check -->|Yes| Exec[Execute Calculation]\n  Check -->|No| HandleErr[Trigger Error Handler]\n  Exec --> Output[/Return Result/]\n  Output --> End([End])`;
  } else if (qLower.includes("timeline") || qLower.includes("history")) {
    fallbackCode = `timeline\n  title Academic Timeline: ${query}\n  Phase 1 : Discovery & Formulation\n  Phase 2 : Peer Verification & Testing\n  Phase 3 : Real-World Application`;
  }

  try {
    const aiGen = getGoogleGenAI();
    if (aiGen) {
      const prompt = `
You are an educational diagram author.
Generate a valid Mermaid.js diagram for: "${query}".

Keep it strictly factual and use specific terminology for the topic.
Format: graph TD, mindmap, or sequenceDiagram.
Return ONLY raw Mermaid code. No markdown. No loops. Keep it simple and precise.
`;
      const response = await aiGen.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.2, maxOutputTokens: 800 }
      });

      let code = response.text || "";
      code = code.replace(/^\`\`\`(mermaid)?/m, '').replace(/\`\`\`$/m, '').trim();
      if (code) {
        return res.json({ success: true, mermaid: code, code, title: query });
      }
    }

    return res.json({ success: true, mermaid: fallbackCode, code: fallbackCode, title: query });
  } catch (err: any) {
    console.error('[AI Server] Mermaid error:', err);
    return res.json({
      success: false,
      error: err.message || 'Error generating diagram',
      mermaid: fallbackCode,
      code: fallbackCode,
      title: query
    });
  }
});

// Educational SVG Diagram Generator Endpoint
app.post('/api/ai/svg-diagram', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { query, subject = 'general' } = req.body || {};
  if (!query) return res.status(400).json({ success: false, error: 'Query is required' });

  const qLower = String(query).toLowerCase();

  // High-fidelity Educational SVG Fallback Presets
  let fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
    <rect width="600" height="450" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <text x="300" y="45" fill="#818cf8" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">${query.toUpperCase()}</text>
    <rect x="50" y="100" width="220" height="130" rx="12" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/>
    <text x="160" y="165" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">Primary Structure</text>
    <rect x="330" y="100" width="220" height="130" rx="12" fill="#064e3b" stroke="#10b981" stroke-width="2.5"/>
    <text x="440" y="165" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">Secondary Reaction</text>
    <path d="M 270 165 L 330 165" stroke="#f59e0b" stroke-width="4"/>
    <text x="300" y="150" fill="#f59e0b" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">Energy</text>
    <rect x="190" y="280" width="220" height="110" rx="12" fill="#831843" stroke="#ec4899" stroke-width="2.5"/>
    <text x="300" y="340" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">Result / Function</text>
  </svg>`;

  if (qLower.includes('heart') || qLower.includes('circulat')) {
    fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="300" y="40" fill="#f43f5e" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">HUMAN HEART ANATOMY</text>
      <!-- Left & Right Atrium/Ventricles -->
      <rect x="140" y="90" width="150" height="130" rx="12" fill="#881337" stroke="#f43f5e" stroke-width="3"/>
      <text x="215" y="155" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Right Atrium</text>
      <rect x="310" y="90" width="150" height="130" rx="12" fill="#1e1b4b" stroke="#6366f1" stroke-width="3"/>
      <text x="385" y="155" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Left Atrium</text>
      <rect x="140" y="240" width="150" height="140" rx="12" fill="#9f1239" stroke="#fb7185" stroke-width="3"/>
      <text x="215" y="315" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Right Ventricle</text>
      <rect x="310" y="240" width="150" height="140" rx="12" fill="#312e81" stroke="#818cf8" stroke-width="3"/>
      <text x="385" y="315" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Left Ventricle</text>
      <path d="M 215 220 L 215 240" stroke="#fda4af" stroke-width="4"/>
      <path d="M 385 220 L 385 240" stroke="#c7d2fe" stroke-width="4"/>
      <text x="300" y="420" fill="#94a3b8" font-size="13" text-anchor="middle" font-family="sans-serif">Deoxygenated (Blue/Red) vs Oxygenated (Purple/Indigo) Blood Flow</text>
    </svg>`;
  } else if (qLower.includes('cell')) {
    fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="300" y="40" fill="#10b981" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">CELL BIOLOGY STRUCTURE</text>
      <!-- Cell Membrane & Organelles -->
      <ellipse cx="300" cy="240" rx="240" ry="160" fill="#064e3b" stroke="#10b981" stroke-width="4" opacity="0.8"/>
      <circle cx="280" cy="220" r="65" fill="#312e81" stroke="#818cf8" stroke-width="3"/>
      <text x="280" y="225" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Nucleus (DNA)</text>
      <ellipse cx="140" cy="280" rx="35" ry="20" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
      <text x="140" y="285" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Mitochondria</text>
      <ellipse cx="440" cy="200" rx="40" ry="22" fill="#78350f" stroke="#f59e0b" stroke-width="2"/>
      <text x="440" y="205" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Vacuole</text>
      <text x="300" y="425" fill="#94a3b8" font-size="13" text-anchor="middle" font-family="sans-serif">Eukaryotic Cell Membrane & Organelle Scaffold</text>
    </svg>`;
  } else if (qLower.includes('circuit') || qLower.includes('voltage')) {
    fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <rect width="600" height="450" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
      <text x="300" y="40" fill="#f59e0b" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">ELECTRICAL CIRCUIT DIAGRAM</text>
      <path d="M 120 120 L 480 120 L 480 340 L 120 340 Z" fill="none" stroke="#f59e0b" stroke-width="4"/>
      <!-- Battery -->
      <rect x="80" y="200" width="80" height="60" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/>
      <text x="120" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Battery (V)</text>
      <!-- Resistor -->
      <rect x="250" y="100" width="100" height="40" fill="#064e3b" stroke="#10b981" stroke-width="3"/>
      <text x="300" y="125" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Resistor (R)</text>
      <!-- Switch -->
      <circle cx="300" cy="340" r="8" fill="#ef4444"/>
      <text x="300" y="375" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Switch (S)</text>
    </svg>`;
  }

  try {
    const aiGen = getGoogleGenAI();
    if (aiGen) {
      const prompt = `
You are an expert educational illustrator for classroom whiteboards.
Generate a valid, visually detailed inline SVG diagram for subject "${subject}", topic: "${query}".

SPECIFICATIONS:
- Width: 600, Height: 450, viewBox="0 0 600 450"
- Dark mode theme: background fill="#0f172a" with crisp stroke colors (#818cf8, #34d399, #f59e0b, #ec4899, #38bdf8, #fbbf24, #f472b6, #a78bfa).
- Include clear, legible labels with <text> tags using font-family="sans-serif", font-weight="bold".
- Draw key anatomy/components (circles, paths, rects) accurately representing the requested educational topic (e.g. Heart, Plant Cell, Brain, Respiratory, Digestive, Lever, Pulley, Circuit, Optics, Atom, Water Cycle, Volcano, Coordinate Plane, Solar System, Neuron, DNA, Eye, Ear, Battery, Motor, Generator, Bridge, Machine).
- Use proper scientific structures, not random shapes. Make it look like a textbook diagram.
- Return ONLY the raw <svg>...</svg> string. Do NOT wrap in markdown or backticks. Do NOT include XML declarations like <?xml...>. Do NOT add any extra text or HTML. Just the <svg> tag.
`;
      const response = await aiGen.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 1500 }
      });

      let svg = response.text || "";
      svg = svg.replace(/^\`\`\`(xml|svg)?/m, '').replace(/\`\`\`$/m, '').trim();
      if (svg.includes('<svg')) {
        return res.json({ success: true, svg, title: query, subject });
      }
    }

    return res.json({ success: true, svg: fallbackSvg, title: query, subject });
  } catch (err: any) {
    console.error('[AI Server] SVG Diagram error:', err);
    return res.json({
      success: false,
      error: err.message || 'Error generating SVG diagram',
      svg: fallbackSvg,
      title: query,
      subject
    });
  }
});

app.post('/api/ai/search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const tavilyKey = process.env.VITE_TAVILY_API_KEY || process.env.TAVILY_API_KEY || '';
  
  // 1. LOG: Tavily key detected
  console.log(`[AI Server] Tavily key detected: ${tavilyKey ? 'YES' : 'NO'}`);

  if (!tavilyKey) {
    console.error('[AI Server] Search error: Tavily API Key is not configured on the server.');
    return res.status(400).json({ error: 'Tavily API Key is not configured on the server. Unable to process real-time web search.' });
  }

  let searchResultsList: { title: string; description: string; uri: string; published_source?: string }[] = [];
  let summaryText = '';

  try {
    let rawResults: any[] = [];

    // 2. LOG: Tavily request sent
    console.log(`[AI Server] Tavily request sent for query: "${query}"`);
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query,
        search_depth: "basic",
        max_results: 5
      })
    });

    // 3. LOG: Tavily response received
    console.log(`[AI Server] Tavily response received with status: ${response.status}`);

    if (response.ok) {
      const responseData = await response.json();
      rawResults = responseData.results || [];
    } else {
      const errText = await response.text();
      console.error(`[AI Server] Search error: Tavily API request failed with status ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: `Tavily API failed: ${errText}` });
    }

    if (rawResults.length > 0) {
      searchResultsList = rawResults.map((item) => {
        const title = item.title || 'Educational Resource';
        const uri = item.url || '';
        const description = item.content || item.snippet || 'Real-time learning material and online documentation.';
        let published_source = '';
        if (uri) {
          try {
            published_source = new URL(uri).hostname.replace('www.', '');
          } catch (_) {}
        }
        if (!published_source) published_source = 'Verified Source';

        return { title, description, uri, published_source };
      });
      
      // 4. LOG: Search results rendered
      console.log(`[AI Server] Search results rendered for query: "${query}". Found ${searchResultsList.length} references.`);
    } else {
      console.warn(`[AI Server] Search error: Tavily returned empty results for query "${query}".`);
      return res.status(404).json({ error: 'No search results found on Tavily.' });
    }

    // Synthesis academic summary strictly from findings
    const summaryContext = searchResultsList.map((s, i) => `[Source ${i+1}]: ${s.title} (${s.uri}) - ${s.description}`).join('\n');
    const summarizerAi = getGoogleGenAI();
    if (summarizerAi) {
      summaryText = await generateAICompletion(
        "You are Orion Search summarizer. Synthesize a 3-4 sentence comprehensive, factual academic summary. Refer only to facts from the provided sources. Do not make up any facts.",
        `Based strictly on the following live web search findings, write a beautifully structured educational summary for the query "${query}":\n\n${summaryContext}`
      );
    } else {
      summaryText = `Academic synthesis of "${query}": Live search returned matching reference channels. We have compiled a curriculum list below covering theoretical methodologies, formula frameworks, and verified practice exercises.`;
    }

  } catch (err: any) {
    // 5. LOG: Search errors logged
    console.error('[AI Server] Search error: Execution failure:', err);
    return res.status(500).json({ error: `Search execution failure: ${err.message}` });
  }

  return res.json({
    summary: summaryText,
    results: searchResultsList
  });
});

app.post('/api/ai/notes', async (req, res) => {
  const { content, action, instruction } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  let systemInstruction = 'You are a supportive, high-achieving academic writing companion.';
  let userPrompt = '';

  if (action === 'summarize') {
    systemInstruction = 'You are a meticulous scientific editor. Synthesize the provided text into a beautifully structured, highly readable bulleted cheat-sheet. Highlight key definitions in bold.';
    userPrompt = `Please summarize this note section: \n\n"${content}"`;
  } else if (action === 'expand') {
    systemInstruction = 'You are a supportive professor. Deeply expand of the concepts inside the text, write concrete examples, analogies, and detailed clarifications to help the student master the concept.';
    userPrompt = `Please expand and explain this text block: \n\n"${content}"`;
  } else if (action === 'improve') {
    systemInstruction = 'You are an elite academic copywriter. Proofread, fix grammar mistakes, and rewrite the provided block to make it flow beautifully while retaining all of its hard factual and technical data.';
    userPrompt = `Please proofread and rewrite this text block cleanly: \n\n"${content}"`;
  } else if (action === 'quiz') {
    systemInstruction = 'You are an evaluation expert. Design a high-yield Active Recall quiz comprising 3 challenging multiple-choice or short answer conceptual questions based strictly on the text provided. ALWAYS include an answer key at the bottom.';
    userPrompt = `Generate a quiz about this text content: \n\n"${content}"`;
  } else if (action === 'action_items') {
    systemInstruction = 'You are a productivity organizer. Scan the provided content, extract any clear actionable items, homework commitments, objectives, or tasks, and format them as a clean Markdown checkbox checklist (e.g. - [ ] Task).';
    userPrompt = `Extract action checklist notes from this text block: \n\n"${content}"`;
  } else if (action === 'generate_notes') {
    systemInstruction = 'You are an elite AI Teacher generating beautifully structured, highly detailed, exam-focused lecture notes. Produce comprehensive academic content with concepts, definitions, formulas, a summary, important questions, and revision points. Never provide a single line response.';
    userPrompt = `Topic: "${content}"\nGenerate the complete lecture notes.`;
  } else if (action === 'custom') {
    systemInstruction = instruction || 'You are an academic drafting robot.';
    userPrompt = content;
  } else {
    // Custom prompt instruction
    systemInstruction = 'You are an academic drafting robot. Execute the user instruction meticulously on the provided text, formatting the returned response inside clean Markdown blocks.';
    userPrompt = `Text to transform:\n"${content}"\n\nInstruction to execute on this text:\n"${instruction || 'Summarize'}"`;
  }

  try {
    const text = await generateAICompletion(systemInstruction, userPrompt);
    return res.json({ text });
  } catch (apiErr: any) {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!openRouterKey && !geminiKey) {
      // Elegant simulated fallback response
      const fallbacks: { [key: string]: string } = {
        summarize: `### 🤖 Summary Concept Map (Offline Simulation)\n- **Essential Focus**: The provided text block covers core learning modules and academic criteria.\n- **Optimized Synthesis**: Keep study schedules balanced with focused review blocks.`,
        expand: `### 🤖 Detailed Conception Breakdown\n*Let me expand this off-line. Imagine these terms are the key pillars of a cathedral...*\n\n1. **First Principle**: Always identify the foundation concepts first.\n2. **Secondary Support**: Establish secure feedback loops so that any discrepancies are corrected quickly.`,
        improve: `*Polished study note draft:* Maintain consistent notes review circles to secure top marks and build collaborative team projects.`,
        quiz: `### 🧠 3-Question Active Comprehension Quiz\n1. Explain the primary bottleneck mentioned in the provided text.\n2. How would you solve for the boundary constraints in standard exam settings?\n3. List two study habits that improve active recall stability.`,
        action_items: `- [ ] 🎯 Review previous class session summaries\n- [ ] 🧪 Complete relevant laboratory exercises\n- [ ] 📚 Organize upcoming team study chapters`,
        generate_notes: `### 📚 Lecture Notes: ${content.substring(0, 30)}...\n\n**1. Key Concepts**\n- Core Definition: Essential principles underlying the topic.\n- Mechanics: How these principles interact dynamically.\n\n**2. Important Formulas & Frameworks**\n- E = mc² (Standard model example)\n- $f(x) = y$ (Function mapping)\n\n**3. Summary & Revision**\n- Keep a checklist of these concepts.\n- Review daily for maximum retention.`
      };

      return res.json({
        text: fallbacks[action] || `*Processed Custom Action*:\n\nExecuted user prompt: "${instruction}" on content successfully! (Configure an API Key in your Secrets panel to enable production-grade AI synthesis).`
      });
    }

    console.error('AI notes transform error:', apiErr);
    return res.status(500).json({
      error: 'Engine transformation error',
      details: apiErr.message,
      text: `*Offline Fallback Note Transformation*\n\n**Processed Action**: ${action.toUpperCase()}\n\nHere is a clean summary of your key text segment regarding this topic: We identified critical learning objectives, formula constraints, and student evaluations.`
    });
  }
});

// Secure API endpoint for Material Hub AI actions
app.post('/api/ai/material-action', async (req, res) => {
  const { title, description, content, action, userQuestion } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Material Title is required' });
  }

  let systemInstruction = 'You are an elite academic consultant and expert teacher.';
  let userPrompt = `Material Title: "${title}"\nDescription: "${description || 'None'}"\nRaw Content / Context: "${content || 'None'}"\n\n`;

  if (action === 'summarize') {
    systemInstruction = 'You are a professional educational summarizer. Generate a beautiful, concise HTML/Markdown-ready executive summary of this material. Highlight central objectives, key terms in bold, and bulleted takeaways.';
    userPrompt += `Action: Generate an elegant study summary of this material.`;
  } else if (action === 'quiz') {
    systemInstruction = 'You are a test-design expert. Generate 3 high-yield Multiple Choice Questions based on this material. Formulate them cleanly with choices A, B, C, D and provide detailed answers/explanations at the end.';
    userPrompt += `Action: Create a 3-question evaluation quiz complete with explanation scaffolds.`;
  } else if (action === 'explain') {
    systemInstruction = 'You are a brilliant intuitive teacher. Break down this topic to its absolute basics. Use memorable analogies, paint intuitive pictures, and design a step-by-step conceptual walkthrough.';
    userPrompt += `Action: Explain this chapter clearly and deeply with examples.`;
  } else if (action === 'revision') {
    systemInstruction = 'You are a study efficiency expert. Create a modular, highly compact set of revision notes. Organize by key formulas, definitions, fast checklists, and high-frequency active recall memory triggers.';
    userPrompt += `Action: Build a high-yield revision sheet.`;
  } else if (action === 'questions') {
    systemInstruction = 'You are an examiner. Generate 3 highly important theoretical or analytical questions likely to appear in midterm/final school syllabus tests. Include scoring metrics, difficulty tags, and structured model solutions.';
    userPrompt += `Action: Identify critical exam questions.`;
  } else if (action === 'ask') {
    systemInstruction = 'You are a dedicated AI Subject Professor. Answer the student\'s specific question directly, using the provided material content as your immediate educational context.';
    userPrompt += `Student Question: "${userQuestion || 'Explain this material'}"`;
  }

  try {
    const text = await generateAICompletion(systemInstruction, userPrompt);
    return res.json({ text });
  } catch (apiErr: any) {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!openRouterKey && !geminiKey) {
      // Elegant fallbacks
      const simulatedFallbacks: { [key: string]: string } = {
        summarize: `### 📚 Study Summary: ${title}
This is an elegant simulated study guide of the material **"${title}"** (to activate premium real-time AI responses, please configure an API key in key Settings).

#### 🎯 Key Learning Objectives
1. Understand the core principles governing **${title}**.
2. Outline key components and relationships within the syllabus.
3. Apply standard concepts to solve active analytical problems.

#### 📝 Executive Core Takeaways
- **First Principle**: Systematic study tracking boosts memory retention rates.
- **Critical Model**: A balanced visual analogy simplifies textbook terminology.
- **Practical Application**: Use active recall quizzes to evaluate subject mastery regularly.`,
        quiz: `### 🧠 Active Recall Quiz: ${title}
This is a simulated multiple choice evaluation (configure an API key to generate dynamic infinite quizzes based on customized files).

#### Q1: What is the main objective of studying "${title}"?
- A) Memorizing definitions blindly without understanding.
- B) Formulating a structured understanding of its underlying rules and applications.
- C) Postponing homework assignments until the exam eve.
- D) Only studying when teachers provide external rewards.
*Correct Answer: **B**. Section masteries depend on structured understanding of fundamental rules.*

#### Q2: What is a critical study method recommended for this topic?
- A) Sleeping with the textbook under your pillow.
- B) Group study chat with completely non-scholastic discussions.
- C) Active recall testing, spaced repetition, and summarizing ideas.
- D) Ignoring teacher-verified guidelines.
*Correct Answer: **C**. Active recall and spaced retrieval are scientifically proven to enhance synaptic storage pathways.*`,
        explain: `### 📖 Conceptual Explainer: ${title}
Let's break down the concepts in **"${title}"** using an intuitive analogy (to enable custom explanations, please activate an API key).

#### 🌁 The Analogy
Think of **${title}** like an architect planning a high-rise building. You cannot start by hanging windows on the 40th floor (complex homework). You must first reinforce the foundational concrete piles deep into the soil (core basics), build the columns (categories), and frame the floors (subject divisions). 

#### 🪜 Step-by-Step Breakdown
1. **The Core Input**: Start with primitive definitions and simple formula patterns.
2. **Intermediate Coupling**: Connect individual rules to see how they govern composite states.
3. **Synthesis & Mastery**: Apply the rules to solve complex questions autonomously.`,
        revision: `### 📚 Revision Sheet: ${title}
A compact checklist of the most important concepts to review before tests:

- **Key Concept 1**: Always establish clean baseline values before taking measurements.
- **Key Formula**: $f(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$ (conceptual study maps).
- **Active Recall Check**: Can you explain the main difference between theoretical models and real-life experimental variables?
- **Pro-Tip**: Look for **✅ Teacher Verified** icons in your Material Hub feed for high-yield exam material!`,
        questions: `### 🎯 Important Exam Questions: ${title}
Anticipated examination questions with structured model answers:

#### Question 1 (Theoretical - 5 Marks)
Analyze the primary structural benefits of integrating a centralized Material Hub inside a school ecosystem.
*Model Answer Highlights*: A unified hub creates a structured, peer-collaborative digital archive that bridges student community contributions with official teacher verifications, updating point distributions atomically to encourage high-quality work.

#### Question 2 (Analytical - 10 Marks)
How do visibility target constraints (restricted grades, sections, or houses) preserve secure and safe information flow?
*Model Answer Highlights*: Restricting files to targeted classes prevents cognitive overload for younger grades, shields private study notes resources, and directs specific house study materials safely.`
      };

      return res.json({
        text: simulatedFallbacks[action] || `### 🤖 AI Response Simulated\n\nAnswer to your custom question about **"${title}"**: ${userQuestion || 'Please configure your official API Key inside Settings to access real-time interactive chats.'}`
      });
    }

    console.error('AI material action error:', apiErr);
    return res.status(500).json({
      error: 'Engine error during material analysis',
      details: apiErr.message,
      text: `### ⚠️ [AI Engine Offline] fallback simulation\n\n*Unable to complete real-time processing: ${apiErr.message}*\n\nHere is a simulated educational output for your material: **${title}**.\n\nPlease check your API_KEY settings to activate production-grade responses.`
    });
  }
});

// ============================================================
// Database Setup Endpoint — returns the setup SQL file content
// Admins can copy-paste this into the Supabase SQL Editor (one-time setup)
// ============================================================
app.get('/api/admin/setup-sql', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(process.cwd(), 'supabase', 'setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    res.type('text/plain').send(sql);
  } catch (err: any) {
    res.status(500).json({ error: 'Could not read setup SQL: ' + err.message });
  }
});

// ============================================================
// Auth Callback Endpoint for popup-based Google OAuth flow
// ============================================================
app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Completing Authentication</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #020617;
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .box {
            text-align: center;
            padding: 2rem;
            border-radius: 12px;
            background-color: #0f172a;
            border: 1px solid #1e293b;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            max-width: 400px;
          }
          h1 { font-size: 1.5rem; margin-top: 0; margin-bottom: 0.5rem; color: #38bdf8; }
          p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>StudentOS Authenticating</h1>
          <p>Writing session credentials... This window will close automatically.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'SUPABASE_AUTH_SUCCESS',
              hash: window.location.hash,
              search: window.location.search
            }, '*');
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

let globalChatsState: any[] = [];
let globalAnnouncementsState: any[] = [];
let globalHomeworkState: any[] = [];

// Configure Vite middleware in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudentOS Back-end Server running on port ${PORT}`);
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[WS Server] New client linked!');
    
    // Sync state immediately upon linking
    ws.send(JSON.stringify({
      type: 'sync:state',
      state: {
        chats: globalChatsState,
        announcements: globalAnnouncementsState,
        homework: globalHomeworkState
      }
    }));

    ws.on('message', (messageBuffer) => {
      try {
        const rawMessage = messageBuffer.toString();
        if (!rawMessage || rawMessage === 'undefined') return;
        const payload = JSON.parse(rawMessage);
        
        switch (payload.type) {
          case 'chat:send': {
            const chatMsg = payload.chat;
            if (chatMsg) {
              if (!globalChatsState.some(c => c.id === chatMsg.id)) {
                globalChatsState.push(chatMsg);
                if (globalChatsState.length > 200) globalChatsState.shift();
              }
              // Broadcast to all linked clients (including the sender)
              wss.clients.forEach((client) => {
                if (client.readyState === WSWebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'chat:received',
                    chat: chatMsg
                  }));
                }
              });
            }
            break;
          }

          case 'announcement:send': {
            const announcement = payload.announcement;
            if (announcement) {
              if (!globalAnnouncementsState.some(a => a.id === announcement.id)) {
                globalAnnouncementsState.unshift(announcement);
                if (globalAnnouncementsState.length > 50) globalAnnouncementsState.pop();
              }
              wss.clients.forEach((client) => {
                if (client.readyState === WSWebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'announcement:received',
                    announcement
                  }));
                }
              });
            }
            break;
          }

          case 'homework:send': {
            const homework = payload.homework;
            if (homework) {
              if (!globalHomeworkState.some(h => h.id === homework.id)) {
                globalHomeworkState.unshift(homework);
                if (globalHomeworkState.length > 50) globalHomeworkState.pop();
              }
              wss.clients.forEach((client) => {
                if (client.readyState === WSWebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'homework:received',
                    homework
                  }));
                }
              });
            }
            break;
          }

          case 'homework:update': {
            const homework = payload.homework;
            if (homework) {
              globalHomeworkState = globalHomeworkState.map(h => h.id === homework.id ? homework : h);
              wss.clients.forEach((client) => {
                if (client.readyState === WSWebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'homework:updated',
                    homework
                  }));
                }
              });
            }
            break;
          }

          case 'whiteboard:draw': {
            // Broadcast drawing event to all other clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WSWebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'whiteboard:drawing',
                  data: payload.data
                }));
              }
            });
            break;
          }

          case 'whiteboard:clear': {
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WSWebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'whiteboard:cleared'
                }));
              }
            });
            break;
          }

          case 'whiteboard:drawShape': {
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WSWebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'whiteboard:drawing',
                  data: {
                    type: payload.data.shape === 'circle' ? 'shape:circle' : payload.data.shape === 'rect' ? 'shape:rect' : 'draw',
                    x: payload.data.cx,
                    y: payload.data.cy,
                    radius: payload.data.r,
                    w: payload.data.r * 2,
                    h: payload.data.r * 2,
                    color: payload.data.color,
                    size: payload.data.size,
                    tool: 'pen'
                  }
                }));
              }
            });
            break;
          }
        }
      } catch (err) {
        console.error('[WS Server] Failed to process incoming message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WS Server] Client unlinked.');
    });
  });
}


if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

