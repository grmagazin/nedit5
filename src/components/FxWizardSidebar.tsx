import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  X,
  Plus,
  Hash,
  Sparkles,
  Check,
  Copy,
  Maximize2,
  Minimize2,
  BookOpen,
  Search,
  FunctionSquare,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ThemeMode } from '../types';

interface EquationPreset {
  title: string;
  latex: string;
  category: 'algebra' | 'calculus' | 'geometry' | 'statistics' | 'physics';
}

const PRESET_EQUATIONS: EquationPreset[] = [
  {
    title: 'Quadratic Formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    category: 'algebra',
  },
  {
    title: 'Pythagorean Theorem',
    latex: 'a^2 + b^2 = c^2',
    category: 'geometry',
  },
  {
    title: "Euler's Formula",
    latex: 'e^{i\\pi} + 1 = 0',
    category: 'algebra',
  },
  {
    title: 'Gauss Summation',
    latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
    category: 'algebra',
  },
  {
    title: 'Definite Integral',
    latex: '\\int_{a}^{b} f(x)\\,dx',
    category: 'calculus',
  },
  {
    title: 'Power Rule Derivative',
    latex: '\\frac{d}{dx} x^n = n x^{n-1}',
    category: 'calculus',
  },
  {
    title: 'Normal Distribution (Gaussian)',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}',
    category: 'statistics',
  },
  {
    title: 'Limit',
    latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
    category: 'calculus',
  },
  {
    title: '2x2 Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    category: 'algebra',
  },
  {
    title: 'Fraction & Square Root',
    latex: '\\sqrt{\\frac{a + b}{c - d}}',
    category: 'algebra',
  },
  {
    title: "Newton's Second Law (Force)",
    latex: 'F = m \\cdot a',
    category: 'physics',
  },
  {
    title: 'Einstein Mass-Energy',
    latex: 'E = m c^2',
    category: 'physics',
  },
  {
    title: 'Trigonometric Identity',
    latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
    category: 'geometry',
  },
  {
    title: 'Binomial Theorem',
    latex: '(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k',
    category: 'algebra',
  },
];

const MATH_SHORTCUTS = [
  { label: 'x²', latex: 'x^2' },
  { label: '√x', latex: '\\sqrt{x}' },
  { label: 'a/b', latex: '\\frac{a}{b}' },
  { label: '±', latex: '\\pm' },
  { label: '∫', latex: '\\int' },
  { label: '∑', latex: '\\sum' },
  { label: 'π', latex: '\\pi' },
  { label: '∞', latex: '\\infty' },
  { label: 'θ', latex: '\\theta' },
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'Δ', latex: '\\Delta' },
  { label: '≈', latex: '\\approx' },
  { label: '≠', latex: '\\neq' },
  { label: '≤', latex: '\\le' },
  { label: '≥', latex: '\\ge' },
  { label: '·', latex: '\\cdot' },
  { label: '×', latex: '\\times' },
  { label: '÷', latex: '\\div' },
  { label: '°', latex: '^\\circ' },
  { label: '∈', latex: '\\in' },
  { label: '→', latex: '\\to' },
  { label: 'lim', latex: '\\lim_{x \\to 0}' },
];

/**
 * Converts standard mathematical text expressions into valid LaTeX syntax.
 * Examples:
 *   "y=sqrt(4^2)"        -> "y=\\sqrt{4^2}"
 *   "sqrt(x+1)"          -> "\\sqrt{x+1}"
 *   "cbrt(8)"            -> "\\sqrt[3]{8}"
 *   "(a+b)/(c-d)"        -> "\\frac{a+b}{c-d}"
 *   "x^(n+1)"            -> "x^{n+1}"
 *   "+/-"                -> "\\pm"
 *   "alpha + beta = pi"  -> "\\alpha + \\beta = \\pi"
 */
