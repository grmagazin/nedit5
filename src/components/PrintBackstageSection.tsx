import React, { useState, useEffect, useMemo } from 'react';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Download,
  ShieldCheck,
  Check,
  Palette,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { calculateDocumentPages, PAGE_HEIGHT_LOOKUP, PAGE_WIDTH_LOOKUP } from '../utils/pageCalculator';
import { executePrintToPdf, injectPdfPrintStyles } from '../utils/pdfPrintEngine';

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
  // Print settings
  const [copies, setCopies] = useState<number>(1);
  const [printerDestination, setPrinterDestination] = useState<'pdf' | 'system' | 'spooler'>('pdf');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');

  const [paperSize, setPaperSize] = useState<PageSize>(settings.pageSize || 'a4');
  const [orientation, setOrientation] = useState<PageOrientation>(settings.orientation || 'portrait');
  const [margins, setMargins] = useState<PageMargin>(settings.margins || 'normal');

  // Smart feature toggles
  const [smartBreakOptimization, setSmartBreakOptimization] = useState<boolean>(true);
  const [printBackgroundGraphics, setPrintBackgroundGraphics] = useState<boolean>(true);
  const [highContrastMode, setHighContrastMode] = useState<boolean>(false);
  const [printHeadersFooters, setPrintHeadersFooters] = useState<boolean>(true);
  const [hideMarkupGuides, setHideMarkupGuides] = useState<boolean>(true);

  // Preview state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(0.7);
  const [isSpooling, setIsSpooling] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Execute smart print
  const handleTriggerPrint = () => {
    setIsSpooling(true);
    showToast('Preparing document and launching print dialog...');

    // Save settings if changed
    if (onUpdateSettings) {
      onUpdateSettings({
        pageSize: paperSize,
        orientation,
        margins,
      });
    }

    // Execute with dynamic stylesheet injection
    executePrintToPdf(
      {
        pageSize: paperSize,
        orientation,
        margins,
        printBackgrounds: printBackgroundGraphics,
        highContrast: highContrastMode,
        documentTitle: settings.title || 'Document',
      },
      () => {
        // Close backstage right before native print dialog opens
        onClose();
      },
      () => {
        setIsSpooling(false);
      }
    );
  };

  // Physical dimension pixel values at 96 DPI
  const baseWidthPx = PAGE_WIDTH_LOOKUP[paperSize] || 794;
  const baseHeightPx = PAGE_HEIGHT_LOOKUP[paperSize] || 1123;
  const printWidth = orientation === 'landscape' ? baseHeightPx : baseWidthPx;
  const printHeight = orientation === 'landscape' ? baseWidthPx : baseHeightPx;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-neutral-800 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-8 py-4 shrink-0 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#185abd] text-white rounded-lg shadow-xs">
            <Printer size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 leading-tight">Print Workstation</h1>
            <p className="text-xs text-neutral-500">
              Interactive print preview, vector spooler settings, and smart layout optimization
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
        <div className="bg-blue-50 border-b border-blue-200 px-8 py-2 text-xs font-semibold text-[#185abd] flex items-center space-x-2 animate-fadeIn shrink-0">
          <CheckCircle2 size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Print Controls & Settings (Fixed width, scrollable) */}
        <div className="w-80 md:w-96 border-r border-neutral-200 bg-white overflow-y-auto p-6 space-y-6 shrink-0 shadow-xs">
          {/* Big Print Button and Copies Counter */}
          <div className="flex items-center space-x-3 pb-5 border-b border-neutral-200">
            <button
              onClick={handleTriggerPrint}
              disabled={isSpooling}
              className="flex-1 py-3 px-4 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0c3979] text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-75 active:scale-98"
            >
              <Printer size={18} />
              <span>{isSpooling ? 'Spooling...' : 'Print Document'}</span>
            </button>

            <div className="flex flex-col items-center border border-neutral-300 rounded-xl px-2.5 py-1.5 bg-neutral-50 shadow-2xs">
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

          {/* Section: Printer Destination */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Printer Destination
            </label>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => setPrinterDestination('pdf')}
                className={`w-full p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-colors cursor-pointer ${
                  printerDestination === 'pdf'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="p-1 rounded bg-red-100 text-[#dc2626] font-black text-[10px] shrink-0 mt-0.5">
                  PDF
                </div>
                <div>
                  <div className="font-bold">Save as PDF (Recommended)</div>
                  <div className="text-[11px] text-neutral-500 font-normal">
                    ISO 32000 Vector Export · Perfect for sharing and archiving
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPrinterDestination('system')}
                className={`w-full p-2.5 rounded-lg border text-left flex items-start space-x-2.5 transition-colors cursor-pointer ${
                  printerDestination === 'system'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-semibold'
                    : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="p-1 rounded bg-blue-100 text-[#185abd] font-bold text-[10px] shrink-0 mt-0.5">
                  <Printer size={12} />
                </div>
                <div>
                  <div className="font-bold">Physical Printer / Network Spooler</div>
                  <div className="text-[11px] text-neutral-500 font-normal">
                    Send directly to connected office or home hardware printer
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section: Page Range */}
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

          {/* Section: Paper Size & Orientation */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 block">Paper Size</label>
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
                  <span>Portrait</span>
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
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Smart Print Features & Toggles */}
          <div className="space-y-3 pt-3 border-t border-neutral-100">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={14} className="text-[#185abd]" />
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                Smart Proofing &amp; Print Features
              </label>
            </div>

            <div className="space-y-2 text-xs">
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
                    Prevents mid-row table truncation and orphan headings automatically
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
                  <span className="font-semibold text-neutral-800 block">Print Background Graphics &amp; Colors</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Preserves callout shading, card backgrounds, and table cell fills
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
                    Converts text to pure black to conserve ink on physical printers
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printHeadersFooters}
                  onChange={(e) => setPrintHeadersFooters(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Running Header &amp; Footer</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Shows document title, date, and page count on printed sheets
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideMarkupGuides}
                  onChange={(e) => setHideMarkupGuides(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Hide On-Screen Guides</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Hides format painters, rulers, cursor markers, and squiggly lines
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Print Preview */}
        <div className="flex-1 flex flex-col bg-[#e5e7eb]/70 overflow-hidden">
          {/* Preview Navigation & Zoom Bar */}
          <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0 shadow-2xs">
            {/* Pager */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="font-semibold text-neutral-700">
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
            </div>

            {/* Geometry Tag */}
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-neutral-500">
              <span className="uppercase font-bold text-neutral-700">{paperSize}</span>
              <span>&bull;</span>
              <span className="capitalize">{orientation}</span>
              <span>&bull;</span>
              <span>{margins} margins</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewZoom(Math.max(0.4, previewZoom - 0.1))}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="w-12 text-center font-mono font-semibold text-neutral-700">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                onClick={() => setPreviewZoom(Math.min(1.2, previewZoom + 0.1))}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={() => setPreviewZoom(0.7)}
                className="px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-100 text-[11px] font-semibold cursor-pointer ml-1"
                title="Reset zoom to 70%"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Paper View Container */}
          <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
            <div
              style={{
                width: `${printWidth * previewZoom}px`,
                minHeight: `${printHeight * previewZoom}px`,
                padding: `${(margins === 'narrow' ? 24 : margins === 'wide' ? 48 : 36) * previewZoom}px`,
              }}
              className="bg-white border border-neutral-300 rounded shadow-xl transition-all duration-150 text-neutral-800 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Running Header */}
              {printHeadersFooters && (
                <div
                  style={{ fontSize: `${10 * previewZoom}px` }}
                  className="border-b border-neutral-200 pb-1.5 mb-3 flex justify-between text-neutral-400 select-none shrink-0"
                >
                  <span className="truncate max-w-[65%] font-medium">
                    {settings.title || 'Untitled Document'}
                  </span>
                  <span>
                    {paperSize.toUpperCase()} · {orientation}
                  </span>
                </div>
              )}

              {/* Document Body */}
              <div
                style={{ fontSize: `${12 * previewZoom}px`, lineHeight: 1.5 }}
                className="flex-1 overflow-hidden"
              >
                {editor ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: editor.getHTML().slice(0, 2200),
                    }}
                    className={`ProseMirror pointer-events-none prose prose-sm max-w-none ${
                      highContrastMode ? 'text-black font-medium' : ''
                    }`}
                  />
                ) : (
                  <p className="text-neutral-400 italic">No document content</p>
                )}
              </div>

              {/* Running Footer */}
              {printHeadersFooters && (
                <div
                  style={{ fontSize: `${9 * previewZoom}px` }}
                  className="border-t border-neutral-200 pt-2 mt-4 flex justify-between text-neutral-400 select-none shrink-0"
                >
                  <span>Printed from Document Canvas Vector Driver</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintBackstageSection;
