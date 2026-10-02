import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Editor } from '@tiptap/react';
import {
  Smile,
  X,
  RefreshCw,
  Search,
  Clock,
} from 'lucide-react';
import { SymbolItem } from './symbols/SymbolsData';

// Lazy-loaded tab subcomponents
const ArrowsTab = React.lazy(() => import('./symbols/ArrowsTab'));
const MathTab = React.lazy(() => import('./symbols/MathTab'));
const CurrencyTab = React.lazy(() => import('./symbols/CurrencyTab'));
const LegalTab = React.lazy(() => import('./symbols/LegalTab'));
const GreekTab = React.lazy(() => import('./symbols/GreekTab'));
const EmojiTab = React.lazy(() => import('./symbols/EmojiTab'));

export type SymbolCategory = 'Arrows' | 'Math' | 'Currency' | 'Legal' | 'Greek' | 'Emoji';

interface SymbolsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (msg: string) => void;
  themeMode?: 'light' | 'canvasDark' | 'fullDark' | 'sepia';
}

const STORAGE_KEY_RECENT_SYMBOLS = 'wordpad_recent_symbols';

export const SymbolsPickerModal: React.FC<SymbolsPickerModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
  themeMode = 'light',
}) => {
  const isDark = themeMode === 'fullDark' || themeMode === 'canvasDark';

  const [activeTab, setActiveTab] = useState<SymbolCategory>('Math');
  const [hoveredSymbol, setHoveredSymbol] = useState<SymbolItem | null>({
    char: '≥',
    name: 'Greater-Than or Equal To',
    code: 'U+2265',
  });
  const [lastInsertedChar, setLastInsertedChar] = useState<string | null>('≥');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [recentSymbols, setRecentSymbols] = useState<SymbolItem[]>([]);
  const [keepOpen, setKeepOpen] = useState<boolean>(true);

  // Load recent symbols from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RECENT_SYMBOLS);
      if (stored) {
        setRecentSymbols(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load recent symbols from localStorage:', e);
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Insert symbol into document
  const handleSelectSymbol = useCallback(
    (item: SymbolItem) => {
      if (!editor) return;

      editor.chain().focus().insertContent(item.char).run();
      setLastInsertedChar(item.char);
      setHoveredSymbol(item);

      // Save to recent symbols (up to 10)
      try {
        const nextRecent = [item, ...recentSymbols.filter((s) => s.char !== item.char)].slice(0, 10);
        setRecentSymbols(nextRecent);
        localStorage.setItem(STORAGE_KEY_RECENT_SYMBOLS, JSON.stringify(nextRecent));
      } catch (e) {
        console.warn('Could not save recent symbol:', e);
      }

      if (onNotify) {
        onNotify(`Inserted '${item.char}' (${item.name})`);
      }

      if (!keepOpen) {
        onClose();
      }
    },
    [editor, recentSymbols, onNotify, keepOpen, onClose]
  );

  if (!isOpen) return null;

  const categories: SymbolCategory[] = ['Arrows', 'Math', 'Currency', 'Legal', 'Greek', 'Emoji'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      {/* Modal Card with Dark Mode support */}
      <div
        className={`rounded-2xl shadow-2xl border w-full max-w-[540px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#1e1e1e] border-neutral-700 text-neutral-100'
            : 'bg-white border-neutral-200/90 text-neutral-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 pt-5 pb-3.5 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-purple-950/50 border-purple-800 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-[#6366f1]'
              }`}
            >
              <Smile size={18} />
            </div>
            <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-neutral-100' : 'text-neutral-800'}`}>
              Special Characters &amp; Symbols
            </h2>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
            }`}
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Pills Row */}
        <div
          className={`px-6 py-2 border-t flex items-center justify-between flex-wrap gap-2 select-none ${
            isDark ? 'border-neutral-800 bg-[#222]' : 'border-neutral-100'
          }`}
        >
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            {categories.map((cat) => {
              const isActive = activeTab === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveTab(cat);
                    setFilterQuery('');
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-[#185abd] text-white shadow-2xs font-bold'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-32 sm:w-36">
            <Search size={12} className="absolute left-2.5 top-2 text-neutral-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search..."
              className={`w-full pl-7 pr-2 py-1 text-[11px] border rounded-full focus:outline-none focus:ring-1 ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-neutral-50/60 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:ring-[#185abd]'
              }`}
            />
          </div>
        </div>

        {/* Lazy Loaded Category Tabs Body */}
        <div
          className={`px-6 py-4 min-h-[185px] max-h-[300px] overflow-y-auto ${
            isDark ? 'bg-[#181818]' : 'bg-white'
          }`}
        >
          <Suspense
            fallback={
              <div className="h-36 flex flex-col items-center justify-center space-y-2 text-neutral-400 text-xs">
                <RefreshCw size={18} className="animate-spin text-[#185abd]" />
                <span>Loading {activeTab} symbols...</span>
              </div>
            }
          >
            {activeTab === 'Arrows' && (
              <ArrowsTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
            {activeTab === 'Math' && (
              <MathTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
            {activeTab === 'Currency' && (
              <CurrencyTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
            {activeTab === 'Legal' && (
              <LegalTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
            {activeTab === 'Greek' && (
              <GreekTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
            {activeTab === 'Emoji' && (
              <EmojiTab
                onSelect={handleSelectSymbol}
                onHover={setHoveredSymbol}
                selectedChar={lastInsertedChar}
                filterQuery={filterQuery}
                isDark={isDark}
              />
            )}
          </Suspense>
        </div>

        {/* Recently Used Symbols Row */}
        {recentSymbols.length > 0 && (
          <div
            className={`px-6 py-2 border-t flex items-center space-x-2 text-xs select-none ${
              isDark ? 'bg-[#222] border-neutral-800' : 'bg-neutral-50/80 border-neutral-100'
            }`}
          >
            <span className="text-[11px] text-neutral-400 flex items-center shrink-0">
              <Clock size={12} className="mr-1" />
              Recent:
            </span>
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
              {recentSymbols.map((item) => (
                <button
                  key={'recent-' + item.char}
                  onClick={() => handleSelectSymbol(item)}
                  onMouseEnter={() => setHoveredSymbol(item)}
                  onFocus={() => setHoveredSymbol(item)}
                  title={`${item.name} (${item.code || ''})`}
                  className={`w-6 h-6 rounded flex items-center justify-center font-medium cursor-pointer transition-colors shrink-0 text-xs ${
                    isDark
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-200 hover:border-blue-500 hover:bg-neutral-700 hover:text-blue-300'
                      : 'bg-white border border-neutral-200 hover:border-[#185abd] hover:bg-blue-50 text-neutral-800'
                  }`}
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Status / Details Bar (Rock-Solid fixed height, no dancing or layout shifting) */}
        <div
          className={`h-14 min-h-[56px] px-6 py-2.5 border-t flex items-center justify-between text-xs select-none ${
            isDark
              ? 'bg-[#202020] border-neutral-800 text-neutral-300'
              : 'bg-neutral-50 border-neutral-100 text-neutral-600'
          }`}
        >
          {/* Symbol Details (Stable width, never pops out) */}
          <div className="flex items-center space-x-2 truncate">
            {hoveredSymbol ? (
              <>
                <span
                  className={`w-7 h-7 rounded flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 ${
                    isDark
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-100'
                      : 'bg-white border border-neutral-300 text-neutral-900'
                  }`}
                >
                  {hoveredSymbol.char}
                </span>
                <span className={`font-semibold truncate max-w-[210px] sm:max-w-xs ${isDark ? 'text-neutral-100' : 'text-neutral-800'}`}>
                  {hoveredSymbol.name}
                </span>
                {hoveredSymbol.code && (
                  <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                    {hoveredSymbol.code}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[11px] text-neutral-400 italic">
                Select any symbol to insert into document
              </span>
            )}
          </div>

          {/* Options & Action */}
          <div className="flex items-center space-x-3 shrink-0">
            <label className="flex items-center space-x-1.5 text-[11px] text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
                className={`rounded ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-800 text-blue-500 focus:ring-blue-500'
                    : 'border-neutral-300 text-[#185abd] focus:ring-[#185abd]'
                }`}
              />
              <span>Keep open</span>
            </label>

            {/* Permanent Insert Button (Never vanishes, prevents UI jumping) */}
            <button
              type="button"
              disabled={!hoveredSymbol}
              onClick={() => {
                if (hoveredSymbol) handleSelectSymbol(hoveredSymbol);
              }}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-all shadow-2xs ${
                hoveredSymbol
                  ? isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-95'
                    : 'bg-[#185abd] hover:bg-[#114b9c] text-white cursor-pointer active:scale-95'
                  : 'opacity-40 cursor-not-allowed bg-neutral-400 text-white'
              }`}
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymbolsPickerModal;
