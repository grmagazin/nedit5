import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { Search, X, ChevronRight, ChevronLeft, Replace, Check } from 'lucide-react';

interface FindReplaceModalProps {
  editor: Editor | null;
  onClose: () => void;
}

interface MatchPos {
  from: number;
  to: number;
  text: string;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({ editor, onClose }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Find all matches with exact ProseMirror positions
  const matches: MatchPos[] = useMemo(() => {
    if (!editor || !findText.trim()) return [];
    const doc = editor.state.doc;
    const list: MatchPos[] = [];
    const target = matchCase ? findText : findText.toLowerCase();
    const qLen = findText.length;

    doc.descendants((node: any, pos: number) => {
      if (!node.isTextblock) return;
      const blockText = node.textContent;
      if (!blockText) return;

      const sourceText = matchCase ? blockText : blockText.toLowerCase();
      let idx = 0;

      while ((idx = sourceText.indexOf(target, idx)) !== -1) {
        const matchStart = idx;
        const matchEnd = idx + qLen;

        let from = -1;
        let to = -1;
        let offset = 0;

        node.forEach((child: any, childPosOffset: number) => {
          const len = child.isText ? (child.text?.length || 0) : child.nodeSize;
          const start = offset;
          const end = offset + len;

          if (from === -1 && matchStart >= start && matchStart < end) {
            from = pos + 1 + childPosOffset + (matchStart - start);
          }
          if (to === -1 && matchEnd <= end && matchEnd > start) {
            to = pos + 1 + childPosOffset + (matchEnd - start);
          }
          offset += len;
        });

        if (from === -1) from = pos + 1 + matchStart;
        if (to === -1) to = from + qLen;

        list.push({
          from,
          to,
          text: blockText.slice(matchStart, matchEnd),
        });

        idx += Math.max(1, qLen);
      }
    });

    return list;
  }, [editor?.state.doc, findText, matchCase]);

  const jumpToMatch = (m: MatchPos, idx: number) => {
    if (!editor || !editor.view) return;
    setActiveIdx(idx);
    editor.commands.focus();
    editor.commands.setTextSelection({ from: m.from, to: m.to });
    editor.commands.scrollIntoView();

    requestAnimationFrame(() => {
      try {
        const coords = editor.view.coordsAtPos(m.from);
        const workspace = document.getElementById('word-canvas-workspace');
        if (workspace && coords) {
          const workspaceRect = workspace.getBoundingClientRect();
          const targetScroll = workspace.scrollTop + (coords.top - workspaceRect.top) - (workspace.clientHeight / 2);
          workspace.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }
      } catch {}
    });
  };

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (activeIdx + 1) % matches.length;
    jumpToMatch(matches[nextIndex], nextIndex);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIndex = (activeIdx - 1 + matches.length) % matches.length;
    jumpToMatch(matches[prevIndex], prevIndex);
  };

  const handleReplace = () => {
    if (!editor || matches.length === 0) return;
    const current = matches[activeIdx] || matches[0];
    if (!current) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: current.from, to: current.to })
      .insertContent(replaceText)
      .run();

    setFeedback('Replaced 1 match');
    setTimeout(() => setFeedback(''), 2500);

    setTimeout(() => {
      if (matches.length > 1) {
        const next = Math.min(activeIdx, matches.length - 2);
        if (matches[next]) {
          jumpToMatch(matches[next], next);
        }
      }
    }, 50);
  };

  const handleReplaceAll = () => {
    if (!editor || matches.length === 0) return;
    const count = matches.length;
    const sorted = [...matches].sort((a, b) => b.from - a.from);

    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        for (const m of sorted) {
          tr.insertText(replaceText, m.from, m.to);
        }
        return true;
      })
      .run();

    setFeedback(`Replaced ${count} ${count === 1 ? 'match' : 'matches'}`);
    setTimeout(() => setFeedback(''), 3000);
    setActiveIdx(0);
  };

  return (
    <div className="fixed top-28 right-8 bg-white dark:bg-[#202023] border border-neutral-300 dark:border-[#383838] rounded-lg shadow-2xl p-4 w-80 z-40 text-xs no-print animate-in fade-in slide-in-from-top-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700 mb-3">
        <div className="flex items-center space-x-1.5 font-semibold text-neutral-800 dark:text-neutral-100">
          <Search size={14} className="text-[#185abd]" />
          <span>Find and Replace</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Input Fields */}
      <div className="space-y-2.5 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-neutral-500 dark:text-neutral-400">Find what:</label>
            {matches.length > 0 && (
              <span className="text-[11px] text-[#185abd] dark:text-sky-400 font-medium">
                {activeIdx + 1} of {matches.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) handlePrev();
                  else handleNext();
                }
              }}
              placeholder="Text to find..."
              className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#18181b] text-neutral-800 dark:text-neutral-100 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
              autoFocus
            />
            <button
              onClick={handlePrev}
              disabled={matches.length === 0}
              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
              title="Previous (Shift+Enter)"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNext}
              disabled={matches.length === 0}
              className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-700 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
              title="Next (Enter)"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Replace with:</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
            placeholder="Replacement text..."
            className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-[#18181b] text-neutral-800 dark:text-neutral-100 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
          />
        </div>

        {/* Options */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-1.5 text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="accent-[#185abd] rounded"
            />
            <span>Match case</span>
          </label>

          {feedback ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={12} /> {feedback}
            </span>
          ) : (
            findText.trim() && (
              <span className="text-[11px] text-neutral-500">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </span>
            )
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={handleReplace}
          disabled={matches.length === 0}
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 disabled:opacity-40 text-neutral-700 dark:text-neutral-200 rounded font-medium cursor-pointer"
        >
          Replace
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={matches.length === 0}
          className="px-3 py-1.5 bg-[#185abd] hover:bg-[#114b9c] disabled:opacity-40 text-white rounded font-medium cursor-pointer shadow-2xs"
        >
          Replace All
        </button>
      </div>
    </div>
  );
};
