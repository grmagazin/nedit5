import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Save, 
  Undo, 
  Redo, 
  Printer, 
  Search, 
  Share2, 
  Check, 
  Sun, 
  Moon,
  ChevronDown
} from 'lucide-react';
import { DocumentSettings } from '../types';

interface RibbonHeaderProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage: () => void;
  onOpenFindReplace: () => void;
  onSave: () => void;
  onPrint: () => void;
  isSaved: boolean;
}

export const RibbonHeader: React.FC<RibbonHeaderProps> = ({
  editor,
  settings,
  onUpdateSettings,
  onOpenBackstage,
  onOpenFindReplace,
  onSave,
  onPrint,
  isSaved,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const handleCommandSearch = (command: string) => {
    if (!editor) return;
    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'find':
        onOpenFindReplace();
        break;
      case 'print':
        onPrint();
        break;
      case 'save':
        onSave();
        break;
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'list':
        editor.chain().focus().toggleBulletList().run();
        break;
    }
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  return (
    <header id="word-ribbon-header" className="bg-[#185abd] text-white flex items-center justify-between px-3 py-1.5 select-none no-print shadow-sm z-30">
      {/* Left side: Brand, Quick Access, Document Title */}
      <div className="flex items-center space-x-2.5">
        {/* Word App Icon */}
        <button
          onClick={onOpenBackstage}
          className="flex items-center justify-center w-7 h-7 bg-white text-[#185abd] rounded font-bold text-sm shadow-sm hover:bg-neutral-100 transition-colors cursor-pointer"
          title="File / Backstage Menu"
          aria-label="File Menu"
        >
          W
        </button>

        {/* Quick Access Icons */}
        <div className="flex items-center space-x-1 pl-1 border-r border-blue-400/40 pr-2">
          <button
            onClick={onSave}
            title="Save (Ctrl+S)"
            className="p-1 rounded hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
          >
            <Save size={15} />
          </button>
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

          {/* AutoSave & Saved Status Indicator */}
          <div className="hidden sm:flex items-center space-x-1 text-xs text-blue-100/90 bg-white/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{isSaved ? 'Saved to Browser' : 'Saving...'}</span>
          </div>
        </div>
      </div>

      {/* Center Search / "Tell me what you want to do" */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div className="flex items-center bg-white/15 hover:bg-white/25 focus-within:bg-white focus-within:text-neutral-900 rounded-md px-2.5 py-1 text-xs transition-colors">
          <Search size={14} className="opacity-70 mr-2 text-inherit" />
          <input
            type="text"
            placeholder="Search commands (e.g. table, bold, find...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
            className="w-full bg-transparent placeholder:text-blue-100 focus-within:placeholder:text-neutral-400 focus:outline-none text-xs text-inherit"
          />
        </div>

        {/* Search command dropdown suggestions */}
        {showSearchSuggestions && searchQuery.trim() && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white text-neutral-800 rounded-md shadow-lg border border-neutral-200 py-1.5 z-50 text-xs">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Quick Actions
            </div>
            {[
              { id: 'bold', label: 'Toggle Bold', action: 'bold' },
              { id: 'italic', label: 'Toggle Italic', action: 'italic' },
              { id: 'table', label: 'Insert 3x3 Table', action: 'table' },
              { id: 'find', label: 'Find & Replace', action: 'find' },
              { id: 'print', label: 'Print Document', action: 'print' },
              { id: 'save', label: 'Save Document', action: 'save' },
              { id: 'h1', label: 'Heading 1', action: 'h1' },
              { id: 'list', label: 'Bullet List', action: 'list' },
            ]
              .filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleCommandSearch(cmd.action)}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-neutral-700 flex items-center justify-between cursor-pointer"
                >
                  <span>{cmd.label}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Word Action</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Right side: Dark Mode toggle, Share button, Profile avatar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onUpdateSettings({ isDarkMode: !settings.isDarkMode })}
          title={settings.isDarkMode ? 'Switch to Light Canvas' : 'Switch to Dark Canvas'}
          className="p-1.5 rounded hover:bg-white/20 transition-colors text-white/90 hover:text-white cursor-pointer"
        >
          {settings.isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={onSave}
          className="flex items-center space-x-1.5 bg-white text-[#185abd] hover:bg-blue-50 px-2.5 py-1 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>

        {/* User initials circle */}
        <div className="w-6 h-6 rounded-full bg-blue-800 text-white border border-blue-300/40 flex items-center justify-center text-[11px] font-bold">
          JD
        </div>
      </div>
    </header>
  );
};
