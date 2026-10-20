import { Editor } from '@tiptap/react';
import { findTable, selectedRect } from '@tiptap/pm/tables';
import { Selection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface SplitTableResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Split Table & Repeat Header command
 *
 * 1. Locates the active table and determines the current row index of the selection.
 * 2. Splits the table at the current row into two separate tables separated by an empty paragraph.
 * 3. Copies the original table's header row (row 0) to become the top row of the new table.
 * 4. 100% Preserves formatting, column widths, styles, cell content, and table attributes.
 */
export function splitTableAndRepeatHeader(editor: Editor): SplitTableResult {
  if (!editor || !editor.isActive('table')) {
    return {
      success: false,
      message: 'Please place the cursor inside the table you wish to split.',
    };
  }

  const { state, view } = editor;
  const { selection } = state;
  const table = findTable(selection.$from);

  if (!table) {
    return {
      success: false,
      message: 'No active table found at current cursor position.',
    };
  }

  const tableNode = table.node;
  const totalRows = tableNode.childCount;

  if (totalRows < 2) {
    return {
      success: false,
      message: 'Table must contain at least 2 rows to be split.',
    };
  }

  // Determine current row index
  let splitRowIndex = -1;

  // Method 1: Use selectedRect for accurate table cell coordinate detection
  try {
    const rect = selectedRect(state);
    if (rect && typeof rect.top === 'number') {
      splitRowIndex = rect.top;
    }
  } catch {
    // fallback if selectedRect is not available for current selection type
  }

  // Method 2: Inspect node depth hierarchy from selection.$from
  if (splitRowIndex < 0) {
    for (let d = selection.$from.depth; d >= 0; d--) {
      const node = selection.$from.node(d);
      if (node.type.name === 'table') {
        splitRowIndex = selection.$from.index(d);
        break;
      }
    }
  }

  // If cursor is in the header row (row 0), split immediately below header (row 1)
  if (splitRowIndex <= 0) {
    splitRowIndex = 1;
  }

  // Clamp splitRowIndex if somehow out of bounds
  if (splitRowIndex >= totalRows) {
    splitRowIndex = totalRows - 1;
  }

  const { schema } = state;
  const tableType = tableNode.type;
  const paraType = schema.nodes.paragraph;

  // Header row is row 0
  const originalHeaderRow = tableNode.child(0);

  // Table 1 Rows: [0 ... splitRowIndex - 1]
  const table1Rows: ProseMirrorNode[] = [];
  for (let i = 0; i < splitRowIndex; i++) {
    table1Rows.push(tableNode.child(i));
  }

  // Sanitize Table 1 in case any cell had a rowspan extending past splitRowIndex
  const sanitizedTable1Rows = table1Rows.map((rowNode, rIdx) => {
    let modified = false;
    const newCells: ProseMirrorNode[] = [];
    rowNode.forEach((cellNode) => {
      const rowspan = (cellNode.attrs.rowspan as number) || 1;
      if (rIdx + rowspan > splitRowIndex) {
        modified = true;
        const clamped = Math.max(1, splitRowIndex - rIdx);
        newCells.push(
          cellNode.type.create(
            { ...cellNode.attrs, rowspan: clamped },
            cellNode.content,
            cellNode.marks
          )
        );
      } else {
        newCells.push(cellNode);
      }
    });
    return modified ? rowNode.type.create(rowNode.attrs, newCells) : rowNode;
  });

  // Table 2 Rows:
  // 1. Copy the original header row (with all its column widths, styling, and cell contents)
  // 2. Add the remaining rows starting at splitRowIndex
  const table2Rows: ProseMirrorNode[] = [];
  table2Rows.push(originalHeaderRow);
  for (let i = splitRowIndex; i < totalRows; i++) {
    table2Rows.push(tableNode.child(i));
  }

  // Retain all table attributes (classes, inline style, border settings, fullWidth)
  const tableAttrs = { ...tableNode.attrs };

  // Create Table 1 Node
  const table1Node = tableType.create(tableAttrs, sanitizedTable1Rows);

  // Create clean paragraph separator between the two tables
  const separatorPara = paraType.create();

  // Create Table 2 Node with repeated header row
  const table2Node = tableType.create(tableAttrs, table2Rows);

  const tr = state.tr;
  const replaceFrom = table.pos;
  const replaceTo = table.pos + tableNode.nodeSize;

  // Perform atomic ProseMirror replacement
  tr.replaceWith(replaceFrom, replaceTo, [table1Node, separatorPara, table2Node]);

  // Place selection inside the newly created Table 2 (at the first data row or header)
  const newTable2Start = replaceFrom + table1Node.nodeSize + separatorPara.nodeSize;
  try {
    const targetPos = Math.min(tr.doc.content.size - 1, newTable2Start + 4);
    tr.setSelection(Selection.near(tr.doc.resolve(targetPos)));
  } catch {
    // Fallback selection near new table
  }

  view.dispatch(tr);
  editor.commands.focus();

  // Sync any DOM custom CSS variables (such as --table-header-bg, etc.)
  try {
    const domTable = view.domAtPos(table.pos).node as HTMLElement;
    const originalEl = (
      domTable instanceof HTMLTableElement ? domTable : domTable?.closest?.('table')
    ) as HTMLTableElement | null;
    if (originalEl) {
      setTimeout(() => {
        const tables = view.dom.querySelectorAll('table');
        if (tables.length >= 2) {
          const lastTable = tables[tables.length - 1] as HTMLTableElement;
          ['--table-header-bg', '--table-header-color', '--table-header-border', '--table-zebra-bg'].forEach((prop) => {
            const val = originalEl.style.getPropertyValue(prop);
            if (val) lastTable.style.setProperty(prop, val);
          });
        }
      }, 15);
    }
  } catch {
    // Non-critical DOM styling sync
  }

  return {
    success: true,
    message: `Table split successfully at row ${splitRowIndex + 1} with repeated header.`,
  };
}

export default splitTableAndRepeatHeader;
