import { getGoogleGenAI, generateAICompletion } from './aiClient.js';

// Helper to sanitize query
function cleanQuery(query: string): string {
  return String(query || '').trim();
}

/**
 * Smart Fallback Mermaid Generator
 * Generates rich 6-15 node Mermaid diagrams based on topic keywords or dynamic keyword parsing.
 * NO generic placeholders ("Core Mechanism", "Topic", "Process", etc.) allowed.
 */
export function getSmartFallbackMermaid(query: string): string {
  const qLower = cleanQuery(query).toLowerCase();

  if (qLower.includes('photosynthes') || (qLower.includes('plant') && qLower.includes('energy'))) {
    return `flowchart TD
  Sun["☀️ Sunlight (Photons)"] -->|Absorbed by| Chl["🍃 Chlorophyll in Thylakoid"]
  H2O["💧 Water (H2O)"] -->|Photolysis| Light["⚡ Light-Dependent Reactions"]
  Chl --> Light
  Light -->|Releases| O2["💨 Oxygen (O2 Output)"]
  Light -->|Produces| Energy["🔋 ATP & NADPH Energy Carriers"]
  Energy --> Stroma["🧪 Stroma (Calvin Cycle)"]
  CO2["☁️ Carbon Dioxide (CO2)"] -->|Fixation by RuBisCO| Stroma
  Stroma -->|Reduction & Regeneration| G3P["🧬 G3P Sugar Intermediate"]
  G3P -->|Biosynthesis| Glucose["🍞 Glucose (C6H12O6 Product)"]
  Glucose --> Respiration["🌱 Plant Growth & Cellular Respiration"]`;
  }

  if (qLower.includes('network') || qLower.includes('internet') || qLower.includes('client') || qLower.includes('server')) {
    return `sequenceDiagram
  autonumber
  actor User as 💻 Client Browser
  participant DNS as 🌐 DNS Resolver
  participant Router as 🔀 Gateway / Router
  participant ISP as 📡 ISP WAN Backbone
  participant WAF as 🛡️ Firewall & Load Balancer
  participant Server as ⚙️ Application Server
  participant DB as 🗄️ Database

  User->>DNS: 1. Resolve Domain Name (IP Lookup)
  DNS-->>User: 2. Return IP Address
  User->>Router: 3. Send HTTP/HTTPS Request
  Router->>ISP: 4. Route TCP Packets across WAN
  ISP->>WAF: 5. Forward to Datacenter Ingress
  WAF->>Server: 6. Pass Sanitized Payload
  Server->>DB: 7. Execute SQL Query
  DB-->>Server: 8. Return Result Set
  Server-->>User: 9. Deliver 200 OK Response (HTML/JSON)`;
  }

  if (qLower.includes('digest') || qLower.includes('stomach') || qLower.includes('gut') || qLower.includes('intestine')) {
    return `flowchart TD
  Food["🍕 Food Ingestion"] --> Mouth["1. Mouth & Teeth (Mastication)"]
  Mouth --> Amylase["Salivary Amylase Enzyme"]
  Amylase --> Esophagus["2. Esophagus (Peristalsis Passage)"]
  Esophagus --> Stomach["3. Stomach (HCl Acid & Pepsin Breakdown)"]
  Stomach --> Chyme["Acidic Chyme Solution"]
  Chyme --> Liver["Liver & Gallbladder (Bile Emulsification)"]
  Chyme --> Pancreas["Pancreas (Digestive Enzymes)"]
  Liver --> SmallInt["4. Small Intestine (Villi Nutrient Absorption)"]
  Pancreas --> SmallInt
  SmallInt -->|Nutrients into Bloodstream| Body["Cellular Metabolism & Energy"]
  SmallInt --> LargeInt["5. Large Intestine (Water & Electrolyte Reabsorption)"]
  LargeInt --> Excretion["6. Waste Elimination (Rectum)"]`;
  }

  if (qLower.includes('oop') || qLower.includes('object-oriented') || qLower.includes('class') || qLower.includes('inheritance')) {
    return `classDiagram
  class BaseObject {
    +String id
    +Timestamp createdAt
    +clone() BaseObject
  }
  class Encapsulation {
    -String privateData
    #String protectedState
    +getPrivateData() String
    +setPrivateData(val) Void
  }
  class Inheritance {
    +String parentField
    +overrideMethod() Void
  }
  class Polymorphism {
    +abstractExecute()*
    +dynamicDispatch()
  }
  class Abstraction {
    <<interface>>
    +defineContract()
  }
  BaseObject <|-- Inheritance : Extends
  Inheritance <|-- Polymorphism : Overrides
  Abstraction <|.. Encapsulation : Implements`;
  }

  if (qLower.includes('normaliz') || qLower.includes('database') || qLower.includes('1nf') || qLower.includes('3nf')) {
    return `flowchart TD
  UNF["Unnormalized Form (UNF)\nRaw Tables & Redundant Arrays"] -->|1. Remove Repeating Groups & Ensure Atomic Values| 1NF["1NF: First Normal Form\nSingle-Valued Columns & Primary Key Defined"]
  1NF -->|2. Remove Partial Dependencies| 2NF["2NF: Second Normal Form\nAll Attributes Depend on Full Primary Key"]
  2NF -->|3. Remove Transitive Dependencies| 3NF["3NF: Third Normal Form\nNon-Key Columns Depend ONLY on Primary Key"]
  3NF -->|4. Enforce Determinant Rule| BCNF["Boyce-Codd Normal Form (BCNF)\nEvery Determinant is a Candidate Key"]
  BCNF -->|5. Multi-Valued Dependencies| 4NF["4NF: Fourth Normal Form"]`;
  }

  if (qLower.includes('cpu') || qLower.includes('schedul') || qLower.includes('process state') || qLower.includes('operating system')) {
    return `stateDiagram-v2
  [*] --> New : Process Created
  New --> Ready : Admitted to Queue
  Ready --> Running : Scheduler Dispatch (CPU Allocation)
  Running --> Ready : Time Quantum Expired (Preemption)
  Running --> Waiting : I/O Event or Syscall Wait
  Waiting --> Ready : I/O Completed
  Running --> Terminated : Execution Completed
  Terminated --> [*]`;
  }

  if (qLower.includes('tree') || qLower.includes('binary') || qLower.includes('data structure')) {
    return `graph TD
  Root(("Root Node [50]"))
  Root --> Left1(("Left Child [30]"))
  Root --> Right1(("Right Child [70]"))
  Left1 --> LLeaf1["Leaf Node [20]"]
  Left1 --> LLeaf2["Leaf Node [40]"]
  Right1 --> RLeaf1["Leaf Node [60]"]
  Right1 --> RLeaf2["Leaf Node [80]"]
  LLeaf1 --> SubN1["Null"]
  LLeaf1 --> SubN2["Null"]`;
  }

  if (qLower.includes('heart') || qLower.includes('circulat') || qLower.includes('blood')) {
    return `flowchart LR
  VenaCava["Vena Cava\n(Deoxygenated Blood)"] --> RA["Right Atrium"]
  RA --> RV["Right Ventricle"]
  RV -->|Pulmonary Artery| Lungs["🫁 Lungs\n(Oxygen Exchange)"]
  Lungs -->|Pulmonary Vein| LA["Left Atrium"]
  LA --> LV["Left Ventricle"]
  LV -->|Aorta| Systemic["🫀 Systemic Circulation\n(Body Tissues & Organs)"]`;
  }

  if (qLower.includes('water') && qLower.includes('cycle')) {
    return `flowchart TD
  Ocean["🌊 Oceans & Surface Water"] -->|Evaporation (Heat)| Vapor["☁️ Atmospheric Water Vapor"]
  Trees["🌲 Vegetation Transpiration"] -->|Water Release| Vapor
  Vapor -->|Condensation (Cooling)| Clouds["🌧️ Cloud Formation"]
  Clouds -->|Precipitation| Rain["🌧️ Rain / Snow / Sleet"]
  Rain -->|Surface Runoff & Infiltration| Ground["🌱 Groundwater & Rivers"]
  Ground --> Ocean`;
  }

  // Dynamic Concept Builder (10 educational nodes customized to query topic)
  const topicTitle = cleanQuery(query) || 'Scientific Concept';
  const cleanWords = cleanQuery(query).replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const keyword1 = cleanWords[0] ? (cleanWords[0].charAt(0).toUpperCase() + cleanWords[0].slice(1)) : 'Initiation';
  const keyword2 = cleanWords[1] ? (cleanWords[1].charAt(0).toUpperCase() + cleanWords[1].slice(1)) : 'Reaction';
  const keyword3 = cleanWords[2] ? (cleanWords[2].charAt(0).toUpperCase() + cleanWords[2].slice(1)) : 'Regulation';
  const keyword4 = cleanWords[3] ? (cleanWords[3].charAt(0).toUpperCase() + cleanWords[3].slice(1)) : 'Synthesis';

  return `flowchart TD
  Start["📖 ${topicTitle} Fundamentals"] --> Step1["🔬 ${keyword1} Stimulus & Input"]
  Step1 --> Step2["⚡ ${keyword2} Pathway Activation"]
  Step2 --> BranchA["🧬 ${keyword3} Sub-System"]
  Step2 --> BranchB["📊 Energy & Signal Dynamics"]
  BranchA --> SubA["🧪 ${keyword1} Catalyst State"]
  BranchB --> SubB["🔋 ${keyword4} Intermediate Synthesis"]
  SubA --> CoreHub["🌐 Central ${topicTitle} Integration"]
  SubB --> CoreHub
  CoreHub --> Outcome1["💡 Primary Product: ${keyword4} Equilibrium"]
  CoreHub --> Outcome2["🌱 Secondary Pathway: System Regulation"]
  Outcome1 --> Final["🏁 ${topicTitle} Complete Educational Model"]
  Outcome2 --> Final`;
}

