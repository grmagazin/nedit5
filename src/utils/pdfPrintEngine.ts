/**
 * pdfPrintEngine.ts
 * Print-to-PDF Vector Engine Utility.
 * Dynamically configures @page size, orientation, margins, and print-color-adjust
 * to ensure pixel-perfect ISO 32000 compliant vector PDF generation via window.print().
 */

import { PageSize, PageOrientation, PageMargin } from '../types';

export interface PdfPrintOptions {
  pageSize?: PageSize;
  orientation?: PageOrientation;
  margins?: PageMargin;
  customMargins?: { top: number; bottom: number; left: number; right: number };
  printBackgrounds?: boolean;
  highContrast?: boolean;
  documentTitle?: string;
  // Smart Table Print Formatting Options
  tablePrintWidth?: '100%' | '90%' | 'auto';
  tableBetterViewGrids?: boolean;
  // Smart Headers & Footers
  printHeadersFooters?: boolean;
  headerLeft?: string;
  headerRight?: string;
  headerCenter?: string;
  footerLeft?: string;
  footerRight?: string;
  footerCenter?: string;
}

const PAGE_SIZE_CSS: Record<PageSize, string> = {
  a4: 'A4',
  letter: 'letter',
  legal: 'legal',
  a3: 'A3',
  a5: 'A5',
  executive: '7.25in 10.5in',
  tabloid: '11in 17in',
  b5: 'B5',
  a6: 'A6',
  folio: '8.5in 13in',
  statement: '5.5in 8.5in',
  ledger: '17in 11in',
};

const MARGINS_CSS: Record<PageMargin, string> = {
  normal: '25.4mm 25.4mm 25.4mm 25.4mm', // 1 inch Top Right Bottom Left
  narrow: '12.7mm 12.7mm 12.7mm 12.7mm', // 0.5 inch
  moderate: '25.4mm 19.05mm 25.4mm 19.05mm', // 1in top/bottom, 0.75in left/right
  wide: '25.4mm 50.8mm 25.4mm 50.8mm', // 1in top/bottom, 2in left/right
  custom: '20mm 20mm 20mm 20mm',
};

/**
 * Injects or updates a dynamic <style> tag specifically for the print spooler
 */
