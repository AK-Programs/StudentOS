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
You are an expert educational whiteboard layout generator.
The user wants a whiteboard structure of type "${type.toUpperCase()}" for the topic: "${query}".

${instructions}

Allowed element definitions:
- "rect": { type: "rect", x, y, width, height, fill: color, text (optional) }
- "circle": { type: "circle", x, y, radius, fill: color, text (optional) }
- "text": { type: "text", x, y, text, fill: color, fontSize }
- "arrow": { type: "arrow", points: [startX, startY, endX, endY], stroke: color }

Formatting & Sizing Guidelines:
- Place elements logically within an 800x600 coordinate grid (keep x between 50 and 750, y between 50 and 550).
- Colors must be attractive hex codes matching a modern slate dark theme (e.g., indigo, deep violet, amber, teal, emerald accent colors).
- Use transparent or semi-transparent fills for rectangles/circles so text remains readable.

Return ONLY the raw JSON array. Do not include markdown code block syntax (like \`\`\`json).
`;
    const response = await aiDiagram.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.25 }
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

  const q = String(query);
  const qL = q.toLowerCase();

  // ── Comprehensive subject-specific educational fallbacks ──────────────────
  let fallbackCode = '';

  // Physics
  if (/newton|laws of motion|inertia|f\s*=\s*ma/.test(qL)) {
    fallbackCode = `graph TD\n  NLM["Newton's Laws of Motion"] --> L1["1st Law — Inertia\\nAn object at rest stays at rest\\nunless acted on by a net force"]\n  NLM --> L2["2nd Law — F = ma\\nNet force = mass × acceleration"]\n  NLM --> L3["3rd Law — Action–Reaction\\nFor every action there is an equal\\nand opposite reaction"]\n  L1 --> App1["Seatbelts in vehicles\\nPuck sliding on ice"]\n  L2 --> App2["Calculating rocket thrust\\nPushing a trolley"]\n  L3 --> App3["Jet propulsion\\nWalking forward on ground"]`;
  } else if (/ohm|resist|volt|current|circuit/.test(qL)) {
    fallbackCode = `graph LR\n  Battery["Battery (EMF = V)"] -->|"Current I"| Resistor["Resistor R"]\n  Resistor -->|"Ohm: V = IR"| Ground["Ground Return"]\n  Ground --> Battery\n  Battery -->|"Power P = IV"| Power["Power Dissipation"]\n  subgraph Series["Series Circuit"]\n    R1["R₁"] --> R2["R₂"] --> R3["R₃"]\n  end\n  subgraph Parallel["Parallel Circuit"]\n    P1["R₁"] & P2["R₂"] & P3["R₃"]\n  end`;
  } else if (/gravit|free fall|projectile/.test(qL)) {
    fallbackCode = `graph TD\n  Gravity["Gravitational Force (F = mg)"] --> FreeFall["Free Fall\\ng = 9.8 m/s²"]\n  Gravity --> Projectile["Projectile Motion"]\n  Projectile --> Horizontal["Horizontal: x = v₀t (constant)"]\n  Projectile --> Vertical["Vertical: y = v₀t − ½gt² (accelerating)"]\n  FreeFall --> TimeFormula["Time to fall: t = √(2h/g)"]\n  Horizontal & Vertical --> Combined["Parabolic Trajectory"]`;
  } else if (/wave|sound|frequency|amplitude|doppler/.test(qL)) {
    fallbackCode = `graph TD\n  Wave["Wave Properties"] --> Trans["Transverse Waves\\n(light, water)"] & Long["Longitudinal Waves\\n(sound, seismic)"]\n  Wave --> Freq["Frequency f (Hz)"] & Amp["Amplitude A"] & Wl["Wavelength λ"]\n  Freq --> Speed["Speed v = fλ"]\n  Sound --> Doppler["Doppler Effect\\nApproaching: higher pitch\\nReceding: lower pitch"]`;
  // Biology
  } else if (/photosynthes/.test(qL)) {
    fallbackCode = `graph TD\n  Inputs["Inputs: CO₂ + H₂O + Sunlight"] --> LR["Light-Dependent Reactions\\n(Thylakoid membrane)"]\n  LR --> ATP["ATP + NADPH produced"]\n  LR --> O2["O₂ released as byproduct"]\n  ATP --> CC["Calvin Cycle\\n(Stroma)"]\n  CC --> G3P["G3P (Glyceraldehyde-3-phosphate)"]\n  G3P --> Glucose["Glucose C₆H₁₂O₆\\n(stored energy)"]`;
  } else if (/mitosis|cell div/.test(qL)) {
    fallbackCode = `graph LR\n  I["Interphase\\nDNA replication (S phase)"] --> P["Prophase\\nChromosomes condense\\nSpindle forms"]\n  P --> M["Metaphase\\nChromosomes align at\\nmetaphase plate"]\n  M --> A["Anaphase\\nChromatids pulled to\\nopposite poles"]\n  A --> T["Telophase\\nNuclear envelope reforms\\nChromosomes decondense"]\n  T --> C["Cytokinesis\\nCytoplasm divides → 2 identical\\ndiploid daughter cells"]`;
  } else if (/meiosis/.test(qL)) {
    fallbackCode = `graph TD\n  Meiosis --> M1["Meiosis I (Reduction Division)"]\n  M1 --> P1["Prophase I — Crossing over"] --> Meta1["Metaphase I"] --> Ana1["Anaphase I"] --> Telo1["Telophase I — 2 haploid cells"]\n  Meiosis --> M2["Meiosis II (Similar to Mitosis)"]\n  M2 --> Meta2["Metaphase II"] --> Ana2["Anaphase II"] --> Result["4 haploid gametes"]`;
  } else if (/digest|alimentary|gut|stomach/.test(qL)) {
    fallbackCode = `graph TD\n  Mouth["Mouth\\nMechanical + chemical digestion\\n(salivary amylase)"] --> Esoph["Oesophagus\\nPeristalsis moves bolus"]\n  Esoph --> Stomach["Stomach\\nHCl + pepsin\\nprotein digestion"]\n  Stomach --> SI["Small Intestine\\nDuodenum → Jejunum → Ileum\\nNutrient absorption (villi)"]\n  SI --> LI["Large Intestine\\nWater reabsorption\\nFormation of faeces"]\n  LI --> Rectum["Rectum + Anus\\nEgestion"]`;
  } else if (/circulat|blood|heart|cardiac/.test(qL)) {
    fallbackCode = `graph LR\n  Body["Body Tissues\\n(deoxygenated blood)"] -->|"Vena Cava"| RA["Right Atrium"]\n  RA -->|"Tricuspid valve"| RV["Right Ventricle"]\n  RV -->|"Pulmonary artery"| Lungs["Lungs\\nOxygenation (CO₂ → O₂)"]\n  Lungs -->|"Pulmonary vein"| LA["Left Atrium"]\n  LA -->|"Bicuspid / Mitral valve"| LV["Left Ventricle"]\n  LV -->|"Aorta"| Body`;
  } else if (/respir|breath|lung|oxygen/.test(qL)) {
    fallbackCode = `graph TD\n  Inhale["Inhalation\\nDiaphragm contracts\\nRibs rise → lung volume ↑\\nPressure ↓ → air flows in"] --> Gas["Gas Exchange (Alveoli)\\nO₂ diffuses into blood\\nCO₂ diffuses out"]\n  Gas --> Exhale["Exhalation\\nDiaphragm relaxes\\nRibs fall → lung volume ↓\\nPressure ↑ → air flows out"]\n  Gas --> Blood["O₂ binds haemoglobin → Oxyhaemoglobin\\nDelivered to respiring cells"]`;
  } else if (/nervous|neuron|brain|synapse/.test(qL)) {
    fallbackCode = `graph TD\n  CNS["Central Nervous System"] --> Brain["Brain\\nCerebrum / Cerebellum / Medulla"]\n  CNS --> SC["Spinal Cord\\nReflex arc pathway"]\n  PNS["Peripheral Nervous System"] --> Sensor["Sensory Neurons\\n(receptor → CNS)"]\n  PNS --> Motor["Motor Neurons\\n(CNS → effector)"]\n  Sensor --> Synapse["Synapse\\nNeurotransmitters cross cleft"]\n  Synapse --> Motor`;
  // Chemistry
  } else if (/periodic|element|atom|electron|proton/.test(qL)) {
    fallbackCode = `graph TD\n  Atom["Atom Structure"] --> Nucleus["Nucleus\\nProtons (+charge)\\nNeutrons (no charge)"]\n  Atom --> Shells["Electron Shells\\n1st shell: max 2e\\n2nd shell: max 8e\\n3rd shell: max 18e"]\n  Nucleus --> Mass["Mass Number = Protons + Neutrons"]\n  Shells --> Valence["Valence Electrons\\n(outermost shell)\\ndetermine reactivity"]\n  Valence --> Bond["Chemical Bonding\\nIonic / Covalent / Metallic"]`;
  } else if (/acid|base|ph|neutral|titrat/.test(qL)) {
    fallbackCode = `graph LR\n  pH["pH Scale 0–14"] --> Acid["Acids (pH < 7)\\nH⁺ donors\\nExamples: HCl, H₂SO₄"]\n  pH --> Neutral["Neutral (pH = 7)\\nPure water H₂O"]\n  pH --> Base["Bases/Alkalis (pH > 7)\\nOH⁻ donors\\nExamples: NaOH, NH₃"]\n  Acid & Base --> Neutralisation["Neutralisation\\nAcid + Base → Salt + Water"]\n  Neutralisation --> Titration["Titration\\nFinding exact concentration\\nusing indicator"]`;
  } else if (/react|chemical equation|product|reactant/.test(qL)) {
    fallbackCode = `graph TD\n  React["Chemical Reaction"] --> Types["Types of Reactions"]\n  Types --> Combust["Combustion\\nFuel + O₂ → CO₂ + H₂O"]\n  Types --> Decomp["Decomposition\\nAB → A + B"]\n  Types --> Redox["Redox\\nOxidation: loses e⁻\\nReduction: gains e⁻ (OIL RIG)"]\n  Types --> Precip["Precipitation\\nTwo solutions → insoluble solid"]\n  React --> Rate["Rate of Reaction\\nTemperature, Concentration\\nSurface Area, Catalyst"]`;
  // Computer Science
  } else if (/oop|object.oriented|class|inherit|polymorphi|encapsul/.test(qL)) {
    fallbackCode = `graph TD\n  OOP["Object-Oriented Programming"] --> Pillars["4 Pillars"]\n  Pillars --> Encap["Encapsulation\\nBundle data + methods\\ninto a class. Hide internals."]\n  Pillars --> Inherit["Inheritance\\nChild class extends\\nParent class (reuse)"]\n  Pillars --> Poly["Polymorphism\\nSame method name,\\ndifferent behaviour"]\n  Pillars --> Abstr["Abstraction\\nHide complexity,\\nshow only essentials"]\n  Encap --> Class["class BankAccount {\\n  private balance\\n  deposit() {}\\n}"]`;
  } else if (/sort|bubble|merge|quick|algorithm/.test(qL)) {
    fallbackCode = `graph TD\n  Start(["Start"]) --> Input[/"Read array A[n]"/]\n  Input --> Outer["i = 0 to n-1"]\n  Outer --> Inner["j = 0 to n-i-1"]\n  Inner --> Compare{{"A[j] > A[j+1]?"}}\n  Compare -->|"Yes"| Swap["Swap A[j] and A[j+1]"]\n  Compare -->|"No"| NextJ["j++"]\n  Swap --> NextJ\n  NextJ --> MoreJ{{"j < n-i-1?"}}\n  MoreJ -->|"Yes"| Inner\n  MoreJ -->|"No"| NextI["i++"]\n  NextI --> MoreI{{"i < n-1?"}}\n  MoreI -->|"Yes"| Outer\n  MoreI -->|"No"| Output[/"Sorted Array"/]\n  Output --> End(["End"])`;
  } else if (/network|osi|tcp|http|protocol|internet/.test(qL)) {
    fallbackCode = `graph TD\n  OSI["OSI Model (7 Layers)"] --> L7["7. Application — HTTP, FTP, SMTP"]\n  L7 --> L6["6. Presentation — Encryption, Compression"]\n  L6 --> L5["5. Session — Session management"]\n  L5 --> L4["4. Transport — TCP/UDP, Port numbers"]\n  L4 --> L3["3. Network — IP addressing, Routing"]\n  L3 --> L2["2. Data Link — MAC addresses, Frames"]\n  L2 --> L1["1. Physical — Cables, Signals, Bits"]`;
  } else if (/database|sql|relational|table|query/.test(qL)) {
    fallbackCode = `graph TD\n  DB["Relational Database"] --> Tables["Tables (Relations)"]\n  Tables --> Keys["Keys"]\n  Keys --> PK["Primary Key (PK)\\nUnique identifier per row"]\n  Keys --> FK["Foreign Key (FK)\\nLinks two tables"]\n  DB --> CRUD["SQL Operations"]\n  CRUD --> C["CREATE / INSERT"]\n  CRUD --> R["SELECT (with WHERE, JOIN)"]\n  CRUD --> U["UPDATE"]\n  CRUD --> D["DELETE"]\n  DB --> Norm["Normalisation\\n1NF → 2NF → 3NF\\n(Remove redundancy)"]`;
  // Mathematics
  } else if (/pythagoras|right.tri|hypotenuse/.test(qL)) {
    fallbackCode = `graph TD\n  Theorem["Pythagorean Theorem\\na² + b² = c²"] --> Sides["Right Triangle Sides"]\n  Sides --> A["Side a (opposite)"]\n  Sides --> B["Side b (adjacent)"]\n  Sides --> C["Hypotenuse c\\n(longest side, opposite 90°)"]\n  Theorem --> FindC["Find hypotenuse:\\nc = √(a² + b²)"]\n  Theorem --> FindA["Find leg:\\na = √(c² − b²)"]\n  Theorem --> Triples["Pythagorean Triples:\\n3-4-5 │ 5-12-13 │ 8-15-17"]`;
  } else if (/quadratic|ax2|parabola|discriminant/.test(qL)) {
    fallbackCode = `graph TD\n  Quad["Quadratic Equation ax² + bx + c = 0"] --> Methods["Solving Methods"]\n  Methods --> Factor["Factorisation\\n(x+p)(x+q)=0"]\n  Methods --> Formula["Quadratic Formula\\nx = (−b ± √(b²−4ac)) / 2a"]\n  Methods --> Complete["Completing the Square"]\n  Formula --> Disc["Discriminant Δ = b²−4ac"]\n  Disc --> TwoReal["Δ > 0: Two distinct real roots"]\n  Disc --> OneReal["Δ = 0: One repeated real root"]\n  Disc --> NoReal["Δ < 0: No real roots (complex)"]`;
  } else if (/statistic|mean|median|mode|standard dev/.test(qL)) {
    fallbackCode = `graph TD\n  Stats["Descriptive Statistics"] --> Central["Measures of Central Tendency"]\n  Central --> Mean["Mean = Σx / n\\n(Sum ÷ count)"]\n  Central --> Median["Median\\nMiddle value when sorted"]\n  Central --> Mode["Mode\\nMost frequent value"]\n  Stats --> Spread["Measures of Spread"]\n  Spread --> Range["Range = Max − Min"]\n  Spread --> SD["Standard Deviation σ\\n√(Σ(x−x̄)² / n)"]\n  Spread --> IQR["IQR = Q3 − Q1"]`;
  // History / Economics
  } else if (/french.rev|bastille|napoleon|robespierre/.test(qL)) {
    fallbackCode = `timeline\n  title French Revolution Timeline\n  1789 : Estates-General convened\n  1789 : Storming of the Bastille (14 July)\n  1789 : Declaration of Rights of Man\n  1791 : Constitutional Monarchy established\n  1792 : First French Republic declared\n  1793-1794 : Reign of Terror (Robespierre)\n  1795 : Directory government\n  1799 : Napoleon's coup (18 Brumaire)`;
  } else if (/world war|ww1|ww2|1914|1939/.test(qL)) {
    const isWW1 = /ww1|world war 1|1914/.test(qL);
    fallbackCode = isWW1
      ? `timeline\n  title World War I (1914–1918)\n  1914 : Assassination of Archduke Franz Ferdinand\n  1914 : War declared — Allied vs Central Powers\n  1915 : Gallipoli Campaign\n  1916 : Battle of the Somme / Verdun\n  1917 : USA enters the war\n  1917 : Russian Revolution — Russia withdraws\n  1918 : Armistice signed (11 November)`
      : `timeline\n  title World War II (1939–1945)\n  1939 : Germany invades Poland — War declared\n  1940 : Fall of France / Battle of Britain\n  1941 : Germany invades USSR (Operation Barbarossa)\n  1941 : Pearl Harbor — USA enters the war\n  1942-43 : Battle of Stalingrad (turning point)\n  1944 : D-Day landings at Normandy\n  1945 : Germany surrenders (VE Day)\n  1945 : Atomic bombs — Japan surrenders (VJ Day)`;
  } else if (/supply|demand|market|equilibrium|elasticity/.test(qL)) {
    fallbackCode = `graph TD\n  Market["Market Equilibrium"] --> Supply["Supply Curve (upward sloping)\\nHigher price → more supplied"]\n  Market --> Demand["Demand Curve (downward sloping)\\nHigher price → less demanded"]\n  Supply & Demand --> Eq["Equilibrium Point\\nQuantity Supplied = Quantity Demanded"]\n  Eq --> Price["Equilibrium Price P*"]\n  Eq --> Qty["Equilibrium Quantity Q*"]\n  Market --> Elasticity["Price Elasticity"]\n  Elasticity --> Elastic["PED > 1: Elastic demand\\n(luxury goods)"]\n  Elasticity --> Inelastic["PED < 1: Inelastic demand\\n(necessities)"]`;
  } else if (/water.cycle|evapor|condensat|precipitat/.test(qL)) {
    fallbackCode = `graph TD\n  Oceans["Oceans, Lakes & Rivers"] -->|"Evaporation (heat energy)"| Vapor["Water Vapour in Atmosphere"]\n  Vegetation -->|"Transpiration"| Vapor\n  Vapor -->|"Condensation (cooling)"| Clouds["Cloud Formation"]\n  Clouds -->|"Precipitation (rain/snow/hail)"| Land["Land Surface"]\n  Land -->|"Surface Runoff"| Rivers["Rivers & Streams"] --> Oceans\n  Land -->|"Infiltration"| Ground["Groundwater / Aquifers"] --> Oceans`;
  } else {
    // Generic but domain-aware fallback using the query as the subject
    fallbackCode = `graph TD\n  Topic["${q}"] --> Def["Definition & Core Concept"]\n  Topic --> Types["Classification / Types"]\n  Topic --> Process["Key Process / Mechanism"]\n  Process --> Step1["Step 1"]\n  Process --> Step2["Step 2"]\n  Process --> Step3["Step 3"]\n  Topic --> Significance["Real-World Significance & Applications"]`;
  }

  try {
    const aiGen = getGoogleGenAI();
    if (aiGen) {
      const prompt = `You are an expert educational diagram author for a school classroom whiteboard.
Generate a highly detailed, accurate Mermaid.js diagram for: "${q}"

STRICT RULES — violating any rule makes the output unacceptable:
1. NEVER use generic placeholder labels such as: "Core Theory", "Concept 1", "Sub1", "Sub2", "Applications", "Main Idea", "Primary Mechanism", "Key Observations", "Step 1 / Step 2", "Phase 1", "Topic → Key1 → Sub1". These are FORBIDDEN.
2. ALWAYS use the real, domain-specific terminology for the subject. Examples:
   - Newton's Laws: "First Law (Inertia)", "Second Law (F = ma)", "Third Law (Action–Reaction)"
   - Mitosis: "Prophase", "Metaphase", "Anaphase", "Telophase", "Cytokinesis"
   - Photosynthesis: "Light Reactions (Thylakoid)", "Calvin Cycle (Stroma)", "ATP + NADPH", "CO₂ + H₂O + Sunlight → Glucose"
   - Digestion: "Mouth (salivary amylase)", "Oesophagus (peristalsis)", "Stomach (HCl + pepsin)", "Small intestine (villi)", "Large intestine (water reabsorption)"
   - Sorting algorithm: "Compare A[j] and A[j+1]", "Swap if out of order", "Repeat n-1 passes"
   - French Revolution: "Estates-General 1789", "Storming of Bastille", "Reign of Terror", "Robespierre executed", "Napoleon's coup"
3. Choose the most appropriate diagram type for the subject:
   - Process / cycle / steps → graph TD (top-down flowchart)
   - Left-right cause-effect → graph LR
   - Classification / overview → mindmap
   - Historical sequence → timeline (format: "YEAR : Event")
   - System interactions → sequenceDiagram
   - State transitions → stateDiagram-v2
4. Include at least 6–10 nodes with meaningful content. Do NOT produce a diagram with fewer than 5 nodes.
5. Return ONLY the raw Mermaid code. No markdown fences (\`\`\`), no explanations, no comments.`;

      const response = await aiGen.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.15, maxOutputTokens: 2048 }
      });

      let code = (response.text || '').replace(/^```(mermaid)?/m, '').replace(/```$/m, '').trim();

      // Validate: reject if it contains known generic placeholders
      const hasGeneric = /\b(Core Theory|Concept 1|Sub1|Sub2|Main Idea|Primary Mechanism|Key Observations|Phase 1|Phase 2)\b/i.test(code);
      if (code && !hasGeneric) {
        return res.json({ success: true, mermaid: code, code, title: q });
      }
      // Fallback if AI produced generic content
    }

    return res.json({ success: true, mermaid: fallbackCode, code: fallbackCode, title: q });
  } catch (err: any) {
    console.error('[AI Server] Mermaid error:', err);
    return res.json({ success: true, mermaid: fallbackCode, code: fallbackCode, title: q });
  }
});

