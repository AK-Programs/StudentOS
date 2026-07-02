import { GoogleGenAI } from '@google/genai';

export async function clientSideGemini(prompt: string): Promise<string> {
  const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key) {
    return getMockAiResponse(prompt);
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || getMockAiResponse(prompt);
  } catch (err: any) {
    console.error("Client-side Gemini execution failed, falling back to offline demo responses:", err);
    return getMockAiResponse(prompt);
  }
}

function getMockAiResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('physics') || p.includes('centripetal') || p.includes('work') || p.includes('force')) {
    return `### 🪐 Centripetal Force & Work Analysis\n\nIn classical mechanics, the work done by a **centripetal force** on an object in uniform circular motion is **exactly zero**.\n\n$$\\text{Work} = \\vec{F} \\cdot \\vec{d} = F d \\cos(\\theta)$$\n\n* **Perpendicularity**: The force is always directed radially inward toward the center, while the instantaneous displacement vector is tangent to the path.\n* **Angle ($\\theta$)**: The angle between them is always $90^\\circ$ ($\\cos(90^\\circ) = 0$).\n\nWould you like me to help you draft a mechanics cheat-sheet or solve another circular motion equation?`;
  }
  if (p.includes('chem') || p.includes('acid') || p.includes('synthesis') || p.includes('base')) {
    return `### 🧪 Acid-Base Equilibrium & Synthesis Guide\n\nBased on Dr. Ruby's synthesis guides, here is a quick overview of Lewis systems:\n\n1. **Lewis Acid**: An electron-pair acceptor (e.g., $BF_3$, $H^+$).\n2. **Lewis Base**: An electron-pair donor (e.g., $NH_3$, $H_2O$).\n3. **pKa & Equilibrium**: A lower pKa corresponds to a stronger acid, meaning it dissociates more completely in aqueous solutions.\n\nWould you like me to construct a quick practice quiz on acid-base equilibrium curves?`;
  }
  if (p.includes('bst') || p.includes('binary') || p.includes('tree') || p.includes('complexity') || p.includes('search')) {
    return `### 💻 Binary Search Tree (BST) & O(log N) Complexity\n\nIn an optimally balanced Binary Search Tree (BST):\n\n* **Subdivision**: Each node divides the searchable subspace in half. This leads to **$O(\\log N)$** average time complexity for insertion, deletion, and lookup operations.\n* **Rotations**: If the tree becomes skewed, left/right AVL rotations must be executed to balance node heights and restore logarithmic efficiency.\n\nWould you like to review the C++ or TypeScript node-balancing algorithm inside our study workspace?`;
  }
  return `### 🤖 StudentOS AI Campus Copilot\n\nWelcome to your **StudentOS Virtual Assistant**!\n\nI can help you analyze your study tracker, generate sample exam questions, or summarize lecture notes. What are we studying today?\n\n* **Physics & Mechanics**: rotatory dynamics, work vectors\n* **Chemistry AP**: conjugate pairs, synthesis guides\n* **Computer Science**: balanced search trees, runtime bounds`;
}
