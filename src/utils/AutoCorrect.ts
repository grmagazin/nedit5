/**
 * AutoCorrect.ts
 *
 * 100% local, lightweight client-side Smart AutoCorrect detection utility.
 *
 * Rules:
 * - No AI, no API calls, no network requests, no external dictionary.
 * - No continuous typing analysis, no per-keystroke scanning.
 * - Scans only when user completes text (Enter -> paragraph, '.' + Space -> sentence).
 * - Never modifies text silently; produces suggestions for user review.
 * - Applies changes via existing ProseMirror editor transactions for seamless Undo/Redo.
 */

import { Editor } from '@tiptap/react';

export interface AutoCorrectionItem {
  id: string;
  original: string;
  suggested: string;
  rule: string;
  from: number; // ProseMirror doc offset
  to: number;   // ProseMirror doc offset
}

export const AUTOCORRECT_STORAGE_KEY = 'nedit_autocorrect_enabled';

export function isAutoCorrectEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOCORRECT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoCorrectEnabledStorage(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOCORRECT_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors in private browsing
  }
}

// Small, fixed, hardcoded dictionary for obvious keyboard typos
const COMMON_TYPOS: Record<string, string> = {
  teh: 'the',
  adn: 'and',
  waht: 'what',
  taht: 'that',
  wiht: 'with',
  thsi: 'this',
  thier: 'their',
  recieve: 'receive',
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  untill: 'until',
  truely: 'truly',
  accomodate: 'accommodate',
  acheive: 'achieve',
  becuase: 'because',
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  isnt: "isn't",
  arent: "aren't",
  wouldnt: "wouldn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
};

// Known abbreviations that end with a dot but do NOT start a new sentence
const COMMON_ABBREVIATIONS = new Set([
  'e.g.',
  'i.e.',
  'etc.',
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'prof.',
  'vs.',
  'sr.',
  'jr.',
  'inc.',
  'ltd.',
  'co.',
]);

/**
 * Scans a specific string slice of text starting at doc position basePos.
 * Returns non-overlapping suggestions.
 */
