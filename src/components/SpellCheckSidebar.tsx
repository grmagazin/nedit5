import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Search,
  RotateCw,
  X,
  Eraser,
  Check,
  CheckCheck,
  Shield,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface SpellIssue {
  id: string;
  word: string;
  message: string;
  suggestions: string[];
  selectedSuggestion: string;
  offset?: number;
  length?: number;
}

interface SpellCheckSidebarProps {
  editor: Editor | null;
  onClose: () => void;
}

const LOCAL_STORAGE_KEY_IGNORE_SYMBOLS = 'word_spell_ignore_symbols';
const LOCAL_STORAGE_KEY_IGNORE_UPPERCASE = 'word_spell_ignore_uppercase';
const LOCAL_STORAGE_KEY_IGNORED_WORDS = 'word_spell_ignored_words';

/**
 * Retrieve persistent ignored words Set from localStorage
 */
export function getStoredIgnoredWords(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_IGNORED_WORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(
          parsed.map((item: string) => String(item).toLowerCase().trim()).filter(Boolean)
        );
      }
    }
  } catch (err) {
    console.warn('Failed to load ignored words from localStorage', err);
  }
  return new Set<string>();
}

/**
 * Persist ignored words Set to localStorage
 */
export function saveStoredIgnoredWords(words: Set<string>): void {
  try {
    const arr = Array.from(words);
    localStorage.setItem(LOCAL_STORAGE_KEY_IGNORED_WORDS, JSON.stringify(arr));
  } catch (err) {
    console.warn('Failed to persist ignored words to localStorage', err);
  }
}

/**
 * Filter 1 Helper:
 * Determines if a token should be ignored:
 * Single characters, isolated symbols, punctuation-only, numeric-only,
 * or tokens primarily consisting of special characters/numbers.
 */
export function isSingleCharOrSymbolToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return true;

  // 1. Single character token (or single emoji/symbol)
  if ([...trimmed].length <= 1) return true;

  // 2. Contains no Unicode alphabetic letters at all (punctuation, symbols, or numbers only)
  if (!/\p{L}/u.test(trimmed)) return true;

  // 3. Tokens consisting primarily of special characters or numbers
  const letters = (trimmed.match(/\p{L}/gu) || []).length;
  const nonLetters = trimmed.length - letters;
  // If non-letters >= letters, or only 1 letter in a token with digits/symbols (e.g. "v1.2", "4K", "#1", "$50")
  if (letters <= 1 || nonLetters >= letters) return true;

  return false;
}

/**
 * Filter 2 Helper:
 * Determines if a word is written entirely in uppercase letters.
 * E.g. "API", "NASA", "DOCX", "HTML", "GRMAGAZIN", "ISO"
 */
export function isAllUppercaseWord(token: string): boolean {
  const trimmed = token.trim();
  // Strip leading and trailing punctuation (e.g. "(NASA)" -> "NASA", "HTML," -> "HTML")
  const clean = trimmed.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const letters = clean.match(/\p{L}/gu);
  if (!letters || letters.length === 0) return false;

  // Must have at least 2 letters and all letters must be uppercase
  return letters.every((ch) => ch === ch.toUpperCase() && ch !== ch.toLowerCase());
}

const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'el-GR', label: 'Greek' },
  { code: 'de-DE', label: 'German' },
  { code: 'fr-FR', label: 'French' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-PT', label: 'Portuguese' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'ru-RU', label: 'Russian' },
];

// Common typo corrections dictionary for instant smart fallback
const FALLBACK_DICTIONARY: Record<string, string[]> = {
  targer: ['larger', 'target', 'Target', 'tagger', 'tarter'],
  comand: ['COMMAND', 'COMA ND', 'command', 'common'],
  paragrap: ['paragraph', 'paragraphs', 'paragraphic'],
  pargrgraph: ['paragraph', 'paragraphs'],
  paragrph: ['paragraph', 'paragraphs'],
  paragraf: ['paragraph', 'paragraphs'],
  selecton: ['selection', 'selections', 'section'],
  selecction: ['selection', 'selections'],
  selectin: ['selection', 'select in'],
  seletion: ['selection', 'sedition', 'section'],
  teaget: ['target', 'tea get'],
  lemect: ['select', 'detect'],
  foculed: ['focused', 'fouled'],
  ech: ['each', 'echo'],
  exelent: ['excellent'],
  libraies: ['libraries'],
  cheker: ['checker'],
  aligment: ['alignment'],
  sute: ['sure', 'suite'],
  ececute: ['execute'],
  dont: ["don't"],
  cant: ["can't"],
  wont: ["won't"],
  recieve: ['receive'],
  seperate: ['separate'],
  untill: ['until'],
  occured: ['occurred'],
  truely: ['truly'],
  wich: ['which'],
  definately: ['definitely'],
};

