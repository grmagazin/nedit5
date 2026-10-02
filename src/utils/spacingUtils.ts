/**
 * spacingUtils.ts
 *
 * Utilities for line, paragraph, and table spacing in TipTap / ProseMirror.
 */

import { Editor } from '@tiptap/react';

export const LINE_SPACING_OPTIONS = [
  { value: '0', label: '0', sub: 'lines' },
  { value: '0.5', label: '0.5', sub: 'lines' },
  { value: '1.0', label: '1.0', sub: 'lines' },
  { value: '1.15', label: '1.15', sub: 'lines' },
  { value: '1.5', label: '1.5', sub: 'lines' },
  { value: '2.0', label: '2.0', sub: 'lines' },
  { value: '2.5', label: '2.5', sub: 'lines' },
  { value: '3', label: '3', sub: 'lines' },
];

/**
 * Applies "Clean" (No Spacing) to the selected area:
 * - Line height set to single (1.0) / normal
 * - Paragraph top and bottom margins set to 0px (no space before/after)
 * - Paragraph indents reset to none
 * - Table margins reset to 0 (no table margin spacing)
 * - Table cell padding and margins cleaned to no-spacing (0 padding, 0 margin)
 * - Table cell internal paragraphs reset to 0 margin & 1.0 line height
 */
export function cleanAllSpacing(editor: Editor): void {
  if (!editor || editor.isDestroyed) return;

  const { state, view } = editor;
  const { from, to } = state.selection;
  let tr = state.tr;
  let modified = false;

  // 1. Iterate over all nodes in the selection
  tr.doc.nodesBetween(from, to, (node, pos) => {
    // Clean paragraphs, headings, blockquotes
    if (['paragraph', 'heading', 'blockquote'].includes(node.type.name)) {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        lineHeight: '1.0',
        paragraphSpacingTop: '0px',
        paragraphSpacingBottom: '0px',
        indent: null,
        rightIndent: null,
        firstLineIndent: null,
      });
      modified = true;
    }

    // Clean tables
    if (node.type.name === 'table') {
      let cs = (node.attrs.style || '') as string;
      cs = cs
        .replace(/margin(-[a-z]+)?:\s*[^;]+;?/gi, '')
        .replace(/padding(-[a-z]+)?:\s*[^;]+;?/gi, '')
        .replace(/border-spacing:\s*[^;]+;?/gi, '')
        .trim();
      cs = `${cs} margin: 0; border-spacing: 0;`.trim();
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        style: cs,
      });
      modified = true;
    }

    // Clean table cells and table headers
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      let cs = (node.attrs.style || '') as string;
      cs = cs
        .replace(/margin(-[a-z]+)?:\s*[^;]+;?/gi, '')
        .replace(/padding(-[a-z]+)?:\s*[^;]+;?/gi, '')
        .trim();
      cs = `${cs} padding: 0px; margin: 0;`.trim();
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        style: cs,
      });
      modified = true;
    }
  });

  // 2. If selection is inside a table, also clean the enclosing table and all its cells
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    const ancestor = $from.node(d);
    if (ancestor.type.name === 'table') {
      const tablePos = $from.before(d);
      tr.doc.nodesBetween(tablePos, tablePos + ancestor.nodeSize, (node, pos) => {
        if (node.type.name === 'table') {
          let cs = (node.attrs.style || '') as string;
          cs = cs
            .replace(/margin(-[a-z]+)?:\s*[^;]+;?/gi, '')
            .replace(/padding(-[a-z]+)?:\s*[^;]+;?/gi, '')
            .replace(/border-spacing:\s*[^;]+;?/gi, '')
            .trim();
          cs = `${cs} margin: 0; border-spacing: 0;`.trim();
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: cs });
          modified = true;
        }
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          let cs = (node.attrs.style || '') as string;
          cs = cs
            .replace(/margin(-[a-z]+)?:\s*[^;]+;?/gi, '')
            .replace(/padding(-[a-z]+)?:\s*[^;]+;?/gi, '')
            .trim();
          cs = `${cs} padding: 0px; margin: 0;`.trim();
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, style: cs });
          modified = true;
        }
        if (['paragraph', 'heading', 'blockquote'].includes(node.type.name)) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            lineHeight: '1.0',
            paragraphSpacingTop: '0px',
            paragraphSpacingBottom: '0px',
          });
          modified = true;
        }
      });
      break;
    }
  }

  if (modified) {
    view.dispatch(tr);
  }
}
