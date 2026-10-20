import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { findTable, CellSelection, TableMap } from '@tiptap/pm/tables';
import {
  Calculator,
  X,
  ArrowRight,
  ArrowDown,
  Sigma,
  Divide,
  ArrowDownToLine,
  ArrowUpToLine,
  Hash,
  Asterisk,
  Check,
  Table as TableIcon,
  Columns,
  Rows,
  Sparkles,
  Info,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpZA,
  RotateCw,
} from 'lucide-react';

export type TableCalculationOp = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'PRODUCT';
export type CalculationDirection = 'RIGHT' | 'DOWN';
export type FormatMode = 'auto' | '2dec' | 'int' | 'currDollar' | 'currEuro' | 'percent' | 'raw';
export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

interface TableToolsSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  themeMode?: ThemeMode;
  onNotify?: (msg: string) => void;
}

/**
 * Extracts a numeric value from arbitrary cell text.
 * Robustly parses currencies ($1,234.50, € 450,75), percentages (-2.5%),
 * European dot/comma notation, and ignores words or non-numeric strings.
 */
export function extractNumberFromText(rawText: string): { value: number | null; currency?: string; hasPercent?: boolean } {
  if (!rawText) return { value: null };
  const text = rawText.trim();
  if (!text) return { value: null };

  let currency: string | undefined;
  if (text.includes('$')) currency = '$';
  else if (text.includes('€')) currency = '€';
  else if (text.includes('£')) currency = '£';
  else if (text.includes('¥')) currency = '¥';

  const hasPercent = text.includes('%');

  // Strip currency symbols, percent, and outer whitespace
  const sanitized = text
    .replace(/[$€£¥₹]/g, '')
    .replace(/%/g, '')
    .replace(/,/g, (match, offset, str) => {
      // Check if comma is decimal separator (e.g., European "123,45" or "1.234,56")
      // If comma is followed by 1 or 2 digits at end, it might be a decimal
      if (/\,\d{1,2}$/.test(str.substring(offset)) && !str.includes('.')) {
        return '.';
      }
      return ''; // thousands separator
    })
    .replace(/\s+/g, '')
    .trim();

  // Test if it matches standard numeric pattern
  if (/^-?\d+(\.\d+)?$/.test(sanitized)) {
    const val = parseFloat(sanitized);
    if (!isNaN(val)) {
      return { value: val, currency, hasPercent };
    }
  }

  // Handle European notation where dot is thousand separator: 1.234,56
  const euroSanitized = text
    .replace(/[$€£¥₹%]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/\s+/g, '')
    .trim();

  if (/^-?\d+(\.\d+)?$/.test(euroSanitized)) {
    const val = parseFloat(euroSanitized);
    if (!isNaN(val)) {
      return { value: val, currency, hasPercent };
    }
  }

  return { value: null };
}

/**
 * Formats a calculated numeric result based on format mode and source context.
 */
