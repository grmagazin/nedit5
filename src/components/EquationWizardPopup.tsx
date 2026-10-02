import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { X, Plus, Hash, ListFilter, Sparkles, Check, Copy } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface EquationPreset {
  title: string;
  latex: string;
  category?: string;
}

const PRESET_EQUATIONS: EquationPreset[] = [
  {
    title: 'Δευτεροβάθμια Εξίσωση',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  },
  {
    title: 'Πυθαγόρειο Θεώρημα',
    latex: 'a^2 + b^2 = c^2',
  },
  {
    title: 'Τύπος Euler',
    latex: 'e^{i\\pi} + 1 = 0',
  },
  {
    title: 'Άθροισμα Gauss',
    latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
  },
  {
    title: 'Ολοκλήρωμα',
    latex: '\\int_{a}^{b} f(x)\\,dx',
  },
  {
    title: 'Παράγωγος Δύναμης',
    latex: '\\frac{d}{dx} x^n = n x^{n-1}',
  },
  {
    title: 'Κανονική Κατανομή (Gauss)',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}',
  },
  {
    title: 'Όριο (Limit)',
    latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
  },
  {
    title: 'Μήτρα 2x2 (Matrix)',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  },
  {
    title: 'Κλάσμα & Ρίζα (Fraction)',
    latex: '\\sqrt{\\frac{a + b}{c - d}}',
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
];

export interface EquationWizardPopupProps {
  editor: Editor | null;
  onClose: () => void;
  initialLatex?: string;
  isBlockDefault?: boolean;
}

