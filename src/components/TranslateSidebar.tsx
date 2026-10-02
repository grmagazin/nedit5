import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Languages,
  X,
  Copy,
  Check,
  ArrowDownToLine,
  Loader2,
} from 'lucide-react';

interface TranslateSidebarProps {
  editor: Editor | null;
  onClose: () => void;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文 (简体)' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
];

/**
 * Free translation engine using Google Translate (gtx) with fallback to MyMemory API.
 * Requires 0 API keys and works directly via browser CORS.
 */
async function translateText(text: string, targetCode: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  // For long texts, split into paragraph chunks (~1200 chars each) to stay well within query limits
  const chunks: string[] = [];
  const paragraphs = text.split('\n');
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n' + para).length > 1200 && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + para : para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      translatedChunks.push('');
      continue;
    }

    try {
      // Primary: Google Translate GTX endpoint
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetCode
      )}&dt=t&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(gtxUrl);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const joined = data[0].map((item: any) => item[0] || '').join('');
          translatedChunks.push(joined);
          continue;
        }
      }
    } catch {
      // ignore and try fallback
    }

    // Fallback: MyMemory Free API
    try {
      const myMemUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        chunk
      )}&langpair=autodetect|${encodeURIComponent(targetCode)}`;
      const fallbackRes = await fetch(myMemUrl);
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        if (fbData.responseData?.translatedText) {
          translatedChunks.push(fbData.responseData.translatedText);
          continue;
        }
      }
    } catch {
      // ignore
    }

    // If both failed, keep original chunk
    translatedChunks.push(chunk);
  }

  return translatedChunks.join('\n');
}

export const TranslateSidebar: React.FC<TranslateSidebarProps> = ({
  editor,
  onClose,
}) => {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(
    SUPPORTED_LANGUAGES[0] // Default: Ελληνικά
  );
  const [mode, setMode] = useState<'selection' | 'allDoc'>('selection');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);
  const [inserted, setInserted] = useState(false);

  // Debounce ref for live translation on original text edits
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read active text from editor based on selected mode
  const syncFromEditor = useCallback(
    (currentMode: 'selection' | 'allDoc') => {
      if (!editor) return;

      if (currentMode === 'selection') {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const selText = editor.state.doc.textBetween(from, to, ' ');
          if (selText.trim()) {
            setOriginalText(selText.trim());
            return;
          }
        }
        // If nothing selected, fallback to paragraph at cursor or first 500 chars
        const all = editor.getText();
        setOriginalText(all.slice(0, 1000));
      } else {
        // All Document
        const all = editor.getText();
        setOriginalText(all);
      }
    },
    [editor]
  );

  // Initial load
  useEffect(() => {
    syncFromEditor(mode);
  }, [mode, syncFromEditor]);

  // Listen to editor selection changes when in 'selection' mode
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      if (mode === 'selection') {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const sel = editor.state.doc.textBetween(from, to, ' ');
          if (sel.trim() && sel.trim() !== originalText) {
            setOriginalText(sel.trim());
          }
        }
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, mode, originalText]);

  // Execute translation whenever originalText or selectedLang changes
  useEffect(() => {
    if (!originalText.trim()) {
      setTranslatedText('');
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await translateText(originalText, selectedLang.code);
        setTranslatedText(result);
      } catch (err) {
        console.error('Translation error:', err);
        setTranslatedText('Translation failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [originalText, selectedLang.code]);

  // Action 1: Replace Selection / Document
  const handleReplace = () => {
    if (!editor || !translatedText.trim()) return;

    if (mode === 'selection') {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteSelection().insertContent(translatedText).run();
      } else {
        editor.chain().focus().insertContent(translatedText).run();
      }
    } else {
      // Replace whole document content
      editor.chain().focus().setContent(`<p>${translatedText.replace(/\n/g, '</p><p>')}</p>`).run();
    }

    setReplaced(true);
    setTimeout(() => setReplaced(false), 2000);
  };

  // Action 2: Insert at End
  const handleInsertAtEnd = () => {
    if (!editor || !translatedText.trim()) return;

    const docSize = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(docSize, `<p><br></p><p>${translatedText.replace(/\n/g, '</p><p>')}</p>`)
      .run();

    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  // Action 3: Copy
  const handleCopy = () => {
    if (!translatedText.trim()) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Action 4: Clear
  const handleClear = () => {
    setOriginalText('');
    setTranslatedText('');
  };

  return (
    <aside
      className="w-84 sm:w-88 bg-white border-l border-[#e2e8f0] flex flex-col h-full shadow-xl z-30 select-none animate-in slide-in-from-right duration-200"
      aria-label="Translate Toolbar"
    >
      {/* 1. Header (Matches photo: 文A icon + Translate + X) */}
      <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center space-x-2">
          <Languages size={18} className="text-[#1e2f7b]" />
          <h2 className="font-bold text-[15px] text-slate-900 tracking-tight">Translate</h2>
        </div>

        <button
          onClick={onClose}
          title="Close Translate"
          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
        {/* 2. Target Language Selector: "To: [ Ελληνικά ⌄ ]" */}
        <div className="flex items-center space-x-2.5">
          <label htmlFor="translate-target-lang" className="text-sm font-medium text-slate-600 shrink-0">
            To:
          </label>
          <div className="relative flex-1">
            <select
              id="translate-target-lang"
              value={selectedLang.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setSelectedLang(found);
              }}
              className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e2f7b]/20 focus:border-[#1e2f7b] cursor-pointer appearance-none pr-8 transition-colors font-medium shadow-2xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Mode Toggle: [ Selection ] [ All Doc ] (Matches photo) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setMode('selection');
              syncFromEditor('selection');
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'selection'
                ? 'bg-[#1e2b6e] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Languages size={15} />
            <span>Selection</span>
          </button>

          <button
            onClick={() => {
              setMode('allDoc');
              syncFromEditor('allDoc');
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'allDoc'
                ? 'bg-[#1e2b6e] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Languages size={15} />
            <span>All Doc</span>
          </button>
        </div>

        {/* 4. Original Section (Matches photo) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Original</span>
            <button
              onClick={() => syncFromEditor(mode)}
              title="Resync text from active document selection"
              className="text-[11px] text-[#1e2b6e] hover:underline cursor-pointer"
            >
              Sync from doc
            </button>
          </div>

          <div className="relative rounded-lg border border-slate-200 bg-white shadow-2xs focus-within:ring-1 focus-within:ring-[#1e2b6e] focus-within:border-[#1e2b6e]">
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Select text in document or type here..."
              rows={5}
              className="w-full p-3 text-xs leading-relaxed text-slate-800 placeholder-slate-400 bg-transparent resize-y focus:outline-none rounded-lg"
            />
            {/* Faint translate icon watermark in corner */}
            <div className="absolute top-2.5 right-2.5 text-slate-300 pointer-events-none opacity-60">
              <Languages size={15} />
            </div>
          </div>
        </div>

        {/* 5. Translated Section: "→ Ελληνικά" (Matches photo) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              → {selectedLang.nativeName}
            </span>
            {loading && (
              <span className="text-[11px] text-[#1e2b6e] flex items-center space-x-1">
                <Loader2 size={12} className="animate-spin" />
                <span>Translating...</span>
              </span>
            )}
          </div>

          <div className="relative rounded-lg border border-slate-200 bg-[#f8fafc] shadow-2xs min-h-[120px]">
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder={loading ? 'Translating content...' : 'Translation will appear here...'}
              rows={5}
              className="w-full p-3 text-xs leading-relaxed text-slate-800 placeholder-slate-400 bg-transparent resize-y focus:outline-none rounded-lg font-normal"
            />
          </div>
        </div>
      </div>

      {/* 6. Action Buttons at bottom (Matches photo) */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2.5 shrink-0">
        {/* Primary Action Button: "Replace Selection" */}
        <button
          onClick={handleReplace}
          disabled={!translatedText.trim()}
          className="w-full py-2.5 px-4 bg-[#1e2b6e] hover:bg-[#162052] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
        >
          {replaced ? (
            <>
              <Check size={14} className="text-emerald-300" />
              <span>Replaced!</span>
            </>
          ) : (
            <span>{mode === 'selection' ? 'Replace Selection' : 'Replace Document'}</span>
          )}
        </button>

        {/* Secondary Buttons: [ Insert at End ] [ Copy ] */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleInsertAtEnd}
            disabled={!translatedText.trim()}
            className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            {inserted ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span>Inserted!</span>
              </>
            ) : (
              <>
                <ArrowDownToLine size={14} className="text-slate-600" />
                <span>Insert at End</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            disabled={!translatedText.trim()}
            className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} className="text-slate-600" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Clear link at bottom */}
        <div className="text-center pt-1">
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>
    </aside>
  );
};
