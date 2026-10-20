import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  Scissors,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

interface TableContextMenuProps {
  editor: Editor | null;
  themeMode?: string;
  isTableEditOpen?: boolean;
  isBorderEditOpen?: boolean;
  onOpenTableEdit?: () => void;
  onOpenBorderEdit?: () => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  editor,
  themeMode,
  isTableEditOpen = false,
  isBorderEditOpen = false,
  onOpenTableEdit,
  onOpenBorderEdit,
}) => {
  // Track whether selection is inside a table, header row, and mergeable cells automatically
  const [isInsideTable, setIsInsideTable] = useState<boolean>(() => editor?.isActive('table') ?? false);
  const [isHeaderRow, setIsHeaderRow] = useState<boolean>(() => editor?.isActive('tableHeader') ?? false);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      setIsInsideTable(editor.isActive('table'));
      setIsHeaderRow(editor.isActive('tableHeader'));
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor || !isInsideTable) {
    return null;
  }

  // Theme-aware styles for light, sepia, and dark modes
  const isDark =
    themeMode === 'fullDark' ||
    themeMode === 'canvasDark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const isSepia =
    themeMode === 'sepia' ||
    (typeof document !== 'undefined' && document.body.classList.contains('sepia-theme'));

  const containerBg = isDark
    ? 'bg-[#1e1e1e]/95 border-neutral-700/80 text-neutral-200 shadow-2xl backdrop-blur-md'
    : isSepia
    ? 'bg-[#fcf9f2]/95 border-[#cfc2aa] text-[#2c231c] shadow-2xl backdrop-blur-md'
    : 'bg-white/95 border-neutral-300/80 text-neutral-800 shadow-2xl backdrop-blur-md';

  const dividerClass = isDark
    ? 'bg-neutral-700/80'
    : isSepia
    ? 'bg-[#d8ccb8]'
    : 'bg-neutral-200';

  const primaryBlueBtn = isDark
    ? 'text-blue-400 hover:bg-blue-950/60 active:bg-blue-900/60'
    : isSepia
    ? 'text-[#185abd] hover:bg-[#ebd9bd] active:bg-[#dfcbb0]'
    : 'text-[#185abd] hover:bg-blue-50/90 active:bg-blue-100';

  const standardDarkBtn = isDark
    ? 'text-neutral-200 hover:bg-neutral-800 active:bg-neutral-700'
    : isSepia
    ? 'text-[#3f2e22] hover:bg-[#ebd9bd] active:bg-[#dfcbb0]'
    : 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200';

  const destructiveRedBtn = isDark
    ? 'text-red-400 hover:bg-red-950/60 active:bg-red-900/60'
    : isSepia
    ? 'text-[#b91c1c] hover:bg-[#fde8e8] active:bg-[#fbd3cf]'
    : 'text-red-600 hover:bg-red-50/90 active:bg-red-100';

  return createPortal(
    <div
      style={{ zIndex: 999998 }}
      className={`fixed bottom-9 left-1/2 -translate-x-1/2 ${containerBg} border rounded-xl px-1.5 py-1 flex items-center space-x-0.5 z-[999998] text-xs select-none no-print shadow-[0_10px_35px_-5px_rgba(0,0,0,0.25),0_4px_12px_rgba(0,0,0,0.12)] max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2`}
      role="toolbar"
      aria-label="Table quick actions"
    >
      {/* 1. Edit Toggle [ ⊞ ] Edit (Primary Blue) */}
      <button
        type="button"
        onClick={onOpenTableEdit}
        title="Edit Toggle (Open Table Edit Toolbar)"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${primaryBlueBtn} ${
          isTableEditOpen ? 'bg-blue-500/15 ring-1 ring-blue-500/40 font-bold' : ''
        }`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ ⊞ ] 4-pane window / table edit icon */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 12h18" />
            <path d="M12 3v18" />
          </svg>
        </span>
        <span className="text-[10px] font-semibold leading-none whitespace-nowrap mt-0.5">Edit</span>
      </button>

      {/* 2. Border Settings [ ▦ ] Border (Primary Blue) */}
      <button
        type="button"
        onClick={onOpenBorderEdit}
        title="Border Settings (Open Border Edit Toolbar)"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${primaryBlueBtn} ${
          isBorderEditOpen ? 'bg-blue-500/15 ring-1 ring-blue-500/40 font-bold' : ''
        }`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ ▦ ] 3x3 grid icon */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M3 15h18" />
            <path d="M9 3v18" />
            <path d="M15 3v18" />
          </svg>
        </span>
        <span className="text-[10px] font-semibold leading-none whitespace-nowrap mt-0.5">Border</span>
      </button>

      <div className={`w-px h-6 ${dividerClass} mx-0.5`} />

      {/* 3. Header Row Toggle [ ☰ ] Head Row (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="Toggle Header Row"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[48px] transition-all group ${standardDarkBtn} ${
          isHeaderRow ? 'bg-amber-500/15 ring-1 ring-amber-500/40 font-bold' : ''
        }`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ ☰ ] 3 horizontal lines / menu icon */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">Head Row</span>
      </button>

      {/* 4. Merge Cells [ ☷ ] Merge (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().mergeCells().run()}
        title="Merge Selected Cells"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ ☷ ] Merge cells icon */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M12 4v16" strokeDasharray="2 2" />
            <path d="M8 12h8" />
            <polyline points="10 10 12 12 10 14" />
            <polyline points="14 10 12 12 14 14" />
          </svg>
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">Merge</span>
      </button>

      {/* 5. Split Cells [ ✂ ] Split (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().splitCell().run()}
        title="Split Selected Cell"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ ✂ ] Scissors icon */}
          <Scissors size={15} />
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">Split</span>
      </button>

      <div className={`w-px h-6 ${dividerClass} mx-0.5`} />

      {/* 6. Add Row Above [ + ] + Row ↑ (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="Add Row Above"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[46px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ + ] Plus icon */}
          <Plus size={15} className="stroke-[2.8]" />
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">+ Row ↑</span>
      </button>

      {/* 7. Add Row Below [ + ] + Row ↓ (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Add Row Below"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[46px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ + ] Plus icon */}
          <Plus size={15} className="stroke-[2.8]" />
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">+ Row ↓</span>
      </button>

      {/* 8. Delete Row [ - ] - Row (Destructive Red) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Delete Row"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${destructiveRedBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ - ] Minus icon */}
          <Minus size={15} className="stroke-[3]" />
        </span>
        <span className="text-[10px] font-semibold leading-none whitespace-nowrap mt-0.5">- Row</span>
      </button>

      <div className={`w-px h-6 ${dividerClass} mx-0.5`} />

      {/* 9. Add Column Left [ + ] + Col ← (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add Column Left"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[46px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ + ] Plus icon */}
          <Plus size={15} className="stroke-[2.8]" />
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">+ Col ←</span>
      </button>

      {/* 10. Add Column Right [ + ] + Col → (Standard Dark) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Add Column Right"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[46px] transition-all group ${standardDarkBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ + ] Plus icon */}
          <Plus size={15} className="stroke-[2.8]" />
        </span>
        <span className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5">+ Col →</span>
      </button>

      {/* 11. Delete Column [ - ] - Col (Destructive Red) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Delete Column"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[42px] transition-all group ${destructiveRedBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ - ] Minus icon */}
          <Minus size={15} className="stroke-[3]" />
        </span>
        <span className="text-[10px] font-semibold leading-none whitespace-nowrap mt-0.5">- Col</span>
      </button>

      <div className={`w-px h-6 ${dividerClass} mx-0.5`} />

      {/* 12. Delete Table [ 🗑 ] Delete (Destructive Red) */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete Entire Table"
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg cursor-pointer min-w-[44px] transition-all group ${destructiveRedBtn}`}
      >
        <span className="flex items-center justify-center h-4.5 group-hover:scale-110 transition-transform">
          {/* [ 🗑 ] Trash icon */}
          <Trash2 size={15} />
        </span>
        <span className="text-[10px] font-semibold leading-none whitespace-nowrap mt-0.5">Delete</span>
      </button>
    </div>,
    document.body
  );
};

export default TableContextMenu;