export function injectPdfPrintStyles(options: PdfPrintOptions = {}): () => void {
  const {
    pageSize = 'a4',
    orientation = 'portrait',
    margins = 'normal',
    customMargins,
    printBackgrounds = true,
    highContrast = false,
    tablePrintWidth = '100%',
    tableBetterViewGrids = true,
    printHeadersFooters = true,
  } = options;

  const rawSize = PAGE_SIZE_CSS[pageSize] || 'A4';
  const sizeRule = `${rawSize} ${orientation}`;

  let marginRule = MARGINS_CSS[margins] || '25.4mm 25.4mm 25.4mm 25.4mm';
  if (margins === 'custom' && customMargins) {
    marginRule = `${customMargins.top}mm ${customMargins.right}mm ${customMargins.bottom}mm ${customMargins.left}mm`;
  }

  const styleId = 'dynamic-pdf-print-style-rules';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const targetTableWidth = tablePrintWidth === '90%' ? '90%' : '100%';

  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${sizeRule} !important;
        margin: ${marginRule} !important;
      }

      * {
        -webkit-print-color-adjust: ${printBackgrounds ? 'exact' : 'initial'} !important;
        print-color-adjust: ${printBackgrounds ? 'exact' : 'initial'} !important;
      }

      html, body {
        background: #ffffff !important;
        color: #000000 !important;
      }

      /* Protect tables, code blocks, images from midway clipping */
      table, figure, img, pre, .equation-block, .card-block {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Headings must stick to following content */
      h1, h2, h3, h4, h5, h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      /* Explicit Word Page Breaks */
      .word-page-break, hr.word-page-break {
        break-after: page !important;
        page-break-after: always !important;
        display: block !important;
        height: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Smart Table Print Formatting: Enforces 100% or 90% and removes minimal cell widths */
      .tableWrapper {
        width: 100% !important;
        max-width: 100% !important;
        overflow: visible !important;
        margin: 16px 0 !important;
      }

      .ProseMirror table,
      .tiptap table,
      .tableWrapper table,
      table {
        width: ${targetTableWidth} !important;
        max-width: ${targetTableWidth} !important;
        min-width: ${targetTableWidth} !important;
        margin-left: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
        margin-right: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
        table-layout: auto !important;
        border-collapse: collapse !important;
        box-sizing: border-box !important;
        border: 1.5px solid #111827 !important;
      }

      /* Clear TipTap col pixel restrictions so cells expand across full width */
      .ProseMirror col,
      .tiptap col,
      .tableWrapper col,
      col {
        width: auto !important;
        min-width: 0 !important;
      }

      .ProseMirror th,
      .ProseMirror td,
      .tiptap th,
      .tiptap td,
      th,
      td {
        min-width: 60px !important;
        box-sizing: border-box !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
        white-space: normal !important;
        border: 1px solid #111827 !important;
        padding: 8px 12px !important;
        vertical-align: top !important;
      }

      .ProseMirror th,
      .tiptap th,
      th {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        display: table-cell !important;
      }

      .ProseMirror thead,
      .tiptap thead {
        display: table-header-group !important;
      }

      .ProseMirror tr,
      .tiptap tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* Multi-Page Paginated Print Sheets (Headers, Footers, Page Numbers on every page) */
      #dedicated-print-container {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      .print-page-sheet {
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        width: 100% !important;
        min-height: 98vh !important;
        height: auto !important;
        background: #ffffff !important;
        color: #0f172a !important;
      }

      .print-page-sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .print-page-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 1px solid #cbd5e1 !important;
        padding-bottom: 6px !important;
        margin-bottom: 16px !important;
        font-size: 11px !important;
        color: #64748b !important;
        flex-shrink: 0 !important;
      }

      .print-page-body {
        flex: 1 1 auto !important;
        overflow: visible !important;
      }

      .print-page-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-top: 1px solid #cbd5e1 !important;
        padding-top: 8px !important;
        margin-top: 16px !important;
        font-size: 11px !important;
        color: #64748b !important;
        flex-shrink: 0 !important;
      }
    }
  `;

  // Return cleanup function
  return () => {
    const el = document.getElementById(styleId);
    if (el) {
      el.remove();
    }
  };
}

/**
 * Triggers the browser's native vector print engine (which provides "Save as PDF")
 * with pre-configured print styles.
 */
export function executePrintToPdf(
  options: PdfPrintOptions = {},
  beforePrint?: () => void,
  afterPrint?: () => void
): void {
  // 1. Inject print stylesheet rules
  const cleanup = injectPdfPrintStyles(options);

  // 2. Set document title temporarily if specified so the browser defaults the PDF file name
  const originalTitle = document.title;
  if (options.documentTitle && options.documentTitle.trim()) {
    document.title = options.documentTitle.trim();
  }

  if (beforePrint) {
    beforePrint();
  }

  // 3. Defer slightly to let DOM and styles settle, then invoke window.print()
  setTimeout(() => {
    try {
      window.print();
    } catch (err) {
      console.error('Print execution failed:', err);
    } finally {
      // Restore original document title
      document.title = originalTitle;

      if (afterPrint) {
        afterPrint();
      }

      // Cleanup style after print dialog closes
      setTimeout(cleanup, 1500);
    }
  }, 250);
}

/**
 * Sample pre-compiled document for PDF export demonstration
 */
export const SAMPLE_PDF_DOCUMENT = `
<div style="font-family: 'Segoe UI', -apple-system, Roboto, sans-serif; line-height: 1.6; color: #1e293b;">
  <div style="border-bottom: 3px solid #dc2626; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #dc2626; font-weight: 700;">Executive Technical Specification &bull; ISO 32000-2</span>
      <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">Global Cloud Infrastructure Architecture Report</h1>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      <div>Ref: EXP-2026-PDF-V1</div>
      <div>Date: September 30, 2026</div>
    </div>
  </div>

  <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
    This executive technical report details the high-availability vector graphics rendering engine, print-spooled typography, and distributed cloud node benchmarks. Formatted specifically for ISO 32000 high-resolution PDF print production.
  </p>

  <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
    <strong style="color: #991b1b; font-size: 13px;">ISO 32000-2 Vector Quality Standard:</strong>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">
      All typography, SVG vector curves, and border rules maintain mathematical resolution independence. No lossy rasterization occurs during client-side PDF spooling.
    </p>
  </div>

  <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
    1. Operational Metrics & Performance Summary
  </h2>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px;">
    <thead>
      <tr style="background-color: #f1f5f9; text-align: left;">
        <th style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Data Cluster</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Latency (P99)</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Availability</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Vector Fidelity</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Compliance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600;">Europe Central (FRA)</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">4.2 ms</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #16a34a; font-weight: 600;">99.998%</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">600 DPI Vector</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">ISO 32000-2</td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600;">US East (IAD)</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">3.8 ms</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #16a34a; font-weight: 600;">99.999%</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">1200 DPI Vector</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">PDF/A-2b</td>
      </tr>
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600;">Asia Pacific (HND)</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">6.1 ms</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #16a34a; font-weight: 600;">99.995%</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">600 DPI Vector</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">ISO 32000-2</td>
      </tr>
    </tbody>
  </table>

  <hr class="word-page-break" style="page-break-after: always; break-after: page; border: none; margin: 30px 0;" />

  <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
    2. Zero-Loss Print Spooling Architecture
  </h2>

  <p style="font-size: 13px; color: #334155;">
    The browser-native vector print subsystem connects directly to the operating system's PDF spooler (macOS Quartz, Windows Print-to-PDF, Linux CUPS). It ensures:
  </p>

  <ul style="font-size: 13px; color: #334155; padding-left: 20px; line-height: 1.8;">
    <li><strong>No Orphan Headings:</strong> Automated <code style="background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 11px;">break-after: avoid</code> maintains headers with their subsequent paragraphs.</li>
    <li><strong>Multi-Page Table Pagination:</strong> Tables are prevented from splitting mid-row via <code style="background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 11px;">page-break-inside: avoid</code>.</li>
    <li><strong>RGB / CMYK True Color Preservation:</strong> The <code style="background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 11px;">print-color-adjust: exact</code> directive preserves shaded backgrounds and custom branding.</li>
    <li><strong>Client-Side Privacy:</strong> Zero cloud round-trips; all document serialization is performed locally inside browser sandbox memory.</li>
  </ul>

  <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
    <span>Document Canvas Vector PDF Driver</span>
    <span>Page 2 of 2</span>
  </div>
</div>
`;
