import React, { useState } from 'react';
import { AutoCorrectionItem } from '../utils/AutoCorrect';
import { Sparkles, Check, X, ArrowRight, CheckCheck } from 'lucide-react';

interface AutoCorrectIndicatorProps {
  suggestions: AutoCorrectionItem[];
  onApply: (item: AutoCorrectionItem) => void;
  onIgnore: (item: AutoCorrectionItem) => void;
  onApplyAll: () => void;
  onClose: () => void;
}

export const AutoCorrectIndicator: React.FC<AutoCorrectIndicatorProps> = ({
  suggestions,
  onApply,
  onIgnore,
  onApplyAll,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-9 right-6 z-40 select-none no-print animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Compact Popover Menu */}
      {isOpen && (
        <div
          className="mb-2 w-80 sm:w-88 bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-100 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-neutral-50 dark:bg-[#181818] border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                AutoCorrect
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {suggestions.length}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {suggestions.length > 1 && (
                <button
                  type="button"
                  onClick={onApplyAll}
                  className="px-2 py-0.5 text-[11px] font-bold bg-[#185abd] hover:bg-[#124b9c] text-white rounded transition-colors cursor-pointer"
                >
                  Apply All
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onClose();
                }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 p-1">
            {suggestions.map((item) => (
              <div key={item.id} className="p-2 space-y-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded transition-colors">
                {/* Rule badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {item.rule}
                  </span>
                </div>

                {/* Original -> Suggested */}
                <div className="flex items-center space-x-2 text-xs font-mono py-0.5">
                  <span className="line-through text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded break-all max-w-[120px] truncate">
                    {item.original}
                  </span>
                  <ArrowRight size={12} className="text-neutral-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded break-all max-w-[120px] truncate">
                    {item.suggested}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end space-x-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onIgnore(item)}
                    className="px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded cursor-pointer transition-colors"
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => onApply(item)}
                    className="flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors shadow-2xs"
                  >
                    <Check size={11} strokeWidth={3} />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with Apply All if multiple */}
          {suggestions.length > 1 && (
            <div className="px-3 py-2 bg-neutral-50 dark:bg-[#181818] border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
              <button
                type="button"
                onClick={onApplyAll}
                className="w-full py-1 text-xs font-bold text-center bg-[#185abd] hover:bg-[#124b9c] text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <CheckCheck size={14} />
                <span>Apply All ({suggestions.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Smart AutoCorrect Suggestions Available (Click to view)"
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#202020] text-[#185abd] dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl font-bold text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 group"
      >
        <Sparkles size={13} className="text-[#185abd] dark:text-blue-400 animate-pulse" />
        <span>AutoCorrect</span>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">&middot;</span>
        <span className="w-5 h-5 rounded-full bg-[#185abd] dark:bg-blue-600 text-white text-[10.5px] font-bold flex items-center justify-center shadow-2xs">
          {suggestions.length}
        </span>
      </button>
    </div>
  );
};
