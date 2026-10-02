import React, { useState, useMemo, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  X,
  Search,
  FileText,
  List,
  Layers,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Hash,
  Bookmark,
  Replace,
  Check,
} from 'lucide-react';
import { ThemeMode, PageSize, PageOrientation } from '../types';
import { calculateDocumentPages, DocumentPageInfo } from '../utils/pageCalculator';

interface NavigationPaneProps {
  editor: Editor | null;
  onClose: () => void;
  wordCount?: number;
  themeMode?: ThemeMode;
  pageSize?: PageSize;
  orientation?: PageOrientation;
  onPageCountChange?: (totalPages: number, activePage: number) => void;
}

export interface DocSearchMatch {
  id: string;
  from: number;
  to: number;
  text: string;
  beforeSnippet: string;
  matchText: string;
  afterSnippet: string;
}

export const NavigationPane: React.FC<NavigationPaneProps> = ({
  editor,
  onClose,
  wordCount = 0,
  themeMode = 'light',
  pageSize = 'a4',
  orientation = 'portrait',
  onPageCountChange,
}) => {
  const [activeTab, setActiveTab] = useState<'headings' | 'pages' | 'search'>('headings');
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [workspaceScrollTop, setWorkspaceScrollTop] = useState(0);

  // Monitor canvas workspace scroll position to keep active page highlighted in sync
  useEffect(() => {
    const workspace = document.getElementById('word-canvas-workspace');
    if (!workspace) return;

    const handleScroll = () => {
      setWorkspaceScrollTop(workspace.scrollTop);
    };

    workspace.addEventListener('scroll', handleScroll, { passive: true });
    return () => workspace.removeEventListener('scroll', handleScroll);
  }, []);

  // 4 Theme Modes Analysis
  const isFullDark = themeMode === 'fullDark';
  const isCanvasDark = themeMode === 'canvasDark';
  const isDark = isFullDark || isCanvasDark;
  const isSepia = themeMode === 'sepia';
  const isLight = !isDark && !isSepia;

  // Real multi-page calculation (detects explicit page breaks and natural page height overflow)
  const pages = useMemo(() => {
    return calculateDocumentPages(editor, pageSize, orientation, workspaceScrollTop);
  }, [editor?.state.doc, pageSize, orientation, workspaceScrollTop]);

  // Notify parent of total and active page counts if needed
  useEffect(() => {
    if (onPageCountChange) {
      const activeIdx = pages.findIndex((p) => p.isCurrent);
      const activePageNum = activeIdx !== -1 ? activeIdx + 1 : 1;
      onPageCountChange(pages.length, activePageNum);
    }
  }, [pages, onPageCountChange]);

  const handlePageClick = (page: DocumentPageInfo) => {
    const workspace = document.getElementById('word-canvas-workspace');
    if (workspace) {
      workspace.scrollTo({ top: Math.max(0, page.domTopPx - 20), behavior: 'smooth' });
    }
  };

  // Extract headings from editor content
  const headings = useMemo(() => {
    if (!editor) return [];
    const doc = editor.getJSON();
    const items: { text: string; level: number; pos: number }[] = [];

    let currentPos = 0;
    const traverse = (node: any) => {
      if (node.type === 'heading' && node.content) {
        const text = node.content.map((c: any) => c.text || '').join('');
        if (text.trim()) {
          items.push({
            text: text.trim(),
            level: node.attrs?.level || 1,
            pos: currentPos,
          });
        }
      }
      if (node.content) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    };

    if (doc.content) {
      traverse(doc);
    }
    return items;
  }, [editor?.state.doc]);

  // Rock-solid ProseMirror search algorithm with exact document node positions
  const searchResults: DocSearchMatch[] = useMemo(() => {
    if (!editor || !searchQuery.trim()) return [];
    const doc = editor.state.doc;
    const matches: DocSearchMatch[] = [];
    const target = matchCase ? searchQuery : searchQuery.toLowerCase();
    const qLen = searchQuery.length;

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

        const snippetStart = Math.max(0, matchStart - 18);
        const snippetEnd = Math.min(blockText.length, matchEnd + 22);
        const beforeSnippet = (snippetStart > 0 ? '...' : '') + blockText.slice(snippetStart, matchStart);
        const matchText = blockText.slice(matchStart, matchEnd);
        const afterSnippet = blockText.slice(matchEnd, snippetEnd) + (snippetEnd < blockText.length ? '...' : '');

        matches.push({
          id: `${from}-${to}-${matches.length}`,
          from,
          to,
          text: matchText,
          beforeSnippet,
          matchText,
          afterSnippet,
        });

        idx += Math.max(1, qLen);
        if (matches.length >= 200) return false;
      }
    });

    return matches;
  }, [editor?.state.doc, searchQuery, matchCase]);

  // Jump to match: focus, select, scroll into view and center in workspace
  const handleJumpToMatch = (match: DocSearchMatch, index?: number) => {
    if (!editor || !editor.view) return;

    if (typeof index === 'number') {
      setActiveMatchIndex(index);
    }

    // 1. Focus editor so selection is visible
    editor.commands.focus();

    // 2. Set exact selection
    editor.commands.setTextSelection({
      from: match.from,
      to: match.to,
    });

    // 3. TipTap internal scroll
    editor.commands.scrollIntoView();

    // 4. Smoothly scroll canvas workspace to center the target text
    requestAnimationFrame(() => {
      try {
        const coords = editor.view.coordsAtPos(match.from);
        const workspace = document.getElementById('word-canvas-workspace');
        if (workspace && coords) {
          const workspaceRect = workspace.getBoundingClientRect();
          const targetScroll = workspace.scrollTop + (coords.top - workspaceRect.top) - (workspace.clientHeight / 2);
          workspace.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth',
          });
        }
      } catch (err) {
        // fallback
      }
    });
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    handleJumpToMatch(searchResults[nextIdx], nextIdx);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    handleJumpToMatch(searchResults[prevIdx], prevIdx);
  };

  const handleReplaceCurrent = () => {
    if (!editor || searchResults.length === 0) return;
    const current = searchResults[activeMatchIndex] || searchResults[0];
    if (!current) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: current.from, to: current.to })
      .insertContent(replaceText)
      .run();

    setFeedbackMessage('Replaced 1 match');
    setTimeout(() => setFeedbackMessage(''), 2500);

    setTimeout(() => {
      if (searchResults.length > 1) {
        const nextIdx = Math.min(activeMatchIndex, searchResults.length - 2);
        if (searchResults[nextIdx]) {
          handleJumpToMatch(searchResults[nextIdx], nextIdx);
        }
      }
    }, 50);
  };

  const handleReplaceAll = () => {
    if (!editor || searchResults.length === 0) return;
    const count = searchResults.length;

    // Replace in reverse order so position indices don't shift!
    const sorted = [...searchResults].sort((a, b) => b.from - a.from);

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

    setFeedbackMessage(`Replaced ${count} ${count === 1 ? 'match' : 'matches'}`);
    setTimeout(() => setFeedbackMessage(''), 3000);
    setActiveMatchIndex(0);
  };

  const handleReplaceOne = (e: React.MouseEvent, match: DocSearchMatch) => {
    e.stopPropagation();
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replaceText)
      .run();

    setFeedbackMessage('Replaced');
    setTimeout(() => setFeedbackMessage(''), 2000);
  };

  const handleHeadingClick = (headingText: string) => {
    if (!editor) return;
    const doc = editor.state.doc;
    let foundPos = -1;
    doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.includes(headingText)) {
        foundPos = pos;
        return false;
      }
    });

    if (foundPos !== -1) {
      editor.commands.focus();
      editor.commands.setTextSelection(foundPos + 1);
      editor.commands.scrollIntoView();
      requestAnimationFrame(() => {
        try {
          const coords = editor.view.coordsAtPos(foundPos + 1);
          const workspace = document.getElementById('word-canvas-workspace');
          if (workspace && coords) {
            const workspaceRect = workspace.getBoundingClientRect();
            const targetScroll = workspace.scrollTop + (coords.top - workspaceRect.top) - (workspace.clientHeight / 2);
            workspace.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
          }
        } catch {}
      });
    }
  };

  // --- Dynamic Color Styles across the 4 Modes ---
  // Container & Header
  const containerClass = isFullDark
    ? 'bg-[#18181b] border-r border-[#27272a] text-[#f4f4f5]'
    : isCanvasDark
    ? 'bg-[#1e222b] border-r border-[#2d3340] text-[#e2e8f0]'
    : isSepia
    ? 'bg-[#fbf0d9] border-r border-[#e2d0a8] text-[#3e2c1c]'
    : 'bg-white border-r border-neutral-200 text-neutral-800';

  const headerClass = isFullDark
    ? 'bg-[#202023] border-b border-[#27272a]'
    : isCanvasDark
    ? 'bg-[#252b37] border-b border-[#2d3340]'
    : isSepia
    ? 'bg-[#f2e2be] border-b border-[#ddc696]'
    : 'bg-neutral-50/90 border-b border-neutral-200';

  const headerTitleClass = isFullDark
    ? 'text-[#fafafa]'
    : isCanvasDark
    ? 'text-[#f8fafc]'
    : isSepia
    ? 'text-[#3e2c1c]'
    : 'text-neutral-800';

  const closeBtnClass = isFullDark
    ? 'text-neutral-400 hover:text-white hover:bg-[#2e2e32]'
    : isCanvasDark
    ? 'text-slate-400 hover:text-white hover:bg-[#333b4b]'
    : isSepia
    ? 'text-[#8a7256] hover:text-[#3e2c1c] hover:bg-[#e8d5ae]'
    : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/70';

  // Tabs
  const tabBarClass = isFullDark
    ? 'bg-[#141416] border-b border-[#27272a]'
    : isCanvasDark
    ? 'bg-[#181b22] border-b border-[#2d3340]'
    : isSepia
    ? 'bg-[#ebd6a7] border-b border-[#ddc696]'
    : 'bg-neutral-100/70 border-b border-neutral-200';

  const getTabClass = (tab: 'headings' | 'pages' | 'search') => {
    const isActive = activeTab === tab;
    if (isActive) {
      if (isFullDark) return 'border-[#38bdf8] text-[#38bdf8] bg-[#18181b] font-semibold';
      if (isCanvasDark) return 'border-[#60a5fa] text-[#60a5fa] bg-[#1e222b] font-semibold';
      if (isSepia) return 'border-[#8c501c] text-[#8c501c] bg-[#fbf0d9] font-semibold';
      return 'border-[#185abd] text-[#185abd] bg-white font-semibold shadow-2xs';
    }
    // Inactive
    if (isFullDark) return 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#202023]';
    if (isCanvasDark) return 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#252b37]';
    if (isSepia) return 'border-transparent text-[#7d654a] hover:text-[#3e2c1c] hover:bg-[#f2e2be]';
    return 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100';
  };

  // Search input
  const searchInputClass = isFullDark
    ? 'bg-[#202023] border-[#3f3f46] text-[#f4f4f5] placeholder-neutral-500 focus:bg-[#18181b] focus:ring-1 focus:ring-[#38bdf8] focus:border-[#38bdf8]'
    : isCanvasDark
    ? 'bg-[#252b37] border-[#3b4354] text-[#f1f5f9] placeholder-slate-500 focus:bg-[#1e222b] focus:ring-1 focus:ring-[#60a5fa] focus:border-[#60a5fa]'
    : isSepia
    ? 'bg-[#f5e5c4] border-[#cfb684] text-[#3e2c1c] placeholder-[#9c8466] focus:bg-[#fbf0d9] focus:ring-1 focus:ring-[#8c501c] focus:border-[#8c501c]'
    : 'bg-neutral-50 border-neutral-300 text-neutral-800 placeholder-neutral-400 focus:bg-white focus:ring-1 focus:ring-[#185abd] focus:border-[#185abd]';

  // Heading item hover & text colors
  const getHeadingItemClass = (level: number) => {
    let base = 'w-full text-left py-1.5 px-2 rounded text-xs transition-colors cursor-pointer flex items-center group ';
    if (level === 1) {
      base += 'font-bold ';
    } else if (level === 2) {
      base += 'pl-4 font-medium ';
    } else {
      base += 'pl-7 text-[11px] ';
    }

    if (isFullDark) {
      base +=
        level === 1
          ? 'text-[#fafafa] hover:bg-[#27272a] hover:text-[#38bdf8]'
          : level === 2
          ? 'text-[#e4e4e7] hover:bg-[#27272a] hover:text-[#38bdf8]'
          : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#38bdf8]';
    } else if (isCanvasDark) {
      base +=
        level === 1
          ? 'text-[#f8fafc] hover:bg-[#28303e] hover:text-[#60a5fa]'
          : level === 2
          ? 'text-[#e2e8f0] hover:bg-[#28303e] hover:text-[#60a5fa]'
          : 'text-[#94a3b8] hover:bg-[#28303e] hover:text-[#60a5fa]';
    } else if (isSepia) {
      base +=
        level === 1
          ? 'text-[#352314] hover:bg-[#f0dfb8] hover:text-[#8c501c]'
          : level === 2
          ? 'text-[#4a3522] hover:bg-[#f0dfb8] hover:text-[#8c501c]'
          : 'text-[#7d654a] hover:bg-[#f0dfb8] hover:text-[#8c501c]';
    } else {
      base +=
        level === 1
          ? 'text-neutral-800 hover:bg-blue-50/80 hover:text-[#185abd]'
          : level === 2
          ? 'text-neutral-700 hover:bg-blue-50/80 hover:text-[#185abd]'
          : 'text-neutral-500 hover:bg-blue-50/80 hover:text-[#185abd]';
    }
    return base;
  };

  const chevronIconClass = isFullDark
    ? 'mr-1.5 text-neutral-500 group-hover:text-[#38bdf8] shrink-0'
    : isCanvasDark
    ? 'mr-1.5 text-slate-500 group-hover:text-[#60a5fa] shrink-0'
    : isSepia
    ? 'mr-1.5 text-[#a89274] group-hover:text-[#8c501c] shrink-0'
    : 'mr-1.5 text-neutral-400 group-hover:text-[#185abd] shrink-0';

  // Pages preview card
  const pagesCardClass = isFullDark
    ? 'border border-[#2e2e32] bg-[#202023] rounded p-3 flex items-center space-x-3 shadow-2xs'
    : isCanvasDark
    ? 'border border-[#2d3340] bg-[#252b37] rounded p-3 flex items-center space-x-3 shadow-2xs'
    : isSepia
    ? 'border border-[#ddc696] bg-[#f2e2be] rounded p-3 flex items-center space-x-3 shadow-2xs'
    : 'border border-neutral-200 bg-neutral-50 rounded p-3 flex items-center space-x-3 shadow-2xs';

  const thumbnailSheetClass = isFullDark
    ? 'w-12 h-16 bg-[#121214] border border-[#3f3f46] rounded shadow-xs flex flex-col items-center justify-center p-1 font-mono'
    : isCanvasDark
    ? 'w-12 h-16 bg-[#181b22] border border-[#3b4354] rounded shadow-xs flex flex-col items-center justify-center p-1 font-mono'
    : isSepia
    ? 'w-12 h-16 bg-[#fbf5e6] border border-[#cfb684] rounded shadow-xs flex flex-col items-center justify-center p-1 font-mono'
    : 'w-12 h-16 bg-white border border-neutral-300 rounded shadow-xs flex flex-col items-center justify-center p-1 font-mono';

  const thumbLine1Class = isFullDark
    ? 'bg-[#27272a]'
    : isCanvasDark
    ? 'bg-[#2d3340]'
    : isSepia
    ? 'bg-[#e6d3a8]'
    : 'bg-neutral-200';

  const thumbLine2Class = isFullDark
    ? 'bg-[#1e1e20]'
    : isCanvasDark
    ? 'bg-[#202530]'
    : isSepia
    ? 'bg-[#efe0be]'
    : 'bg-neutral-100';

  const pageTitleClass = isFullDark
    ? 'text-[#fafafa]'
    : isCanvasDark
    ? 'text-[#f8fafc]'
    : isSepia
    ? 'text-[#3e2c1c]'
    : 'text-neutral-800';

  const pageSubClass = isFullDark
    ? 'text-neutral-400'
    : isCanvasDark
    ? 'text-slate-400'
    : isSepia
    ? 'text-[#7d654a]'
    : 'text-neutral-500';

  const pageActiveTagClass = isFullDark || isCanvasDark
    ? 'text-emerald-400 font-medium'
    : isSepia
    ? 'text-[#8c501c] font-medium'
    : 'text-emerald-600 font-medium';

  // Search Results
  const searchResultCardClass = isFullDark
    ? 'w-full text-left p-2.5 rounded border border-[#27272a] hover:border-[#38bdf8] hover:bg-[#202023] transition-colors text-xs text-[#d4d4d8] cursor-pointer'
    : isCanvasDark
    ? 'w-full text-left p-2.5 rounded border border-[#2d3340] hover:border-[#60a5fa] hover:bg-[#252b37] transition-colors text-xs text-[#cbd5e1] cursor-pointer'
    : isSepia
    ? 'w-full text-left p-2.5 rounded border border-[#ddc696] hover:border-[#8c501c] hover:bg-[#f2e2be] transition-colors text-xs text-[#4a3522] cursor-pointer'
    : 'w-full text-left p-2.5 rounded border border-neutral-200 hover:border-[#185abd] hover:bg-blue-50/50 transition-colors text-xs text-neutral-700 cursor-pointer';

  // Empty state styles
  const emptyIconClass = isFullDark
    ? 'text-neutral-600'
    : isCanvasDark
    ? 'text-slate-600'
    : isSepia
    ? 'text-[#cfb684]'
    : 'text-neutral-300';

  const emptyTitleClass = isFullDark
    ? 'text-neutral-300'
    : isCanvasDark
    ? 'text-slate-300'
    : isSepia
    ? 'text-[#5c442c]'
    : 'text-neutral-600';

  const emptySubClass = isFullDark
    ? 'text-neutral-500'
    : isCanvasDark
    ? 'text-slate-500'
    : isSepia
    ? 'text-[#8a7256]'
    : 'text-neutral-400';

  // Bottom footer info bar
  const footerBarClass = isFullDark
    ? 'bg-[#141416] border-t border-[#27272a] text-neutral-400'
    : isCanvasDark
    ? 'bg-[#181b22] border-t border-[#2d3340] text-slate-400'
    : isSepia
    ? 'bg-[#ebd6a7] border-t border-[#ddc696] text-[#7d654a]'
    : 'bg-neutral-50 border-t border-neutral-200 text-neutral-500';

  const modeBadgeClass = isFullDark
    ? 'bg-[#27272a] text-[#38bdf8] border border-[#3f3f46]'
    : isCanvasDark
    ? 'bg-[#252b37] text-[#60a5fa] border border-[#3b4354]'
    : isSepia
    ? 'bg-[#f5e5c4] text-[#8c501c] border border-[#cfb684]'
    : 'bg-neutral-200/80 text-neutral-700 border border-neutral-300';

  return (
    <aside
      id="word-navigation-pane"
      className={`w-72 ${containerClass} flex flex-col h-full shadow-md z-20 shrink-0 select-none animate-in slide-in-from-left-2 duration-150`}
    >
      {/* 1. Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${headerClass}`}>
        <div className="flex items-center space-x-2">
          <List size={16} className={isDark ? 'text-sky-400' : isSepia ? 'text-[#8c501c]' : 'text-[#185abd]'} />
          <span className={`text-xs font-bold ${headerTitleClass} tracking-wide uppercase`}>Navigation</span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded cursor-pointer transition-colors ${closeBtnClass}`}
          title="Close Navigation Pane"
          aria-label="Close Navigation Pane"
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. Tabs */}
      <div className={`flex text-xs ${tabBarClass}`}>
        <button
          onClick={() => setActiveTab('headings')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center space-x-1 ${getTabClass(
            'headings'
          )}`}
        >
          <List size={13} />
          <span>Headings</span>
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center space-x-1 ${getTabClass(
            'pages'
          )}`}
        >
          <Layers size={13} />
          <span>Pages</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center space-x-1 ${getTabClass(
            'search'
          )}`}
        >
          <Search size={13} />
          <span>Results</span>
        </button>
      </div>

      {/* 3. Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* HEADINGS TAB */}
        {activeTab === 'headings' && (
          <div className="space-y-1">
            {headings.length === 0 ? (
              <div className="text-center py-8 text-xs">
                <Bookmark size={28} className={`mx-auto mb-2 ${emptyIconClass}`} />
                <p className={`font-semibold ${emptyTitleClass}`}>No Headings in Document</p>
                <p className={`text-[11px] mt-1 ${emptySubClass} max-w-[200px] mx-auto leading-normal`}>
                  Add Headings (Heading 1, 2, 3) to create a structured outline for quick jumping.
                </p>
              </div>
            ) : (
              headings.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleHeadingClick(h.text)}
                  className={getHeadingItemClass(h.level)}
                  title={`Jump to: ${h.text} (Level ${h.level})`}
                >
                  <ChevronRight size={12} className={chevronIconClass} />
                  <span className="truncate">{h.text}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* PAGES TAB */}
        {activeTab === 'pages' && (
          <div className="space-y-2.5">
            {pages.map((p) => (
              <div
                key={p.pageNumber}
                onClick={() => handlePageClick(p)}
                className={`${pagesCardClass} cursor-pointer hover:scale-[1.01] transition-transform ${
                  p.isCurrent
                    ? isDark
                      ? 'ring-2 ring-[#38bdf8] bg-[#27272a]'
                      : isSepia
                      ? 'ring-2 ring-[#8c501c] bg-[#f0dfb8]'
                      : 'ring-2 ring-[#185abd] bg-blue-50/60'
                    : ''
                }`}
                title={`Click to scroll to Page ${p.pageNumber}`}
              >
                <div className={thumbnailSheetClass}>
                  <div className={`w-full h-1.5 mb-1 rounded-xs ${thumbLine1Class}`} />
                  <div className={`w-full h-1 mb-0.5 rounded-xs ${thumbLine2Class}`} />
                  <div className={`w-full h-1 mb-0.5 rounded-xs ${thumbLine2Class}`} />
                  <div className={`w-3/4 h-1 self-start rounded-xs ${thumbLine2Class}`} />
                </div>
                <div className="text-xs flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${pageTitleClass}`}>Page {p.pageNumber}</span>
                    {p.hasExplicitBreak && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-medium border border-blue-500/20">
                        Page Break
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] ${pageSubClass} truncate mt-0.5`} title={p.snippet}>
                    {p.snippet || `${p.wordCount} words`}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className={pageSubClass}>{p.wordCount} {p.wordCount === 1 ? 'word' : 'words'}</span>
                    {p.isCurrent ? (
                      <span className={pageActiveTagClass}>● Active View</span>
                    ) : (
                      <span className={pageSubClass}>Click to jump</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH & REPLACE TAB */}
        {activeTab === 'search' && (
          <div className="space-y-2.5">
            {/* Find Search Input Box */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <Search
                  size={14}
                  className={`absolute left-2.5 ${
                    isDark ? 'text-neutral-500' : isSepia ? 'text-[#a89274]' : 'text-neutral-400'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveMatchIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        handlePrevMatch();
                      } else {
                        handleNextMatch();
                      }
                    }
                  }}
                  placeholder="Search in document..."
                  className={`w-full pl-8 pr-16 py-1.5 text-xs rounded transition-colors ${searchInputClass}`}
                  autoFocus
                />
                <div className="absolute right-1.5 flex items-center space-x-0.5">
                  {/* Match Case Button */}
                  <button
                    type="button"
                    onClick={() => setMatchCase(!matchCase)}
                    title={matchCase ? 'Match Case (Active)' : 'Match Case'}
                    className={`px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      matchCase
                        ? isDark
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-blue-100 text-[#185abd] border border-blue-200'
                        : isDark
                        ? 'text-neutral-400 hover:text-neutral-200'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    Aa
                  </button>
                  {/* Clear Button */}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActiveMatchIndex(0);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      title="Clear Search"
                    >
                      <X size={12} />
                    </button>
                  )}
                  {/* Replace Panel Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsReplaceOpen(!isReplaceOpen)}
                    title={isReplaceOpen ? 'Hide Replace' : 'Show Replace'}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      isReplaceOpen
                        ? isDark
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-blue-100 text-[#185abd]'
                        : isDark
                        ? 'text-neutral-400 hover:text-neutral-200'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <Replace size={13} />
                  </button>
                </div>
              </div>

              {/* Smart Replace Box (Collapsible / Expandable) */}
              {isReplaceOpen && (
                <div
                  className={`p-2 rounded border space-y-2 animate-in fade-in slide-in-from-top-1 duration-100 ${
                    isDark
                      ? 'bg-[#202023] border-[#2e2e32]'
                      : isSepia
                      ? 'bg-[#f7edd4] border-[#ddc696]'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="relative flex items-center">
                    <Replace
                      size={13}
                      className={`absolute left-2.5 ${
                        isDark ? 'text-neutral-500' : isSepia ? 'text-[#a89274]' : 'text-neutral-400'
                      }`}
                    />
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleReplaceCurrent();
                        }
                      }}
                      placeholder="Replace with..."
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded transition-colors ${searchInputClass}`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleReplaceCurrent}
                      disabled={searchResults.length === 0}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#2a2a2e] hover:bg-[#34343a] text-neutral-200'
                          : isSepia
                          ? 'bg-[#edd9af] hover:bg-[#e4cb9b] text-[#3e2c1c]'
                          : 'bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 shadow-2xs'
                      }`}
                      title="Replace current match and advance (Enter)"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleReplaceAll}
                      disabled={searchResults.length === 0}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDark
                          ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                          : isSepia
                          ? 'bg-[#8c501c] hover:bg-[#723f14] text-white'
                          : 'bg-[#185abd] hover:bg-[#114b9c] text-white shadow-2xs'
                      }`}
                      title="Replace all matches across document"
                    >
                      Replace All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Feedback Badge */}
            {feedbackMessage && (
              <div
                className={`px-2.5 py-1 rounded text-center text-[11px] font-semibold animate-in fade-in duration-100 flex items-center justify-center space-x-1 ${
                  isDark
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <Check size={12} strokeWidth={2.5} />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* Match Counter & Next/Prev Controls */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span
                  className={`font-medium ${
                    isDark ? 'text-neutral-400' : isSepia ? 'text-[#7d654a]' : 'text-neutral-500'
                  }`}
                >
                  {searchResults.length === 0 ? (
                    '0 matches'
                  ) : (
                    <>
                      Match{' '}
                      <strong className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                        {activeMatchIndex + 1}
                      </strong>{' '}
                      of{' '}
                      <strong className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                        {searchResults.length}
                      </strong>
                    </>
                  )}
                </span>
                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                      }`}
                      title="Previous match (Shift+Enter)"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-700'
                      }`}
                      title="Next match (Enter)"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Results Cards List */}
            <div className="space-y-1.5">
              {searchResults.length === 0 && searchQuery.trim() ? (
                <div className="text-center py-6 text-xs">
                  <Search size={24} className={`mx-auto mb-2 ${emptyIconClass}`} />
                  <p className={`font-medium ${emptyTitleClass}`}>No matches found</p>
                  <p className={`text-[11px] mt-1 ${emptySubClass}`}>
                    Try different keywords or check spelling.
                  </p>
                </div>
              ) : (
                searchResults.map((res, i) => {
                  const isActive = activeMatchIndex === i;
                  return (
                    <div
                      key={res.id}
                      onClick={() => handleJumpToMatch(res, i)}
                      className={`group w-full text-left p-2.5 rounded border transition-all text-xs cursor-pointer ${
                        isActive
                          ? isDark
                            ? 'border-sky-500 bg-sky-950/40 text-white shadow-2xs'
                            : isSepia
                            ? 'border-[#8c501c] bg-[#faebd0] text-[#3e2c1c] shadow-2xs'
                            : 'border-[#185abd] bg-blue-50/80 text-[#185abd] shadow-2xs'
                          : searchResultCardClass
                      }`}
                      title="Click to jump to match in document"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-bold ${
                            isActive
                              ? isDark
                                ? 'text-sky-400'
                                : isSepia
                                ? 'text-[#8c501c]'
                                : 'text-[#185abd]'
                              : 'text-neutral-400'
                          }`}
                        >
                          #{i + 1}
                        </span>
                        {isReplaceOpen && (
                          <button
                            type="button"
                            onClick={(e) => handleReplaceOne(e, res)}
                            className={`opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded font-medium transition-opacity cursor-pointer ${
                              isDark
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                                : 'bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 shadow-2xs'
                            }`}
                            title="Replace this match"
                          >
                            Replace
                          </button>
                        )}
                      </div>
                      <p className="line-clamp-2 leading-tight">
                        <span className="text-neutral-500">{res.beforeSnippet}</span>
                        <mark
                          className={`rounded-2xs px-0.5 font-bold ${
                            isActive
                              ? 'bg-amber-300 text-neutral-900 shadow-2xs'
                              : 'bg-amber-200/90 text-neutral-900'
                          }`}
                        >
                          {res.matchText}
                        </mark>
                        <span className="text-neutral-500">{res.afterSnippet}</span>
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Info Footer */}
      <div className={`px-3 py-1.5 flex items-center justify-between text-[11px] ${footerBarClass}`}>
        <span className="truncate">
          {pages.length} {pages.length === 1 ? 'page' : 'pages'} • {headings.length} {headings.length === 1 ? 'section' : 'sections'}
        </span>
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${modeBadgeClass}`}>
          {themeMode === 'canvasDark' ? 'Canvas Dark' : themeMode === 'fullDark' ? 'Full Dark' : themeMode === 'sepia' ? 'Sepia' : 'Light'}
        </span>
      </div>
    </aside>
  );
};
