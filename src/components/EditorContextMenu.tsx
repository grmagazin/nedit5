import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  ClipboardCheck,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  List,
  Menu,
  Trash2,
  Clock,
  Minus,
  Bookmark,
  Info,
  ChevronsUpDown,
  FileText,
  Volume2,
  VolumeX,
  Eraser,
  ChevronRight,
} from 'lucide-react';

interface EditorContextMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

type SubmenuType = 'format' | 'list' | 'spacing' | 'fontSize' | 'typography' | null;

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editor,
  isOpen,
  position,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>(null);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });

  // Compute position clamped inside screen viewport
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
      return;
    }

    const estimatedWidth = 470;
    const estimatedHeight = 520;
    const padding = 8;

    let x = position.x;
    let y = position.y;

    if (x + estimatedWidth > window.innerWidth - padding) {
      x = Math.max(padding, window.innerWidth - estimatedWidth - padding);
    }
    if (y + estimatedHeight > window.innerHeight - padding) {
      y = Math.max(padding, window.innerHeight - estimatedHeight - padding);
    }

    setMenuCoords({ top: y, left: x });
  }, [isOpen, position]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !editor) return null;

  // Actions
  const handleCut = () => {
    document.execCommand('cut');
    onClose();
  };

  const handleCopy = () => {
    document.execCommand('copy');
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.commands.insertContent(text);
      }
    } catch {
      document.execCommand('paste');
    }
    onClose();
  };

  const handlePastePlainText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.commands.insertContent(text);
      }
    } catch {
      document.execCommand('paste');
    }
    onClose();
  };

  const handleSelectAll = () => {
    editor.chain().focus().selectAll().run();
    onClose();
  };

  const handleDuplicateBlock = () => {
    const { $from } = editor.state.selection;
    const text = $from.parent.textContent;
    if (text) {
      editor.chain().focus().splitBlock().insertContent(text).run();
    }
    onClose();
  };

  const handleDeleteBlock = () => {
    editor.chain().focus().deleteNode('paragraph').run();
    onClose();
  };

  const handleInsertDateTime = () => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    editor.chain().focus().insertContent(` ${dateStr} `).run();
    onClose();
  };

  const handleInsertHorizontalRule = () => {
    editor.chain().focus().setHorizontalRule().run();
    onClose();
  };

  const handleInsertBookmark = () => {
    const name = window.prompt('Bookmark / Anchor Name:', 'section-anchor');
    if (name) {
      const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      editor
        .chain()
        .focus()
        .insertContent(`<span id="${id}" class="anchor-bookmark text-[#185abd] font-medium" title="Bookmark: #${id}">🔖 [${name}]</span> `)
        .run();
    }
    onClose();
  };

  const handleInsertCallout = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<blockquote class="p-3 my-2 border-l-4 border-blue-500 bg-blue-50/70 text-blue-950 rounded-r text-sm"><p><strong>Note:</strong> Enter important callout information here...</p></blockquote>`
      )
      .run();
    onClose();
  };

  const handleInsertCollapsible = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<details class="my-2 p-2.5 bg-neutral-50/80 border border-neutral-200 rounded-md"><summary class="cursor-pointer font-semibold text-neutral-800">Collapsible Section Title</summary><p class="mt-2 text-neutral-600 text-sm">Detailed collapsible content goes here...</p></details>`
      )
      .run();
    onClose();
  };

  const handleInsertTypography = (char: string) => {
    editor.chain().focus().insertContent(char).run();
    onClose();
  };

  const handleInsertLorem = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
      )
      .run();
    onClose();
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const selected = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      const text = selected.trim() || editor.getText();
      if (text.trim()) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      }
    }
    onClose();
  };

  const handleStopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  const handleClearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
    onClose();
  };

  const handleResetToEmpty = () => {
    if (window.confirm('Clear all document content and reset to empty?')) {
      editor.commands.setContent('<p></p>');
    }
    onClose();
  };

  const typographyList = [
    { label: 'Copyright', symbol: '©' },
    { label: 'Registered', symbol: '®' },
    { label: 'Trademark', symbol: '™' },
    { label: 'Section', symbol: '§' },
    { label: 'Pilcrow', symbol: '¶' },
    { label: 'Em Dash', symbol: '—' },
    { label: 'En Dash', symbol: '–' },
    { label: 'Bullet', symbol: '•' },
    { label: 'Ellipsis', symbol: '…' },
    { label: 'Degree', symbol: '°' },
    { label: 'Euro', symbol: '€' },
    { label: 'Pound', symbol: '£' },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] flex flex-row bg-white rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-neutral-200/90 text-[#374151] select-none no-print divide-x divide-neutral-100 font-sans text-[13px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: `${menuCoords.top}px`,
        left: `${menuCoords.left}px`,
        width: '470px',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ========================================================= */}
      {/* COLUMN 1: LEFT COLUMN                                      */}
      {/* ========================================================= */}
      <div className="w-[235px] p-2 flex flex-col justify-start relative">
        {/* Undo / Redo Header */}
        <div className="flex items-center justify-between px-2 py-1 pb-2 border-b border-neutral-100">
          <button
            onClick={() => {
              editor.chain().focus().undo().run();
              onClose();
            }}
            disabled={!editor.can().undo()}
            className="flex items-center space-x-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Undo2 size={14} className="text-neutral-500" />
            <span className="font-normal text-xs text-neutral-800">Undo</span>
            <span className="text-[10px] text-neutral-400 font-mono ml-0.5">Ctrl+Z</span>
          </button>

          <button
            onClick={() => {
              editor.chain().focus().redo().run();
              onClose();
            }}
            disabled={!editor.can().redo()}
            className="flex items-center space-x-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Redo2 size={14} className="text-neutral-500" />
            <span className="font-normal text-xs text-neutral-800">Redo</span>
            <span className="text-[10px] text-neutral-400 font-mono ml-0.5">Ctrl+Y</span>
          </button>
        </div>

        {/* CLIPBOARD Header */}
        <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
          Clipboard
        </div>

        {/* Cut */}
        <button
          onClick={handleCut}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <Scissors size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700 font-normal">Cut</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">Ctrl+X</span>
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <Copy size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700 font-normal">Copy</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">Ctrl+C</span>
        </button>

        {/* Paste */}
        <button
          onClick={handlePaste}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <Clipboard size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700 font-normal">Paste</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">Ctrl+V</span>
        </button>

        {/* Paste Without Formatting */}
        <button
          onClick={handlePastePlainText}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <ClipboardCheck size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700 font-normal">Paste Without Formatting</span>
        </button>

        {/* Select All */}
        <button
          onClick={handleSelectAll}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <CheckSquare size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700 font-normal">Select All</span>
        </button>

        {/* PARAGRAPH Header */}
        <div className="border-t border-neutral-100 pt-1.5 mt-1">
          <div className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
            Paragraph
          </div>

          {/* 4 Alignment buttons */}
          <div className="flex items-center space-x-1 px-1 pb-1.5">
            <button
              onClick={() => {
                editor.chain().focus().setTextAlign('left').run();
                onClose();
              }}
              title="Align Left"
              className={`flex-1 h-7 rounded border flex justify-center items-center transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'left' })
                  ? 'border-[#185abd] bg-blue-50 text-[#185abd]'
                  : 'border-neutral-200 hover:border-[#185abd] hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => {
                editor.chain().focus().setTextAlign('center').run();
                onClose();
              }}
              title="Align Center"
              className={`flex-1 h-7 rounded border flex justify-center items-center transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'center' })
                  ? 'border-[#185abd] bg-blue-50 text-[#185abd]'
                  : 'border-neutral-200 hover:border-[#185abd] hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => {
                editor.chain().focus().setTextAlign('right').run();
                onClose();
              }}
              title="Align Right"
              className={`flex-1 h-7 rounded border flex justify-center items-center transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'right' })
                  ? 'border-[#185abd] bg-blue-50 text-[#185abd]'
                  : 'border-neutral-200 hover:border-[#185abd] hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <AlignRight size={14} />
            </button>
            <button
              onClick={() => {
                editor.chain().focus().setTextAlign('justify').run();
                onClose();
              }}
              title="Justify"
              className={`flex-1 h-7 rounded border flex justify-center items-center transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'justify' })
                  ? 'border-[#185abd] bg-blue-50 text-[#185abd]'
                  : 'border-neutral-200 hover:border-[#185abd] hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <AlignJustify size={14} />
            </button>
          </div>

          {/* Format As... */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('format')}
            onMouseLeave={() => setActiveSubmenu((curr) => (curr === 'format' ? null : curr))}
          >
            <button
              onClick={() => setActiveSubmenu(activeSubmenu === 'format' ? null : 'format')}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-colors text-left group cursor-pointer ${
                activeSubmenu === 'format' ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-100/80 text-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Type size={14} className="text-neutral-500 group-hover:text-neutral-800" />
                <span>Format As...</span>
              </div>
              <ChevronRight size={13} className="text-neutral-400" />
            </button>

            {activeSubmenu === 'format' && (
              <div className="absolute left-[95%] top-0 w-44 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 z-50 flex flex-col space-y-0.5 animate-in fade-in duration-75">
                <button
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                >
                  Normal (Paragraph)
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs font-bold text-[#185abd]"
                >
                  Heading 1
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs font-semibold text-[#2b579a]"
                >
                  Heading 2
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs font-medium text-[#3b82f6]"
                >
                  Heading 3
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs italic text-neutral-600"
                >
                  Quote
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('list')}
            onMouseLeave={() => setActiveSubmenu((curr) => (curr === 'list' ? null : curr))}
          >
            <button
              onClick={() => setActiveSubmenu(activeSubmenu === 'list' ? null : 'list')}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-colors text-left group cursor-pointer ${
                activeSubmenu === 'list' ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-100/80 text-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <List size={14} className="text-neutral-500 group-hover:text-neutral-800" />
                <span>List</span>
              </div>
              <ChevronRight size={13} className="text-neutral-400" />
            </button>

            {activeSubmenu === 'list' && (
              <div className="absolute left-[95%] top-0 w-44 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 z-50 flex flex-col space-y-0.5 animate-in fade-in duration-75">
                <button
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                >
                  • Bulleted List
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                >
                  1. Numbered List
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleTaskList().run();
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                >
                  ☑ Task List
                </button>
              </div>
            )}
          </div>

          {/* Line Spacing */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('spacing')}
            onMouseLeave={() => setActiveSubmenu((curr) => (curr === 'spacing' ? null : curr))}
          >
            <button
              onClick={() => setActiveSubmenu(activeSubmenu === 'spacing' ? null : 'spacing')}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-colors text-left group cursor-pointer ${
                activeSubmenu === 'spacing' ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-100/80 text-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Menu size={14} className="text-neutral-500 group-hover:text-neutral-800" />
                <span>Line Spacing</span>
              </div>
              <ChevronRight size={13} className="text-neutral-400" />
            </button>

            {activeSubmenu === 'spacing' && (
              <div className="absolute left-[95%] top-0 w-36 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 z-50 flex flex-col space-y-0.5 animate-in fade-in duration-75">
                {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      editor.chain().focus().setLineHeight(val).run();
                      onClose();
                    }}
                    className="px-2 py-1 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                  >
                    {val} {val === '1.15' ? '(Default)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('fontSize')}
            onMouseLeave={() => setActiveSubmenu((curr) => (curr === 'fontSize' ? null : curr))}
          >
            <button
              onClick={() => setActiveSubmenu(activeSubmenu === 'fontSize' ? null : 'fontSize')}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-colors text-left group cursor-pointer ${
                activeSubmenu === 'fontSize' ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-100/80 text-neutral-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Type size={14} className="text-neutral-500 group-hover:text-neutral-800" />
                <span>Font Size</span>
              </div>
              <ChevronRight size={13} className="text-neutral-400" />
            </button>

            {activeSubmenu === 'fontSize' && (
              <div className="absolute left-[95%] top-0 w-32 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 z-50 flex flex-col space-y-0.5 max-h-48 overflow-y-auto animate-in fade-in duration-75">
                {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      editor.chain().focus().setFontSize(`${sz}px`).run();
                      onClose();
                    }}
                    className="px-2 py-1 rounded text-left hover:bg-neutral-100 text-xs text-neutral-700"
                  >
                    {sz} pt
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duplicate / Delete Block */}
        <div className="border-t border-neutral-100 pt-1.5 mt-1">
          <button
            onClick={handleDuplicateBlock}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
          >
            <Copy size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700">Duplicate Block</span>
          </button>

          <button
            onClick={handleDeleteBlock}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-red-50 text-red-500 transition-colors text-left group cursor-pointer"
          >
            <Trash2 size={14} className="text-red-500" />
            <span className="font-normal text-red-500">Delete Block</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COLUMN 2: RIGHT COLUMN                                     */}
      {/* ========================================================= */}
      <div className="w-[235px] p-2 flex flex-col justify-start relative">
        {/* INSERT Header */}
        <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
          Insert
        </div>

        {/* Date & Time */}
        <button
          onClick={handleInsertDateTime}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <Clock size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700">Date &amp; Time</span>
        </button>

        {/* Horizontal Rule */}
        <button
          onClick={handleInsertHorizontalRule}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <Minus size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700">Horizontal Rule</span>
        </button>

        {/* Bookmark / Anchor... */}
        <button
          onClick={handleInsertBookmark}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <Bookmark size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700">Bookmark / Anchor...</span>
        </button>

        {/* Callout Box with NEW badge */}
        <button
          onClick={handleInsertCallout}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <Info size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700">Callout Box</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-[#185abd] tracking-wider">
            NEW
          </span>
        </button>

        {/* Collapsible Section... */}
        <button
          onClick={handleInsertCollapsible}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <ChevronsUpDown size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700">Collapsible Section...</span>
        </button>

        {/* Typography with 12 badge */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu('typography')}
          onMouseLeave={() => setActiveSubmenu((curr) => (curr === 'typography' ? null : curr))}
        >
          <button
            onClick={() => setActiveSubmenu(activeSubmenu === 'typography' ? null : 'typography')}
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded transition-colors text-left group cursor-pointer ${
              activeSubmenu === 'typography' ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-100/80 text-neutral-700'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Type size={14} className="text-neutral-500 group-hover:text-neutral-800" />
              <span className="text-neutral-700">Typography</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-blue-100 text-[#185abd] min-w-[18px] text-center">
              12
            </span>
          </button>

          {activeSubmenu === 'typography' && (
            <div className="absolute right-[95%] top-0 w-48 bg-white rounded-lg shadow-xl border border-neutral-200 p-1.5 z-50 grid grid-cols-2 gap-1 animate-in fade-in duration-75">
              {typographyList.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => handleInsertTypography(item.symbol)}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-blue-50 hover:text-[#185abd] text-xs text-neutral-700"
                  title={item.label}
                >
                  <span className="font-bold text-sm">{item.symbol}</span>
                  <span className="text-[10px] text-neutral-400 truncate max-w-[55px]">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lorem Ipsum */}
        <button
          onClick={handleInsertLorem}
          className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
        >
          <FileText size={14} className="text-neutral-500 group-hover:text-neutral-800" />
          <span className="text-neutral-700">Lorem Ipsum</span>
        </button>

        {/* READ Header */}
        <div className="border-t border-neutral-100 pt-1.5 mt-1">
          <div className="px-2 pt-0.5 pb-1 text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
            Read
          </div>

          <button
            onClick={handleReadAloud}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
          >
            <Volume2 size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700">Read Document Aloud</span>
          </button>

          <button
            onClick={handleStopReading}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
          >
            <VolumeX size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700">Stop Reading</span>
          </button>
        </div>

        {/* CLEAR & RESET Header */}
        <div className="border-t border-neutral-100 pt-1.5 mt-1">
          <button
            onClick={handleClearFormatting}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-neutral-100/80 transition-colors text-left group cursor-pointer"
          >
            <Eraser size={14} className="text-neutral-500 group-hover:text-neutral-800" />
            <span className="text-neutral-700">Clear All Formatting</span>
          </button>

          <button
            onClick={handleResetToEmpty}
            className="flex items-center space-x-2.5 w-full px-2 py-1.5 rounded hover:bg-red-50 text-red-500 transition-colors text-left group cursor-pointer"
          >
            <Trash2 size={14} className="text-red-500" />
            <span className="font-normal text-red-500">Reset to Empty</span>
          </button>
        </div>
      </div>
    </div>
  );
};