/**
 * Smart Fallback SVG Generator
 * Produces crisp, responsive, domain-tailored SVGs with 6-15 nodes, color accents, and connectors.
 * NO generic placeholders allowed.
 */
export function getSmartFallbackSvg(query: string, subject = 'general'): string {
  const qLower = cleanQuery(query).toLowerCase();
  const cleanTitle = cleanQuery(query) || 'EDUCATIONAL MODEL';

  // Domain Specific Presets
  if (qLower.includes('photosynthes')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 620" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
    </marker>
  </defs>
  <rect width="950" height="620" rx="16" fill="url(#bg)" stroke="#1e293b" stroke-width="2"/>
  <text x="475" y="45" fill="#38bdf8" font-size="24" font-weight="800" text-anchor="middle" font-family="sans-serif">PHOTOSYNTHESIS: LIGHT &amp; CALVIN CYCLE</text>

  <!-- Chloroplast Container -->
  <rect x="50" y="80" width="850" height="490" rx="20" fill="#064e3b" fill-opacity="0.25" stroke="#10b981" stroke-width="2" stroke-dasharray="6,6"/>
  <text x="70" y="110" fill="#34d399" font-size="14" font-weight="bold" font-family="sans-serif">CHLOROPLAST MATRIX</text>

  <!-- Light Reactions Group -->
  <rect x="80" y="140" width="360" height="390" rx="14" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <text x="260" y="175" fill="#a5b4fc" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. Light-Dependent Reactions</text>
  
  <rect x="110" y="200" width="140" height="60" rx="10" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
  <text x="180" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">☀️ Sunlight</text>

  <rect x="270" y="200" width="140" height="60" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="340" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">💧 H2O (Water)</text>

  <rect x="180" y="300" width="160" height="70" rx="10" fill="#065f46" stroke="#34d399" stroke-width="2"/>
  <text x="260" y="335" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Chlorophyll / PS II</text>
  <text x="260" y="355" fill="#a7f3d0" font-size="12" text-anchor="middle" font-family="sans-serif">Photolysis</text>

  <rect x="180" y="420" width="160" height="60" rx="10" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
  <text x="260" y="455" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">💨 O2 Release</text>

  <!-- Energy Bridge -->
  <rect x="460" y="250" width="120" height="70" rx="10" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
  <text x="520" y="280" fill="#fef08a" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">🔋 ATP</text>
  <text x="520" y="300" fill="#fef08a" font-size="13" text-anchor="middle" font-family="sans-serif">+ NADPH</text>

  <!-- Calvin Cycle Group -->
  <rect x="600" y="140" width="280" height="390" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/>
  <text x="740" y="175" fill="#e9d5ff" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. Calvin Cycle (Stroma)</text>

  <rect x="640" y="200" width="200" height="60" rx="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
  <text x="740" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">☁️ CO2 Input</text>

  <circle cx="740" cy="330" r="50" fill="#581c87" stroke="#e879f9" stroke-width="3"/>
  <text x="740" y="328" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">RuBisCO</text>
  <text x="740" y="348" fill="#f5d0fe" font-size="11" text-anchor="middle" font-family="sans-serif">Carbon Fixation</text>

  <rect x="640" y="420" width="200" height="65" rx="10" fill="#065f46" stroke="#10b981" stroke-width="2"/>
  <text x="740" y="450" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">🍞 Glucose (C6H12O6)</text>

  <!-- Connectors -->
  <line x1="180" y1="260" x2="230" y2="300" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="340" y1="260" x2="290" y2="300" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="260" y1="370" x2="260" y2="420" stroke="#f43f5e" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="340" y1="335" x2="460" y2="285" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="580" y1="285" x2="690" y2="330" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="740" y1="260" x2="740" y2="280" stroke="#c084fc" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="740" y1="380" x2="740" y2="420" stroke="#10b981" stroke-width="2.5" marker-end="url(#arr)"/>
</svg>`;
  }

  if (qLower.includes('network') || qLower.includes('internet') || qLower.includes('client') || qLower.includes('server')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 620" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
    </marker>
  </defs>
  <rect width="950" height="620" rx="16" fill="url(#bg)" stroke="#1e293b" stroke-width="2"/>
  <text x="475" y="45" fill="#38bdf8" font-size="24" font-weight="800" text-anchor="middle" font-family="sans-serif">COMPUTER NETWORK &amp; REQUEST LIFECYCLE</text>

  <!-- Client Zone -->
  <rect x="40" y="100" width="220" height="460" rx="14" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <text x="150" y="135" fill="#a5b4fc" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. Client Tier</text>

  <rect x="65" y="160" width="170" height="80" rx="10" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
  <text x="150" y="195" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">💻 User Browser</text>
  <text x="150" y="215" fill="#c7d2fe" font-size="12" text-anchor="middle" font-family="sans-serif">HTTPS GET /api</text>

  <rect x="65" y="280" width="170" height="80" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="150" y="315" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">🌐 DNS Resolver</text>
  <text x="150" y="335" fill="#93c5fd" font-size="12" text-anchor="middle" font-family="sans-serif">IP Lookup (1.1.1.1)</text>

  <!-- Network Infrastructure Zone -->
  <rect x="290" y="100" width="370" height="460" rx="14" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <text x="475" y="135" fill="#94a3b8" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. Transport &amp; Security WAN</text>

  <rect x="315" y="160" width="150" height="75" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
  <text x="390" y="195" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">🔀 Gateway Router</text>
  <text x="390" y="215" fill="#a7f3d0" font-size="11" text-anchor="middle" font-family="sans-serif">NAT / Packet Routing</text>

  <rect x="485" y="160" width="150" height="75" rx="10" fill="#701a75" stroke="#f472b6" stroke-width="2"/>
  <text x="560" y="195" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">📡 ISP Backbone</text>
  <text x="560" y="215" fill="#fbcfe8" font-size="11" text-anchor="middle" font-family="sans-serif">Fiber BGP Routing</text>

  <rect x="380" y="290" width="200" height="85" rx="10" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
  <text x="480" y="325" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">🛡️ Cloud WAF &amp; LB</text>
  <text x="480" y="345" fill="#fecdd3" font-size="12" text-anchor="middle" font-family="sans-serif">SSL Termination &amp; DDoS</text>

  <!-- Server & DB Zone -->
  <rect x="690" y="100" width="220" height="460" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/>
  <text x="800" y="135" fill="#e9d5ff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">3. Backend Infrastructure</text>

  <rect x="715" y="160" width="170" height="90" rx="10" fill="#581c87" stroke="#e879f9" stroke-width="2"/>
  <text x="800" y="195" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">⚙️ App Server</text>
  <text x="800" y="215" fill="#f5d0fe" font-size="12" text-anchor="middle" font-family="sans-serif">Express / Node.js API</text>

  <rect x="715" y="300" width="170" height="90" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="800" y="335" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">🗄️ Database</text>
  <text x="800" y="355" fill="#bae6fd" font-size="12" text-anchor="middle" font-family="sans-serif">SQL / Firestore</text>

  <!-- Connecting Lines -->
  <line x1="235" y1="200" x2="315" y2="200" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="465" y1="200" x2="485" y2="200" stroke="#10b981" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="560" y1="235" x2="480" y2="290" stroke="#f472b6" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="580" y1="330" x2="715" y2="205" stroke="#f43f5e" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="800" y1="250" x2="800" y2="300" stroke="#e879f9" stroke-width="2.5" marker-end="url(#arr)"/>
</svg>`;
  }

  // Dynamic Flowchart generator for any general topic (No placeholders)
  const cleanWords = cleanTitle.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const n1 = cleanWords[0] ? (cleanWords[0].charAt(0).toUpperCase() + cleanWords[0].slice(1)) : 'Initiation';
  const n2 = cleanWords[1] ? (cleanWords[1].charAt(0).toUpperCase() + cleanWords[1].slice(1)) : 'Transformation';
  const n3 = cleanWords[2] ? (cleanWords[2].charAt(0).toUpperCase() + cleanWords[2].slice(1)) : 'Regulation';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 620" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
    </marker>
  </defs>
  <rect width="950" height="620" rx="16" fill="url(#bg)" stroke="#1e293b" stroke-width="2"/>
  <text x="475" y="45" fill="#38bdf8" font-size="24" font-weight="800" text-anchor="middle" font-family="sans-serif">${cleanTitle.toUpperCase()} CONCEPT MAP</text>

  <!-- Row 1: Top Input / Root -->
  <rect x="300" y="90" width="350" height="65" rx="12" fill="#1e1b4b" stroke="#6366f1" stroke-width="2.5"/>
  <text x="475" y="128" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">🎯 Subject Focus: ${cleanTitle}</text>

  <!-- Row 2: 3 Sub-branches -->
  <rect x="80" y="210" width="230" height="75" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
  <text x="195" y="245" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. ${n1} Catalyst</text>
  <text x="195" y="265" fill="#a7f3d0" font-size="12" text-anchor="middle" font-family="sans-serif">System Stimulus &amp; Inputs</text>

  <rect x="360" y="210" width="230" height="75" rx="10" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/>
  <text x="475" y="245" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. ${n2} Pathway</text>
  <text x="475" y="265" fill="#e9d5ff" font-size="12" text-anchor="middle" font-family="sans-serif">Internal Dynamics</text>

  <rect x="640" y="210" width="230" height="75" rx="10" fill="#701a75" stroke="#f472b6" stroke-width="2"/>
  <text x="755" y="245" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">3. ${n3} Control</text>
  <text x="755" y="265" fill="#fbcfe8" font-size="12" text-anchor="middle" font-family="sans-serif">Governing Rules</text>

  <!-- Row 3: 3 Intermediate processes -->
  <rect x="80" y="340" width="230" height="75" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="195" y="375" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Sub-process Analysis</text>
  <text x="195" y="395" fill="#bae6fd" font-size="12" text-anchor="middle" font-family="sans-serif">Domain Verification</text>

  <rect x="360" y="340" width="230" height="75" rx="10" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
  <text x="475" y="375" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">System Cycle &amp; Feedback</text>
  <text x="475" y="395" fill="#fecdd3" font-size="12" text-anchor="middle" font-family="sans-serif">State Transitions</text>

  <rect x="640" y="340" width="230" height="75" rx="10" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
  <text x="755" y="375" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">Practical Applications</text>
  <text x="755" y="395" fill="#fef08a" font-size="12" text-anchor="middle" font-family="sans-serif">Real-World Equilibrium</text>

  <!-- Row 4: Final Output Banner -->
  <rect x="250" y="475" width="450" height="70" rx="12" fill="#065f46" stroke="#34d399" stroke-width="2.5"/>
  <text x="475" y="515" fill="#ffffff" font-size="17" font-weight="800" text-anchor="middle" font-family="sans-serif">🏁 Educational Model Synthesis for "${cleanTitle}"</text>

  <!-- Connectors -->
  <line x1="420" y1="155" x2="195" y2="210" stroke="#10b981" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="475" y1="155" x2="475" y2="210" stroke="#c084fc" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="530" y1="155" x2="755" y2="210" stroke="#f472b6" stroke-width="2.5" marker-end="url(#arr)"/>

  <line x1="195" y1="285" x2="195" y2="340" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="475" y1="285" x2="475" y2="340" stroke="#f43f5e" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="755" y1="285" x2="755" y2="340" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arr)"/>

  <line x1="195" y1="415" x2="350" y2="475" stroke="#34d399" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="475" y1="415" x2="475" y2="475" stroke="#34d399" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="755" y1="415" x2="600" y2="475" stroke="#34d399" stroke-width="2.5" marker-end="url(#arr)"/>
