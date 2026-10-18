/**
 * webJunkCleaner.ts
 * HTML Content Sanitizer & Article Preparation Engine for Nedit 5.XX.
 * 
 * Specifically targets common web noise and prepares clean, publication-ready articles:
 * 1. <script>      - Remove completely
 * 2. <style>       - Remove central CSS block, preserve inline formatting
 * 3. <iframe>      - Remove completely
 * 4. <nav>         - Remove completely
 * 5. <header>      - Remove website header/navigation (while preserving <h1>-<h6> headings)
 * 6. <footer>      - Remove website footer
 * 7. <aside>       - Remove non-article sidebar
 * 8. Ads containers- Remove identified advertisements & tracking pixels
 * 9. Empty <div>   - Remove completely
 * 10. Unnecessary <div> - Unwrap, preserve meaningful children (convert inline divs to semantic <p>)
 * 11. Tables       - Remove tables (keep only the content in the tables), leaving NO tables!
 */

import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';

export interface WebCleanOptions {
  keepTables?: boolean;
}

export interface WebCleanResult {
  junkElementsRemoved: number;
  tablesUnwrapped: number;
  divsCleaned: number;
  linksSanitized: number;
  emptyLinesCleaned: number;
}

/**
 * Unwraps all <table> elements: removes the table, thead, tbody, tr, td, th elements
 * but strictly preserves all cell content (text, paragraphs, images, formatting).
 */
export function unwrapAllTables(container: HTMLElement): number {
  const tables = Array.from(container.querySelectorAll('table'));
  let tablesUnwrapped = 0;

  for (const table of tables) {
    if (!table.parentElement) continue;

    const rows = Array.from(table.querySelectorAll('tr'));
    const fragment = document.createDocumentFragment();

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const validCells = cells.filter((c) => {
        return c.textContent?.trim() !== '' || c.querySelector('img, svg, audio, video');
      });

      if (validCells.length === 0) continue;

      // Check if any cell has block elements
      const hasBlockChildren = validCells.some((c) =>
        c.querySelector('p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, figure')
      );

      if (hasBlockChildren) {
        // Extract child blocks from each cell directly into fragment
        for (const cell of validCells) {
          while (cell.firstChild) {
            fragment.appendChild(cell.firstChild);
          }
        }
      } else {
        // Inline content: create clean paragraph for the row
        const p = document.createElement('p');
        for (let i = 0; i < validCells.length; i++) {
          const cell = validCells[i];
          while (cell.firstChild) {
            p.appendChild(cell.firstChild);
          }
          if (i < validCells.length - 1) {
            const separator = validCells.length === 2 ? ' — ' : ' • ';
            p.appendChild(document.createTextNode(separator));
          }
        }
        fragment.appendChild(p);
      }
    }

    table.replaceWith(fragment);
    tablesUnwrapped++;
  }

  return tablesUnwrapped;
}

/**
 * Cleans and unwraps non-essential <div> wrappers:
 * - Empty <div> tags are removed.
 * - <div> tags containing child blocks (p, headings, lists) are unwrapped.
 * - <div> tags containing inline text/marks are converted to semantic <p>.
 */
export function cleanAndUnwrapDivs(container: HTMLElement): { emptyDivsRemoved: number; divsUnwrapped: number } {
  let emptyDivsRemoved = 0;
  let divsUnwrapped = 0;

  // Process iteratively up to 10 passes to handle nested wrapper divs
  let pass = 0;
  while (pass < 10) {
    pass++;
    const divs = Array.from(container.querySelectorAll('div'));
    if (divs.length === 0) break;

    let changed = false;
    for (const div of divs) {
      if (!div.parentElement) continue;

      // 1. Remove truly empty div (no text and no media)
      const text = div.textContent?.trim() || '';
      const hasMedia = div.querySelector('img, hr, audio, video, svg, iframe');

      if (text === '' && !hasMedia) {
        div.remove();
        emptyDivsRemoved++;
        changed = true;
        continue;
      }

      // 2. Unwrap div containing child blocks
      const hasChildBlocks = div.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table, figure');
      if (hasChildBlocks) {
        div.replaceWith(...Array.from(div.childNodes));
        divsUnwrapped++;
        changed = true;
        continue;
      }

      // 3. Convert div containing inline text to semantic <p>
      const p = document.createElement('p');
      if (div.getAttribute('style')) {
        p.setAttribute('style', div.getAttribute('style') || '');
      }
      while (div.firstChild) {
        p.appendChild(div.firstChild);
      }
      div.replaceWith(p);
      divsUnwrapped++;
      changed = true;
    }

    if (!changed) break;
  }

  return { emptyDivsRemoved, divsUnwrapped };
}

/**
 * Sanitizes an HTML container in-place using DOM methods.
 */