export function convertToLatex(input: string): string {
  if (!input) return '';
  let str = input.trim();

  // 1. Balanced function helper for sqrt(...) and cbrt(...)
  const replaceBalanced = (
    src: string,
    fnName: string,
    formatter: (inside: string) => string
  ): string => {
    let out = src;
    const target = fnName + '(';
    let idx = out.indexOf(target);
    let guard = 0;
    while (idx !== -1 && guard < 40) {
      guard++;
      const startParen = idx + target.length - 1;
      let depth = 0;
      let endParen = -1;
      for (let i = startParen; i < out.length; i++) {
        if (out[i] === '(') depth++;
        else if (out[i] === ')') {
          depth--;
          if (depth === 0) {
            endParen = i;
            break;
          }
        }
      }
      if (endParen !== -1) {
        const inner = out.slice(startParen + 1, endParen);
        const transformedInner = replaceBalanced(inner, fnName, formatter);
        const replacement = formatter(transformedInner);
        out = out.slice(0, idx) + replacement + out.slice(endParen + 1);
        idx = out.indexOf(target, idx + replacement.length);
      } else {
        idx = out.indexOf(target, idx + target.length);
      }
    }
    return out;
  };

  // Convert sqrt(...) -> \sqrt{...}
  str = replaceBalanced(str, 'sqrt', (arg) => `\\sqrt{${arg}}`);
  // Convert cbrt(...) -> \sqrt[3]{...}
  str = replaceBalanced(str, 'cbrt', (arg) => `\\sqrt[3]{${arg}}`);

  // 2. Fractions:
  // e.g. (a + b) / (c + d) -> \frac{a + b}{c + d}
  str = str.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
  // e.g. (a + b) / c -> \frac{a + b}{c}
  str = str.replace(/\(([^()]+)\)\s*\/\s*([0-9a-zA-Z]+)/g, '\\frac{$1}{$2}');
  // e.g. a / (b + c) -> \frac{a}{b + c}
  str = str.replace(/([0-9a-zA-Z]+)\s*\/\s*\(([^()]+)\)/g, '\\frac{$1}{$2}');
  // simple standalone a / b -> \frac{a}{b} (avoid already escaped commands)
  str = str.replace(/(?<![\\a-zA-Z])([0-9a-zA-Z]+)\s*\/\s*([0-9a-zA-Z]+)(?![a-zA-Z])/g, '\\frac{$1}{$2}');

  // 3. Exponents with parentheses: ^(expr) -> ^{expr}
  str = str.replace(/\^\(([^()]+)\)/g, '^{$1}');
  // Multi-character alphanumeric exponent: e.g. x^23 -> x^{23}
  str = str.replace(/\^([0-9a-zA-Z]{2,})/g, '^{$1}');

  // 4. Subscripts with parentheses: _(expr) -> _{expr}
  str = str.replace(/_\(([^()]+)\)/g, '_{$1}');
  // Multi-character alphanumeric subscript: e.g. x_12 -> x_{12}
  str = str.replace(/_([0-9a-zA-Z]{2,})/g, '_{$1}');

  // 5. Comparison & Operators:
  str = str.replace(/<=|≤/g, ' \\le ');
  str = str.replace(/>=|≥/g, ' \\ge ');
  str = str.replace(/!=|≠/g, ' \\neq ');
  str = str.replace(/~=|≈/g, ' \\approx ');
  str = str.replace(/\+\/-|\+-|±/g, ' \\pm ');
  str = str.replace(/<->|↔/g, ' \\leftrightarrow ');
  str = str.replace(/->|→/g, ' \\to ');
  str = str.replace(/<-|←/g, ' \\gets ');
  str = str.replace(/\binfinity\b|\binf\b|∞/gi, ' \\infty ');

  // Multiplication and division
  str = str.replace(/\s*\*\s*/g, ' \\cdot ');
  str = str.replace(/\s*·\s*/g, ' \\cdot ');
  str = str.replace(/\s*×\s*/g, ' \\times ');
  str = str.replace(/\s*÷\s*/g, ' \\div ');

  // 6. Greek letters (whole word matching):
  const greekWords: Record<string, string> = {
    alpha: '\\alpha',
    beta: '\\beta',
    gamma: '\\gamma',
    delta: '\\delta',
    Delta: '\\Delta',
    epsilon: '\\epsilon',
    zeta: '\\zeta',
    eta: '\\eta',
    theta: '\\theta',
    Theta: '\\Theta',
    iota: '\\iota',
    kappa: '\\kappa',
    lambda: '\\lambda',
    Lambda: '\\Lambda',
    mu: '\\mu',
    nu: '\\nu',
    xi: '\\xi',
    Xi: '\\Xi',
    pi: '\\pi',
    Pi: '\\Pi',
    rho: '\\rho',
    sigma: '\\sigma',
    Sigma: '\\Sigma',
    tau: '\\tau',
    phi: '\\phi',
    Phi: '\\Phi',
    chi: '\\chi',
    psi: '\\psi',
    Psi: '\\Psi',
    omega: '\\omega',
    Omega: '\\Omega',
  };
  for (const [word, cmd] of Object.entries(greekWords)) {
    const reg = new RegExp(`(?<!\\\\)\\b${word}\\b`, 'g');
    str = str.replace(reg, cmd);
  }

  // 7. Math functions (only if not preceded by backslash):
  const funcs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'lim', 'det', 'max', 'min'];
  for (const fn of funcs) {
    const reg = new RegExp(`(?<!\\\\)\\b${fn}\\b`, 'g');
    str = str.replace(reg, `\\${fn}`);
  }

  // Integrals & Sums
  str = str.replace(/(?<!\\)\bintegral\b|∫/gi, '\\int');
  str = str.replace(/(?<!\\)\bsum\b|∑/gi, '\\sum');

  // Clean double spaces
  str = str.replace(/\s{2,}/g, ' ').trim();

  return str;
}

