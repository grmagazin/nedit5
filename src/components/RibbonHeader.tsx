import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Save, 
  Undo, 
  Redo, 
  Printer, 
  Share2, 
  Check, 
  Sun, 
  Moon,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Maximize2,
  MessageSquare
} from 'lucide-react';
import { DocumentSettings, ThemeMode } from '../types';
import { BackstageTab } from './FileBackstage';
import { SearchCommandBar } from './SearchCommandBar';

interface RibbonHeaderProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage: (tab?: BackstageTab) => void;
  onOpenFindReplace: () => void;
  onOpenStats?: () => void;
  onSelectTab?: (tab: any) => void;
  onSave: () => void;
  onPrint: () => void;
  isSaved: boolean;
  autoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  onOpenThemes?: () => void;
  commentsCount?: number;
  onToggleComments?: () => void;
}

export const RibbonHeader: React.FC<RibbonHeaderProps> = ({
  editor,
  settings,
  onUpdateSettings,
  onOpenBackstage,
  onOpenFindReplace,
  onOpenStats,
  onSelectTab,
  onSave,
  onPrint,
  isSaved,
  autoSaveEnabled,
  onToggleAutoSave,
  onOpenThemes,
  commentsCount = 1,
  onToggleComments,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [manualSaveFeedback, setManualSaveFeedback] = useState<string | null>(null);

  const effectiveThemeMode = settings.themeMode || (settings.isDarkMode ? 'fullDark' : 'light');
  const isDarkHeader = effectiveThemeMode === 'fullDark' || effectiveThemeMode === 'canvasDark';
  const isSepiaHeader = effectiveThemeMode === 'sepia';

  const headerBgClass = isDarkHeader
    ? 'bg-[#1f1f1f] text-neutral-100 border-b border-[#2d2d2d]'
    : isSepiaHeader
    ? 'bg-[#3f2e22] text-[#fbf8ee] border-b border-[#302218]'
    : 'bg-[#185abd] text-white shadow-sm';

  return (
    <header id="word-ribbon-header" className={`${headerBgClass} flex items-center justify-between px-3 py-1.5 select-none no-print z-30`}>
      {/* Left side: Brand Logo, Quick Access, Document Title */}
      <div className="flex items-center space-x-2.5">
        {/* Official Nedit v5.1 Logo (Links to GR Magazin, Opens in New Tab) */}
        <a
          href="https://grmagazin.blogspot.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="Nedit v5.1 - GR Magazin (Opens in new tab)"
          className="inline-flex items-center justify-center px-3.5 py-0.5 rounded-full bg-[#0062ff] hover:bg-[#0054db] border-2 border-blue-300 text-white font-black text-xs sm:text-[13px] tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer select-none no-underline"
        >
          <span>Nedit v5.1</span>
        </a>

        {/* Quick Access Icons (Undo, Redo, Print) */}
        <div className="flex items-center space-x-1 pl-1 border-r border-blue-400/40 pr-2">
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <Undo size={15} />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <Redo size={15} />
          </button>
          <button
            onClick={onPrint}
            title="Print Document (Ctrl+P)"
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <Printer size={15} />
          </button>
        </div>

        {/* Document Title (Editable) */}
        <div className="flex items-center space-x-2">
          {isEditingTitle ? (
            <input
              type="text"
              value={settings.title}
              onChange={(e) => onUpdateSettings({ title: e.target.value })}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              className="px-2 py-0.5 text-sm bg-white text-neutral-900 rounded font-medium focus:outline-none focus:ring-1 focus:ring-blue-300 w-48"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center space-x-1.5 px-2 py-0.5 rounded hover:bg-white/15 text-sm font-semibold tracking-wide text-white transition-colors cursor-pointer group"
              title="Click to rename document"
            >
              <span className="truncate max-w-[200px]">{settings.title}</span>
              <span className="text-xs text-blue-200 font-normal group-hover:text-white">.docx</span>
              <ChevronDown size={12} className="opacity-70 group-hover:opacity-100" />
            </button>
          )}

          {/* Auto / Manual Save Locally Control (Matches user photo) */}
          <div className="flex items-center space-x-1.5">
            {/* Manual Save Locally Button (Floppy disk with green/amber badge) */}
            <button
              onClick={() => {
                onSave();
                setManualSaveFeedback('Saved locally!');
                setTimeout(() => setManualSaveFeedback(null), 2200);
              }}
              title="Save manually to Local DB (Ctrl+S)"
              className="relative p-1 rounded hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer group flex items-center justify-center"
            >
              <Save size={16} className="text-white drop-shadow-xs" />
              {/* Status Dot: Green if saved, amber/yellow if unsaved */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#185abd] transition-colors ${
                  isSaved ? 'bg-[#10b981]' : 'bg-amber-400 animate-pulse'
                }`}
                title={
                  isSaved
                    ? 'Document saved in Local DB'
                    : 'Unsaved changes (Click to save manually)'
                }
              />
            </button>

            {/* AutoSave Switch Pill: AutoSave [Switch] Local DB */}
            <div
              className="flex items-center space-x-1.5 bg-[#0d346b] hover:bg-[#0c2f61] border border-blue-300/30 px-2.5 py-0.5 rounded-full select-none shadow-2xs transition-colors"
              title={
                autoSaveEnabled
                  ? 'AutoSave: ON (Changes saved automatically to Local DB. Disable on untrusted/public networks)'
                  : 'AutoSave: OFF (Safe for untrusted/public networks. Use manual save button)'
              }
            >
              <span className="text-[11px] font-semibold text-white tracking-tight">
                AutoSave
              </span>

              {/* The Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={autoSaveEnabled}
                onClick={() => onToggleAutoSave(!autoSaveEnabled)}
                className={`w-7 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                  autoSaveEnabled ? 'bg-[#10b981]' : 'bg-white/30 hover:bg-white/40'
                }`}
              >
                <span
                  className={`bg-white w-3 h-3 rounded-full shadow-xs transform transition-transform duration-200 ${
                    autoSaveEnabled ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>

              <span className="text-[10px] font-mono text-blue-200 font-bold tracking-tight">
                Local DB
              </span>
            </div>

            {/* Feedback tooltip if user clicks save */}
            {manualSaveFeedback && (
              <span className="hidden lg:inline-flex text-[10px] bg-emerald-600/90 text-white font-semibold px-2 py-0.5 rounded-full shadow-xs animate-in fade-in zoom-in-95 duration-150">
                {manualSaveFeedback}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Search / Smart "Tell me what you want to do" Command System */}
      <SearchCommandBar
        editor={editor}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onOpenBackstage={onOpenBackstage}
        onOpenFindReplace={onOpenFindReplace}
        onOpenStats={onOpenStats}
        onSave={onSave}
        onPrint={onPrint}
        onOpenThemes={onOpenThemes}
        onToggleComments={onToggleComments}
        onSelectTab={onSelectTab}
        isDarkHeader={isDarkHeader}
        isSepiaHeader={isSepiaHeader}
      />

      {/* Right side: Themes, AI, Zen (Focus), Comments (with badge), Dark/Light Mode */}
      <div className="flex items-center space-x-2">
        {/* 1. Themes (open the file new templates) */}
        <button
          onClick={onOpenThemes ? onOpenThemes : () => onOpenBackstage()}
          title="Themes & Templates (Open new templates)"
          className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 active:scale-95 text-white font-medium text-xs transition-all shadow-2xs cursor-pointer border border-white/10"
        >
          <LayoutGrid size={15} className="text-white shrink-0" />
          <span className="font-semibold tracking-tight">Themes</span>
        </button>

        {/* 2. AI (open the Right AI Toolbar) */}
        <button
          onClick={() => onUpdateSettings({ showAiAssistantPane: !settings.showAiAssistantPane })}
          title={settings.showAiAssistantPane ? 'Close AI Assistant' : 'Open AI Assistant Toolbar'}
          className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
            settings.showAiAssistantPane
              ? 'bg-purple-700 ring-2 ring-purple-300 text-white'
              : 'bg-[#8b32e6] hover:bg-[#9d44f5] text-white'
          }`}
        >
          <Sparkles size={14} className="text-amber-300 fill-amber-300 shrink-0" />
          <span className="tracking-tight">AI</span>
        </button>

        {/* 3. Zen (call the focus mode) */}
        <button
          onClick={() => onUpdateSettings({ isFocusMode: true })}
          title="Zen Mode (Focus Mode - hide distractions, Esc to exit)"
          className="p-1.5 rounded-md hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <Maximize2 size={16} />
        </button>

        {/* 4. Comments & (Comments number) */}
        <button
          onClick={onToggleComments}
          title={`Comments (${commentsCount ?? 0} active)`}
          className="relative p-1.5 rounded-md hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <MessageSquare size={17} />
          {(commentsCount ?? 0) > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#f59e0b] text-neutral-950 font-black text-[10px] rounded-full flex items-center justify-center border-2 border-[#185abd] shadow-xs leading-none"
            >
              {commentsCount}
            </span>
          )}
        </button>

        {/* 5. Dark / Light / Sepia Mode Switcher */}
        <button
          onClick={() => {
            const nextMode: ThemeMode =
              effectiveThemeMode === 'light'
                ? 'canvasDark'
                : effectiveThemeMode === 'canvasDark'
                ? 'fullDark'
                : effectiveThemeMode === 'fullDark'
                ? 'sepia'
                : 'light';
            onUpdateSettings({
              themeMode: nextMode,
              isDarkMode: nextMode === 'canvasDark' || nextMode === 'fullDark',
            });
          }}
          title={`Theme: ${
            effectiveThemeMode === 'light'
              ? 'Light'
              : effectiveThemeMode === 'canvasDark'
              ? 'Canvas Dark'
              : effectiveThemeMode === 'fullDark'
              ? 'Full Dark'
              : 'Sepia'
          } (Click to switch theme)`}
          className="p-1.5 rounded-md hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          {effectiveThemeMode === 'light' ? (
            <Sun size={17} className="text-amber-300" />
          ) : effectiveThemeMode === 'canvasDark' ? (
            <div className="w-4 h-4 bg-[#111827] border border-white/70 rounded-xs flex items-center justify-center">
              <div className="w-2 h-2.5 bg-white rounded-[1px]" />
            </div>
          ) : effectiveThemeMode === 'fullDark' ? (
            <Moon size={17} className="text-blue-300" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-[#fbf8ee] border-2 border-amber-300 shadow-2xs" />
          )}
        </button>
      </div>
    </header>
  );
};
