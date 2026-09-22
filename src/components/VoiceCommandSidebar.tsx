import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Mic, X, Check, Loader2 } from 'lucide-react';

interface VoiceCommandSidebarProps {
  editor: Editor | null;
  onClose: () => void;
}

const AVAILABLE_COMMANDS = [
  'find',
  'select',
  'bold',
  'italic',
  'underline',
  'strike',
  'delete',
  'clear',
  'subscript',
  'superscript',
  'line',
  'paragraph',
  'heading',
  'center',
  'left',
  'right',
  'justify',
  'indent',
  'outdent',
  'bullet',
  'number',
  'blockquote',
  'code',
  'uppercase',
  'lowercase',
];

// Smart normalizer & autocomplete for target errors (e.g. "paragrap" -> "paragraph")
export const normalizeTarget = (tgt: string): string => {
  const clean = tgt.toLowerCase().trim();
  if (!clean) return '';

  const paragraphVariants = new Set([
    'paragraph',
    'paragraphs',
    'paragrap',
    'pargrgraph',
    'pargraph',
    'paragrph',
    'paragraf',
    'paragrah',
    'paragarph',
    'paragaph',
    'paragref',
    'paragrapg',
    'paragra',
    'parapraph',
    'parapgraph',
    'parargraph',
    'paragraff',
    'paragrapgh',
    'paragrath',
    'paragrpah',
    'parargaph',
    'paragf',
    'paragrp',
    'paraf',
  ]);

  if (paragraphVariants.has(clean)) {
    return 'paragraph';
  }

  // Regex check for common phonetic / speech recognition typos of "paragraph"
  if (/^par+[a-z]{0,2}g+r+[a-z]{2,5}$/i.test(clean) || /^p[a|e|o]r+g+r+[a-z]*$/i.test(clean)) {
    return 'paragraph';
  }

  // Target correction for "selection":
  const selectionVariants = new Set([
    'selection',
    'selections',
    'selecton',
    'selecction',
    'selectin',
    'seletion',
    'selectiom',
    'selecion',
    'selction',
    'slection',
    'selecten',
    'selectan',
    'selectio',
  ]);

  if (selectionVariants.has(clean)) {
    return 'selection';
  }

  if (/^sel+e?c?t+[a-z]{2,5}$/i.test(clean)) {
    return 'selection';
  }

  return clean;
};

