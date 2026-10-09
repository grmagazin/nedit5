import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { Target, X } from 'lucide-react';

export interface KeywordDensityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onOpenFullSeo?: () => void;
}

export const KeywordDensityModal: React.FC<KeywordDensityModalProps> = ({
  isOpen,
  onClose,
  editor,
  onOpenFullSeo,
}) => {
  const [focusKeyword, setFocusKeyword] = useState('');

  if (!isOpen) return null;

  const text = editor?.getText() || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let count = 0;
  if (focusKeyword.trim()) {
    const regex = new RegExp(`\\b${focusKeyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    count = (text.match(regex) || []).length;
  }
  const density = words > 0 && count > 0 ? ((count / words) * 100).toFixed(2) : '0.00';
  const densityNum = parseFloat(density);

  let statusColor = 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400';
  let statusText = 'Enter a keyword above to calculate density';
  if (focusKeyword.trim()) {
    if (count === 0) {
      statusColor = 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300';
      statusText = 'Keyword not found in content. Add to headings or intro paragraph.';
    } else if (densityNum >= 1.0 && densityNum <= 2.5) {
      statusColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300';
      statusText = '✓ Optimal keyword density (1.0% - 2.5%) for search ranking!';
    } else if (densityNum < 1.0) {
      statusColor = 'text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300';
      statusText = 'Slightly low density (< 1.0%). Consider naturally repeating in body or subheadings.';
    } else {
      statusColor = 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300';
      statusText = '⚠️ High density (> 2.5%). Risk of keyword stuffing penalty.';
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-md text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#db2777]">
            <Target size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">SEO Focus Keyword Analysis</h3>
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
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Focus Keyword or Keyphrase
            </label>
            <div className="relative">
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g., SEO, Microsoft Word, Document..."
                className="w-full text-xs px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#db2777] text-neutral-900 dark:text-neutral-100"
                autoFocus
              />
              {focusKeyword && (
                <button
                  onClick={() => setFocusKeyword('')}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#f8fafc] dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-400 block uppercase font-medium">Occurrences</span>
                <span className="text-base font-bold text-neutral-800 dark:text-neutral-100">{count}</span>
              </div>
              <div className="bg-[#f8fafc] dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-400 block uppercase font-medium">Total Words</span>
                <span className="text-base font-bold text-neutral-800 dark:text-neutral-100">{words}</span>
              </div>
              <div className="bg-[#f8fafc] dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 text-center">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-400 block uppercase font-medium">Density</span>
                <span className={`text-base font-bold ${densityNum >= 1.0 && densityNum <= 2.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#db2777]'}`}>
                  {density}%
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${statusColor}`}>
              {statusText}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
          {onOpenFullSeo ? (
            <button
              onClick={() => {
                onClose();
                onOpenFullSeo();
              }}
              className="text-xs text-[#185abd] dark:text-blue-400 hover:underline cursor-pointer font-medium"
            >
              Open Full SEO Toolbar →
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeywordDensityModal;
