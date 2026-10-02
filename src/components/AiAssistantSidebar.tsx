import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { GoogleGenAI } from '@google/genai';
import {
  Sparkles,
  X,
  BookOpen,
  Wand2,
  CheckCheck,
  Minimize2,
  Languages,
  Send,
  Key,
  Copy,
  Check,
  ArrowDownToLine,
  Replace,
  PenLine,
  RotateCcw,
  Loader2,
  ExternalLink,
  ChevronDown,
  Trash2,
  FileText,
} from 'lucide-react';

export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

interface AiAssistantSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  themeMode?: ThemeMode;
  initialIntent?: 'grammar' | 'improve' | 'summarize' | null;
  triggerTimestamp?: number;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionType?: string;
  targetSelectionText?: string;
}

export const AiAssistantSidebar: React.FC<AiAssistantSidebarProps> = ({
  editor,
  onClose,
  themeMode = 'light',
  initialIntent,
  triggerTimestamp,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem('gemini_api_key') ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY || '' : '')
    );
  });
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('Greek');
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  // Exact theme breakdown: 2 Light Modes (Standard Light & Sepia Warm Mode), 2 Dark Modes
  const isSepia = themeMode === 'sepia';
  const isDark = themeMode === 'fullDark' || themeMode === 'canvasDark';
  const isStandardLight = !isSepia && !isDark;

  // Live Document Selection Tracking for seamless user cooperation
  const [activeSelection, setActiveSelection] = useState<{
    text: string;
    from: number;
    to: number;
    wordCount: number;
  } | null>(null);
  const lastValidSelectionRef = useRef<{ from: number; to: number; text: string } | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hi! I'm your AI writing assistant. Select text in your document to enhance, summarize, or fix grammar, or use 'Continue Writing' from your cursor.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time editor selection changes so the AI is always synchronized with user cursor & highlights
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ').trim();
        if (text) {
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const sel = { text, from, to, wordCount };
          setActiveSelection(sel);
          lastValidSelectionRef.current = sel;
          return;
        }
      }
      setActiveSelection(null);
    };

    handleUpdate();
    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSaveApiKey = () => {
    const cleanKey = tempApiKey.trim();
    if (!cleanKey) return;
    localStorage.setItem('gemini_api_key', cleanKey);
    setApiKey(cleanKey);
    setTempApiKey('');
    setShowKeyInput(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setShowKeyInput(true);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hi! I'm your AI writing assistant. Select text in your document to enhance, summarize, or fix grammar, or use 'Continue Writing' from your cursor.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Determine current contextual text (either active selection or full document)
  const getContextText = (): { text: string; isSelection: boolean } => {
    if (!editor) return { text: '', isSelection: false };

    // Active selection in document
    if (activeSelection && activeSelection.text) {
      return { text: activeSelection.text, isSelection: true };
    }

    // Remembered selection if still available
    if (lastValidSelectionRef.current?.text) {
      return { text: lastValidSelectionRef.current.text, isSelection: true };
    }

    // Fallback: check current selection in editor
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const sel = editor.state.doc.textBetween(from, to, ' ').trim();
      if (sel) {
        return { text: sel, isSelection: true };
      }
    }

    // Default: document text
    const all = editor.getText();
    return { text: all.slice(0, 10000), isSelection: false };
  };

  const executeAiCall = async (
    systemInstruction: string,
    userPrompt: string,
    actionLabel?: string,
    selectionSnapshot?: string
  ) => {
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const userMsgId = Date.now().toString();
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: actionLabel || userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType: actionLabel,
        targetSelectionText: selectionSnapshot,
      },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const fullPrompt = `${systemInstruction}\n\nCONTENT:\n${userPrompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
      });

      const responseText = response.text || 'No response generated.';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: responseText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          targetSelectionText: selectionSnapshot,
        },
      ]);
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      let errorMsg = err?.message || 'Error communicating with Gemini API.';
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('invalid API key')) {
        errorMsg = 'Invalid API key. Please check your Gemini API key and try again.';
        setShowKeyInput(true);
      } else if (errorMsg.includes('quota') || errorMsg.includes('resource_exhausted')) {
        errorMsg = 'Quota limit reached on this API key. Please try again later or check billing.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `⚠️ ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Quick Actions
  const handleSummarize = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction =
      'You are an executive document assistant. Summarize the following text clearly and concisely with key bullet points and high-impact takeaways:';
    executeAiCall(
      instruction,
      text,
      isSelection ? 'Summarize selection' : 'Summarize document',
      isSelection ? text : undefined
    );
  };

  const handleImproveWriting = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction =
      'You are a professional editor. Improve the following text for clarity, flow, vocabulary, and conciseness while preserving the author original voice and intent. Provide only the improved text:';
    executeAiCall(
      instruction,
      text,
      isSelection ? 'Improve selected writing' : 'Improve document writing',
      isSelection ? text : undefined
    );
  };

  const handleFixGrammar = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: '📝 Please select text in your document (or write some content) to check spelling & grammar with Gemini.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }
    const instruction =
      'You are an expert proofreader. Fix all spelling, grammatical, punctuation, and structural errors in the following text. Return the corrected version cleanly:';
    executeAiCall(
      instruction,
      text,
      isSelection ? 'Fix grammar & spelling in selection' : 'Fix document grammar & spelling',
      isSelection ? text : undefined
    );
  };

  // Smart auto-trigger when opened specifically for Spell & Grammar from Review tab
  const lastProcessedTriggerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!initialIntent) return;
    if (triggerTimestamp && triggerTimestamp === lastProcessedTriggerRef.current) return;
    lastProcessedTriggerRef.current = triggerTimestamp;

    if (initialIntent === 'grammar') {
      const timer = setTimeout(() => {
        handleFixGrammar();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialIntent, triggerTimestamp]);

  const handleMakeShorter = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction =
      'Condense the following text to be significantly shorter, punchy, and direct, keeping all crucial details and eliminating fluff. Provide only the condensed text:';
    executeAiCall(
      instruction,
      text,
      isSelection ? 'Make selection shorter' : 'Make document shorter',
      isSelection ? text : undefined
    );
  };

  // Co-writing: Continue writing smoothly from the user's cursor position
  const handleContinueWriting = () => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const docSize = editor.state.doc.content.size;
    const pos = Math.min(from, docSize);
    const startPos = Math.max(0, pos - 1200);
    const precedingText = editor.state.doc.textBetween(startPos, pos, '\n');

    if (!precedingText.trim()) {
      alert('Please place your cursor after some text or write an opening sentence first.');
      return;
    }

    const instruction =
      'You are a collaborative co-writer. Seamlessly continue the text from where the author left off. Match their style, voice, terminology, and flow. Output only the next 2-3 sentences or short paragraph without any preamble or conversational commentary:';
    executeAiCall(instruction, precedingText, 'Continue writing from cursor');
  };

  const handleTranslate = (lang: string) => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction = `Translate the following text accurately and naturally into ${lang}, preserving nuance and document tone:`;
    executeAiCall(instruction, text, `Translate into ${lang}`, isSelection ? text : undefined);
    setShowLangDropdown(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    const query = inputQuery.trim();
    setInputQuery('');

    const { text, isSelection } = getContextText();
    const systemPrompt = `You are a helpful and intelligent AI writing assistant integrated into a document editor.
Follow the user's instructions carefully.
${text ? `CURRENT DOCUMENT ${isSelection ? 'SELECTED TEXT' : 'CONTENT'}:\n"""\n${text}\n"""` : ''}`;

    executeAiCall(systemPrompt, query, undefined, isSelection ? text : undefined);
  };

  // Smart Insert: replaces selected text if requested, or inserts at cursor position
  const handleInsertIntoDoc = (text: string, msgId: string, replaceSelection = false) => {
    if (!editor) return;

    const savedSel = lastValidSelectionRef.current;
    if (replaceSelection && savedSel && savedSel.from !== savedSel.to) {
      try {
        const docSize = editor.state.doc.content.size;
        const safeFrom = Math.min(savedSel.from, docSize);
        const safeTo = Math.min(savedSel.to, docSize);
        editor
          .chain()
          .focus()
          .setTextSelection({ from: safeFrom, to: safeTo })
          .deleteSelection()
          .insertContent(text)
          .run();
        setInsertedId(msgId);
        setTimeout(() => setInsertedId(null), 2500);
        return;
      } catch {
        // fallback
      }
    }

    editor.chain().focus().insertContent(text).run();
    setInsertedId(msgId);
    setTimeout(() => setInsertedId(null), 2500);
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const languages = ['Greek', 'English', 'Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese'];

  // Current document word count for context display
  const docWordCount = editor?.getText().split(/\s+/).filter(Boolean).length || 0;

  return (
    <aside
      className={`w-88 sm:w-96 flex flex-col h-full shadow-2xl z-30 select-none animate-in slide-in-from-right duration-200 border-l ${
        isDark
          ? 'bg-[#1c1c1c] border-[#333] text-neutral-100'
          : isSepia
          ? 'bg-[#f5eedc] border-[#dcd0bd] text-[#2c231c]'
          : 'bg-white border-[#e2e8f0] text-neutral-800'
      }`}
      aria-label="AI Writing Assistant"
    >
      {/* 1. Header (Adaptive: Purple gradient for Light/Dark, warm amber/brown for Sepia) */}
      <div
        className={`h-12 flex items-center justify-between px-4 shrink-0 shadow-xs text-white ${
          isSepia
            ? 'bg-gradient-to-r from-[#7c4a1e] to-[#9a5e28]'
            : 'bg-gradient-to-r from-[#6d28d9] to-[#7c3aed]'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Sparkles size={18} className="text-yellow-300 fill-yellow-300/30" />
          <h2 className="font-semibold text-[15px] tracking-tight text-white">AI Writing Assistant</h2>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close AI Assistant"
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. API Key Status / Configuration Bar */}
      <div
        className={`px-3.5 py-2 border-b text-xs flex items-center justify-between ${
          isDark
            ? 'bg-[#252525] border-[#333] text-neutral-300'
            : isSepia
            ? 'bg-[#ece3d0] border-[#ded3be] text-[#3d2e1e]'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          <Key
            size={13}
            className={
              apiKey
                ? isSepia
                  ? 'text-[#2b6d49]'
                  : 'text-emerald-600 dark:text-emerald-400'
                : isSepia
                ? 'text-[#a16207]'
                : 'text-amber-500'
            }
          />
          {apiKey ? (
            <span className="text-[11px] font-medium truncate">
              Key: <span className="font-mono opacity-70">••••{apiKey.slice(-4)}</span> (Gemini 3.8 Flash)
            </span>
          ) : (
            <span
              className={`text-[11px] font-medium ${
                isSepia ? 'text-[#854d0e]' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              Gemini API Key Required
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`text-[11px] font-semibold cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
              isSepia
                ? 'text-[#7c4a1e] hover:bg-[#ded3be]'
                : 'text-[#6d28d9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            {apiKey ? (showKeyInput ? 'Hide' : 'Change') : 'Set Key'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearApiKey}
              title="Remove Stored API Key"
              className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* API Key Modal / Expandable input */}
      {showKeyInput && (
        <div
          className={`p-3 border-b space-y-2 text-xs animate-in slide-in-from-top-1 duration-150 ${
            isDark
              ? 'bg-purple-950/30 border-purple-800 text-neutral-200'
              : isSepia
              ? 'bg-[#f0e7d5] border-[#cfbe9e] text-[#2c231c]'
              : 'bg-purple-50/80 border-purple-200 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">Enter Your Gemini API Key:</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className={`text-[11px] hover:underline flex items-center space-x-0.5 font-medium ${
                isSepia ? 'text-[#7c4a1e]' : 'text-[#6d28d9] dark:text-purple-400'
              }`}
            >
              <span>Get free key</span>
              <ExternalLink size={10} />
            </a>
          </div>
          <div className="flex space-x-1.5">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className={`flex-1 px-2.5 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 ${
                isDark
                  ? 'bg-[#2c2c2c] border-purple-700 text-neutral-100 focus:ring-[#7c3aed]'
                  : isSepia
                  ? 'bg-[#fbf8ee] border-[#cfc2aa] text-[#2c231c] focus:ring-[#7c4a1e]'
                  : 'bg-white border-purple-300 text-neutral-900 focus:ring-[#7c3aed]'
              }`}
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!tempApiKey.trim()}
              className={`px-3 py-1.5 disabled:opacity-50 text-white font-medium rounded text-xs transition-colors cursor-pointer ${
                isSepia
                  ? 'bg-[#7c4a1e] hover:bg-[#603814]'
                  : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
              }`}
            >
              Save
            </button>
          </div>
          <p className="text-[10px] opacity-75 leading-tight">
            Key is saved securely in your browser's local storage and used only for your requests.
          </p>
        </div>
      )}

      {/* 3. Live Document Context Banner (Smart Cooperation Indicator) */}
      <div
        className={`px-3 pt-2 pb-1.5 border-b shrink-0 ${
          isDark
            ? 'bg-[#202020] border-[#2a2a2a]'
            : isSepia
            ? 'bg-[#eee5d3] border-[#ded3be]'
            : 'bg-slate-50/70 border-slate-100'
        }`}
      >
        {activeSelection ? (
          <div
            className={`p-2 border rounded-lg flex items-center justify-between text-xs ${
              isDark
                ? 'bg-purple-950/40 border-purple-800/80 text-purple-200'
                : isSepia
                ? 'bg-[#fbf4e6] border-[#d8be9b] text-[#3d270f]'
                : 'bg-purple-50 border-purple-200 text-purple-950'
            }`}
          >
            <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
              <span
                className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                  isSepia ? 'bg-[#9a5e28]' : 'bg-purple-600'
                }`}
              />
              <span className="font-semibold text-[11px] truncate">
                Selected: &ldquo;{activeSelection.text}&rdquo;
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                isDark
                  ? 'bg-purple-900/60 text-purple-300'
                  : isSepia
                  ? 'bg-[#ebd5b8] text-[#543513]'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {activeSelection.wordCount} {activeSelection.wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>
        ) : (
          <div
            className={`p-2 border rounded-lg flex items-center justify-between text-xs ${
              isDark
                ? 'bg-[#252525] border-neutral-700/60 text-neutral-300'
                : isSepia
                ? 'bg-[#fbf8ee] border-[#ded3be] text-[#4a3928]'
                : 'bg-white border-slate-200/80 text-slate-600'
            }`}
          >
            <div className="flex items-center space-x-1.5 truncate">
              <FileText
                size={12}
                className={isSepia ? 'text-[#7c4a1e]' : 'text-slate-500'}
              />
              <span className="text-[11px] truncate">
                Document Scope: <span className="font-semibold">{docWordCount} words</span>
              </span>
            </div>
            <span
              className={`text-[10px] italic ${
                isSepia ? 'text-[#8a7b68]' : 'text-slate-400'
              }`}
            >
              Highlight text to target
            </span>
          </div>
        )}
      </div>

      {/* 4. Messages Scroll Area */}
      <div
        className={`flex-1 overflow-y-auto p-3.5 space-y-3 text-xs ${
          isDark
            ? 'bg-[#1a1a1a] text-neutral-300'
            : isSepia
            ? 'bg-[#f8f3e7] text-[#2c231c]'
            : 'bg-[#fafbfe] text-slate-700'
        }`}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const hasTargetSelection = Boolean(m.targetSelectionText);

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[94%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap break-words ${
                  isUser
                    ? isSepia
                      ? 'bg-[#8c5324] text-[#fffdf9] rounded-br-xs'
                      : 'bg-[#7c3aed] text-white rounded-br-xs'
                    : isDark
                    ? 'bg-[#262626] border border-[#383838] text-neutral-100 rounded-tl-xs'
                    : isSepia
                    ? 'bg-[#fbf8ee] border border-[#ded3be] text-[#2c231c] rounded-tl-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs'
                }`}
              >
                {m.text}
              </div>

              {/* Action buttons & document integration */}
              <div className="flex items-center space-x-2 mt-1 px-1">
                <span className="text-[10px] opacity-60">{m.timestamp}</span>

                {!isUser && m.id !== 'welcome' && (
                  <div
                    className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md border ${
                      isDark
                        ? 'bg-[#2a2a2a] border-neutral-700/60'
                        : isSepia
                        ? 'bg-[#eee5d3] border-[#d8cdb8] text-[#4a3928]'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {/* Replace Original Selection */}
                    {hasTargetSelection && (
                      <button
                        onClick={() => handleInsertIntoDoc(m.text, m.id, true)}
                        title="Replace highlighted selection in document"
                        className={`flex items-center space-x-1 text-[10px] font-semibold px-1 py-0.5 rounded transition-colors cursor-pointer ${
                          isSepia
                            ? 'text-[#7c4a1e] hover:bg-[#e4d8c2]'
                            : 'text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                        }`}
                      >
                        {insertedId === m.id ? (
                          <>
                            <Check size={11} className="text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Replaced!</span>
                          </>
                        ) : (
                          <>
                            <Replace size={11} />
                            <span>Replace</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Insert into Document at Cursor */}
                    <button
                      onClick={() => handleInsertIntoDoc(m.text, m.id, false)}
                      title="Insert into document at cursor"
                      className={`flex items-center space-x-1 text-[10px] px-1 py-0.5 rounded transition-colors cursor-pointer ${
                        isSepia
                          ? 'text-[#4a3928] hover:text-[#7c4a1e] hover:bg-[#fbf8ee]'
                          : 'text-slate-600 dark:text-neutral-300 hover:text-[#7c3aed] dark:hover:text-purple-400 hover:bg-white dark:hover:bg-[#333]'
                      }`}
                    >
                      {insertedId === m.id && !hasTargetSelection ? (
                        <>
                          <Check size={11} className="text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Inserted!</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine size={11} />
                          <span>Insert</span>
                        </>
                      )}
                    </button>

                    {/* Copy to Clipboard */}
                    <button
                      onClick={() => handleCopy(m.text, m.id)}
                      title="Copy to clipboard"
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isSepia
                          ? 'text-[#5c4a36] hover:text-[#7c4a1e] hover:bg-[#fbf8ee]'
                          : 'text-slate-500 dark:text-neutral-400 hover:text-[#7c3aed] dark:hover:text-purple-400 hover:bg-white dark:hover:bg-[#333]'
                      }`}
                    >
                      {copiedId === m.id ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div
            className={`flex items-center space-x-2 p-2.5 rounded-lg border animate-pulse ${
              isDark
                ? 'bg-purple-950/30 border-purple-800 text-purple-300'
                : isSepia
                ? 'bg-[#f0e7d5] border-[#cfbe9e] text-[#7c4a1e]'
                : 'bg-purple-50/70 border-purple-100 text-[#7c3aed]'
            }`}
          >
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs font-medium">Gemini AI is thinking...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 5. Quick Actions Grid & Continue Writing */}
      <div
        className={`p-3 border-t space-y-2 shrink-0 ${
          isDark
            ? 'border-[#333] bg-[#1f1f1f]'
            : isSepia
            ? 'border-[#ded3be] bg-[#f5eedc]'
            : 'border-slate-200/90 bg-white'
        }`}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {/* 1. Summarize */}
          <button
            onClick={handleSummarize}
            disabled={loading}
            title={activeSelection ? 'Summarize selected text' : 'Summarize entire document'}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
              isDark
                ? 'border-blue-900 text-blue-300 bg-blue-950/30 hover:bg-blue-900/40'
                : isSepia
                ? 'border-[#c8b79d] text-[#1e3a6a] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                : 'border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100'
            }`}
          >
            <BookOpen size={13} className="shrink-0" />
            <span className="truncate">{activeSelection ? 'Summarize Sel.' : 'Summarize'}</span>
          </button>

          {/* 2. Improve Writing */}
          <button
            onClick={handleImproveWriting}
            disabled={loading}
            title={activeSelection ? 'Enhance clarity & flow of selection' : 'Enhance document writing'}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
              isDark
                ? 'border-purple-900 text-purple-300 bg-purple-950/30 hover:bg-purple-900/40'
                : isSepia
                ? 'border-[#c8b79d] text-[#5b247a] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                : 'border-purple-200 text-purple-700 bg-purple-50/70 hover:bg-purple-100'
            }`}
          >
            <Wand2 size={13} className="shrink-0" />
            <span className="truncate">Improve Flow</span>
          </button>

          {/* 3. Fix Grammar */}
          <button
            onClick={handleFixGrammar}
            disabled={loading}
            title={activeSelection ? 'Fix grammar & spelling in selection' : 'Fix document grammar'}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
              isDark
                ? 'border-emerald-900 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40'
                : isSepia
                ? 'border-[#c8b79d] text-[#1c5539] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                : 'border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
            }`}
          >
            <CheckCheck size={13} className="shrink-0" />
            <span className="truncate">Spell &amp; Grammar</span>
          </button>

          {/* 4. Continue Writing */}
          <button
            onClick={handleContinueWriting}
            disabled={loading}
            title="Continue writing seamlessly from the current cursor position"
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
              isDark
                ? 'border-violet-900 text-violet-300 bg-violet-950/30 hover:bg-violet-900/40'
                : isSepia
                ? 'border-[#c8b79d] text-[#6d3020] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                : 'border-violet-200 text-violet-700 bg-violet-50/70 hover:bg-violet-100'
            }`}
          >
            <PenLine size={13} className="shrink-0" />
            <span className="truncate">Continue Text</span>
          </button>

          {/* 5. Make Shorter */}
          <button
            onClick={handleMakeShorter}
            disabled={loading}
            title="Condense into concise, punchy phrasing"
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
              isDark
                ? 'border-amber-900 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40'
                : isSepia
                ? 'border-[#c8b79d] text-[#6d4215] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                : 'border-amber-200 text-amber-800 bg-amber-50/70 hover:bg-amber-100'
            }`}
          >
            <Minimize2 size={13} className="shrink-0" />
            <span className="truncate">Make Shorter</span>
          </button>

          {/* 6. Translate */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              disabled={loading}
              title="Translate into another language"
              className={`w-full flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-lg border transition-colors text-[11px] font-semibold cursor-pointer shadow-2xs ${
                isDark
                  ? 'border-rose-900 text-rose-300 bg-rose-950/30 hover:bg-rose-900/40'
                  : isSepia
                  ? 'border-[#c8b79d] text-[#7a2538] bg-[#f0e7d5] hover:bg-[#e7dcbe]'
                  : 'border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100'
              }`}
            >
              <Languages size={13} className="shrink-0" />
              <span className="truncate">{targetLang}</span>
              <ChevronDown size={10} className="shrink-0 opacity-70" />
            </button>

            {showLangDropdown && (
              <div
                className={`absolute bottom-full mb-1 right-0 w-32 border rounded-lg shadow-xl py-1 z-50 animate-in fade-in ${
                  isDark
                    ? 'bg-[#282828] border-neutral-700 text-neutral-200'
                    : isSepia
                    ? 'bg-[#fbf8ee] border-[#ded3be] text-[#2c231c]'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setTargetLang(lang);
                      handleTranslate(lang);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                      isSepia
                        ? 'hover:bg-[#ebdcc8] hover:text-[#7a2538]'
                        : 'hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Bottom Prompt Input */}
        <form onSubmit={handleCustomSubmit} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder={
              activeSelection
                ? `Ask AI about selected text (${activeSelection.wordCount} words)...`
                : 'Ask AI anything about the document...'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className={`flex-1 px-3 py-2 border rounded-lg text-xs transition-colors focus:outline-none focus:ring-1 ${
              isDark
                ? 'bg-[#282828] border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:ring-[#7c3aed] focus:border-[#7c3aed]'
                : isSepia
                ? 'bg-[#fbf8ee] border-[#cfc2aa] text-[#2c231c] placeholder-[#8a7b68] focus:ring-[#8c5324] focus:border-[#8c5324]'
                : 'bg-[#f8fafc] border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:bg-white focus:ring-[#7c3aed] focus:border-[#7c3aed]'
            }`}
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs text-white ${
              isSepia
                ? 'bg-[#8c5324] hover:bg-[#724119]'
                : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
            }`}
            title="Send prompt"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
};