export function sanitizeWebArticleContainer(
  container: HTMLElement,
  options: WebCleanOptions = { keepTables: true }
): WebCleanResult {
  let junkElementsRemoved = 0;
  let linksSanitized = 0;
  let emptyLinesCleaned = 0;

  // 1. Specific Target Tags to Remove Completely:
  // <script>, <style> (central CSS blocks), <iframe>, <nav>, <header> (site header/nav), <footer> (site footer), <aside> (sidebar)
  const targetTagSelectors = [
    'script',
    'style',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    'noscript',
    'canvas',
    'form',
    'input',
    'button',
    'select',
    'textarea',
    'menu',
    'dialog',
  ];

  for (const tag of targetTagSelectors) {
    const matched = Array.from(container.querySelectorAll(tag));
    for (const el of matched) {
      el.remove();
      junkElementsRemoved++;
    }
  }

  // 2. Remove Identified Ads Containers, Cookie Banners, Popups, and Widgets
  const adAndNoiseSelectors = [
    // Ads & Sponsored banners
    '[class*="ad-"]',
    '[class*="ad_"]',
    '[class*="advertisement"]',
    '[class*="adsbygoogle"]',
    '[id*="ad-"]',
    '[id*="ad_"]',
    '[id*="banner"]',
    '[class*="banner"]',
    '[class*="sponsor"]',
    '[id*="sponsor"]',
    '[role="banner"]',
    '[role="complementary"]',
    '[aria-label*="advertisement" i]',
    '[aria-label*="sponsor" i]',
    // Cookie & Consent popups, Modals, Newsletter subscription bars
    '[class*="cookie"]',
    '[class*="consent"]',
    '[class*="popup"]',
    '[class*="modal"]',
    '[class*="newsletter"]',
    '[class*="subscribe"]',
    // Social share bars & Comment widgets
    '[class*="social-share"]',
    '[class*="share-button"]',
    '[class*="sidebar"]',
    '[class*="related-posts"]',
    '[class*="recommended"]',
    '[class*="outbrain"]',
    '[class*="taboola"]',
    '[class*="disqus"]',
    '[class*="comment-section"]',
  ];

  for (const selector of adAndNoiseSelectors) {
    const matched = Array.from(container.querySelectorAll(selector));
    for (const el of matched) {
      el.remove();
      junkElementsRemoved++;
    }
  }

  // 3. Remove Hidden Web Elements
  const hiddenElements = Array.from(
    container.querySelectorAll('[hidden], [aria-hidden="true"], [style*="display: none"], [style*="visibility: hidden"]')
  );
  for (const el of hiddenElements) {
    el.remove();
    junkElementsRemoved++;
  }

  // 4. Remove 1x1 Tracking Pixels while preserving real content images
  const images = Array.from(container.querySelectorAll('img'));
  for (const img of images) {
    const width = parseInt(img.getAttribute('width') || '0', 10);
    const height = parseInt(img.getAttribute('height') || '0', 10);
    const src = img.getAttribute('src') || '';

    if (
      (width === 1 && height === 1) ||
      src.startsWith('data:image/gif;base64,R0lGODlhAQABA') ||
      /tracking|pixel|beacon|analytics/i.test(src)
    ) {
      img.remove();
      junkElementsRemoved++;
    } else {
      // Make real content images responsive
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    }
  }

  // 5. Tables Handling:
  // TARGET: Web Clean allows/keeps app tables. Web Junk Cleaner unwraps tables into text!
  let tablesUnwrapped = 0;
  if (!options.keepTables) {
    tablesUnwrapped = unwrapAllTables(container);
  }

  // 6. Clean Empty <div> and Unwrap Unnecessary <div>
  const divResult = cleanAndUnwrapDivs(container);
  junkElementsRemoved += divResult.emptyDivsRemoved;

  // 7. Sanitize Links: Strip tracking query parameters (utm_*, fbclid, etc.) and javascript: hrefs
  const links = Array.from(container.querySelectorAll('a'));
  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;

    if (href.startsWith('javascript:')) {
      const span = document.createElement('span');
      span.innerHTML = link.innerHTML;
      link.replaceWith(span);
      linksSanitized++;
      continue;
    }

    try {
      if (href.includes('?')) {
        const [base, query] = href.split('?');
        const params = query.split('&').filter((p) => {
          const key = p.split('=')[0].toLowerCase();
          return !key.startsWith('utm_') && !['fbclid', 'gclid', 'ref', 'source', 'mc_cid', '_hsenc'].includes(key);
        });
        const cleanHref = params.length > 0 ? `${base}?${params.join('&')}` : base;
        if (cleanHref !== href) {
          link.setAttribute('href', cleanHref);
          linksSanitized++;
        }
      }
    } catch {}
  }

  // 8. Clean Disruptive Web Layout Styles while strictly PRESERVING typography & desired formatting
  // Allowed styles: color, font-family, font-size, font-weight, font-style, text-decoration, text-align, background-color
  const styledElements = Array.from(container.querySelectorAll('*[style]'));
  for (const el of styledElements) {
    const htmlEl = el as HTMLElement;
    const style = htmlEl.style;

    const color = style.color;
    const fontFamily = style.fontFamily;
    const fontSize = style.fontSize;
    const fontWeight = style.fontWeight;
    const fontStyle = style.fontStyle;
    const textDecoration = style.textDecoration;
    const textAlign = style.textAlign;
    const backgroundColor = style.backgroundColor;

    // Check if table-related element to preserve structural styles
    const isTableElement = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'].includes(
      htmlEl.tagName.toLowerCase()
    );
    const border = style.border;
    const borderWidth = style.borderWidth;
    const borderStyle = style.borderStyle;
    const borderColor = style.borderColor;
    const borderCollapse = style.borderCollapse;
    const width = style.width;
    const padding = style.padding;
    const verticalAlign = style.verticalAlign;

    // Reset inline style attribute to wipe all web layout positioning (position: absolute, z-index, etc.)
    htmlEl.removeAttribute('style');

    // Re-apply preserved desired typography formatting
    if (color) htmlEl.style.color = color;
    if (fontFamily) htmlEl.style.fontFamily = fontFamily;
    if (fontSize) htmlEl.style.fontSize = fontSize;
    if (fontWeight && fontWeight !== 'normal') htmlEl.style.fontWeight = fontWeight;
    if (fontStyle && fontStyle !== 'normal') htmlEl.style.fontStyle = fontStyle;
    if (textDecoration && textDecoration !== 'none') htmlEl.style.textDecoration = textDecoration;
    if (textAlign) htmlEl.style.textAlign = textAlign;
    if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      htmlEl.style.backgroundColor = backgroundColor;
    }

    // Re-apply table structural styles
    if (isTableElement) {
      if (border) htmlEl.style.border = border;
      if (borderWidth) htmlEl.style.borderWidth = borderWidth;
      if (borderStyle) htmlEl.style.borderStyle = borderStyle;
      if (borderColor) htmlEl.style.borderColor = borderColor;
      if (borderCollapse) htmlEl.style.borderCollapse = borderCollapse;
      if (width) htmlEl.style.width = width;
      if (padding) htmlEl.style.padding = padding;
      if (verticalAlign) htmlEl.style.verticalAlign = verticalAlign;
    }
  }

  // 9. Strip Microsoft Office & CMS Junk Attributes
  const allElements = Array.from(container.querySelectorAll('*'));
  for (const el of allElements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (
        attr.name.startsWith('data-') ||
        attr.name.startsWith('aria-') ||
        attr.name.startsWith('on') ||
        attr.name === 'id' ||
        attr.name === 'class'
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // 10. Unwrap empty or redundant wrapper <span> tags
  const spans = Array.from(container.querySelectorAll('span'));
  for (const span of spans) {
    if (!span.getAttribute('style') && span.parentElement) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  }

  // 11. Remove empty paragraphs & double line breaks
  const paragraphs = Array.from(container.querySelectorAll('p'));
  for (const p of paragraphs) {
    if (p.querySelector('img, hr, audio, video')) continue;
    // Maintain at least one block element inside table cell for TipTap schema validity
    if (p.closest('td, th') && p.parentElement?.children.length === 1) {
      continue;
    }
    if (p.textContent?.trim() === '') {
      p.remove();
      emptyLinesCleaned++;
    }
  }

  return {
    junkElementsRemoved,
    tablesUnwrapped,
    divsCleaned: divResult.divsUnwrapped,
    linksSanitized,
    emptyLinesCleaned,
  };
}

/**
 * Execute Web Clean on the active editor.
 * Operates on selected text if a selection exists, or across the whole document.
 * By default, keepTables is TRUE (Web Clean allows/keeps app tables intact).
 */
export function executeWebClean(
  editor: Editor,
  options: WebCleanOptions = { keepTables: true }
): WebCleanResult {
  if (!editor || editor.isDestroyed) {
    return {
      junkElementsRemoved: 0,
      tablesUnwrapped: 0,
      divsCleaned: 0,
      linksSanitized: 0,
      emptyLinesCleaned: 0,
    };
  }

  const { empty } = editor.state.selection;

  // Case 1: Operates on selected text
  if (!empty) {
    const slice = editor.state.selection.content();
    const container = document.createElement('div');
    const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content);
    container.appendChild(fragment);

    const result = sanitizeWebArticleContainer(container, options);

    if (container.childNodes.length === 0) {
      editor.chain().focus().deleteSelection().run();
      return result;
    }

    editor.chain().focus().insertContent(container.innerHTML).run();
    return result;
  }

  // Case 2: Operates on full document
  const rawHtml = editor.getHTML();
  if (typeof DOMParser === 'undefined') {
    return {
      junkElementsRemoved: 0,
      tablesUnwrapped: 0,
      divsCleaned: 0,
      linksSanitized: 0,
      emptyLinesCleaned: 0,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const result = sanitizeWebArticleContainer(doc.body, options);

  editor.commands.setContent(doc.body.innerHTML);
  return result;
}

/**
 * Execute Web Junk Clean on the active editor.
 * Cleans all web noise AND unwraps all layout tables to clean text.
 */
export function executeWebJunkClean(editor: Editor): WebCleanResult {
  return executeWebClean(editor, { keepTables: false });
}
