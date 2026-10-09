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

// Standard 96 DPI pixel dimensions for page sizes, calibrated for physical printer production
export const PAGE_HEIGHT_LOOKUP: Record<PageSize, number> = {
  a4: 1415, // Calibrated for Epson L3250 / real A4 printers (1415px safe fit, prevents single line overflow)
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

// 8 Standard Calibrations matching physical web print & canvas ruler steppers
export const DEFAULT_PAGE_BREAK_CALIBRATIONS: Record<string, number> = {
  'a4_portrait': 1250,      // Normal A4 Portrait = 1250px (exact web print calibration requested by user)
  'a4_landscape': 880,       // A4 Ls = 880px
  'letter_portrait': 1180,   // Letter Portrait = 1180px
  'letter_landscape': 910,   // Letter Ls = 910px
  'legal_portrait': 1500,    // Legal Portrait = 1500px
  'legal_landscape': 910,    // Legal Ls = 910px
  'a3_portrait': 1770,       // A3 Portrait = 1770px
  'a3_landscape': 1250,      // A3 Ls = 1250px
  'a5_portrait': 800,
  'a5_landscape': 560,
  'executive_portrait': 1010,
  'executive_landscape': 700,
  'tabloid_portrait': 1630,
  'tabloid_landscape': 1060,
  'b5_portrait': 960,
  'b5_landscape': 690,
  'a6_portrait': 560,
  'a6_landscape': 400,
  'folio_portrait': 1250,
  'folio_landscape': 820,
  'statement_portrait': 820,
  'statement_landscape': 530,
  'ledger_portrait': 1060,
  'ledger_landscape': 1630,
};

export const getCalibrationKey = (size: string = 'a4', orientation: string = 'portrait'): string => {
  return `${size.toLowerCase()}_${orientation.toLowerCase()}`;
};

export const getCalibrationLabel = (size: string = 'a4', orientation: string = 'portrait'): string => {
  const s = size.toUpperCase();
  return orientation === 'landscape' ? `${s} Ls` : s;
};

export function getCalibratedPageHeight(
  pageSize: PageSize = 'a4',
  orientation: PageOrientation = 'portrait'
): number {
  const key = getCalibrationKey(pageSize, orientation);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(`wordpad_page_break_calibrated_height_${key}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 400 && val <= 3500) return val;
      }
      if (key === 'a4_portrait') {
        const legacy = localStorage.getItem('wordpad_page_break_calibrated_height');
        if (legacy) {
          const val = parseInt(legacy, 10);
          if (!isNaN(val) && val >= 400 && val <= 3500) return val;
        }
        const customA4 = localStorage.getItem('wordpad_a4_calibration_custom_height');
        if (customA4) {
          const val = parseInt(customA4, 10);
          if (!isNaN(val) && val >= 400 && val <= 3500) return val;
        }
      }
    } catch {}
  }
  return DEFAULT_PAGE_BREAK_CALIBRATIONS[key] || (orientation === 'landscape' ? 880 : 1250);
}

/**
 * Calculates real printable document pages by inspecting:
 * 1. Explicit user page breaks (.word-page-break, hr.word-page-break, .word-blank-page, break-after)
 * 2. Exact user calibrated height per paper size & orientation (+5/-5 calibration adjustments)
 */
export function calculateDocumentPages(
  editor: Editor | null,
  pageSize: PageSize = 'a4',
  orientation: PageOrientation = 'portrait',
  currentScrollTop: number = 0,
  customCalibratedHeight?: number
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

  const calibratedHeight =
    customCalibratedHeight || getCalibratedPageHeight(pageSize, orientation);

  const pmEl = document.querySelector('.ProseMirror') as HTMLElement | null;

  // 1. DOM-based accurate calculation (when rendered in browser)
  if (pmEl && pmEl.children.length > 0) {
    const pages: DocumentPageInfo[] = [];
    let currentPageNumber = 1;
    let currentPageWords = 0;
    let currentPageChars = 0;
    let currentPageSnippet = '';
    let currentPageStartTop = 0;
    let hasExplicitBreakOnPage = false;

    const finalizePage = (nextDomTop: number, isBreak: boolean) => {
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
      currentPageStartTop = nextDomTop;
      hasExplicitBreakOnPage = isBreak;
    };

    const isExplicitBreakElement = (el: HTMLElement): boolean => {
      if (
        el.classList.contains('word-page-break') ||
        el.classList.contains('word-blank-page') ||
        (el.tagName.toLowerCase() === 'hr' && el.className.includes('word-page-break')) ||
        el.hasAttribute('data-page-break') ||
        Boolean(el.querySelector('.word-page-break, .word-blank-page, hr.word-page-break, [data-page-break]'))
      ) {
        return true;
      }
      const st = el.getAttribute('style') || '';
      return (
        st.includes('page-break-after: always') ||
        st.includes('break-after: page') ||
        st.includes('page-break-before: always') ||
        st.includes('break-before: page')
      );
    };

    const children = Array.from(pmEl.children) as HTMLElement[];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isBreak = isExplicitBreakElement(child);
      const elTop = child.offsetTop;
      const elHeight = child.offsetHeight || 24;

      // Extract text content from this block
      const text = child.innerText || child.textContent || '';
      const cleanText = text.replace(/\s+/g, ' ').trim();
      const words = cleanText ? cleanText.split(/\s+/).length : 0;
      const chars = cleanText.length;

      // Check distance from current page start
      const distanceFromPageStart = elTop - currentPageStartTop;
      const isHeading = /^H[1-6]$/i.test(child.tagName);
      const wouldOrphanHeading = isHeading && (calibratedHeight - distanceFromPageStart < 110);

      // Natural page overflow: if distance exceeds calibrated page height
      if (i > 0 && (distanceFromPageStart >= calibratedHeight || wouldOrphanHeading)) {
        finalizePage(elTop, false);
      }

      // Add to current page totals (unless it's just the break marker label)
      if (cleanText && cleanText !== 'PAGE BREAK') {
        currentPageWords += words;
        currentPageChars += chars;
        if (!currentPageSnippet) {
          currentPageSnippet = cleanText.substring(0, 90);
        }
      }

      // Explicit page break: immediately splits into the next page
      if (isBreak) {
        hasExplicitBreakOnPage = true;
        const nextTop = elTop + elHeight + 12;
        finalizePage(nextTop, false);
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

    // Also verify against overall scrollHeight vs calibratedHeight:
    // If there is significant extra vertical content beyond the DOM blocks identified
    const totalContentHeight = Math.max(pmEl.scrollHeight || 0, pmEl.offsetHeight || 0);
    const calibratedTotalPages = Math.max(1, Math.ceil(totalContentHeight / calibratedHeight));
    while (pages.length < calibratedTotalPages) {
      const nextNum = pages.length + 1;
      const estimatedTop = (nextNum - 1) * calibratedHeight;
      pages.push({
        pageNumber: nextNum,
        wordCount: 0,
        characterCount: 0,
        snippet: `Page ${nextNum} content`,
        hasExplicitBreak: false,
        domTopPx: estimatedTop,
      });
    }

    markActivePage(pages, currentScrollTop, calibratedHeight);
    return pages;
  }

  // 2. ProseMirror document node structure fallback
  return calculatePagesFromProseMirrorDoc(editor, calibratedHeight);
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