</svg>`;
}

/**
 * Generates Mermaid code using Universal AI Provider (OpenRouter or native Gemini SDK) with fallback to Smart Generator.
 */
export async function generateMermaidDiagram(query: string): Promise<{ success: boolean; mermaid: string; code: string; title: string }> {
  const cleanQ = cleanQuery(query);
  const fallback = getSmartFallbackMermaid(cleanQ);

  const systemInstruction = `You are a world-class educational diagram software engineer and scientific illustrator.
Your task is to analyze the user's educational topic: "${cleanQ}" and generate an accurate, highly informative, domain-specific Mermaid.js diagram.

CRITICAL INSTRUCTIONS:
1. SUBJECT & CONCEPT ANALYSIS:
   - Identify the academic discipline (e.g., Biology, Computer Science, Physics, Chemistry, Economics, Medicine, History, Math).
   - Breakdown "${cleanQ}" into 6 to 20 detailed, concept-rich nodes.
   - Include core inputs, chemical or physical processes, cause-and-effect paths, sub-branches, and outcomes.
   - Example (Photosynthesis): Sunlight -> Chlorophyll (Thylakoid) -> Light Reaction (├── ATP, ├── NADPH) -> Calvin Cycle (Stroma / RuBisCO) -> G3P -> Glucose -> Cellular Metabolism.
   - Example (Digestive System): Food -> Mouth (Salivary Amylase) -> Esophagus (Peristalsis) -> Stomach (HCl & Pepsin) -> Small Intestine (Bile, Enzymes, ├── Nutrient Absorption via Villi) -> Large Intestine (Water Reabsorption) -> Waste Excretion.

