/**
 * aiRewriteService.ts
 * Smart, Safe AI Document & Selection Rewrite Service.
 * Powered by Gemini 3.8 Flash with a high-fidelity local safe linguistic engine fallback.
 */

export type RewriteTone =
  | 'safe_optimize'
  | 'professional'
  | 'concise'
  | 'formal'
  | 'friendly'
  | 'greek_formal'
  | 'greek_concise'
  | 'custom';

export interface ToneDefinition {
  id: RewriteTone;
  label: string;
  badge: string;
  description: string;
  iconName?: string;
  isGreek?: boolean;
}

export const REWRITE_TONES: ToneDefinition[] = [
  {
    id: 'safe_optimize',
    label: 'Safe Optimize',
    badge: 'Recommended',
    description: 'Fix grammatical flow, remove awkward phrasing, tighten sentences, strictly preserve facts & figures.',
  },
  {
    id: 'professional',
    label: 'Executive Professional',
    badge: 'Business',
    description: 'Polished, authoritative, boardroom-ready phrasing with crisp business vocabulary.',
  },
  {
    id: 'concise',
    label: 'Concise & High-Impact',
    badge: 'Shorten ~35%',
    description: 'Cut filler words and redundant clauses; maximize punch and readability.',
  },
  {
    id: 'formal',
    label: 'Formal Academic',
    badge: 'Scholarly',
    description: 'Elevated academic register, objective syntax, and sophisticated terminology.',
  },
  {
    id: 'friendly',
    label: 'Clear & Conversational',
    badge: 'Engaging',
    description: 'Warm, approachable, natural voice while maintaining clarity and correctness.',
  },
  {
    id: 'greek_formal',
    label: 'Greek Formal (Επίσημο)',
    badge: 'Ελληνικά',
    description: 'Υψηλό επαγγελματικό και διοικητικό επίπεδο γλώσσας με άψογη σύνταξη και ορολογία.',
    isGreek: true,
  },
  {
    id: 'greek_concise',
    label: 'Greek Concise (Συνοπτικό)',
    badge: 'Ελληνικά',
    description: 'Σύντομη, περιεκτική διατύπωση στα ελληνικά με ανάδειξη των βασικών σημείων.',
    isGreek: true,
  },
];

export interface RewriteOptions {
  tone: RewriteTone;
  customInstruction?: string;
  scope?: 'selection' | 'document';
  apiKey?: string;
}

export interface RewriteResult {
  text: string;
  originalWordCount: number;
  newWordCount: number;
  reductionPercent: number;
  tone: RewriteTone;
  isAiGenerated: boolean;
  notes?: string;
}

/**
 * Count words safely in unicode/multilingual text
 */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Local heuristic safe optimizer fallback.
 * Guarantees that even when offline or without an API key, the user gets a real,
 * polished, enhanced document without errors or fake text.
 */