export function formatCalculatedResult(
  val: number,
  mode: FormatMode,
  detectedCurrency?: string,
  detectedPercent?: boolean
): string {
  if (isNaN(val)) return '0';

  if (mode === 'raw') {
    return String(Number(val.toFixed(6)));
  }

  if (mode === 'int') {
    return Math.round(val).toLocaleString();
  }

  if (mode === '2dec') {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (mode === 'currDollar') {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (mode === 'currEuro') {
    return `${val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }

  if (mode === 'percent') {
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
  }

  // 'auto' mode: detects whether decimals exist or if currency/percent was present
  let formattedNumber: string;
  if (Number.isInteger(val)) {
    formattedNumber = val.toLocaleString();
  } else {
    formattedNumber = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (detectedCurrency) {
    if (detectedCurrency === '€') {
      return `${formattedNumber} €`;
    }
    return `${detectedCurrency}${formattedNumber}`;
  }

  if (detectedPercent) {
    return `${formattedNumber}%`;
  }

  return formattedNumber;
}

export const TableToolsSidebar: React.FC<TableToolsSidebarProps> = ({
  editor,
  onClose,
  themeMode = 'light',
  onNotify,
}) => {
  const [selectedOp, setSelectedOp] = useState<TableCalculationOp>('SUM');
  const [formatMode, setFormatMode] = useState<FormatMode>('auto');
  const [makeBold, setMakeBold] = useState<boolean>(true);
  const [createNewCol, setCreateNewCol] = useState<boolean>(true);
  const [createNewRow, setCreateNewRow] = useState<boolean>(true);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);

  // Sync state with editor updates
  const [, setSelectionEpoch] = useState<number>(0);
  useEffect(() => {
    if (!editor) return;
    const updateHandler = () => setSelectionEpoch((prev) => prev + 1);
    editor.on('selectionUpdate', updateHandler);
    editor.on('update', updateHandler);
    return () => {
      editor.off('selectionUpdate', updateHandler);
      editor.off('update', updateHandler);
    };
  }, [editor]);

  const notify = (msg: string) => {
    setLastFeedback(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setLastFeedback(null), 3500);
  };

  const isInsertMode = createNewCol && createNewRow;

  const toggleInsertEditMode = useCallback(() => {
    if (createNewCol && createNewRow) {
      setCreateNewCol(false);
      setCreateNewRow(false);
      notify('Edit Mode: Formulas will overwrite the last row/column.');
    } else {
      setCreateNewCol(true);
      setCreateNewRow(true);
      notify('Insert Mode: Formulas will create new rows/columns.');
    }
  }, [createNewCol, createNewRow]);

  // Theme-specific styles
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

  const cardBg = isDark
    ? 'bg-[#252525] border-neutral-700/70 text-neutral-200'
    : isSepia
    ? 'bg-[#fbf8ee] border-[#cfc2aa] text-[#2c231c]'
    : 'bg-slate-50/80 border-slate-200 text-slate-800';

  const subCardBg = isDark
    ? 'bg-neutral-800/80 border-neutral-700/60 text-neutral-200'
    : isSepia
    ? 'bg-[#f5eedc] border-[#cfc2aa] text-[#2c231c]'
    : 'bg-white/80 border-slate-200/60 text-slate-800';

  const inputBg = isDark
    ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
    : isSepia
    ? 'bg-[#fbf8ee] border-[#cfc2aa] text-[#2c231c]'
    : 'bg-white border-slate-200 text-slate-800';

  const btnSecondaryBg = isDark
    ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
    : isSepia
    ? 'bg-[#f5eedc] border-[#cfc2aa] text-[#2c231c] hover:bg-[#ebdcc0]'
    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';

  const opCardBaseBg = isDark
    ? 'border-neutral-700 bg-neutral-800/70 text-neutral-200 hover:border-neutral-600'
    : isSepia
    ? 'border-[#ded3be] bg-[#fbf8ee] text-[#2c231c] hover:border-[#bfa98d]'
    : 'border-slate-200 bg-white/70 text-slate-800 hover:border-slate-300';

  // Analyze active table and current selection
  const tableData = useMemo(() => {
    if (!editor || editor.isDestroyed) return null;
    const { state } = editor;
    const { selection } = state;
    const isCellSelection = selection instanceof CellSelection;

    let tableInfo = findTable(selection.$from);
    if (!tableInfo && isCellSelection) {
      tableInfo = findTable((selection as any).$anchorCell);
    }
    if (!tableInfo) {
      tableInfo = findTable(selection.$to);
    }
    if (!tableInfo) return null;

    const { node: tableNode, start: tableStart, pos: tablePos } = tableInfo;
    const map = TableMap.get(tableNode);

    let rect = {
      top: 0,
      bottom: map.height,
      left: 0,
      right: map.width,
    };

    if (isCellSelection) {
      const sel = selection as CellSelection;
      try {
        rect = map.rectBetween(sel.$anchorCell.pos - tableStart, sel.$headCell.pos - tableStart);
      } catch {
        rect = { top: 0, bottom: map.height, left: 0, right: map.width };
      }
    } else {
      const cellPos = selection.$from.pos - tableStart;
      try {
        const found = map.findCell(cellPos);
        rect = {
          top: found.top,
          bottom: found.bottom,
          left: found.left,
          right: found.right,
        };
      } catch {
        // fallback to full table
      }
    }

    // Inspect numbers in the selection
    const detectedNumbers: number[] = [];
    let detectedCurrency: string | undefined;
    let detectedPercent = false;
    let totalCellsCount = 0;

    for (let r = rect.top; r < rect.bottom; r++) {
      for (let c = rect.left; c < rect.right; c++) {
        totalCellsCount++;
        const offset = map.map[r * map.width + c];
        const cellNode = tableNode.nodeAt(offset);
        if (cellNode) {
          const text = cellNode.textContent;
          const parsed = extractNumberFromText(text);
          if (parsed.value !== null) {
            detectedNumbers.push(parsed.value);
            if (!detectedCurrency && parsed.currency) detectedCurrency = parsed.currency;
            if (parsed.hasPercent) detectedPercent = true;
          }
        }
      }
    }

    const count = detectedNumbers.length;
    const sum = detectedNumbers.reduce((a, b) => a + b, 0);
    const avg = count > 0 ? sum / count : 0;
    const min = count > 0 ? Math.min(...detectedNumbers) : 0;
    const max = count > 0 ? Math.max(...detectedNumbers) : 0;

    return {
      tableNode,
      tableStart,
      tablePos,
      map,
      rect,
      isCellSelection,
      stats: {
        totalCellsCount,
        count,
        sum,
        avg,
        min,
        max,
        detectedCurrency,
        detectedPercent,
      },
    };
  }, [editor, editor?.state.selection]);

  /**
   * Execute Smart Calculation in specified direction (RIGHT or DOWN)
   */
  const handleCalculate = useCallback(
    (operation: TableCalculationOp, direction: CalculationDirection) => {
      if (!editor || !tableData) {
        notify('Please click inside a table to perform calculations.');
        return;
      }

      const { tableNode, tableStart, map, rect, stats } = tableData;
      let workingMap = map;
      let workingTableStart = tableStart;
      let workingTableNode = tableNode;

      const updates: { cellPos: number; text: string }[] = [];
      let calculatedRowsOrCols = 0;

      if (direction === 'RIGHT') {
        // Multi-row calculation: calculate selected row values -> insert into last cell on right
        const numRows = rect.bottom - rect.top;
        const numCols = rect.right - rect.left;

        let destCol: number = rect.right - 1;

        if (createNewCol) {
          // Focus the rightmost cell in selection and add a new column after
          const rightmostCol = Math.min(rect.right - 1, workingMap.width - 1);
          const anchorCellOffset = workingMap.map[rect.top * workingMap.width + rightmostCol];
          const anchorCellPos = workingTableStart + anchorCellOffset;

          editor.chain().focus().setTextSelection(anchorCellPos + 1).addColumnAfter().run();

          const refreshed = findTable(editor.state.selection.$from);
          if (refreshed) {
            workingTableNode = refreshed.node;
            workingTableStart = refreshed.start;
            workingMap = TableMap.get(workingTableNode);
          }

          // Destination is the newly created column
          destCol = rightmostCol + 1;
        }

        for (let r = rect.top; r < rect.bottom; r++) {
          let sourceCols: number[] = [];

          if (createNewCol) {
            // Source columns: all columns in the original selection range
            for (let c = rect.left; c < rect.right; c++) {
              sourceCols.push(c);
            }
          } else {
            // In Last Col: replace the last column with the result
            if (numCols > 1) {
              destCol = rect.right - 1;
              for (let c = rect.left; c < destCol; c++) {
                sourceCols.push(c);
              }
            } else {
              if (rect.right < workingMap.width) {
                destCol = rect.right;
                sourceCols.push(rect.left);
              } else {
                destCol = workingMap.width - 1;
                for (let c = 0; c < destCol; c++) {
                  sourceCols.push(c);
                }
              }
            }
          }

          // Extract values from source cells (excluding destCol)
          const rowNumbers: number[] = [];
          let rowCurrency = stats.detectedCurrency;
          let rowPercent = stats.detectedPercent;

          sourceCols.forEach((c) => {
            const offset = workingMap.map[r * workingMap.width + c];
            const cellNode = workingTableNode.nodeAt(offset);
            if (cellNode) {
              const parsed = extractNumberFromText(cellNode.textContent);
              if (parsed.value !== null) {
                rowNumbers.push(parsed.value);
                if (parsed.currency) rowCurrency = parsed.currency;
                if (parsed.hasPercent) rowPercent = true;
              }
            }
          });

          if (rowNumbers.length > 0) {
            let res = 0;
            if (operation === 'SUM') res = rowNumbers.reduce((a, b) => a + b, 0);
            else if (operation === 'AVG') res = rowNumbers.reduce((a, b) => a + b, 0) / rowNumbers.length;
            else if (operation === 'MIN') res = Math.min(...rowNumbers);
            else if (operation === 'MAX') res = Math.max(...rowNumbers);
            else if (operation === 'COUNT') res = rowNumbers.length;
            else if (operation === 'PRODUCT') res = rowNumbers.reduce((a, b) => a * b, 1);

            const formatted = formatCalculatedResult(res, formatMode, rowCurrency, rowPercent);
            const destOffset = workingMap.map[r * workingMap.width + destCol];
            const destCellPos = workingTableStart + destOffset;
            updates.push({ cellPos: destCellPos, text: formatted });
            calculatedRowsOrCols++;
          }
        }
      } else {
        // Direction: DOWN
        // Multi-column calculation: calculate selected column values -> insert into last cell at bottom
        const numRows = rect.bottom - rect.top;
        const numCols = rect.right - rect.left;

        let destRow: number = rect.bottom - 1;

        if (createNewRow) {
          // Focus the bottom-most cell in selection and add a new row after
          const bottomRow = Math.min(rect.bottom - 1, workingMap.height - 1);
          const anchorCellOffset = workingMap.map[bottomRow * workingMap.width + rect.left];
          const anchorCellPos = workingTableStart + anchorCellOffset;

          editor.chain().focus().setTextSelection(anchorCellPos + 1).addRowAfter().run();

          const refreshed = findTable(editor.state.selection.$from);
          if (refreshed) {
            workingTableNode = refreshed.node;
            workingTableStart = refreshed.start;
            workingMap = TableMap.get(workingTableNode);
          }

          // Destination is the newly created row
          destRow = bottomRow + 1;
        }

        for (let c = rect.left; c < rect.right; c++) {
          let sourceRows: number[] = [];

          if (createNewRow) {
            // Source rows: all rows in the original selection range
            for (let r = rect.top; r < rect.bottom; r++) {
              sourceRows.push(r);
            }
          } else {
            // In Last Row: replace the last row with the result
            if (numRows > 1) {
              destRow = rect.bottom - 1;
              for (let r = rect.top; r < destRow; r++) {
                sourceRows.push(r);
              }
            } else {
              if (rect.bottom < workingMap.height) {
                destRow = rect.bottom;
                sourceRows.push(rect.top);
              } else {
                destRow = workingMap.height - 1;
                for (let r = 0; r < destRow; r++) {
                  sourceRows.push(r);
                }
              }
            }
          }

          // Extract values from source cells (excluding destRow)
          const colNumbers: number[] = [];
          let colCurrency = stats.detectedCurrency;
          let colPercent = stats.detectedPercent;

          sourceRows.forEach((r) => {
            const offset = workingMap.map[r * workingMap.width + c];
            const cellNode = workingTableNode.nodeAt(offset);
            if (cellNode) {
              const parsed = extractNumberFromText(cellNode.textContent);
              if (parsed.value !== null) {
                colNumbers.push(parsed.value);
                if (parsed.currency) colCurrency = parsed.currency;
                if (parsed.hasPercent) colPercent = true;
              }
            }
          });

          if (colNumbers.length > 0) {
            let res = 0;
            if (operation === 'SUM') res = colNumbers.reduce((a, b) => a + b, 0);
            else if (operation === 'AVG') res = colNumbers.reduce((a, b) => a + b, 0) / colNumbers.length;
            else if (operation === 'MIN') res = Math.min(...colNumbers);
            else if (operation === 'MAX') res = Math.max(...colNumbers);
            else if (operation === 'COUNT') res = colNumbers.length;
            else if (operation === 'PRODUCT') res = colNumbers.reduce((a, b) => a * b, 1);

            const formatted = formatCalculatedResult(res, formatMode, colCurrency, colPercent);
            const destOffset = workingMap.map[destRow * workingMap.width + c];
            const destCellPos = workingTableStart + destOffset;
            updates.push({ cellPos: destCellPos, text: formatted });
            calculatedRowsOrCols++;
          }
        }
      }

      if (updates.length === 0) {
        notify(`No numeric values found to calculate ${operation}.`);
        return;
      }

      // Execute atomic transaction: sort updates descending by pos to avoid shifting earlier targets
      const tr = editor.state.tr;
      const sortedUpdates = [...updates].sort((a, b) => b.cellPos - a.cellPos);

      for (const update of sortedUpdates) {
        const cellNode = tr.doc.nodeAt(update.cellPos);
        if (!cellNode) continue;

        const pPos = update.cellPos + 1;
        const pNode = cellNode.firstChild;

        if (pNode) {
          const startContent = pPos + 1;
          const endContent = pPos + pNode.nodeSize - 1;
          if (endContent > startContent) {
            tr.delete(startContent, endContent);
          }
          const marks = makeBold && editor.schema.marks.bold ? [editor.schema.marks.bold.create()] : [];
          const textNode = editor.schema.text(update.text, marks);
          tr.insert(startContent, textNode);
        } else {
          const marks = makeBold && editor.schema.marks.bold ? [editor.schema.marks.bold.create()] : [];
          const p = editor.schema.nodes.paragraph.create({}, editor.schema.text(update.text, marks));
          tr.insert(update.cellPos + 1, p);
        }
      }

      editor.view.dispatch(tr);
      notify(
        `✓ ${operation} ${
          direction === 'RIGHT'
            ? createNewCol
              ? '→ New Col'
              : '→ In Last Col'
            : createNewRow
            ? '↓ New Row'
            : '↓ In Last Row'
        }: Calculated ${calculatedRowsOrCols} result${calculatedRowsOrCols === 1 ? '' : 's'}.`
      );
    },
    [editor, tableData, formatMode, makeBold, createNewCol, createNewRow]
  );

  // Quick Table Selection Helpers
  const selectCurrentRow = () => {
    if (!editor || !tableData) return;
    const { tableStart, map, rect } = tableData;
    const doc = editor.state.doc;
    const anchorPos = tableStart + map.map[rect.top * map.width];
    const headPos = tableStart + map.map[rect.top * map.width + map.width - 1];
    const sel = CellSelection.create(doc, anchorPos, headPos);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
  };

  const selectCurrentCol = () => {
    if (!editor || !tableData) return;
    const { tableStart, map, rect } = tableData;
    const doc = editor.state.doc;
    const anchorPos = tableStart + map.map[rect.left];
    const headPos = tableStart + map.map[(map.height - 1) * map.width + rect.left];
    const sel = CellSelection.create(doc, anchorPos, headPos);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
  };

  const selectEntireTable = () => {
    if (!editor || !tableData) return;
    const { tableStart, map } = tableData;
    const doc = editor.state.doc;
    const anchorPos = tableStart + map.map[0];
    const headPos = tableStart + map.map[map.map.length - 1];
    const sel = CellSelection.create(doc, anchorPos, headPos);
    editor.view.dispatch(editor.state.tr.setSelection(sel));
  };

  // Active column for sorting within the selection
  const activeSortCol = useMemo(() => {
    if (!tableData) return 0;
    const { rect } = tableData;
    if (sortColumnIndex !== null && sortColumnIndex >= rect.left && sortColumnIndex < rect.right) {
      return sortColumnIndex;
    }
    return rect.left;
  }, [tableData, sortColumnIndex]);

  // Helper to get column header title
  const getColumnName = useCallback(
    (colIndex: number): string => {
      if (!tableData) return `Col ${colIndex + 1}`;
      const { tableNode, map } = tableData;
      const headerOffset = map.map[colIndex];
      const headerNode = tableNode.nodeAt(headerOffset);
      const text = headerNode ? headerNode.textContent.trim() : '';
      return text.length > 0 ? (text.length > 18 ? text.substring(0, 18) + '…' : text) : `Column ${colIndex + 1}`;
    },
    [tableData]
  );

  /**
   * Smart sort function: sorts ONLY the cells and rows within the selected table area.
   * Preserves unselected rows (headers, totals, outside rows) and columns outside selection.
   * Intelligently parses numbers, currencies, percentages, and falls back to natural alphabetical sorting.
   */
  const handleSortSelectedArea = useCallback(
    (order: 'asc' | 'desc' = sortOrder, keyCol?: number) => {
      if (!editor || !tableData) {
        notify('Click inside or select a table area first.');
        return;
      }

      const { tableNode, tableStart, map, rect } = tableData;
      let top = rect.top;
      let bottom = rect.bottom;
      let left = rect.left;
      let right = rect.right;

      // If user selected only a single row / cell, intelligently sort data rows
      if (bottom - top <= 1) {
        if (map.height > 2) {
          top = 1;
          bottom = map.height;
        } else if (map.height === 2) {
          top = 0;
          bottom = map.height;
        } else {
          notify('Select 2 or more rows in the table to sort.');
          return;
        }
      }

      const numRows = bottom - top;
      if (numRows <= 1) {
        notify('At least 2 rows must be selected to sort.');
        return;
      }

      const sortCol =
        keyCol !== undefined
          ? keyCol
          : sortColumnIndex !== null && sortColumnIndex >= left && sortColumnIndex < right
          ? sortColumnIndex
          : left;

      // Extract row data for the selected area only
      interface SelectedRowData {
        originalRowIndex: number;
        sortKeyRaw: string;
        sortKeyNum: number | null;
        cells: {
          col: number;
          content: any;
        }[];
      }

      const rowsData: SelectedRowData[] = [];

      for (let r = top; r < bottom; r++) {
        const keyCellOffset = map.map[r * map.width + sortCol];
        const keyNode = tableNode.nodeAt(keyCellOffset);
        const rawText = keyNode ? keyNode.textContent.trim() : '';
        const parsed = extractNumberFromText(rawText);

        const cells: SelectedRowData['cells'] = [];
        for (let c = left; c < right; c++) {
          const cOffset = map.map[r * map.width + c];
          const cNode = tableNode.nodeAt(cOffset);
          cells.push({
            col: c,
            content: cNode ? cNode.content : null,
          });
        }

        rowsData.push({
          originalRowIndex: r,
          sortKeyRaw: rawText,
          sortKeyNum: parsed.value,
          cells,
        });
      }

      // Sort rows based on order
      const sorted = [...rowsData].sort((a, b) => {
        const aEmpty = a.sortKeyRaw === '';
        const bEmpty = b.sortKeyRaw === '';
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;

        if (a.sortKeyNum !== null && b.sortKeyNum !== null) {
          return order === 'asc' ? a.sortKeyNum - b.sortKeyNum : b.sortKeyNum - a.sortKeyNum;
        }

        const comp = a.sortKeyRaw.localeCompare(b.sortKeyRaw, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        return order === 'asc' ? comp : -comp;
      });

      // Collect cell replacement updates
      interface CellReplacement {
        targetPos: number;
        targetSize: number;
        newContent: any;
      }

      const updates: CellReplacement[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const targetRow = top + i;
        const sourceRow = sorted[i];

        if (sourceRow.originalRowIndex === targetRow) {
          continue;
        }

        for (let colIdx = 0; colIdx < sourceRow.cells.length; colIdx++) {
          const c = left + colIdx;
          const targetOffset = map.map[targetRow * map.width + c];
          const targetNode = tableNode.nodeAt(targetOffset);
          const sourceCell = sourceRow.cells[colIdx];

          if (targetNode && sourceCell && sourceCell.content) {
            updates.push({
              targetPos: tableStart + targetOffset,
              targetSize: targetNode.nodeSize,
              newContent: sourceCell.content,
            });
          }
        }
      }

      if (updates.length === 0) {
        notify(`Selected area is already sorted ${order === 'asc' ? 'A → Z' : 'Z → A'}.`);
        return;
      }

      // Sort updates descending by targetPos to prevent offsets shifting earlier targets
      updates.sort((a, b) => b.targetPos - a.targetPos);

      const tr = editor.state.tr;
      for (const upd of updates) {
        const from = upd.targetPos + 1;
        const to = upd.targetPos + upd.targetSize - 1;
        if (from <= to) {
          tr.replaceWith(from, to, upd.newContent);
        }
      }

      editor.view.dispatch(tr);
      notify(
        `✓ Sorted ${numRows} rows in selected area (${order === 'asc' ? 'A → Z' : 'Z → A'}).`
      );
    },
    [editor, tableData, sortOrder, sortColumnIndex]
  );

  const operations: {
    id: TableCalculationOp;
    name: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'SUM', name: 'SUM', description: 'Total of values', icon: <Sigma size={16} /> },
    { id: 'AVG', name: 'AVG', description: 'Average of values', icon: <Divide size={16} /> },
    { id: 'MIN', name: 'MIN', description: 'Minimum value', icon: <ArrowDownToLine size={16} /> },
    { id: 'MAX', name: 'MAX', description: 'Maximum value', icon: <ArrowUpToLine size={16} /> },
    { id: 'COUNT', name: 'COUNT', description: 'Count numeric values', icon: <Hash size={16} /> },
    { id: 'PRODUCT', name: 'PRODUCT', description: 'Multiply all values', icon: <Asterisk size={16} /> },
  ];

  return (
    <aside
      className={`w-80 shrink-0 border-l flex flex-col h-full shadow-lg z-30 select-none overflow-hidden transition-colors ${asideBg}`}
      aria-label="Table Tools Sidebar"
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-white" />
          <div>
            <h2 className="text-sm font-semibold tracking-wide leading-tight">Table Tools</h2>
            <p className="text-[10px] text-white/80 leading-tight">Smart Calculations &amp; Formulas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-black/15 text-white/90 hover:text-white transition-colors cursor-pointer"
          title="Close Table Tools"
          aria-label="Close Table Tools"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Table & Selection Status */}
        {tableData ? (
          <div className={`p-3 rounded-xl border ${cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Active Selection
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium">
                {tableData.map.height}R × {tableData.map.width}C
              </span>
            </div>

            {/* Quick Live Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className={`p-2 rounded-lg border ${subCardBg}`}>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase block">Numbers</span>
                <span className="font-bold text-slate-800 dark:text-neutral-100 text-sm">
                  {tableData.stats.count} <span className="text-[10px] text-slate-400 font-normal">/ {tableData.stats.totalCellsCount} cells</span>
                </span>
              </div>
              <div className={`p-2 rounded-lg border ${subCardBg}`}>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase block">Live Sum</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {tableData.stats.count > 0 ? tableData.stats.sum.toLocaleString() : '—'}
                </span>
              </div>
              <div className={`p-2 rounded-lg border ${subCardBg}`}>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase block">Average</span>
                <span className="font-bold text-slate-700 dark:text-neutral-200 text-xs">
                  {tableData.stats.count > 0 ? tableData.stats.avg.toFixed(2) : '—'}
                </span>
              </div>
              <div className={`p-2 rounded-lg border ${subCardBg}`}>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase block">Min / Max</span>
                <span className="font-bold text-slate-700 dark:text-neutral-200 text-xs">
                  {tableData.stats.count > 0 ? `${tableData.stats.min} / ${tableData.stats.max}` : '—'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 font-semibold text-sm">
              <Info size={16} />
              <span>No Table Selected</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Click anywhere inside an existing table or select table cells to calculate values.
            </p>
            <button
              onClick={toggleInsertEditMode}
              className={`mt-2 w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-xs active:scale-98 ${
                isInsertMode
                  ? 'border-2 border-emerald-500 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600'
              }`}
              title="Click to toggle between Insert Mode (creates new rows/cols) and Edit Mode (replaces last row/col)"
            >
              <RotateCw size={13} className="shrink-0" />
              <span>{isInsertMode ? 'Insert Mode' : 'Edit Mode'}</span>
            </button>
          </div>
        )}

        {/* Calculation Direction Section (Prominent Two Action Buttons) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Calculation Direction
            </h3>
            {!isInsertMode ? (
              <span
                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-1 animate-pulse"
                title="Formulas will overwrite existing values in the last column or row"
              >
                <span>⚠️ Result replaces last line / col</span>
              </span>
            ) : (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Selected: {selectedOp}</span>
            )}
          </div>

          {/* Insert Mode / Edit Mode Carousel Button */}
          <button
            onClick={toggleInsertEditMode}
            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between cursor-pointer transition-all shadow-xs active:scale-98 ${
              isInsertMode
                ? 'border-2 border-emerald-500 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600'
            }`}
            title="Click to toggle between Insert Mode (creates new rows/cols) and Edit Mode (replaces last row/col)"
          >
            <div className="flex items-center space-x-2">
              <RotateCw size={13} className="shrink-0" />
              <span className="tracking-wide">{isInsertMode ? 'Insert Mode' : 'Edit Mode'}</span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isInsertMode
                  ? 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100'
                  : 'bg-white/20 text-white'
              }`}
            >
              {isInsertMode ? 'Creates New Lines' : 'Overwrites Last Line'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {/* Action 1: RIGHT */}
            <div className="flex flex-col space-y-1.5">
              <button
                onClick={() => handleCalculate(selectedOp, 'RIGHT')}
                className={`group p-3 rounded-xl border text-left transition-all shadow-2xs cursor-pointer active:scale-98 w-full ${
                  isDark
                    ? 'border-blue-900/80 bg-gradient-to-br from-blue-950/40 to-indigo-950/40 hover:from-blue-900/60 hover:to-indigo-900/60 text-blue-100'
                    : isSepia
                    ? 'border-[#cfc2aa] bg-gradient-to-br from-[#f8f3e7] to-[#ede3cf] hover:from-[#f3ecd7] hover:to-[#e5dac2] text-[#2c231c]'
                    : 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-950'
                }`}
                title={`Calculate ${selectedOp} for each row and insert ${
                  createNewCol ? 'into a newly created column on right' : 'into the last column (replaces existing content)'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-bold text-xs flex items-center space-x-1 ${isSepia ? 'text-[#3f2e22]' : 'text-blue-700 dark:text-blue-300'}`}>
                    <span>→ RIGHT</span>
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs group-hover:translate-x-0.5 transition-transform ${isSepia ? 'bg-[#5c4033] text-white' : 'bg-blue-600 text-white'}`}>
                    <ArrowRight size={14} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-neutral-300 leading-tight">
                  {createNewCol
                    ? 'Calculate Rows → New Column'
                    : 'Calculate Rows → In Last Column'}
                </p>
              </button>

              {/* Option Checkbox: Create new Col / In Last Col */}
              <label className="flex items-center space-x-1.5 px-1 py-0.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createNewCol}
                  onChange={(e) => setCreateNewCol(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    !createNewCol
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : isSepia
                      ? 'text-[#3f2e22]'
                      : 'text-slate-700 dark:text-neutral-200'
                  }`}
                >
                  {createNewCol ? 'Create new Col' : 'In Last Col'}
                </span>
              </label>
            </div>

            {/* Action 2: DOWN */}
            <div className="flex flex-col space-y-1.5">
              <button
                onClick={() => handleCalculate(selectedOp, 'DOWN')}
                className={`group p-3 rounded-xl border text-left transition-all shadow-2xs cursor-pointer active:scale-98 w-full ${
                  isDark
                    ? 'border-emerald-900/80 bg-gradient-to-br from-emerald-950/40 to-teal-950/40 hover:from-emerald-900/60 hover:to-teal-900/60 text-emerald-100'
                    : isSepia
                    ? 'border-[#cfc2aa] bg-gradient-to-br from-[#f8f3e7] to-[#e4eed9] hover:from-[#f3ecd7] hover:to-[#dae7ce] text-[#2c231c]'
                    : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-950'
                }`}
                title={`Calculate ${selectedOp} for each column and insert ${
                  createNewRow ? 'into a newly created row at bottom' : 'into the last row (replaces existing content)'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-bold text-xs flex items-center space-x-1 ${isSepia ? 'text-[#2e4d32]' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    <span>↓ DOWN</span>
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs group-hover:translate-y-0.5 transition-transform ${isSepia ? 'bg-[#2e5d38] text-white' : 'bg-emerald-600 text-white'}`}>
                    <ArrowDown size={14} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-neutral-300 leading-tight">
                  {createNewRow
                    ? 'Calculate Column → New Rows'
                    : 'Calculate Column → In Last Row'}
                </p>
              </button>

              {/* Option Checkbox: Create new Row / In Last Row */}
              <label className="flex items-center space-x-1.5 px-1 py-0.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createNewRow}
                  onChange={(e) => setCreateNewRow(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    !createNewRow
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : isSepia
                      ? 'text-[#3f2e22]'
                      : 'text-slate-700 dark:text-neutral-200'
                  }`}
                >
                  {createNewRow ? 'Create new Row' : 'In Last Row'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Smart Operations List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
              Smart Calculations
            </h3>
            <span className="text-[10px] text-slate-400">1-click formula execution</span>
          </div>

          <div className="space-y-1.5">
            {operations.map((op) => {
              const isSelected = selectedOp === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOp(op.id)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'border-blue-600 bg-blue-950/40 text-blue-100 shadow-2xs'
                        : isSepia
                        ? 'border-[#5c4033] bg-[#ede0cb] text-[#2c231c] shadow-2xs'
                        : 'border-[#185abd] bg-blue-50/70 text-blue-950 shadow-2xs'
                      : opCardBaseBg
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? isSepia
                            ? 'bg-[#5c4033] text-white'
                            : 'bg-blue-600 text-white'
                          : isDark
                          ? 'bg-neutral-700 text-neutral-300'
                          : isSepia
                          ? 'bg-[#e5d8be] text-[#3f2e22]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {op.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold">{op.name}</span>
                        {isSelected && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSepia ? 'bg-[#5c4033]' : 'bg-blue-600'
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-neutral-400 leading-none">
                        {op.description}
                      </span>
                    </div>
                  </div>

                  {/* 1-click direction buttons right on the card */}
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleCalculate(op.id, 'RIGHT')}
                      title={`Calculate ${op.name} → RIGHT`}
                      className={`px-2 py-1 text-[11px] font-semibold border rounded cursor-pointer transition-colors flex items-center space-x-0.5 active:scale-95 ${btnSecondaryBg}`}
                    >
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => handleCalculate(op.id, 'DOWN')}
                      title={`Calculate ${op.name} ↓ DOWN`}
                      className={`px-2 py-1 text-[11px] font-semibold border rounded cursor-pointer transition-colors flex items-center space-x-0.5 active:scale-95 ${btnSecondaryBg}`}
                    >
                      <span>↓</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Sort Section (Green Background Button - Sorts ONLY Selected Area) */}
        <div className={`p-3 rounded-xl border space-y-2.5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-200 flex items-center space-x-1.5">
              <ArrowUpDown size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Smart Sort (Selected Area)</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              Only Selection
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight">
            Sorts <b>only</b> the selected cells/rows. Detects numbers, currencies, and text. Outside cells and rows are preserved.
          </p>

          {/* If multi-column selection, pick which column to sort by */}
          {tableData && tableData.rect.right - tableData.rect.left > 1 && (
            <div>
              <label className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1 font-medium">
                Sort By Column
              </label>
              <select
                value={activeSortCol}
                onChange={(e) => setSortColumnIndex(Number(e.target.value))}
                className={`w-full text-xs p-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${inputBg}`}
              >
                {Array.from({ length: tableData.rect.right - tableData.rect.left }).map((_, i) => {
                  const c = tableData.rect.left + i;
                  return (
                    <option key={c} value={c}>
                      {getColumnName(c)} (Column {c + 1})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Action: Prominent Green Sort Button with Asc/Desc toggle */}
          <div className="space-y-1.5">
            <button
              onClick={() => handleSortSelectedArea(sortOrder)}
              disabled={!tableData}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:from-emerald-800 active:to-green-800 text-white font-semibold text-xs flex items-center justify-between shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-98"
              title={`Sort only selected area in ${sortOrder === 'asc' ? 'Ascending (A → Z, 0 → 9)' : 'Descending (Z → A, 9 → 0)'} order`}
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  {sortOrder === 'asc' ? <ArrowDownAZ size={15} /> : <ArrowUpZA size={15} />}
                </div>
                <div className="text-left">
                  <div className="leading-tight">Sort Selected Area</div>
                  <div className="text-[10px] font-normal text-emerald-100 leading-tight">
                    {sortOrder === 'asc' ? 'Ascending (A → Z, 1 → 9)' : 'Descending (Z → A, 9 → 1)'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-black/15 text-[11px] font-bold">
                {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
              </span>
            </button>

            {/* Quick 1-click direction buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setSortOrder('asc');
                  handleSortSelectedArea('asc');
                }}
                disabled={!tableData}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors disabled:opacity-50 ${
                  sortOrder === 'asc'
                    ? isDark
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-semibold'
                      : isSepia
                      ? 'bg-[#e5f0e4] border-[#2e5d38] text-[#1c3e24] font-semibold'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                    : btnSecondaryBg
                }`}
                title="Sort selected area Ascending (A-Z / smallest to largest)"
              >
                <ArrowDownAZ size={13} className={isSepia ? 'text-[#2e5d38]' : 'text-emerald-600 dark:text-emerald-400'} />
                <span>Ascending (A–Z)</span>
              </button>

              <button
                onClick={() => {
                  setSortOrder('desc');
                  handleSortSelectedArea('desc');
                }}
                disabled={!tableData}
                className={`py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors disabled:opacity-50 ${
                  sortOrder === 'desc'
                    ? isDark
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-semibold'
                      : isSepia
                      ? 'bg-[#e5f0e4] border-[#2e5d38] text-[#1c3e24] font-semibold'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                    : btnSecondaryBg
                }`}
                title="Sort selected area Descending (Z-A / largest to smallest)"
              >
                <ArrowUpZA size={13} className={isSepia ? 'text-[#2e5d38]' : 'text-emerald-600 dark:text-emerald-400'} />
                <span>Descending (Z–A)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Formatting & Behavior Settings */}
        <div className={`p-3 rounded-xl border space-y-2.5 ${cardBg}`}>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300 flex items-center space-x-1">
            <Sparkles size={12} className={isSepia ? 'text-[#5c4033]' : 'text-blue-500'} />
            <span>Format &amp; Behavior</span>
          </h4>

          {/* Number Format Selector */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-1">
              Result Number Format
            </label>
            <select
              value={formatMode}
              onChange={(e) => setFormatMode(e.target.value as FormatMode)}
              className={`w-full text-xs p-1.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputBg}`}
            >
              <option value="auto">Auto (Match input currency &amp; decimals)</option>
              <option value="2dec">Standard Decimal (1,234.56)</option>
              <option value="int">Integer (1,235)</option>
              <option value="currDollar">Currency $ ($1,234.56)</option>
              <option value="currEuro">Currency € (1.234,56 €)</option>
              <option value="percent">Percentage (12.5%)</option>
              <option value="raw">Raw Unformatted (1234.56)</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-1.5 pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={makeBold}
                onChange={(e) => setMakeBold(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Bold result in destination cell</span>
            </label>
          </div>
        </div>

        {/* Quick Selection Helpers */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
            Quick Selectors
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={selectCurrentRow}
              disabled={!tableData}
              className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors ${btnSecondaryBg}`}
            >
              <Rows size={13} />
              <span>Select Row</span>
            </button>
            <button
              onClick={selectCurrentCol}
              disabled={!tableData}
              className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors ${btnSecondaryBg}`}
            >
              <Columns size={13} />
              <span>Select Col</span>
            </button>
            <button
              onClick={selectEntireTable}
              disabled={!tableData}
              className={`col-span-2 py-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors ${btnSecondaryBg}`}
            >
              <TableIcon size={13} />
              <span>Select Entire Table</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {lastFeedback && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200 text-xs flex items-center space-x-2 animate-fade-in">
            <Check size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="leading-tight">{lastFeedback}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default TableToolsSidebar;
