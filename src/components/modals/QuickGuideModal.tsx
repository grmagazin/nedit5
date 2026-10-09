import React from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Sparkles, X } from 'lucide-react';

export interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-lg text-neutral-800 dark:text-neutral-100 animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#185abd] dark:text-blue-400">
            <BookOpen size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Nedit Quick Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-3.5 max-h-[65vh] overflow-y-auto text-xs text-neutral-700 dark:text-neutral-300">
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-lg">
            <div className="font-semibold text-purple-900 dark:text-purple-300 mb-1 flex items-center space-x-1.5">
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              <span>AI Writing Assistant</span>
            </div>
            <p className="text-purple-800 dark:text-purple-200 leading-relaxed text-[11px]">
              Click the <strong>AI Assistant</strong> button in the Help tab to toggle the right toolbar. Powered by Gemini, you can summarize selections, improve writing flow, fix grammar mistakes, and translate into any language with your own Gemini API key.
            </p>
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg">
            <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Interactive Table &amp; Border Toolbar</div>
            <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-[11px]">
              Insert tables from the <strong>Insert</strong> or <strong>Table</strong> tab. Use the floating context menu or the <strong>Border Edit</strong> toolbar to apply presets (Outline, Inside, All, Borders None) and customize line style, thickness, and fill.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg">
            <div className="font-semibold text-slate-800 dark:text-neutral-200 mb-1">Full-Fidelity File Export</div>
            <p className="text-slate-600 dark:text-neutral-300 leading-relaxed text-[11px]">
              Under the <strong>File</strong> Backstage, export to Microsoft Word <code>.docx</code>, PDF document, HTML web page, or Markdown with all formatting, tables, and images preserved.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] text-white rounded font-medium cursor-pointer transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickGuideModal;