// ── SVG Educational Diagram Fallbacks ────────────────────────────────────────
function buildSvgFallback(query: string): string {
  const q = String(query);
  const qL = q.toLowerCase();
  const BG = '#0f172a'; const BORDER = '#334155';
  const mk = (title: string, content: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 460" width="620" height="460"><rect width="620" height="460" rx="16" fill="${BG}" stroke="${BORDER}" stroke-width="2"/><text x="310" y="38" fill="#c7d2fe" font-size="20" font-weight="bold" text-anchor="middle" font-family="sans-serif">${title}</text>${content}</svg>`;

  if (/heart|cardiac/.test(qL)) return mk('HUMAN HEART', `<rect x="100" y="80" width="170" height="140" rx="14" fill="#7f1d1d" stroke="#f87171" stroke-width="3"/><text x="185" y="148" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Right Atrium</text><rect x="320" y="80" width="170" height="140" rx="14" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/><text x="405" y="148" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Left Atrium</text><rect x="100" y="240" width="170" height="150" rx="14" fill="#991b1b" stroke="#fca5a5" stroke-width="3"/><text x="185" y="318" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Right Ventricle</text><rect x="320" y="240" width="170" height="150" rx="14" fill="#312e81" stroke="#a5b4fc" stroke-width="3"/><text x="405" y="318" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Left Ventricle</text><path d="M185 220 L185 240" stroke="#fca5a5" stroke-width="4" marker-end="url(#arr)"/><path d="M405 220 L405 240" stroke="#a5b4fc" stroke-width="4"/><text x="55" y="165" fill="#f87171" font-size="11" text-anchor="middle" font-family="sans-serif">Vena Cava ↑</text><text x="568" y="165" fill="#818cf8" font-size="11" text-anchor="middle" font-family="sans-serif">Aorta ↑</text><path d="M270 150 Q310 80 350 150" stroke="#f59e0b" stroke-width="2" fill="none" stroke-dasharray="5,4"/><text x="310" y="88" fill="#f59e0b" font-size="11" text-anchor="middle" font-family="sans-serif">Pulmonary circulation</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Double circulatory system — deoxygenated (right) / oxygenated (left)</text>`);

  if (/plant.cell|cell/.test(qL)) return mk('PLANT CELL STRUCTURE', `<ellipse cx="310" cy="250" rx="265" ry="175" fill="#14532d" stroke="#4ade80" stroke-width="3" opacity="0.7"/><rect x="50" y="80" width="520" height="340" rx="8" fill="none" stroke="#15803d" stroke-width="4" stroke-dasharray="8,4"/><text x="310" y="68" fill="#4ade80" font-size="11" font-family="sans-serif" text-anchor="middle">Cell Wall</text><circle cx="280" cy="240" r="70" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/><text x="280" y="244" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Nucleus</text><text x="280" y="262" fill="#a5b4fc" font-size="10" text-anchor="middle" font-family="sans-serif">(DNA / chromosomes)</text><rect x="80" y="185" width="70" height="35" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="2"/><text x="115" y="207" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">Chloroplast</text><rect x="80" y="285" width="70" height="30" rx="8" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="115" y="305" fill="#fff" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">Mitochondria</text><rect x="410" y="175" width="110" height="120" rx="10" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/><text x="465" y="240" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Vacuole</text><text x="465" y="258" fill="#7dd3fc" font-size="9" text-anchor="middle" font-family="sans-serif">(stores water)</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Eukaryotic plant cell with cell wall, chloroplasts, central vacuole</text>`);

  if (/atom|electron|proton|nucleus/.test(qL)) return mk('ATOMIC STRUCTURE', `<circle cx="310" cy="240" r="35" fill="#7f1d1d" stroke="#f87171" stroke-width="3"/><text x="310" y="238" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Nucleus</text><text x="310" y="256" fill="#fca5a5" font-size="10" text-anchor="middle" font-family="sans-serif">p⁺ + n⁰</text><ellipse cx="310" cy="240" rx="100" ry="40" fill="none" stroke="#818cf8" stroke-width="2"/><circle cx="410" cy="240" r="9" fill="#818cf8"/><text x="428" y="234" fill="#a5b4fc" font-size="10" font-family="sans-serif">e⁻</text><ellipse cx="310" cy="240" rx="155" ry="62" fill="none" stroke="#34d399" stroke-width="2" transform="rotate(-50 310 240)"/><circle cx="310" cy="178" r="9" fill="#34d399"/><text x="325" y="172" fill="#6ee7b7" font-size="10" font-family="sans-serif">e⁻</text><ellipse cx="310" cy="240" rx="210" ry="80" fill="none" stroke="#f59e0b" stroke-width="2" transform="rotate(25 310 240)"/><circle cx="170" cy="210" r="9" fill="#f59e0b"/><text x="148" y="206" fill="#fcd34d" font-size="10" font-family="sans-serif" text-anchor="end">e⁻</text><text x="60" y="90" fill="#94a3b8" font-size="11" font-family="sans-serif">Shell 1: max 2 e⁻</text><text x="60" y="110" fill="#94a3b8" font-size="11" font-family="sans-serif">Shell 2: max 8 e⁻</text><text x="60" y="130" fill="#94a3b8" font-size="11" font-family="sans-serif">Shell 3: max 18 e⁻</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Atomic model — protons &amp; neutrons in nucleus, electrons in shells</text>`);

  if (/solar.system|planet|sun|orbit/.test(qL)) return mk('SOLAR SYSTEM', `<circle cx="310" cy="230" r="50" fill="#f59e0b" stroke="#fbbf24" stroke-width="3"/><text x="310" y="235" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Sun</text><circle cx="310" cy="230" r="80" fill="none" stroke="#334155" stroke-width="1"/><circle cx="390" cy="230" r="7" fill="#94a3b8"/><text x="395" y="217" fill="#94a3b8" font-size="9" font-family="sans-serif">Mercury</text><circle cx="310" cy="230" r="110" fill="none" stroke="#334155" stroke-width="1"/><circle cx="420" cy="230" r="10" fill="#d97706"/><text x="433" y="217" fill="#d97706" font-size="9" font-family="sans-serif">Venus</text><circle cx="310" cy="230" r="140" fill="none" stroke="#334155" stroke-width="1"/><circle cx="450" cy="230" r="11" fill="#3b82f6"/><text x="464" y="217" fill="#3b82f6" font-size="9" font-family="sans-serif">Earth</text><circle cx="310" cy="230" r="168" fill="none" stroke="#334155" stroke-width="1"/><circle cx="478" cy="230" r="9" fill="#ef4444"/><text x="492" y="217" fill="#ef4444" font-size="9" font-family="sans-serif">Mars</text><circle cx="310" cy="230" r="210" fill="none" stroke="#334155" stroke-width="1"/><circle cx="520" cy="230" r="18" fill="#f97316"/><text x="540" y="218" fill="#f97316" font-size="9" font-family="sans-serif">Jupiter</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Inner planets (rocky) ← Asteroid belt → Outer planets (gas giants)</text>`);

  if (/dna|gene|chromosome|helix/.test(qL)) return mk('DNA DOUBLE HELIX', `<path d="M200 60 C250 110 380 110 420 160 C380 210 250 210 200 260 C250 310 380 310 420 360 C380 410 250 410 200 430" fill="none" stroke="#818cf8" stroke-width="4"/><path d="M420 60 C370 110 240 110 200 160 C240 210 370 210 420 260 C370 310 240 310 200 360 C240 410 370 410 420 430" fill="none" stroke="#34d399" stroke-width="4"/><line x1="310" y1="110" x2="310" y2="110" stroke="#f59e0b" stroke-width="3"/><line x1="305" y1="135" x2="315" y2="135" stroke="#f59e0b" stroke-width="3"/><line x1="300" y1="160" x2="320" y2="160" stroke="#ec4899" stroke-width="3"/><line x1="298" y1="185" x2="322" y2="185" stroke="#f59e0b" stroke-width="3"/><line x1="300" y1="210" x2="320" y2="210" stroke="#ec4899" stroke-width="3"/><line x1="303" y1="235" x2="317" y2="235" stroke="#f59e0b" stroke-width="3"/><line x1="308" y1="260" x2="312" y2="260" stroke="#ec4899" stroke-width="3"/><line x1="302" y1="285" x2="318" y2="285" stroke="#f59e0b" stroke-width="3"/><line x1="299" y1="310" x2="321" y2="310" stroke="#ec4899" stroke-width="3"/><line x1="302" y1="335" x2="318" y2="335" stroke="#f59e0b" stroke-width="3"/><text x="150" y="80" fill="#a5b4fc" font-size="12" font-family="sans-serif">Sugar-Phosphate</text><text x="150" y="96" fill="#a5b4fc" font-size="12" font-family="sans-serif">Backbone</text><text x="460" y="80" fill="#6ee7b7" font-size="12" font-family="sans-serif">Complementary</text><text x="460" y="96" fill="#6ee7b7" font-size="12" font-family="sans-serif">Strand</text><text x="355" y="200" fill="#fcd34d" font-size="11" font-family="sans-serif">A–T pairs</text><text x="355" y="280" fill="#f9a8d4" font-size="11" font-family="sans-serif">G–C pairs</text><text x="310" y="452" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">DNA — antiparallel strands held by hydrogen bonds (A–T, G–C)</text>`);

  if (/neuron|nerve|synapse/.test(qL)) return mk('NEURON STRUCTURE', `<ellipse cx="150" cy="230" rx="60" ry="45" fill="#1e1b4b" stroke="#818cf8" stroke-width="3"/><text x="150" y="228" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">Cell Body</text><text x="150" y="246" fill="#a5b4fc" font-size="10" text-anchor="middle" font-family="sans-serif">(Soma)</text><path d="M210 230 L480 230" stroke="#34d399" stroke-width="6"/><rect x="218" y="208" width="260" height="10" rx="3" fill="#064e3b" stroke="none" opacity="0.5"/><text x="345" y="220" fill="#6ee7b7" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Axon (myelinated)</text><rect x="250" y="215" width="30" height="30" rx="14" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/><text x="265" y="236" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="sans-serif">Myelin</text><rect x="350" y="215" width="30" height="30" rx="14" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/><path d="M480 210 L540 180 M480 220 L540 200 M480 230 L540 230 M480 240 L540 260 M480 250 L540 280" stroke="#f59e0b" stroke-width="2.5"/><text x="555" y="230" fill="#fcd34d" font-size="12" font-weight="bold" font-family="sans-serif">Dendrites</text><path d="M90 190 L40 150 M90 185 L35 170 M90 200 L30 200" stroke="#ec4899" stroke-width="2.5"/><text x="20" y="140" fill="#f9a8d4" font-size="11" font-family="sans-serif">Input</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Signal: dendrites → cell body → axon → synaptic terminals</text>`);

  if (/volcano|magma|lava|erupt/.test(qL)) return mk('VOLCANIC ERUPTION', `<polygon points="310,70 80,390 540,390" fill="#7f1d1d" stroke="#f87171" stroke-width="3"/><polygon points="310,70 220,390 400,390" fill="#991b1b" stroke="none"/><path d="M290 70 Q280 30 260 10 Q285 25 310 15 Q335 25 360 10 Q340 30 330 70" fill="#f97316" stroke="#fed7aa" stroke-width="2"/><text x="310" y="10" fill="#fed7aa" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Eruption column</text><ellipse cx="310" cy="300" rx="50" ry="80" fill="#f97316" stroke="#fdba74" stroke-width="2" opacity="0.8"/><text x="310" y="295" fill="#fff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">Magma</text><text x="310" y="313" fill="#fed7aa" font-size="10" text-anchor="middle" font-family="sans-serif">Chamber</text><rect x="50" y="385" width="520" height="55" rx="8" fill="#78350f" stroke="#d97706" stroke-width="2"/><text x="310" y="416" fill="#fed7aa" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">Earth's Crust &amp; Mantle</text><path d="M80 390 Q120 360 160 390" fill="#ef4444" stroke="#f87171" stroke-width="2" opacity="0.7"/><path d="M420 390 Q470 350 530 390" fill="#ef4444" stroke="#f87171" stroke-width="2" opacity="0.7"/><text x="100" y="375" fill="#fed7aa" font-size="10" font-family="sans-serif">Lava flow</text><text x="310" y="452" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Magma rises through vent → pyroclastic flow → lava solidifies</text>`);

  if (/eye|optic|retina|lens|vision/.test(qL)) return mk('HUMAN EYE ANATOMY', `<ellipse cx="310" cy="230" rx="200" ry="160" fill="#0c1f3a" stroke="#38bdf8" stroke-width="3"/><circle cx="310" cy="230" r="100" fill="#1e3a5f" stroke="#60a5fa" stroke-width="2.5"/><circle cx="310" cy="230" r="60" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/><circle cx="310" cy="230" r="35" fill="#111827"/><circle cx="310" cy="230" r="25" fill="#000"/><circle cx="298" cy="218" r="6" fill="#fff" opacity="0.8"/><line x1="108" y1="230" x2="140" y2="230" stroke="#38bdf8" stroke-width="3"/><text x="88" y="234" fill="#7dd3fc" font-size="11" text-anchor="end" font-family="sans-serif">Cornea</text><text x="255" y="190" fill="#93c5fd" font-size="11" font-family="sans-serif">Lens</text><text x="255" y="270" fill="#6ee7b7" font-size="11" font-family="sans-serif">Pupil</text><text x="340" y="215" fill="#a78bfa" font-size="11" font-family="sans-serif">Iris</text><line x1="505" y1="140" x2="475" y2="170" stroke="#f59e0b" stroke-width="2"/><text x="510" y="135" fill="#fcd34d" font-size="11" font-family="sans-serif">Sclera</text><line x1="505" y1="310" x2="460" y2="280" stroke="#f87171" stroke-width="2"/><text x="510" y="315" fill="#fca5a5" font-size="11" font-family="sans-serif">Retina</text><line x1="510" y1="230" x2="480" y2="230" stroke="#818cf8" stroke-width="2"/><text x="515" y="234" fill="#a5b4fc" font-size="11" font-family="sans-serif">Optic Nerve</text><text x="310" y="440" fill="#64748b" font-size="12" text-anchor="middle" font-family="sans-serif">Light → Cornea → Lens (focuses) → Retina → Optic nerve → Brain</text>`);

  // Generic educational fallback with actual topic styling
  return mk(q.toUpperCase(), `<rect x="60" y="75" width="500" height="110" rx="16" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/><text x="310" y="130" fill="#c7d2fe" font-size="17" font-weight="bold" text-anchor="middle" font-family="sans-serif">${q}</text><text x="310" y="158" fill="#818cf8" font-size="13" text-anchor="middle" font-family="sans-serif">Educational Diagram</text><rect x="60" y="210" width="230" height="120" rx="14" fill="#064e3b" stroke="#10b981" stroke-width="2.5"/><text x="175" y="278" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Key Components</text><rect x="320" y="210" width="240" height="120" rx="14" fill="#7f1d1d" stroke="#f43f5e" stroke-width="2.5"/><text x="440" y="278" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Key Processes</text><line x1="290" y1="270" x2="320" y2="270" stroke="#f59e0b" stroke-width="3" marker-end="url(#arr)"/><rect x="170" y="355" width="280" height="70" rx="12" fill="#312e81" stroke="#818cf8" stroke-width="2.5"/><text x="310" y="395" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Outcome &amp; Significance</text><text x="310" y="445" fill="#475569" font-size="11" text-anchor="middle" font-family="sans-serif">AI SVG · Use Mermaid mode for detailed flowchart diagrams</text>`);
}

// Educational SVG Diagram Generator Endpoint
app.post('/api/ai/svg-diagram', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { query, subject = 'general' } = req.body || {};
  if (!query) return res.status(400).json({ success: false, error: 'Query is required' });

  const fallbackSvg = buildSvgFallback(query);

  try {
    const aiGen = getGoogleGenAI();
    if (aiGen) {
      const prompt = `You are an expert educational SVG illustrator for school classroom whiteboards.
Generate a clean, accurate, dark-mode SVG diagram for subject "${subject}", topic: "${query}".

STRICT REQUIREMENTS:
- viewBox="0 0 620 460" width="620" height="460"
- Background: <rect width="620" height="460" fill="#0f172a" rx="16"/>
- Color palette: #818cf8 (indigo), #34d399 (emerald), #f59e0b (amber), #f87171 (red), #38bdf8 (sky), #a78bfa (violet), #fff
- ALL text in <text> tags with font-family="sans-serif". NEVER use foreignObject.
- Draw accurate anatomical/scientific shapes using <circle>, <ellipse>, <rect>, <path>, <polygon>, <line>.
- Label every component clearly. Include a footer caption at y="445".
- For biology: draw actual cell organelles / organ shapes, not generic boxes.
- For physics: draw actual apparatus (circuits with wires, lenses, magnets).
- For chemistry: draw electron shells, molecular bonds, lab apparatus.
- The diagram must TEACH — a student should understand the topic from it.
- Return ONLY the raw <svg>...</svg> string. NO markdown, NO backticks, NO explanation.`;

      const response = await aiGen.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.25, maxOutputTokens: 4096 }
      });

      let svg = (response.text || '').replace(/^```(xml|svg|html)?/m, '').replace(/```$/m, '').trim();

      // Validate: must contain <svg and have actual drawing elements
      const isValid = svg.startsWith('<svg') && (
        svg.includes('<circle') || svg.includes('<rect') || svg.includes('<path') ||
        svg.includes('<ellipse') || svg.includes('<polygon') || svg.includes('<line')
      );
      if (isValid) {
        return res.json({ success: true, svg, title: query, subject });
      }
    }

    return res.json({ success: true, svg: fallbackSvg, title: query, subject });
  } catch (err: any) {
    console.error('[AI Server] SVG Diagram error:', err);
    return res.json({ success: true, svg: fallbackSvg, title: query, subject });
  }
});

app.post('/api/ai/search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const tavilyKey = process.env.TAVILY_API_KEY || '';
  
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