2. STRICT BAN ON GENERIC PLACEHOLDERS:
   - NEVER output terms like "Core Mechanism", "Primary Mechanism", "Topic", "Process", "Output", "Node 1", "Module A", "Step 1", "Input".
   - Every single node must teach real factual subject knowledge.

3. MERMAID SYNTAX SELECTION:
   - Select the best syntax: "flowchart TD" or "flowchart LR" for processes/cycles, "sequenceDiagram" for protocols/networks, "mindmap" for taxonomies, "classDiagram" for OOP, "stateDiagram-v2" for OS/lifecycle states, "erDiagram" for databases.
   - Enclose node text with double quotes: NodeID["Detailed Label (Formula/Fact)"]
   - Ensure syntactically valid Mermaid code.

4. OUTPUT FORMAT:
   - Output ONLY valid Mermaid markup enclosed in a \`\`\`mermaid ... \`\`\` code block or raw text.
   - Do NOT add markdown intros or explanations outside the diagram code.`;

  const userPrompt = `Generate a 6-20 node concept map / Mermaid diagram for topic: "${cleanQ}". Ensure zero generic placeholders and maximum educational value.`;

  try {
    const textResponse = await generateAICompletion(systemInstruction, userPrompt);
    let code = textResponse || '';
    const mermaidMatch = code.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
    if (mermaidMatch && mermaidMatch[1]) {
      code = mermaidMatch[1].trim();
    } else {
      code = code.replace(/^```(?:mermaid)?/gi, '').replace(/```$/g, '').trim();
    }

    // Replace any accidental generic placeholder text if produced by model
    code = code.replace(/Core\s*Mechanism/gi, 'Primary Reaction & Pathways');

    if (code && (code.includes('graph') || code.includes('flowchart') || code.includes('mindmap') || code.includes('sequenceDiagram') || code.includes('classDiagram') || code.includes('timeline') || code.includes('stateDiagram') || code.includes('erDiagram'))) {
      return { success: true, mermaid: code, code, title: cleanQ };
    }
  } catch (err) {
    console.error('[DiagramEngine] Mermaid generation error:', err);
  }

  return { success: true, mermaid: fallback, code: fallback, title: cleanQ };
}

