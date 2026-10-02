import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Search, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Subscript, 
  Superscript, 
  Eraser, 
  Heading1, 
  Heading2, 
  Heading3, 
  Pilcrow, 
  Quote, 
  Code, 
  List, 
  ListOrdered, 
  CheckSquare, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  ArrowUpDown, 
  Highlighter, 
  Table, 
  Minus, 
  FileText, 
  Link, 
  Image, 
  PenTool, 
  Moon, 
  Sun, 
  Square, 
  Palette, 
  Columns, 
  Sliders, 
  Trash2, 
  Sparkles, 
  BarChart3, 
  SpellCheck, 
  Languages, 
  MessageSquare, 
  FileCheck, 
  Mic, 
  Volume2, 
  Eye, 
  BookOpen, 
  Globe, 
  Maximize2, 
  Layers, 
  Save, 
  Printer, 
  Download, 
  Plus,
  CornerDownLeft,
  Command as CommandIcon,
  Check
} from 'lucide-react';
import { DocumentSettings } from '../types';
import { BackstageTab } from './FileBackstage';
import { SEARCH_COMMANDS, SearchCommand, CommandContext } from './searchCommands';

interface SearchCommandBarProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage?: (tab?: BackstageTab) => void;
  onOpenFindReplace?: () => void;
  onOpenStats?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onOpenThemes?: () => void;
  onToggleComments?: () => void;
  onSelectTab?: (tab: any) => void;
  isDarkHeader: boolean;
  isSepiaHeader: boolean;
}