export function scanTextChunk(
  text: string,
  basePos: number,
  isParagraphStart: boolean = false
): AutoCorrectionItem[] {
  if (!text || text.length < 2) return [];

  const rawSuggestions: AutoCorrectionItem[] = [];
  let idCounter = 0;

  // 1. Double spaces -> single space: word  word -> word word
  {
    const regex = /(\S+)( {2,})(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const orig = match[0];
      const repl = `${match[1]} ${match[3]}`;
      rawSuggestions.push({
        id: `double-space-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Double spaces',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 2. Space before punctuation -> remove: word , -> word,  or word . -> word.
  {
    const regex = /(\S+)[ \t]+([.,;:!?])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const orig = match[0];
      const repl = `${match[1]}${match[2]}`;
      rawSuggestions.push({
        id: `space-before-punct-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Space before punctuation',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 3. Missing space after punctuation -> add: word,next -> word, next
  // (Only after letters, punctuation in [,;:], followed by letters. Avoid URLs, numbers, etc.)
  {
    const regex = /\b([a-zA-Z]+)([,;:])([a-zA-Z]+)\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // Guard against protocols or email-like segments
      if (text.substring(Math.max(0, match.index - 8), match.index).includes('http')) {
        continue;
      }
      const orig = match[0];
      const repl = `${match[1]}${match[2]} ${match[3]}`;
      rawSuggestions.push({
        id: `missing-space-punct-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Missing space after punctuation',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 4. Repeated punctuation -> normalize obvious cases: !! -> !, ?? -> ?
  // (Do NOT modify intentional ellipses ....)
  {
    const regex = /(!{2,}|\?{2,})/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const orig = match[0];
      const repl = orig[0]; // '!!' -> '!', '???' -> '?'
      rawSuggestions.push({
        id: `repeated-punct-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Repeated punctuation',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 5. Opening sentence capitalization:
  // A. If start of paragraph begins with lowercase letter
  if (isParagraphStart) {
    const startMatch = text.match(/^(\s*)([a-z])([a-zA-Z0-9']*)/);
    if (startMatch) {
      const leadingSpace = startMatch[1];
      const firstChar = startMatch[2];
      const restOfWord = startMatch[3];
      const origWord = firstChar + restOfWord;
      const replWord = firstChar.toUpperCase() + restOfWord;
      const matchIndex = leadingSpace.length;
      rawSuggestions.push({
        id: `sentence-cap-start-${++idCounter}`,
        original: origWord,
        suggested: replWord,
        rule: 'Sentence capitalization',
        from: basePos + matchIndex,
        to: basePos + matchIndex + origWord.length,
      });
    }
  }

  // B. After a sentence terminator (. ! ? followed by whitespace)
  {
    const regex = /([.!?])\s+([a-z])([a-zA-Z0-9']*)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      // Check if preceded by known abbreviation like "e.g.", "i.e.", "Dr."
      const textBefore = text.slice(Math.max(0, match.index - 6), match.index + 1).toLowerCase();
      const isAbbr = Array.from(COMMON_ABBREVIATIONS).some((abbr) => textBefore.endsWith(abbr));
      if (isAbbr) continue;

      const punct = match[1];
      const firstChar = match[2];
      const restOfWord = match[3];
      const origWord = firstChar + restOfWord;
      const replWord = firstChar.toUpperCase() + restOfWord;
      // Position of the word itself
      const wordOffset = match[0].lastIndexOf(origWord);
      const wordIndex = match.index + wordOffset;

      rawSuggestions.push({
        id: `sentence-cap-${++idCounter}`,
        original: origWord,
        suggested: replWord,
        rule: 'Sentence capitalization',
        from: basePos + wordIndex,
        to: basePos + wordIndex + origWord.length,
      });
    }
  }

  // 6. English standalone i -> I (and common contractions: i'm -> I'm, i'll -> I'll, etc.)
  {
    const regex = /\bi\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      rawSuggestions.push({
        id: `pronoun-i-${++idCounter}`,
        original: 'i',
        suggested: 'I',
        rule: "Capitalize pronoun 'I'",
        from: basePos + match.index,
        to: basePos + match.index + 1,
      });
    }

    const contractionRegex = /\bi('m|'ve|'ll|'d)\b/g;
    while ((match = contractionRegex.exec(text)) !== null) {
      const orig = match[0];
      const repl = 'I' + match[1];
      rawSuggestions.push({
        id: `pronoun-i-cont-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: "Capitalize pronoun 'I'",
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 7. Common keyboard typos (small fixed hardcoded list)
  {
    const regex = /\b([a-zA-Z']+)\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      const lower = word.toLowerCase();
      if (COMMON_TYPOS[lower]) {
        let replacement = COMMON_TYPOS[lower];
        // Match original capitalization
        if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
          replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        if (word !== replacement) {
          rawSuggestions.push({
            id: `common-typo-${++idCounter}`,
            original: word,
            suggested: replacement,
            rule: 'Keyboard typo',
            from: basePos + match.index,
            to: basePos + match.index + word.length,
          });
        }
      }
    }
  }

  // 8. Accidental repeated adjacent words: the the -> the
  {
    const regex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const orig = match[0];
      const firstWord = match[1];
      rawSuggestions.push({
        id: `repeated-word-${++idCounter}`,
        original: orig,
        suggested: firstWord,
        rule: 'Repeated word',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // 9. Parentheses / brackets spacing: ( text ) -> (text), [ text ] -> [text]
  {
    // ( text )
    const parenRegex = /\(\s+([^()\n]+?)\s+\)/g;
    let match: RegExpExecArray | null;
    while ((match = parenRegex.exec(text)) !== null) {
      const orig = match[0];
      const repl = `(${match[1]})`;
      rawSuggestions.push({
        id: `paren-space-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Parentheses spacing',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }

    // [ text ]
    const bracketRegex = /\[\s+([^\[\]\n]+?)\s+\]/g;
    while ((match = bracketRegex.exec(text)) !== null) {
      const orig = match[0];
      const repl = `[${match[1]}]`;
      rawSuggestions.push({
        id: `bracket-space-${++idCounter}`,
        original: orig,
        suggested: repl,
        rule: 'Bracket spacing',
        from: basePos + match.index,
        to: basePos + match.index + orig.length,
      });
    }
  }

  // Sort by starting position and eliminate overlapping ranges
  rawSuggestions.sort((a, b) => a.from - b.from);

  const cleanSuggestions: AutoCorrectionItem[] = [];
  let lastEnd = -1;

  for (const item of rawSuggestions) {
    if (item.from >= lastEnd && item.from < item.to) {
      cleanSuggestions.push(item);
      lastEnd = item.to;
    }
  }

  return cleanSuggestions;
}

/**
 * Scans only the newly completed paragraph (triggered on Enter).
 */
export function scanCompletedParagraph(editor: Editor): AutoCorrectionItem[] {
  if (!editor || editor.isDestroyed) return [];

  const { $from } = editor.state.selection;

  // Find the block node immediately before or at the current position
  let targetNode = null;
  let targetPos = 0;

  // If user just pressed Enter, cursor is in a new empty paragraph.
  // The completed paragraph is the node before $from.
  const depth = $from.depth;
  if (depth > 0) {
    const parent = $from.parent;
    if (parent.textContent.trim() === '' && $from.index(depth - 1) > 0) {
      // Previous sibling inside parent container
      const parentNode = $from.node(depth - 1);
      const prevIndex = $from.index(depth - 1) - 1;
      targetNode = parentNode.child(prevIndex);
      targetPos = $from.start(depth - 1);
      for (let i = 0; i < prevIndex; i++) {
        targetPos += parentNode.child(i).nodeSize;
      }
      targetPos += 1; // Content offset
    } else {
      // Current paragraph node
      targetNode = parent;
      targetPos = $from.start(depth);
    }
  }

  if (!targetNode || !targetNode.textContent) return [];

  const text = targetNode.textContent;
  return scanTextChunk(text, targetPos, true);
}

/**
 * Scans only the newly completed sentence (triggered on '.' followed by Space).
 */
export function scanCompletedSentence(editor: Editor): AutoCorrectionItem[] {
  if (!editor || editor.isDestroyed) return [];

  const { $from, from } = editor.state.selection;
  const parent = $from.parent;
  if (!parent || !parent.textContent) return [];

  const paraStart = $from.start($from.depth);
  const offsetInPara = from - paraStart;
  const textBeforeCursor = parent.textContent.slice(0, offsetInPara);

  // Find the start of the current sentence: after previous .!? or start of paragraph
  const lastEnderMatch = textBeforeCursor.slice(0, -2).match(/.*[.!?]\s+/);
  const sentenceStartIndex = lastEnderMatch ? lastEnderMatch[0].length : 0;
  const sentenceText = textBeforeCursor.slice(sentenceStartIndex);

  if (!sentenceText || sentenceText.length < 3) return [];

  const sentenceBasePos = paraStart + sentenceStartIndex;
  const isParaStart = sentenceStartIndex === 0;

  return scanTextChunk(sentenceText, sentenceBasePos, isParaStart);
}

/**
 * Applies a single AutoCorrect suggestion using existing ProseMirror transactions.
 * Fully compatible with Undo/Redo.
 */
export function applyAutoCorrection(editor: Editor, item: AutoCorrectionItem): boolean {
  if (!editor || editor.isDestroyed) return false;

  try {
    const currentText = editor.state.doc.textBetween(item.from, item.to, ' ');
    if (currentText !== item.original) {
      // Document text shifted or changed; abort gracefully
      return false;
    }

    const tr = editor.state.tr.replaceWith(
      item.from,
      item.to,
      editor.state.schema.text(item.suggested)
    );
    editor.view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Applies all AutoCorrect suggestions in reverse document position order.
 * Commits a single transaction for atomic Undo.
 */
export function applyAllAutoCorrections(editor: Editor, items: AutoCorrectionItem[]): boolean {
  if (!editor || editor.isDestroyed || items.length === 0) return false;

  try {
    let tr = editor.state.tr;
    // Sort in reverse order of position so edits don't shift subsequent offsets
    const sorted = [...items].sort((a, b) => b.from - a.from);

    let appliedCount = 0;
    for (const item of sorted) {
      const currentText = tr.doc.textBetween(item.from, item.to, ' ');
      if (currentText === item.original) {
        tr = tr.replaceWith(
          item.from,
          item.to,
          editor.state.schema.text(item.suggested)
        );
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      editor.view.dispatch(tr);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