export interface FxWizardSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  initialLatex?: string;
  isBlockDefault?: boolean;
  themeMode?: ThemeMode;
}

export const FxWizardSidebar: React.FC<FxWizardSidebarProps> = ({
  editor,
  onClose,
  initialLatex = '',
  isBlockDefault = false,
  themeMode = 'light',
}) => {
  const isSepia = themeMode === 'sepia';
  const isFullDark = themeMode === 'fullDark';
  const isCanvasDark = themeMode === 'canvasDark';
  const isDark = isFullDark || isCanvasDark;

  // Layout mode: 'docked' (default right toolbar) or 'floating' (popup with z-[9999])
  const [isFloating, setIsFloating] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordpad_fx_layout') === 'floating';
    } catch {
      return false;
    }
  });

  const toggleLayoutMode = () => {
    setIsFloating((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wordpad_fx_layout', next ? 'floating' : 'docked');
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Active mode tab: 'inline' | 'block' | 'library'
  const [activeTab, setActiveTab] = useState<'inline' | 'block' | 'library'>(
    isBlockDefault ? 'block' : 'inline'
  );

  const [formulaLatex, setFormulaLatex] = useState(initialLatex || '');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Track selected text in document editor
  const [selectedText, setSelectedText] = useState<string>('');
  const lastSelectedTextRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Monitor document selection in TipTap editor
  useEffect(() => {
    if (!editor) return;

    const readSelection = () => {
      try {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ').trim();
          setSelectedText(text);
          if (text) {
            lastSelectedTextRef.current = text;
          }
        } else {
          setSelectedText('');
        }
      } catch {
        setSelectedText('');
      }
    };

    readSelection();
    editor.on('selectionUpdate', readSelection);
    editor.on('transaction', readSelection);
    editor.on('update', readSelection);

    return () => {
      editor.off('selectionUpdate', readSelection);
      editor.off('transaction', readSelection);
      editor.off('update', readSelection);
    };
  }, [editor]);

  // Update when initialLatex prop changes
  useEffect(() => {
    if (initialLatex) {
      setFormulaLatex(initialLatex);
      setActiveTab(isBlockDefault ? 'block' : 'inline');
    }
  }, [initialLatex, isBlockDefault]);

  // Auto focus textarea when tab changes
  useEffect(() => {
    if (activeTab !== 'library') {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [activeTab]);

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // LaTeX Convert action: converts selected text from document into LaTeX and fills the textbox
  const handleConvertSelectionToLatex = () => {
    const rawText = selectedText || lastSelectedTextRef.current || formulaLatex;
    if (!rawText || !rawText.trim()) {
      showNotification('Select formula text in document first');
      return;
    }

    const converted = convertToLatex(rawText);
    setFormulaLatex(converted);
    showNotification(`Converted "${rawText.slice(0, 18)}${rawText.length > 18 ? '...' : ''}" to LaTeX`);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 50);
  };

  // Insert Inline Equation at caret
  const handleInsertInline = (customFormula?: string) => {
    const formula = customFormula !== undefined ? customFormula : formulaLatex;
    if (!formula.trim() || !editor) return;

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'mathInline',
          attrs: { latex: formula.trim() },
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run();

    showNotification('Inline formula inserted');
  };

  // Insert Block Equation at caret
  const handleInsertBlock = (customFormula?: string) => {
    const formula = customFormula !== undefined ? customFormula : formulaLatex;
    if (!formula.trim() || !editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mathBlock',
        attrs: { latex: formula.trim() },
      })
      .run();

    showNotification('Block formula inserted');
  };

  // Insert symbol into formula
  const handleInsertSymbol = (sym: string) => {
    setFormulaLatex((prev) => (prev ? `${prev} ${sym}` : sym));
    if (activeTab === 'library') {
      setActiveTab('inline');
    }
    textareaRef.current?.focus();
  };

  // Copy LaTeX code to clipboard
  const handleCopyLatex = () => {
    if (!formulaLatex) return;
    try {
      navigator.clipboard.writeText(formulaLatex);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // fallback
    }
  };

  // Safe KaTeX renderer
  const renderKatexSafe = (latex: string, displayMode: boolean = false) => {
    if (!latex.trim()) return null;
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
      });
      return (
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className={`overflow-x-auto select-text font-serif ${
            isDark ? 'text-neutral-100' : 'text-neutral-900'
          }`}
        />
      );
    } catch (err: any) {
      return (
        <span className="text-red-500 font-mono text-xs">
          Invalid LaTeX: {err?.message || ''}
        </span>
      );
    }
  };

  // Filtered preset equations
  const filteredPresets = useMemo(() => {
    return PRESET_EQUATIONS.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (presetSearch.trim()) {
        const q = presetSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.latex.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [presetSearch, selectedCategory]);

  const toolbarContent = (
    <div
      className={`flex flex-col h-full select-none text-xs ${
        isDark
          ? 'bg-neutral-900 text-neutral-100'
          : isSepia
          ? 'bg-[#f4ecd8] text-[#433422]'
          : 'bg-white text-neutral-800'
      }`}
    >
      {/* 1. HEADER */}
      <div
        className={`h-12 border-b flex items-center justify-between px-3.5 shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/60'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#ebdcc0]'
            : 'border-neutral-200/90 bg-sky-50/70'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-[#0284c7] dark:text-[#38bdf8] font-serif italic font-extrabold text-base leading-none">
            Fx
          </span>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-neutral-800 dark:text-neutral-100 leading-none">
              Fx Wizard
            </h2>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
              Mathematical Formulas &amp; LaTeX
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Layout mode toggle (Docked / Floating) */}
          <button
            type="button"
            onClick={toggleLayoutMode}
            title={
              isFloating
                ? 'Dock to right sidebar toolbar'
                : 'Undock to high-zindex floating popup'
            }
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-sky-100'
            }`}
          >
            {isFloating ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Fx Wizard"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-sky-100'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Temporary toast notification */}
      {statusNotice && (
        <div className="bg-[#0284c7] text-white text-[11px] font-semibold py-1 px-3 text-center animate-in fade-in duration-150">
          {statusNotice}
        </div>
      )}

      {/* 2. MODE TABS */}
      <div
        className={`px-3 py-2 border-b shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-900/90'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#f0e6ce]'
            : 'border-neutral-100 bg-white'
        }`}
      >
        <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('inline')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'inline'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-[#0284c7] dark:text-sky-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Plus size={12} />
            <span>Inline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('block')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'block'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-[#6366f1] dark:text-indigo-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Hash size={12} />
            <span>Block</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'library'
                ? 'bg-white dark:bg-neutral-700 font-semibold shadow-2xs text-emerald-700 dark:text-emerald-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <BookOpen size={12} />
            <span>Presets</span>
          </button>
        </div>
      </div>

      {/* 3. QUICK MATH SYMBOLS STRIP */}
      <div
        className={`px-3 py-2 border-b space-y-1.5 shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/40'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#ece1c7]'
            : 'border-neutral-100 bg-neutral-50/70'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          <span>Quick Symbols</span>
          <span className="normal-case text-[9.5px] font-normal text-neutral-400">
            Click to insert
          </span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
          {MATH_SHORTCUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => handleInsertSymbol(s.latex)}
              title={`Insert ${s.latex}`}
              className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer transition-colors border ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 hover:text-sky-300'
                  : 'bg-white hover:bg-sky-50 border-neutral-200 text-neutral-800 hover:text-[#0284c7] hover:border-sky-300 shadow-2xs'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN BODY */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {activeTab === 'library' ? (
          /* PRESET LIBRARY VIEW */
          <div className="space-y-3">
            {/* Search presets */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search formulas (e.g. Gauss, Euler, root)..."
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                className={`w-full pl-7 pr-7 py-1.5 text-[11px] rounded-md border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-sky-500'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:border-sky-500'
                }`}
              />
              {presetSearch && (
                <button
                  type="button"
                  onClick={() => setPresetSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              {['all', 'algebra', 'calculus', 'geometry', 'statistics', 'physics'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-full capitalize font-medium transition-colors cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-[#0284c7] text-white border-transparent'
                        : isDark
                        ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Presets Cards list */}
            <div className="space-y-2">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.title}
                  onClick={() => {
                    setFormulaLatex(preset.latex);
                    setActiveTab('inline');
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 group ${
                    isDark
                      ? 'bg-neutral-800/80 border-neutral-700 hover:border-sky-500 hover:bg-neutral-800'
                      : 'bg-white border-neutral-200/90 hover:border-sky-400 hover:bg-sky-50/40 shadow-2xs'
                  }`}
                  title="Click to load into editor"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                      {preset.title}
                    </span>
                    <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertInline(preset.latex);
                        }}
                        className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-[#0284c7] dark:text-sky-300 rounded cursor-pointer transition-colors"
                        title="Insert as Inline formula"
                      >
                        +Inline
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertBlock(preset.latex);
                        }}
                        className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded cursor-pointer transition-colors"
                        title="Insert as Block formula"
                      >
                        +Block
                      </button>
                    </div>
                  </div>

                  {/* Formula Code */}
                  <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 break-all leading-tight">
                    {preset.latex}
                  </div>

                  {/* Rendered Live Preview */}
                  <div className="pt-1.5 border-t border-neutral-100 dark:border-neutral-800 text-center py-1 overflow-x-auto">
                    {renderKatexSafe(preset.latex, false)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* INLINE & BLOCK FORMULA COMPOSER */
          <div className="space-y-3">
            {/* Header label for active tab */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center space-x-1.5 text-neutral-800 dark:text-neutral-200">
                {activeTab === 'inline' ? (
                  <>
                    <Plus size={14} className="text-[#0284c7]" />
                    <span>Inline Formula</span>
                  </>
                ) : (
                  <>
                    <Hash size={14} className="text-[#6366f1]" />
                    <span>Block Formula (Centered)</span>
                  </>
                )}
              </span>

              {formulaLatex && (
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleCopyLatex}
                    title="Copy LaTeX"
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                  >
                    {copyFeedback ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulaLatex('')}
                    title="Clear formula"
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* LaTeX Convert Button - Positioned directly above formula textarea */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleConvertSelectionToLatex}
              title={
                selectedText
                  ? `Convert selected text "${selectedText}" to LaTeX and paste below`
                  : 'Select mathematical text in document (e.g. y=sqrt(4^2)) and click to convert to LaTeX'
              }
              className={`w-full py-2 px-3 rounded-xl font-medium text-xs transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-[0.99] ${
                selectedText
                  ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white ring-2 ring-sky-300 dark:ring-sky-700'
                  : 'bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-[#0284c7] dark:text-sky-300'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Plus size={14} className={selectedText ? 'text-white' : 'text-[#0284c7] dark:text-sky-400'} />
                <span className="font-bold">LaTeX Convert</span>
              </div>
              <div className="flex items-center space-x-1">
                {selectedText ? (
                  <span className="bg-sky-700/90 dark:bg-sky-800 text-sky-100 px-2 py-0.5 rounded-md font-mono text-[10.5px]">
                    selected text ({selectedText.length} char)
                  </span>
                ) : (
                  <span className="text-[10px] opacity-80 font-normal">
                    (Select text in doc)
                  </span>
                )}
              </div>
            </button>

            {/* LaTeX Textarea */}
            <textarea
              ref={textareaRef}
              rows={3}
              value={formulaLatex}
              onChange={(e) => setFormulaLatex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (formulaLatex.trim()) {
                    if (activeTab === 'inline') handleInsertInline();
                    else handleInsertBlock();
                  }
                }
              }}
              placeholder={
                activeTab === 'inline'
                  ? 'e.g. x^2 + 2x + 1 or y=\\sqrt{4^2} (Press Enter to insert)'
                  : 'e.g. \\int_a^b f(x)\\,dx (Press Enter to insert)'
              }
              className={`w-full p-2.5 rounded-xl border text-xs font-mono transition-all resize-y placeholder:text-neutral-400 focus:outline-hidden ${
                activeTab === 'inline'
                  ? isDark
                    ? 'border-sky-500 ring-2 ring-sky-900/60 bg-neutral-800 text-white'
                    : 'border-sky-500 ring-2 ring-sky-100 bg-white text-neutral-900'
                  : isDark
                  ? 'border-indigo-500 ring-2 ring-indigo-900/60 bg-neutral-800 text-white'
                  : 'border-indigo-500 ring-2 ring-indigo-100 bg-white text-neutral-900'
              }`}
            />

            {/* Live KaTeX Preview Card */}
            {formulaLatex.trim() && (
              <div
                className={`p-3 rounded-xl border text-center space-y-1 ${
                  activeTab === 'inline'
                    ? isDark
                      ? 'bg-sky-950/30 border-sky-900/70'
                      : 'bg-sky-50/70 border-sky-200'
                    : isDark
                    ? 'bg-indigo-950/30 border-indigo-900/70'
                    : 'bg-indigo-50/70 border-indigo-200'
                }`}
              >
                <div
                  className={`text-[10px] font-semibold tracking-wide uppercase ${
                    activeTab === 'inline'
                      ? 'text-[#0284c7] dark:text-sky-300'
                      : 'text-[#6366f1] dark:text-indigo-300'
                  }`}
                >
                  Live Preview ({activeTab === 'inline' ? 'Inline' : 'Block'})
                </div>
                <div className="py-1">
                  {renderKatexSafe(formulaLatex, activeTab === 'block')}
                </div>
              </div>
            )}

            {/* Insert Action Buttons */}
            <div className="space-y-2 pt-1">
              {activeTab === 'inline' ? (
                <button
                  type="button"
                  onClick={() => handleInsertInline()}
                  disabled={!formulaLatex.trim()}
                  className="w-full py-2 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center space-x-1.5"
                >
                  <Plus size={14} />
                  <span>+ Insert Inline Formula (into text)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleInsertBlock()}
                  disabled={!formulaLatex.trim()}
                  className="w-full py-2 px-4 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center space-x-1.5"
                >
                  <Hash size={14} />
                  <span>+ Insert Block Formula (centered)</span>
                </button>
              )}

              {/* Secondary Switch action */}
              <div className="flex items-center justify-between text-[11px] px-1 text-neutral-500">
                <span>Enter = Insert</span>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'inline' ? 'block' : 'inline')}
                  className="text-[#0284c7] dark:text-sky-400 font-semibold hover:underline flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>Switch to {activeTab === 'inline' ? 'Block' : 'Inline'}</span>
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>

            {/* Quick Preset Selector Preview below Composer */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                <span>Preset Examples</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="text-[10px] text-[#0284c7] dark:text-sky-400 hover:underline"
                >
                  View all ({PRESET_EQUATIONS.length}) →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_EQUATIONS.slice(0, 4).map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => setFormulaLatex(p.latex)}
                    className={`p-1.5 rounded-lg border text-left transition-colors cursor-pointer text-[10.5px] truncate ${
                      isDark
                        ? 'bg-neutral-800/80 border-neutral-700 hover:border-sky-500 text-neutral-200'
                        : 'bg-neutral-50 hover:bg-sky-50 border-neutral-200 hover:border-sky-300 text-neutral-700 shadow-2xs'
                    }`}
                    title={p.title}
                  >
                    <span className="font-semibold block truncate">{p.title}</span>
                    <span className="text-[9.5px] font-mono text-neutral-400 block truncate">
                      {p.latex}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. FOOTER */}
      <div
        className={`p-2.5 border-t flex items-center justify-between text-[11px] shrink-0 ${
          isDark
            ? 'border-neutral-800 bg-neutral-950/60 text-neutral-400'
            : isSepia
            ? 'border-[#e2d7ba] bg-[#ebdcc0] text-[#715c41]'
            : 'border-neutral-200/80 bg-neutral-50 text-neutral-500'
        }`}
      >
        <div className="flex items-center space-x-1">
          <FunctionSquare size={13} className="text-[#0284c7]" />
          <span>KaTeX Renderer</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormulaLatex('');
            textareaRef.current?.focus();
          }}
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );

  // If floating layout is active, render via Portal to document.body with maximum z-index z-[9999]!
  if (isFloating) {
    return createPortal(
      <aside
        className="fixed top-24 right-6 w-84 max-w-[calc(100vw-32px)] h-[calc(100vh-130px)] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[9999] animate-in fade-in slide-in-from-right duration-200 flex flex-col bg-white dark:bg-neutral-900"
        style={{ zIndex: 9999 }}
        aria-label="Floating Fx Wizard Toolbar"
      >
        {toolbarContent}
      </aside>,
      document.body
    );
  }

  // Otherwise, render as standard right toolbar alongside DocumentCanvas
  return (
    <aside
      className="w-72 sm:w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200/90 dark:border-neutral-800 flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200 shrink-0"
      aria-label="Fx Equation Wizard Toolbar"
    >
      {toolbarContent}
    </aside>
  );
};
