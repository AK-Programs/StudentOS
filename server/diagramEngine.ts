import { getGoogleGenAI, generateAICompletion } from './aiClient.js';

// Helper to sanitize query
function cleanQuery(query: string): string {
  return String(query || '').trim();
}

// ============================================================
// BANNED PLACEHOLDER WORDS
// If the AI or fallback generates these as node labels, reject.
// ============================================================
const BANNED_WORDS = [
  'mechanism', 'sub-process', 'subprocess', 'fallback', 'module',
  'stage', 'step 1', 'step 2', 'step 3', 'node 1', 'node 2',
  'module a', 'module b', 'primary mechanism', 'core mechanism',
  'key component', 'central control', 'integration', 'primary output',
  'system synthesis', 'practical applications', 'real-world',
  'domain verification', 'state transitions', 'governing rules',
  'internal dynamics', 'catalyst state', 'intermediate synthesis',
  'pathway activation', 'stimulus', 'signal dynamics', 'equilibrium',
  'sub-system', 'educational model', 'concept architecture',
  'primary stage', 'system regulation', 'feedback loop',
  'input', 'output', 'process', 'transformation',
  'primary concept', 'system process'
];

/**
 * Validates whether a Mermaid diagram has actual educational content.
 * Returns true if the diagram is educational, false if it contains placeholder junk.
 */
function isEducationalMermaid(code: string, query: string): boolean {
  if (!code || code.length < 50) return false;

  const codeLower = code.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Count how many banned placeholder words appear as node labels
  let placeholderCount = 0;
  for (const banned of BANNED_WORDS) {
    // Check if this banned word appears as a node label (inside quotes or brackets)
    const inBrackets = new RegExp(`\\["[^"]*${banned}[^"]*"\\]`, 'gi');
    const inParens = new RegExp(`\\([^)]*${banned}[^)]*\\)`, 'gi');
    const matches = (code.match(inBrackets) || []).length + (code.match(inParens) || []).length;
    // Don't count if the banned word is actually part of the query topic
    const isPartOfQuery = queryWords.some(qw => banned.includes(qw) || qw.includes(banned));
    if (!isPartOfQuery && matches > 0) {
      placeholderCount += matches;
    }
  }

  // Count meaningful nodes (lines with --> or --- connections)
  const connectionLines = (code.match(/-->/g) || []).length + (code.match(/---/g) || []).length;
  
  if (placeholderCount > 3) return false;
  if (connectionLines < 3) return false;

  return true;
}

/**
 * Validates whether an SVG diagram has actual educational content.
 */
function isEducationalSvg(svg: string, query: string): boolean {
  if (!svg || svg.length < 200) return false;

  const svgLower = svg.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  let placeholderCount = 0;
  for (const banned of BANNED_WORDS) {
    const isPartOfQuery = queryWords.some(qw => banned.includes(qw) || qw.includes(banned));
    if (!isPartOfQuery && svgLower.includes(banned)) {
      placeholderCount++;
    }
  }

  // Count text elements (each <text> tag is a node)
  const textElements = (svg.match(/<text[\s>]/g) || []).length;
  
  if (placeholderCount > 3) return false;
  if (textElements < 4) return false;

  return true;
}

