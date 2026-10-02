import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats, PageSize, PageOrientation, PageMargin } from '../types';
import {
  Printer,
  Sliders,
  CheckCircle2,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Check,
  Palette,
  Layers,
  ArrowRight,
  Table as TableIcon,
  Scaling,
  Grid,
} from 'lucide-react';
import {
  calculateDocumentPages,
  PAGE_HEIGHT_LOOKUP,
  PAGE_WIDTH_LOOKUP,
  formatSmartPageText,
} from '../utils/pageCalculator';
import { executePrintToPdf } from '../utils/pdfPrintEngine';

interface PrintBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats?: DocumentStats;
  onClose: () => void;
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void;
  onPrint: () => void;
  onSwitchToPdfTab?: () => void;
}

export const PrintBackstageSection: React.FC<PrintBackstageSectionProps> = ({
  editor,
  settings,
  stats,
  onClose,
  onUpdateSettings,
  onPrint,
  onSwitchToPdfTab,
}) => {
  // Print settings (A4 preselected by default)
  const [copies, setCopies] = useState<number>(1);
  const [printerDestination, setPrinterDestination] = useState<'pdf' | 'system'>('pdf');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');

  // Preselected Page Size: A4 by default or from settings
  const [paperSize, setPaperSize] = useState<PageSize>(settings.pageSize || 'a4');
  const [orientation, setOrientation] = useState<PageOrientation>(settings.orientation || 'portrait');
  const [margins, setMargins] = useState<PageMargin>(settings.margins || 'normal');

  // Smart feature toggles
  const [smartBreakOptimization, setSmartBreakOptimization] = useState<boolean>(true);
  const [printBackgroundGraphics, setPrintBackgroundGraphics] = useState<boolean>(true);
  const [highContrastMode, setHighContrastMode] = useState<boolean>(false);
  const [printHeadersFooters, setPrintHeadersFooters] = useState<boolean>(true);
  const [hideMarkupGuides, setHideMarkupGuides] = useState<boolean>(true);

  // Smart Table Print Formatting Options (Requested by user)
  const [tablePrintWidth, setTablePrintWidth] = useState<'100%' | '90%' | 'auto'>('100%');
  const [tableBetterViewGrids, setTableBetterViewGrids] = useState<boolean>(true);

  // Preview state & dynamic container scaling (Default: Fit Width as requested)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const [zoomMode, setZoomMode] = useState<'fit-page' | 'fit-width' | 'manual'>('fit-width');
  const [isSpooling, setIsSpooling] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync settings when props change
  useEffect(() => {
    if (settings.pageSize) setPaperSize(settings.pageSize);
    if (settings.orientation) setOrientation(settings.orientation);
    if (settings.margins) setMargins(settings.margins);
  }, [settings.pageSize, settings.orientation, settings.margins]);

  // Physical dimension pixel values at 96 DPI
  const baseWidthPx = PAGE_WIDTH_LOOKUP[paperSize] || 794;
  const baseHeightPx = PAGE_HEIGHT_LOOKUP[paperSize] || 1123;
  const printWidth = orientation === 'landscape' ? baseHeightPx : baseWidthPx;
  const printHeight = orientation === 'landscape' ? baseWidthPx : baseHeightPx;

  // Auto-fit document scaling based on preview container
  const computeFitPageScale = () => {
    if (!previewContainerRef.current) return 0.7;
    const containerH = previewContainerRef.current.clientHeight;
    const containerW = previewContainerRef.current.clientWidth;
    const scaleH = (containerH - 80) / printHeight;
    const scaleW = (containerW - 80) / printWidth;
    return Math.max(0.35, Math.min(1.0, Number(Math.min(scaleH, scaleW).toFixed(2))));
  };

  const computeFitWidthScale = () => {
    if (!previewContainerRef.current) return 0.85;
    const containerW = previewContainerRef.current.clientWidth;
    const scale = (containerW - 90) / printWidth;
    return Math.max(0.4, Math.min(1.3, Number(scale.toFixed(2))));
  };

  // Initial mount: Set Fit Width as default view
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewZoom(computeFitWidthScale());
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Adjust zoom on paperSize, orientation, or zoomMode change
  useEffect(() => {
    if (zoomMode === 'fit-page') {
      setPreviewZoom(computeFitPageScale());
    } else if (zoomMode === 'fit-width') {
      setPreviewZoom(computeFitWidthScale());
    }
  }, [paperSize, orientation, zoomMode]);

  // Calculate pages
  const calculatedPages = useMemo(() => {
    return calculateDocumentPages(editor, paperSize, orientation, 0);
  }, [editor, paperSize, orientation]);

  const totalPages = Math.max(1, calculatedPages.length);

  // Ensure current page is in bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Smart Pagination: Slices document content for preview
  const pageChunks = useMemo(() => {
    if (!editor) return ['<p class="text-neutral-400 italic">No document content</p>'];
    const fullHtml = editor.getHTML();

    // Check for explicit page breaks (.word-page-break)
    const breakRegex = /<hr[^>]*class="[^"]*word-page-break[^"]*"[^>]*>|<div[^>]*class="[^"]*word-page-break[^"]*"[^>]*><\/div>/gi;
    if (breakRegex.test(fullHtml)) {
      const parts = fullHtml.split(breakRegex).filter((p) => p.trim().length > 0);
      if (parts.length > 0) return parts;
    }

    // Split blocks across calculated total pages
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    const children = Array.from(doc.body.children);
    if (children.length <= 1) return [fullHtml];

    const pagesCount = Math.max(1, calculatedPages.length);
    if (pagesCount === 1) return [fullHtml];

    const itemsPerPage = Math.ceil(children.length / pagesCount);
    const result: string[] = [];
    for (let i = 0; i < pagesCount; i++) {
      const chunk = children.slice(i * itemsPerPage, (i + 1) * itemsPerPage);
      if (chunk.length > 0) {
        result.push(chunk.map((c) => c.outerHTML).join(''));
      }
    }
    return result.length > 0 ? result : [fullHtml];
  }, [editor, calculatedPages.length]);

  const activePageHtml = pageChunks[currentPage - 1] || pageChunks[0] || '';

  // Smart Header & Footer info read from document settings
  const smartHeaderLeft = settings.headerLeft || '';
  const smartHeaderRight = settings.headerRight || '';
  const smartHeaderPageText = formatSmartPageText({
    showPages: settings.headerShowPages ?? false,
    pageState: settings.headerPageStart !== 0 ? 1 : 0,
    maxState: settings.headerPageTotal !== 0 ? 1 : 0,
    separator: settings.headerPageSeparator || '-',
    currentPage,
    totalPages,
  });

  const smartFooterLeft = settings.footerLeft || '';
  const smartFooterRight = settings.footerRight || '';
  const smartFooterPageText = formatSmartPageText({
    showPages: settings.footerShowPages ?? true,
    pageState: settings.footerPageStart !== 0 ? 1 : 0,
    maxState: settings.footerPageTotal !== 0 ? 1 : 0,
    separator: settings.footerPageSeparator || '-',
    currentPage,
    totalPages,
  });

  // Pages to print based on page range mode ('all', 'current', 'custom')
  const pagesToPrint = useMemo(() => {
    if (pageRangeMode === 'current') {
      const idx = Math.max(0, Math.min(pageChunks.length - 1, currentPage - 1));
      return [{ chunk: pageChunks[idx], pageNum: idx + 1 }];
    }
    if (pageRangeMode === 'custom') {
      const indices = new Set<number>();
      const parts = customRange.split(',').map((p) => p.trim());
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
          if (!isNaN(startStr) && !isNaN(endStr)) {
            for (let i = startStr; i <= endStr; i++) {
              if (i >= 1 && i <= pageChunks.length) indices.add(i);
            }
          }
        } else {
          const n = parseInt(part, 10);
          if (!isNaN(n) && n >= 1 && n <= pageChunks.length) indices.add(n);
        }
      }
      if (indices.size > 0) {
        return Array.from(indices)
          .sort((a, b) => a - b)
          .map((p) => ({ chunk: pageChunks[p - 1], pageNum: p }));
      }
    }
    // Default: 'all'
    return pageChunks.map((chunk, idx) => ({ chunk, pageNum: idx + 1 }));
  }, [pageRangeMode, customRange, currentPage, pageChunks]);

  // Margin padding in pixels (96 DPI standard: 1 inch = 96px, 0.5 inch = 48px)
  const marginLookup: Record<PageMargin, { top: number; right: number; bottom: number; left: number }> = {
    normal: { top: 96, right: 96, bottom: 96, left: 96 }, // 25.4mm = 1 inch
    narrow: { top: 48, right: 48, bottom: 48, left: 48 }, // 12.7mm = 0.5 inch
    moderate: { top: 96, right: 72, bottom: 96, left: 72 }, // 1in top/bottom, 0.75in left/right
    wide: { top: 96, right: 192, bottom: 96, left: 192 }, // 1in top/bottom, 2in left/right
    custom: { top: 76, right: 76, bottom: 76, left: 76 }, // 20mm
  };
  const activeMarginPadding = marginLookup[margins] || marginLookup.normal;

  // Execute smart print
  const handleTriggerPrint = () => {
    setIsSpooling(true);
    showToast('Applying CSS print formatting and launching print spooler...');

    // Save settings if changed
    if (onUpdateSettings) {
      onUpdateSettings({
        pageSize: paperSize,
        orientation,
        margins,
      });
    }

    // Execute with dynamic stylesheet injection (including table CSS print formatting)
    executePrintToPdf(
      {
        pageSize: paperSize,
        orientation,
        margins,
        printBackgrounds: printBackgroundGraphics,
        highContrast: highContrastMode,
        documentTitle: settings.title || 'Document',
        tablePrintWidth,
        tableBetterViewGrids,
        printHeadersFooters,
      },
      () => {
        // Keep PrintBackstageSection mounted so dedicated print sheets remain in DOM!
      },
      () => {
        setIsSpooling(false);
        showToast('Print spooling finished');
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-neutral-800 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-8 py-3.5 shrink-0 shadow-2xs flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#185abd] text-white rounded-lg shadow-xs">
            <Printer size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-neutral-900 leading-tight">Print Workstation</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-[#185abd] px-2 py-0.5 rounded-full">
                Smart Setup
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Interactive print preview &bull; Smart header/footer reader &bull; A4 simulation &bull; CSS table print formatting
            </p>
          </div>
        </div>

        {/* Quick jump to dedicated PDF engine */}
        {onSwitchToPdfTab && (
          <button
            onClick={onSwitchToPdfTab}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#dc2626] border border-red-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Open dedicated ISO 32000 PDF Vector Engine"
          >
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span>PDF Vector Engine</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-blue-50 border-b border-blue-200 px-8 py-2 text-xs font-semibold text-[#185abd] flex items-center space-x-2 animate-fadeIn shrink-0 no-print">
          <CheckCircle2 size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden no-print">
        {/* Left Column: Print Controls & Settings (Fixed width, scrollable) */}
        <div className="w-80 md:w-96 border-r border-neutral-200 bg-white overflow-y-auto p-5 space-y-5 shrink-0 shadow-xs">
          {/* Big Print Button and Copies Counter */}
          <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200">
            <button
              onClick={handleTriggerPrint}
              disabled={isSpooling}
              className="flex-1 py-3 px-4 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0c3979] text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-75 active:scale-98"
            >
              <Printer size={18} />
              <span>{isSpooling ? 'Spooling...' : 'Print Document'}</span>
            </button>

            <div className="flex flex-col items-center border border-neutral-300 rounded-xl px-2.5 py-1 bg-neutral-50 shadow-2xs">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Copies</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-5 h-5 flex items-center justify-center bg-white border border-neutral-200 rounded text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  -
                </button>
                <span className="text-xs font-bold w-4 text-center">{copies}</span>
                <button
                  onClick={() => setCopies(Math.min(99, copies + 1))}
                  className="w-5 h-5 flex items-center justify-center bg-white border border-neutral-200 rounded text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Smart Info & Page Setup Reader */}
          <div className="space-y-2 p-3 rounded-xl border border-neutral-200 bg-slate-50/70 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider text-neutral-800">
                <FileText size={14} className="text-[#185abd]" />
                <span>Info &amp; Page Setup</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 size={10} />
                <span>Smart Read</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-neutral-400 block text-[10px]">Title:</span>
                <span className="font-semibold text-neutral-800 truncate block" title={settings.title}>
                  {settings.title || 'Untitled Document'}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Author:</span>
                <span className="font-semibold text-neutral-800 truncate block" title={settings.author}>
                  {settings.author || 'Author not set'}
                </span>
              </div>
            </div>

            {/* Header, Footer & Page Numbers status */}
            <div className="space-y-1 pt-1.5 text-[11px] border-t border-neutral-200/60">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Header:</span>
                <span className="font-mono text-neutral-700 text-right truncate max-w-[65%] text-[10px]">
                  {smartHeaderLeft || smartHeaderRight || smartHeaderPageText
                    ? `${smartHeaderLeft || '•'} | ${smartHeaderPageText || '•'} | ${smartHeaderRight || '•'}`
                    : 'Default Header'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Footer:</span>
                <span className="font-mono text-neutral-700 text-right truncate max-w-[65%] text-[10px]">
                  {smartFooterLeft || smartFooterRight || smartFooterPageText
                    ? `${smartFooterLeft || '•'} | ${smartFooterPageText || '•'} | ${smartFooterRight || '•'}`
                    : 'Smart Page Numbering'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Page Format:</span>
                <span className="font-mono font-bold text-[#185abd] text-[10px]">
                  {smartFooterPageText || smartHeaderPageText || `Page ${currentPage} of ${totalPages}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Smart Table Print Formatting (User Request) */}
          <div className="space-y-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider text-[#185abd]">
                <TableIcon size={14} />
                <span>Table Print Formatting</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-[#185abd] font-semibold px-2 py-0.5 rounded-full">
                CSS @media print
              </span>
            </div>

            {/* Table Print Width (100% or 90% or Auto) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 block">
                Table Width via CSS Print Setup
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: '100%', title: '100% Full Width' },
                  { id: '90%', title: '90% Margin-Safe' },
                  { id: 'auto', title: 'Auto Width' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTablePrintWidth(opt.id as any)}
                    className={`py-1 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      tablePrintWidth === opt.id
                        ? 'border-[#185abd] bg-white text-[#185abd] font-bold shadow-2xs'
                        : 'border-neutral-200 text-neutral-600 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="text-[11px] block">{opt.id}</span>
                    <span className="text-[9px] opacity-75 block truncate">{opt.title.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Option: Table Better View Grids */}
            <label className="flex items-start space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={tableBetterViewGrids}
                onChange={(e) => setTableBetterViewGrids(e.target.checked)}
                className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
              />
              <div>
                <span className="font-semibold text-xs text-neutral-800 block">
                  Better View Grids (High-Legibility Borders)
                </span>
                <span className="text-[11px] text-neutral-500 block leading-tight mt-0.5">
                  Preserves 1px solid borders &amp; 4px padding so tables never lose grid lines in print
                </span>
              </div>
            </label>
          </div>

          {/* Section 3: Paper Size (Preselected A4) & Orientation */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Paper Size (A4 Preselected)
                </label>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                  210 × 297 mm
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['a4', 'letter', 'legal', 'a3', 'executive', 'tabloid'] as PageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPaperSize(size);
                      if (onUpdateSettings) onUpdateSettings({ pageSize: size });
                    }}
                    className={`px-2 py-1.5 rounded-lg border font-medium uppercase text-xs transition-colors cursor-pointer ${
                      paperSize === size
                        ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 block">Orientation</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setOrientation('portrait');
                    if (onUpdateSettings) onUpdateSettings({ orientation: 'portrait' });
                  }}
                  className={`flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    orientation === 'portrait'
                      ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-3 h-4 border border-current rounded-xs" />
                  <span>Portrait (1:1.41)</span>
                </button>

                <button
                  onClick={() => {
                    setOrientation('landscape');
                    if (onUpdateSettings) onUpdateSettings({ orientation: 'landscape' });
                  }}
                  className={`flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    orientation === 'landscape'
                      ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-4 h-3 border border-current rounded-xs" />
                  <span>Landscape</span>
                </button>
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 block">Margins</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['normal', 'narrow', 'moderate', 'wide'] as PageMargin[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMargins(m);
                      if (onUpdateSettings) onUpdateSettings({ margins: m });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border font-medium capitalize text-xs transition-colors cursor-pointer ${
                      margins === m
                        ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {m} ({marginLookup[m].top}px)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Page Range */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Pages to Print
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => setPageRangeMode('all')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'all'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                All ({totalPages})
              </button>
              <button
                onClick={() => setPageRangeMode('current')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'current'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Current ({currentPage})
              </button>
              <button
                onClick={() => setPageRangeMode('custom')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'custom'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Custom Range
              </button>
            </div>

            {pageRangeMode === 'custom' && (
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono outline-none focus:border-[#185abd]"
                />
              </div>
            )}
          </div>

          {/* Section 5: Smart Print Features & Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={14} className="text-[#185abd]" />
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                Print Features &amp; Quality
              </label>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printHeadersFooters}
                  onChange={(e) => setPrintHeadersFooters(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Print Running Header &amp; Footer</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Prints configured header, title, and smart page numbers
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smartBreakOptimization}
                  onChange={(e) => setSmartBreakOptimization(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Smart Break Optimization</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Prevents mid-row table truncation and orphan headings
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printBackgroundGraphics}
                  onChange={(e) => setPrintBackgroundGraphics(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Background Graphics &amp; Cell Fills</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Preserves callout shading, colors, and table cell backgrounds
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">High-Contrast B&amp;W Mode</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Converts text to pure black to save ink on hardware printers
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Print Preview */}
        <div className="flex-1 flex flex-col bg-[#e2e8f0]/80 overflow-hidden">
          {/* Preview Navigation & Scaling Toolbar */}
          <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0 shadow-2xs">
            {/* Pager controls */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="font-semibold text-neutral-700 px-1">
                Page <span className="font-bold text-neutral-900">{currentPage}</span> of{' '}
                <span className="font-bold text-neutral-900">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            {/* A4 Simulation Badge */}
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
              <span className="uppercase font-bold text-neutral-900">{paperSize} Simulation</span>
              <span>&bull;</span>
              <span>{orientation}</span>
              <span>&bull;</span>
              <span>{tablePrintWidth} Table Width</span>
            </div>

            {/* Document Scaling Controls (Fit Page, Fit Width, Zoom) */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setZoomMode('fit-page');
                  setPreviewZoom(computeFitPageScale());
                }}
                className={`px-2 py-1 border rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  zoomMode === 'fit-page'
                    ? 'bg-blue-50 border-[#185abd] text-[#185abd]'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Fit full page in preview area"
              >
                Fit Page
              </button>

              <button
                onClick={() => {
                  setZoomMode('fit-width');
                  setPreviewZoom(computeFitWidthScale());
                }}
                className={`px-2 py-1 border rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  zoomMode === 'fit-width'
                    ? 'bg-blue-50 border-[#185abd] text-[#185abd]'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Fit page width"
              >
                Fit Width
              </button>

              <button
                onClick={() => {
                  setZoomMode('manual');
                  setPreviewZoom(Math.max(0.35, previewZoom - 0.1));
                }}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>

              <span className="w-12 text-center font-mono font-semibold text-neutral-700">
                {Math.round(previewZoom * 100)}%
              </span>

              <button
                onClick={() => {
                  setZoomMode('manual');
                  setPreviewZoom(Math.min(1.4, previewZoom + 0.1));
                }}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Paper View Container with High-Fidelity A4 Simulation & True Optical Vector Zoom */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto p-8 flex justify-center items-start"
          >
            <div
              style={{
                width: `${printWidth * previewZoom}px`,
                height: `${printHeight * previewZoom}px`,
                minHeight: `${printHeight * previewZoom}px`,
                position: 'relative',
              }}
              className="transition-all duration-150 shrink-0 shadow-2xl"
            >
              <div
                style={{
                  width: `${printWidth}px`,
                  height: `${printHeight}px`,
                  minHeight: `${printHeight}px`,
                  paddingTop: `${activeMarginPadding.top}px`,
                  paddingRight: `${activeMarginPadding.right}px`,
                  paddingBottom: `${activeMarginPadding.bottom}px`,
                  paddingLeft: `${activeMarginPadding.left}px`,
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'top left',
                  boxSizing: 'border-box',
                }}
                className="bg-white border border-neutral-300 rounded-xs text-neutral-800 flex flex-col justify-between absolute top-0 left-0 overflow-hidden ring-1 ring-black/5"
              >
                {/* Running Header (Smart Read from Document Settings & Info Setup) */}
                {printHeadersFooters && (
                  <div className="border-b border-neutral-300 pb-2 mb-3 flex items-center justify-between text-xs text-neutral-500 font-sans select-none shrink-0">
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartHeaderLeft || settings.title || ''}
                    </span>
                    <span className="text-center font-semibold text-neutral-700">
                      {smartHeaderPageText}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartHeaderRight || `${paperSize.toUpperCase()} · ${orientation}`}
                    </span>
                  </div>
                )}

                {/* Document Body Sliced For Current Page */}
                <div
                  className={`flex-1 overflow-hidden print-preview-body ${
                    tableBetterViewGrids ? 'preview-better-grids' : ''
                  }`}
                >
                  {editor ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: activePageHtml,
                      }}
                      className={`ProseMirror pointer-events-none prose prose-base max-w-none ${
                        highContrastMode ? 'text-black font-medium' : ''
                      }`}
                    />
                  ) : (
                    <p className="text-neutral-400 italic">No document content</p>
                  )}
                </div>

                {/* Running Footer (Smart Read from Document Settings & Info Setup) */}
                {printHeadersFooters && (
                  <div className="border-t border-neutral-300 pt-2.5 mt-4 flex items-center justify-between text-xs text-neutral-500 font-sans select-none shrink-0">
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartFooterLeft || settings.author || 'Document Canvas Print'}
                    </span>
                    <span className="text-center font-bold text-neutral-800">
                      {smartFooterPageText || `Page ${currentPage} of ${totalPages}`}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartFooterRight || settings.version || ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Multi-Page Print Sheets (Active during browser print spooler) */}
      <div id="dedicated-print-container" className="print-only">
        {pagesToPrint.map(({ chunk, pageNum }) => {
          const hPageText = formatSmartPageText({
            showPages: settings.headerShowPages ?? false,
            pageState: settings.headerPageStart !== 0 ? 1 : 0,
            maxState: settings.headerPageTotal !== 0 ? 1 : 0,
            separator: settings.headerPageSeparator || '-',
            currentPage: pageNum,
            totalPages: pageChunks.length,
          });

          const fPageText = formatSmartPageText({
            showPages: settings.footerShowPages ?? true,
            pageState: settings.footerPageStart !== 0 ? 1 : 0,
            maxState: settings.footerPageTotal !== 0 ? 1 : 0,
            separator: settings.footerPageSeparator || '-',
            currentPage: pageNum,
            totalPages: pageChunks.length,
          });

          return (
            <div
              key={pageNum}
              className="print-page-sheet"
              style={{
                paddingTop: `${activeMarginPadding.top}px`,
                paddingRight: `${activeMarginPadding.right}px`,
                paddingBottom: `${activeMarginPadding.bottom}px`,
                paddingLeft: `${activeMarginPadding.left}px`,
              }}
            >
              {/* Running Header on Every Page */}
              {printHeadersFooters && (
                <div className="print-page-header">
                  <span className="truncate max-w-[33%] text-left font-medium">
                    {smartHeaderLeft || settings.title || ''}
                  </span>
                  <span className="text-center font-semibold text-neutral-700">
                    {hPageText}
                  </span>
                  <span className="truncate max-w-[33%] text-right font-medium">
                    {smartHeaderRight || `${paperSize.toUpperCase()} · ${orientation}`}
                  </span>
                </div>
              )}

              {/* Sliced Document Body for This Page */}
              <div
                className={`print-page-body ProseMirror ${
                  tableBetterViewGrids ? 'preview-better-grids' : ''
                } ${highContrastMode ? 'text-black font-medium' : ''}`}
                dangerouslySetInnerHTML={{ __html: chunk }}
              />

              {/* Running Footer on Every Page with Bottom Indent */}
              {printHeadersFooters && (
                <div className="print-page-footer">
                  <span className="truncate max-w-[33%] text-left font-medium">
                    {smartFooterLeft || settings.author || 'Document Canvas Print'}
                  </span>
                  <span className="text-center font-bold text-neutral-800">
                    {fPageText || `Page ${pageNum} of ${pageChunks.length}`}
                  </span>
                  <span className="truncate max-w-[33%] text-right font-medium">
                    {smartFooterRight || settings.version || ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Embedded CSS for Preview Fidelity */}
      <style>{`
        .print-preview-body .tableWrapper {
          width: 100% !important;
          max-width: 100% !important;
          margin: 16px 0 !important;
        }
        .print-preview-body table {
          width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          max-width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          min-width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          margin-left: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
          margin-right: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          box-sizing: border-box !important;
          border: 1.5px solid #111827 !important;
        }
        .print-preview-body col {
          width: auto !important;
          min-width: 0 !important;
        }
        .print-preview-body th,
        .print-preview-body td {
          min-width: 60px !important;
          box-sizing: border-box !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
          white-space: normal !important;
          border: 1px solid #111827 !important;
          padding: 8px 12px !important;
          vertical-align: top !important;
        }
        .print-preview-body th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
};

export default PrintBackstageSection;
