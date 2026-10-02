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
  Zap,
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

  const btnSmartApply = isDark
    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
    : isSepia
    ? 'bg-[#226343] hover:bg-[#1a4f35] text-white'
    : 'bg-[#15803d] hover:bg-[#166534] text-white';

  const btnApply = isDark
    ? 'bg-[#2563eb] hover:bg-blue-600 text-white'
    : isSepia
    ? 'bg-[#7c4a1e] hover:bg-[#603814] text-white'
    : 'bg-[#185abd] hover:bg-[#154c9e] text-white';

  const panelCardBg = isDark
    ? 'bg-[#242424] border-neutral-700'
    : isSepia
    ? 'bg-[#fbf8ee] border-[#cfc2aa]'
    : 'bg-slate-50/70 border-slate-200';
  // Border type selection: 'none' | 'outline' | 'inside' | 'all' | 'top' | 'bottom' | 'left' | 'right'
  const [borderType, setBorderType] = useState<string>('outline');

  // Line style: 'solid' | 'dashed' | 'dotted'
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // Thickness: '1px' | '2px' | '3px'
  const [thickness, setThickness] = useState<string>('1px');

  // Current border color
  const [color, setColor] = useState<string>('#000000');

  // Cell Background Color preview in Colors section
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

  // Palette 8 swatches matching screenshot
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

  // Locate the active table in the ProseMirror doc
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

  // Master Border Applicator
  const applyBorders = useCallback(
    (
      typeToApply: string = borderType,
      styleToApply: string = lineStyle,
      widthToApply: string = thickness,
      colorToApply: string = color,
      isSmart: boolean = false
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
      const subtleBorder = `1px solid #d1d5db`;
      const lightGuide = `1px dashed #cbd5e1`;

      const tr = state.tr;
      const isCellSelection = state.selection instanceof CellSelection;

      // Also get matching DOM table for instant visual sync
      const domTables = view.dom.querySelectorAll('table');
      let domTable: HTMLTableElement | null = null;
      if (domTables.length > 0) {
        domTable = domTables[domTables.length - 1] as HTMLTableElement;
        domTables.forEach((t) => {
          if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
            domTable = t as HTMLTableElement;
          }
        });
      }

      // If user has specific cells selected with CellSelection, apply to selected cells
      if (isCellSelection) {
        const cellSelection = state.selection as any;
        cellSelection.forEachCell((cell: any, pos: number) => {
          let currentStyle = (cell.attrs.style || '') as string;
          // Clean existing borders
          currentStyle = currentStyle
            .replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '')
            .trim();

          let newBorder = '';
          if (typeToApply === 'none') {
            newBorder = `border: ${lightGuide};`;
          } else if (typeToApply === 'all' || typeToApply === 'outline') {
            newBorder = `border: ${borderVal};`;
          } else if (typeToApply === 'top') {
            newBorder = `border-top: ${borderVal};`;
          } else if (typeToApply === 'bottom') {
            newBorder = `border-bottom: ${borderVal};`;
          } else if (typeToApply === 'left') {
            newBorder = `border-left: ${borderVal};`;
          } else if (typeToApply === 'right') {
            newBorder = `border-right: ${borderVal};`;
          }

          const combinedStyle = `${currentStyle} ${newBorder}`.trim();
          tr.setNodeMarkup(pos, undefined, {
            ...cell.attrs,
            style: combinedStyle,
          });
        });

        view.dispatch(tr);
        showFeedback(`Applied ${typeToApply} border to selected cells`);
        return;
      }

      // WHOLE TABLE APPLICATION
      let tableStyle = (tableNode.attrs.style || '') as string;
      tableStyle = tableStyle.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();

      if (typeToApply === 'none') {
        tableStyle = `${tableStyle} border: none;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: 'borders-none',
        });

        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const cellOffset = map.map[r * totalCols + c];
            const cellPos = tableStart + cellOffset;
            const cellNode = tableNode.nodeAt(cellOffset);
            if (cellNode) {
              let cs = (cellNode.attrs.style || '') as string;
              cs = cs.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();
              cs = `${cs} border: ${lightGuide};`.trim();
              tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
            }
          }
        }

        if (domTable) {
          domTable.style.border = 'none';
          domTable.classList.add('borders-none');
          domTable.querySelectorAll('td, th').forEach((c) => {
            (c as HTMLElement).style.border = lightGuide;
          });
        }

        view.dispatch(tr);
        showFeedback('Removed borders (showing guides)');
        return;
      }

      if (isSmart) {
        // SMART APPLY: Crisp outer border + styled header bottom + soft inner borders
        tableStyle = `${tableStyle} border: ${borderVal}; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: '',
        });

        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const cellOffset = map.map[r * totalCols + c];
            const cellPos = tableStart + cellOffset;
            const cellNode = tableNode.nodeAt(cellOffset);
            if (!cellNode) continue;

            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();

            let borderRules = '';
            if (r === 0) {
              borderRules += `border-bottom: ${borderVal};`;
            } else if (r < totalRows - 1) {
              borderRules += `border-bottom: 1px solid ${colorToApply}30;`;
            }
            if (c < totalCols - 1) {
              borderRules += `border-right: 1px solid ${colorToApply}30;`;
            }

            cs = `${cs} ${borderRules}`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.border = borderVal;
          domTable.classList.remove('borders-none', 'borders-minimal');
          const rows = Array.from(domTable.querySelectorAll('tr'));
          rows.forEach((row, rIdx) => {
            Array.from(row.children).forEach((cell, cIdx) => {
              const el = cell as HTMLElement;
              el.style.border = '';
              if (rIdx === 0) el.style.borderBottom = borderVal;
              else if (rIdx < rows.length - 1) el.style.borderBottom = `1px solid ${colorToApply}30`;
              if (cIdx < row.children.length - 1) el.style.borderRight = `1px solid ${colorToApply}30`;
            });
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Smart Modern Borders');
        return;
      }

      if (typeToApply === 'all') {
        tableStyle = `${tableStyle} border: ${borderVal}; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: '',
        });

        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const cellOffset = map.map[r * totalCols + c];
            const cellPos = tableStart + cellOffset;
            const cellNode = tableNode.nodeAt(cellOffset);
            if (!cellNode) continue;

            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} border: ${borderVal};`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.border = borderVal;
          domTable.classList.remove('borders-none', 'borders-minimal');
          domTable.querySelectorAll('td, th').forEach((c) => {
            (c as HTMLElement).style.border = borderVal;
          });
        }

        view.dispatch(tr);
        showFeedback('Applied All Borders');
        return;
      }

      if (typeToApply === 'outline') {
        tableStyle = `${tableStyle} border: ${borderVal}; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: '',
        });

        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const cellOffset = map.map[r * totalCols + c];
            const cellPos = tableStart + cellOffset;
            const cellNode = tableNode.nodeAt(cellOffset);
            if (!cellNode) continue;

            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();

            let rules = `border: ${subtleBorder};`;
            if (r === 0) rules += ` border-top: ${borderVal};`;
            if (r === totalRows - 1) rules += ` border-bottom: ${borderVal};`;
            if (c === 0) rules += ` border-left: ${borderVal};`;
            if (c === totalCols - 1) rules += ` border-right: ${borderVal};`;

            cs = `${cs} ${rules}`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.border = borderVal;
          domTable.classList.remove('borders-none', 'borders-minimal');
          const rows = Array.from(domTable.querySelectorAll('tr'));
          rows.forEach((row, rIdx) => {
            const cells = Array.from(row.children);
            cells.forEach((cell, cIdx) => {
              const el = cell as HTMLElement;
              el.style.border = subtleBorder;
              if (rIdx === 0) el.style.borderTop = borderVal;
              if (rIdx === rows.length - 1) el.style.borderBottom = borderVal;
              if (cIdx === 0) el.style.borderLeft = borderVal;
              if (cIdx === cells.length - 1) el.style.borderRight = borderVal;
            });
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Outline Border');
        return;
      }

      if (typeToApply === 'inside') {
        tableStyle = `${tableStyle} border: none; border-collapse: collapse;`.trim();
        tr.setNodeMarkup(tablePos, undefined, {
          ...tableNode.attrs,
          style: tableStyle,
          class: '',
        });

        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const cellOffset = map.map[r * totalCols + c];
            const cellPos = tableStart + cellOffset;
            const cellNode = tableNode.nodeAt(cellOffset);
            if (!cellNode) continue;

            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border(-top|-bottom|-left|-right)?:\s*[^;]+;?/gi, '').trim();

            let rules = '';
            if (r < totalRows - 1) rules += `border-bottom: ${borderVal};`;
            if (c < totalCols - 1) rules += `border-right: ${borderVal};`;
            if (r === 0) rules += `border-top: none;`;
            if (c === 0) rules += `border-left: none;`;

            cs = `${cs} ${rules}`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.border = 'none';
          domTable.classList.remove('borders-none', 'borders-minimal');
          const rows = Array.from(domTable.querySelectorAll('tr'));
          rows.forEach((row, rIdx) => {
            Array.from(row.children).forEach((cell, cIdx) => {
              const el = cell as HTMLElement;
              el.style.border = 'none';
              if (rIdx < rows.length - 1) el.style.borderBottom = borderVal;
              if (cIdx < row.children.length - 1) el.style.borderRight = borderVal;
            });
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Inside Grid Borders');
        return;
      }

      // DIRECTIONAL: Top, Bottom, Left, Right
      if (typeToApply === 'top') {
        tableStyle = `${tableStyle} border-top: ${borderVal};`.trim();
        tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, style: tableStyle });

        for (let c = 0; c < totalCols; c++) {
          const cellOffset = map.map[c];
          const cellPos = tableStart + cellOffset;
          const cellNode = tableNode.nodeAt(cellOffset);
          if (cellNode) {
            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border-top:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} border-top: ${borderVal};`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.borderTop = borderVal;
          const firstRow = domTable.querySelector('tr');
          firstRow?.querySelectorAll('td, th').forEach((cell) => {
            (cell as HTMLElement).style.borderTop = borderVal;
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Top Border');
        return;
      }

      if (typeToApply === 'bottom') {
        tableStyle = `${tableStyle} border-bottom: ${borderVal};`.trim();
        tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, style: tableStyle });

        const lastRowIdx = totalRows - 1;
        for (let c = 0; c < totalCols; c++) {
          const cellOffset = map.map[lastRowIdx * totalCols + c];
          const cellPos = tableStart + cellOffset;
          const cellNode = tableNode.nodeAt(cellOffset);
          if (cellNode) {
            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border-bottom:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} border-bottom: ${borderVal};`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.borderBottom = borderVal;
          const rows = domTable.querySelectorAll('tr');
          if (rows.length > 0) {
            rows[rows.length - 1].querySelectorAll('td, th').forEach((cell) => {
              (cell as HTMLElement).style.borderBottom = borderVal;
            });
          }
        }

        view.dispatch(tr);
        showFeedback('Applied Bottom Border');
        return;
      }

      if (typeToApply === 'left') {
        tableStyle = `${tableStyle} border-left: ${borderVal};`.trim();
        tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, style: tableStyle });

        for (let r = 0; r < totalRows; r++) {
          const cellOffset = map.map[r * totalCols];
          const cellPos = tableStart + cellOffset;
          const cellNode = tableNode.nodeAt(cellOffset);
          if (cellNode) {
            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border-left:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} border-left: ${borderVal};`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.borderLeft = borderVal;
          domTable.querySelectorAll('tr').forEach((row) => {
            const firstCell = row.children[0] as HTMLElement | undefined;
            if (firstCell) firstCell.style.borderLeft = borderVal;
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Left Border');
        return;
      }

      if (typeToApply === 'right') {
        tableStyle = `${tableStyle} border-right: ${borderVal};`.trim();
        tr.setNodeMarkup(tablePos, undefined, { ...tableNode.attrs, style: tableStyle });

        for (let r = 0; r < totalRows; r++) {
          const cellOffset = map.map[r * totalCols + (totalCols - 1)];
          const cellPos = tableStart + cellOffset;
          const cellNode = tableNode.nodeAt(cellOffset);
          if (cellNode) {
            let cs = (cellNode.attrs.style || '') as string;
            cs = cs.replace(/border-right:\s*[^;]+;?/gi, '').trim();
            cs = `${cs} border-right: ${borderVal};`.trim();
            tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          }
        }

        if (domTable) {
          domTable.style.borderRight = borderVal;
          domTable.querySelectorAll('tr').forEach((row) => {
            const lastCell = row.children[row.children.length - 1] as HTMLElement | undefined;
            if (lastCell) lastCell.style.borderRight = borderVal;
          });
        }

        view.dispatch(tr);
        showFeedback('Applied Right Border');
        return;
      }
    },
    [editor, ensureTable, borderType, lineStyle, thickness, color]
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
        tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: null });
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
        el.style.backgroundColor = '';
      });
    });

    showFeedback('Reset table borders to default');
  };

  // Apply cell background
  const handleApplyCellColor = () => {
    if (!editor) return;
    const { state, view } = editor;
    const isCellSelection = state.selection instanceof CellSelection;

    const tr = state.tr;
    let appliedCount = 0;

    if (isCellSelection) {
      const cellSelection = state.selection as any;
      cellSelection.forEachCell((cell: any, pos: number) => {
        let cs = (cell.attrs.style || '') as string;
        cs = cs.replace(/background(-color)?:\s*[^;]+;?/gi, '').trim();
        cs = `${cs} background-color: ${cellColor};`.trim();
        tr.setNodeMarkup(pos, undefined, { ...cellNodeAttrs(cell), style: cs });
        appliedCount++;
      });
    } else {
      const tableInfo = ensureTable();
      if (tableInfo) {
        const { node: tableNode, start: tableStart } = tableInfo;
        const map = TableMap.get(tableNode);
        // Find focused cell, or apply to first row
        const cellOffset = map.map[0];
        const cellPos = tableStart + cellOffset;
        const cellNode = tableNode.nodeAt(cellOffset);
        if (cellNode) {
          let cs = (cellNode.attrs.style || '') as string;
          cs = cs.replace(/background(-color)?:\s*[^;]+;?/gi, '').trim();
          cs = `${cs} background-color: ${cellColor};`.trim();
          tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, style: cs });
          appliedCount = 1;
        }
      }
    }

    if (appliedCount > 0) {
      view.dispatch(tr);
      showFeedback(`Cell background updated (${cellColor})`);
    }
  };

  const cellNodeAttrs = (node: any) => node.attrs || {};

  // Handlers for instant interactive editing
  const handleSelectBorderType = (id: string) => {
    setBorderType(id);
    applyBorders(id, lineStyle, thickness, color);
  };

  const handleSelectLineStyle = (st: 'solid' | 'dashed' | 'dotted') => {
    setLineStyle(st);
    applyBorders(borderType, st, thickness, color);
  };

  const handleSelectThickness = (th: string) => {
    setThickness(th);
    applyBorders(borderType, lineStyle, th, color);
  };

  const handleSelectColor = (hex: string) => {
    setColor(hex);
    applyBorders(borderType, lineStyle, thickness, hex);
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
      <div className={`px-4 py-2.5 flex items-center justify-between shrink-0 ${handleRowBg}`}>
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
        {/* TOP 8 BORDER BUTTONS (2 rows of 4) */}
        <div className="space-y-2">
          {/* Row 1: None, Outline, Inside, All */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: 'None', icon: Ban },
              { id: 'outline', label: 'Outline', icon: Square },
              { id: 'inside', label: 'Inside', icon: Grid },
              { id: 'all', label: 'All', icon: LayoutGrid },
            ].map((btn) => {
              const Icon = btn.icon;
              const isActive = borderType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => handleSelectBorderType(btn.id)}
                  title={`Apply ${btn.label} Border`}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-[11px]">{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Top, Bottom, Left, Right */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'top', label: 'Top', icon: ArrowUp },
              { id: 'bottom', label: 'Bottom', icon: ArrowDown },
              { id: 'left', label: 'Left', icon: ArrowLeft },
              { id: 'right', label: 'Right', icon: ArrowRight },
            ].map((btn) => {
              const Icon = btn.icon;
              const isActive = borderType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => handleSelectBorderType(btn.id)}
                  title={`Apply ${btn.label} Border`}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-[11px]">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LINE STYLE SECTION */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${sectionHeaderColor}`}>
            <span>Line Style</span>
            <span className="text-[10px] opacity-70 capitalize">{lineStyle}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'solid', label: 'Solid' },
              { id: 'dashed', label: 'Dashed' },
              { id: 'dotted', label: 'Dotted' },
            ].map((item) => {
              const isActive = lineStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectLineStyle(item.id as any)}
                  title={`Set Line Style to ${item.label}`}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <div
                    className={`w-12 h-1 mb-1.5 ${
                      item.id === 'solid'
                        ? 'bg-current'
                        : item.id === 'dashed'
                        ? 'border-b-2 border-dashed border-current'
                        : 'border-b-2 border-dotted border-current'
                    }`}
                  />
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* THICKNESS SECTION */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${sectionHeaderColor}`}>
            <span>Thickness</span>
            <span className="text-[10px] opacity-70">{thickness}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '1px', label: '1px', h: 'h-[1.5px]' },
              { id: '2px', label: '2px', h: 'h-[2.5px]' },
              { id: '3px', label: '3px', h: 'h-[3.5px]' },
            ].map((item) => {
              const isActive = thickness === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectThickness(item.id)}
                  title={`Set Thickness to ${item.label}`}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                    isActive ? btnActive : btnNormal
                  }`}
                >
                  <div className={`w-12 ${item.h} bg-current mb-1.5`} />
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLOR SECTION */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${sectionHeaderColor}`}>
            <span>Border Color</span>
            <span className="font-mono text-[10px] opacity-70">{color.toUpperCase()}</span>
          </div>

          {/* Row 1: 8 Color Swatches */}
          <div className="grid grid-cols-8 gap-1.5">
            {paletteColors.map((c) => {
              const isSelected = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => handleSelectColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-md border transition-transform cursor-pointer ${
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
          <div className="grid grid-cols-4 gap-2 items-center pt-1">
            {/* Color Preview Swatch */}
            <div
              style={{ backgroundColor: color }}
              className={`h-9 rounded-lg border shadow-2xs ${
                isDark ? 'border-neutral-600' : isSepia ? 'border-[#cfc2aa]' : 'border-slate-300'
              }`}
              title={`Active border color: ${color}`}
            />

            {/* White Swatch */}
            <button
              onClick={() => handleSelectColor('#ffffff')}
              className={`h-9 rounded-lg border bg-white cursor-pointer shadow-2xs ${
                isDark ? 'border-neutral-600 hover:border-neutral-400' : isSepia ? 'border-[#cfc2aa] hover:border-[#b8a68b]' : 'border-slate-300 hover:border-slate-400'
              }`}
              title="White (#FFFFFF)"
            />

            {/* Custom Palette Picker Button */}
            <button
              onClick={() => colorInputRef.current?.click()}
              className={`h-9 rounded-lg border flex items-center justify-center cursor-pointer shadow-2xs relative ${btnNormal}`}
              title="Pick Custom Color"
            >
              <Palette size={18} />
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => handleSelectColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </button>

            {/* Hex Display Box */}
            <div className={`h-9 rounded-lg border flex items-center justify-center px-1 font-mono text-[11px] shadow-2xs ${
              isDark ? 'border-neutral-700 bg-neutral-800 text-neutral-200' : isSepia ? 'border-[#cfc2aa] bg-[#fbf8ee] text-[#2c231c]' : 'border-slate-300 bg-slate-50 text-slate-700'
            }`}>
              {color.toUpperCase()}
            </div>
          </div>
        </div>

        {/* COLORS SECTION (Cell Background & Border Apply Rows) */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            Fill &amp; Highlight
          </div>

          {/* Cell Color Row */}
          <div className={`flex items-center justify-between p-2 rounded-lg border ${panelCardBg}`}>
            <div className="flex items-center space-x-2 font-medium">
              <Palette size={15} className="opacity-70" />
              <span>Cell Fill</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => cellColorInputRef.current?.click()}
                style={{ backgroundColor: cellColor }}
                className={`w-8 h-7 rounded border shadow-2xs cursor-pointer relative ${
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
                className={`py-1 px-3 font-medium rounded text-xs cursor-pointer transition-colors shadow-2xs ${btnApply}`}
              >
                Apply Fill
              </button>
            </div>
          </div>

          {/* Border Color Row */}
          <div className={`flex items-center justify-between p-2 rounded-lg border ${panelCardBg}`}>
            <div className="flex items-center space-x-2 font-medium">
              <Square size={15} className="opacity-70" />
              <span>Border Color</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                style={{ backgroundColor: color }}
                className={`w-8 h-7 rounded border shadow-2xs ${
                  isDark ? 'border-neutral-600' : isSepia ? 'border-[#cfc2aa]' : 'border-slate-300'
                }`}
                title={`Border color: ${color}`}
              />
              <button
                onClick={() => applyBorders(borderType, lineStyle, thickness, color)}
                className={`py-1 px-3 font-medium rounded text-xs cursor-pointer transition-colors shadow-2xs ${btnApply}`}
              >
                Apply Color
              </button>
            </div>
          </div>
        </div>

        {/* VISUAL BORDER EDIT SECTION */}
        <div className={`space-y-2 pt-2 border-t ${dividerBorder}`}>
          {/* Banner */}
          <div className={`h-8 font-semibold flex items-center justify-center space-x-2 rounded-md shadow-xs text-xs text-white ${
            isDark ? 'bg-neutral-800' : isSepia ? 'bg-[#7c4a1e]' : 'bg-[#254587]'
          }`}>
            <div className="w-3.5 h-3.5 border border-dashed border-white/80 rounded-xs" />
            <ChevronDown size={14} className="text-white/80" />
            <span>Visual Presets</span>
          </div>

          {/* 8 Visual Diagram Cards (2 rows of 4) */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { id: 'none', label: 'None' },
              { id: 'outline', label: 'Outline' },
              { id: 'inside', label: 'Inside' },
              { id: 'all', label: 'All' },
              { id: 'top', label: 'Top' },
              { id: 'bottom', label: 'Bottom' },
              { id: 'left', label: 'Left' },
              { id: 'right', label: 'Right' },
            ].map((card) => {
              const isSelected = borderType === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => handleSelectBorderType(card.id)}
                  title={`Apply ${card.label} Preset`}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-between transition-all cursor-pointer ${
                    isSelected ? btnActive : btnNormal
                  }`}
                >
                  {/* Miniature diagram box */}
                  <div className={`w-10 h-10 border rounded relative flex items-center justify-center mb-1.5 overflow-hidden ${
                    isDark ? 'border-neutral-600 bg-neutral-900' : isSepia ? 'border-[#cfc2aa] bg-[#fbf8ee]' : 'border-slate-300 bg-white'
                  }`}>
                    {card.id === 'none' && (
                      <span className="text-[10px] opacity-40 select-none">✕</span>
                    )}
                    {card.id === 'outline' && (
                      <div className={`w-8 h-8 border-2 ${isDark ? 'border-neutral-200' : isSepia ? 'border-[#543011]' : 'border-slate-800'}`} />
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
                      <div className={`w-8 h-8 border relative ${
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
                      <div className={`absolute top-1 left-1.5 right-1.5 h-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'bottom' && (
                      <div className={`absolute bottom-1 left-1.5 right-1.5 h-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'left' && (
                      <div className={`absolute left-1.5 top-1.5 bottom-1.5 w-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                    {card.id === 'right' && (
                      <div className={`absolute right-1.5 top-1.5 bottom-1.5 w-[2px] ${
                        isDark ? 'bg-neutral-200' : isSepia ? 'bg-[#543011]' : 'bg-slate-800'
                      }`} />
                    )}
                  </div>
                  <span className="text-[10px] leading-tight font-medium">
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Footer (Clear, Smart Apply, Apply) */}
      <div className={`p-3 border-t flex items-center space-x-2 shrink-0 ${bottomFooterBg}`}>
        {/* Clear Button */}
        <button
          onClick={handleClear}
          className={`flex-1 py-2 px-2 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors ${btnClear}`}
          title="Reset borders and cell styling to default"
        >
          <Eraser size={14} className="opacity-70" />
          <span>Clear</span>
        </button>

        {/* Smart Apply Button */}
        <button
          onClick={() => applyBorders(borderType, lineStyle, thickness, color, true)}
          className={`flex-1 py-2 px-2 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs ${btnSmartApply}`}
          title="Apply smart executive table styling with header accent and soft grid"
        >
          <Zap size={14} className="text-amber-300 fill-amber-300" />
          <span>Smart Apply</span>
        </button>

        {/* Apply Button */}
        <button
          onClick={() => applyBorders(borderType, lineStyle, thickness, color, false)}
          className={`flex-1 py-2 px-2 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs ${btnApply}`}
          title="Re-apply current border settings"
        >
          <Check size={15} />
          <span>Apply</span>
        </button>
      </div>
    </aside>
  );
};
