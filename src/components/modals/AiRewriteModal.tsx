import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  Sparkles,
  X,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  ArrowDownToLine,
  Replace,
  FileText,
} from 'lucide-react';
import {
  REWRITE_TONES,
  RewriteTone,
  generateSafeRewrite,
  countWords,
  RewriteResult,
} from '../../utils/aiRewriteService';

export interface AiRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (message: string) => void;
  onDockToSidebar?: () => void;
}

export const AiRewriteModal: React.FC<AiRewriteModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
  onDockToSidebar,
}) => {
  const [tone, setTone] = useState<RewriteTone>('safe_optimize');
  const [customInstruction, setCustomInstruction] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMeta, setResultMeta] = useState<RewriteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Determine current contextual text
  const isSelectionActive = editor && !editor.state.selection.empty;
  const targetText = isSelectionActive
    ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim()
    : editor?.getText() || '';
  const wordCount = countWords(targetText);

  const handleGenerate = async () => {
    if (!targetText.trim()) {
      setError('No text found. Please write or select some text in the document.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || undefined;
      const result = await generateSafeRewrite(targetText, {
        tone,
        customInstruction: customInstruction.trim() || undefined,
        scope: isSelectionActive ? 'selection' : 'document',
        apiKey,
      });

      setOutput(result.text);
      setResultMeta(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate rewrite.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (mode: 'replace' | 'insert_below' = 'replace') => {
    if (!editor || !output.trim()) return;

    if (mode === 'replace') {
      if (isSelectionActive) {
        editor.chain().focus().insertContent(output).run();
      } else {
        editor.chain().focus().setContent(output).run();
      }
      onNotify?.('Safe rewrite applied to document');
    } else {
      editor.chain().focus().insertContent(`\n\n${output}`).run();
      onNotify?.('Rewritten text inserted below');
    }
    onClose();
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-xl text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#9333ea]">
            <Sparkles size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              AI Document &amp; Tone Rewrite
            </h3>
          </div>

          <div className="flex items-center space-x-1.5">
            {onDockToSidebar && (
              <button
                type="button"
                onClick={onDockToSidebar}
                className="text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-2 py-1 rounded flex items-center gap-1 cursor-pointer font-medium transition-colors"
                title="Dock into Assistant Toolbar on right side"
              >
                <span>Dock to Toolbar</span>
                <ExternalLink size={12} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="py-3 space-y-3">
          {/* Target Scope Pill */}
          <div className="p-2.5 rounded-lg border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 truncate">
              {isSelectionActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-semibold text-purple-950 dark:text-purple-200">
                    Selected Text Target ({wordCount} words)
                  </span>
                </>
              ) : (
                <>
                  <FileText size={13} className="text-purple-600 shrink-0" />
                  <span className="font-semibold text-purple-950 dark:text-purple-200">
                    Whole Document Target ({wordCount} words)
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
              Gemini 3.8 Flash Safe Engine
            </span>
          </div>

          {/* Objectives Grid */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Select Optimization Objective &amp; Tone
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REWRITE_TONES.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`p-2 text-xs rounded-lg border text-left cursor-pointer transition-all ${
                    tone === t.id
                      ? 'border-[#9333ea] bg-purple-50 dark:bg-purple-950/40 text-[#9333ea] dark:text-purple-300 font-semibold ring-1 ring-[#9333ea]'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[11px]">{t.label}</span>
                    <span className="text-[9px] opacity-75 font-mono">{t.badge}</span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-tight font-normal line-clamp-1">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instruction */}
          <div>
            <input
              type="text"
              placeholder="Optional: custom guidance (e.g. Keep headings, make more urgent...)"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#9333ea] text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Optimized Preview
                </label>
                {resultMeta && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    ({resultMeta.originalWordCount}w → {resultMeta.newWordCount}w)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {output && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-neutral-500 hover:text-purple-600 flex items-center gap-0.5 cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-[11px] text-[#9333ea] dark:text-purple-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {loading && <Loader2 size={11} className="animate-spin" />}
                  <span>{output ? 'Re-generate' : 'Generate Safe Rewrite'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Click 'Generate Safe Rewrite' to craft an enhanced version of your text..."
              className="w-full text-xs p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#9333ea] text-neutral-900 dark:text-neutral-100 resize-none font-sans"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <span className="text-[10px] text-neutral-400">
            {resultMeta?.notes || 'Preserves facts, figures & structural formatting.'}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={() => handleApply('insert_below')}
              disabled={!output.trim()}
              className="px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1"
              title="Insert below original to compare side-by-side"
            >
              <ArrowDownToLine size={12} />
              <span>Insert Below</span>
            </button>

            <button
              onClick={() => handleApply('replace')}
              disabled={!output.trim()}
              className="px-4 py-1.5 text-xs bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <Replace size={12} />
              <span>Replace in Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AiRewriteModal;
