import { Editor } from '@tiptap/react';
import { PageSize, PageOrientation, CustomMarginValues, PageMargin } from '../types';

export interface DocumentPageInfo {
  pageNumber: number;
  wordCount: number;
  characterCount: number;
  snippet: string;
  hasExplicitBreak: boolean;
  domTopPx: number;
  isCurrent?: boolean;
}

// Standard 96 DPI pixel dimensions for page sizes
export const PAGE_HEIGHT_LOOKUP: Record<PageSize, number> = {
  a4: 1123, // 11.69" × 96
  letter: 1056, // 11" × 96
  legal: 1344, // 14" × 96
  a3: 1588, // 16.54" × 96
  a5: 794, // 8.27" × 96
  executive: 1008, // 10.5" × 96
  tabloid: 1632, // 17" × 96
  b5: 960,
  a6: 560,
  folio: 1248,
  statement: 816,
  ledger: 1056,
};

export const PAGE_WIDTH_LOOKUP: Record<PageSize, number> = {
  a4: 794,
  letter: 816,
  legal: 816,
  a3: 1122,
  a5: 560,
  executive: 696,
  tabloid: 1056,
  b5: 690,
  a6: 396,
  folio: 816,
  statement: 528,
  ledger: 1632,
};

export function getPageDimensionsPx(size: PageSize = 'a4', orientation: PageOrientation = 'portrait') {
  let width = PAGE_WIDTH_LOOKUP[size] || 794;
  let height = PAGE_HEIGHT_LOOKUP[size] || 1123;
  if (orientation === 'landscape') {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Calculates real printable document pages by inspecting:
 * 1. Explicit page breaks (.word-page-break, hr.word-page-break, .word-blank-page)
 * 2. Natural physical height overflow based on page dimensions (A4, Letter, etc.)
 */
export function calculateDocumentPages(
  editor: Editor | null,
  pageSize: PageSize = 'a4',
  orientation: PageOrientation = 'portrait',
  currentScrollTop: number = 0
): DocumentPageInfo[] {
  if (!editor) {
    return [
      {
        pageNumber: 1,
        wordCount: 0,
        characterCount: 0,
        snippet: 'Empty document',
        hasExplicitBreak: false,
        domTopPx: 0,
        isCurrent: true,
      },
    ];
  }

  const { height: pageHeightPx } = getPageDimensionsPx(pageSize, orientation);
  // Printable content height after reserving typical margins (~160px for top/bottom margins)
  const effectivePrintableHeight = Math.max(500, pageHeightPx - 160);

  const pmEl = document.querySelector('.ProseMirror') as HTMLElement | null;

  // 1. DOM-based accurate calculation (when rendered in browser)
  if (pmEl && pmEl.children.length > 0) {
    const pages: DocumentPageInfo[] = [];
    let currentPageNumber = 1;
    let currentPageWords = 0;
    let currentPageChars = 0;
    let currentPageSnippet = '';
    let currentPageStartTop = 0;
    let lastElementTop = 0;
    let hasExplicitBreakOnPage = false;

    const finalizePage = (domTop: number, isBreak: boolean) => {
      pages.push({
        pageNumber: currentPageNumber,
        wordCount: currentPageWords,
        characterCount: currentPageChars,
        snippet: currentPageSnippet.trim() || `Page ${currentPageNumber} content`,
        hasExplicitBreak: hasExplicitBreakOnPage,
        domTopPx: currentPageStartTop,
      });

      currentPageNumber++;
      currentPageWords = 0;
      currentPageChars = 0;
      currentPageSnippet = '';
      currentPageStartTop = domTop;
      hasExplicitBreakOnPage = isBreak;
    };

    const children = Array.from(pmEl.children) as HTMLElement[];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isPageBreak =
        child.classList.contains('word-page-break') ||
        child.tagName.toLowerCase() === 'hr' && child.className.includes('word-page-break') ||
        Boolean(child.querySelector('.word-page-break')) ||
        child.classList.contains('word-blank-page');

      const elTop = child.offsetTop;
      const elHeight = child.offsetHeight || 24;
      lastElementTop = elTop + elHeight;

      // Extract text content from this block
      const text = child.innerText || child.textContent || '';
      const cleanText = text.replace(/\s+/g, ' ').trim();
      const words = cleanText ? cleanText.split(/\s+/).length : 0;
      const chars = cleanText.length;

      // Check if natural page height exceeded before this element
      const distanceFromPageStart = elTop - currentPageStartTop;
      if (distanceFromPageStart > effectivePrintableHeight && i > 0) {
        // Natural page overflow split
        finalizePage(elTop, false);
      }

      // Add to current page totals
      currentPageWords += words;
      currentPageChars += chars;
      if (!currentPageSnippet && cleanText && cleanText !== 'PAGE BREAK') {
        currentPageSnippet = cleanText.substring(0, 90);
      }

      // Check if this element triggers an explicit page break
      if (isPageBreak) {
        hasExplicitBreakOnPage = true;
        // The element after the page break will start on the next page
        const nextTop = elTop + elHeight + 16;
        finalizePage(nextTop, true);
      }
    }

    // Push the final page
    pages.push({
      pageNumber: currentPageNumber,
      wordCount: currentPageWords,
      characterCount: currentPageChars,
      snippet: currentPageSnippet.trim() || `Page ${currentPageNumber} content`,
      hasExplicitBreak: hasExplicitBreakOnPage,
      domTopPx: currentPageStartTop,
    });

    // Mark current active page based on scroll or caret
    markActivePage(pages, currentScrollTop, effectivePrintableHeight);

    return pages.length > 0 ? pages : [
      {
        pageNumber: 1,
        wordCount: 0,
        characterCount: 0,
        snippet: 'Page 1',
        hasExplicitBreak: false,
        domTopPx: 0,
        isCurrent: true,
      },
    ];
  }

  // 2. ProseMirror document node structure fallback
  return calculatePagesFromProseMirrorDoc(editor, effectivePrintableHeight);
}

function markActivePage(pages: DocumentPageInfo[], scrollTop: number, pageHeight: number) {
  let activeIndex = 0;
  for (let i = 0; i < pages.length; i++) {
    if (scrollTop >= pages[i].domTopPx - 100) {
      activeIndex = i;
    }
  }
  pages.forEach((p, idx) => {
    p.isCurrent = idx === activeIndex;
  });
}

function calculatePagesFromProseMirrorDoc(editor: Editor, effectiveHeight: number): DocumentPageInfo[] {
  const json = editor.getJSON();
  if (!json.content || json.content.length === 0) {
    return [
      {
        pageNumber: 1,
        wordCount: 0,
        characterCount: 0,
        snippet: 'Empty Document',
        hasExplicitBreak: false,
        domTopPx: 0,
        isCurrent: true,
      },
    ];
  }

  const pages: DocumentPageInfo[] = [];
  let currentPageNumber = 1;
  let currentPageWords = 0;
  let currentPageChars = 0;
  let currentPageSnippet = '';
  let accumulatedEstimatedHeight = 0;
  let hasExplicitBreakOnPage = false;

  for (const node of json.content) {
    const isHrBreak =
      node.type === 'horizontalRule' &&
      (node.attrs?.class?.includes('word-page-break') || node.attrs?.class?.includes('page-break'));

    // Extract text
    let nodeText = '';
    if (node.content) {
      nodeText = node.content.map((c: any) => c.text || '').join('');
    }
    const cleanText = nodeText.trim();
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    const chars = cleanText.length;

    // Estimate height of block (approx 22px per line of text ~ 12 words)
    const estimatedBlockHeight = Math.max(28, Math.ceil(words / 12) * 22);

    if (accumulatedEstimatedHeight + estimatedBlockHeight > effectiveHeight && accumulatedEstimatedHeight > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        wordCount: currentPageWords,
        characterCount: currentPageChars,
        snippet: currentPageSnippet || `Page ${currentPageNumber}`,
        hasExplicitBreak: hasExplicitBreakOnPage,
        domTopPx: (currentPageNumber - 1) * effectiveHeight,
      });
      currentPageNumber++;
      currentPageWords = 0;
      currentPageChars = 0;
      currentPageSnippet = '';
      accumulatedEstimatedHeight = 0;
      hasExplicitBreakOnPage = false;
    }

    currentPageWords += words;
    currentPageChars += chars;
    accumulatedEstimatedHeight += estimatedBlockHeight;
    if (!currentPageSnippet && cleanText) {
      currentPageSnippet = cleanText.substring(0, 90);
    }

    if (isHrBreak) {
      hasExplicitBreakOnPage = true;
      pages.push({
        pageNumber: currentPageNumber,
        wordCount: currentPageWords,
        characterCount: currentPageChars,
        snippet: currentPageSnippet || `Page ${currentPageNumber}`,
        hasExplicitBreak: true,
        domTopPx: (currentPageNumber - 1) * effectiveHeight,
      });
      currentPageNumber++;
      currentPageWords = 0;
      currentPageChars = 0;
      currentPageSnippet = '';
      accumulatedEstimatedHeight = 0;
      hasExplicitBreakOnPage = false;
    }
  }

  pages.push({
    pageNumber: currentPageNumber,
    wordCount: currentPageWords,
    characterCount: currentPageChars,
    snippet: currentPageSnippet || `Page ${currentPageNumber}`,
    hasExplicitBreak: hasExplicitBreakOnPage,
    domTopPx: (currentPageNumber - 1) * effectiveHeight,
    isCurrent: pages.length === 0,
  });

  if (pages.length > 0 && !pages.some((p) => p.isCurrent)) {
    pages[0].isCurrent = true;
  }

  return pages;
}