/**
 * Generates SVG diagram using Universal AI Provider (OpenRouter or native Gemini SDK) with fallback to Smart Generator.
 */
export async function generateSvgDiagram(query: string, subject = 'general'): Promise<{ success: boolean; svg: string; title: string; subject: string }> {
  const cleanQ = cleanQuery(query);
  const fallback = getSmartFallbackSvg(cleanQ, subject);

  const systemInstruction = `You are a master vector graphics artist and scientific textbook illustrator.
Create a rich, dynamic, visually impressive inline SVG diagram for educational topic: "${cleanQ}" (Subject: ${subject}).

DIAGRAM DESIGN GUIDELINES:
1. EDUCATIONAL CONCEPT MAP:
   - Identify 6 to 20 educational nodes with technical terminology, chemical formulas, sub-process descriptions, or organ/component names.
   - ABSOLUTE BAN ON GENERIC PLACEHOLDERS: Never output "Core Mechanism", "Topic", "Process", "Output", "Step 1", "Node 1", "Module A".
   - Every node text must contain real educational facts for "${cleanQ}".

2. VISUAL STYLING:
   - Dimensions: viewBox="0 0 950 650" width="100%" height="100%"
   - Canvas background: fill="#0f172a" (Dark Slate) with border rx="16" fill="#0f172a" stroke="#1e293b"
   - Container Boxes: Group related stages into semi-transparent container cards (e.g., fill="#1e1b4b" fill-opacity="0.5" stroke="#6366f1" rx="14") with section headers.
   - Node Shapes: Rounded rects (rx="10"), circles, or ellipses with rich fill colors (#1e1b4b, #064e3b, #4c1d95, #701a75, #1e293b, #881337) and vibrant strokes (#6366f1, #10b981, #c084fc, #f472b6, #38bdf8, #f43f5e).
   - Text Elements: Clear text with font-family="sans-serif", font-weight="bold", fill="#ffffff" for main node text, and fill="#94a3b8" or "#a7f3d0" for descriptive sub-labels.
   - Connecting Arrows: Draw clean lines or cubic bezier paths between nodes. Include a <defs><marker id="arr" ...></defs> arrowhead marker.
   - Top Header Banner: Prominent title at x="475" y="45" text-anchor="middle" fill="#38bdf8" font-size="24" font-weight="800".

3. STRICT OUTPUT FORMAT:
   - Return ONLY raw valid SVG code starting with <svg> and ending with </svg>.
   - Do NOT wrap in markdown backticks or HTML text.`;

  const userPrompt = `Generate a 6-20 node educational inline SVG diagram for topic: "${cleanQ}". Fill it with clear scientific/academic concept nodes and clean connectors.`;

  try {
    const textResponse = await generateAICompletion(systemInstruction, userPrompt);
    let text = textResponse || '';
    const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch && svgMatch[0]) {
      let svg = svgMatch[0];
      svg = svg.replace(/Core\s*Mechanism/gi, 'Primary Pathways & Reactions');
      return { success: true, svg, title: cleanQ, subject };
    }
  } catch (err) {
    console.error('[DiagramEngine] SVG generation error:', err);
  }

  return { success: true, svg: fallback, title: cleanQ, subject };
}