export const VoiceCommandSidebar: React.FC<VoiceCommandSidebarProps> = ({ editor, onClose }) => {
  const [command, setCommand] = useState('');
  const [target, setTarget] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [isExecuted, setIsExecuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Precise match finder: calculates exact ProseMirror document positions for target word
  const findAllMatches = (targetWord: string) => {
    if (!editor || !targetWord.trim()) return [];

    const cleanTarget = targetWord.toLowerCase().trim();
    const matches: { from: number; to: number; text: string }[] = [];

    editor.state.doc.descendants((node, pos) => {
      // Check textblocks (paragraphs, headings, code blocks, etc.)
      if (node.isTextblock) {
        let blockText = '';
        const charPositions: number[] = [];

        node.forEach((child, offset) => {
          if (child.isText && child.text) {
            // Child text starts at block start (pos + 1) plus offset inside fragment
            const childStart = pos + 1 + offset;
            for (let i = 0; i < child.text.length; i++) {
              blockText += child.text[i];
              charPositions.push(childStart + i);
            }
          }
        });

        const lower = blockText.toLowerCase();
        let idx = lower.indexOf(cleanTarget);
        while (idx !== -1) {
          const fromDoc = charPositions[idx];
          const toDoc = charPositions[idx + cleanTarget.length - 1] + 1;
          if (fromDoc !== undefined && toDoc !== undefined) {
            matches.push({
              from: fromDoc,
              to: toDoc,
              text: blockText.substring(idx, idx + cleanTarget.length),
            });
          }
          idx = lower.indexOf(cleanTarget, idx + 1);
        }
      }
    });

    return matches;
  };

  // Helper: Find and select target word precisely with zero offset error
  const findAndSelectWord = (targetWord: string, forceNext = false): boolean => {
    if (!editor || !targetWord.trim()) return false;

    const matches = findAllMatches(targetWord);
    if (matches.length === 0) {
      showToast(`Word "${targetWord}" not found`);
      return false;
    }

    const currentFrom = editor.state.selection.from;
    let targetMatch: { from: number; to: number; text: string } | undefined;

    if (forceNext) {
      // Pick next match strictly after current position
      targetMatch = matches.find((m) => m.from > currentFrom);
      if (!targetMatch) {
        // Wrap around to beginning
        targetMatch = matches[0];
      }
    } else {
      // Pick match at or after current position, or wrap to first
      targetMatch = matches.find((m) => m.from >= currentFrom);
      if (!targetMatch) {
        targetMatch = matches[0];
      }
    }

    if (targetMatch) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: targetMatch.from, to: targetMatch.to })
        .scrollIntoView()
        .run();
      return true;
    }

    return false;
  };

  // Helper: Select word currently under caret
  const selectWordUnderCaret = () => {
    if (!editor) return;
    const { from, empty } = editor.state.selection;
    if (!empty) {
      // Active selection already exists
      return;
    }

    const $pos = editor.state.doc.resolve(from);
    if (!$pos.parent.isTextblock) return;

    const parentText = $pos.parent.textBetween(0, $pos.parent.content.size, '', '');
    const offset = $pos.parentOffset;

    let start = offset;
    while (start > 0 && /[\p{L}\p{N}_]/u.test(parentText[start - 1])) {
      start--;
    }
    let end = offset;
    while (end < parentText.length && /[\p{L}\p{N}_]/u.test(parentText[end])) {
      end++;
    }

    if (start < end) {
      const parentStartPos = $pos.start();
      editor.chain().focus().setTextSelection({
        from: parentStartPos + start,
        to: parentStartPos + end,
      }).run();
    }
  };

  // Helper: Select whole current paragraph at caret
  const selectCurrentParagraph = () => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);

    // Find the enclosing textblock (paragraph, heading, blockquote text, etc.) containing caret
    let targetDepth = $pos.depth;
    while (targetDepth > 0 && !$pos.node(targetDepth).isTextblock) {
      targetDepth--;
    }

    if (targetDepth >= 1) {
      const start = $pos.start(targetDepth);
      const end = $pos.end(targetDepth);
      editor.chain().focus().setTextSelection({ from: start, to: end }).run();
    } else {
      const start = $pos.start();
      const end = $pos.end();
      editor.chain().focus().setTextSelection({ from: start, to: end }).run();
    }
  };

  // Core execution function for commands
  const executeCommand = (cmdName: string, tgtWord: string, forceNext = false) => {
    if (!editor) return;

    const normCmd = cmdName.toLowerCase().trim();
    const rawTgt = tgtWord.trim();
    const normTgt = normalizeTarget(rawTgt);

    // Auto-update input state if target was a normalized error (e.g. paragrap -> paragraph, selecton -> selection)
    if (
      (normTgt === 'paragraph' && rawTgt.toLowerCase() !== 'paragraph') ||
      (normTgt === 'selection' && rawTgt.toLowerCase() !== 'selection')
    ) {
      setTarget(normTgt);
    }

    // 1. Determine target selection
    if (normTgt === 'paragraph') {
      if (forceNext) {
        // Advance to next paragraph/textblock
        const { from } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        let targetDepth = $pos.depth;
        while (targetDepth > 0 && !$pos.node(targetDepth).isTextblock) {
          targetDepth--;
        }
        const currentBlockEnd = targetDepth >= 1 ? $pos.after(targetDepth) : $pos.end() + 1;
        let nextBlockStart = -1;
        let nextBlockEnd = -1;

        editor.state.doc.nodesBetween(currentBlockEnd, editor.state.doc.content.size, (node, pos) => {
          if (nextBlockStart !== -1) return false;
          if (node.isTextblock && node.content.size > 0) {
            nextBlockStart = pos + 1;
            nextBlockEnd = pos + 1 + node.content.size;
            return false;
          }
        });

        if (nextBlockStart !== -1 && nextBlockEnd !== -1) {
          editor.chain().focus().setTextSelection({ from: nextBlockStart, to: nextBlockEnd }).run();
        } else {
          // Wrap around to first textblock
          editor.state.doc.descendants((node, pos) => {
            if (nextBlockStart !== -1) return false;
            if (node.isTextblock && node.content.size > 0) {
              nextBlockStart = pos + 1;
              nextBlockEnd = pos + 1 + node.content.size;
              return false;
            }
          });
          if (nextBlockStart !== -1 && nextBlockEnd !== -1) {
            editor.chain().focus().setTextSelection({ from: nextBlockStart, to: nextBlockEnd }).run();
          }
        }
      } else {
        selectCurrentParagraph();
      }
    } else if (normTgt === 'selection') {
      // Resolve Selection to text/content currently selected in the editor.
      // If user does not have a selected area, execute command to focused word.
      const { empty } = editor.state.selection;
      if (empty) {
        selectWordUnderCaret();
      }
    } else if (normTgt && normTgt !== '') {
      const found = findAndSelectWord(normTgt, forceNext);
      if (!found) {
        showToast(`Target "${tgtWord}" not found in document`);
        return;
      }
    } else {
      // No target word specified: apply to word under caret
      selectWordUnderCaret();
    }

    // 2. Execute command
    switch (normCmd) {
      case 'find':
      case 'select':
        // Target already resolved
        showToast(
          normTgt === 'paragraph'
            ? 'Selected focused paragraph'
            : normTgt === 'selection'
            ? 'Selected current text'
            : `Selected "${tgtWord || 'caret word'}"`
        );
        break;

      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;

      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;

      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;

      case 'strike':
      case 'line': // line = strikethrough as per reference
        editor.chain().focus().toggleStrike().run();
        break;

      case 'delete':
        editor.chain().focus().deleteSelection().run();
        showToast('Deleted');
        break;

      case 'clear':
        editor.chain().focus().unsetAllMarks().clearNodes().run();
        showToast('Formatting cleared');
        break;

      case 'subscript':
        editor.chain().focus().toggleSubscript().run();
        break;

      case 'superscript':
        editor.chain().focus().toggleSuperscript().run();
        break;

      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;

      case 'heading': // heading = H1 as per reference
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;

      case 'center':
        editor.chain().focus().setTextAlign('center').run();
        break;

      case 'left':
        editor.chain().focus().setTextAlign('left').run();
        break;

      case 'right':
        editor.chain().focus().setTextAlign('right').run();
        break;

      case 'justify':
        editor.chain().focus().setTextAlign('justify').run();
        break;

      case 'indent':
        editor.chain().focus().insertContent('    ').run();
        break;

      case 'outdent':
        editor.chain().focus().liftEmptyBlock().run();
        break;

      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;

      case 'number':
        editor.chain().focus().toggleOrderedList().run();
        break;

      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;

      case 'code': // code = pre block as per reference
        editor.chain().focus().toggleCodeBlock().run();
        break;

      case 'uppercase': {
        const sel = editor.state.selection;
        const text = editor.state.doc.textBetween(sel.from, sel.to);
        if (text) {
          editor.chain().focus().insertContent(text.toUpperCase()).setTextSelection({ from: sel.from, to: sel.from + text.length }).run();
        }
        break;
      }

      case 'lowercase': {
        const sel = editor.state.selection;
        const text = editor.state.doc.textBetween(sel.from, sel.to);
        if (text) {
          editor.chain().focus().insertContent(text.toLowerCase()).setTextSelection({ from: sel.from, to: sel.from + text.length }).run();
        }
        break;
      }

      default:
        showToast(`Unknown command: "${cmdName}"`);
        setIsExecuted(false);
        return;
    }

    setIsExecuted(true);
  };

  // Next button handler: apply command to next occurrence of target word
  const handleNext = () => {
    if (!target.trim()) {
      showToast('Please specify a target word to find next');
      return;
    }
    executeCommand(command || 'find', target, true);
  };

  // Replace button handler
  const handleReplace = () => {
    if (!editor || !target.trim()) {
      showToast('Please specify target word to replace');
      return;
    }

    const sel = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(sel.from, sel.to).toLowerCase().trim();

    if (selectedText === target.toLowerCase().trim()) {
      // Replace active selection
      editor.chain().focus().insertContent(replaceText).run();
      showToast('Replaced');
      // Automatically find next
      findAndSelectWord(target, true);
    } else {
      // Find the target first, then replace
      const found = findAndSelectWord(target, false);
      if (found) {
        editor.chain().focus().insertContent(replaceText).run();
        showToast('Replaced');
        findAndSelectWord(target, true);
      }
    }
  };

  // Start 6-second Voice Command
  const startVoiceCommand = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser. You can type commands below.');
      return;
    }

    if (isListening) {
      stopVoiceListening();
      return;
    }

    setIsExecuted(false);
    setIsListening(true);
    setCountdown(6);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        // Smart voice command rules:
        // First word = command, second word = target word. Only 2 words. Each other word ignored.
        const words = transcript.split(/\s+/);
        const parsedCmd = words[0] || '';
        let parsedTgt = words[1] || '';

        // Smart autocomplete target errors (e.g. paragrap -> paragraph, pargrgraph -> paragraph, etc.)
        parsedTgt = normalizeTarget(parsedTgt);

        setCommand(parsedCmd.toLowerCase());
        setTarget(parsedTgt);

        // Auto execute immediately
        executeCommand(parsedCmd, parsedTgt);
      };

      recognition.onerror = () => {
        stopVoiceListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;

      // 6-second timer countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Stop listening strictly at 6 seconds
      timerRef.current = setTimeout(() => {
        stopVoiceListening();
      }, 6000);
    } catch {
      setIsListening(false);
      showToast('Could not access microphone');
    }
  };

  const stopVoiceListening = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setCountdown(6);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const isCommandFind = command.toLowerCase().trim() === 'find';

  return (
    <aside
      id="voice-command-sidebar"
      className="w-84 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full z-20 select-none shadow-xl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-base">
          <Mic size={18} className="text-slate-600" />
          <span>Voice Command</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close Voice Command"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-left">
        {/* Instruction note */}
        <p className="text-[13px] text-slate-600 leading-relaxed font-normal">
          Say a <strong className="text-slate-800 font-semibold">command</strong> then the{' '}
          <strong className="text-slate-800 font-semibold">target word</strong>. Extra words are
          ignored. Say only the command to apply it to the word under the caret. Use{' '}
          <strong className="text-slate-800 font-semibold">paragraph</strong> for the focused paragraph,
          or <strong className="text-slate-800 font-semibold">selection</strong> for the selected text
          (e.g. <em className="text-slate-700">bold selection</em>).
        </p>

        {/* Start Voice Command Button */}
        <button
          onClick={startVoiceCommand}
          className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm font-semibold transition-colors cursor-pointer shadow-xs ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-[#233876] hover:bg-[#1b2b5d] text-white'
          }`}
        >
          {isListening ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Listening ({countdown}s)...</span>
            </>
          ) : (
            <>
              <Mic size={17} />
              <span>Start Voice Command</span>
            </>
          )}
        </button>

        {/* Command Input Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Command</label>
          <input
            type="text"
            value={command}
            placeholder="e.g. find, bold, italic"
            onChange={(e) => {
              setCommand(e.target.value);
              setIsExecuted(false);
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#185abd] focus:border-transparent text-slate-800 font-medium"
          />
        </div>

        {/* Target Input Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target</label>
          <input
            type="text"
            value={target}
            placeholder="e.g. John, paragraph, selection (optional)"
            onChange={(e) => {
              const val = e.target.value;
              const norm = normalizeTarget(val);
              // Smart autocomplete target errors as user types (e.g. paragrap -> paragraph, selecton -> selection)
              if (norm === 'paragraph' && val.toLowerCase().trim() !== 'paragraph' && val.trim().length >= 6) {
                setTarget('paragraph');
              } else if (norm === 'selection' && val.toLowerCase().trim() !== 'selection' && val.trim().length >= 6) {
                setTarget('selection');
              } else {
                setTarget(val);
              }
              setIsExecuted(false);
            }}
            onBlur={() => {
              const norm = normalizeTarget(target);
              if (
                (norm === 'paragraph' && target.toLowerCase().trim() !== 'paragraph') ||
                (norm === 'selection' && target.toLowerCase().trim() !== 'selection')
              ) {
                setTarget(norm);
              }
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#185abd] focus:border-transparent text-slate-800 font-medium"
          />
        </div>

        {/* Action Row: Execute (Green/Orange) + Next Button */}
        <div className="flex items-center space-x-2 pt-0.5">
          <button
            onClick={() => executeCommand(command, target)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs ${
              isExecuted
                ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                : 'bg-[#f59e0b] hover:bg-[#d97706] text-white'
            }`}
          >
            {isExecuted && <Check size={16} className="stroke-[3]" />}
            <span>{isExecuted ? 'Executed' : 'Execute'}</span>
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>

        {/* Replace Section - ONLY VISIBLE IF COMMAND IS "find" */}
        {isCommandFind && (
          <div className="bg-[#fffdf5] border border-[#fef08a] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <label className="block text-xs font-semibold text-slate-700">Replace with</label>
            <input
              type="text"
              placeholder="replacement text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-amber-400 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleReplace}
                className="flex-1 py-2 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Replace
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-sm rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-md">
            {toastMessage}
          </div>
        )}

        {/* Available Commands Pill Cloud */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-800 mb-2.5">Available commands</div>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_COMMANDS.map((cmd) => {
              const isSelected = command.toLowerCase().trim() === cmd;
              return (
                <button
                  key={cmd}
                  onClick={() => {
                    setCommand(cmd);
                    setIsExecuted(false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#16a34a] text-white font-semibold shadow-xs'
                      : 'bg-[#f1f5f9] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cmd}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-note at bottom */}
        <p className="text-[11px] text-slate-500 pt-2 leading-relaxed">
          line = strikethrough · heading = H1 · code = pre block
        </p>
      </div>
    </aside>
  );
};