export const EquationWizardPopup: React.FC<EquationWizardPopupProps> = ({
  editor,
  onClose,
  initialLatex = '',
  isBlockDefault = false,
}) => {
  const [inlineLatex, setInlineLatex] = useState(
    !isBlockDefault && initialLatex ? initialLatex : ''
  );
  const [blockLatex, setBlockLatex] = useState(
    isBlockDefault && initialLatex ? initialLatex : ''
  );
  const [activeTarget, setActiveTarget] = useState<'inline' | 'block'>(
    isBlockDefault ? 'block' : 'inline'
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const inlineInputRef = useRef<HTMLTextAreaElement>(null);
  const blockInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto focus active target
  useEffect(() => {
    if (activeTarget === 'inline') {
      inlineInputRef.current?.focus();
    } else {
      blockInputRef.current?.focus();
    }
  }, [activeTarget]);

  // Insert Inline Equation at caret
  const handleInsertInline = (customFormula?: string) => {
    const formula = customFormula !== undefined ? customFormula : inlineLatex;
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

    onClose();
  };

  // Insert Block Equation at caret
  const handleInsertBlock = (customFormula?: string) => {
    const formula = customFormula !== undefined ? customFormula : blockLatex;
    if (!formula.trim() || !editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mathBlock',
        attrs: { latex: formula.trim() },
      })
      .run();

    onClose();
  };

  // Quick insertion of symbols into current active textarea
  const handleInsertSymbol = (sym: string) => {
    if (activeTarget === 'inline') {
      setInlineLatex((prev) => (prev ? `${prev} ${sym}` : sym));
    } else {
      setBlockLatex((prev) => (prev ? `${prev} ${sym}` : sym));
    }
  };

  // Click on a preset: populate into active field & select
  const handleSelectPreset = (preset: EquationPreset) => {
    if (activeTarget === 'inline') {
      setInlineLatex(preset.latex);
    } else {
      setBlockLatex(preset.latex);
    }
  };

  // Safe KaTeX renderer for previews
  const renderKatexSafe = (latex: string, displayMode: boolean = false) => {
    if (!latex.trim()) return null;
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} className="overflow-x-auto" />;
    } catch (err: any) {
      return (
        <span className="text-red-500 font-mono text-xs">
          Invalid LaTeX: {err?.message || ''}
        </span>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[380px] max-h-[92vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-sky-200/80 dark:border-neutral-700 flex flex-col overflow-hidden text-neutral-800 dark:text-neutral-100 select-none animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Fx Wizard — Κατασκευαστής Τύπων"
      >
        {/* HEADER matching user screenshot */}
        <div className="flex items-center justify-between px-4 py-3 bg-sky-50/70 dark:bg-neutral-800/80 border-b border-sky-100 dark:border-neutral-700 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sky-600 dark:text-sky-400 font-serif italic font-bold text-base">
              Fx
            </span>
            <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200 tracking-tight">
              Wizard — Κατασκευαστής Τύπων
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md hover:bg-white/80 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* MATH QUICK SHORTCUT CHIPS */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Γρήγορα Σύμβολα
            </div>
            <div className="flex flex-wrap gap-1">
              {MATH_SHORTCUTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleInsertSymbol(s.latex)}
                  title={`Insert ${s.latex}`}
                  className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-sky-100 dark:hover:bg-neutral-700 hover:text-sky-700 dark:hover:text-sky-300 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] cursor-pointer transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 1: INLINE EQUATION (matching user screenshot) */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 font-bold text-neutral-700 dark:text-neutral-300">
              <Plus size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Εισαγωγή Μαθηματικού Τύπου (inline)</span>
            </div>

            <textarea
              ref={inlineInputRef}
              rows={2}
              value={inlineLatex}
              onFocus={() => setActiveTarget('inline')}
              onChange={(e) => setInlineLatex(e.target.value)}
              placeholder="π.χ. x^2 + 2x + 1"
              className={`w-full p-2.5 rounded-xl border text-xs font-mono transition-all resize-y placeholder:text-neutral-400 focus:outline-hidden ${
                activeTarget === 'inline'
                  ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900/60 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200'
              }`}
            />

            {/* Live Inline KaTeX Preview */}
            {inlineLatex.trim() && (
              <div className="p-2 bg-sky-50/60 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-900/70 text-center">
                <div className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold mb-1">
                  Προεπισκόπηση Τύπου (Live):
                </div>
                {renderKatexSafe(inlineLatex, false)}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleInsertInline()}
              disabled={!inlineLatex.trim()}
              className="w-full py-2 px-4 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center space-x-1.5"
            >
              <Plus size={14} />
              <span>Εισαγωγή Τύπου</span>
            </button>
          </div>

          {/* SECTION 2: BLOCK EQUATION (matching user screenshot) */}
          <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center space-x-1.5 font-bold text-neutral-700 dark:text-neutral-300">
              <Hash size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Εισαγωγή Μαθηματικού Block</span>
            </div>

            <textarea
              ref={blockInputRef}
              rows={2}
              value={blockLatex}
              onFocus={() => setActiveTarget('block')}
              onChange={(e) => setBlockLatex(e.target.value)}
              placeholder="π.χ. \int_a^b f(x) dx"
              className={`w-full p-2.5 rounded-xl border text-xs font-mono transition-all resize-y placeholder:text-neutral-400 focus:outline-hidden ${
                activeTarget === 'block'
                  ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/60 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200'
              }`}
            />

            {/* Live Block KaTeX Preview */}
            {blockLatex.trim() && (
              <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-900/70 text-center">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold mb-1">
                  Προεπισκόπηση Block (Live):
                </div>
                {renderKatexSafe(blockLatex, true)}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleInsertBlock()}
              disabled={!blockLatex.trim()}
              className="w-full py-2 px-4 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center space-x-1.5"
            >
              <Hash size={14} />
              <span>Εισαγωγή Block</span>
            </button>
          </div>

          {/* SECTION 3: CLASSIC PRESET EXAMPLES (matching user screenshot) */}
          <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center space-x-1.5 font-bold text-neutral-700 dark:text-neutral-300">
              <ListFilter size={14} className="text-neutral-600 dark:text-neutral-400 shrink-0" />
              <span>Κλασικά Έτοιμα Παραδείγματα</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {PRESET_EQUATIONS.map((preset) => (
                <div
                  key={preset.title}
                  onClick={() => handleSelectPreset(preset)}
                  className="group p-2.5 rounded-xl border border-neutral-200/90 dark:border-neutral-700 hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-neutral-800/80 transition-all cursor-pointer bg-white dark:bg-neutral-850 shadow-2xs space-y-1.5"
                  title="Click to populate field; use buttons on right to insert directly"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                      {preset.title}
                    </span>
                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertInline(preset.latex);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 rounded cursor-pointer transition-colors"
                        title="Insert as inline equation at caret"
                      >
                        +Inline
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertBlock(preset.latex);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded cursor-pointer transition-colors"
                        title="Insert as block equation at caret"
                      >
                        +Block
                      </button>
                    </div>
                  </div>

                  {/* TeX Source */}
                  <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 break-all leading-tight">
                    {preset.latex}
                  </div>

                  {/* Rendered Live Math Formula */}
                  <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 text-center py-1 overflow-x-auto text-neutral-900 dark:text-neutral-100">
                    {renderKatexSafe(preset.latex, false)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
