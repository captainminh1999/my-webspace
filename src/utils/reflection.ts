// The questions under the verse. Each set follows a long-used way of reading a verse
// slowly; the wording is this site's own, in the first person, and fits any verse.
// The feed stores the day's set with the verse (src/utils/verse.ts `rotate`).
//
// House rules (src/utils/__tests__/reflection.test.ts holds them): four questions a set,
// at most 110 characters each — the card never clamps a question, so length is kept here.

export interface Method {
  name: string;
  /** One line for the dialog on where the method comes from. */
  note: string;
  questions: [string, string, string, string];
}

export const METHODS: readonly Method[] = [
  {
    name: "Observe · Interpret · Apply",
    note: "The inductive method: what it says, what it means, what I do about it.",
    questions: [
      "What does this verse actually say? Which words carry the weight?",
      "What would it have meant to the people who first heard it?",
      "What does it show me about God, and about people?",
      "Where does it meet my life this week, and what will I do about it?",
    ],
  },
  {
    name: "Discovery",
    note: "The four questions of a Discovery Bible Study.",
    questions: [
      "What does this tell me about God?",
      "What does it tell me about people, and about me?",
      "If I take this as true, what changes in how I live today?",
      "Who could I share this with, and how would I say it in my own words?",
    ],
  },
  {
    name: "SOAP",
    note: "Scripture, Observation, Application, Prayer — a journalling sequence.",
    questions: [
      "Scripture: which word or phrase do I want to write down and keep?",
      "Observation: what is happening here, and what stands out to me?",
      "Application: what is one concrete thing this asks of me today?",
      "Prayer: what do I want to say to God in response?",
    ],
  },
  {
    name: "Lectio Divina",
    note: "Read, reflect, respond, rest — the four steps of a twelfth-century way of praying with Scripture.",
    questions: [
      "Read: going through it slowly, which word or phrase stays with me?",
      "Reflect: why that phrase? What is it touching in my life right now?",
      "Respond: what do I want to say to God about it?",
      "Rest: can I stay quietly with this for a minute before moving on?",
    ],
  },
  {
    name: "Sword",
    note: "The sword method: what the verse shows of God and of people, then what to hold on to and what to do.",
    questions: [
      "What do I learn about God here?",
      "What do I learn about people?",
      "Is there a promise to hold on to, or an example to follow?",
      "Is there something to stop, or something to start, because of this?",
    ],
  },
];

/** What the card shows when a stored verse carries no questions (a document written by hand, an older shape). */
export const FALLBACK_QUESTIONS: readonly string[] = METHODS[0].questions;
