import React, { useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { findTable, TableMap, CellSelection } from '@tiptap/pm/tables';
import {
  CheckCircle2,
  X,
  Ban,
  Square,
  Grid,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
  Eraser,
  Check,
  ChevronDown,
} from 'lucide-react';

export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

interface BorderEditSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  enableBorderHandle: boolean;
  onToggleEnableHandle: (enabled: boolean) => void;
  themeMode?: ThemeMode;
}

export const BorderEditSidebar: React.FC<BorderEditSidebarProps> = ({
  editor,
  onClose,
  enableBorderHandle,
  onToggleEnableHandle,
  themeMode = 'light',
}) => {
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

  const feedbackBanner = isDark
    ? 'bg-blue-950/50 border-b border-blue-800 text-blue-300'
    : isSepia
    ? 'bg-[#fbf4e6] border-b border-[#d8be9b] text-[#543011]'
    : 'bg-blue-50 border-b border-blue-200 text-[#185abd]';

  const btnNormal = isDark
    ? 'bg-[#252525] hover:bg-[#2d2d2d] border border-neutral-700 hover:border-neutral-600 text-neutral-200 shadow-2xs'
    : isSepia
    ? 'bg-[#fbf8ee] hover:bg-[#f0e7d5] border border-[#cfc2aa] hover:border-[#b8a68b] text-[#2c231c] shadow-2xs'
    : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs';

  const btnActive = isDark
    ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-semibold ring-1 ring-blue-500'
    : isSepia
    ? 'border-[#7c4a1e] bg-[#f0e7d5] text-[#543011] font-semibold ring-1 ring-[#7c4a1e]'
    : 'border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-semibold ring-1 ring-[#2563eb]';

  const btnCellActive = isDark
    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold ring-1 ring-emerald-500'
    : isSepia
    ? 'border-[#226343] bg-[#eef7f2] text-[#1a4f35] font-semibold ring-1 ring-[#226343]'
    : 'border-emerald-600 bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-600';

  const bottomFooterBg = isDark
    ? 'border-[#333] bg-[#1c1c1c]'
    : isSepia
    ? 'border-[#ded3be] bg-[#f5eedc]'
    : 'border-[#e2e8f0] bg-white';

  const btnClear = isDark
    ? 'bg-[#252525] hover:bg-[#2d2d2d] border border-neutral-700 text-neutral-200 shadow-2xs'
    : isSepia
    ? 'bg-[#fbf8ee] hover:bg-[#ece3d0] border border-[#cfc2aa] text-[#2c231c] shadow-2xs'
    : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-2xs';

  const btnCellApply = isDark
    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
    : isSepia
    ? 'bg-[#226343] hover:bg-[#1a4f35] text-white'
    : 'bg-[#15803d] hover:bg-[#166534] text-white';

  const btnTableApply = isDark
    ? 'bg-[#2563eb] hover:bg-blue-600 text-white'
    : isSepia
    ? 'bg-[#7c4a1e] hover:bg-[#603814] text-white'
    : 'bg-[#185abd] hover:bg-[#154c9e] text-white';

  const panelCardBg = isDark
    ? 'bg-[#242424] border-neutral-700'
    : isSepia
    ? 'bg-[#fbf8ee] border-[#cfc2aa]'
    : 'bg-slate-50/70 border-slate-200';

  // Cell border type: 'outline' | 'none' | 'all' | 'top' | 'bottom' | 'left' | 'right'
  const [cellBorderType, setCellBorderType] = useState<string>('outline');

  // Table border type: 'all' | 'outline' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right'
  const [tableBorderType, setTableBorderType] = useState<string>('all');

  // Line style: 'solid' | 'dashed' | 'dotted'
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // Thickness: '1px' | '2px' | '3px'
  const [thickness, setThickness] = useState<string>('1px');

  // Current border color
  const [color, setColor] = useState<string>('#000000');

  // Cell Background Color
  const [cellColor, setCellColor] = useState<string>('#ffffff');

  // Transient feedback badge
  const [feedback, setFeedback] = useState<string | null>(null);

  // Hidden native color inputs
  const colorInputRef = useRef<HTMLInputElement>(null);
  const cellColorInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Palette 8 swatches
  const paletteColors = [
    '#000000',
    '#334155',
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea',
    '#ea580c',
    '#0d9488',
  ];

  // Locate active table in ProseMirror doc
  const getTableInfo = useCallback(() => {
    if (!editor) return null;
    const { state } = editor;

    // 1. Try from active selection
    let table = findTable(state.selection.$from);
    if (table) return table;

    // 2. If focus moved to sidebar, find the last table in doc
    let lastTablePos = -1;
    let lastTableNode: any = null;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        lastTablePos = pos;
        lastTableNode = node;
      }
    });

    if (lastTablePos !== -1 && lastTableNode) {
      return {
        pos: lastTablePos,
        start: lastTablePos + 1,
        depth: 1,
        node: lastTableNode,
      };
    }

    return null;
  }, [editor]);

  // Ensure table exists; if not, create one and return tableInfo
  const ensureTable = useCallback(() => {
    if (!editor) return null;
    let info = getTableInfo();
    if (!info) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      info = getTableInfo();
    }
    return info;
  }, [editor, getTableInfo]);

  // Find DOM table matching ProseMirror table
  const getDomTable = useCallback((view: any) => {
    const domTables = view.dom.querySelectorAll('table');
    if (domTables.length === 0) return null;
    let target = domTables[domTables.length - 1] as HTMLTableElement;
    domTables.forEach((t: HTMLTableElement) => {
      if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
        target = t;
      }
    });
    return target;
  }, []);

  /**
   * 1. CELL STYLES APPLICATOR
   * Controls styles applied specifically to individual cells or selected cells.
   * Architecture:
   * Uses separate attributes (borderTop, borderRight, borderBottom, borderLeft)
   * in a SINGLE transaction without repetitive commands.
   *
   * Outline behavior for selection rectangle:
   * top row → borderTop
   * bottom row → borderBottom
   * left column → borderLeft
   * right column → borderRight
   */
  const applyCellStyles = useCallback(
    (
      type: string = cellBorderType,
      st: string = lineStyle,
      th: string = thickness,
      col: string = color
    ) => {
      if (!editor) return;
      const tableInfo = ensureTable();
      if (!tableInfo) return;

      const { state, view } = editor;
      const { node: tableNode, start: tableStart } = tableInfo;
      const map = TableMap.get(tableNode);
      const totalRows = map.height;
      const totalCols = map.width;

      const borderVal = `${th} ${st} ${col}`;
      const lightGuide = `1px dashed #cbd5e1`;
      const tr = state.tr;
      const isCellSelection = state.selection instanceof CellSelection;
      const domTable = getDomTable(view);

      // Collect cells to update with coordinates
      const cellsToUpdate: { cell: any; pos: number; r: number; c: number }[] = [];
      let minRow = Infinity,
        maxRow = -Infinity;
      let minCol = Infinity,
        maxCol = -Infinity;

      if (isCellSelection) {
        const cellSelection = state.selection as any;
        cellSelection.forEachCell((cell: any, pos: number) => {
          const offset = pos - tableStart;
          for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
              if (map.map[r * totalCols + c] === offset) {
                minRow = Math.min(minRow, r);
                maxRow = Math.max(maxRow, r);
                minCol = Math.min(minCol, c);
                maxCol = Math.max(maxCol, c);
                cellsToUpdate.push({ cell, pos, r, c });
                break;
              }
            }
          }
        });
      } else {
        // Single active cell (cursor in cell)
        const $from = state.selection.$from;
        let cellPos = -1;
        let cellNode: any = null;
        for (let d = $from.depth; d > 0; d--) {
          const n = $from.node(d);
          if (n.type.name === 'tableCell' || n.type.name === 'tableHeader') {
            cellPos = $from.before(d);
            cellNode = n;
            break;
          }
        }

        if (!cellNode) {
          const cellOffset = map.map[0];
          cellPos = tableStart + cellOffset;
          cellNode = tableNode.nodeAt(cellOffset);
        }

        if (cellNode && cellPos !== -1) {
          const offset = cellPos - tableStart;
          let cellR = 0;
          let cellC = 0;
          for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
              if (map.map[r * totalCols + c] === offset) {
                cellR = r;
                cellC = c;
                break;
              }
            }
          }
          minRow = cellR;
          maxRow = cellR;
          minCol = cellC;
          maxCol = cellC;
          cellsToUpdate.push({ cell: cellNode, pos: cellPos, r: cellR, c: cellC });
        }
      }

      if (cellsToUpdate.length === 0) return;

      // Apply in ONE single transaction
      cellsToUpdate.forEach(({ cell, pos, r, c }) => {
        let bTop = cell.attrs.borderTop || null;
        let bRight = cell.attrs.borderRight || null;
        let bBottom = cell.attrs.borderBottom || null;
        let bLeft = cell.attrs.borderLeft || null;

        if (type === 'outline') {
          // Perimeter of selection
          if (r === minRow) bTop = borderVal;
          if (r === maxRow) bBottom = borderVal;
          if (c === minCol) bLeft = borderVal;
          if (c === maxCol) bRight = borderVal;
        } else if (type === 'all') {
          bTop = borderVal;
          bRight = borderVal;
          bBottom = borderVal;
          bLeft = borderVal;
        } else if (type === 'none') {
          bTop = lightGuide;
          bRight = lightGuide;
          bBottom = lightGuide;
          bLeft = lightGuide;
        } else if (type === 'top') {
          bTop = borderVal;
        } else if (type === 'bottom') {
          bBottom = borderVal;
        } else if (type === 'left') {
          bLeft = borderVal;
        } else if (type === 'right') {
          bRight = borderVal;
        }

        const styles: string[] = [];
        if (cell.attrs.style) {
          // Remove old border declarations from style string
          const cleaned = cell.attrs.style.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();
          if (cleaned) styles.push(cleaned);
        }
        if (bTop) styles.push(`border-top: ${bTop}`);
        if (bRight) styles.push(`border-right: ${bRight}`);
        if (bBottom) styles.push(`border-bottom: ${bBottom}`);
        if (bLeft) styles.push(`border-left: ${bLeft}`);

        tr.setNodeMarkup(pos, undefined, {
          ...cell.attrs,
          borderTop: bTop,
          borderRight: bRight,
          borderBottom: bBottom,
          borderLeft: bLeft,
          style: styles.join('; ') || null,
        });

        // Instant DOM sync
        if (domTable) {
          const rowEl = domTable.rows[r];
          if (rowEl) {
            const cellEl = rowEl.cells[c] as HTMLElement | undefined;
            if (cellEl) {
              cellEl.style.borderTop = bTop || '';
              cellEl.style.borderRight = bRight || '';
              cellEl.style.borderBottom = bBottom || '';
              cellEl.style.borderLeft = bLeft || '';
            }
          }
        }
      });

      view.dispatch(tr);
      showFeedback(`Cell Apply: ${type} border applied`);
    },
    [editor, ensureTable, getDomTable, cellBorderType, lineStyle, thickness, color]
  );

  /**
   * 2. TABLE STYLES APPLICATOR
   * Controls styles applied to the table as a whole.
   * Architecture:
   * Updates all table cells in ONE transaction using individual border attributes
   * and sets the table-level style and class.
   */
  const applyTableStyles = useCallback(
    (
      typeToApply: string = tableBorderType,
      styleToApply: string = lineStyle,
      widthToApply: string = thickness,
      colorToApply: string = color
    ) => {
      if (!editor) return;
      const tableInfo = ensureTable();
      if (!tableInfo) return;

      const { state, view } = editor;
      const { node: tableNode, start: tableStart, pos: tablePos } = tableInfo;
      const map = TableMap.get(tableNode);
      const totalRows = map.height;
      const totalCols = map.width;

      const borderVal = `${widthToApply} ${styleToApply} ${colorToApply}`;
      const lightGuide = `1px dashed #cbd5e1`;
      const tr = state.tr;
      const domTable = getDomTable(view);

      let tableStyle = (tableNode.attrs.style || '') as string;
      tableStyle = tableStyle.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();

      // Configure table-level node markup
      if (typeToApply === 'none') {
        tableStyle = `${tableStyle} border: none; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: 'borders-none',
        });
      } else if (typeToApply === 'inside') {
        tableStyle = `${tableStyle} border: none; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: null,
        });
      } else if (typeToApply === 'outline' || typeToApply === 'all') {
        tableStyle = `${tableStyle} border: ${borderVal}; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: null,
        });
      } else if (typeToApply === 'top' || typeToApply === 'bottom' || typeToApply === 'left' || typeToApply === 'right') {
        tableStyle = `${tableStyle} border-${typeToApply}: ${borderVal}; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: null,
        });
      }

      // Configure all cells in the table in ONE transaction
      for (let r = 0; r < totalRows; r++) {
        for (let c = 0; c < totalCols; c++) {
          const cellOffset = map.map[r * totalCols + c];
          const cellPos = tableStart + cellOffset;
          const cellNode = tableNode.nodeAt(cellOffset);
          if (!cellNode) continue;

          let bTop = cellNode.attrs.borderTop || null;
          let bRight = cellNode.attrs.borderRight || null;
          let bBottom = cellNode.attrs.borderBottom || null;
          let bLeft = cellNode.attrs.borderLeft || null;

          if (typeToApply === 'all') {
            bTop = borderVal;
            bRight = borderVal;
            bBottom = borderVal;
            bLeft = borderVal;
          } else if (typeToApply === 'none') {
            bTop = lightGuide;
            bRight = lightGuide;
            bBottom = lightGuide;
            bLeft = lightGuide;
          } else if (typeToApply === 'outline') {
            // Outline sets the outer perimeter of the whole table, without corrupting interior cells
            if (r === 0) bTop = borderVal;
            if (r === totalRows - 1) bBottom = borderVal;
            if (c === 0) bLeft = borderVal;
            if (c === totalCols - 1) bRight = borderVal;
          } else if (typeToApply === 'inside') {
            bTop = null;
            bLeft = null;
            bBottom = r < totalRows - 1 ? borderVal : null;
            bRight = c < totalCols - 1 ? borderVal : null;
          } else if (typeToApply === 'top') {
            if (r === 0) bTop = borderVal;
          } else if (typeToApply === 'bottom') {
            if (r === totalRows - 1) bBottom = borderVal;
          } else if (typeToApply === 'left') {
            if (c === 0) bLeft = borderVal;
          } else if (typeToApply === 'right') {
            if (c === totalCols - 1) bRight = borderVal;
          }

          const styles: string[] = [];
          if (cellNode.attrs.style) {
            const cleaned = cellNode.attrs.style.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();
            if (cleaned) styles.push(cleaned);
          }
          if (bTop) styles.push(`border-top: ${bTop}`);
          if (bRight) styles.push(`border-right: ${bRight}`);
          if (bBottom) styles.push(`border-bottom: ${bBottom}`);
          if (bLeft) styles.push(`border-left: ${bLeft}`);

          tr.setNodeMarkup(cellPos, undefined, {
            ...cellNode.attrs,
            borderTop: bTop,
            borderRight: bRight,
            borderBottom: bBottom,
            borderLeft: bLeft,
            style: styles.join('; ') || null,
          });

          // Direct DOM sync
          if (domTable) {
            const rowEl = domTable.rows[r];
            if (rowEl) {
              const cellEl = rowEl.cells[c] as HTMLElement | undefined;
              if (cellEl) {
                cellEl.style.borderTop = bTop || '';
                cellEl.style.borderRight = bRight || '';
                cellEl.style.borderBottom = bBottom || '';
                cellEl.style.borderLeft = bLeft || '';
              }
            }
          }
        }
      }

      // Synchronize DOM table element
      if (domTable) {
        if (typeToApply === 'none') {
          domTable.style.border = 'none';
          domTable.classList.add('borders-none');
        } else {
          domTable.classList.remove('borders-none', 'borders-minimal');
          if (typeToApply === 'all' || typeToApply === 'outline') {
            domTable.style.border = borderVal;
          } else if (typeToApply === 'top' || typeToApply === 'bottom' || typeToApply === 'left' || typeToApply === 'right') {
            (domTable.style as any)[`border${typeToApply.charAt(0).toUpperCase() + typeToApply.slice(1)}`] = borderVal;
          } else {
            domTable.style.border = 'none';
          }
        }
      }

      view.dispatch(tr);
      showFeedback(`Table Apply: ${typeToApply} borders applied to whole table`);
    },
    [editor, ensureTable, getDomTable, tableBorderType, lineStyle, thickness, color]
  );

  // Clear all borders & custom backgrounds back to default
  const handleClear = () => {
    if (!editor) return;
    const tableInfo = ensureTable();
    if (!tableInfo) return;

    const { state, view } = editor;
    const { node: tableNode, start: tableStart, pos: tablePos } = tableInfo;
    const map = TableMap.get(tableNode);

    const tr = state.tr;
    tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, style: null, class: null });

    for (let i = 0; i < map.map.length; i++) {
      const cellOffset = map.map[i];
      const cellPos = tableStart + cellOffset;
      const cellNode = tableNode.nodeAt(cellOffset);
      if (cellNode) {
        tr.setNodeMarkup(cellPos, undefined, {
          ...cellNode.attrs,
          borderTop: null,
          borderRight: null,
          borderBottom: null,
          borderLeft: null,
          backgroundColor: null,
          style: null,
        });
      }
    }

    view.dispatch(tr);

    // Direct DOM sync
    const tables = view.dom.querySelectorAll('table');
    tables.forEach((t) => {
      t.style.border = '';
      t.classList.remove('borders-none', 'borders-minimal');
      t.querySelectorAll('td, th').forEach((c) => {
        const el = c as HTMLElement;
        el.style.border = '';
        el.style.borderTop = '';
        el.style.borderRight = '';
        el.style.borderBottom = '';
        el.style.borderLeft = '';
        el.style.backgroundColor = '';
      });
    });

    showFeedback('Reset table borders to default');
  };

  // Apply cell background fill
  const handleApplyCellColor = () => {
    if (!editor) return;
    const { state, view } = editor;
    const isCellSelection = state.selection instanceof CellSelection;
    const tableInfo = ensureTable();
    if (!tableInfo) return;

    const tr = state.tr;
    let appliedCount = 0;

    if (isCellSelection) {
      const cellSelection = state.selection as any;
      cellSelection.forEachCell((cell: any, pos: number) => {
        const cs = ((cell.attrs.style || '') as string)
          .replace(/background(-color)?:\s*[^;]+;?/gi, '')
          .trim();
        const combined = `${cs} background-color: ${cellColor};`.trim();
        tr.setNodeMarkup(pos, undefined, {
          ...cell.attrs,
          backgroundColor: cellColor,
          style: combined,
        });
        appliedCount++;
      });
    } else {
      const { node: tableNode, start: tableStart } = tableInfo;
      const map = TableMap.get(tableNode);
      const cellOffset = map.map[0];
      const cellPos = tableStart + cellOffset;
      const cellNode = tableNode.nodeAt(cellOffset);
      if (cellNode) {
        const cs = ((cellNode.attrs.style || '') as string)
          .replace(/background(-color)?:\s*[^;]+;?/gi, '')
          .trim();
        const combined = `${cs} background-color: ${cellColor};`.trim();
        tr.setNodeMarkup(cellPos, undefined, {
          ...cellNode.attrs,
          backgroundColor: cellColor,
          style: combined,
        });
        appliedCount = 1;
      }
    }

    if (appliedCount > 0) {
      view.dispatch(tr);
      showFeedback(`Cell background updated (${cellColor})`);
    }
  };

  return (
    <aside
      className={`w-80 border-l flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200 ${asideBg}`}
      aria-label="Border Edit Toolbar"
    >
      {/* 1. Header */}
      <div className={`h-12 flex items-center justify-between px-4 shrink-0 shadow-xs ${headerBg}`}>
        <div className="flex items-center space-x-2">
          <CheckCircle2 size={18} strokeWidth={2.2} />
          <h2 className="font-semibold text-[15px] tracking-tight">Border Edit</h2>
        </div>

        <button
          onClick={onClose}
          title="Close Border Edit"
          className="opacity-80 hover:opacity-100 p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Enable Border Handle Toggle */}
      <div className={`px-4 py-2 flex items-center justify-between shrink-0 ${handleRowBg}`}>
        <div className="flex flex-col">
          <span className="text-xs font-semibold">Enable border handle</span>
          <span className={`text-[10px] ${handleSubtextColor}`}>Auto-activate toolbar when a table is focused</span>
        </div>
        <button
          role="switch"
          aria-checked={enableBorderHandle}
          onClick={() => onToggleEnableHandle(!enableBorderHandle)}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${
            enableBorderHandle ? switchActiveBg : switchInactiveBg
          }`}
          title="Toggle auto activate on table focus (deactivated by default)"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
              enableBorderHandle ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Dynamic Feedback Notification */}
      {feedback && (
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center space-x-1.5 animate-in fade-in duration-150 ${feedbackBanner}`}>
          <Check size={14} className="shrink-0" />
          <span className="truncate">{feedback}</span>
        </div>
      )}

      {/* 3. Scrollable Toolbar Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* LINE STYLE & THICKNESS CONTROLS */}
        <div className="space-y-2">
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${sectionHeaderColor}`}>
            <span>Line Style &amp; Thickness</span>
            <span className="text-[10px] opacity-70 capitalize">{lineStyle} &bull; {thickness}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'solid', label: 'Solid' },
              { id: 'dashed', label: 'Dashed' },
              { id: 'dotted', label: 'Dotted' },
            ].map((item) => {
              const isActive = lineStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setLineStyle(item.id as any)}
                  title={`Set Line Style to ${item.label}`}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <div
                    className={`w-10 h-0.5 mb-1 ${
                      item.id === 'solid'
                        ? 'bg-current'
                        : item.id === 'dashed'
                        ? 'border-b-2 border-dashed border-current'
                        : 'border-b-2 border-dotted border-current'
                    }`}
                  />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[
              { id: '1px', label: '1px', h: 'h-[1.5px]' },
              { id: '2px', label: '2px', h: 'h-[2.5px]' },
              { id: '3px', label: '3px', h: 'h-[3.5px]' },
            ].map((item) => {
              const isActive = thickness === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setThickness(item.id)}
                  title={`Set Thickness to ${item.label}`}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <div className={`w-10 ${item.h} bg-current mb-1`} />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BORDER COLOR SECTION */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${sectionHeaderColor}`}>
            <span>Border Color</span>
            <span className="font-mono text-[10px] opacity-70">{color.toUpperCase()}</span>
          </div>

          {/* Row 1: 8 Color Swatches */}
          <div className="grid grid-cols-8 gap-1">
            {paletteColors.map((c) => {
              const isSelected = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6.5 h-6.5 rounded-md border transition-transform cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 border-neutral-400'
                        : isSepia
                        ? 'ring-2 ring-[#7c4a1e] ring-offset-1 scale-110 border-[#cfc2aa]'
                        : 'ring-2 ring-[#2563eb] ring-offset-1 scale-110 border-slate-400'
                      : isDark
                      ? 'border-neutral-600 hover:scale-105'
                      : 'border-slate-300 hover:scale-105'
                  }`}
                  title={`Select color ${c}`}
                />
              );
            })}
          </div>

          {/* Row 2: Selected preview, White, Custom Palette, Hex Code */}
          <div className="grid grid-cols-4 gap-1.5 items-center pt-0.5">
            <div
              style={{ backgroundColor: color }}
              className={`h-8 rounded-lg border shadow-2xs ${
                isDark ? 'border-neutral-600' : isSepia ? 'border-[#cfc2aa]' : 'border-slate-300'
              }`}
              title={`Active border color: ${color}`}
            />
            <button
              onClick={() => setColor('#ffffff')}
              className={`h-8 rounded-lg border bg-white cursor-pointer shadow-2xs ${
                isDark ? 'border-neutral-600 hover:border-neutral-400' : isSepia ? 'border-[#cfc2aa] hover:border-[#b8a68b]' : 'border-slate-300 hover:border-slate-400'
              }`}
              title="White (#FFFFFF)"
            />
            <button
              onClick={() => colorInputRef.current?.click()}
              className={`h-8 rounded-lg border flex items-center justify-center cursor-pointer shadow-2xs relative ${btnNormal}`}
              title="Pick Custom Color"
            >
              <Palette size={16} />
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </button>
            <div className={`h-8 rounded-lg border flex items-center justify-center px-1 font-mono text-[10px] shadow-2xs ${
              isDark ? 'border-neutral-700 bg-neutral-800 text-neutral-200' : isSepia ? 'border-[#cfc2aa] bg-[#fbf8ee] text-[#2c231c]' : 'border-slate-300 bg-slate-50 text-slate-700'
            }`}>
              {color.toUpperCase()}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* UPPER SECTION: CELL STYLES (Cell Borders & Cell Apply)  */}
        {/* ======================================================== */}
        <div className={`p-3 rounded-xl border ${panelCardBg} space-y-3`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center space-x-1.5">
              <Square size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                CELL STYLES
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">Selected / Active Cell</span>
          </div>

          {/* Cell Border Buttons (Outline, None, All, Top, Bottom, Left, Right) */}
          <div className="space-y-1.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${sectionHeaderColor}`}>
              Cell Borders &amp; Outline
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'outline', label: 'Outline', icon: Square },
                { id: 'none', label: 'None', icon: Ban },
                { id: 'all', label: 'All', icon: LayoutGrid },
                { id: 'top', label: 'Top', icon: ArrowUp },
                { id: 'bottom', label: 'Bottom', icon: ArrowDown },
                { id: 'left', label: 'Left', icon: ArrowLeft },
                { id: 'right', label: 'Right', icon: ArrowRight },
              ].map((btn) => {
                const Icon = btn.icon;
                const isActive = cellBorderType === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => {
                      setCellBorderType(btn.id);
                      applyCellStyles(btn.id, lineStyle, thickness, color);
                    }}
                    title={`Apply ${btn.label} to selected cell(s)`}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isActive ? btnCellActive : btnNormal
                    }`}
                  >
                    <Icon size={15} className="mb-0.5" />
                    <span className="text-[10px] leading-tight">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cell Fill Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 font-medium text-[11px]">
              <Palette size={14} className="opacity-70 text-emerald-600" />
              <span>Cell Fill</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => cellColorInputRef.current?.click()}
                style={{ backgroundColor: cellColor }}
                className={`w-7 h-6 rounded border shadow-2xs cursor-pointer relative ${
                  isDark ? 'border-neutral-600' : isSepia ? 'border-[#cfc2aa]' : 'border-slate-300'
                }`}
                title="Change cell background color"
              >
                <input
                  ref={cellColorInputRef}
                  type="color"
                  value={cellColor}
                  onChange={(e) => setCellColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </button>
              <button
                onClick={handleApplyCellColor}
                className={`py-1 px-2.5 font-medium rounded text-[11px] cursor-pointer transition-colors shadow-2xs ${btnCellApply}`}
              >
                Apply Fill
              </button>
            </div>
          </div>

          {/* Cell Apply Button (Moved to Upper Section as requested) */}
          <button
            onClick={() => applyCellStyles(cellBorderType, lineStyle, thickness, color)}
            className={`w-full py-2 px-3 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-xs ${btnCellApply}`}
            title="Cell Apply — Apply borders, outline, and formatting to selected or active cell(s)"
          >
            <Check size={14} />
            <span>Cell Apply</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* LOWER SECTION: TABLE STYLES (Table Borders & Presets)   */}
        {/* ======================================================== */}
        <div className={`p-3 rounded-xl border ${panelCardBg} space-y-3`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center space-x-1.5">
              <LayoutGrid size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-[12px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                TABLE STYLES
              </span>
            </div>
            <span className="text-[10px] text-neutral-400">Whole Table</span>
          </div>

          {/* Table Visual Presets Banner */}
          <div className={`h-7 font-semibold flex items-center justify-center space-x-1.5 rounded-md shadow-xs text-[11px] text-white ${
            isDark ? 'bg-neutral-800' : isSepia ? 'bg-[#7c4a1e]' : 'bg-[#254587]'
          }`}>
            <div className="w-3 h-3 border border-dashed border-white/80 rounded-xs" />
            <ChevronDown size={13} className="text-white/80" />
            <span>Table Border Presets</span>
          </div>

          {/* 8 Visual Diagram Cards (2 rows of 4) */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'outline', label: 'Outline' },
              { id: 'inside', label: 'Inside' },
              { id: 'none', label: 'None' },
              { id: 'top', label: 'Top' },
              { id: 'bottom', label: 'Bottom' },
              { id: 'left', label: 'Left' },
              { id: 'right', label: 'Right' },
            ].map((card) => {
              const isSelected = tableBorderType === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    setTableBorderType(card.id);
                    applyTableStyles(card.id, lineStyle, thickness, color);
                  }}
                  title={`Apply ${card.label} Table Border`}
                  className={`p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all cursor-pointer ${
                    isSelected ? btnActive : btnNormal
                  }`}
                >
                  {/* Miniature diagram box */}
                  <div className={`w-8 h-8 border rounded relative flex items-center justify-center mb-1 overflow-hidden ${
                    isDark ? 'border-neutral-600 bg-neutral-900' : isSepia ? 'border-[#cfc2aa] bg-[#fbf8ee]' : 'border-slate-300 bg-white'
                  }`}>
                    {card.id === 'none' && (
                      <span className="text-[9px] opacity-40 select-none">✕</span>
                    )}
                    {card.id === 'outline' && (
                      <div className={`w-6.5 h-6.5 border-2 ${isDark ? 'border-neutral-200' : isSepia ? 'border-[#543011]' : 'border-slate-800'}`} />
                    )}
                    {card.id === 'inside' && (
                      <div className="w-full h-full relative">
                        <div className={`absolute top-1/2 left-0 right-0 h-[1.5px] -translate-y-1/2 ${
                          isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                        }`} />
                        <div className={`absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 ${
                          isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                        }`} />
                      </div>
                    )}
                    {card.id === 'all' && (
                      <div className={`w-6.5 h-6.5 border relative ${
                        isDark ? 'border-neutral-200' : isSepia ? 'border-[#543011]' : 'border-slate-800'
                      }`}>
                        <div className={`absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 ${
                          isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                        }`} />
                        <div className={`absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 ${
                          isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                        }`} />
                      </div>
                    )}
                    {card.id === 'top' && (
                      <div className={`absolute top-1 left-1 right-1 h-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'bottom' && (
                      <div className={`absolute bottom-1 left-1 right-1 h-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'left' && (
                      <div className={`absolute left-1 top-1 bottom-1 w-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'right' && (
                      <div className={`absolute right-1 top-1 bottom-1 w-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                  </div>
                  <span className="text-[9.5px] leading-tight font-medium">
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table Apply & Clear Buttons in Lower Section */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleClear}
              className={`py-2 px-3 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors ${btnClear}`}
              title="Reset table borders to default"
            >
              <Eraser size={13} className="opacity-70" />
              <span>Clear</span>
            </button>

            <button
              onClick={() => applyTableStyles(tableBorderType, lineStyle, thickness, color)}
              className={`flex-1 py-2 px-3 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-xs ${btnTableApply}`}
              title="Table Apply — Apply border settings to the table as a whole"
            >
              <Check size={14} />
              <span>Table Apply</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Footer */}
      <div className={`p-3 border-t flex items-center justify-between shrink-0 ${bottomFooterBg}`}>
        <button
          onClick={handleClear}
          className={`py-1.5 px-3 font-medium rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-colors ${btnClear}`}
          title="Reset all borders and table styling to default"
        >
          <Eraser size={13} className="opacity-70" />
          <span>Reset All</span>
        </button>

        <button
          onClick={() => applyTableStyles(tableBorderType, lineStyle, thickness, color)}
          className={`py-1.5 px-4 font-semibold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs ${btnTableApply}`}
          title="Table Apply — Re-apply current table border settings"
        >
          <Check size={14} />
          <span>Table Apply</span>
        </button>
      </div>
    </aside>
  );
};
