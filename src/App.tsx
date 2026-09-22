/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
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

import { FontSize, FontFamily, LineHeight } from './extensions/customExtensions';
import { initialDocumentContent } from './utils/initialContent';
import { RibbonTab, DocumentSettings, DocumentStats } from './types';

import { RibbonHeader } from './components/RibbonHeader';
import { RibbonToolbar } from './components/RibbonToolbar';
import { DocumentCanvas } from './components/DocumentCanvas';
import { StatusBar } from './components/StatusBar';
import { TableContextMenu } from './components/TableContextMenu';
import { FindReplaceModal } from './components/FindReplaceModal';
import { DocumentStatsModal } from './components/DocumentStatsModal';
import { FileBackstage } from './components/FileBackstage';
import { NavigationPane } from './components/NavigationPane';
import { SeoCheckSidebar } from './components/SeoCheckSidebar';
import { TableEditSidebar } from './components/TableEditSidebar';
import { BorderEditSidebar } from './components/BorderEditSidebar';
import { ImageWizardSidebar } from './components/ImageWizardSidebar';
import { QuickBlocksSidebar } from './components/QuickBlocksSidebar';
import { Maximize2 } from 'lucide-react';

const VoiceCommandSidebar = React.lazy(() =>
  import('./components/VoiceCommandSidebar').then((m) => ({ default: m.VoiceCommandSidebar }))
);
const SpellCheckSidebar = React.lazy(() =>
  import('./components/SpellCheckSidebar').then((m) => ({ default: m.SpellCheckSidebar }))
);

const STORAGE_KEY_CONTENT = 'wordpad_document_content';
const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [showBackstage, setShowBackstage] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  // Settings initial state with local storage fallback
  const [settings, setSettings] = useState<DocumentSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      title: 'Executive Report',
      orientation: 'portrait',
      pageSize: 'letter',
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
      showImageWizardPane: false,
      showQuickBlocksPane: false,
      showVoiceCommandPane: false,
      isFocusMode: false,
      viewMode: 'print',
      isDarkMode: false,
      columns: 1,
      showShadow: true,
      watermark: '',
    };
  });

  const [stats, setStats] = useState<DocumentStats>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    readingTimeMinutes: 1,
  });

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
  }, []);

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      LineHeight,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Subscript,
      Superscript,
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
    onUpdate: ({ editor: ed }) => {
      setIsSaved(false);
      updateStats(ed);
      // Auto-save debounce
      try {
        localStorage.setItem(STORAGE_KEY_CONTENT, ed.getHTML());
        setIsSaved(true);
      } catch {
        // storage quota fallback
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

  // Persist settings
  const handleUpdateSettings = useCallback((newPartial: Partial<DocumentSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newPartial };
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${settings.isDarkMode ? 'dark' : ''}`}>
      {/* Focus Mode Distraction-Free Floating Header */}
      {settings.isFocusMode && (
        <div className="bg-[#185abd] text-white px-4 py-1.5 flex items-center justify-between text-xs shadow-md z-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Maximize2 size={15} className="text-purple-300" />
            <span className="font-semibold">Focus Mode</span>
            <span className="text-blue-200 text-[11px]">— Distraction-free editing canvas</span>
          </div>
          <button
            onClick={() => handleUpdateSettings({ isFocusMode: false })}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs cursor-pointer font-medium transition-colors"
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
          onOpenBackstage={() => setShowBackstage(true)}
          onOpenFindReplace={() => setShowFindReplace(true)}
          onSave={handleSaveToLocalStorage}
          onPrint={handlePrint}
          isSaved={isSaved}
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
          onOpenBackstage={() => setShowBackstage(true)}
          onOpenFindReplace={() => setShowFindReplace(true)}
          onOpenStats={() => setShowStatsModal(true)}
        />
      )}

      {/* Main Workspace Body: Navigation Pane + Document Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {settings.showNavigationPane && (
          <NavigationPane
            editor={editor}
            onClose={() => handleUpdateSettings({ showNavigationPane: false })}
            wordCount={stats.words}
          />
        )}

        {/* Page Workspace Canvas */}
        <DocumentCanvas
          editor={editor}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />

        {/* SEO Check Sidebar (Toggled via Analyze SEO button) */}
        {settings.showSeoPane && (
          <SeoCheckSidebar
            editor={editor}
            onClose={() => handleUpdateSettings({ showSeoPane: false })}
            wordCount={stats.words}
          />
        )}

        {/* Table Edit Right Toolbar (Toggled via Table Edit button or auto when table focused) */}
        {settings.showTableEditPane && (
          <TableEditSidebar
            editor={editor}
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
        )}

        {/* Border Edit Right Toolbar (Toggled via Borders button or auto when table focused) */}
        {settings.showBorderEditPane && (
          <BorderEditSidebar
            editor={editor}
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
        )}

        {/* Image Wizard Right Toolbar (Toggled via Image Wizard button) */}
        {settings.showImageWizardPane && (
          <ImageWizardSidebar
            editor={editor}
            onClose={() => handleUpdateSettings({ showImageWizardPane: false })}
          />
        )}

        {/* Quick Blocks Right Toolbar (Toggled via Quick Blocks button) */}
        {settings.showQuickBlocksPane && (
          <QuickBlocksSidebar
            editor={editor}
            onClose={() => handleUpdateSettings({ showQuickBlocksPane: false })}
          />
        )}

        {/* Voice Command Right Toolbar (Toggled via Command button) */}
        {settings.showVoiceCommandPane && (
          <Suspense
            fallback={
              <div className="w-84 flex-shrink-0 bg-white border-l border-slate-200 flex items-center justify-center p-8 text-xs text-slate-400">
                Loading Voice Command...
              </div>
            }
          >
            <VoiceCommandSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showVoiceCommandPane: false })}
            />
          </Suspense>
        )}

        {/* Spell API Right Toolbar (Toggled via Spell API button in Review tab) */}
        {settings.showSpellCheckPane && (
          <Suspense
            fallback={
              <div className="w-84 flex-shrink-0 bg-white border-l border-slate-200 flex items-center justify-center p-8 text-xs text-slate-400">
                Loading Spell Check...
              </div>
            }
          >
            <SpellCheckSidebar
              editor={editor}
              onClose={() => handleUpdateSettings({ showSpellCheckPane: false })}
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
        onUpdateSettings={handleUpdateSettings}
        onOpenStats={() => setShowStatsModal(true)}
      />

      {/* Modals */}
      {showFindReplace && (
        <FindReplaceModal
          editor={editor}
          onClose={() => setShowFindReplace(false)}
        />
      )}

      {showStatsModal && (
        <DocumentStatsModal
          stats={stats}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {showBackstage && (
        <FileBackstage
          editor={editor}
          settings={settings}
          stats={stats}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowBackstage(false)}
          onSaveToLocalStorage={handleSaveToLocalStorage}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
