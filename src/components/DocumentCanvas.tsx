import React, { useMemo, useState, useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { DocumentSettings } from '../types';
import { InteractiveRuler } from './InteractiveRuler';
import { EditorContextMenu } from './EditorContextMenu';
import { ImageClickMenu } from './ImageClickMenu';
import { HyperLinkOverlay } from './HyperLinkOverlay';
import { InsertLinkModal } from './InsertLinkModal';
import { Paintbrush, FileText, BookOpen } from 'lucide-react';
import { CopiedWordFormat, describeFormat } from '../utils/formatPainter';
import {
  calculateDocumentPages,
  formatSmartPageText,
  DEFAULT_PAGE_BREAK_CALIBRATIONS,
  getCalibrationKey,
  getCalibrationLabel,
} from '../utils/pageCalculator';

interface DocumentCanvasProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  formatPainter?: CopiedWordFormat | null;
  onApplyFormatPainter?: () => void;
  onCancelFormatPainter?: () => void;
  onFocusLayoutTab?: () => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  editor,
  settings,
  onUpdateSettings,
  formatPainter,
  onApplyFormatPainter,
  onCancelFormatPainter,
  onFocusLayoutTab,
}) => {
  // Real multi-page calculation for accurate dynamic header/footer page counters
  const calculatedPages = useMemo(() => {
    return calculateDocumentPages(editor, settings.pageSize, settings.orientation);
  }, [editor?.state.doc, settings.pageSize, settings.orientation]);
  const realTotalPages = Math.max(1, calculatedPages.length);
  const realCurrentPage = calculatedPages.find((p) => p.isCurrent)?.pageNumber || 1;

  // Page dimension calculations (standard 96 DPI screen resolution)
  const pageDimensions = useMemo(() => {
    let width = 794; // A4 default: 8.27" * 96
    let minHeight = 1123; // 11.69" * 96

    switch (settings.pageSize) {
      case 'a4':
        width = 794; // 8.27 × 11.69" (210 × 297 mm)
        minHeight = 1123;
        break;
      case 'letter':
        width = 816; // 8.5 × 11" (216 × 279 mm)
        minHeight = 1056;
        break;
      case 'legal':
        width = 816; // 8.5 × 14" (216 × 356 mm)
        minHeight = 1344;
        break;
      case 'a3':
        width = 1122; // 11.69 × 16.54" (297 × 420 mm)
        minHeight = 1588;
        break;
      case 'a5':
        width = 560; // 5.83 × 8.27" (148 × 210 mm)
        minHeight = 794;
        break;
      case 'executive':
        width = 696; // 7.25 × 10.5" (184 × 267 mm)
        minHeight = 1008;
        break;
      case 'tabloid':
        width = 1056; // 11 × 17" (279 × 432 mm)
        minHeight = 1632;
        break;
      case 'b5':
        width = 665; // 6.93 × 9.84" (176 × 250 mm)
        minHeight = 945;
        break;
      case 'a6':
        width = 396; // 4.13 × 5.83" (105 × 148 mm)
        minHeight = 560;
        break;
      case 'folio':
        width = 816; // 8.5 × 13" (216 × 330 mm)
        minHeight = 1248;
        break;
      case 'statement':
        width = 528; // 5.5 × 8.5" (140 × 216 mm)
        minHeight = 816;
        break;
      case 'ledger':
        width = 1632; // 17 × 11" (432 × 279 mm)
        minHeight = 1056;
        break;
      default:
        width = 794;
        minHeight = 1123;
        break;
    }

    if (settings.orientation === 'landscape') {
      const temp = width;
      width = minHeight;
      minHeight = temp;
    }

    return { width, minHeight };
  }, [settings.pageSize, settings.orientation]);

  // Margin padding calculation in exact pixels matching ruler
  const marginPaddingStyle = useMemo(() => {
    if (settings.margins === 'custom' && settings.customMargins) {
      return {
        paddingLeft: `${Math.round(settings.customMargins.left * 96)}px`,
        paddingRight: `${Math.round(settings.customMargins.right * 96)}px`,
        paddingTop: `${Math.round((settings.customMargins.top ?? 1.0) * 96)}px`,
        paddingBottom: `${Math.round((settings.customMargins.bottom ?? 1.0) * 96)}px`,
      };
    }
    switch (settings.margins) {
      case 'narrow':
        return {
          paddingTop: '48px',
          paddingBottom: '48px',
          paddingLeft: '48px',
          paddingRight: '48px',
        }; // ~0.5 inch (48px)
      case 'moderate':
        return {
          paddingTop: '96px',
          paddingBottom: '96px',
          paddingLeft: '72px',
          paddingRight: '72px',
        }; // 1.0in top/bottom (96px), 0.75in left/right (72px)
      case 'wide':
        return {
          paddingTop: '96px',
          paddingBottom: '96px',
          paddingLeft: '144px',
          paddingRight: '144px',
        }; // 1.0in top/bottom (96px), 1.5in left/right (144px)
      case 'normal':
      default:
        return {
          paddingTop: '96px',
          paddingBottom: '96px',
          paddingLeft: '96px',
          paddingRight: '96px',
        }; // ~1.0 inch (96px)
    }
  }, [settings.margins, settings.customMargins]);

  const scale = settings.zoom / 100;

  const effectiveThemeMode = settings.themeMode || (settings.isDarkMode ? 'fullDark' : 'light');
  const isFullDark = effectiveThemeMode === 'fullDark';
  const isCanvasDark = effectiveThemeMode === 'canvasDark';
  const isSepia = effectiveThemeMode === 'sepia';

  let canvasBgClass = 'bg-[#f3f2f1]';
  let canvasGridColor = 'rgba(0,0,0,0.04)';
  let pageBorderClass = 'border-neutral-300/80';
  let shadowClass = 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]';
  let pageBgColor = settings.pageColor || '#ffffff';
  let pageTextColor = '#1f2937';

  if (isFullDark) {
    canvasBgClass = 'bg-[#141414]';
    canvasGridColor = 'rgba(255,255,255,0.05)';
    pageBorderClass = 'border-[#383838]';
    shadowClass = 'shadow-[0_8px_32px_rgba(0,0,0,0.7)]';
    pageBgColor = settings.pageColor && settings.pageColor !== '#ffffff' && settings.pageColor !== '#fbf8ee'
      ? settings.pageColor
      : '#282828';
    pageTextColor = '#f3f4f6';
  } else if (isCanvasDark) {
    canvasBgClass = 'bg-[#181818]';
    canvasGridColor = 'rgba(255,255,255,0.05)';
    pageBorderClass = 'border-neutral-300';
    shadowClass = 'shadow-[0_6px_28px_rgba(0,0,0,0.55)]';
    pageBgColor = settings.pageColor && settings.pageColor !== '#282828' && settings.pageColor !== '#fbf8ee'
      ? settings.pageColor
      : '#ffffff';
    pageTextColor = '#1f2937';
  } else if (isSepia) {
    canvasBgClass = 'bg-[#e8dfcc]';
    canvasGridColor = 'rgba(120,90,50,0.06)';
    pageBorderClass = 'border-[#d4c6b0]';
    shadowClass = 'shadow-[0_6px_24px_rgba(110,85,60,0.18)]';
    pageBgColor = settings.pageColor && settings.pageColor !== '#282828' && settings.pageColor !== '#ffffff'
      ? settings.pageColor
      : '#fbf8ee';
    pageTextColor = '#2c231c';
  }

  let canvasBgHex = '#f3f2f1';
  if (isFullDark) canvasBgHex = '#141414';
  else if (isCanvasDark) canvasBgHex = '#181818';
  else if (isSepia) canvasBgHex = '#e8dfcc';

  const rulerBorderHex = isFullDark || isCanvasDark
    ? '#333333'
    : isSepia
    ? '#d8ccb8'
    : '#dad9d8';

  // Handle Page Border & Shadow Styles (Simple Shadow, Deep Shadow, Box Border 1px, Thick Border 2px, Dots Border, Double Border, None)
  const effectivePageBorderStyle =
    settings.pageBorderStyle || (settings.showShadow === false ? 'none' : 'simple-shadow');

  if (effectivePageBorderStyle === 'none') {
    shadowClass = 'shadow-none';
    pageBorderClass = 'border border-transparent';
  } else if (effectivePageBorderStyle === 'deep-shadow') {
    if (isFullDark) {
      pageBorderClass = 'border border-neutral-700';
      shadowClass = 'shadow-[0_16px_50px_rgba(0,0,0,0.9)]';
    } else if (isCanvasDark) {
      pageBorderClass = 'border border-neutral-500';
      shadowClass = 'shadow-[0_16px_50px_rgba(0,0,0,0.8)]';
    } else if (isSepia) {
      pageBorderClass = 'border border-[#b8a78e]';
      shadowClass = 'shadow-[0_14px_40px_rgba(90,65,40,0.32)]';
    } else {
      pageBorderClass = 'border border-neutral-400';
      shadowClass = 'shadow-[0_16px_45px_rgba(0,0,0,0.25)]';
    }
  } else if (effectivePageBorderStyle === 'box-border') {
    shadowClass = 'shadow-none';
    pageBorderClass = isFullDark
      ? 'border border-neutral-500'
      : isSepia
      ? 'border border-[#7c6953]'
      : 'border border-neutral-800';
  } else if (effectivePageBorderStyle === 'thick-border') {
    shadowClass = 'shadow-none';
    pageBorderClass = isFullDark
      ? 'border-2 border-neutral-400'
      : isSepia
      ? 'border-2 border-[#543011]'
      : 'border-2 border-neutral-900';
  } else if (effectivePageBorderStyle === 'dots-border') {
    shadowClass = 'shadow-none';
    pageBorderClass = isFullDark
      ? 'border-2 border-dotted border-neutral-400'
      : isSepia
      ? 'border-2 border-dotted border-[#7c6953]'
      : 'border-2 border-dotted border-neutral-800';
  } else if (effectivePageBorderStyle === 'double-border') {
    shadowClass = 'shadow-none';
    pageBorderClass = isFullDark
      ? 'border-4 border-double border-neutral-400'
      : isSepia
      ? 'border-4 border-double border-[#543011]'
      : 'border-4 border-double border-neutral-900';
  } else {
    // simple-shadow (default)
    // ensure pageBorderClass starts with border
    if (!pageBorderClass.includes('border')) {
      pageBorderClass = `border ${pageBorderClass}`;
    }
  }

  // Table drag / column resize & table drag handle handler
  useEffect(() => {
    let activeTable: HTMLElement | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      const pmEl = document.querySelector('.ProseMirror');
      const target = e.target as HTMLElement | null;
      const table = target?.closest('table') as HTMLElement | null;
      const isResizeCursor = pmEl?.classList.contains('resize-cursor');
      const isResizeHandle = target?.classList.contains('column-resize-handle');
      const isDragHandle = target?.closest('.table-drag-handle');

      if ((isResizeCursor || isResizeHandle) && table) {
        document.body.classList.add('table-col-resizing');
      } else if (isDragHandle) {
        activeTable = table;
        table?.classList.add('dragging');
        document.body.classList.add('table-dragging');
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      const table = target?.closest('table') as HTMLElement | null;
      if (table) {
        activeTable = table;
        table.classList.add('dragging');
        document.body.classList.add('table-dragging');
      }
    };

    const handleMouseUp = () => {
      if (document.body.classList.contains('table-col-resizing')) {
        document.body.classList.remove('table-col-resizing');
      }
      if (activeTable) {
        activeTable.classList.remove('dragging');
        activeTable = null;
      }
      document.body.classList.remove('table-dragging');
      document.querySelectorAll('table.dragging').forEach((t) => t.classList.remove('dragging'));
    };

    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('dragend', handleMouseUp, true);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('dragend', handleMouseUp, true);
      document.body.classList.remove('table-col-resizing');
      document.body.classList.remove('table-dragging');
    };
  }, []);

  // 2-Column NEdit4 / Word Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  // Hyperlink Dialog State (triggered from Context Menu or canvas)
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Reference for real-time document sheet height measurement
  const docPageRef = React.useRef<HTMLDivElement>(null);
  const [docHeight, setDocHeight] = useState<number>(1424);

  // Smart Page Break View & Real-world Calibration State (matching user photo)
  const [showPageBreaks, setShowPageBreaks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wordpad_show_page_breaks');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default to active matching user photo
  });

  const activeCalibrationKey = getCalibrationKey(settings.pageSize || 'a4', settings.orientation || 'portrait');
  const paperLabel = getCalibrationLabel(settings.pageSize || 'a4', settings.orientation || 'portrait');

  const [pageBreakCalibratedHeight, setPageBreakCalibratedHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`wordpad_page_break_calibrated_height_${activeCalibrationKey}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 400 && val <= 3500) return val;
      }
    } catch {}
    return DEFAULT_PAGE_BREAK_CALIBRATIONS[activeCalibrationKey] || (settings.orientation === 'landscape' ? 880 : 1250);
  });

  // Keep calibrated height synced when paper size OR orientation changes
  useEffect(() => {
    const key = getCalibrationKey(settings.pageSize || 'a4', settings.orientation || 'portrait');
    try {
      const saved = localStorage.getItem(`wordpad_page_break_calibrated_height_${key}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 400 && val <= 3500) {
          setPageBreakCalibratedHeight(val);
          return;
        }
      }
    } catch {}
    const defaultVal = DEFAULT_PAGE_BREAK_CALIBRATIONS[key] || (settings.orientation === 'landscape' ? 880 : 1250);
    setPageBreakCalibratedHeight(defaultVal);
  }, [settings.pageSize, settings.orientation]);

  // Track document page height dynamically for accurate page break placement via native ResizeObserver
  useEffect(() => {
    if (!docPageRef.current) return;
    const updateHeight = () => {
      if (docPageRef.current) {
        setDocHeight(docPageRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(docPageRef.current);
    return () => ro.disconnect();
  }, []);

  const handleAdjustHeight = (delta: number = 5) => {
    setPageBreakCalibratedHeight((prev) => {
      const next = Math.max(400, Math.min(3500, prev + delta));
      const key = getCalibrationKey(settings.pageSize || 'a4', settings.orientation || 'portrait');
      try {
        localStorage.setItem(`wordpad_page_break_calibrated_height_${key}`, next.toString());
        if (key === 'a4_portrait') {
          localStorage.setItem('wordpad_page_break_calibrated_height', next.toString());
          localStorage.setItem('wordpad_a4_calibration_custom_height', next.toString());
        }
        window.dispatchEvent(
          new CustomEvent('page-calibration-change', { detail: { key, height: next } })
        );
      } catch {}
      return next;
    });
  };

  const handleTogglePageBreaks = () => {
    setShowPageBreaks((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wordpad_show_page_breaks', String(next));
      } catch {}
      return next;
    });
  };

  // Calculate page break lines
  const pageBreakLines = useMemo(() => {
    if (!showPageBreaks) return [];
    const minHeight = pageDimensions.minHeight;
    const effectiveDocHeight = Math.max(minHeight, docHeight);
    const count = Math.max(1, Math.ceil(effectiveDocHeight / pageBreakCalibratedHeight));
    const lines: number[] = [];
    for (let p = 1; p <= count; p++) {
      lines.push(p);
    }
    return lines;
  }, [showPageBreaks, pageDimensions.minHeight, docHeight, pageBreakCalibratedHeight]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (
      document.querySelector('[data-word-modal="true"], .word-modal-backdrop, #word-file-backstage, .file-backstage-container')
    ) {
      return;
    }
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <main
      id="word-canvas-workspace"
      data-hyperlink-mode={settings.hyperLinkMode || 'navigate'}
      onContextMenu={handleContextMenu}
      className={`flex-1 overflow-y-auto overflow-x-auto relative flex flex-col items-center pt-0 pb-8 px-0 transition-colors ${canvasBgClass}`}
      style={{
        backgroundImage: settings.showGridlines
          ? `linear-gradient(to right, ${canvasGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${canvasGridColor} 1px, transparent 1px)`
          : undefined,
        backgroundSize: settings.showGridlines ? '24px 24px' : undefined,
      }}
    >
      {/* 1. Word-Style Sticky Horizontal Ruler Bar (Directly below Ribbon Toolbar, 0px space, full screen width) */}
      {settings.showRuler && !settings.isFocusMode && (
        <div
          id="word-sticky-ruler-bar"
          className={`no-print print:hidden sticky top-0 z-5 w-full flex-shrink-0 flex justify-center border-b select-none ${
            isFullDark || isCanvasDark
              ? 'border-[#333333]'
              : isSepia
              ? 'border-[#d8ccb8]'
              : 'border-[#dad9d8]'
          }`}
          style={{
            backgroundColor: canvasBgHex,
            minWidth: `${pageDimensions.width * scale + 80}px`,
            height: `${Math.round(24 * scale)}px`,
            zIndex: 5,
            borderBottom: `1px solid ${rulerBorderHex}`,
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: `${pageDimensions.width}px`,
              height: '24px',
            }}
            className="no-print print:hidden flex-shrink-0 transition-transform duration-100 ease-out shadow-xs relative"
          >
            <InteractiveRuler
              editor={editor}
              margins={settings.margins}
              customMargins={settings.customMargins}
              pageWidth={pageDimensions.width}
              zoom={settings.zoom}
              unit={settings.rulerUnit || 'inches'}
              themeMode={effectiveThemeMode}
              onUpdateMargin={(margin) => onUpdateSettings({ margins: margin, customMargins: undefined })}
              onCycleMarginCarousel={(margin) => {
                onUpdateSettings({ margins: margin, customMargins: undefined });
                onFocusLayoutTab?.();
              }}
              onFocusLayoutTab={onFocusLayoutTab}
              onUpdateCustomMargins={(custom) =>
                onUpdateSettings({ customMargins: custom, margins: 'custom' })
              }
              onToggleNavigation={() =>
                onUpdateSettings({ showNavigationPane: !settings.showNavigationPane })
              }
              onToggleFormatter={() =>
                onUpdateSettings({ showFormatterPane: !settings.showFormatterPane })
              }
              isNavigationOpen={!!settings.showNavigationPane}
              isFormatterOpen={!!settings.showFormatterPane}
            />

            {/* Smart 3 Buttons: Page Break View & Height Calibration (+ / -) */}
            <div
              className="absolute left-full top-0 ml-1.5 flex items-center h-6 select-none z-20"
              style={{ height: '24px' }}
            >
              {/* Button 1: View Page Breaks (FileText icon, blue background when active) */}
              <button
                type="button"
                onClick={handleTogglePageBreaks}
                title={showPageBreaks ? `Hide ${paperLabel} page breaks` : `Show ${paperLabel} page breaks`}
                className={`w-6 h-6 rounded-[3px] flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                  showPageBreaks
                    ? 'bg-[#185abd] text-white border border-[#185abd] hover:bg-[#134896]'
                    : isFullDark || isCanvasDark
                    ? 'bg-neutral-800 text-neutral-300 border border-neutral-600 hover:border-[#185abd] hover:text-[#185abd]'
                    : 'bg-white text-neutral-600 border border-neutral-300 hover:border-[#185abd] hover:text-[#185abd]'
                }`}
                aria-label={showPageBreaks ? `Hide ${paperLabel} page breaks` : `Show ${paperLabel} page breaks`}
              >
                <FileText size={14} className="shrink-0" />
              </button>

              {/* Buttons 2 & 3: Compact Vertical Stepper (-5 / +5) for real height calibration */}
              <div className="flex flex-col ml-0.5 h-6 justify-between">
                {/* Minus Button: Shorter page (-5px) */}
                <button
                  type="button"
                  onClick={(e) => handleAdjustHeight(e.shiftKey ? -25 : -5)}
                  title={`Calibrate: shorter ${paperLabel} page (${pageBreakCalibratedHeight - 5}px)`}
                  className={`w-3.5 h-[11.5px] flex items-center justify-center border rounded-t-[2px] cursor-pointer text-[10px] font-bold leading-none select-none transition-colors ${
                    isFullDark || isCanvasDark
                      ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
                      : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
                  }`}
                  aria-label={`Calibrate: shorter ${paperLabel} page (${pageBreakCalibratedHeight - 5}px)`}
                >
                  &minus;
                </button>

                {/* Plus Button: Taller page (+5px) */}
                <button
                  type="button"
                  onClick={(e) => handleAdjustHeight(e.shiftKey ? 25 : 5)}
                  title={`Calibrate: taller ${paperLabel} page (${pageBreakCalibratedHeight + 5}px)`}
                  className={`w-3.5 h-[11.5px] flex items-center justify-center border border-t-0 rounded-b-[2px] cursor-pointer text-[10px] font-bold leading-none select-none transition-colors ${
                    isFullDark || isCanvasDark
                      ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-neutral-200'
                      : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
                  }`}
                  aria-label={`Calibrate: taller ${paperLabel} page (${pageBreakCalibratedHeight + 5}px)`}
                >
                  &#43;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Container scaling wrapper for Document Pages */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${Math.max(0, (scale - 1) * 800)}px`,
        }}
        className={`flex flex-col items-center px-4 transition-transform duration-100 ease-out ${
          settings.showRuler && !settings.isFocusMode ? 'pt-4' : 'pt-6'
        }`}
      >
        {/* Floating Format Painter Active Banner */}
        {formatPainter && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-amber-300 dark:border-amber-600 shadow-xl px-4 py-1.5 rounded-full flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Paintbrush size={15} className="text-amber-600 animate-bounce" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                Format Painter Active ({formatPainter.mode === 'persistent' ? 'Persistent Multi-Paint' : 'Single Use'})
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs truncate hidden sm:inline">
                {describeFormat(formatPainter)}
              </span>
            </div>
            {onCancelFormatPainter && (
              <button
                onClick={onCancelFormatPainter}
                className="text-[11px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer transition-colors"
                title="Exit Format Painter (or press Esc)"
              >
                Exit (Esc)
              </button>
            )}
          </div>
        )}

        {/* Smart Reading Mode Notification Banner at Head of Document */}
        {settings.viewMode === 'read' && (
          <div
            id="word-reading-mode-banner"
            className="w-full max-w-2xl mb-3.5 z-30 bg-blue-50/95 dark:bg-neutral-850/95 border border-blue-200 dark:border-blue-900/60 shadow-md rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 no-print select-none backdrop-blur-xs"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-[#185abd] dark:text-blue-300 shrink-0">
                <BookOpen size={16} />
              </span>
              <div className="text-xs text-blue-950 dark:text-blue-100 leading-tight">
                <span className="font-bold">You are in reading mode</span>
                <span className="text-blue-700 dark:text-blue-300 ml-1.5 hidden sm:inline">
                  / switch from footer Layouts
                </span>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 sm:hidden">
                  Switch from footer Layouts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onUpdateSettings({ viewMode: 'print' })}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#185abd] hover:bg-[#114b9c] text-white shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                title="Switch back to Print Layout"
              >
                <span>Print Layout</span>
              </button>
            </div>
          </div>
        )}

        {/* The Word Document Page Sheet */}
        <div
          ref={docPageRef}
          id="word-document-page"
          data-hyperlink-mode={settings.hyperLinkMode || 'navigate'}
          className={`print-page transition-all duration-200 rounded-[2px] relative overflow-hidden ${pageBorderClass} ${shadowClass} ${
            isFullDark ? 'dark-page' : ''
          } ${isSepia ? 'sepia-page' : ''} ${
            settings.viewMode === 'read' ? 'cursor-default select-text' : ''
          } ${formatPainter ? 'format-painter-active' : ''}`}
          style={{
            ...marginPaddingStyle,
            width: `${pageDimensions.width}px`,
            minHeight: `${pageDimensions.minHeight}px`,
            backgroundColor: pageBgColor,
            color: pageTextColor,
          }}
          onClick={() => {
            if (settings.viewMode !== 'read' && editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
          onMouseUpCapture={() => {
            if (formatPainter && onApplyFormatPainter) {
              // Defer slightly so ProseMirror processes selection change first
              setTimeout(() => {
                onApplyFormatPainter();
              }, 15);
            }
          }}
        >
          {/* Watermark Overlay if active */}
          {settings.watermark && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
              aria-hidden="true"
            >
              <span className="text-6xl md:text-7xl font-black uppercase tracking-widest text-neutral-400/20 -rotate-45 transform whitespace-nowrap">
                {settings.watermark === 'Your Mark'
                  ? (settings.customWatermark || 'YOUR MARK')
                  : settings.watermark}
              </span>
            </div>
          )}

          {/* Document Header (Configured via Info & Setup) */}
          {settings.showHeaderFooter !== false && (settings.headerLeft || settings.headerRight || settings.headerShowPages) && (
            <div className="absolute top-5 left-10 right-10 flex items-center justify-between text-[11px] text-neutral-400/90 border-b border-neutral-200/60 pb-1 select-none pointer-events-none font-sans z-10">
              <span className="truncate max-w-[33%]">{settings.headerLeft || ''}</span>
              <span className="text-center font-medium">
                {formatSmartPageText({
                  showPages: settings.headerShowPages,
                  pageState: settings.headerPageStart !== 0 ? 1 : 0,
                  maxState: settings.headerPageTotal !== 0 ? 1 : 0,
                  separator: settings.headerPageSeparator,
                  currentPage: realCurrentPage,
                  totalPages: realTotalPages,
                })}
              </span>
              <span className="truncate max-w-[33%] text-right">{settings.headerRight || ''}</span>
            </div>
          )}

          <div
            data-hyperlink-mode={settings.hyperLinkMode || 'navigate'}
            className={`relative z-10 ${
              settings.columns === 2
                ? '[&_.ProseMirror]:columns-2 [&_.ProseMirror]:gap-8'
                : ''
            } ${
              settings.showParagraphMarks ? 'word-paragraph-marks-active' : ''
            }`}
            onClickCapture={(event) => {
              const target = event.target as HTMLElement | null;
              const link = target?.closest('a') as HTMLAnchorElement | null;
              if (!link) return;

              const mode = settings.hyperLinkMode || 'navigate';

              if (mode === 'navigate') {
                // Navigate mode: allow browser/editorProps to follow link
                return;
              }

              // EDIT MODE:
              // Stop browser navigation so it NEVER opens a new link window!
              event.preventDefault();
              event.stopPropagation();

              // Select the hyperlink in TipTap
              if (editor && editor.view) {
                try {
                  const pos = editor.view.posAtDOM(link, 0);
                  const linkLength = link.textContent?.length || 0;
                  if (typeof pos === 'number') {
                    editor.commands.setTextSelection({
                      from: pos,
                      to: pos + linkLength,
                    });
                  }
                } catch {
                  editor.commands.focus();
                }
              }

              // Open hyperlink editor in right toolbar
              onUpdateSettings({ showHyperLinkPane: true });
            }}
          >
            <EditorContent editor={editor} />
          </div>

          {/* Real-time Calibrated Page Break Guide Lines (Dotted Blue Line with Page end Label - Never Printed) */}
          {pageBreakLines.map((pageNum) => {
            const topPx = pageNum * pageBreakCalibratedHeight;
            return (
              <div
                key={`page-break-${pageNum}`}
                data-page-break-guide="true"
                className="page-break-guide-container absolute left-0 right-0 pointer-events-none no-print z-20 group"
                style={{ top: `${topPx}px` }}
              >
                {/* Horizontal dotted blue line spanning across the page */}
                <div
                  className="w-full border-b-[1.5px] border-dotted border-[#2563eb] dark:border-[#3b82f6] opacity-85 group-hover:opacity-100 transition-opacity"
                  style={{
                    borderBottomStyle: 'dotted',
                    borderBottomColor: '#2563eb',
                  }}
                />

                {/* Right side label: 'Page end {pageNum}' in blue + black tooltip bubble */}
                <div className="absolute right-4 -top-5 flex flex-col items-end pointer-events-auto select-none">
                  <span
                    className="text-[11px] font-semibold text-[#2563eb] dark:text-[#60a5fa] cursor-help tracking-tight px-1.5 py-0.5 rounded bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xs shadow-2xs"
                    title={`Page end ${pageNum} (Calibrated at ${topPx}px)`}
                  >
                    Page end {pageNum}
                  </span>
                  <div className="mt-1 px-2 py-0.5 bg-[#18181b] text-white text-[10px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Page end {pageNum}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Document Footer (Configured via Info & Setup) */}
          {settings.showHeaderFooter !== false && (settings.footerLeft || settings.footerRight || settings.footerShowPages) && (
            <div className="absolute bottom-5 left-10 right-10 flex items-center justify-between text-[11px] text-neutral-400/90 border-t border-neutral-200/60 pt-1 select-none pointer-events-none font-sans z-10">
              <span className="truncate max-w-[33%]">{settings.footerLeft || ''}</span>
              <span className="text-center font-medium">
                {formatSmartPageText({
                  showPages: settings.footerShowPages,
                  pageState: settings.footerPageStart !== 0 ? 1 : 0,
                  maxState: settings.footerPageTotal !== 0 ? 1 : 0,
                  separator: settings.footerPageSeparator,
                  currentPage: realCurrentPage,
                  totalPages: realTotalPages,
                })}
              </span>
              <span className="truncate max-w-[33%] text-right">{settings.footerRight || ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column NEdit4 / Word Right-Click Context Menu */}
      <EditorContextMenu
        editor={editor}
        isOpen={contextMenu.isOpen}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onOpenLinkModal={() => setShowLinkModal(true)}
      />

      {/* Insert Hyperlink Modal (Triggered from Context Menu) */}
      {showLinkModal && (
        <InsertLinkModal
          editor={editor}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {/* Floating Image Click Menu (Auto-appears when clicking an image, hides when clicking elsewhere) */}
      <ImageClickMenu
        editor={editor}
        onOpenImageWizard={() => onUpdateSettings({ showImageWizardPane: true })}
      />

      {/* Floating HyperLink Interaction & Mode Tooltip Overlay */}
      <HyperLinkOverlay
        editor={editor}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </main>
  );
};
