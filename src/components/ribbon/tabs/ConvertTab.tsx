import React from 'react';
import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import {
  Space,
  RemoveFormatting,
  Globe,
  ShieldCheck,
  Wand2,
  BookOpen,
  Combine,
  Scissors,
  FoldVertical,
  Unlink,
  ImageOff,
  Ruler,
  Eraser,
  Tag,
  Sparkles,
} from 'lucide-react';
import { DocumentSettings } from '../../../types';
import { cleanAllSpacing } from '../../../utils/spacingUtils';

export interface ConvertTabProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings?: (newSettings: Partial<DocumentSettings>) => void;
  isDarkUi?: boolean;
  onNotify?: (msg: string) => void;
}

export const ConvertTab: React.FC<ConvertTabProps> = ({
  editor,
  isDarkUi = false,
  onNotify,
}) => {
  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // 1. Fix spaces
  const handleFixSpaces = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to);
      const fixed = text
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/([.,;:!?])(?=[A-Za-z])/g, '$1 ');
      editor.chain().focus().insertContent(fixed).run();
    } else {
      let html = editor.getHTML();
      html = html
        .replace(/(&nbsp;|\s){2,}/gi, ' ')
        .replace(/\s+([.,;:!?])/g, '$1');
      editor.commands.setContent(html);
    }
    notify('Clean: Fixed spaces and normalized spacing.');
  };

  // 2. Clear format
  const handleClearFormat = () => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
    notify('Clean: Formatting cleared.');
  };

  // 3. Web Clean (Allows and keeps tables intact!)
  const handleWebClean = async () => {
    if (!editor) return;
    try {
      const { executeWebClean } = await import('../../../utils/webJunkCleaner');
      const res = executeWebClean(editor, { keepTables: true });
      notify(
        `Web Clean: Sanitized article content (tables preserved, ${res.junkElementsRemoved} web noise removed, ${res.divsCleaned} divs cleaned).`
      );
    } catch (err) {
      console.error('Web Clean error:', err);
    }
  };

  // 4. Web Junk Clean (Cleans web noise AND unwraps tables into text!)
  const handleWebJunkClean = async () => {
    if (!editor) return;
    try {
      const { executeWebJunkClean } = await import('../../../utils/webJunkCleaner');
      const res = executeWebJunkClean(editor);
      notify(
        `Web Junk Clean: Sanitized article content and unwrapped ${res.tablesUnwrapped} tables to text (${res.junkElementsRemoved} web noise removed).`
      );
    } catch (err) {
      console.error('Web Junk Clean error:', err);
    }
  };

  // 5. Normalize
  const handleNormalize = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/"([^"]*)"/g, '“$1”');
    html = html.replace(/(\w)'(\w)/g, '$1’$2');
    html = html.replace(/--/g, '—');
    html = html.replace(/\.{3}/g, '…');
    html = html.replace(/(<p>\s*<\/p>){2,}/gi, '<p></p>');
    editor.commands.setContent(html);
    notify('Clean: Typography and paragraph spacing normalized.');
  };

  // 6. Clean wiki
  const handleCleanWiki = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/\[(?:\d+|citation needed|edit|note \d+|source)\]/gi, '');
    html = html.replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '');
    html = html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
    editor.commands.setContent(html);
    notify('Clean: Wikipedia reference citations removed.');
  };

  // 7. Merge Paragraphs
  const handleMergeParagraphs = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to, '\n');
      const merged = text.split('\n').map((s) => s.trim()).filter(Boolean).join(' ');
      editor.chain().focus().insertContent(merged).run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/<\/p>\s*<p>/gi, ' ');
      editor.commands.setContent(html);
    }
    notify('Structure: Paragraphs merged into flowing text.');
  };

  // 8. Split Sentences
  const handleSplitSentences = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to);
      const split = text.replace(/([.!?])\s+(?=[A-Z0-9"“'‘])/g, '$1\n\n');
      editor.chain().focus().insertContent(split).run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/([.!?])\s+(?=[A-Z0-9"“'‘])/g, '$1</p><p>');
      editor.commands.setContent(html);
    }
    notify('Structure: Text split into individual sentences.');
  };

  // 9. Remove empty lines and single-char orphans
  const handleRemoveEmptyLines = async () => {
    if (!editor) return;
    try {
      const { removeEmptyLinesAndOrphans } = await import('../../../utils/cleanEmptyLines');
      const { emptyLinesRemoved, singleCharsMerged } = removeEmptyLinesAndOrphans(editor);
      notify(
        `Remove empty lines: ${emptyLinesRemoved} empty line${emptyLinesRemoved === 1 ? '' : 's'} removed, ${singleCharsMerged} character${singleCharsMerged === 1 ? '' : 's'} joined.`
      );
    } catch (err) {
      console.error('Error removing empty lines:', err);
    }
  };

  // 10. Rm Links
  const handleRemoveLinks = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      editor.chain().focus().unsetLink().run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
      editor.commands.setContent(html);
    }
    notify('HTML: Removed links while preserving text.');
  };

  // 11. Rm Images
  const handleRemoveImages = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<img\b[^>]*>/gi, '');
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '');
    editor.commands.setContent(html);
    notify('HTML: Removed all images from document.');
  };

  // 12. Responsive
  const handleMakeResponsive = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<table\b([^>]*)>/gi, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\s*(width|height)="[^"]*"/gi, '')
        .replace(/\s*style="[^"]*"/gi, '');
      return `<table ${cleanAttrs} style="width: 100%; max-width: 100%; border-collapse: collapse;">`;
    });
    html = html.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\s*(width|height)="[^"]*"/gi, '')
        .replace(/\s*style="[^"]*"/gi, '');
      return `<img ${cleanAttrs} style="max-width: 100%; height: auto; display: block;" />`;
    });
    editor.commands.setContent(html);
    notify('HTML: Responsive rules applied to tables & images.');
  };

  // 13. Rm Attrs
  const handleRemoveAttributes = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<([a-z0-9]+)\b([^>]*)>/gi, (_match, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag === 'a') {
        const hrefMatch = attrs.match(/href="([^"]*)"/i);
        return hrefMatch ? `<a href="${hrefMatch[1]}">` : '<a>';
      }
      if (lowerTag === 'img') {
        const srcMatch = attrs.match(/src="([^"]*)"/i);
        const altMatch = attrs.match(/alt="([^"]*)"/i);
        return `<img ${srcMatch ? srcMatch[0] : ''} ${altMatch ? altMatch[0] : ''} />`;
      }
      return `<${tag}>`;
    });
    editor.commands.setContent(html);
    notify('HTML: Removed all HTML attributes (style, class, id, width).');
  };

  // 14. Clean Tags / Rm Tags
  const handleRemoveTags = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<\/?(span|div|font|center|section|article|header|footer|aside)\b[^>]*>/gi, '');
    editor.commands.setContent(html);
    notify('HTML: Cleaned wrapper tags (span, div, font, center).');
  };

  // 15. Table to DIV converter
  const handleTableToDiv = () => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;

    let targetTablePos: number | null = null;
    let targetTableNode: any = null;

    for (let d = selection.$from.depth; d > 0; d--) {
      const node = selection.$from.node(d);
      if (node.type.name === 'table') {
        targetTablePos = selection.$from.before(d);
        targetTableNode = node;
        break;
      }
    }

    if (!targetTableNode) {
      if (!selection.empty) {
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'table' && targetTableNode === null) {
            targetTablePos = pos;
            targetTableNode = node;
            return false;
          }
        });
      }

      if (!targetTableNode) {
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'table' && targetTableNode === null) {
            targetTablePos = pos;
            targetTableNode = node;
            return false;
          }
        });
      }
    }

    if (!targetTableNode || targetTablePos === null) {
      notify('Table to DIV: No table found to convert.');
      return;
    }

    let tableEl: HTMLTableElement | null = null;
    try {
      const dom = DOMSerializer.fromSchema(editor.schema).serializeNode(targetTableNode);
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(dom);
      tableEl = tempContainer.querySelector('table');
    } catch {
      // Fallback
    }

    if (!tableEl) {
      notify('Table to DIV: Could not parse table contents.');
      return;
    }

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    if (rows.length === 0) {
      notify('Table to DIV: Selected table has no rows.');
      return;
    }

    let convertedRowsHtml = '';

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.children) as HTMLElement[];
      const isHeaderRow =
        rowIndex === 0 &&
        (row.querySelector('th') !== null || cells.some((c) => c.tagName.toLowerCase() === 'th'));

      let cellsHtml = '';
      cells.forEach((cell, cellIndex) => {
        let innerHtml = cell.innerHTML.trim();
        if (!innerHtml.startsWith('<p') && !innerHtml.startsWith('<div')) {
          if (isHeaderRow && !innerHtml.includes('<strong>')) {
            innerHtml = `<p><strong>${innerHtml || '&nbsp;'}</strong></p>`;
          } else {
            innerHtml = `<p>${innerHtml || '&nbsp;'}</p>`;
          }
        }

        const isLastCell = cellIndex === cells.length - 1;
        cellsHtml += `<div class="divTableCell" style="flex: 1; min-width: 0; padding: 10px 14px; ${
          isLastCell ? '' : 'border-right: 1px solid #e2e8f0;'
        } word-break: break-word;">${innerHtml}</div>`;
      });

      const rowClass = isHeaderRow ? 'divTableRow divTableHeading' : 'divTableRow';
      const rowBg = isHeaderRow
        ? 'background-color: #f1f5f9; font-weight: 600;'
        : rowIndex % 2 === 1
        ? 'background-color: #f8fafc;'
        : 'background-color: #ffffff;';
      const isLastRow = rowIndex === rows.length - 1;

      convertedRowsHtml += `<div class="${rowClass}" style="display: flex; width: 100%; ${
        isLastRow ? '' : 'border-bottom: 1px solid #e2e8f0;'
      } ${rowBg}">${cellsHtml}</div>`;
    });

    const fullConvertedHtml = `<div class="divTable" style="display: flex; flex-direction: column; width: 100%; margin: 1.25rem 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${convertedRowsHtml}</div>`;

    editor
      .chain()
      .focus()
      .deleteRange({ from: targetTablePos, to: targetTablePos + targetTableNode.nodeSize })
      .insertContentAt(targetTablePos, fullConvertedHtml)
      .run();

    notify('HTML: Converted table to responsive <DIV> paragraphs.');
  };

  const btnClass = `p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px] ${
    isDarkUi ? 'hover:bg-neutral-800 text-neutral-300' : ''
  }`;

  return (
    <div className="flex items-start space-x-0 w-full select-none pt-0.5">
      {/* GROUP 1: Clean (Fix spaces, clear format, web clean, web junk clean, normalize, clean wiki) */}
      <div className="flex flex-col items-center pr-3">
        <div className="flex items-start space-x-1.5">
          {/* 1. Fix spaces */}
          <button
            onClick={handleFixSpaces}
            title="Fix spaces"
            aria-label="Fix spaces"
            className={btnClass}
          >
            <Space size={20} className="text-[#334155]" />
          </button>

          {/* 2. Clear format */}
          <button
            onClick={handleClearFormat}
            title="Clear format"
            aria-label="Clear format"
            className={btnClass}
          >
            <RemoveFormatting size={20} className="text-[#334155]" />
          </button>

          {/* 3. Web clean (Keeps tables intact) */}
          <button
            onClick={handleWebClean}
            title="Web clean (Keeps tables intact)"
            aria-label="Web clean"
            className={btnClass}
          >
            <Globe size={20} className="text-[#334155]" />
          </button>

          {/* 4. Web junk clean (Unwraps/cleans tables to text) */}
          <button
            onClick={handleWebJunkClean}
            title="Web junk clean (Cleans junk and unwraps tables to text)"
            aria-label="Web junk clean"
            className={btnClass}
          >
            <ShieldCheck size={20} className="text-[#334155]" />
          </button>

          {/* 5. Normalize */}
          <button
            onClick={handleNormalize}
            title="Normalize"
            aria-label="Normalize"
            className={btnClass}
          >
            <Wand2 size={20} className="text-[#334155]" />
          </button>

          {/* 6. Clean wiki */}
          <button
            onClick={handleCleanWiki}
            title="Clean wiki"
            aria-label="Clean wiki"
            className={btnClass}
          >
            <BookOpen size={20} className="text-[#334155]" />
          </button>
        </div>

        {/* Centered Footer Label: Clean */}
        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          Clean
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

      {/* GROUP 2: Structure (Merge, Split, Remove empty lines) */}
      <div className="flex flex-col items-center pr-1.5">
        <div className="flex items-start space-x-1.5">
          {/* 7. Merge */}
          <button
            onClick={handleMergeParagraphs}
            title="Merge"
            aria-label="Merge"
            className={btnClass}
          >
            <Combine size={20} className="text-[#334155]" />
          </button>

          {/* 8. Split */}
          <button
            onClick={handleSplitSentences}
            title="Split"
            aria-label="Split"
            className={btnClass}
          >
            <Scissors size={20} className="text-[#334155]" />
          </button>

          {/* 9. Remove empty lines */}
          <button
            onClick={handleRemoveEmptyLines}
            title="Remove empty lines"
            aria-label="Remove empty lines"
            className={btnClass}
          >
            <FoldVertical size={20} className="text-[#334155]" />
          </button>
        </div>

        {/* Centered Footer Label: Structure */}
        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          Structure
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

      {/* GROUP 3: HTML (Rm Links, Rm Images, Responsive, Rm Attrs, Clean Tags, Spacing, Table to DIV) */}
      <div className="flex flex-col items-center pr-1.5">
        <div className="flex items-start space-x-1.5">
          {/* 10. Rm Links */}
          <button
            onClick={handleRemoveLinks}
            title="Rm Links"
            aria-label="Rm Links"
            className={btnClass}
          >
            <Unlink size={20} className="text-[#334155]" />
          </button>

          {/* 11. Rm Images */}
          <button
            onClick={handleRemoveImages}
            title="Rm Images"
            aria-label="Rm Images"
            className={btnClass}
          >
            <ImageOff size={20} className="text-[#334155]" />
          </button>

          {/* 12. Responsive */}
          <button
            onClick={handleMakeResponsive}
            title="Responsive"
            aria-label="Responsive"
            className={btnClass}
          >
            <Ruler size={20} className="text-[#334155]" />
          </button>

          {/* 13. Rm Attrs */}
          <button
            onClick={handleRemoveAttributes}
            title="Rm Attrs"
            aria-label="Rm Attrs"
            className={btnClass}
          >
            <Eraser size={20} className="text-[#334155]" />
          </button>

          {/* 14. Clean Tags / Rm Tags */}
          <button
            onClick={handleRemoveTags}
            title="Clean Tags / Rm Tags"
            aria-label="Clean Tags"
            className={btnClass}
          >
            <Tag size={20} className="text-[#334155]" />
          </button>

          {/* 15. Spacing */}
          <button
            onClick={() => {
              if (editor) {
                cleanAllSpacing(editor);
              }
            }}
            title="Spacing"
            aria-label="Spacing"
            className={btnClass}
          >
            <Sparkles size={20} className="text-[#334155]" />
          </button>

          {/* 16. Table to DIV converter */}
          <button
            onClick={handleTableToDiv}
            title="Table to DIV converter"
            aria-label="Table to DIV converter"
            className={btnClass}
          >
            <span className="font-mono font-bold text-[11px] text-[#334155] leading-none tracking-tight select-none">
              &lt;DIV&gt;
            </span>
          </button>
        </div>

        {/* Centered Footer Label: HTML */}
        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          HTML
        </span>
      </div>
    </div>
  );
};

export default ConvertTab;
