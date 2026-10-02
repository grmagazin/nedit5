import React, { useMemo, useState, useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { DocumentSettings } from '../types';
import { InteractiveRuler } from './InteractiveRuler';
import { EditorContextMenu } from './EditorContextMenu';
import { ImageClickMenu } from './ImageClickMenu';
import { HyperLinkOverlay } from './HyperLinkOverlay';
import { InsertLinkModal } from './InsertLinkModal';
import { Paintbrush } from 'lucide-react';
import { CopiedWordFormat, describeFormat } from '../utils/formatPainter';
import { calculateDocumentPages, formatSmartPageText } from '../utils/pageCalculator';

interface DocumentCanvasProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  formatPainter?: CopiedWordFormat | null;
  onApplyFormatPainter?: () => void;
  onCancelFormatPainter?: () => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  editor,
  settings,
  onUpdateSettings,
  formatPainter,
  onApplyFormatPainter,
  onCancelFormatPainter,
}) => {
  const isTwoPages = settings.layoutPages === 2;

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

  const twoPagesColumnGap = useMemo(() => {
    const pl = parseInt(marginPaddingStyle.paddingLeft || '96', 10);
    const pr = parseInt(marginPaddingStyle.paddingRight || '96', 10);
    return `${pl + pr + 10}px`;
  }, [marginPaddingStyle.paddingLeft, marginPaddingStyle.paddingRight]);

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

  const handleContextMenu = (e: React.MouseEvent) => {
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
      className={`flex-1 overflow-y-auto overflow-x-auto relative flex flex-col items-center py-6 px-4 transition-colors ${canvasBgClass}`}
      style={{
        backgroundImage: settings.showGridlines
          ? `linear-gradient(to right, ${canvasGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${canvasGridColor} 1px, transparent 1px)`
          : undefined,
        backgroundSize: settings.showGridlines ? '24px 24px' : undefined,
      }}
    >
      {/* Container scaling wrapper */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${Math.max(0, (scale - 1) * 800)}px`,
        }}
        className="flex flex-col items-center transition-transform duration-100 ease-out"
      >
        {/* Top Interactive Ruler (Hidden in 2 Pages mode, shown in 1 Page mode if checked in ruler checkbox, hidden in Focus Mode) */}
        {settings.showRuler && !settings.isFocusMode && !isTwoPages && (
          <div className="mb-1 rounded-t-xs overflow-hidden shadow-xs">
            <InteractiveRuler
              editor={editor}
              margins={settings.margins}
              customMargins={settings.customMargins}
              pageWidth={pageDimensions.width}
              zoom={settings.zoom}
              themeMode={effectiveThemeMode}
              onUpdateMargin={(margin) => onUpdateSettings({ margins: margin })}
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
          </div>
        )}

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

        {/* The Word Document Page Sheet */}
        <div
          id="word-document-page"
          data-hyperlink-mode={settings.hyperLinkMode || 'navigate'}
          className={`print-page transition-all duration-200 rounded-[2px] relative overflow-hidden ${pageBorderClass} ${shadowClass} ${
            isFullDark ? 'dark-page' : ''
          } ${isSepia ? 'sepia-page' : ''} ${
            settings.viewMode === 'read' ? 'cursor-default select-text' : ''
          } ${formatPainter ? 'format-painter-active' : ''}`}
          style={{
            ...marginPaddingStyle,
            width: isTwoPages ? `${pageDimensions.width * 2 + 10}px` : `${pageDimensions.width}px`,
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
          {/* 2-Pages Center 10px Space / Gap between pages */}
          {isTwoPages && (
            <>
              <style>{`
                #word-document-page .ProseMirror {
                  columns: 2 !important;
                  column-gap: ${twoPagesColumnGap} !important;
                  column-fill: auto;
                }
              `}</style>
              <div
                className="absolute inset-y-0 pointer-events-none select-none z-0"
                style={{
                  left: `${pageDimensions.width}px`,
                  width: '10px',
                  backgroundColor: canvasBgHex,
                  borderLeft: isFullDark ? '1px solid #383838' : '1px solid rgba(0,0,0,0.1)',
                  borderRight: isFullDark ? '1px solid #383838' : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: isFullDark || isCanvasDark
                    ? 'inset 2px 0 4px rgba(0,0,0,0.6), inset -2px 0 4px rgba(0,0,0,0.6)'
                    : 'inset 2px 0 4px rgba(0,0,0,0.06), inset -2px 0 4px rgba(0,0,0,0.06)',
                }}
              />
            </>
          )}

          {/* Watermark Overlay if active (Hidden in 2 Pages mode, shown in 1 Page mode) */}
          {settings.watermark && !isTwoPages && (
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

          {/* Document Header (Configured via Info & Setup - Hidden in 2 Pages mode, shown in 1 Page mode) */}
          {!isTwoPages && settings.showHeaderFooter !== false && (settings.headerLeft || settings.headerRight || settings.headerShowPages) && (
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
              isTwoPages
                ? '[&_.ProseMirror]:columns-2 [&_.ProseMirror]:gap-12'
                : settings.columns === 2
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

          {/* Document Footer (Configured via Info & Setup - Hidden in 2 Pages mode, shown in 1 Page mode) */}
          {!isTwoPages && settings.showHeaderFooter !== false && (settings.footerLeft || settings.footerRight || settings.footerShowPages) && (
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
