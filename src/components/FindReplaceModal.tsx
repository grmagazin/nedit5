import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Search, X, ChevronRight, ChevronLeft, Replace } from 'lucide-react';

interface FindReplaceModalProps {
  editor: Editor | null;
  onClose: () => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ editor, onClose }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const handleFind = () => {
    if (!editor || !findText.trim()) return;
    const content = editor.getText();
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(findText, flags);
    const matches = content.match(regex);
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplace = () => {
    if (!editor || !findText.trim()) return;
    const html = editor.getHTML();
    const flags = matchCase ? '' : 'i';
    const regex = new RegExp(findText, flags);
    const newHtml = html.replace(regex, replaceText);
    editor.commands.setContent(newHtml);
    handleFind();
  };

  const handleReplaceAll = () => {
    if (!editor || !findText.trim()) return;
    const html = editor.getHTML();
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(findText, flags);
    const newHtml = html.replace(regex, replaceText);
    editor.commands.setContent(newHtml);
    setMatchCount(0);
  };

  return (
    <div className="fixed top-28 right-8 bg-white border border-neutral-300 rounded-lg shadow-2xl p-4 w-80 z-40 text-xs no-print animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 mb-3">
        <div className="flex items-center space-x-1.5 font-semibold text-neutral-800">
          <Search size={14} className="text-[#185abd]" />
          <span>Find and Replace</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Input Fields */}
      <div className="space-y-2.5 mb-3">
        <div>
          <label className="block text-[11px] text-neutral-500 mb-1">Find what:</label>
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setMatchCount(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleFind()}
              placeholder="Text to find..."
              className="w-full px-2 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
              autoFocus
            />
            <button
              onClick={handleFind}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded text-neutral-700 font-medium cursor-pointer"
            >
              Find
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-500 mb-1">Replace with:</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replacement text..."
            className="w-full px-2 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
          />
        </div>

        {/* Options */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-1.5 text-neutral-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="accent-[#185abd] rounded"
            />
            <span>Match case</span>
          </label>

          {matchCount !== null && (
            <span className="text-[11px] text-[#185abd] font-medium">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200">
        <button
          onClick={handleReplace}
          disabled={!findText.trim()}
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-700 rounded font-medium cursor-pointer"
        >
          Replace
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={!findText.trim()}
          className="px-3 py-1.5 bg-[#185abd] hover:bg-[#114b9c] disabled:opacity-50 text-white rounded font-medium cursor-pointer"
        >
          Replace All
        </button>
      </div>
    </div>
  );
};
