import { Folder, Word, WordFolder, WordState, Production } from "./types";

export const SEED_FOLDERS: Folder[] = [
  { id: "root", name: "Root", parentId: null },
  { id: "f_phil", name: "Philosophy", parentId: "root" },
  { id: "f_sys", name: "Systems Engineering", parentId: "root" },
  { id: "f_strat", name: "Strategy", parentId: "root" },
  { id: "f_ai", name: "Artificial Intelligence", parentId: "root" },
  { id: "f_pysch", name: "Psychology", parentId: "root" },
];

const RAW_WORDS_MAP = {
  f_phil: [
    "Epistemology",
    "Ontology",
    "Dialectic",
    "Phenomenology",
    "Telos",
    "Praxis",
    "Hermeneutics",
    "Axiology",
    "Gestalt",
    "Recursive",
  ],
  f_sys: [
    "Entropy",
    "Latency",
    "Throughput",
    "Bottleneck",
    "Idempotence",
    "Coupling",
    "Cohesion",
    "Consensus",
    "Topology",
    "Invariant",
    "Abstraction",
    "Modularity",
  ],
  f_strat: [
    "Leverage",
    "Moat",
    "Optionality",
    "Flywheel",
    "Arbitrage",
    "Unbundling",
    "Tailwind",
    "Churn",
    "CAC",
    "LTV",
  ],
  f_ai: [
    "Gradient",
    "Backpropagation",
    "Embedding",
    "Inference",
    "Loss Function",
    "Token",
    "Context Window",
    "Hallucination",
    "Alignment",
    "Fine-tuning",
  ],
  f_pysch: [
    "Cognitive Load",
    "Flow State",
    "Salience",
    "Heuristic",
    "Bias",
    "Dissonance",
    "Priming",
    "Dopamine",
    "Reinforcement",
    "Neuroplasticity",
  ],
};

// Flatten Words and Create Relationships
let words: Word[] = [];
let wordFolders: WordFolder[] = [];
let wordIdCounter = 1;

Object.entries(RAW_WORDS_MAP).forEach(([folderId, terms]) => {
  terms.forEach((term) => {
    // Check if word already exists (handle cross-domain duplicates if any)
    let existingWord = words.find((w) => w.term === term);
    let wordId = existingWord ? existingWord.id : `w_${wordIdCounter++}`;

    if (!existingWord) {
      words.push({ id: wordId, term });
    }

    // Link to folder
    wordFolders.push({ wordId, folderId });
  });
});

export const SEED_WORDS = words;
export const SEED_WORD_FOLDERS = wordFolders;

const INITIAL_TIMESTAMP = Date.now();

// Initialize all words as "NEW"
export const SEED_WORD_STATES: WordState[] = SEED_WORDS.map((w) => ({
  wordId: w.id,
  recognitionScore: 0,
  recallScore: 0,
  lastReviewedAt: 0,
  nextReviewAt: INITIAL_TIMESTAMP, // Due immediately
  updatedAt: INITIAL_TIMESTAMP,
  needsSync: false,
}));

export const SEED_PRODUCTIONS: Production[] = [];