export const SpellCheckSidebar: React.FC<SpellCheckSidebarProps> = ({ editor, onClose }) => {
  const [selectedLang, setSelectedLang] = useState('auto');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<SpellIssue[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Filter 1 & Filter 2 toggles: Defaults both ON (true), persisted in localStorage
  const [ignoreSymbols, setIgnoreSymbols] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_IGNORE_SYMBOLS);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [ignoreUppercase, setIgnoreUppercase] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_IGNORE_UPPERCASE);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Persistent ignore list loaded from localStorage
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(() => getStoredIgnoredWords());

  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification(null);
    }, 2800);
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Perform Spell Check using LanguageTool Public Free API with smart offline fallback
  const runSpellCheck = async (
    overrideIgnoreSymbols?: boolean,
    overrideIgnoreUppercase?: boolean,
    overrideIgnoredWords?: Set<string>
  ) => {
    if (!editor) return;
    const docText = editor.getText();

    const filterSymbols =
      overrideIgnoreSymbols !== undefined ? overrideIgnoreSymbols : ignoreSymbols;
    const filterUppercase =
      overrideIgnoreUppercase !== undefined ? overrideIgnoreUppercase : ignoreUppercase;
    const activeIgnoredWords =
      overrideIgnoredWords !== undefined ? overrideIgnoredWords : ignoredWords;

    if (!docText.trim()) {
      setIssues([]);
      setHasChecked(true);
      showNotification('Document is empty');
      return;
    }

    setIsChecking(true);

    try {
      // 1. Attempt LanguageTool Free API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const params = new URLSearchParams();
      params.append('text', docText);
      params.append('language', selectedLang);

      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const matches: any[] = data.matches || [];

        const parsedIssues: SpellIssue[] = [];
        const seenWords = new Set<string>();

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const rawWord = docText.substring(match.offset, match.offset + match.length).trim();
          if (!rawWord || seenWords.has(rawWord.toLowerCase())) continue;

          // Check 0: Persistent local ignore list (prevents flagging in future sessions)
          if (activeIgnoredWords.has(rawWord.toLowerCase())) {
            continue;
          }

          // Check 1: Ignore single characters & symbols
          if (filterSymbols && isSingleCharOrSymbolToken(rawWord)) {
            continue;
          }

          // Check 2: Ignore uppercase words (e.g. API, NASA, DOCX, HTML)
          if (filterUppercase && isAllUppercaseWord(rawWord)) {
            continue;
          }

          seenWords.add(rawWord.toLowerCase());

          const suggestions = (match.replacements || [])
            .map((r: any) => r.value)
            .filter((v: string) => v && v.trim() !== rawWord)
            .slice(0, 5);

          parsedIssues.push({
            id: `issue-${i}-${rawWord}`,
            word: rawWord,
            message: match.message || 'Possible spelling mistake found.',
            suggestions: suggestions.length > 0 ? suggestions : ['Correction unavailable'],
            selectedSuggestion: suggestions[0] || rawWord,
            offset: match.offset,
            length: match.length,
          });
        }

        setIssues(parsedIssues);
        setHasChecked(true);
        showNotification(
          parsedIssues.length === 0
            ? 'No spelling mistakes found!'
            : `Found ${parsedIssues.length} spelling issue${parsedIssues.length > 1 ? 's' : ''}`
        );
        setIsChecking(false);
        return;
      }
    } catch (err) {
      // Fall through to smart local spell check
      console.warn('LanguageTool API unavailable or timed out, using smart spelling engine:', err);
    }

    // 2. Smart local dictionary fallback
    const localIssues: SpellIssue[] = [];
    const seenLocal = new Set<string>();
    const words = docText.match(/[\p{L}\p{N}'-]+/gu) || [];

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const lower = w.toLowerCase();

      // Check 0: Persistent local ignore list (prevents flagging in future sessions)
      if (activeIgnoredWords.has(lower)) {
        continue;
      }

      // Check 1: Ignore single characters & symbols
      if (filterSymbols && isSingleCharOrSymbolToken(w)) {
        continue;
      }

      // Check 2: Ignore uppercase words (e.g. API, NASA, DOCX, HTML)
      if (filterUppercase && isAllUppercaseWord(w)) {
        continue;
      }

      if (seenLocal.has(lower)) continue;

      if (FALLBACK_DICTIONARY[lower]) {
        seenLocal.add(lower);
        const suggestions = FALLBACK_DICTIONARY[lower];
        localIssues.push({
          id: `local-${i}-${w}`,
          word: w,
          message: 'Possible spelling mistake found.',
          suggestions,
          selectedSuggestion: suggestions[0] || w,
        });
      }
    }

    setIssues(localIssues);
    setHasChecked(true);
    showNotification(
      localIssues.length === 0
        ? 'No spelling mistakes found!'
        : `Found ${localIssues.length} spelling issue${localIssues.length > 1 ? 's' : ''}`
    );
    setIsChecking(false);
  };

  // Toggle Check 1: Ignore Single Characters & Symbols
  const handleToggleIgnoreSymbols = () => {
    const nextVal = !ignoreSymbols;
    setIgnoreSymbols(nextVal);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_IGNORE_SYMBOLS, String(nextVal));
    } catch (e) {
      console.warn('LocalStorage quota or access error saving spell settings', e);
    }
    runSpellCheck(nextVal, ignoreUppercase);
  };

  // Toggle Check 2: Ignore UPPERCASE Words
  const handleToggleIgnoreUppercase = () => {
    const nextVal = !ignoreUppercase;
    setIgnoreUppercase(nextVal);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_IGNORE_UPPERCASE, String(nextVal));
    } catch (e) {
      console.warn('LocalStorage quota or access error saving spell settings', e);
    }
    runSpellCheck(ignoreSymbols, nextVal);
  };

  // Run on mount
  useEffect(() => {
    runSpellCheck();
  }, []);

  // Select a suggestion pill
  const handleSelectSuggestion = (issueId: string, suggestion: string) => {
    setIssues((prev) =>
      prev.map((iss) => (iss.id === issueId ? { ...iss, selectedSuggestion: suggestion } : iss))
    );
  };

  // Replace word in document
  const handleAcceptAll = (issue: SpellIssue) => {
    if (!editor) return;
    const oldWord = issue.word;
    const newWord = issue.selectedSuggestion;

    const doc = editor.state.doc;
    const tr = editor.state.tr;
    const matches: { from: number; to: number }[] = [];

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text;
        const regex = new RegExp(`\\b${escapeRegExp(oldWord)}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
          });
        }
      }
    });

    if (matches.length > 0) {
      // Replace backwards to prevent offset drift
      for (let i = matches.length - 1; i >= 0; i--) {
        tr.insertText(newWord, matches[i].from, matches[i].to);
      }
      editor.view.dispatch(tr);
      showNotification(`Replaced "${oldWord}" with "${newWord}"`);
    } else {
      showNotification(`Word "${oldWord}" not found`);
    }

    // Remove this issue
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
  };

  // Ignore word and dismiss card (persists word to localStorage ignore list)
  const handleIgnoreAll = (issueId: string) => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (targetIssue) {
      const w = targetIssue.word.toLowerCase().trim();
      if (w) {
        const updated = new Set(ignoredWords);
        updated.add(w);
        saveStoredIgnoredWords(updated);
        setIgnoredWords(updated);
        showNotification(`Ignored "${targetIssue.word}" (saved to ignore list)`);
      }
    }
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
  };

  // Batch Ignore All: Adds all currently flagged words to the persistent local ignore list in localStorage
  const handleBatchIgnoreAll = () => {
    if (issues.length === 0) return;

    const updated = new Set(ignoredWords);
    let newlyAdded = 0;

    issues.forEach((iss) => {
      const w = iss.word.toLowerCase().trim();
      if (w) {
        if (!updated.has(w)) newlyAdded++;
        updated.add(w);
      }
    });

    saveStoredIgnoredWords(updated);
    setIgnoredWords(updated);
    const count = issues.length;
    setIssues([]);

    showNotification(
      `Batch ignored ${count} word${count > 1 ? 's' : ''} (saved to persistent ignore list)`
    );
  };

  // Clear all issues from current view
  const handleClearAll = () => {
    setIssues([]);
    showNotification('Cleared all proofing issues from view');
  };

  // Clear all persistent ignored words from localStorage
  const handleClearIgnoredWordsList = () => {
    const count = ignoredWords.size;
    const emptySet = new Set<string>();
    saveStoredIgnoredWords(emptySet);
    setIgnoredWords(emptySet);
    showNotification(`Reset ${count} word${count > 1 ? 's' : ''} from persistent ignore list`);
    runSpellCheck(ignoreSymbols, ignoreUppercase, emptySet);
  };

  // Focus and select word in document
  const handleLocateWord = (word: string) => {
    if (!editor) return;
    const doc = editor.state.doc;
    let foundPos = -1;
    let foundLen = 0;

    doc.descendants((node, pos) => {
      if (foundPos !== -1) return false;
      if (node.isText && node.text) {
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        const match = regex.exec(node.text);
        if (match) {
          foundPos = pos + match.index;
          foundLen = match[0].length;
          return false;
        }
      }
    });

    if (foundPos !== -1) {
      editor.chain().focus().setTextSelection({ from: foundPos, to: foundPos + foundLen }).run();
    }
  };

  const currentLangObj =
    LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0];

  return (
    <aside
      aria-label="Spell Check Sidebar"
      className="w-84 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-30 select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-[#1e295d] font-bold text-base">
          <Search size={19} className="stroke-[2.5]" />
          <span>Spell Check</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleClearAll}
            title="Clear all / Ignore all"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Eraser size={18} />
          </button>
          <button
            onClick={onClose}
            title="Close Spell Check"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Language Selector + Check Button Row */}
      <div className="p-3.5 border-b border-slate-100 bg-[#fafafa]">
        <div className="flex items-center space-x-2">
          {/* Custom Language Dropdown */}
          <div className="relative flex-1" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:border-slate-400 transition-colors cursor-pointer shadow-2xs"
            >
              <span className="truncate">{currentLangObj.label}</span>
              <ChevronDown size={14} className="text-slate-500 ml-1 shrink-0" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto py-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = lang.code === selectedLang;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLang(lang.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#185abd] text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {isSelected && <Check size={13} className="text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Check Button */}
          <button
            onClick={() => runSpellCheck()}
            disabled={isChecking}
            className="bg-[#1e295d] hover:bg-[#151f46] active:bg-[#0f1633] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-75"
          >
            <RotateCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>Check</span>
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusNotification && (
          <div className="mt-2 text-center text-[11px] font-semibold text-[#1e295d] bg-blue-50/80 border border-blue-100 rounded-md py-1 px-2 animate-fade-in">
            {statusNotification}
          </div>
        )}

        {/* Lightweight Proofing Filters (Check 1 & Check 2) */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2 text-[11px]">
          {/* check 1. Ignore Single Characters & Symbols */}
          <div className="flex items-center justify-between group">
            <div
              onClick={handleToggleIgnoreSymbols}
              className="flex flex-col cursor-pointer select-none pr-2 group-hover:text-slate-900 transition-colors"
            >
              <span className="font-semibold text-slate-800 text-[11.5px]">
                Ignore Single Characters &amp; Symbols
              </span>
              <span className="text-[10px] text-slate-500">
                Ignore single chars, symbols, numbers (#, 12, &amp;)
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ignoreSymbols}
              onClick={handleToggleIgnoreSymbols}
              title={
                ignoreSymbols
                  ? 'ON: Ignore single-character tokens, isolated symbols, punctuation-only, and numeric-only tokens'
                  : 'OFF: Check single characters and symbols normally'
              }
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                ignoreSymbols ? 'bg-[#185abd]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  ignoreSymbols ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* check 2. Ignore UPPERCASE Words */}
          <div className="flex items-center justify-between group">
            <div
              onClick={handleToggleIgnoreUppercase}
              className="flex flex-col cursor-pointer select-none pr-2 group-hover:text-slate-900 transition-colors"
            >
              <span className="font-semibold text-slate-800 text-[11.5px]">
                Ignore UPPERCASE Words
              </span>
              <span className="text-[10px] text-slate-500">
                Ignore all-caps words (API, NASA, DOCX, HTML)
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ignoreUppercase}
              onClick={handleToggleIgnoreUppercase}
              title={
                ignoreUppercase
                  ? 'ON: Ignore words written entirely in uppercase letters'
                  : 'OFF: Check uppercase words normally'
              }
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                ignoreUppercase ? 'bg-[#185abd]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  ignoreUppercase ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Issues Count & Batch Ignore All Toolbar */}
      {issues.length > 0 && (
        <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-slate-700">
            {issues.length} {issues.length === 1 ? 'issue flagged' : 'issues flagged'}
          </span>
          <button
            onClick={handleBatchIgnoreAll}
            title="Add all currently flagged misspelled words to persistent ignore list in localStorage"
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0f3c80] text-white rounded-md text-[11.5px] font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <CheckCheck size={13} className="text-white" />
            <span>Batch Ignore All ({issues.length})</span>
          </button>
        </div>
      )}

      {/* Main Issue Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {isChecking ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2.5">
            <RotateCw size={24} className="animate-spin text-[#1e295d]" />
            <p className="text-xs font-medium">Analyzing spelling & grammar...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2 text-center px-4">
            <CheckCircle2 size={36} className="text-emerald-500 stroke-[1.75]" />
            <p className="text-xs font-semibold text-slate-700">
              {hasChecked ? 'No spelling mistakes found!' : 'Ready to check document'}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {hasChecked
                ? 'Your document matches clean proofing standards.'
                : 'Click "Check" above to scan for grammar and spelling.'}
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
            >
              {/* Header: Error word in salmon/red — description */}
              <div
                onClick={() => handleLocateWord(issue.word)}
                className="cursor-pointer group flex items-baseline flex-wrap text-xs"
                title="Click to jump to word in document"
              >
                <span className="font-bold text-[#e11d48] text-sm group-hover:underline">
                  {issue.word}
                </span>
                <span className="text-slate-400 mx-1.5">—</span>
                <span className="text-slate-500 font-normal leading-tight">
                  {issue.message}
                </span>
              </div>

              {/* Suggestions pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {issue.suggestions.map((sug) => {
                  const isSelected = issue.selectedSuggestion === sug;
                  return (
                    <button
                      key={sug}
                      onClick={() => handleSelectSuggestion(issue.id, sug)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1e295d] text-white shadow-2xs scale-102'
                          : 'bg-[#e2e8f0] text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Ignore all & Accept all */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => handleIgnoreAll(issue.id)}
                  title="Add this word to persistent ignore list"
                  className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center"
                >
                  Ignore all
                </button>
                <button
                  onClick={() => handleAcceptAll(issue)}
                  className="flex-1 py-1.5 px-3 bg-[#1e295d] hover:bg-[#151f46] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center shadow-xs"
                >
                  Accept all
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Notice & Persistent Ignored Words Info */}
      <div className="border-t border-slate-200 text-center bg-[#fafafa] shrink-0">
        {ignoredWords.size > 0 && (
          <div className="px-3.5 py-1.5 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center space-x-1.5 truncate pr-2">
              <Shield size={12} className="text-[#185abd] shrink-0" />
              <span>
                <strong>{ignoredWords.size}</strong> {ignoredWords.size === 1 ? 'word' : 'words'} in ignore list
              </span>
            </span>
            <button
              onClick={handleClearIgnoredWordsList}
              className="text-[10px] text-[#185abd] hover:text-red-600 hover:underline font-semibold cursor-pointer shrink-0"
              title="Clear all stored ignored words from localStorage"
            >
              Reset List
            </button>
          </div>
        )}
        <div className="px-4 py-2">
          <p className="text-[11px] text-slate-400 font-medium">
            Powered by LanguageTool · Free API
          </p>
        </div>
      </div>
    </aside>
  );
};