export function localSafeOptimize(text: string, tone: RewriteTone, customInstruction?: string): string {
  if (!text || !text.trim()) return '';

  let processed = text;

  // 1. Clean extraneous spaces and normalize line endings
  processed = processed.replace(/[ \t]+/g, ' ');
  processed = processed.replace(/\n{3,}/g, '\n\n');

  // 2. Fix sentence case capitalization after periods
  processed = processed.replace(/([.!?]\s+)([a-z\u03b1-\u03c9])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // 3. Remove common English wordiness / redundancy fillers
  const redundancies: [RegExp, string][] = [
    [/\bin order to\b/gi, 'to'],
    [/\bdue to the fact that\b/gi, 'because'],
    [/\bat this point in time\b/gi, 'currently'],
    [/\bfor the purpose of\b/gi, 'to'],
    [/\ba majority of\b/gi, 'most'],
    [/\butilize\b/gi, 'use'],
    [/\butilizing\b/gi, 'using'],
    [/\bin the event that\b/gi, 'if'],
    [/\bhas the ability to\b/gi, 'can'],
    [/\bprior to\b/gi, 'before'],
    [/\bsubsequent to\b/gi, 'after'],
    [/\bwith regard to\b/gi, 'regarding'],
    [/\bin light of the fact that\b/gi, 'since'],
    [/\bpoint in time\b/gi, 'moment'],
    [/\babsolutely essential\b/gi, 'essential'],
    [/\bcompletely eliminate\b/gi, 'eliminate'],
  ];

  if (tone === 'concise' || tone === 'safe_optimize' || tone === 'professional') {
    for (const [pattern, replacement] of redundancies) {
      processed = processed.replace(pattern, replacement);
    }
  }

  // 4. Tone specific adjustments
  if (tone === 'concise') {
    // Trim passive lead-ins
    processed = processed.replace(/\bIt is important to note that\s*/gi, '');
    processed = processed.replace(/\bPlease note that\s*/gi, '');
    processed = processed.replace(/\bAs a matter of fact,\s*/gi, '');
  } else if (tone === 'formal') {
    // Formal replacements
    processed = processed.replace(/\bcan't\b/gi, 'cannot');
    processed = processed.replace(/\bwon't\b/gi, 'will not');
    processed = processed.replace(/\bdon't\b/gi, 'do not');
    processed = processed.replace(/\bit's\b/gi, 'it is');
    processed = processed.replace(/\bthey're\b/gi, 'they are');
    processed = processed.replace(/\bwe're\b/gi, 'we are');
  } else if (tone === 'greek_formal') {
    // Greek formal touch-ups: fix spacing around Greek punctuation and common formal idioms
    processed = processed.replace(/\s+;/g, ';');
    processed = processed.replace(/\s+:/g, ':');
    processed = processed.replace(/\bγια να\b/g, 'προκειμένου να');
  } else if (tone === 'greek_concise') {
    processed = processed.replace(/\bΕίναι σημαντικό να σημειωθεί ότι\s*/gi, '');
    processed = processed.replace(/\s+;/g, ';');
  }

  return processed.trim();
}

/**
 * Execute real Safe AI Rewrite using Gemini 3.8 Flash with full error recovery.
 */
export async function generateSafeRewrite(
  inputText: string,
  options: RewriteOptions
): Promise<RewriteResult> {
  const original = inputText.trim();
  if (!original) {
    throw new Error('Please select or provide text to rewrite.');
  }

  const originalWordCount = countWords(original);
  const { tone, customInstruction, apiKey } = options;

  // Build targeted system instruction
  const toneGuides: Record<RewriteTone, string> = {
    safe_optimize:
      'Objective: Safe Optimize. Carefully fix typos, awkward phrasing, redundancy, and grammatical flow while strictly preserving the author\'s original meaning, facts, numbers, dates, and formatting structure.',
    professional:
      'Objective: Executive Professional. Polish the text into authoritative, articulate, and confident corporate writing suitable for executive presentations, business reports, and stakeholder communications.',
    concise:
      'Objective: Concise & High-Impact. Tighten and condense the text by approximately 30-40%. Eliminate unnecessary filler, weak verbs, and redundant explanations. Keep every critical detail and action point.',
    formal:
      'Objective: Formal Academic. Elevate the vocabulary to an academic, analytical, and scholarly register. Use objective third-person syntax where appropriate and maintain precise terminology.',
    friendly:
      'Objective: Clear & Conversational. Rewrite into an approachable, warm, and natural voice. Simplify convoluted clauses while keeping the content professional and easy to read.',
    greek_formal:
      'Objective: Greek Formal (Επίσημο & Διοικητικό). Rewrite into high-register, professional modern Greek suitable for official documents, corporate proposals, and administrative correspondence. Maintain grammatical precision and accurate terminology.',
    greek_concise:
      'Objective: Greek Concise (Συνοπτικό Έγγραφο). Condense the text in modern Greek into a direct, punchy, and clear format with distinct paragraphs or bullet points highlighting key takeaways.',
    custom: `Objective: Custom Optimization. Follow these user instructions strictly: "${customInstruction || 'Improve clarity and flow'}"`,
  };

  const systemInstruction = `You are a premier document writing and tone optimization engine integrated into a professional document editor.
${toneGuides[tone]}
${customInstruction && tone !== 'custom' ? `Additional User Guidance: "${customInstruction}"` : ''}

CRITICAL RULES:
1. Output ONLY the rewritten text. Do NOT include greetings, preamble, explanations, quotes around the text, or conversational notes like "Here is your rewrite:".
2. Preserve existing paragraphs, lists, and structural layout unless explicitly asked to summarize into bullets.
3. Strictly preserve all factual assertions, proper nouns, numerical figures, and citations.
4. If the text is in Greek, maintain natural, grammatically correct Greek. If in English, maintain natural English.`;

  try {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-gemini-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        prompt: `Please rewrite the following text according to your system instructions:\n\n"""\n${original}\n"""`,
        systemInstruction,
        apiKey: apiKey || undefined,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      let text = (data.text || '').trim();

      // Clean any accidental markdown code fences if model enclosed it
      if (text.startsWith('```') && text.endsWith('```')) {
        text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      }

      if (text && text.length > 5) {
        const newWordCount = countWords(text);
        const diff = originalWordCount - newWordCount;
        const reductionPercent = originalWordCount > 0 ? Math.round((diff / originalWordCount) * 100) : 0;

        return {
          text,
          originalWordCount,
          newWordCount,
          reductionPercent,
          tone,
          isAiGenerated: true,
          notes: 'Enhanced via Gemini 3.8 Flash',
        };
      }
    }

    // If server responded with error, grab detail if possible
    const errData = await response.json().catch(() => null);
    console.warn('Gemini endpoint returned error, falling back to Safe Local Optimizer:', errData?.error);
  } catch (err: any) {
    console.warn('Network or API call failed, activating Safe Local Optimizer:', err?.message);
  }

  // Fallback to Safe Local Linguistic Engine
  const localResult = localSafeOptimize(original, tone, customInstruction);
  const newWordCount = countWords(localResult);
  const diff = originalWordCount - newWordCount;
  const reductionPercent = originalWordCount > 0 ? Math.round((diff / originalWordCount) * 100) : 0;

  return {
    text: localResult,
    originalWordCount,
    newWordCount,
    reductionPercent,
    tone,
    isAiGenerated: false,
    notes: 'Optimized via Safe Local Linguistic Engine',
  };
}