// ============================================================
// COMPREHENSIVE TOPIC-SPECIFIC MERMAID FALLBACKS
// Each covers a common educational topic with REAL content.
// ============================================================
export function getSmartFallbackMermaid(query: string): string {
  const qLower = cleanQuery(query).toLowerCase();

  // SOLAR SYSTEM
  if (qLower.includes('solar system') || qLower.includes('planet') || (qLower.includes('solar') && !qLower.includes('panel') && !qLower.includes('cell'))) {
    return `flowchart TD
  SS["☀️ Solar System"] --> Sun["Sun (G-type Main Sequence Star)"]
  SS --> Inner["🪨 Inner Rocky Planets"]
  SS --> AB["Asteroid Belt (Mars-Jupiter Gap)"]
  SS --> Outer["🌀 Outer Gas & Ice Giants"]
  SS --> Beyond["🌌 Trans-Neptunian Objects"]
  Inner --> Mercury["Mercury (Smallest, No Atmosphere)"]
  Inner --> Venus["Venus (Hottest, Thick CO2 Atmosphere)"]
  Inner --> Earth["🌍 Earth (Liquid Water, Life)"]
  Inner --> Mars["Mars (Iron Oxide Surface, Thin Air)"]
  Earth --> Moon["🌙 Moon (Earth's Natural Satellite)"]
  Outer --> Jupiter["Jupiter (Largest, Great Red Spot)"]
  Outer --> Saturn["🪐 Saturn (Prominent Ring System)"]
  Outer --> Uranus["Uranus (Tilted Axis, Ice Giant)"]
  Outer --> Neptune["Neptune (Strongest Winds, Blue)"]
  Jupiter --> JMoons["Io, Europa, Ganymede, Callisto"]
  Saturn --> SMoons["Titan (Dense Atmosphere), Enceladus"]
  Beyond --> Pluto["Pluto (Dwarf Planet, Kuiper Belt)"]
  Beyond --> Kuiper["Kuiper Belt & Oort Cloud"]
  SS --> Gravity["⚡ Gravitational Orbits (Kepler's Laws)"]`;
  }

  // PHOTOSYNTHESIS
  if (qLower.includes('photosynthes') || (qLower.includes('plant') && qLower.includes('energy'))) {
    return `flowchart TD
  Sun["☀️ Sunlight (Photons)"] -->|Absorbed by| Chl["🍃 Chlorophyll in Thylakoid Membrane"]
  H2O["💧 Water (H2O) from Roots"] -->|Photolysis splits H2O| Light["⚡ Light-Dependent Reactions"]
  Chl --> Light
  Light -->|Releases| O2["💨 Oxygen (O2) Released to Atmosphere"]
  Light -->|Produces| ATP["🔋 ATP (Adenosine Triphosphate)"]
  Light -->|Produces| NADPH["🔋 NADPH (Electron Carrier)"]
  ATP --> Calvin["🧪 Calvin Cycle (in Stroma)"]
  NADPH --> Calvin
  CO2["☁️ Carbon Dioxide (CO2) from Air"] -->|Fixed by RuBisCO Enzyme| Calvin
  Calvin -->|Carbon Fixation| G3P["🧬 G3P (Glyceraldehyde-3-Phosphate)"]
  G3P -->|Biosynthesis| Glucose["🍞 Glucose (C6H12O6)"]
  Glucose --> CellResp["🌱 Cellular Respiration & Plant Growth"]
  Glucose --> Starch["📦 Starch Storage in Leaves"]`;
  }

  // COMPUTER NETWORK
  if (qLower.includes('network') || qLower.includes('internet') || (qLower.includes('computer') && qLower.includes('network'))) {
    return `flowchart TD
  Net["🌐 Computer Network"] --> Types["Network Types"]
  Types --> LAN["LAN (Local Area Network)"]
  Types --> WAN["WAN (Wide Area Network)"]
  Types --> MAN["MAN (Metropolitan)"]
  Net --> Layers["📶 OSI Model (7 Layers)"]
  Layers --> Physical["Layer 1: Physical (Cables, Signals)"]
  Layers --> DataLink["Layer 2: Data Link (MAC Address, Frames)"]
  Layers --> NetworkL["Layer 3: Network (IP Addressing, Routing)"]
  Layers --> Transport["Layer 4: Transport (TCP/UDP, Ports)"]
  Layers --> Application["Layer 7: Application (HTTP, FTP, DNS)"]
  Net --> Devices["🔧 Network Devices"]
  Devices --> Router["Router (Directs IP Packets)"]
  Devices --> Switch["Switch (Connects LAN Devices)"]
  Devices --> Firewall["🛡️ Firewall (Security Filtering)"]
  Net --> Protocols["📜 Protocols"]
  Protocols --> TCP["TCP (Reliable, Connection-Oriented)"]
  Protocols --> HTTP["HTTP/HTTPS (Web Communication)"]
  Protocols --> DNS["DNS (Domain Name Resolution)"]`;
  }

  // DIGESTIVE SYSTEM
  if (qLower.includes('digest') || qLower.includes('stomach') || qLower.includes('gut') || qLower.includes('intestine')) {
    return `flowchart TD
  Food["🍕 Food Ingestion"] --> Mouth["👄 Mouth (Mechanical Chewing)"]
  Mouth --> SalivaryAmylase["Salivary Amylase (Starch → Maltose)"]
  SalivaryAmylase --> Esophagus["Esophagus (Peristalsis Movement)"]
  Esophagus --> Stomach["🫗 Stomach"]
  Stomach --> HCl["HCl Acid (pH 1.5-3.5)"]
  Stomach --> Pepsin["Pepsin Enzyme (Protein → Peptides)"]
  HCl --> Chyme["Acidic Chyme"]
  Pepsin --> Chyme
  Chyme --> SmallInt["Small Intestine (6m long)"]
  SmallInt --> Duodenum["Duodenum (Bile + Pancreatic Juice)"]
  SmallInt --> Jejunum["Jejunum (Nutrient Absorption)"]
  SmallInt --> Ileum["Ileum (Vitamin B12, Bile Salt Absorption)"]
  Duodenum --> Liver["🫘 Liver (Produces Bile for Fat Emulsification)"]
  Duodenum --> Pancreas["Pancreas (Lipase, Trypsin, Amylase)"]
  Jejunum -->|Villi & Microvilli| Blood["🩸 Nutrients Enter Bloodstream"]
  SmallInt --> LargeInt["Large Intestine (Colon)"]
  LargeInt --> WaterAbs["Water & Electrolyte Reabsorption"]
  WaterAbs --> Rectum["Rectum → Waste Excretion"]`;
  }

  // CELL DIVISION
  if (qLower.includes('cell division') || qLower.includes('mitosis') || qLower.includes('meiosis')) {
    return `flowchart TD
  CD["🔬 Cell Division"] --> Mitosis["Mitosis (Somatic Cell Division)"]
  CD --> Meiosis["Meiosis (Gamete Formation)"]
  Mitosis --> Interphase["Interphase (G1 → S → G2, DNA Replication)"]
  Mitosis --> Prophase["Prophase (Chromosomes Condense, Spindle Forms)"]
  Mitosis --> Metaphase["Metaphase (Chromosomes Align at Equator)"]
  Mitosis --> Anaphase["Anaphase (Sister Chromatids Separate)"]
  Mitosis --> Telophase["Telophase (Nuclear Envelope Reforms)"]
  Mitosis --> Cytokinesis["Cytokinesis (Cytoplasm Divides → 2 Identical Cells)"]
  Meiosis --> MeiosisI["Meiosis I (Homologous Pairs Separate)"]
  Meiosis --> MeiosisII["Meiosis II (Sister Chromatids Separate)"]
  MeiosisI --> CrossOver["Crossing Over (Genetic Recombination)"]
  MeiosisI --> IndAssort["Independent Assortment"]
  MeiosisII --> Gametes["4 Haploid Gametes (n chromosomes)"]
  CrossOver --> GeneticDiv["🧬 Genetic Diversity in Offspring"]`;
  }

  // PERIODIC TABLE
  if (qLower.includes('periodic table') || qLower.includes('periodic') || qLower.includes('elements')) {
    return `flowchart TD
  PT["📋 Periodic Table of Elements"] --> Groups["Groups (Vertical Columns 1-18)"]
  PT --> Periods["Periods (Horizontal Rows 1-7)"]
  PT --> Categories["Element Categories"]
  Categories --> Metals["⚙️ Metals (Conductors, Malleable)"]
  Categories --> NonMetals["Non-Metals (Brittle, Insulators)"]
  Categories --> Metalloids["Metalloids (Si, Ge - Semiconductors)"]
  Groups --> Alkali["Group 1: Alkali Metals (Li, Na, K)"]
  Groups --> Halogens["Group 17: Halogens (F, Cl, Br)"]
  Groups --> NobleGas["Group 18: Noble Gases (He, Ne, Ar)"]
  Groups --> TransMet["Groups 3-12: Transition Metals (Fe, Cu, Au)"]
  PT --> Trends["📈 Periodic Trends"]
  Trends --> AtomicRadius["Atomic Radius (↓ Increases Down Group)"]
  Trends --> Electronegativity["Electronegativity (→ Increases Across Period)"]
  Trends --> IonEnergy["Ionization Energy (→ Increases Across Period)"]
  Metals --> Alkali
  Metals --> TransMet
  PT --> Lanthanides["Lanthanides (58-71)"]
  PT --> Actinides["Actinides (90-103, Radioactive)"]`;
  }

  // ARTIFICIAL INTELLIGENCE
  if (qLower.includes('artificial intelligence') || qLower.includes(' ai ') || qLower === 'ai' || qLower.includes('machine learning')) {
    return `flowchart TD
  AI["🤖 Artificial Intelligence"] --> ML["Machine Learning"]
  AI --> Types["Types of AI"]
  Types --> Narrow["Narrow AI (Task-Specific: Siri, Chess)"]
  Types --> General["General AI (Human-Level Reasoning)"]
  Types --> Super["Super AI (Hypothetical, Beyond Human)"]
  ML --> Supervised["Supervised Learning (Labeled Data)"]
  ML --> Unsupervised["Unsupervised Learning (Clustering, PCA)"]
  ML --> RL["Reinforcement Learning (Reward-Based)"]
  ML --> DL["🧠 Deep Learning (Neural Networks)"]
  DL --> CNN["CNN (Image Recognition, Computer Vision)"]
  DL --> RNN["RNN / LSTM (Sequence Data, Language)"]
  DL --> Transformer["Transformer (GPT, BERT, Attention)"]
  AI --> Applications["Applications"]
  Applications --> NLP["NLP (Text Generation, Translation)"]
  Applications --> Vision["Computer Vision (Object Detection)"]
  Applications --> Robotics["Robotics & Autonomous Vehicles"]
  AI --> Ethics["⚖️ AI Ethics (Bias, Privacy, Safety)"]
  Supervised --> Regression["Regression & Classification"]`;
  }

  // OOP / OBJECT ORIENTED
  if (qLower.includes('oop') || qLower.includes('object-oriented') || qLower.includes('object oriented') || (qLower.includes('class') && qLower.includes('inherit'))) {
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

  // DATABASE NORMALIZATION
  if (qLower.includes('normaliz') || qLower.includes('database') || qLower.includes('1nf') || qLower.includes('3nf')) {
    return `flowchart TD
  UNF["Unnormalized Form (UNF)\nRaw Tables & Redundant Arrays"] -->|1. Remove Repeating Groups & Ensure Atomic Values| 1NF["1NF: First Normal Form\nSingle-Valued Columns & Primary Key Defined"]
  1NF -->|2. Remove Partial Dependencies| 2NF["2NF: Second Normal Form\nAll Attributes Depend on Full Primary Key"]
  2NF -->|3. Remove Transitive Dependencies| 3NF["3NF: Third Normal Form\nNon-Key Columns Depend ONLY on Primary Key"]
  3NF -->|4. Enforce Determinant Rule| BCNF["Boyce-Codd Normal Form (BCNF)\nEvery Determinant is a Candidate Key"]
  BCNF -->|5. Multi-Valued Dependencies| 4NF["4NF: Fourth Normal Form"]`;
  }

  // CPU / OS / SCHEDULING
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

  // DATA STRUCTURES / TREES
  if (qLower.includes('tree') || qLower.includes('binary') || qLower.includes('data structure')) {
    return `flowchart TD
  DS["📚 Data Structures"] --> Linear["Linear Structures"]
  DS --> NonLinear["Non-Linear Structures"]
  Linear --> Array["Array (Contiguous Memory, O(1) Access)"]
  Linear --> LinkedList["Linked List (Dynamic, O(n) Access)"]
  Linear --> Stack["Stack (LIFO - Push/Pop)"]
  Linear --> Queue["Queue (FIFO - Enqueue/Dequeue)"]
  NonLinear --> Tree["🌳 Trees"]
  NonLinear --> Graph["Graph (Vertices + Edges)"]
  Tree --> BST["Binary Search Tree (Left < Root < Right)"]
  Tree --> AVL["AVL Tree (Self-Balancing)"]
  Tree --> Heap["Heap (Min-Heap / Max-Heap)"]
  Graph --> DFS["DFS (Depth-First Search)"]
  Graph --> BFS["BFS (Breadth-First Search)"]
  DS --> HashTable["Hash Table (Key-Value, O(1) Average)"]`;
  }

  // HEART / CIRCULATORY
  if (qLower.includes('heart') || qLower.includes('circulat') || qLower.includes('blood')) {
    return `flowchart LR
  Body["🫀 Body Tissues"] -->|Deoxygenated Blood| VenaCava["Vena Cava"]
  VenaCava --> RA["Right Atrium"]
  RA -->|Tricuspid Valve| RV["Right Ventricle"]
  RV -->|Pulmonary Valve| PA["Pulmonary Artery"]
  PA --> Lungs["🫁 Lungs (Gas Exchange)"]
  Lungs -->|O2 Absorbed, CO2 Released| PV["Pulmonary Vein"]
  PV --> LA["Left Atrium"]
  LA -->|Mitral Valve| LV["Left Ventricle"]
  LV -->|Aortic Valve| Aorta["Aorta (Largest Artery)"]
  Aorta --> Body`;
  }

  // WATER CYCLE
  if (qLower.includes('water') && qLower.includes('cycle')) {
    return `flowchart TD
  Ocean["🌊 Oceans & Surface Water"] -->|Solar Heat Energy| Evaporation["Evaporation (Liquid → Vapor)"]
  Trees["🌲 Vegetation"] -->|Transpiration| Evaporation
  Evaporation --> Vapor["☁️ Water Vapor Rises"]
  Vapor -->|Cooling at Altitude| Condensation["Condensation (Vapor → Droplets)"]
  Condensation --> Clouds["☁️ Cloud Formation"]
  Clouds -->|Precipitation| Rain["🌧️ Rain / Snow / Hail"]
  Rain --> Runoff["Surface Runoff (→ Rivers, Lakes)"]
  Rain --> Infiltration["Infiltration (→ Groundwater)"]
  Runoff --> Ocean
  Infiltration --> Aquifer["Underground Aquifer"]
  Aquifer --> Springs["Natural Springs → Rivers"]
  Springs --> Ocean`;
  }

  // RESPIRATORY SYSTEM
  if (qLower.includes('respirat') || qLower.includes('breathing') || qLower.includes('lungs')) {
    return `flowchart TD
  Air["🌬️ Inhaled Air (21% O2)"] --> Nose["Nose & Nasal Cavity (Filters, Warms)"]
  Nose --> Pharynx["Pharynx (Throat)"]
  Pharynx --> Larynx["Larynx (Voice Box)"]
  Larynx --> Trachea["Trachea (Windpipe, C-Shaped Cartilage)"]
  Trachea --> Bronchi["Bronchi (Left & Right)"]
  Bronchi --> Bronchioles["Bronchioles (Smaller Airways)"]
  Bronchioles --> Alveoli["🫁 Alveoli (300 Million Air Sacs)"]
  Alveoli -->|O2 Diffusion| Blood["🩸 Pulmonary Capillaries"]
  Blood -->|CO2 Diffusion| Alveoli
  Blood --> Heart["🫀 Heart → Systemic Circulation"]
  Alveoli --> Exhale["💨 Exhaled CO2 & Water Vapor"]`;
  }

  // NEWTON'S LAWS / PHYSICS / MECHANICS
  if (qLower.includes('newton') || (qLower.includes('physics') && qLower.includes('law')) || qLower.includes('mechanics') || qLower.includes('force')) {
    return `flowchart TD
  NL["⚡ Newton's Laws of Motion"] --> First["1st Law: Inertia"]
  NL --> Second["2nd Law: F = ma"]
  NL --> Third["3rd Law: Action-Reaction"]
  First --> Inertia["Object at Rest Stays at Rest\nObject in Motion Stays in Motion\n(Unless External Force Acts)"]
  Second --> Force["Force = Mass × Acceleration"]
  Second --> Units["SI Unit: Newton (kg·m/s²)"]
  Force --> Weight["Weight = m × g (9.8 m/s²)"]
  Third --> Pairs["Equal & Opposite Force Pairs"]
  Pairs --> Rocket["🚀 Rocket: Gas Pushes Down, Rocket Goes Up"]
  Pairs --> Walking["🚶 Walking: Foot Pushes Ground, Ground Pushes You"]
  NL --> Friction["Friction (Opposes Motion)"]
  Friction --> Static["Static Friction (μs)"]
  Friction --> Kinetic["Kinetic Friction (μk < μs)"]
  NL --> Momentum["Momentum: p = mv (Conservation Law)"]`;
  }

  // ATOM / ATOMIC STRUCTURE
  if (qLower.includes('atom') || qLower.includes('atomic') || qLower.includes('electron') || qLower.includes('nucleus')) {
    return `flowchart TD
  Atom["⚛️ Atomic Structure"] --> Nucleus["Nucleus (Protons + Neutrons)"]
  Atom --> Electrons["Electron Cloud (Shells/Orbitals)"]
  Nucleus --> Proton["Proton (+1 charge, 1.67×10⁻²⁷ kg)"]
  Nucleus --> Neutron["Neutron (0 charge, ~Same Mass)"]
  Proton --> AtomicNum["Atomic Number (Z) = Proton Count"]
  Neutron --> MassNum["Mass Number (A) = Protons + Neutrons"]
  Electrons --> Shell1["K Shell (n=1, Max 2e⁻)"]
  Electrons --> Shell2["L Shell (n=2, Max 8e⁻)"]
  Electrons --> Shell3["M Shell (n=3, Max 18e⁻)"]
  Electrons --> Valence["Valence Electrons (Outermost Shell)"]
  Valence --> Bonding["Chemical Bonding (Ionic, Covalent)"]
  Atom --> Isotopes["Isotopes (Same Z, Different A)"]
  Isotopes --> Carbon14["Carbon-14 (Radiocarbon Dating)"]`;
  }

  // ECOSYSTEM / ECOLOGY
  if (qLower.includes('ecosystem') || qLower.includes('ecology') || qLower.includes('food chain') || qLower.includes('food web')) {
    return `flowchart TD
  Eco["🌍 Ecosystem"] --> Biotic["Biotic (Living Components)"]
  Eco --> Abiotic["Abiotic (Non-Living: Sunlight, Water, Soil)"]
  Biotic --> Producers["🌱 Producers (Autotrophs: Plants, Algae)"]
  Biotic --> Consumers["🐾 Consumers (Heterotrophs)"]
  Biotic --> Decomposers["🍄 Decomposers (Fungi, Bacteria)"]
  Consumers --> Primary["Primary Consumers (Herbivores: Deer, Rabbit)"]
  Consumers --> Secondary["Secondary Consumers (Carnivores: Snake, Frog)"]
  Consumers --> Tertiary["Tertiary Consumers (Top Predators: Eagle, Lion)"]
  Producers -->|Energy Transfer 10%| Primary
  Primary -->|Energy Transfer| Secondary
  Secondary -->|Energy Transfer| Tertiary
  Decomposers -->|Nutrient Recycling| Soil["Soil Nutrients"]
  Soil --> Producers
  Eco --> EnergyFlow["☀️ Energy Flow (Sun → Producers → Consumers)"]`;
  }

  // HUMAN BODY / ANATOMY
  if (qLower.includes('human body') || qLower.includes('anatomy') || qLower.includes('organ system')) {
    return `flowchart TD
  HB["🧍 Human Body Systems"] --> Skeletal["🦴 Skeletal (206 Bones, Support & Protection)"]
  HB --> Muscular["💪 Muscular (Voluntary & Involuntary Movement)"]
  HB --> Nervous["🧠 Nervous (Brain, Spinal Cord, Neurons)"]
  HB --> Circulatory["🫀 Circulatory (Heart, Blood Vessels, Blood)"]
  HB --> Respiratory["🫁 Respiratory (Lungs, Gas Exchange)"]
  HB --> Digestive["🫗 Digestive (Mouth → Stomach → Intestines)"]
  HB --> Endocrine["🧪 Endocrine (Hormones: Insulin, Adrenaline)"]
  HB --> Immune["🛡️ Immune (WBCs, Antibodies, Lymph Nodes)"]
  HB --> Excretory["Excretory (Kidneys, Urine Formation)"]
  HB --> Reproductive["Reproductive (Gametes, Fertilization)"]
  Nervous --> Brain["Brain (Cerebrum, Cerebellum, Brainstem)"]
  Circulatory --> Blood["Blood (RBCs, WBCs, Platelets, Plasma)"]`;
  }

  // DNA / GENETICS
  if (qLower.includes('dna') || qLower.includes('genetics') || qLower.includes('gene') || qLower.includes('heredity')) {
    return `flowchart TD
  DNA["🧬 DNA (Deoxyribonucleic Acid)"] --> Structure["Double Helix Structure"]
  Structure --> Bases["Nitrogenous Bases"]
  Bases --> AT["Adenine (A) ↔ Thymine (T)"]
  Bases --> GC["Guanine (G) ↔ Cytosine (C)"]
  Structure --> Backbone["Sugar-Phosphate Backbone"]
  DNA --> Replication["DNA Replication (Semi-Conservative)"]
  DNA --> Transcription["Transcription (DNA → mRNA)"]
  Transcription --> RNA["mRNA leaves Nucleus"]
  RNA --> Translation["Translation (mRNA → Protein at Ribosome)"]
  Translation --> Protein["Proteins (Enzymes, Hormones, Antibodies)"]
  DNA --> Genes["Genes (Segments Coding for Traits)"]
  Genes --> Alleles["Alleles (Dominant & Recessive)"]
  Alleles --> Genotype["Genotype (AA, Aa, aa)"]
  Genotype --> Phenotype["Phenotype (Observable Trait)"]
  DNA --> Mutation["Mutations (Substitution, Insertion, Deletion)"]`;
  }

  // ELECTRICITY / CIRCUITS
  if (qLower.includes('electric') || qLower.includes('circuit') || qLower.includes('current') || qLower.includes('voltage') || qLower.includes('ohm')) {
    return `flowchart TD
  Elec["⚡ Electricity"] --> Current["Electric Current (I = Q/t)"]
  Elec --> Voltage["Voltage (V = W/Q, Potential Difference)"]
  Elec --> Resistance["Resistance (R = V/I, Ohm's Law)"]
  Current --> DC["DC (Direct Current - Battery)"]
  Current --> AC["AC (Alternating Current - Mains)"]
  Elec --> Circuits["🔌 Circuit Types"]
  Circuits --> Series["Series Circuit (Same I, V Splits)"]
  Circuits --> Parallel["Parallel Circuit (Same V, I Splits)"]
  Elec --> Components["Components"]
  Components --> Resistor["Resistor (Limits Current Flow)"]
  Components --> Capacitor["Capacitor (Stores Charge)"]
  Components --> Diode["Diode (One-Way Current)"]
  Components --> LED["LED (Light Emitting Diode)"]
  Elec --> Power["Power: P = IV = I²R (Watts)"]
  Resistance --> Factors["Factors: Length, Area, Material, Temperature"]`;
  }

  // EVOLUTION
  if (qLower.includes('evolution') || qLower.includes('natural selection') || qLower.includes('darwin')) {
    return `flowchart TD
  Evo["🧬 Theory of Evolution"] --> NS["Natural Selection (Darwin)"]
  NS --> Variation["Genetic Variation in Population"]
  NS --> Struggle["Struggle for Existence (Limited Resources)"]
  NS --> Survival["Survival of the Fittest"]
  NS --> Reproduction["Differential Reproduction"]
  Variation --> Mutation["Mutations (Random DNA Changes)"]
  Variation --> Recombination["Genetic Recombination (Meiosis)"]
  Reproduction --> Adaptation["Adaptations Accumulate Over Generations"]
  Adaptation --> Speciation["Speciation (New Species Emerge)"]
  Evo --> Evidence["Evidence for Evolution"]
  Evidence --> Fossils["Fossil Record (Transitional Forms)"]
  Evidence --> Homologous["Homologous Structures (Shared Ancestry)"]
  Evidence --> DNA_Ev["DNA Sequence Similarities"]
  Evo --> HumanEvo["Human Evolution (Homo sapiens, ~300,000 yrs)"]`;
  }

  // WORLD WAR / HISTORY
  if (qLower.includes('world war') || qLower.includes('ww1') || qLower.includes('ww2')) {
    return `flowchart TD
  WW["⚔️ World Wars"] --> WW1["World War I (1914-1918)"]
  WW --> WW2["World War II (1939-1945)"]
  WW1 --> Causes1["Causes: Militarism, Alliances, Imperialism, Nationalism"]
  WW1 --> Trigger1["Trigger: Assassination of Archduke Franz Ferdinand"]
  WW1 --> Allies1["Allied Powers: UK, France, Russia, USA"]
  WW1 --> Central["Central Powers: Germany, Austria-Hungary, Ottoman"]
  WW1 --> Treaty["Treaty of Versailles (1919)"]
  WW2 --> Causes2["Causes: Treaty of Versailles, Great Depression, Fascism"]
  WW2 --> Hitler["Rise of Adolf Hitler & Nazi Germany"]
  WW2 --> AlliesWW2["Allies: UK, USA, USSR, France"]
  WW2 --> Axis["Axis: Germany, Italy, Japan"]
  WW2 --> Holocaust["Holocaust (6 Million Jews Killed)"]
  WW2 --> Hiroshima["Atomic Bombs: Hiroshima & Nagasaki (Aug 1945)"]
  WW2 --> UN["United Nations Founded (1945)"]`;
  }

  // CATCH-ALL: The topic doesn't match any known subject.
  // Generate a mindmap-style diagram using the actual query words.
  // This is the LAST resort and must NOT use placeholder words.
  const topicTitle = cleanQuery(query);
  return `mindmap
  root(("${topicTitle}"))
    Definition & Overview
      What is ${topicTitle}?
      Key Characteristics
      Historical Background
    Main Components
      Component A of ${topicTitle}
      Component B of ${topicTitle}
      Component C of ${topicTitle}
    How It Works
      Underlying Principles
      Key Relationships
      Cause and Effect
    Types & Categories
      Type 1
      Type 2
      Type 3
    Applications
      Real-World Examples
      Modern Uses
      Future Developments
    Important Facts
      Key Figures & Dates
      Common Misconceptions
      Related Topics`;
}

// ============================================================
// SVG FALLBACK - Only photosynthesis and network have detailed
// SVG presets. Everything else generates via AI or uses mermaid.
// ============================================================
export function getSmartFallbackSvg(query: string, subject = 'general'): string {
  const qLower = cleanQuery(query).toLowerCase();
  const cleanTitle = cleanQuery(query) || 'Educational Concept';

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
  <rect x="50" y="80" width="850" height="490" rx="20" fill="#064e3b" fill-opacity="0.25" stroke="#10b981" stroke-width="2" stroke-dasharray="6,6"/>
  <text x="70" y="110" fill="#34d399" font-size="14" font-weight="bold" font-family="sans-serif">CHLOROPLAST</text>
  <rect x="80" y="140" width="360" height="390" rx="14" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <text x="260" y="175" fill="#a5b4fc" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">1. Light-Dependent Reactions</text>
  <rect x="110" y="200" width="140" height="60" rx="10" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
  <text x="180" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">☀️ Sunlight</text>
  <rect x="270" y="200" width="140" height="60" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="340" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">💧 H2O (Water)</text>
  <rect x="180" y="300" width="160" height="70" rx="10" fill="#065f46" stroke="#34d399" stroke-width="2"/>
  <text x="260" y="335" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">Chlorophyll / PS II</text>
  <text x="260" y="355" fill="#a7f3d0" font-size="12" text-anchor="middle" font-family="sans-serif">Photolysis of Water</text>
  <rect x="180" y="420" width="160" height="60" rx="10" fill="#881337" stroke="#f43f5e" stroke-width="2"/>
  <text x="260" y="455" fill="#ffffff" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">💨 O2 Released</text>
  <rect x="460" y="250" width="120" height="70" rx="10" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
  <text x="520" y="280" fill="#fef08a" font-size="15" font-weight="bold" text-anchor="middle" font-family="sans-serif">🔋 ATP</text>
  <text x="520" y="300" fill="#fef08a" font-size="13" text-anchor="middle" font-family="sans-serif">+ NADPH</text>
  <rect x="600" y="140" width="280" height="390" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/>
  <text x="740" y="175" fill="#e9d5ff" font-size="18" font-weight="bold" text-anchor="middle" font-family="sans-serif">2. Calvin Cycle (Stroma)</text>
  <rect x="640" y="200" width="200" height="60" rx="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
  <text x="740" y="235" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">☁️ CO2 from Air</text>
  <circle cx="740" cy="330" r="50" fill="#581c87" stroke="#e879f9" stroke-width="3"/>
  <text x="740" y="328" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="sans-serif">RuBisCO</text>
  <text x="740" y="348" fill="#f5d0fe" font-size="11" text-anchor="middle" font-family="sans-serif">Carbon Fixation</text>
  <rect x="640" y="420" width="200" height="65" rx="10" fill="#065f46" stroke="#10b981" stroke-width="2"/>
  <text x="740" y="450" fill="#ffffff" font-size="16" font-weight="bold" text-anchor="middle" font-family="sans-serif">🍞 Glucose (C6H12O6)</text>
  <line x1="180" y1="260" x2="230" y2="300" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="340" y1="260" x2="290" y2="300" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="260" y1="370" x2="260" y2="420" stroke="#f43f5e" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="340" y1="335" x2="460" y2="285" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="580" y1="285" x2="690" y2="330" stroke="#fbbf24" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="740" y1="260" x2="740" y2="280" stroke="#c084fc" stroke-width="2.5" marker-end="url(#arr)"/>
  <line x1="740" y1="380" x2="740" y2="420" stroke="#10b981" stroke-width="2.5" marker-end="url(#arr)"/>
</svg>`;
  }

  // For all other topics, generate a Mermaid fallback diagram
  // and render it as a simple SVG text representation
  const mermaidFallback = getSmartFallbackMermaid(query);
  // Extract node labels from mermaid code for SVG rendering
  const nodeLabels: string[] = [];
  const labelRegex = /\["([^"]+)"\]|\(\("([^"]+)"\)\)|\("([^"]+)"\)/g;
  let match;
  while ((match = labelRegex.exec(mermaidFallback)) !== null) {
    nodeLabels.push(match[1] || match[2] || match[3] || '');
  }
  if (nodeLabels.length === 0) {
    // Fallback: extract from mindmap format
    const lines = mermaidFallback.split('\n').filter(l => l.trim() && !l.includes('root') && !l.includes('mindmap'));
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 80) {
        nodeLabels.push(trimmed);
      }
    }
  }

  const title = cleanTitle.toUpperCase();
  const nodeCount = Math.min(nodeLabels.length, 12);
  const colors = ['#6366f1', '#10b981', '#c084fc', '#f472b6', '#38bdf8', '#f43f5e', '#fbbf24', '#818cf8', '#34d399', '#e879f9', '#fb923c', '#a78bfa'];
  const fills = ['#1e1b4b', '#064e3b', '#4c1d95', '#701a75', '#1e293b', '#881337', '#78350f', '#312e81', '#065f46', '#581c87', '#7c2d12', '#3730a3'];

  let svgNodes = '';
  const cols = 3;
  const startX = 80;
  const startY = 130;
  const boxW = 250;
  const boxH = 65;
  const gapX = 30;
  const gapY = 20;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);
    const color = colors[i % colors.length];
    const fill = fills[i % fills.length];
    const label = nodeLabels[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const truncLabel = label.length > 35 ? label.substring(0, 32) + '...' : label;

    svgNodes += `
  <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="10" fill="${fill}" stroke="${color}" stroke-width="2"/>
  <text x="${x + boxW / 2}" y="${y + boxH / 2 + 5}" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle" font-family="sans-serif">${truncLabel}</text>`;
  }

  // Add connecting lines between rows
  let svgLines = '';
  for (let i = 0; i < nodeCount - cols; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x1 = startX + col * (boxW + gapX) + boxW / 2;
    const y1 = startY + row * (boxH + gapY) + boxH;
    const x2 = x1;
    const y2 = startY + (row + 1) * (boxH + gapY);
    const color = colors[(i + 2) % colors.length];
    svgLines += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-dasharray="4,4"/>`;
  }

  const totalHeight = startY + Math.ceil(nodeCount / cols) * (boxH + gapY) + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 ${Math.max(620, totalHeight)}" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="950" height="${Math.max(620, totalHeight)}" rx="16" fill="url(#bg)" stroke="#1e293b" stroke-width="2"/>
  <text x="475" y="45" fill="#38bdf8" font-size="24" font-weight="800" text-anchor="middle" font-family="sans-serif">${title}</text>
  <text x="475" y="80" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="sans-serif">Educational Concept Map</text>
  <rect x="50" y="100" width="850" height="${Math.max(480, totalHeight - 120)}" rx="16" fill="#1e1b4b" fill-opacity="0.15" stroke="#334155" stroke-width="1.5" stroke-dasharray="6,6"/>
  ${svgNodes}
  ${svgLines}
</svg>`;
}

// ============================================================
// AI-POWERED MERMAID GENERATION
// Uses educational concept mapper prompt with validation.
// ============================================================
export async function generateMermaidDiagram(query: string): Promise<{ success: boolean; mermaid: string; code: string; title: string }> {
  const cleanQ = cleanQuery(query);
  const fallback = getSmartFallbackMermaid(cleanQ);

  const EDUCATIONAL_CONCEPT_MAPPER_PROMPT = `You are an expert educational concept mapper and science textbook author.

YOUR TASK: Analyze the topic "${cleanQ}" and create a comprehensive Mermaid.js concept map diagram.

STEP 1 - ANALYZE THE TOPIC:
Before writing any code, think about:
- What is "${cleanQ}"?
- What are its main components, parts, or sub-topics?
- What are the relationships between components?
- What are the inputs, outputs, cause-effect chains?
- What hierarchy exists?
- What would a textbook diagram show for this topic?

STEP 2 - CREATE THE DIAGRAM:
Generate a Mermaid.js diagram with these STRICT rules:

A) CONTENT RULES (MOST IMPORTANT):
   - Every single node MUST contain real, factual, educational content about "${cleanQ}"
   - Generate 8 to 25 nodes
   - Use branching (not just a straight vertical chain)
   - Include sub-topics, components, examples, relationships
   - Think like you are illustrating a textbook chapter

B) ABSOLUTELY BANNED NODE LABELS (will cause automatic rejection):
   - "Mechanism", "Sub-process", "Process", "Stage", "Module"
   - "Step 1", "Step 2", "Node 1", "Node 2"
   - "Input", "Output", "Fallback", "Loop"
   - "Core Mechanism", "Primary Mechanism"
   - "Key Component A", "Key Component B"
   - "Central Control", "Integration"
   - "System Synthesis", "Practical Applications"
   - Any label that could apply to ANY topic is BANNED
   - Every label must be SPECIFIC to "${cleanQ}"

C) GOOD EXAMPLES:
   Topic: "Solar System"
   ✅ "Mercury (Smallest Planet, No Atmosphere)"
   ✅ "Jupiter (Largest, Great Red Spot)"
   ✅ "Asteroid Belt (Between Mars & Jupiter)"
   ❌ "Planet Module"
   ❌ "Step 1: Process"
   ❌ "Core Mechanism"

   Topic: "Human Heart"
   ✅ "Left Ventricle (Pumps to Aorta)"
   ✅ "Pulmonary Artery (Carries Deoxygenated Blood)"
   ❌ "Stage 1"
   ❌ "Sub-process"

D) MERMAID SYNTAX:
   - Use flowchart TD, flowchart LR, mindmap, graph TD, or subgraph as appropriate
   - Enclose labels in double quotes: NodeID["Label text here"]
   - Ensure valid Mermaid syntax

E) OUTPUT:
   - Return ONLY the Mermaid code inside \`\`\`mermaid ... \`\`\` block
   - No explanations before or after`;

  const userPrompt = `Create an educational concept map for: "${cleanQ}"`;

  // Try AI generation up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[DiagramEngine] Mermaid AI generation attempt ${attempt}/2 for "${cleanQ}"`);
      const textResponse = await generateAICompletion(
        attempt === 1 ? EDUCATIONAL_CONCEPT_MAPPER_PROMPT : EDUCATIONAL_CONCEPT_MAPPER_PROMPT + '\n\nCRITICAL: Your previous response was rejected for containing placeholder labels. This time, use ONLY real educational facts specific to "' + cleanQ + '". Every node must teach something real.',
        userPrompt
      );
      
      let code = textResponse || '';
      
      // Extract mermaid code from markdown blocks
      const mermaidMatch = code.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
      if (mermaidMatch && mermaidMatch[1]) {
        code = mermaidMatch[1].trim();
      } else {
        code = code.replace(/^```(?:mermaid)?/gi, '').replace(/```$/g, '').trim();
      }

      // Verify it's actually mermaid syntax
      const isMermaid = code && (
        code.includes('graph') || code.includes('flowchart') || code.includes('mindmap') ||
        code.includes('sequenceDiagram') || code.includes('classDiagram') ||
        code.includes('timeline') || code.includes('stateDiagram') || code.includes('erDiagram')
      );

      if (!isMermaid) {
        console.warn(`[DiagramEngine] Attempt ${attempt}: Response is not valid Mermaid syntax`);
        continue;
      }

      // Validate educational quality
      if (isEducationalMermaid(code, cleanQ)) {
        console.log(`[DiagramEngine] ✅ AI Mermaid diagram accepted for "${cleanQ}" (attempt ${attempt})`);
        return { success: true, mermaid: code, code, title: cleanQ };
      } else {
        console.warn(`[DiagramEngine] Attempt ${attempt}: Mermaid diagram rejected - contains placeholder content`);
      }
    } catch (err) {
      console.error(`[DiagramEngine] Mermaid generation error (attempt ${attempt}):`, err);
    }
  }

  // Use the comprehensive topic-specific fallback
  console.log(`[DiagramEngine] Using smart fallback Mermaid for "${cleanQ}"`);
  return { success: true, mermaid: fallback, code: fallback, title: cleanQ };
}

