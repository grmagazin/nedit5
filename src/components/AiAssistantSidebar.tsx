import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
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
  ShieldCheck,
  ArrowRight,
  Undo2,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  REWRITE_TONES,
  RewriteTone,
  generateSafeRewrite,
  countWords,
  RewriteResult,
} from '../utils/aiRewriteService';

export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

interface AiAssistantSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  themeMode?: ThemeMode;
  initialIntent?: 'grammar' | 'improve' | 'summarize' | 'rewrite' | null;
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
  // Navigation Tabs: 'chat' (Co-Pilot Chat) | 'rewrite' (AI Document & Tone Rewrite)
  const [activeTab, setActiveTab] = useState<'chat' | 'rewrite'>(() => {
    return initialIntent === 'rewrite' ? 'rewrite' : 'chat';
  });

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

  // AI Rewrite & Tone Workstation State
  const [rewriteTone, setRewriteTone] = useState<RewriteTone>('safe_optimize');
  const [rewriteScope, setRewriteScope] = useState<'auto' | 'selection' | 'document'>('auto');
  const [rewriteCustomInstruction, setRewriteCustomInstruction] = useState('');
  const [rewriteOutput, setRewriteOutput] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResultMeta, setRewriteResultMeta] = useState<RewriteResult | null>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [showSourceSnippet, setShowSourceSnippet] = useState(false);
  const [hasAppliedRewrite, setHasAppliedRewrite] = useState(false);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  // Exact theme breakdown: 2 Light Modes (Standard Light & Sepia Warm Mode), 2 Dark Modes
  const isSepia = themeMode === 'sepia';
  const isDark = themeMode === 'fullDark' || themeMode === 'canvasDark';

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
      text: "Hi! I'm your AI writing assistant. Select text in your document to enhance, summarize, or fix grammar, or switch to the 'AI Rewrite & Tone' tab for full document and selection optimization.",
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

  // Handle Intent Changes from Ribbon Toolbar
  const lastProcessedTriggerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!initialIntent) return;
    if (triggerTimestamp && triggerTimestamp === lastProcessedTriggerRef.current) return;
    lastProcessedTriggerRef.current = triggerTimestamp;

    if (initialIntent === 'rewrite') {
      setActiveTab('rewrite');
      return;
    }

    if (initialIntent === 'grammar') {
      setActiveTab('chat');
      const timer = setTimeout(() => {
        handleFixGrammar();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialIntent, triggerTimestamp]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

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
        text: "Hi! I'm your AI writing assistant. Select text in your document to enhance, summarize, or fix grammar, or use the 'AI Rewrite & Tone' tab for safe optimization.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Determine current contextual text for Chat Tab
  const getContextText = (): { text: string; isSelection: boolean } => {
    if (!editor) return { text: '', isSelection: false };

    if (activeSelection && activeSelection.text) {
      return { text: activeSelection.text, isSelection: true };
    }

    if (lastValidSelectionRef.current?.text) {
      return { text: lastValidSelectionRef.current.text, isSelection: true };
    }

    const { from, to } = editor.state.selection;
    if (from !== to) {
      const sel = editor.state.doc.textBetween(from, to, ' ').trim();
      if (sel) {
        return { text: sel, isSelection: true };
      }
    }

    const all = editor.getText();
    return { text: all.slice(0, 10000), isSelection: false };
  };

  // Targeted Source Text determination for the Rewrite & Tone Workstation
  const getRewriteSourceText = (): { text: string; isSelection: boolean; wordCount: number } => {
    if (!editor) return { text: '', isSelection: false, wordCount: 0 };

    const hasSelection = Boolean(activeSelection?.text || lastValidSelectionRef.current?.text);

    if (rewriteScope === 'selection' || (rewriteScope === 'auto' && hasSelection)) {
      const selText = activeSelection?.text || lastValidSelectionRef.current?.text || '';
      if (selText) {
        return {
          text: selText,
          isSelection: true,
          wordCount: countWords(selText),
        };
      }
    }

    const fullDoc = editor.getText();
    return {
      text: fullDoc,
      isSelection: false,
      wordCount: countWords(fullDoc),
    };
  };

  const executeAiCall = async (
    systemInstruction: string,
    userPrompt: string,
    actionLabel?: string,
    selectionSnapshot?: string
  ) => {
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
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemInstruction,
          apiKey: apiKey || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 400 && data.error?.includes('API key')) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Failed to generate response from Gemini API');
      }

      const responseText = data.text || 'No response generated.';

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

  // Quick Actions (Chat Tab)
  const handleSummarize = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction =
      'You are an executive document assistant. Summarize the following text clearly and concisely with key bullet points and high-impact takeaways:';
    executeAiCall(instruction, text, isSelection ? 'Summarize selection' : 'Summarize document', isSelection ? text : undefined);
  };

  const handleImproveWriting = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      alert('Please write or select some text in the document first.');
      return;
    }
    const instruction =
      'You are a professional editor. Rewrite and enhance the following text to improve flow, vocabulary, clarity, and tone while strictly preserving meaning. Return the improved version directly:';
    executeAiCall(instruction, text, isSelection ? 'Improve selection flow' : 'Improve document writing', isSelection ? text : undefined);
  };

  const handleFixGrammar = () => {
    const { text, isSelection } = getContextText();
    if (!text) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: 'Please write or select some text in the document first to check spelling and grammar.',
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

  // Smart Insert for Chat tab
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

  // --- REWRITE & TONE WORKSTATION ACTIONS ---
  const handleExecuteRewrite = async () => {
    const { text, isSelection } = getRewriteSourceText();
    if (!text || !text.trim()) {
      setRewriteError('No document text found. Please write or select text in your document.');
      return;
    }

    setRewriteLoading(true);
    setRewriteError(null);
    setHasAppliedRewrite(false);

    try {
      const result = await generateSafeRewrite(text, {
        tone: rewriteTone,
        customInstruction: rewriteCustomInstruction.trim() || undefined,
        scope: isSelection ? 'selection' : 'document',
        apiKey: apiKey || undefined,
      });

      setRewriteOutput(result.text);
      setRewriteResultMeta(result);
    } catch (err: any) {
      setRewriteError(err?.message || 'Optimization failed. Please try again.');
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleApplyRewrite = (mode: 'replace' | 'insert_below') => {
    if (!editor || !rewriteOutput.trim()) return;

    const { isSelection } = getRewriteSourceText();
    const savedSel = lastValidSelectionRef.current;

    if (mode === 'replace') {
      if (isSelection && savedSel && savedSel.from !== savedSel.to) {
        try {
          const docSize = editor.state.doc.content.size;
          const safeFrom = Math.min(savedSel.from, docSize);
          const safeTo = Math.min(savedSel.to, docSize);
          editor
            .chain()
            .focus()
            .setTextSelection({ from: safeFrom, to: safeTo })
            .deleteSelection()
            .insertContent(rewriteOutput)
            .run();
          setHasAppliedRewrite(true);
          return;
        } catch {
          // fallback
        }
      }

      if (!isSelection) {
        editor.chain().focus().setContent(rewriteOutput).run();
      } else {
        editor.chain().focus().insertContent(rewriteOutput).run();
      }
      setHasAppliedRewrite(true);
    } else {
      // Insert Below
      if (isSelection && savedSel && savedSel.from !== savedSel.to) {
        const docSize = editor.state.doc.content.size;
        const insertPos = Math.min(savedSel.to, docSize);
        editor
          .chain()
          .focus()
          .setTextSelection({ from: insertPos, to: insertPos })
          .insertContent(`\n\n${rewriteOutput}`)
          .run();
      } else {
        editor.chain().focus().insertContent(`\n\n${rewriteOutput}`).run();
      }
      setHasAppliedRewrite(true);
    }
  };

  const handleUndoRewrite = () => {
    if (editor) {
      editor.commands.undo();
      setHasAppliedRewrite(false);
    }
  };

  const handleCopyRewrite = () => {
    if (!rewriteOutput) return;
    navigator.clipboard.writeText(rewriteOutput);
    setCopiedRewrite(true);
    setTimeout(() => setCopiedRewrite(false), 2000);
  };

  const languages = ['Greek', 'English', 'German', 'French', 'Spanish', 'Italian'];
  const docWordCount = editor ? countWords(editor.getText()) : 0;
  const currentSource = getRewriteSourceText();

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
          {activeTab === 'chat' && (
            <button
              onClick={handleClearChat}
              title="Clear Chat History"
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close AI Assistant"
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Top Tab Switcher: Chat & Co-Pilot vs. AI Rewrite & Tone */}
      <div
        className={`flex items-center px-2 pt-1 border-b shrink-0 text-xs font-medium gap-1 ${
          isDark
            ? 'bg-[#222] border-[#333]'
            : isSepia
            ? 'bg-[#ebdcb9]/70 border-[#ded3be]'
            : 'bg-slate-100/90 border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t cursor-pointer transition-all border-b-2 ${
            activeTab === 'chat'
              ? isSepia
                ? 'border-[#7c4a1e] text-[#7c4a1e] bg-[#f5eedc] font-semibold'
                : 'border-[#7c3aed] text-[#7c3aed] dark:text-purple-400 bg-white dark:bg-[#1c1c1c] font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <MessageSquare size={13} className="text-purple-500" />
          <span>Chat &amp; Co-Pilot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewrite')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t cursor-pointer transition-all border-b-2 relative ${
            activeTab === 'rewrite'
              ? isSepia
                ? 'border-[#7c4a1e] text-[#7c4a1e] bg-[#f5eedc] font-semibold'
                : 'border-[#7c3aed] text-[#7c3aed] dark:text-purple-400 bg-white dark:bg-[#1c1c1c] font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Wand2 size={13} className="text-[#9333ea]" />
          <span>AI Rewrite &amp; Tone</span>
          {activeSelection && (
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5"
              title="Active selection ready to optimize"
            />
          )}
        </button>
      </div>

      {/* 3. API Key Status Bar */}
      <div
        className={`px-3.5 py-1.5 border-b text-xs flex items-center justify-between ${
          isDark
            ? 'bg-[#252525] border-[#333] text-neutral-300'
            : isSepia
            ? 'bg-[#ece3d0] border-[#ded3be] text-[#3d2e1e]'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          <Key
            size={12}
            className={
              apiKey
                ? isSepia
                  ? 'text-[#2b6d49]'
                  : 'text-emerald-600 dark:text-emerald-400'
                : isSepia
                ? 'text-[#a16207]'
                : 'text-emerald-500'
            }
          />
          <span className="text-[11px] font-medium truncate">
            {apiKey ? (
              <>
                Custom Key: <span className="font-mono opacity-70">••••{apiKey.slice(-4)}</span>
              </>
            ) : (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Gemini 3.8 Flash</span> (Auto-Integrated)
              </>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`text-[10px] font-semibold cursor-pointer px-1.5 py-0.5 rounded transition-colors ${
              isSepia
                ? 'text-[#7c4a1e] hover:bg-[#ded3be]'
                : 'text-[#6d28d9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            {apiKey ? (showKeyInput ? 'Hide' : 'Change') : (showKeyInput ? 'Close' : 'Custom Key')}
          </button>
          {apiKey && (
            <button
              onClick={handleClearApiKey}
              title="Remove Stored API Key (Use Built-in Key)"
              className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Custom API Key Input */}
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
            <span className="font-semibold text-[11px]">Optional Gemini API Key:</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className={`text-[10px] hover:underline flex items-center space-x-0.5 font-medium ${
                isSepia ? 'text-[#7c4a1e]' : 'text-[#6d28d9] dark:text-purple-400'
              }`}
            >
              <span>Get free key</span>
              <ExternalLink size={9} />
            </a>
          </div>
          <div className="flex space-x-1.5">
            <input
              type="password"
              placeholder="AIzaSy... (leave blank to use built-in key)"
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
                isSepia ? 'bg-[#7c4a1e] hover:bg-[#603814]' : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
              }`}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: AI REWRITE & TONE WORKSTATION */}
      {/* ========================================================================= */}
      {activeTab === 'rewrite' && (
        <div
          className={`flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs ${
            isDark
              ? 'bg-[#181818] text-neutral-300'
              : isSepia
              ? 'bg-[#f8f3e7] text-[#2c231c]'
              : 'bg-[#fafbfe] text-slate-700'
          }`}
        >
          {/* Target Cooperation Scope Banner */}
          <div
            className={`p-2.5 rounded-xl border space-y-2 ${
              isDark
                ? 'bg-[#222] border-neutral-700'
                : isSepia
                ? 'bg-[#f0e7d5] border-[#dcd0bd]'
                : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-500">
                Cooperation Target
              </span>

              {/* Scope Toggles */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRewriteScope('selection')}
                  disabled={!activeSelection && !lastValidSelectionRef.current}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    (rewriteScope === 'selection' || (rewriteScope === 'auto' && Boolean(activeSelection)))
                      ? 'bg-[#9333ea] text-white shadow-xs'
                      : 'bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 disabled:opacity-40'
                  }`}
                  title={activeSelection ? 'Target current selected text' : 'No text currently selected'}
                >
                  Selected Text {activeSelection ? `(${activeSelection.wordCount}w)` : ''}
                </button>

                <button
                  type="button"
                  onClick={() => setRewriteScope('document')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    rewriteScope === 'document' || (!activeSelection && !lastValidSelectionRef.current && rewriteScope === 'auto')
                      ? 'bg-[#9333ea] text-white shadow-xs'
                      : 'bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Target full document text"
                >
                  Whole Doc ({docWordCount}w)
                </button>
              </div>
            </div>

            {/* Target Status details */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <div className="flex items-center gap-1.5 truncate">
                {currentSource.isSelection ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Selection Active: {currentSource.wordCount} words
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <FileText size={12} />
                    Entire Document: {currentSource.wordCount} words
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSourceSnippet(!showSourceSnippet)}
                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer font-medium"
              >
                {showSourceSnippet ? 'Hide Source' : 'View Source'}
              </button>
            </div>

            {/* Source Snippet Preview */}
            {showSourceSnippet && (
              <div
                className={`p-2 rounded border text-[11px] font-mono leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap select-text animate-in fade-in duration-100 ${
                  isDark
                    ? 'bg-[#1a1a1a] border-neutral-700 text-neutral-300'
                    : isSepia
                    ? 'bg-[#faf6ee] border-[#dfd4c1] text-[#33261a]'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {currentSource.text.slice(0, 400)}
                {currentSource.text.length > 400 ? '...' : ''}
              </div>
            )}
          </div>

          {/* Tone & Objective Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[11px] uppercase tracking-wider text-neutral-500">
                Rewrite Objective &amp; Tone
              </label>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                Safe Optimization Engine
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {REWRITE_TONES.map((t) => {
                const isSelected = rewriteTone === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRewriteTone(t.id)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? isSepia
                          ? 'border-[#7c4a1e] bg-[#ebd5b8] text-[#3d270f] font-semibold ring-1 ring-[#7c4a1e]'
                          : 'border-[#9333ea] bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-semibold ring-1 ring-[#9333ea]'
                        : isDark
                        ? 'border-neutral-700/70 bg-[#222] hover:bg-[#282828] text-neutral-300'
                        : isSepia
                        ? 'border-[#dfd4c1] bg-[#fbf8ee] hover:bg-[#f0e7d5] text-[#3d2e1e]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold">{t.label}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-[#9333ea] text-white'
                            : isDark
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {t.badge}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-75 leading-tight font-normal line-clamp-2">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Custom Guidance / Instruction */}
          <div className="space-y-1">
            <label className="font-bold text-[11px] uppercase tracking-wider text-neutral-500">
              Custom Guidance (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on active verbs, keep bullet structure..."
              value={rewriteCustomInstruction}
              onChange={(e) => setRewriteCustomInstruction(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 ${
                isDark
                  ? 'bg-[#222] border-neutral-700 text-neutral-100 focus:ring-purple-600'
                  : isSepia
                  ? 'bg-[#fbf8ee] border-[#dfd4c1] text-[#2c231c] focus:ring-[#7c4a1e]'
                  : 'bg-white border-slate-300 text-slate-800 focus:ring-purple-600'
              }`}
            />
          </div>

          {/* Execute Button */}
          <button
            type="button"
            onClick={handleExecuteRewrite}
            disabled={rewriteLoading || currentSource.wordCount === 0}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSepia
                ? 'bg-[#7c4a1e] hover:bg-[#603814] active:scale-[0.99]'
                : 'bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] active:scale-[0.99]'
            }`}
          >
            {rewriteLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating Safe Rewrite...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} className="text-yellow-300" />
                <span>
                  Safe Optimize &amp; Rewrite {currentSource.isSelection ? 'Selection' : 'Document'}
                </span>
              </>
            )}
          </button>

          {/* Error Notice */}
          {rewriteError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              ⚠️ {rewriteError}
            </div>
          )}

          {/* Results Station */}
          {rewriteOutput && (
            <div
              className={`p-3 rounded-xl border space-y-2.5 animate-in fade-in zoom-in-98 duration-150 ${
                isDark
                  ? 'bg-[#222] border-neutral-700'
                  : isSepia
                  ? 'bg-[#f0e7d5] border-[#dcd0bd]'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Stats Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-inherit">
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Optimized Preview</span>
                </div>

                {rewriteResultMeta && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="font-semibold text-neutral-500">
                      {rewriteResultMeta.originalWordCount}w → {rewriteResultMeta.newWordCount}w
                    </span>
                    {rewriteResultMeta.reductionPercent !== 0 && (
                      <span
                        className={`font-bold px-1 py-0.2 rounded ${
                          rewriteResultMeta.reductionPercent > 0
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {rewriteResultMeta.reductionPercent > 0 ? `-${rewriteResultMeta.reductionPercent}%` : `+${Math.abs(rewriteResultMeta.reductionPercent)}%`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Editable Output Textarea */}
              <textarea
                rows={6}
                value={rewriteOutput}
                onChange={(e) => setRewriteOutput(e.target.value)}
                placeholder="Optimized text will appear here..."
                className={`w-full p-2.5 rounded-lg border text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 font-sans ${
                  isDark
                    ? 'bg-[#181818] border-neutral-700 text-neutral-100 focus:ring-purple-600'
                    : isSepia
                    ? 'bg-[#fbf8ee] border-[#dfd4c1] text-[#2c231c] focus:ring-[#7c4a1e]'
                    : 'bg-slate-50/60 border-slate-300 text-slate-900 focus:ring-purple-600'
                }`}
              />

              {/* Engine badge */}
              {rewriteResultMeta && (
                <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                  <span>{rewriteResultMeta.notes}</span>
                  <button
                    type="button"
                    onClick={handleCopyRewrite}
                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedRewrite ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedRewrite ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons: Replace, Insert Below, Undo */}
              <div className="pt-1 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyRewrite('replace')}
                  className={`w-full py-2 px-3 rounded-lg font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                    isSepia
                      ? 'bg-[#2b6d49] hover:bg-[#205237]'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  title="Replace original content in document with full undo support"
                >
                  <Replace size={13} />
                  <span>
                    Replace in Document ({currentSource.isSelection ? 'Selection' : 'Whole Doc'})
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyRewrite('insert_below')}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isDark
                        ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        : isSepia
                        ? 'border-[#dfd4c1] bg-[#fbf8ee] hover:bg-[#e7dcbe] text-[#3d2e1e]'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Insert below original to compare side-by-side"
                  >
                    <ArrowDownToLine size={12} />
                    <span>Insert Below</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUndoRewrite}
                    disabled={!hasAppliedRewrite}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark
                        ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-amber-300'
                        : isSepia
                        ? 'border-[#dfd4c1] bg-[#fbf8ee] hover:bg-[#e7dcbe] text-amber-800'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-amber-700'
                    }`}
                    title="Undo the last applied rewrite in document"
                  >
                    <Undo2 size={12} />
                    <span>Undo Rewrite</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHAT & CO-PILOT WORKSTATION */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <>
          {/* Live Document Context Banner */}
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

          {/* Messages Scroll Area */}
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

                    {!isUser && (
                      <div className="flex items-center space-x-1.5 ml-1">
                        <button
                          onClick={() => handleCopy(m.text, m.id)}
                          title="Copy response"
                          className="text-[11px] opacity-70 hover:opacity-100 hover:text-purple-600 dark:hover:text-purple-400 flex items-center space-x-0.5 cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={11} className="text-emerald-500" />
                              <span className="text-[10px] text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleInsertIntoDoc(m.text, m.id, false)}
                          title="Insert at cursor position"
                          className="text-[11px] opacity-70 hover:opacity-100 hover:text-purple-600 dark:hover:text-purple-400 flex items-center space-x-0.5 cursor-pointer"
                        >
                          {insertedId === m.id ? (
                            <>
                              <Check size={11} className="text-emerald-500" />
                              <span className="text-[10px] text-emerald-500">Inserted</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownToLine size={11} />
                              <span className="text-[10px]">Insert</span>
                            </>
                          )}
                        </button>

                        {hasTargetSelection && (
                          <button
                            onClick={() => handleInsertIntoDoc(m.text, m.id, true)}
                            title="Replace the targeted selection with this response"
                            className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-0.5 font-medium cursor-pointer"
                          >
                            <Replace size={11} />
                            <span className="text-[10px]">Replace Sel.</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 text-neutral-400 text-xs py-2 px-1">
                <Loader2 size={14} className="animate-spin text-purple-600" />
                <span>Gemini is composing...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Actions Grid & Continue Writing */}
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

            {/* Bottom Prompt Input */}
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
        </>
      )}
    </aside>
  );
};

export default AiAssistantSidebar;