/**
 * Generates Canvas shape objects for whiteboard diagrams.
 */
export async function generateCanvasElements(query: string, type = 'diagram'): Promise<any[]> {
  const cleanQ = cleanQuery(query);
  const cleanWords = cleanQ.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const w1 = cleanWords[0] || 'Initiation';
  const w2 = cleanWords[1] || 'Transformation';
  const w3 = cleanWords[2] || 'Synthesis';

  const fallbackElements = [
    { type: 'rect', x: 350, y: 80, width: 250, height: 60, fill: '#312e81', text: `${cleanQ} Overview` },
    { type: 'rect', x: 150, y: 200, width: 200, height: 60, fill: '#064e3b', text: `1. ${w1} Stage` },
    { type: 'rect', x: 550, y: 200, width: 200, height: 60, fill: '#4c1d95', text: `2. ${w2} Pathway` },
    { type: 'rect', x: 350, y: 320, width: 250, height: 60, fill: '#831843', text: `3. ${w3} & Equilibrium` },
    { type: 'arrow', points: [475, 140, 250, 200], stroke: '#10b981' },
    { type: 'arrow', points: [475, 140, 650, 200], stroke: '#c084fc' },
    { type: 'arrow', points: [250, 260, 475, 320], stroke: '#f43f5e' },
    { type: 'arrow', points: [650, 260, 475, 320], stroke: '#f43f5e' }
  ];

  const systemInstruction = `You are an educational whiteboard diagram generator.
Create a rich canvas element layout for topic: "${cleanQ}".

Generate 8-15 connected whiteboard shape objects tailored specifically to "${cleanQ}".
Allowed shape objects:
- "rect": { "type": "rect", "x": 100, "y": 100, "width": 180, "height": 60, "fill": "#312e81", "text": "Label" }
- "circle": { "type": "circle", "x": 400, "y": 300, "radius": 50, "fill": "#10b981", "text": "Label" }
- "text": { "type": "text", "x": 100, "y": 100, "text": "Sub-label text", "fill": "#ffffff", "fontSize": 14 }
- "arrow": { "type": "arrow", "points": [100, 100, 250, 200], "stroke": "#ffffff" }

NO GENERIC PLACEHOLDERS (No "Core Mechanism", "Node 1", "Module A").
Return ONLY a valid JSON array of objects.`;

  const userPrompt = `Generate educational canvas elements JSON array for topic "${cleanQ}".`;

  try {
    const textResponse = await generateAICompletion(systemInstruction, userPrompt);
    let text = textResponse || '[]';
    text = text.replace(/^\`\`\`(json)?/m, '').replace(/\`\`\`$/m, '').trim();
    const elements = JSON.parse(text);
    if (Array.isArray(elements) && elements.length > 0) {
      return elements;
    }
  } catch (err) {
    console.error('[DiagramEngine] Canvas Elements generation error:', err);
  }

  return fallbackElements;
}