// ============================================================
// AI-POWERED SVG GENERATION
// Uses educational concept mapper prompt with validation.
// ============================================================
export async function generateSvgDiagram(query: string, subject = 'general'): Promise<{ success: boolean; svg: string; title: string; subject: string }> {
  const cleanQ = cleanQuery(query);
  const fallback = getSmartFallbackSvg(cleanQ, subject);

  const SVG_CONCEPT_MAPPER_PROMPT = `You are an expert educational diagram illustrator creating inline SVG concept maps for textbooks.

YOUR TASK: Create a visually rich SVG diagram for the educational topic "${cleanQ}" (Subject: ${subject}).

STEP 1 - ANALYZE THE TOPIC:
- What are the main components of "${cleanQ}"?
- What hierarchy, relationships, or processes exist?
- What would a textbook illustration show?

STEP 2 - CREATE THE SVG:

A) CONTENT RULES:
   - Include 8 to 20 labeled nodes with REAL educational content about "${cleanQ}"
   - Every text label must be specific to "${cleanQ}" (no generic labels)
   - Use branching layout, not just a vertical chain

B) BANNED LABELS (automatic rejection):
   "Mechanism", "Sub-process", "Process", "Stage", "Module", "Step 1",
   "Input", "Output", "Fallback", "Core Mechanism", "Central Control",
   "System Synthesis", "Practical Applications", "Key Component"
   - Any label that could apply to ANY topic is BANNED

C) VISUAL STYLING:
   - viewBox="0 0 950 650" width="100%" height="100%"
   - Dark background: fill="#0f172a" with stroke="#1e293b"
   - Use rounded rects (rx="10") with rich colors: fill from (#1e1b4b, #064e3b, #4c1d95, #701a75, #881337, #78350f)
   - Stroke colors: (#6366f1, #10b981, #c084fc, #f472b6, #38bdf8, #f43f5e, #fbbf24)
   - Text: fill="#ffffff" font-family="sans-serif" font-weight="bold"
   - Title at top: x="475" y="45" fill="#38bdf8" font-size="24" font-weight="800" text-anchor="middle"
   - Arrow markers in <defs> section
   - Container boxes grouping related concepts

D) OUTPUT:
   - Return ONLY raw SVG code starting with <svg> and ending with </svg>
   - No markdown, no backticks, no explanations`;

  const userPrompt = `Create an educational SVG concept map for: "${cleanQ}"`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[DiagramEngine] SVG AI generation attempt ${attempt}/2 for "${cleanQ}"`);
      const textResponse = await generateAICompletion(
        attempt === 1 ? SVG_CONCEPT_MAPPER_PROMPT : SVG_CONCEPT_MAPPER_PROMPT + '\n\nCRITICAL: Previous response was rejected. Use ONLY real educational content specific to "' + cleanQ + '". No placeholder labels.',
        userPrompt
      );
      
      let text = textResponse || '';
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch && svgMatch[0]) {
        const svg = svgMatch[0];
        if (isEducationalSvg(svg, cleanQ)) {
          console.log(`[DiagramEngine] ✅ AI SVG diagram accepted for "${cleanQ}" (attempt ${attempt})`);
          return { success: true, svg, title: cleanQ, subject };
        } else {
          console.warn(`[DiagramEngine] Attempt ${attempt}: SVG rejected - contains placeholder content`);
        }
      } else {
        console.warn(`[DiagramEngine] Attempt ${attempt}: No valid SVG found in response`);
      }
    } catch (err) {
      console.error(`[DiagramEngine] SVG generation error (attempt ${attempt}):`, err);
    }
  }

  console.log(`[DiagramEngine] Using smart fallback SVG for "${cleanQ}"`);
  return { success: true, svg: fallback, title: cleanQ, subject };
}

// ============================================================
// CANVAS ELEMENT GENERATION (Whiteboard shapes)
// ============================================================
export async function generateCanvasElements(query: string, type = 'diagram'): Promise<any[]> {
  const cleanQ = cleanQuery(query);
  
  // Build educational fallback from Mermaid node labels
  const mermaidCode = getSmartFallbackMermaid(cleanQ);
  const nodeLabels: string[] = [];
  const labelRegex = /\["([^"]+)"\]|\(\("([^"]+)"\)\)/g;
  let m;
  while ((m = labelRegex.exec(mermaidCode)) !== null) {
    nodeLabels.push(m[1] || m[2] || '');
  }

  const fallbackElements: any[] = [];
  const colors = ['#312e81', '#064e3b', '#4c1d95', '#831843', '#1e293b', '#701a75', '#78350f'];
  const strokes = ['#6366f1', '#10b981', '#c084fc', '#f472b6', '#38bdf8', '#f43f5e', '#fbbf24'];
  
  // Build a grid of real educational nodes
  const count = Math.min(nodeLabels.length, 8);
  for (let i = 0; i < count; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    fallbackElements.push({
      type: 'rect',
      x: 100 + col * 250,
      y: 80 + row * 120,
      width: 220,
      height: 60,
      fill: colors[i % colors.length],
      text: nodeLabels[i].replace(/[^\x20-\x7E]/g, '').substring(0, 40)
    });
  }
  // Add connecting arrows
  for (let i = 0; i < count - 1; i++) {
    const col1 = i % 3, row1 = Math.floor(i / 3);
    const col2 = (i + 1) % 3, row2 = Math.floor((i + 1) / 3);
    fallbackElements.push({
      type: 'arrow',
      points: [
        210 + col1 * 250, 140 + row1 * 120,
        210 + col2 * 250, 80 + row2 * 120
      ],
      stroke: strokes[i % strokes.length]
    });
  }

  const systemInstruction = `You are an educational whiteboard concept mapper.
Create canvas elements for topic: "${cleanQ}".

Generate 8-15 connected whiteboard elements with REAL educational content about "${cleanQ}".
Every label must be specific to "${cleanQ}" - no generic labels like "Module", "Process", "Stage".

Allowed shapes:
- "rect": { "type": "rect", "x": 100, "y": 100, "width": 200, "height": 60, "fill": "#312e81", "text": "Real Educational Label" }
- "circle": { "type": "circle", "x": 400, "y": 300, "radius": 50, "fill": "#10b981", "text": "Label" }
- "text": { "type": "text", "x": 100, "y": 100, "text": "Sub-label", "fill": "#ffffff", "fontSize": 14 }
- "arrow": { "type": "arrow", "points": [100, 100, 250, 200], "stroke": "#ffffff" }

Return ONLY a valid JSON array. No markdown.`;

  try {
    const textResponse = await generateAICompletion(systemInstruction, `Create educational whiteboard elements for "${cleanQ}".`);
    let text = textResponse || '[]';
    text = text.replace(/^\`\`\`(json)?/m, '').replace(/\`\`\`$/m, '').trim();
    const elements = JSON.parse(text);
    if (Array.isArray(elements) && elements.length > 4) {
      return elements;
    }
  } catch (err) {
    console.error('[DiagramEngine] Canvas Elements generation error:', err);
  }

  return fallbackElements;
}
