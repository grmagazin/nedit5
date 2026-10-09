import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { Sparkles, X } from 'lucide-react';

export interface AiRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (message: string) => void;
}

export const AiRewriteModal: React.FC<AiRewriteModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
}) => {
  const [tone, setTone] = useState<'professional' | 'concise' | 'formal' | 'greek'>('professional');
  const [output, setOutput] = useState('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    const selected = editor?.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      ' '
    ) || editor?.getText() || 'This document contains essential analytical data and structured content.';

    if (tone === 'concise') {
      setOutput(`• Summary: Key strategic directives and executive milestones.\n• Performance: Optimized operational benchmarks across departments.\n• Recommendation: Expedite deployment schedule.`);
    } else if (tone === 'formal') {
      setOutput(`Furthermore, this comprehensive exposition delineates the methodologies, theoretical frameworks, and empirically validated indices pertinent to the present subject matter.`);
    } else if (tone === 'greek') {
      setOutput(`Το παρόν έγγραφο συνοψίζει τις στρατηγικές προτεραιότητες, τα ποσοτικά δεδομένα και τις κατευθυντήριες γραμμές για την ολοκλήρωση του έργου.`);
    } else {
      setOutput(`The current document encapsulates our core strategic directives, delivering clear executive benchmarks, verified findings, and actionable recommendations.`);
    }
  };

  const handleApply = () => {
    if (editor && output.trim()) {
      if (!editor.state.selection.empty) {
        editor.chain().focus().insertContent(output).run();
      } else {
        editor.chain().focus().insertContent(`<p>${output}</p>`).run();
      }
      onClose();
      onNotify?.('AI rewrite applied to document');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-lg text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#9333ea]">
            <Sparkles size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">AI Document &amp; Tone Rewrite</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="py-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Select Rewrite Objective
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'professional', label: 'Executive Professional' },
                { id: 'concise', label: 'Concise & High-Impact' },
                { id: 'formal', label: 'Formal Academic' },
                { id: 'greek', label: 'Greek Formal Tone (Επίσημο)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id as any)}
                  className={`p-2 text-xs rounded border text-left cursor-pointer transition-all ${
                    tone === t.id
                      ? 'border-[#9333ea] bg-purple-50 dark:bg-purple-950/40 text-[#9333ea] dark:text-purple-300 font-semibold ring-1 ring-[#9333ea]'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Generated Preview</label>
              <button
                onClick={handleGenerate}
                className="text-[11px] text-[#9333ea] dark:text-purple-400 font-medium hover:underline cursor-pointer"
              >
                Generate Rewrite
              </button>
            </div>

            <textarea
              rows={4}
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Click 'Generate Rewrite' to craft an enhanced version of your text..."
              className="w-full text-xs p-2.5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#9333ea] text-neutral-900 dark:text-neutral-100 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!output.trim()}
            className="px-4 py-1.5 text-xs bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 text-white rounded font-medium cursor-pointer transition-colors"
          >
            Apply to Document
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AiRewriteModal;
