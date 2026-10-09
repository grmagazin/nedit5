import React from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
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
            <Keyboard size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Microsoft Word Compatible Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-3 max-h-[65vh] overflow-y-auto text-xs text-neutral-700 dark:text-neutral-300 pr-1">
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Formatting
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Bold</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + B</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Italic</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + I</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Underline</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + U</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Strikethrough</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + Shift + X</kbd>
              </div>
            </div>
          </div>

          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Document Actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Save Document</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + S</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Print / PDF</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + P</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Find</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + F</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Replace</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + H</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Undo</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + Z</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Redo</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Ctrl + Y</kbd>
              </div>
            </div>
          </div>

          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tables
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Next Cell</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Tab</kbd>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">Previous Cell</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded font-mono text-[10px] text-neutral-800 dark:text-neutral-100">Shift + Tab</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] text-white rounded font-medium cursor-pointer transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeyboardShortcutsModal;
