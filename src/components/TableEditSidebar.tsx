import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { findTable, CellSelection } from '@tiptap/pm/tables';
import {
  Table as TableIcon,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Rows,
  Columns,
  Minus,
  Combine,
  SplitSquareVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpToLine,
  ArrowDownToLine,
  MoveVertical,
  Palette,
  Eraser,
  TableProperties,
} from 'lucide-react';

export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

interface TableEditSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  enableTableHandle: boolean;
  onToggleEnableHandle: (enabled: boolean) => void;
  themeMode?: ThemeMode;
}

export const TableEditSidebar: React.FC<TableEditSidebarProps> = ({
  editor,
  onClose,
  enableTableHandle,
  onToggleEnableHandle,
  themeMode = 'light',
}) => {
  const [selectedStyle, setSelectedStyle] = useState<string>('Classic');

  // Theme-specific styles matching 4 dark/light modes
  const isSepia = themeMode === 'sepia';
  const isDark = themeMode === 'fullDark' || themeMode === 'canvasDark';

  const asideBg = isDark
    ? 'bg-[#1c1c1c] border-[#333] text-neutral-200'
    : isSepia
    ? 'bg-[#f5eedc] border-[#ded3be] text-[#2c231c]'
    : 'bg-white border-[#e2e8f0] text-slate-700';

  const headerBg = isDark
    ? 'bg-[#1f1f1f] text-neutral-100 border-b border-[#2d2d2d]'
    : isSepia
    ? 'bg-[#3f2e22] text-[#fbf8ee] border-b border-[#302218]'
    : 'bg-[#185abd] text-white';

  const sectionHeaderColor = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#7c4a1e]'
    : 'text-slate-500';

  const handleRowBg = isDark
    ? 'bg-[#242424] border-b border-[#333] text-neutral-200'
    : isSepia
    ? 'bg-[#ece3d0] border-b border-[#ded3be] text-[#2c231c]'
    : 'bg-slate-50/70 border-b border-[#e2e8f0] text-slate-800';

  const handleSubtextColor = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#7c6953]'
    : 'text-slate-400';

  const switchActiveBg = isDark
    ? 'bg-[#2563eb]'
    : isSepia
    ? 'bg-[#7c4a1e]'
    : 'bg-[#185abd]';

  const switchInactiveBg = isDark
    ? 'bg-neutral-600'
    : isSepia
    ? 'bg-[#cfbeaa]'
    : 'bg-slate-300';

  const dividerBorder = isDark
    ? 'border-[#2d2d2d]'
    : isSepia
    ? 'border-[#ded3be]'
    : 'border-slate-100';

  const btnNormal = isDark
    ? 'bg-[#252525] hover:bg-[#2d2d2d] border border-neutral-700 hover:border-neutral-600 text-neutral-200 shadow-2xs'
    : isSepia
    ? 'bg-[#fbf8ee] hover:bg-[#f0e7d5] border border-[#cfc2aa] hover:border-[#b8a68b] text-[#2c231c] shadow-2xs'
    : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs';

  const btnDelete = isDark
    ? 'bg-[#252525] hover:bg-rose-950/40 border border-rose-900/60 text-rose-400 shadow-2xs'
    : isSepia
    ? 'bg-[#fbf8ee] hover:bg-rose-50/80 border border-rose-300 text-rose-700 shadow-2xs'
    : 'bg-white hover:bg-rose-50/70 border border-rose-200 text-rose-600 shadow-2xs';

  const styleCardSelected = isDark
    ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
    : isSepia
    ? 'border-[#7c4a1e] bg-[#f0e7d5] ring-1 ring-[#7c4a1e]'
    : 'border-[#2563eb] bg-blue-50/40 ring-1 ring-[#2563eb]';

  const styleCardText = (isSelected: boolean) =>
    isSelected
      ? isDark
        ? 'text-blue-300 font-semibold'
        : isSepia
        ? 'text-[#7c4a1e] font-semibold'
        : 'text-[#2563eb] font-semibold'
      : isDark
      ? 'text-neutral-300'
      : isSepia
      ? 'text-[#2c231c]'
      : 'text-slate-700';

  // Table style themes matching the 3x3 grid in photo
  const tableStyles = [
    {
      id: 'Classic',
      name: 'Classic',
      headerBg: 'bg-[#2563eb]',
      rowBg: 'bg-[#eff6ff]',
      borderColor: 'border-[#93c5fd]',
      className: 'theme-azure',
    },
    {
      id: 'Dark',
      name: 'Dark',
      headerBg: 'bg-[#1e293b]',
      rowBg: 'bg-[#f8fafc]',
      borderColor: 'border-[#cbd5e1]',
      className: 'theme-charcoal',
    },
    {
      id: 'Green',
      name: 'Green',
      headerBg: 'bg-[#15803d]',
      rowBg: 'bg-[#f0fdf4]',
      borderColor: 'border-[#bbf7d0]',
      className: 'theme-green',
    },
    {
      id: 'Orange',
      name: 'Orange',
      headerBg: 'bg-[#ea580c]',
      rowBg: 'bg-[#fff7ed]',
      borderColor: 'border-[#fed7aa]',
      className: 'theme-orange',
    },
    {
      id: 'Purple',
      name: 'Purple',
      headerBg: 'bg-[#7e22ce]',
      rowBg: 'bg-[#faf5ff]',
      borderColor: 'border-[#e9d5ff]',
      className: 'theme-purple',
    },
    {
      id: 'Red',
      name: 'Red',
      headerBg: 'bg-[#b91c1c]',
      rowBg: 'bg-[#fef2f2]',
      borderColor: 'border-[#fecaca]',
      className: 'theme-red',
    },
    {
      id: 'Teal',
      name: 'Teal',
      headerBg: 'bg-[#0f766e]',
      rowBg: 'bg-[#f0fdfa]',
      borderColor: 'border-[#99f6e4]',
      className: 'theme-teal',
    },
    {
      id: 'Plain',
      name: 'Plain',
      headerBg: 'bg-white',
      rowBg: 'bg-white',
      borderColor: 'border-[#cbd5e1]',
      className: 'theme-white',
    },
    {
      id: 'Minimal',
      name: 'Minimal',
      headerBg: 'bg-transparent',
      rowBg: 'bg-transparent',
      borderColor: 'border-transparent',
      className: 'borders-minimal',
      isMinimal: true,
    },
  ];

  // 15 Cell background color swatches (3 rows of 5)
  const backgroundColors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#dbeafe', '#fef3c7',
    '#ecfdf5', '#dcfce7', '#ffe4e6', '#f3e8ff', '#e0e7ff',
    '#fce7f3', '#ccfbf1', '#e2e8f0', '#cbd5e1', '#94a3b8',
  ];

  // 8 Cell text colors
  const textColors = [
    { color: '#0f172a', bg: 'bg-[#0f172a]', text: 'text-white' },
    { color: '#ffffff', bg: 'bg-white border border-slate-300', text: 'text-slate-700' },
    { color: '#ef4444', bg: 'bg-[#ef4444]', text: 'text-white' },
    { color: '#f59e0b', bg: 'bg-[#f59e0b]', text: 'text-white' },
    { color: '#10b981', bg: 'bg-[#10b981]', text: 'text-white' },
    { color: '#3b82f6', bg: 'bg-[#3b82f6]', text: 'text-white' },
    { color: '#8b5cf6', bg: 'bg-[#8b5cf6]', text: 'text-white' },
    { color: '#ec4899', bg: 'bg-[#ec4899]', text: 'text-white' },
  ];

  // Apply Table Theme
  const handleApplyTheme = (styleItem: typeof tableStyles[0]) => {
    setSelectedStyle(styleItem.id);
    if (!editor) return;

    if (!editor.isActive('table')) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }

    setTimeout(() => {
      const proseMirrorDom = editor.view.dom;
      const tables = proseMirrorDom.querySelectorAll('table');
      if (tables.length > 0) {
        let targetTable = tables[tables.length - 1];
        tables.forEach((t) => {
          if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
            targetTable = t;
          }
        });

        // Clear existing style classes
        tableStyles.forEach((s) => targetTable.classList.remove(s.className));
        targetTable.classList.remove('borders-minimal', 'borders-none');

        // Apply new style class
        targetTable.classList.add(styleItem.className);
      }
    }, 40);
  };

  // Clear Table Style
  const handleClearStyle = () => {
    setSelectedStyle('');
    if (!editor) return;
    const proseMirrorDom = editor.view.dom;
    const tables = proseMirrorDom.querySelectorAll('table');
    tables.forEach((t) => {
      tableStyles.forEach((s) => t.classList.remove(s.className));
      t.classList.remove('borders-minimal', 'borders-none');
    });
  };

  // Apply Cell Background
  const handleCellBackground = (color: string) => {
    if (!editor) return;
    const { state, view } = editor;
    const isCellSelection = state.selection instanceof CellSelection;

    if (isCellSelection) {
      const tr = state.tr;
      (state.selection as any).forEachCell((cell: any, pos: number) => {
        let cs = (cell.attrs.style || '') as string;
        cs = cs.replace(/background(-color)?:\s*[^;]+;?/gi, '').trim();
        if (color) cs = `${cs} background-color: ${color};`.trim();
        tr.setNodeMarkup(pos, undefined, { ...cell.attrs, style: cs || null });
      });
      view.dispatch(tr);
    } else {
      const tableInfo = findTable(state.selection.$from);
      if (tableInfo) {
        const tr = state.tr;
        state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            let cs = (node.attrs.style || '') as string;
            cs = cs.replace(/background(-color)?:\s*[^;]+;?/gi, '').trim();
            if (color) cs = `${cs} background-color: ${color};`.trim();
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: cs || null });
          }
        });
        view.dispatch(tr);
      }
    }

    const selection = window.getSelection();
    let cell = selection?.anchorNode as HTMLElement | null;
    while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH' && cell !== document.body) {
      cell = cell.parentElement;
    }
    if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
      cell.style.backgroundColor = color;
    } else {
      const proseMirrorDom = editor.view.dom;
      const activeCells = proseMirrorDom.querySelectorAll('.selectedCell, td:focus-within, th:focus-within');
      if (activeCells.length > 0) {
        activeCells.forEach((c) => ((c as HTMLElement).style.backgroundColor = color));
      }
    }
  };

  // Clear Cell Background (No Fill)
  const handleNoFill = () => {
    handleCellBackground('');
  };

  // Apply Vertical Alignment
  const handleVerticalAlign = (align: 'top' | 'middle' | 'bottom') => {
    if (!editor) return;
    const { state, view } = editor;
    const isCellSelection = state.selection instanceof CellSelection;

    if (isCellSelection) {
      const tr = state.tr;
      (state.selection as any).forEachCell((cell: any, pos: number) => {
        let cs = (cell.attrs.style || '') as string;
        cs = cs.replace(/vertical-align:\s*[^;]+;?/gi, '').trim();
        cs = `${cs} vertical-align: ${align};`.trim();
        tr.setNodeMarkup(pos, undefined, { ...cell.attrs, style: cs || null });
      });
      view.dispatch(tr);
    } else {
      const tableInfo = findTable(state.selection.$from);
      if (tableInfo) {
        const tr = state.tr;
        state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            let cs = (node.attrs.style || '') as string;
            cs = cs.replace(/vertical-align:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} vertical-align: ${align};`.trim();
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: cs || null });
          }
        });
        view.dispatch(tr);
      }
    }

    const selection = window.getSelection();
    let cell = selection?.anchorNode as HTMLElement | null;
    while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH' && cell !== document.body) {
      cell = cell.parentElement;
    }
    if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
      cell.style.verticalAlign = align;
    } else {
      const proseMirrorDom = editor.view.dom;
      const activeCells = proseMirrorDom.querySelectorAll('.selectedCell, td:focus-within, th:focus-within');
      if (activeCells.length > 0) {
        activeCells.forEach((c) => ((c as HTMLElement).style.verticalAlign = align));
      }
    }
  };

  return (
    <aside
      className={`w-80 border-l flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200 ${asideBg}`}
      aria-label="Table Edit Toolbar"
    >
      {/* 1. Header (Adaptive: Word Blue for Light, Warm Chestnut for Sepia, Dark Charcoal for Dark modes) */}
      <div className={`h-12 flex items-center justify-between px-4 shrink-0 shadow-xs ${headerBg}`}>
        <div className="flex items-center space-x-2">
          <TableIcon size={18} strokeWidth={2.2} />
          <h2 className="font-semibold text-[15px] tracking-tight">Table Edit</h2>
        </div>

        <button
          onClick={onClose}
          title="Close Table Edit"
          className="opacity-80 hover:opacity-100 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Enable Table Handle Row */}
      <div className={`px-4 py-3 flex items-center justify-between shrink-0 ${handleRowBg}`}>
        <div className="flex flex-col">
          <span className="text-xs font-semibold">Enable table handle</span>
          <span className={`text-[10px] ${handleSubtextColor}`}>Auto-activate toolbar when a table is focused</span>
        </div>
        <button
          role="switch"
          aria-checked={enableTableHandle}
          onClick={() => onToggleEnableHandle(!enableTableHandle)}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${
            enableTableHandle ? switchActiveBg : switchInactiveBg
          }`}
          title="Toggle auto activate on table focus"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
              enableTableHandle ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 3. Scrollable Tool Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ROWS SECTION */}
        <div className="space-y-2">
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            <Rows size={14} className="opacity-70" />
            <span>Rows</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => editor?.chain().focus().addRowBefore().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowUp size={13} className="opacity-70" />
              <span>Insert Above</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowDown size={13} className="opacity-70" />
              <span>Insert Below</span>
            </button>
          </div>
          <button
            onClick={() => editor?.chain().focus().deleteRow().run()}
            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 font-medium rounded-lg cursor-pointer transition-all ${btnDelete}`}
          >
            <Minus size={13} />
            <span>Delete Row</span>
          </button>
        </div>

        {/* COLUMNS SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder}`}>
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            <Columns size={14} className="opacity-70" />
            <span>Columns</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => editor?.chain().focus().addColumnBefore().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowLeft size={13} className="opacity-70" />
              <span>Insert Left</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowRight size={13} className="opacity-70" />
              <span>Insert Right</span>
            </button>
          </div>
          <button
            onClick={() => editor?.chain().focus().deleteColumn().run()}
            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 font-medium rounded-lg cursor-pointer transition-all ${btnDelete}`}
          >
            <Minus size={13} />
            <span>Delete Column</span>
          </button>
        </div>

        {/* CELLS SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            Cells
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => editor?.chain().focus().mergeCells().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
              title="Merge selected cells"
            >
              <Combine size={14} className="opacity-70" />
              <span>Merge</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().splitCell().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
              title="Split selected cell"
            >
              <SplitSquareVertical size={14} className="opacity-70" />
              <span>Split</span>
            </button>
          </div>
        </div>

        {/* CELL ALIGNMENT SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            Cell Alignment
          </div>
          {/* Horizontal Alignment */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              title="Align Left"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              title="Align Center"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              title="Align Right"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <AlignRight size={16} />
            </button>
          </div>
          {/* Vertical Alignment */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleVerticalAlign('top')}
              title="Align Top"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowUpToLine size={15} />
            </button>
            <button
              onClick={() => handleVerticalAlign('middle')}
              title="Align Middle"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <MoveVertical size={15} />
            </button>
            <button
              onClick={() => handleVerticalAlign('bottom')}
              title="Align Bottom"
              className={`py-1.5 flex items-center justify-center rounded-lg cursor-pointer transition-all ${btnNormal}`}
            >
              <ArrowDownToLine size={15} />
            </button>
          </div>
        </div>

        {/* TABLE STYLE SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            Table Style
          </div>
          {/* 3x3 Grid of Style Cards */}
          <div className="grid grid-cols-3 gap-2">
            {tableStyles.map((style) => {
              const isSelected = selectedStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => handleApplyTheme(style)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                    isSelected ? styleCardSelected : btnNormal
                  }`}
                >
                  {/* Miniature Visual Table */}
                  <div className={`w-full h-8 border rounded overflow-hidden flex flex-col mb-1.5 ${
                    isDark ? 'border-neutral-600 bg-neutral-900' : isSepia ? 'border-[#cfc2aa] bg-[#fbf8ee]' : 'border-slate-300 bg-white'
                  }`}>
                    {style.isMinimal ? (
                      <div className="w-full h-full flex flex-col justify-between py-1 px-1">
                        <div className={`w-full h-0.5 ${isDark ? 'bg-neutral-300' : 'bg-slate-700'}`} />
                        <div className={`w-full h-px ${isDark ? 'bg-neutral-700' : 'bg-slate-300'}`} />
                        <div className={`w-full h-px ${isDark ? 'bg-neutral-700' : 'bg-slate-300'}`} />
                      </div>
                    ) : (
                      <>
                        <div className={`w-full h-3.5 ${style.headerBg} grid grid-cols-3 divide-x divide-white/30`} />
                        <div className={`w-full flex-1 ${style.rowBg} grid grid-cols-3 divide-x ${
                          isDark ? 'divide-neutral-700' : 'divide-slate-200'
                        }`} />
                      </>
                    )}
                  </div>
                  <span className={`text-[11px] leading-none ${styleCardText(isSelected)}`}>
                    {style.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action buttons below grid: Header Row & Clear Style */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <TableProperties size={13} className="opacity-70" />
              <span>Header Row</span>
            </button>
            <button
              onClick={handleClearStyle}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-medium cursor-pointer transition-all ${btnNormal}`}
            >
              <Eraser size={13} className="opacity-70" />
              <span>Clear Style</span>
            </button>
          </div>
        </div>

        {/* CELL BACKGROUND SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder}`}>
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            <Palette size={14} className="opacity-70" />
            <span>Cell Background</span>
          </div>

          {/* 3 rows of 5 swatches */}
          <div className="grid grid-cols-5 gap-2">
            {backgroundColors.map((color, idx) => (
              <button
                key={idx}
                onClick={() => handleCellBackground(color)}
                style={{ backgroundColor: color }}
                className="w-full h-8 rounded-lg border border-black/10 hover:border-black/30 dark:border-white/20 cursor-pointer shadow-2xs hover:scale-105 transition-all"
                title={`Background ${color}`}
              />
            ))}
          </div>

          {/* No Fill Button */}
          <button
            onClick={handleNoFill}
            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 font-medium rounded-lg cursor-pointer transition-all mt-1 ${btnNormal}`}
          >
            <Eraser size={13} className="opacity-70" />
            <span>No Fill</span>
          </button>
        </div>

        {/* CELL TEXT COLOR SECTION */}
        <div className={`space-y-2 pt-1 border-t ${dividerBorder} pb-2`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            Cell Text Color
          </div>

          <div className="flex items-center justify-between gap-1.5">
            {textColors.map((item, idx) => (
              <button
                key={idx}
                onClick={() => editor?.chain().focus().setColor(item.color).run()}
                className={`w-7 h-7 rounded-md ${item.bg} ${item.text} font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs hover:scale-110 transition-transform`}
                title={`Text Color ${item.color}`}
              >
                A
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
