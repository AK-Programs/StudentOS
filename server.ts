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

/**
 * Universal AI completions provider supporting OpenRouter and local native Gemini SDK.
 */
async function generateAICompletion(systemInstruction: string, prompt: string, history: any[] = []): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const ai = getGoogleGenAI();

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
        // Route to multimodal Gemini 2.5 Flash for PDF/Image/DOCX/PPT/TXT
        model = "google/gemini-2.5-flash";
        console.log(`[AI Server] Attachment detected. Overriding OpenRouter model to "${model}" for rich, high-context document understanding.`);
      } else {
        console.log(`[AI Server] Directing API request to OpenRouter using model "${model}"...`);
      }
      
      const safeHistory = Array.isArray(history) ? history : [];
      const messages = [
        { role: 'system', content: systemInstruction },
        ...safeHistory.map((msg: any) => ({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content || msg.text || ''
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
    const safeHistory = Array.isArray(history) ? history : [];
    
    safeHistory.forEach((msg: any) => {
      contentsList.push({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content || msg.text || '' }]
      });
    });

    if (imageUrl) {
      // Extract the raw base64 data without data:image/... prefix for native Gemini SDK
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
      // Elegant fallback simulation when running without an API key configured yet
      const fallbacks: { [key: string]: string } = {
        elara: `Excellent inquiry! In ${subject || 'Mathematics'}, we always identify our given inputs first. Let's form a logical hypothesis. Since my backend Gemini connection requires a secure API key in AI Studio settings, I am currently simulating responses. But here is the principle: break any complex problem down to its core formulas!`,
        ruby: `Structured thinking is the sovereign of good scholarship! To excel in this subject, you must support your claims with textual evidence. In standard analysis, outline your thesis, compose body paragraphs with quotes, and deliver a convincing conclusion. (Set up your API Key in the Secrets panel to fully unlock my intelligence!)`,
        solara: `Whoa! That's a classic code query. The key is structural debugging: trace your variables, ensure you don't mutate state directly, and make your components modular! I'd love to write full code snippets for you — just declare my API Key in your workspace Secrets panel to get started!`,
        study_buddy: `Hey buddy! 🚀 That sounds like a cool topic. Let's tackle this assignment together! Although my full AI brains are waiting for an API Key, I can help you outline this, organize your Tasks checklist, or start a 25-minute Pomodoro focus stream! Let's crush this!`
      };

      return res.json({ 
        text: fallbacks[persona] || `I'm here to support you! Let's work on ${subject || 'this topic'} together. Please verify your API Key is configured in your settings panel to enable interactive feedback.`
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


// Secure API endpoint for Orion Web Grounding & Research search

app.post('/api/ai/diagram', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const aiDiagram = getGoogleGenAI();
    if (!aiDiagram) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });
    
    const prompt = `
You are an expert educational diagram generator. 
The user wants a diagram for: "${query}". (e.g. Solar System, Food Chain, Mind Map, Flowchart).
Generate a JSON array of graphical elements that visually represent this topic on a 2D canvas. 

Allowed types: 
- "rect": { type: "rect", x, y, width, height, fill: color, text (optional) }
- "circle": { type: "circle", x, y, radius, fill: color, text (optional) }
- "text": { type: "text", x, y, text, fill: color, fontSize }
- "arrow": { type: "arrow", points: [startX, startY, endX, endY], stroke: color }

Guidelines:
- Place elements logically on a 800x600 canvas (start x: 100, y: 100).
- Space them out well.
- Colors should be hex codes (e.g. #ff0000).

Return ONLY raw JSON array. Do not include markdown json wrappers.
`;
    const response = await aiDiagram.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.2 }
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

// ==================== TAVILY SEARCH (Clean Version) ====================
app.post('/api/ai/search', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const tavilyKey = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY || '';

  console.log(`[AI Server] Tavily key detected: ${tavilyKey ? 'YES' : 'NO'}`);

  if (!tavilyKey) {
    return res.status(400).json({ 
      error: 'Tavily API Key is not configured on the server.' 
    });
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: query,
        search_depth: 'basic',
        max_results: 5
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Server] Tavily error:', errText);
      return res.status(response.status).json({ error: `Tavily failed: ${errText}` });
    }

    const data = await response.json();
    const results = (data.results || []).map((item: any) => ({
      title: item.title || 'Educational Resource',
      description: item.content || item.snippet || '',
      uri: item.url || ''
    }));

    return res.json({
      summary: `Real-time results for "${query}"`,
      results: results
    });

  } catch (err: any) {
    console.error('[AI Server] Search execution error:', err);
    return res.status(500).json({ error: err.message });
  }
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

