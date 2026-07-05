import { GoogleGenAI } from '@google/genai';

export async function clientSideGemini(userMessage: string): Promise<string> {
  const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key) {
    return getMockAiResponse(userMessage);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
    });

    return response.text || getMockAiResponse(userMessage);
  } catch (err: any) {
    console.error('Client-side Gemini failed, using offline response:', err);
    return getMockAiResponse(userMessage);
  }
}

/** Use regex word boundaries so partial matches like "workspace" don't fire "work". */
function hasWord(word: string, text: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(text);
}

function getMockAiResponse(msg: string): string {
  const p = msg.toLowerCase();

  if (
    hasWord('physics', p) || hasWord('centripetal', p) || hasWord('mechanics', p) ||
    hasWord('velocity', p) || hasWord('acceleration', p) ||
    (hasWord('work', p) && hasWord('force', p))
  ) {
    return `### 🪐 Centripetal Force & Work Analysis\n\nIn classical mechanics, the work done by a **centripetal force** on an object in uniform circular motion is **exactly zero**.\n\n$$\\text{Work} = \\vec{F} \\cdot \\vec{d} = F d \\cos(\\theta)$$\n\n* **Perpendicularity**: The force is always directed radially inward toward the center, while the instantaneous displacement vector is tangent to the path.\n* **Angle ($\\theta$)**: The angle between them is always $90^\\circ$ ($\\cos(90^\\circ) = 0$).\n\nWould you like me to help you draft a mechanics cheat-sheet or solve another circular motion equation?`;
  }

  if (
    hasWord('chemistry', p) || hasWord('chem', p) ||
    hasWord('acid', p) || hasWord('synthesis', p) || hasWord('base', p)
  ) {
    return `### 🧪 Acid-Base Equilibrium & Synthesis Guide\n\nBased on Dr. Ruby's synthesis guides, here is a quick overview of Lewis systems:\n\n1. **Lewis Acid**: An electron-pair acceptor (e.g., $BF_3$, $H^+$).\n2. **Lewis Base**: An electron-pair donor (e.g., $NH_3$, $H_2O$).\n3. **pKa & Equilibrium**: A lower pKa corresponds to a stronger acid, meaning it dissociates more completely in aqueous solutions.\n\nWould you like me to construct a quick practice quiz on acid-base equilibrium curves?`;
  }

  if (
    hasWord('bst', p) || hasWord('binary', p) || hasWord('tree', p) ||
    hasWord('complexity', p) || hasWord('algorithm', p) || hasWord('code', p) ||
    hasWord('programming', p)
  ) {
    return `### 💻 Binary Search Tree (BST) & O(log N) Complexity\n\nIn an optimally balanced Binary Search Tree (BST):\n\n* **Subdivision**: Each node divides the searchable subspace in half. This leads to **$O(\\log N)$** average time complexity for insertion, deletion, and lookup operations.\n* **Rotations**: If the tree becomes skewed, left/right AVL rotations must be executed to balance node heights and restore logarithmic efficiency.\n\nWould you like to review the C++ or TypeScript node-balancing algorithm inside our study workspace?`;
  }

  // Default friendly response for any other message (e.g. "hello", greetings, general questions)
  return `### 👋 Hey there!\n\nI'm your **StudentOS AI Buddy** — here to help you study smarter, not harder.\n\nRight now I'm running in offline mode (no API key configured). Here's what I can help you with once connected:\n\n* 📚 **Summarize notes** and generate study guides\n* 🧠 **Quiz you** on any topic with active recall questions\n* 🔬 **Explain concepts** in Physics, Chemistry, Computer Science, and more\n* ✅ **Build task checklists** and plan your study sessions\n\nTo enable full AI responses, add a **GEMINI_API_KEY** or **OPENROUTER_API_KEY** to your server environment. What would you like to study today?`;
}
