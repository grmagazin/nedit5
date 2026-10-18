/**
 * cleanEmptyLines.ts
 * High-performance, lazy-loaded text transformation utility.
 * - Removes empty/whitespace lines in selected text (or full document)
 * - Merges 1-character lines into the beginning of the next line
 * - STRICT TARGET: PRESERVE ALL images, photos, tables, and inline formatting (bold, italic, colors, links)
 * Example:
 *   fe
 *   😎
 *   ΧΑΧΑΧΑ!
 * Converted to:
 *   fe
 *   😎 ΧΑΧΑΧΑ!
 */

import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';

/**
 * Accurately count Unicode graphemes (handles emojis, surrogate pairs, symbols, and combining marks).
 */
export function getGraphemeCount(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter();
    return [...segmenter.segment(trimmed)].length;
  }
  return Array.from(trimmed).length;
}

/**
 * DOM-preserving line cleaner.
 * Strictly preserves tables, images, and rich formatting.
 */
export function cleanContainerDom(container: HTMLElement): {
  emptyLinesRemoved: number;
  singleCharsMerged: number;
} {
  let emptyLinesRemoved = 0;
  let singleCharsMerged = 0;

  // 1. Remove truly empty paragraphs & blocks (NEVER touch tables, photos/images, hr, or media)
  const paragraphs = Array.from(container.querySelectorAll('p, div'));
  for (const p of paragraphs) {
    // If it contains photos, tables, or interactive media, strictly KEEP it!
    if (p.querySelector('img, table, iframe, hr, audio, video, svg, .divTable')) {
      continue;
    }
    const text = p.textContent?.trim() || '';
    if (text === '') {
      p.remove();
      emptyLinesRemoved++;
    }
  }

  // 2. Merge single-character lines/paragraphs to the next line/paragraph
  const children = Array.from(container.children);
  for (let i = 0; i < children.length - 1; i++) {
    const el = children[i] as HTMLElement;
    const nextEl = children[i + 1] as HTMLElement;

    // Must be a paragraph or div without photos/tables
    if (
      (el.tagName === 'P' || el.tagName === 'DIV') &&
      !el.querySelector('img, table, iframe, hr') &&
      !nextEl.querySelector('table, iframe')
    ) {
      const text = el.textContent?.trim() || '';
      if (getGraphemeCount(text) === 1) {
        // Prepend character's innerHTML (preserving any bold, color, mark) to nextEl
        const charHtml = el.innerHTML.trim();
        nextEl.innerHTML = `${charHtml} ${nextEl.innerHTML}`;
        el.remove();
        singleCharsMerged++;
      }
    }
  }

  // 3. Handle soft breaks (<br>) within paragraphs:
  // Remove consecutive <br> and join single characters followed by <br>
  const remainingPs = Array.from(container.querySelectorAll('p, div'));
  for (const p of remainingPs) {
    if (p.querySelector('table, img')) continue;

    // Clean duplicate consecutive <br>
    p.innerHTML = p.innerHTML.replace(/(<br\s*\/?>\s*){2,}/gi, '<br />');

    // If single char is separated by <br>: "😎<br />ΧΑΧΑΧΑ!" -> "😎 ΧΑΧΑΧΑ!"
    p.innerHTML = p.innerHTML.replace(
      /(^|<br\s*\/?>)\s*([^<>\s]|[\uD800-\uDBFF][\uDC00-\uDFFF])\s*<br\s*\/?>\s*([^\s<])/gi,
      (_m, prefix, char, nextChar) => {
        singleCharsMerged++;
        return `${prefix}${char} ${nextChar}`;
      }
    );
  }

  return { emptyLinesRemoved, singleCharsMerged };
}

/**
 * Remove empty lines and join single-character lines with the next line in the TipTap editor.
 * Operates on selected text if a selection exists, or across the whole document.
 * Strictly preserves all images, photos, tables, and rich formatting.
 */
export function removeEmptyLinesAndOrphans(editor: Editor): {
  emptyLinesRemoved: number;
  singleCharsMerged: number;
} {
  if (!editor || editor.isDestroyed) {
    return { emptyLinesRemoved: 0, singleCharsMerged: 0 };
  }

  const { empty } = editor.state.selection;

  // Case 1: Operates on selected text, keeping all formatting, images, and tables intact
  if (!empty) {
    const slice = editor.state.selection.content();
    const container = document.createElement('div');
    const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content);
    container.appendChild(fragment);

    const { emptyLinesRemoved, singleCharsMerged } = cleanContainerDom(container);

    if (container.childNodes.length === 0) {
      editor.chain().focus().deleteSelection().run();
      return { emptyLinesRemoved, singleCharsMerged };
    }

    editor.chain().focus().insertContent(container.innerHTML).run();
    return { emptyLinesRemoved, singleCharsMerged };
  }

  // Case 2: Operates on full document HTML if no selection
  const rawHtml = editor.getHTML();
  if (typeof DOMParser === 'undefined') {
    return { emptyLinesRemoved: 0, singleCharsMerged: 0 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const { emptyLinesRemoved, singleCharsMerged } = cleanContainerDom(doc.body);

  editor.commands.setContent(doc.body.innerHTML);
  return { emptyLinesRemoved, singleCharsMerged };
}