export const SearchCommandBar: React.FC<SearchCommandBarProps> = ({
  editor,
  settings,
  onUpdateSettings,
  onOpenBackstage,
  onOpenFindReplace,
  onOpenStats,
  onSave,
  onPrint,
  onOpenThemes,
  onToggleComments,
  onSelectTab,
  isDarkHeader,
  isSepiaHeader,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (msg: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackMessage(msg);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage(null);
    }, 2800);
  };

  const commandContext: CommandContext = useMemo(() => ({
    editor,
    settings,
    onUpdateSettings,
    onOpenBackstage,
    onOpenFindReplace,
    onOpenStats,
    onSave,
    onPrint,
    onOpenThemes,
    onToggleComments,
    onSelectTab,
    notify: showNotification,
  }), [
    editor,
    settings,
    onUpdateSettings,
    onOpenBackstage,
    onOpenFindReplace,
    onOpenStats,
    onSave,
    onPrint,
    onOpenThemes,
    onToggleComments,
    onSelectTab,
  ]);

  // Global shortcut: Alt+Q (Word Tell Me) or Ctrl+K (Universal Command Palette)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'q') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Outside click listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter commands
  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Default recommended / top commands when empty
      const recommendedIds = [
        'theme-full-dark',
        'theme-canvas-dark',
        'theme-light',
        'theme-sepia',
        'insert-table-3x3',
        'tool-ai-assistant',
        'tool-find-replace',
        'file-save',
        'file-print',
        'tool-word-count',
        'view-focus-zen',
        'file-export-docx',
      ];
      return SEARCH_COMMANDS.filter((c) => recommendedIds.includes(c.id));
    }

    return SEARCH_COMMANDS.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(q)) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      if (cmd.category.toLowerCase().includes(q)) return true;
      return cmd.keywords.some((k) => k.toLowerCase().includes(q));
    }).sort((a, b) => {
      // Prioritize exact or prefix matches in label
      const aExact = a.label.toLowerCase().startsWith(q);
      const bExact = b.label.toLowerCase().startsWith(q);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    }).slice(0, 16);
  }, [searchQuery]);

  // Keep selection index bounded
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const executeCommand = (cmd: SearchCommand) => {
    cmd.action(commandContext);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  const renderIcon = (type: string) => {
    const size = 15;
    switch (type) {
      case 'bold': return <Bold size={size} />;
      case 'italic': return <Italic size={size} />;
      case 'underline': return <Underline size={size} />;
      case 'strikethrough': return <Strikethrough size={size} />;
      case 'subscript': return <Subscript size={size} />;
      case 'superscript': return <Superscript size={size} />;
      case 'eraser': return <Eraser size={size} />;
      case 'heading1': return <Heading1 size={size} />;
      case 'heading2': return <Heading2 size={size} />;
      case 'heading3': return <Heading3 size={size} />;
      case 'pilcrow': return <Pilcrow size={size} />;
      case 'quote': return <Quote size={size} />;
      case 'code': return <Code size={size} />;
      case 'list': return <List size={size} />;
      case 'listOrdered': return <ListOrdered size={size} />;
      case 'checkSquare': return <CheckSquare size={size} />;
      case 'alignLeft': return <AlignLeft size={size} />;
      case 'alignCenter': return <AlignCenter size={size} />;
      case 'alignRight': return <AlignRight size={size} />;
      case 'alignJustify': return <AlignJustify size={size} />;
      case 'arrowUpDown': return <ArrowUpDown size={size} />;
      case 'highlighter': return <Highlighter size={size} />;
      case 'table': return <Table size={size} />;
      case 'minus': return <Minus size={size} />;
      case 'fileText': return <FileText size={size} />;
      case 'link': return <Link size={size} />;
      case 'image': return <Image size={size} />;
      case 'penTool': return <PenTool size={size} />;
      case 'moon': return <Moon size={size} />;
      case 'sun': return <Sun size={size} />;
      case 'square': return <Square size={size} />;
      case 'palette': return <Palette size={size} />;
      case 'columns': return <Columns size={size} />;
      case 'sliders': return <Sliders size={size} />;
      case 'trash': return <Trash2 size={size} />;
      case 'sparkles': return <Sparkles size={size} />;
      case 'barChart3': return <BarChart3 size={size} />;
      case 'spellCheck': return <SpellCheck size={size} />;
      case 'languages': return <Languages size={size} />;
      case 'messageSquare': return <MessageSquare size={size} />;
      case 'fileCheck': return <FileCheck size={size} />;
      case 'mic': return <Mic size={size} />;
      case 'volume2': return <Volume2 size={size} />;
      case 'eye': return <Eye size={size} />;
      case 'bookOpen': return <BookOpen size={size} />;
      case 'globe': return <Globe size={size} />;
      case 'maximize2': return <Maximize2 size={size} />;
      case 'layers': return <Layers size={size} />;
      case 'save': return <Save size={size} />;
      case 'printer': return <Printer size={size} />;
      case 'download': return <Download size={size} />;
      case 'plus': return <Plus size={size} />;
      default: return <CommandIcon size={size} />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Themes':
        return isDarkHeader
          ? 'bg-purple-900/40 text-purple-300 border-purple-800'
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Review & AI':
        return isDarkHeader
          ? 'bg-indigo-900/40 text-indigo-300 border-indigo-800'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Insert':
        return isDarkHeader
          ? 'bg-amber-900/40 text-amber-300 border-amber-800'
          : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Layout':
        return isDarkHeader
          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Export & File':
        return isDarkHeader
          ? 'bg-rose-900/40 text-rose-300 border-rose-800'
          : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'View':
        return isDarkHeader
          ? 'bg-cyan-900/40 text-cyan-300 border-cyan-800'
          : 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Paragraph':
        return isDarkHeader
          ? 'bg-teal-900/40 text-teal-300 border-teal-800'
          : 'bg-teal-50 text-teal-700 border-teal-200';
      default: // Formatting
        return isDarkHeader
          ? 'bg-blue-900/40 text-blue-300 border-blue-800'
          : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="relative hidden md:block w-72 lg:w-96" ref={containerRef}>
      {/* Toast execution notification */}
      {feedbackMessage && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-medium shadow-lg animate-in fade-in slide-in-from-top-1 bg-[#0078d4] text-white flex items-center space-x-1.5 pointer-events-none">
          <Check size={12} className="text-white shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Input Box */}
      <div
        className={`flex items-center rounded-md px-2.5 py-1 text-xs transition-all border ${
          isDarkHeader
            ? 'bg-[#282828] border-[#383838] text-white focus-within:border-[#0078d4] focus-within:ring-1 focus-within:ring-[#0078d4]'
            : isSepiaHeader
            ? 'bg-[#f4ebd9] border-[#d8cdba] text-[#2c231c] focus-within:border-[#92400e] focus-within:bg-[#fcf8f0]'
            : 'bg-white/15 hover:bg-white/25 focus-within:bg-white focus-within:text-neutral-900 border-transparent text-white'
        }`}
      >
        <Search size={14} className="opacity-70 mr-2 shrink-0 text-inherit" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Tell me what you want to do (Alt+Q)..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent focus:outline-none text-xs text-inherit placeholder:opacity-75 ${
            isDarkHeader
              ? 'placeholder:text-neutral-400'
              : isSepiaHeader
              ? 'placeholder:text-[#8a7561]'
              : 'placeholder:text-blue-100 focus-within:placeholder:text-neutral-400'
          }`}
        />

        {searchQuery ? (
          <button
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded hover:opacity-100 opacity-60 transition-opacity ml-1 cursor-pointer"
            title="Clear search"
          >
            <X size={13} />
          </button>
        ) : (
          <span className="text-[10px] font-mono opacity-50 ml-1 shrink-0 hidden lg:inline">
            Alt+Q
          </span>
        )}
      </div>

      {/* Commands Dropdown Results */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 w-full rounded-lg shadow-2xl z-50 text-xs overflow-hidden border animate-in fade-in zoom-in-98 duration-100 ${
            isDarkHeader
              ? 'bg-[#202020] text-neutral-100 border-[#383838]'
              : isSepiaHeader
              ? 'bg-[#fcf8f0] text-[#2c231c] border-[#d8cdba]'
              : 'bg-white text-neutral-800 border-neutral-200'
          }`}
        >
          {/* Header Label */}
          <div
            className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase flex items-center justify-between border-b ${
              isDarkHeader
                ? 'bg-[#181818] text-neutral-400 border-[#303030]'
                : isSepiaHeader
                ? 'bg-[#f0e7d5] text-[#8a7561] border-[#e2d5c1]'
                : 'bg-neutral-50 text-neutral-500 border-neutral-100'
            }`}
          >
            <span>{searchQuery.trim() ? `Search Results (${filteredCommands.length})` : 'Popular & Recommended Commands'}</span>
            <span className="font-normal lowercase text-[9px] opacity-75">esc to exit</span>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto py-1 divide-y divide-transparent" ref={listRef}>
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="font-medium text-xs mb-1">No matching commands found</p>
                <p className={`text-[11px] ${isDarkHeader ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Try searching for <span className="font-semibold underline">table</span>, <span className="font-semibold underline">dark</span>, <span className="font-semibold underline">bold</span>, or <span className="font-semibold underline">pdf</span>
                </p>
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const activeItemClass = isSelected
                  ? isDarkHeader
                    ? 'bg-[#1e3a5f] text-white border-l-3 border-[#0078d4]'
                    : isSepiaHeader
                    ? 'bg-[#ede5d5] text-[#2c231c] border-l-3 border-[#92400e]'
                    : 'bg-blue-50 text-neutral-900 border-l-3 border-[#185abd]'
                  : isDarkHeader
                  ? 'hover:bg-[#2a2a2a] text-neutral-200 border-l-3 border-transparent'
                  : isSepiaHeader
                  ? 'hover:bg-[#f4ecd8] text-[#2c231c] border-l-3 border-transparent'
                  : 'hover:bg-neutral-50 text-neutral-700 border-l-3 border-transparent';

                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${activeItemClass}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div
                        className={`p-1.5 rounded shrink-0 ${
                          isSelected
                            ? isDarkHeader
                              ? 'bg-[#0078d4] text-white'
                              : 'bg-[#185abd] text-white'
                            : isDarkHeader
                            ? 'bg-[#2a2a2a] text-neutral-300'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {renderIcon(cmd.iconType)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-xs leading-snug flex items-center space-x-1.5">
                          <span className="truncate">{cmd.label}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full border shrink-0 ${getCategoryBadgeClass(
                              cmd.category
                            )}`}
                          >
                            {cmd.category}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] truncate leading-tight ${
                            isSelected
                              ? isDarkHeader
                                ? 'text-blue-200'
                                : 'text-blue-600'
                              : isDarkHeader
                              ? 'text-neutral-400'
                              : 'text-neutral-400'
                          }`}
                        >
                          {cmd.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {cmd.shortcut && (
                        <kbd
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                            isDarkHeader
                              ? 'bg-[#2c2c2c] border-[#404040] text-neutral-300'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-500'
                          }`}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <CornerDownLeft size={12} className={isDarkHeader ? 'text-blue-300 ml-1' : 'text-blue-600 ml-1'} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div
            className={`px-3 py-1 text-[10px] flex items-center justify-between border-t ${
              isDarkHeader
                ? 'bg-[#181818] text-neutral-400 border-[#303030]'
                : isSepiaHeader
                ? 'bg-[#f0e7d5] text-[#8a7561] border-[#e2d5c1]'
                : 'bg-neutral-50 text-neutral-400 border-neutral-100'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span><kbd className="font-mono bg-black/10 px-1 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono bg-black/10 px-1 rounded">↵</kbd> execute</span>
            </div>
            <span><kbd className="font-mono bg-black/10 px-1 rounded">Alt+Q</kbd> to focus anytime</span>
          </div>
        </div>
      )}
    </div>
  );
};
