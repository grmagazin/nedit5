/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import { TextSelection } from '@tiptap/pm/state';

import {
  FontSize,
  FontFamily,
  LineHeight,
  LetterSpacing,
  TextEffects,
  ParagraphFormatting,
  CustomHorizontalRule,
  CustomTable,
  CustomTableCell,
  CustomTableHeader,
  CustomDiv,
} from './extensions/customExtensions';
import { MathInline, MathBlock } from './extensions/mathExtension';
import {
  CopiedWordFormat,
  copyFormatFromEditor,
  applyFormatToEditor,
  describeFormat,
} from './utils/formatPainter';
import { initialDocumentContent } from './utils/initialContent';
import { RibbonTab, DocumentSettings, DocumentStats, DocumentComment } from './types';

import { RibbonHeader } from './components/RibbonHeader';
import { RibbonToolbar } from './components/RibbonToolbar';
import { DocumentCanvas } from './components/DocumentCanvas';
import { StatusBar } from './components/StatusBar';
import { TableContextMenu } from './components/TableContextMenu';
import { AutoCorrectIndicator } from './components/AutoCorrectIndicator';
import {
  isAutoCorrectEnabled,
  setAutoCorrectEnabledStorage,
  scanCompletedParagraph,
  scanCompletedSentence,
  applyAutoCorrection,
  applyAllAutoCorrections,
  AutoCorrectionItem,
} from './utils/AutoCorrect';
import type { BackstageTab } from './components/FileBackstage';
import { Maximize2 } from 'lucide-react';

const FindReplaceModal = React.lazy(() =>
  import('./components/FindReplaceModal').then((m) => ({ default: m.FindReplaceModal }))
);
const DocumentStatsModal = React.lazy(() =>
  import('./components/DocumentStatsModal').then((m) => ({ default: m.DocumentStatsModal }))
);
const FileBackstage = React.lazy(() =>
  import('./components/FileBackstage').then((m) => ({ default: m.FileBackstage }))
);
const NavigationPane = React.lazy(() =>
  import('./components/NavigationPane').then((m) => ({ default: m.NavigationPane }))
);
const SeoCheckSidebar = React.lazy(() =>
  import('./components/SeoCheckSidebar').then((m) => ({ default: m.SeoCheckSidebar }))
);
const TableEditSidebar = React.lazy(() =>
  import('./components/TableEditSidebar').then((m) => ({ default: m.TableEditSidebar }))
);
const BorderEditSidebar = React.lazy(() =>
  import('./components/BorderEditSidebar').then((m) => ({ default: m.BorderEditSidebar }))
);
const ImageWizardSidebar = React.lazy(() =>
  import('./components/ImageWizardSidebar').then((m) => ({ default: m.ImageWizardSidebar }))
);
const QuickBlocksSidebar = React.lazy(() =>
  import('./components/QuickBlocksSidebar').then((m) => ({ default: m.QuickBlocksSidebar }))
);
const FormatterSidebar = React.lazy(() =>
  import('./components/FormatterSidebar').then((m) => ({ default: m.FormatterSidebar }))
);
const AiAssistantSidebar = React.lazy(() =>
  import('./components/AiAssistantSidebar').then((m) => ({ default: m.AiAssistantSidebar }))
);
const HyperLinkSidebar = React.lazy(() =>
  import('./components/HyperLinkSidebar').then((m) => ({ default: m.HyperLinkSidebar }))
);

const VoiceCommandSidebar = React.lazy(() =>
  import('./components/VoiceCommandSidebar').then((m) => ({ default: m.VoiceCommandSidebar }))
);
const SpellCheckSidebar = React.lazy(() =>
  import('./components/SpellCheckSidebar').then((m) => ({ default: m.SpellCheckSidebar }))
);
const TranslateSidebar = React.lazy(() =>
  import('./components/TranslateSidebar').then((m) => ({ default: m.TranslateSidebar }))
);