/**
 * Smart Dynamic Page Formatter supporting states 0 and 1:
 * - pageState: 1 = Show current page, 0 = No current page
 * - maxState: 1 = Show real total pages, 0 = No total pages
 * - separator: '-', 'of', '/', '' (none/empty)
 *
 * Examples:
 * - 1 / 0 => "Page 1" (no separator, no max pages)
 * - 1 - 1 (12 pages) => "Page 1 - 12"
 * - 0 - 1 (10 pages) => "Pages 10" (only total pages)
 * - 1 [empty] 1 (6 pages) => "Page 1 6"
 */
export function formatSmartPageText({
  showPages = true,
  pageState = 1,
  maxState = 1,
  separator = '-',
  currentPage = 1,
  totalPages = 1,
}: {
  showPages?: boolean;
  pageState?: number;
  maxState?: number;
  separator?: string;
  currentPage?: number;
  totalPages?: number;
}): string {
  if (!showPages) return '';

  const hasPage = pageState !== 0;
  const hasMax = maxState !== 0;

  if (!hasPage && !hasMax) return '';

  const cleanSep = separator !== undefined && separator !== null ? separator : '-';
  const trimmedSep = cleanSep.trim();

  // Case 1: Both page and max pages are active (1 and 1)
  if (hasPage && hasMax) {
    if (!trimmedSep || trimmedSep === 'none') {
      return `Page ${currentPage} ${totalPages}`;
    }
    return `Page ${currentPage} ${trimmedSep} ${totalPages}`;
  }

  // Case 2: Only page is active (1 and 0) -> "Page 1" (no separator, no max)
  if (hasPage && !hasMax) {
    return `Page ${currentPage}`;
  }

  // Case 3: Only max is active (0 and 1) -> "Pages 12" (only total pages)
  if (!hasPage && hasMax) {
    return `Pages ${totalPages}`;
  }

  return '';
}