const SidebarLoadingFallback = () => (
  <div className="w-84 sm:w-88 flex-shrink-0 bg-white dark:bg-neutral-800 border-l border-slate-200 dark:border-neutral-700 flex items-center justify-center p-8 text-xs text-slate-400 dark:text-neutral-400">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

const NavPaneLoadingFallback = () => (
  <div className="w-64 flex-shrink-0 bg-white dark:bg-neutral-800 border-r border-slate-200 dark:border-neutral-700 flex items-center justify-center p-8 text-xs text-slate-400 dark:text-neutral-400">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

const BackstageLoadingFallback = () => (
  <div className="fixed inset-0 z-50 bg-[#185abd] flex items-center justify-center text-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium tracking-wide">Loading File Menu...</span>
    </div>
  </div>
);

const STORAGE_KEY_CONTENT = 'wordpad_document_content';
const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [showBackstage, setShowBackstage] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [backstageInitialTab, setBackstageInitialTab] = useState<BackstageTab>('info');
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [comments, setComments] = useState<DocumentComment[]>(() => {
    try {
      const raw = localStorage.getItem('wordpad_document_comments');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [
      {
        id: 'comment-1',
        author: 'Editorial Review',
        text: 'Please verify section metrics, key citations, and executive bibliography before final export.',
        timestamp: 'Today, 10:45 AM',
        selectedText: 'Executive Summary',
        resolved: false,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('wordpad_document_comments', JSON.stringify(comments));
    } catch {
      // ignore
    }
  }, [comments]);

  const handleOpenThemes = useCallback(() => {
    setBackstageInitialTab('new');
    setShowBackstage(true);
  }, []);

  const handleOpenBackstageNormal = useCallback(() => {
    setBackstageInitialTab('info');
    setShowBackstage(true);
  }, []);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('wordpad_autosave_enabled');
      if (val !== null) return val === 'true';
    } catch {
      // fallback
    }
    return true; // Default to AutoSave ON
  });

  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  const handleToggleAutoSave = useCallback((enabled: boolean) => {
    setAutoSaveEnabled(enabled);
    try {
      localStorage.setItem('wordpad_autosave_enabled', String(enabled));
    } catch {
      // ignore
    }
  }, []);

  // Smart AutoCorrect State (Default: OFF, stored in localStorage 'nedit_autocorrect_enabled')
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState<boolean>(() => isAutoCorrectEnabled());
  const [autoCorrectSuggestions, setAutoCorrectSuggestions] = useState<AutoCorrectionItem[]>([]);

  const handleToggleAutoCorrect = useCallback(() => {
    setAutoCorrectEnabled((prev) => {
      const next = !prev;
      setAutoCorrectEnabledStorage(next);
      if (!next) {
        setAutoCorrectSuggestions([]);
      }
      return next;
    });
  }, []);

  // Settings initial state with local storage fallback
  const [settings, setSettings] = useState<DocumentSettings>(() => {
    const defaultMeta = {
      author: 'Alexander Morgan',
      tags: 'Personal',
      version: '1.0.0',
      createdDate: '9/17/2026, 9:08:44 AM',
      updatedDate: '9/23/2026, 4:36:34 PM',
      headerLeft: '',
      headerRight: '',
      headerShowPages: false,
      headerPageStart: 1,
      headerPageTotal: 1,
      headerPageSeparator: '-',
      footerLeft: '',
      footerRight: '',
      footerShowPages: true,
      footerPageStart: 1,
      footerPageTotal: 1,
      footerPageSeparator: '-',
      showHeaderFooter: true,
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.headerPageTotal === 44) parsed.headerPageTotal = 1;
        if (parsed.footerPageTotal === 44) parsed.footerPageTotal = 1;
        return { ...defaultMeta, ...parsed };
      }
    } catch {
      // ignore
    }
    return {
      title: 'Untitled Document.docx',
      ...defaultMeta,
      orientation: 'portrait',
      pageSize: 'a4',
      margins: 'normal',
      pageColor: '#ffffff',
      zoom: 100,
      showRuler: true,
      showGridlines: false,
      showParagraphMarks: true,
      showNavigationPane: false,
      showSeoPane: false,
      showTableEditPane: false,
      enableTableHandle: (() => {
        try {
          const val = localStorage.getItem('wordpad_enable_table_handle');
          if (val !== null) return val === 'true';
        } catch {
          // ignore
        }
        return true;
      })(),
      showBorderEditPane: false,
      enableBorderHandle: (() => {
        try {
          const val = localStorage.getItem('wordpad_enable_border_handle');
          if (val !== null) return val === 'true';
        } catch {
          // ignore
        }
        return false;
      })(),
      showHyperLinkPane: false,
      hyperLinkMode: (() => {
        try {
          const val = localStorage.getItem('wordpad_hyperlink_mode');
          if (val === 'edit' || val === 'navigate') return val;
        } catch {
          // ignore
        }
        return 'navigate';
      })(),
      showImageWizardPane: false,
      showFormatterPane: false,
      showQuickBlocksPane: false,
      showVoiceCommandPane: false,
      isFocusMode: false,
      viewMode: 'print',
      themeMode: (() => {
        try {
          const val = localStorage.getItem('wordpad_theme_mode');
          if (val === 'light' || val === 'canvasDark' || val === 'fullDark' || val === 'sepia') {
            return val;
          }
        } catch {
          // ignore
        }
        return 'light';
      })(),
      isDarkMode: false,
      columns: 1,
      layoutPages: 1,
      showShadow: true,
      pageBorderStyle: 'simple-shadow',
      watermark: '',
      customWatermark: 'CONFIDENTIAL',
    };
  });

  const [stats, setStats] = useState<DocumentStats>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    readingTimeMinutes: 1,
  });

  const [activePageNumber, setActivePageNumber] = useState(1);
  const [totalPagesCount, setTotalPagesCount] = useState(1);

  const handlePageCountChange = useCallback((total: number, active: number) => {
    setTotalPagesCount(total);
    setActivePageNumber(active);
  }, []);

  // Calculate live statistics
  const updateStats = useCallback((editorInstance: any) => {
    if (!editorInstance) return;
    const text = editorInstance.getText();
    const words = editorInstance.storage.characterCount?.words() ?? (text.trim() ? text.trim().split(/\s+/).length : 0);
    const characters = editorInstance.storage.characterCount?.characters() ?? text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Count non-empty paragraphs
    const json = editorInstance.getJSON();
    let paragraphs = 0;
    if (json.content) {
      paragraphs = json.content.filter((n: any) => n.type === 'paragraph' || n.type === 'heading').length;
    }

    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

    setStats({
      words,
      characters,
      charactersNoSpaces,
      paragraphs: Math.max(1, paragraphs),
      readingTimeMinutes,
    });

    // Also update total pages count based on page breaks & content height
    const pmEl = document.querySelector('.ProseMirror');
    if (pmEl) {
      const explicitBreaks = pmEl.querySelectorAll('.word-page-break, .word-blank-page, hr.word-page-break').length;
      const effectiveHeight = 960;
      const scrollHeight = pmEl.scrollHeight || 0;
      const naturalPages = Math.max(1, Math.ceil(scrollHeight / effectiveHeight));
      setTotalPagesCount(Math.max(1, explicitBreaks + 1, naturalPages));
    }
  }, []);

  // Settings ref to access current mode inside callbacks without stale closures
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Persist settings
  const handleUpdateSettings = useCallback((newPartial: Partial<DocumentSettings>) => {
    setSettings((prev) => {
      const updatedPartial: Partial<DocumentSettings> = { ...newPartial };
      if (updatedPartial.themeMode && updatedPartial.isDarkMode === undefined) {
        updatedPartial.isDarkMode =
          updatedPartial.themeMode === 'canvasDark' || updatedPartial.themeMode === 'fullDark';
      } else if (updatedPartial.isDarkMode !== undefined && !updatedPartial.themeMode) {
        updatedPartial.themeMode = updatedPartial.isDarkMode ? 'fullDark' : 'light';
      }

      const next = { ...prev, ...updatedPartial };
      if (next.themeMode) {
        try {
          localStorage.setItem('wordpad_theme_mode', next.themeMode);
        } catch {
          // ignore
        }
      }
      if (autoSaveEnabledRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
        } catch {
          // ignore
        }
      } else {
        setIsSaved(false);
      }
      return next;
    });
  }, []);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        horizontalRule: false,
      }),
      CustomHorizontalRule,
      CustomDiv,
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      LineHeight,
      LetterSpacing,
      TextEffects,
      ParagraphFormatting,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CustomTable.configure({
        resizable: true,
      }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-hyperlink',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Subscript,
      Superscript,
      MathInline,
      MathBlock,
      CharacterCount,
    ],
    content: (() => {
      try {
        const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);
        if (savedContent && savedContent.trim() !== '') {
          return savedContent;
        }
      } catch {
        // fallback
      }
      return initialDocumentContent;
    })(),
    editable: settings.viewMode !== 'read',
    editorProps: {
      handleClick: (view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        const link = target?.closest('a') as HTMLAnchorElement | null;
        if (!link) return false;

        const currentMode = settingsRef.current.hyperLinkMode || 'navigate';

        if (currentMode === 'navigate') {
          // Navigate mode: follow the link normally
          const href = link.getAttribute('href');
          if (href) {
            if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
              window.location.href = href;
            } else {
              const targetAttr = link.getAttribute('target') || '_blank';
              window.open(href, targetAttr, 'noopener,noreferrer');
            }
          }
          event.preventDefault();
          event.stopPropagation();
          return true;
        }

        // EDIT MODE:
        // Prevent browser navigation completely!
        event.preventDefault();
        event.stopPropagation();

        // Select the hyperlink in TipTap
        const fromPos = view.posAtDOM(link, 0);
        const linkLength = link.textContent?.length || 0;
        if (typeof fromPos === 'number') {
          try {
            view.dispatch(
              view.state.tr.setSelection(
                TextSelection.create(view.state.doc, fromPos, fromPos + linkLength)
              )
            );
          } catch {
            // fallback
          }
        }

        // Open Hyper right toolbar
        handleUpdateSettings({ showHyperLinkPane: true });

        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateStats(ed);
      if (autoSaveEnabledRef.current) {
        // Auto-save debounce
        try {
          localStorage.setItem(STORAGE_KEY_CONTENT, ed.getHTML());
          setIsSaved(true);
        } catch {
          // storage quota fallback
        }
      } else {
        // AutoSave is OFF: marked as unsaved until user manually saves
        setIsSaved(false);
      }
    },
    onCreate: ({ editor: ed }) => {
      updateStats(ed);
    },
  });

  // Keep editable state synced with read mode
  useEffect(() => {
    if (editor) {
      editor.setEditable(settings.viewMode !== 'read');
    }
  }, [editor, settings.viewMode]);

  // Smart Format Painter State (In-Memory, strictly avoiding clipboard)
  const [formatPainter, setFormatPainter] = useState<CopiedWordFormat | null>(null);

  const handleToggleFormatPainter = useCallback((mode: 'single' | 'persistent' = 'single') => {
    if (!editor) return;
    if (formatPainter) {
      setFormatPainter(null);
    } else {
      const copied = copyFormatFromEditor(editor, mode);
      if (copied) {
        setFormatPainter(copied);
      }
    }
  }, [editor, formatPainter]);

  const handleApplyFormatPainter = useCallback(() => {
    if (!editor || !formatPainter) return;
    applyFormatToEditor(editor, formatPainter);
    if (formatPainter.mode === 'single') {
      setFormatPainter(null);
    }
  }, [editor, formatPainter]);

  const handleClearFormatPainter = useCallback(() => {
    setFormatPainter(null);
  }, []);

  // Cancel format painter on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && formatPainter) {
        setFormatPainter(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formatPainter]);

  // Auto-activate Table Edit / Border Edit Right Toolbar when a table is focused
  useEffect(() => {
    if (!editor) return;

    const handleSelection = () => {
      if (editor.isActive('table')) {
        const isTableAuto = settings.enableTableHandle ?? true;
        const isBorderAuto = settings.enableBorderHandle ?? false;

        setSettings((prev) => {
          let updated = false;
          const next = { ...prev };
          if (isTableAuto && !prev.showTableEditPane) {
            next.showTableEditPane = true;
            updated = true;
          }
          if (isBorderAuto && !prev.showBorderEditPane) {
            next.showBorderEditPane = true;
            updated = true;
          }
          if (updated) {
            try {
              localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          }
          return prev;
        });
      }
    };

    editor.on('selectionUpdate', handleSelection);
    return () => {
      editor.off('selectionUpdate', handleSelection);
    };
  }, [editor, settings.enableTableHandle, settings.enableBorderHandle]);

  // AutoCorrect Action Handlers
  const handleApplyAutoCorrection = useCallback(
    (item: AutoCorrectionItem) => {
      if (editor) {
        applyAutoCorrection(editor, item);
        setAutoCorrectSuggestions((prev) => prev.filter((s) => s.id !== item.id));
      }
    },
    [editor]
  );

  const handleIgnoreAutoCorrection = useCallback((item: AutoCorrectionItem) => {
    setAutoCorrectSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  }, []);

  const handleApplyAllAutoCorrections = useCallback(() => {
    if (editor && autoCorrectSuggestions.length > 0) {
      applyAllAutoCorrections(editor, autoCorrectSuggestions);
      setAutoCorrectSuggestions([]);
    }
  }, [editor, autoCorrectSuggestions]);

  // AutoCorrect Event Listener: Attached ONLY when autoCorrectEnabled is true
  useEffect(() => {
    if (!editor || !autoCorrectEnabled) {
      return; // When OFF, perform zero processing and do not attach listeners
    }

    const dom = editor.view?.dom;
    if (!dom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Scan newly completed paragraph
        setTimeout(() => {
          if (!editor.isDestroyed) {
            const found = scanCompletedParagraph(editor);
            if (found.length > 0) {
              setAutoCorrectSuggestions(found);
            }
          }
        }, 25);
      } else if (e.key === ' ' || e.key === 'Space') {
        // Scan newly completed sentence if preceded by punctuation
        const { from } = editor.state.selection;
        if (from > 1) {
          const charBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
          if (charBefore === '.' || charBefore === '!' || charBefore === '?') {
            setTimeout(() => {
              if (!editor.isDestroyed) {
                const found = scanCompletedSentence(editor);
                if (found.length > 0) {
                  setAutoCorrectSuggestions(found);
                }
              }
            }, 25);
          }
        }
      }
    };

    dom.addEventListener('keydown', handleKeyDown);

    return () => {
      dom.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, autoCorrectEnabled]);

  const handleSaveToLocalStorage = useCallback(() => {
    if (!editor) return;
    try {
      localStorage.setItem(STORAGE_KEY_CONTENT, editor.getHTML());
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      setIsSaved(true);
    } catch {
      // ignore
    }
  }, [editor, settings]);

  const handleCleanLocalStorage = useCallback(() => {
    try {
      const keysToRemove = [
        STORAGE_KEY_CONTENT,
        STORAGE_KEY_SETTINGS,
        'word_doc_snapshots',
        'wordpad_json_backup_cache',
        'wordpad_markdown_cache',
        'wordpad_image_library',
        'wordpad_recent_symbols',
      ];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('wordpad_') || k.startsWith('word_'))) {
          localStorage.removeItem(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      setIsSaved(false);
    } catch {
      // ignore
    }
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+P, Ctrl+F, Ctrl+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveToLocalStorage();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'h')) {
        e.preventDefault();
        setShowFindReplace(true);
      } else if (e.key === 'Escape' && settings.isFocusMode) {
        handleUpdateSettings({ isFocusMode: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveToLocalStorage, handlePrint, settings.isFocusMode, handleUpdateSettings]);

  const effectiveThemeMode = settings.themeMode || (settings.isDarkMode ? 'fullDark' : 'light');
  const isDarkUi = effectiveThemeMode === 'fullDark' || effectiveThemeMode === 'canvasDark';
  const isSepiaUi = effectiveThemeMode === 'sepia';

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden theme-${effectiveThemeMode} ${
        isDarkUi ? 'dark' : ''
      } ${isSepiaUi ? 'sepia-theme' : ''}`}
    >
      {/* Focus Mode Distraction-Free Floating Header */}
      {settings.isFocusMode && (
        <div
          className={`px-4 py-1.5 flex items-center justify-between text-xs z-50 shrink-0 select-none ${
            isDarkUi
              ? 'bg-[#1f1f1f] text-neutral-100 border-b border-[#2d2d2d] shadow-md'
              : isSepiaUi
              ? 'bg-[#3f2e22] text-[#fbf8ee] border-b border-[#302218] shadow-md'
              : 'bg-[#185abd] text-white shadow-md'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Maximize2
              size={15}
              className={
                isDarkUi
                  ? 'text-purple-400'
                  : isSepiaUi
                  ? 'text-amber-300'
                  : 'text-purple-300'
              }
            />
            <span className="font-semibold">Focus Mode</span>
            <span
              className={`text-[11px] ${
                isDarkUi
                  ? 'text-neutral-400'
                  : isSepiaUi
                  ? 'text-[#d4be9b]'
                  : 'text-blue-200'
              }`}
            >
              — Distraction-free editing canvas
            </span>
          </div>
          <button
            onClick={() => handleUpdateSettings({ isFocusMode: false })}
            className={`px-3 py-1 rounded text-xs cursor-pointer font-medium transition-colors ${
              isDarkUi
                ? 'bg-white/10 hover:bg-white/20 text-neutral-100 border border-neutral-700/60'
                : isSepiaUi
                ? 'bg-white/15 hover:bg-white/25 text-[#fbf8ee] border border-amber-900/40'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            Exit Focus Mode (Esc)
          </button>
        </div>
      )}

      {/* Microsoft Word Top Header Ribbon (Hidden in Focus Mode) */}
      {!settings.isFocusMode && (
        <RibbonHeader
          editor={editor}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenBackstage={(tab?: any) => {
            setBackstageInitialTab(tab || 'info');
            setShowBackstage(true);
          }}
          onOpenFindReplace={() => setShowFindReplace(true)}
          onOpenStats={() => setShowStatsModal(true)}
          onSelectTab={setActiveTab}
          onSave={handleSaveToLocalStorage}
          onPrint={handlePrint}
          isSaved={isSaved}
          autoSaveEnabled={autoSaveEnabled}
          onToggleAutoSave={handleToggleAutoSave}
          onOpenThemes={handleOpenThemes}
          commentsCount={comments.length}
          onToggleComments={() => setShowCommentsPanel((prev) => !prev)}
        />
      )}

      {/* Office Ribbon Toolbar (Hidden in Focus Mode) */}
      {!settings.isFocusMode && (
        <RibbonToolbar
          editor={editor}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenBackstage={handleOpenBackstageNormal}
          onOpenFindReplace={() => setShowFindReplace(true)}
          onOpenStats={() => setShowStatsModal(true)}
          comments={comments}
          onSetComments={setComments}
          showCommentsPanel={showCommentsPanel}
          onToggleCommentsPanel={(show) =>
            setShowCommentsPanel((prev) => (show !== undefined ? show : !prev))
          }
          formatPainter={formatPainter}
          onToggleFormatPainter={handleToggleFormatPainter}
          onClearFormatPainter={handleClearFormatPainter}
          onApplyFormatPainter={handleApplyFormatPainter}
          autoCorrectEnabled={autoCorrectEnabled}
          onToggleAutoCorrect={handleToggleAutoCorrect}
        />
      )}

      {/* Main Workspace Body: Navigation Pane + Document Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {settings.showNavigationPane && (
          <Suspense fallback={<NavPaneLoadingFallback />}>
            <NavigationPane
              editor={editor}
              onClose={() => handleUpdateSettings({ showNavigationPane: false })}
              wordCount={stats.words}
              themeMode={effectiveThemeMode}
              pageSize={settings.pageSize}
              orientation={settings.orientation}
              onPageCountChange={handlePageCountChange}
            />
          </Suspense>
        )}

        {/* Page Workspace Canvas */}
        <DocumentCanvas
          editor={editor}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          formatPainter={formatPainter}
          onApplyFormatPainter={handleApplyFormatPainter}
          onCancelFormatPainter={handleClearFormatPainter}
        />

        {/* SEO Check Sidebar (Toggled via Analyze SEO button) */}
        {settings.showSeoPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <SeoCheckSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showSeoPane: false })}
              wordCount={stats.words}
            />
          </Suspense>
        )}

        {/* Table Edit Right Toolbar (Toggled via Table Edit button or auto when table focused) */}
        {settings.showTableEditPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <TableEditSidebar
              editor={editor}
              themeMode={effectiveThemeMode}
              onClose={() => handleUpdateSettings({ showTableEditPane: false })}
              enableTableHandle={settings.enableTableHandle ?? true}
              onToggleEnableHandle={(enabled) => {
                try {
                  localStorage.setItem('wordpad_enable_table_handle', String(enabled));
                } catch {
                  // ignore
                }
                handleUpdateSettings({ enableTableHandle: enabled });
              }}
            />
          </Suspense>
        )}

        {/* Border Edit Right Toolbar (Toggled via Borders button or auto when table focused) */}
        {settings.showBorderEditPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <BorderEditSidebar
              editor={editor}
              themeMode={effectiveThemeMode}
              onClose={() => handleUpdateSettings({ showBorderEditPane: false })}
              enableBorderHandle={settings.enableBorderHandle ?? false}
              onToggleEnableHandle={(enabled) => {
                try {
                  localStorage.setItem('wordpad_enable_border_handle', String(enabled));
                } catch {
                  // ignore
                }
                handleUpdateSettings({ enableBorderHandle: enabled });
              }}
            />
          </Suspense>
        )}

        {/* Image Wizard Right Toolbar (Toggled via Image Wizard button) */}
        {settings.showImageWizardPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <ImageWizardSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showImageWizardPane: false })}
            />
          </Suspense>
        )}

        {/* Formatter Right Toolbar (Toggled via Formatter button in Format tab) */}
        {settings.showFormatterPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <FormatterSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showFormatterPane: false })}
              formatPainter={formatPainter}
              onToggleFormatPainter={handleToggleFormatPainter}
              onClearFormatPainter={handleClearFormatPainter}
              onApplyFormatPainter={handleApplyFormatPainter}
              themeMode={effectiveThemeMode}
            />
          </Suspense>
        )}

        {/* Quick Blocks Right Toolbar (Toggled via Quick Blocks button) */}
        {settings.showQuickBlocksPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <QuickBlocksSidebar
              editor={editor}
              themeMode={effectiveThemeMode}
              onClose={() => handleUpdateSettings({ showQuickBlocksPane: false })}
            />
          </Suspense>
        )}

        {/* Voice Command Right Toolbar (Toggled via Command button) */}
        {settings.showVoiceCommandPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <VoiceCommandSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showVoiceCommandPane: false })}
            />
          </Suspense>
        )}

        {/* Spell API Right Toolbar (Toggled via Spell API button in Review tab) */}
        {settings.showSpellCheckPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <SpellCheckSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showSpellCheckPane: false })}
            />
          </Suspense>
        )}

        {/* Hyper Link Right Toolbar (Toggled via Hyper button in Insert tab) */}
        {settings.showHyperLinkPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <HyperLinkSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showHyperLinkPane: false })}
              mode={settings.hyperLinkMode || 'navigate'}
              onToggleMode={(newMode) => handleUpdateSettings({ hyperLinkMode: newMode })}
            />
          </Suspense>
        )}

        {/* AI Writing Assistant Right Toolbar (Toggled via Help Tab AI Assistant button or Review Tab Spelling & Grammar) */}
        {settings.showAiAssistantPane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <AiAssistantSidebar
              editor={editor}
              themeMode={effectiveThemeMode}
              initialIntent={settings.aiAssistantIntent}
              triggerTimestamp={settings.aiAssistantTriggerTimestamp}
              onClose={() => handleUpdateSettings({ showAiAssistantPane: false, aiAssistantIntent: null })}
            />
          </Suspense>
        )}

        {/* Smart Translate Right Toolbar (Toggled via Review Tab Translate button) */}
        {settings.showTranslatePane && (
          <Suspense fallback={<SidebarLoadingFallback />}>
            <TranslateSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showTranslatePane: false })}
            />
          </Suspense>
        )}
      </div>

      {/* Table Context Bar (Floats when selection is inside a table) */}
      <TableContextMenu
        editor={editor}
        onOpenTableEdit={() => handleUpdateSettings({ showTableEditPane: true })}
        onOpenBorderEdit={() => handleUpdateSettings({ showBorderEditPane: true })}
      />

      {/* Microsoft Word Bottom Status Bar */}
      <StatusBar
        stats={stats}
        settings={settings}
        totalPages={totalPagesCount}
        activePage={activePageNumber}
        onUpdateSettings={handleUpdateSettings}
        onOpenStats={() => setShowStatsModal(true)}
        onToggleNavigation={() =>
          handleUpdateSettings({ showNavigationPane: !settings.showNavigationPane })
        }
      />

      {/* Modals */}
      {showFindReplace && (
        <Suspense fallback={null}>
          <FindReplaceModal
            editor={editor}
            onClose={() => setShowFindReplace(false)}
          />
        </Suspense>
      )}

      {showStatsModal && (
        <Suspense fallback={null}>
          <DocumentStatsModal
            stats={stats}
            onClose={() => setShowStatsModal(false)}
          />
        </Suspense>
      )}

      {showBackstage && (
        <Suspense fallback={<BackstageLoadingFallback />}>
          <FileBackstage
            editor={editor}
            settings={settings}
            stats={stats}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setShowBackstage(false)}
            onSaveToLocalStorage={handleSaveToLocalStorage}
            onPrint={handlePrint}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={handleToggleAutoSave}
            onCleanLocalStorage={handleCleanLocalStorage}
            initialTab={backstageInitialTab}
          />
        </Suspense>
      )}

      {/* Smart AutoCorrect Unobtrusive Indicator & Popover */}
      {autoCorrectEnabled && (
        <AutoCorrectIndicator
          suggestions={autoCorrectSuggestions}
          onApply={handleApplyAutoCorrection}
          onIgnore={handleIgnoreAutoCorrection}
          onApplyAll={handleApplyAllAutoCorrections}
          onClose={() => setAutoCorrectSuggestions([])}
        />
      )}
    </div>
  );
}
