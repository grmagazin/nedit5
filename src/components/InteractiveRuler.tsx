import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { PageMargin, CustomMarginValues, ThemeMode } from '../types';

interface InteractiveRulerProps {
  editor?: Editor | null;
  margins: PageMargin;
  customMargins?: CustomMarginValues;
  pageWidth: number; // in px, e.g. 816
  zoom?: number; // 100 is 1.0
  onUpdateMargin: (margin: PageMargin) => void;
  onUpdateCustomMargins: (custom: CustomMarginValues) => void;
  onUpdateIndent?: (indent: { firstLine?: number; left?: number }) => void;
  themeMode?: ThemeMode;
  onToggleNavigation?: () => void;
  onToggleFormatter?: () => void;
  isNavigationOpen?: boolean;
  isFormatterOpen?: boolean;
}

type DragTarget =
  | 'left-margin'
  | 'right-margin'
  | 'paragraph-left-indent'
  | 'paragraph-right-indent'
  | null;

const MARGIN_INCHES: Record<PageMargin, { left: number; right: number }> = {
  normal: { left: 1.0, right: 1.0 },
  narrow: { left: 0.5, right: 0.5 },
  moderate: { left: 0.75, right: 0.75 },
  wide: { left: 1.5, right: 1.5 },
  custom: { left: 1.0, right: 1.0 },
};

// 96 CSS pixels per inch (standard display DPI)
const pxPerInch = 96;

function parseIndentPx(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return 0;
  if (str.endsWith('in')) {
    const inches = parseFloat(str);
    return isNaN(inches) ? 0 : Math.round(inches * pxPerInch);
  }
  if (str.endsWith('pt')) {
    const pt = parseFloat(str);
    return isNaN(pt) ? 0 : Math.round((pt * 96) / 72);
  }
  if (str.endsWith('cm')) {
    const cm = parseFloat(str);
    return isNaN(cm) ? 0 : Math.round((cm * 96) / 2.54);
  }
  const px = parseFloat(str);
  return isNaN(px) ? 0 : Math.round(px);
}

export const InteractiveRuler: React.FC<InteractiveRulerProps> = ({
  editor,
  margins,
  customMargins,
  pageWidth,
  zoom = 100,
  onUpdateMargin,
  onUpdateCustomMargins,
  onUpdateIndent,
  themeMode = 'light',
  onToggleNavigation,
  onToggleFormatter,
  isNavigationOpen = false,
  isFormatterOpen = false,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  const isFullDark = themeMode === 'fullDark';
  const isCanvasDark = themeMode === 'canvasDark';
  const isSepia = themeMode === 'sepia';

  const rulerBgClass = isFullDark
    ? 'bg-[#1e1e1e] border-b border-[#333333]'
    : isCanvasDark
    ? 'bg-[#222222] border-b border-[#333333]'
    : isSepia
    ? 'bg-[#ddd3c1] border-b border-[#c8bba6]'
    : 'bg-[#e2e8f0] border-b border-[#cbd5e1]';

  const marginShadeClass = isFullDark
    ? 'bg-[#181818] border-[#383838]'
    : isCanvasDark
    ? 'bg-[#181818] border-[#383838]'
    : isSepia
    ? 'bg-[#d8cbb5] border-[#beae95]'
    : 'bg-[#dbe2ea] border-[#94a3b8]';

  const activeAreaBgClass = isFullDark
    ? 'bg-[#2b2b2b]'
    : isCanvasDark
    ? 'bg-white'
    : isSepia
    ? 'bg-[#fbf8ee]'
    : 'bg-white';

  const numberColorClass = isFullDark
    ? 'text-neutral-400'
    : isCanvasDark
    ? 'text-neutral-700'
    : isSepia
    ? 'text-[#5c4a39]'
    : 'text-neutral-600';

  const majorTickClass = isFullDark
    ? 'bg-neutral-500'
    : isCanvasDark
    ? 'bg-neutral-400'
    : isSepia
    ? 'bg-[#998772]'
    : 'bg-neutral-400';

  const subTickClass = isFullDark
    ? 'bg-neutral-600'
    : isCanvasDark
    ? 'bg-neutral-300'
    : isSepia
    ? 'bg-[#c2b29c]'
    : 'bg-neutral-300';

  // Determine current active page margin in inches
  const currentLeftMargin =
    margins === 'custom' && customMargins?.left != null
      ? customMargins.left
      : MARGIN_INCHES[margins]?.left ?? 1.0;
  const currentRightMargin =
    margins === 'custom' && customMargins?.right != null
      ? customMargins.right
      : MARGIN_INCHES[margins]?.right ?? 1.0;

  const totalInches = pageWidth / pxPerInch; // e.g. 8.5 for 816px

  // Drag state for page margins
  const [activeDrag, setActiveDrag] = useState<DragTarget>(null);
  const [dragMarginInches, setDragMarginInches] = useState<{
    left: number;
    right: number;
  }>({
    left: currentLeftMargin,
    right: currentRightMargin,
  });

  // Paragraph-specific indents in pixels (reads/writes active paragraph in Tiptap)
  const [paragraphLeftIndentPx, setParagraphLeftIndentPx] = useState<number>(0);
  const [paragraphRightIndentPx, setParagraphRightIndentPx] = useState<number>(0);
  const isDraggingIndentRef = useRef(false);

  // Temporary ruler memo lines (visual guides only, not saved anywhere, reset on reload)
  const [memoLeftIndentPx, setMemoLeftIndentPx] = useState<number | null>(null);
  const [memoRightIndentPx, setMemoRightIndentPx] = useState<number | null>(null);

  const [tooltip, setTooltip] = useState<{ text: string; x: number } | null>(null);

  // Sync dragMarginInches when margins prop changes and not dragging margins
  useEffect(() => {
    if (activeDrag !== 'left-margin' && activeDrag !== 'right-margin') {
      setDragMarginInches({
        left: currentLeftMargin,
        right: currentRightMargin,
      });
    }
  }, [currentLeftMargin, currentRightMargin, activeDrag]);

  // Synchronize paragraph indents from active cursor/selection in Tiptap
  const updateParagraphIndentsFromEditor = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const { $from } = editor.state.selection;
    let pLeft = 0;
    let pRight = 0;

    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (['paragraph', 'heading', 'blockquote'].includes(node.type.name)) {
        if (node.attrs.indent) {
          pLeft = parseIndentPx(node.attrs.indent);
        }
        if (node.attrs.rightIndent) {
          pRight = parseIndentPx(node.attrs.rightIndent);
        }
        break;
      }
    }

    setParagraphLeftIndentPx(pLeft);
    setParagraphRightIndentPx(pRight);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    updateParagraphIndentsFromEditor();

    const handleEditorChange = () => {
      if (!isDraggingIndentRef.current) {
        updateParagraphIndentsFromEditor();
      }
    };

    editor.on('selectionUpdate', handleEditorChange);
    editor.on('transaction', handleEditorChange);

    return () => {
      editor.off('selectionUpdate', handleEditorChange);
      editor.off('transaction', handleEditorChange);
    };
  }, [editor, updateParagraphIndentsFromEditor]);

  const scale = zoom / 100;

  // Snap to 1/8" (0.125" = 12px) helper
  const snapToEighthInches = (val: number) => {
    return Math.round(val * 8) / 8;
  };

  const snapToEighthPx = (val: number) => {
    return Math.round(val / 12) * 12;
  };

  const handleStartDrag = (target: DragTarget, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDrag(target);

    const startClientX = e.clientX;
    const initialMarginLeftInches = dragMarginInches.left;
    const initialMarginRightInches = dragMarginInches.right;
    const initialParaLeftPx = paragraphLeftIndentPx;
    const initialParaRightPx = paragraphRightIndentPx;
    let latestParaLeftPx = initialParaLeftPx;
    let latestParaRightPx = initialParaRightPx;
    let hasMovedIndent = false;

    if (target === 'paragraph-left-indent' || target === 'paragraph-right-indent') {
      isDraggingIndentRef.current = true;
    }

    const currentLeftPx = initialMarginLeftInches * pxPerInch;
    const currentRightPx = initialMarginRightInches * pxPerInch;
    const printableWidthPx = Math.max(100, pageWidth - currentLeftPx - currentRightPx);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = (moveEvent.clientX - startClientX) / scale;
      const deltaInches = deltaPx / pxPerInch;

      if (target === 'left-margin') {
        let newLeft = Math.max(
          0.25,
          Math.min(totalInches - initialMarginRightInches - 1.5, initialMarginLeftInches + deltaInches)
        );
        if (!moveEvent.shiftKey) newLeft = snapToEighthInches(newLeft);

        setDragMarginInches((prev) => ({ ...prev, left: newLeft }));
        setTooltip({
          text: `Left Margin: ${newLeft.toFixed(2)}"`,
          x: newLeft * pxPerInch,
        });
      } else if (target === 'right-margin') {
        let newRight = Math.max(
          0.25,
          Math.min(totalInches - initialMarginLeftInches - 1.5, initialMarginRightInches - deltaInches)
        );
        if (!moveEvent.shiftKey) newRight = snapToEighthInches(newRight);

        setDragMarginInches((prev) => ({ ...prev, right: newRight }));
        setTooltip({
          text: `Right Margin: ${newRight.toFixed(2)}"`,
          x: pageWidth - newRight * pxPerInch,
        });
      } else if (target === 'paragraph-left-indent') {
        let newLeftPx = Math.max(0, initialParaLeftPx + deltaPx);
        if (!moveEvent.shiftKey) {
          newLeftPx = snapToEighthPx(newLeftPx);
        }
        // Limit to available width
        const maxLeftPx = Math.max(0, printableWidthPx - initialParaRightPx - 36);
        newLeftPx = Math.min(newLeftPx, maxLeftPx);

        latestParaLeftPx = newLeftPx;
        hasMovedIndent = true;

        setParagraphLeftIndentPx(newLeftPx);

        // Apply immediately to the active paragraph in Tiptap
        if (editor && !editor.isDestroyed) {
          editor.commands.setParagraphIndent(newLeftPx > 0 ? `${newLeftPx}px` : '');
        }

        setTooltip({
          text: `Paragraph Left Indent: ${(newLeftPx / pxPerInch).toFixed(2)}"`,
          x: currentLeftPx + newLeftPx,
        });
      } else if (target === 'paragraph-right-indent') {
        // Dragging to the left increases right indent
        let newRightPx = Math.max(0, initialParaRightPx - deltaPx);
        if (!moveEvent.shiftKey) {
          newRightPx = snapToEighthPx(newRightPx);
        }
        // Limit to available width
        const maxRightPx = Math.max(0, printableWidthPx - initialParaLeftPx - 36);
        newRightPx = Math.min(newRightPx, maxRightPx);

        latestParaRightPx = newRightPx;
        hasMovedIndent = true;

        setParagraphRightIndentPx(newRightPx);

        // Apply immediately to the active paragraph in Tiptap
        if (editor && !editor.isDestroyed) {
          editor.commands.setParagraphRightIndent(newRightPx > 0 ? `${newRightPx}px` : '');
        }

        setTooltip({
          text: `Paragraph Right Indent: ${(newRightPx / pxPerInch).toFixed(2)}"`,
          x: pageWidth - currentRightPx - newRightPx,
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';

      setActiveDrag(null);
      setTooltip(null);

      if (target === 'paragraph-left-indent' || target === 'paragraph-right-indent') {
        setTimeout(() => {
          isDraggingIndentRef.current = false;
        }, 50);

        // Activate / update temporary ruler memo line on Mouse Up
        if (target === 'paragraph-left-indent' && hasMovedIndent) {
          setMemoLeftIndentPx(latestParaLeftPx);
        } else if (target === 'paragraph-right-indent' && hasMovedIndent) {
          setMemoRightIndentPx(latestParaRightPx);
        }
      }

      // Commit page margin changes if a page margin was dragged
      if (target === 'left-margin' || target === 'right-margin') {
        setDragMarginInches((latest) => {
          onUpdateMargin('custom');
          onUpdateCustomMargins({
            left: latest.left,
            right: latest.right,
          });
          return latest;
        });
      }
    };

    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const leftMarginPx = dragMarginInches.left * pxPerInch;
  const rightMarginPx = dragMarginInches.right * pxPerInch;
  const activeWidthPx = Math.max(50, pageWidth - leftMarginPx - rightMarginPx);

  return (
    <div
      ref={rulerRef}
      className={`h-6 ${rulerBgClass} flex items-center select-none no-print overflow-visible relative shadow-2xs`}
      style={{ width: `${pageWidth}px` }}
    >
      {/* Left 1px vertical purple line: Click to open/close Left NAVIGATION TOOLBAR */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleNavigation?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onToggleNavigation?.();
          }
        }}
        className="absolute left-0 top-0 bottom-0 w-2.5 z-40 cursor-pointer flex items-center justify-start group focus:outline-none select-none"
        title="Left Navigation Toolbar (Click to open/close)"
        aria-label="Toggle Left Navigation Toolbar"
      >
        <div
          className={`w-[1px] h-full transition-all duration-150 ${
            isNavigationOpen
              ? 'bg-[#9333ea] shadow-[0_0_4px_#9333ea]'
              : 'bg-[#a855f7] group-hover:bg-[#7e22ce] group-hover:w-[2px] group-hover:shadow-[0_0_3px_#a855f7]'
          }`}
        />
      </div>

      {/* 1. Left Shaded Margin */}
      <div
        className={`h-full ${marginShadeClass} border-r relative flex-shrink-0`}
        style={{ width: `${leftMarginPx}px` }}
      />

      {/* 2. Active Printable Document Area */}
      <div
        className={`h-full ${activeAreaBgClass} relative flex items-center flex-shrink-0`}
        style={{ width: `${activeWidthPx}px` }}
      >
        {/* Render Inch numbers and tick marks starting at 0 from the left margin */}
        {Array.from({ length: Math.ceil(totalInches) + 1 }).map((_, i) => {
          const tickPos = i * pxPerInch;
          if (tickPos > activeWidthPx + 4) return null;

          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
              style={{ left: `${tickPos}px` }}
            >
              {/* Number Label */}
              <span
                className={`text-[9px] font-sans font-semibold ${numberColorClass} -translate-x-1/2 mb-0.5 select-none leading-none`}
              >
                {i}
              </span>

              {/* Major Inch Tick */}
              <div className={`w-px h-2.5 ${majorTickClass}`} />

              {/* 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8 Sub-Ticks */}
              <div
                className={`absolute w-px h-1 ${subTickClass} top-3.5`}
                style={{ left: `${pxPerInch * 0.125}px` }}
              />
              <div
                className={`absolute w-px h-1.5 ${majorTickClass} top-3`}
                style={{ left: `${pxPerInch * 0.25}px` }}
              />
              <div
                className={`absolute w-px h-1 ${subTickClass} top-3.5`}
                style={{ left: `${pxPerInch * 0.375}px` }}
              />
              <div
                className={`absolute w-px h-2 ${majorTickClass} top-2.5`}
                style={{ left: `${pxPerInch * 0.5}px` }}
              />
              <div
                className={`absolute w-px h-1 ${subTickClass} top-3.5`}
                style={{ left: `${pxPerInch * 0.625}px` }}
              />
              <div
                className={`absolute w-px h-1.5 ${majorTickClass} top-3`}
                style={{ left: `${pxPerInch * 0.75}px` }}
              />
              <div
                className={`absolute w-px h-1 ${subTickClass} top-3.5`}
                style={{ left: `${pxPerInch * 0.875}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* 3. Right Shaded Margin */}
      <div
        className={`h-full ${marginShadeClass} border-l relative flex-shrink-0`}
        style={{ width: `${rightMarginPx}px` }}
      />

      {/* Right 1px vertical purple line: Click to open/close right toolbar ULTIMATE FORMATTER */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFormatter?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onToggleFormatter?.();
          }
        }}
        className="absolute right-0 top-0 bottom-0 w-2.5 z-40 cursor-pointer flex items-center justify-end group focus:outline-none select-none"
        title="Ultimate Formatter (Click to open/close)"
        aria-label="Toggle Ultimate Formatter"
      >
        <div
          className={`w-[1px] h-full transition-all duration-150 ${
            isFormatterOpen
              ? 'bg-[#9333ea] shadow-[0_0_4px_#9333ea]'
              : 'bg-[#a855f7] group-hover:bg-[#7e22ce] group-hover:w-[2px] group-hover:shadow-[0_0_3px_#a855f7]'
          }`}
        />
      </div>

      {/* ========================================================= */}
      {/* 4. LEFT PAGE MARGIN BOUNDARY DRAG HANDLE                 */}
      {/* ========================================================= */}
      <div
        onMouseDown={(e) => handleStartDrag('left-margin', e)}
        className="absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize hover:bg-[#185abd]/20 transition-colors z-20 group"
        style={{ left: `${leftMarginPx}px` }}
        title={`Left Page Margin: ${dragMarginInches.left.toFixed(2)}"`}
      >
        <div className="w-[1.5px] h-full bg-neutral-400/80 group-hover:bg-[#185abd] mx-auto transition-colors" />
      </div>

      {/* ========================================================= */}
      {/* 5. RIGHT PAGE MARGIN BOUNDARY DRAG HANDLE                */}
      {/* ========================================================= */}
      <div
        onMouseDown={(e) => handleStartDrag('right-margin', e)}
        className="absolute top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize hover:bg-[#185abd]/20 transition-colors z-20 group"
        style={{ left: `${pageWidth - rightMarginPx}px` }}
        title={`Right Page Margin: ${dragMarginInches.right.toFixed(2)}"`}
      >
        <div className="w-[1.5px] h-full bg-neutral-400/80 group-hover:bg-[#185abd] mx-auto transition-colors" />
      </div>

      {/* ========================================================= */}
      {/* 5B. TEMPORARY RULER MEMO LINES (Optical visual effect)   */}
      {/* ========================================================= */}
      {/* LEFT memo line = last LEFT paragraph indent position */}
      {memoLeftIndentPx !== null && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none select-none z-20 -translate-x-1/2 flex flex-col items-center justify-between"
          style={{ left: `${leftMarginPx + memoLeftIndentPx}px` }}
          aria-hidden="true"
        >
          <div
            className={`w-[5px] h-[2px] rounded-[0.5px] ${
              isFullDark || isCanvasDark
                ? 'bg-sky-400/90'
                : isSepia
                ? 'bg-[#b45309]/90'
                : 'bg-[#0284c7]/90'
            }`}
          />
          <div
            className={`w-0 h-full border-l border-dashed ${
              isFullDark || isCanvasDark
                ? 'border-sky-400/75'
                : isSepia
                ? 'border-[#b45309]/75'
                : 'border-[#0284c7]/75'
            }`}
          />
          <div
            className={`w-[5px] h-[2px] rounded-[0.5px] ${
              isFullDark || isCanvasDark
                ? 'bg-sky-400/90'
                : isSepia
                ? 'bg-[#b45309]/90'
                : 'bg-[#0284c7]/90'
            }`}
          />
        </div>
      )}

      {/* RIGHT memo line = last RIGHT paragraph indent position */}
      {memoRightIndentPx !== null && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none select-none z-20 -translate-x-1/2 flex flex-col items-center justify-between"
          style={{ left: `${pageWidth - rightMarginPx - memoRightIndentPx}px` }}
          aria-hidden="true"
        >
          <div
            className={`w-[5px] h-[2px] rounded-[0.5px] ${
              isFullDark || isCanvasDark
                ? 'bg-sky-400/90'
                : isSepia
                ? 'bg-[#b45309]/90'
                : 'bg-[#0284c7]/90'
            }`}
          />
          <div
            className={`w-0 h-full border-l border-dashed ${
              isFullDark || isCanvasDark
                ? 'border-sky-400/75'
                : isSepia
                ? 'border-[#b45309]/75'
                : 'border-[#0284c7]/75'
            }`}
          />
          <div
            className={`w-[5px] h-[2px] rounded-[0.5px] ${
              isFullDark || isCanvasDark
                ? 'bg-sky-400/90'
                : isSepia
                ? 'bg-[#b45309]/90'
                : 'bg-[#0284c7]/90'
            }`}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. PARAGRAPH LEFT INDENT HANDLER (Blue Indent Marker)    */}
      {/* ========================================================= */}
      <div
        onMouseDown={(e) => handleStartDrag('paragraph-left-indent', e)}
        className="absolute top-0 bottom-0 z-30 cursor-ew-resize -translate-x-1/2 flex flex-col justify-between items-center py-[0.5px] px-1 group select-none"
        style={{ left: `${leftMarginPx + paragraphLeftIndentPx}px` }}
        title={`Paragraph Left Indent: ${(paragraphLeftIndentPx / pxPerInch).toFixed(2)}"`}
      >
        {/* Top Downward Triangle */}
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5.5px] border-t-[#185abd] drop-shadow-xs group-hover:scale-125 transition-transform" />

        {/* Center Connecting Spine */}
        <div className="w-[1.5px] flex-1 bg-[#185abd]/70 group-hover:bg-[#185abd]" />

        {/* Bottom Upward Triangle with Rectangular Base */}
        <div className="flex flex-col items-center group-hover:scale-125 transition-transform">
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5.5px] border-b-[#185abd] drop-shadow-xs" />
          <div className="w-[8px] h-[3px] bg-[#185abd] rounded-[0.5px] drop-shadow-xs mt-[0.5px]" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. PARAGRAPH RIGHT INDENT HANDLER (Blue Marker)          */}
      {/* ========================================================= */}
      <div
        onMouseDown={(e) => handleStartDrag('paragraph-right-indent', e)}
        className="absolute bottom-0 z-30 cursor-ew-resize -translate-x-1/2 flex flex-col items-center pb-[0.5px] px-1 group select-none"
        style={{ left: `${pageWidth - rightMarginPx - paragraphRightIndentPx}px` }}
        title={`Paragraph Right Indent: ${(paragraphRightIndentPx / pxPerInch).toFixed(2)}"`}
      >
        <div className="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-b-[6px] border-b-[#185abd] drop-shadow-xs group-hover:scale-125 transition-transform" />
        <div className="w-[8px] h-[3px] bg-[#185abd] rounded-[0.5px] drop-shadow-xs mt-[0.5px] group-hover:scale-125 transition-transform" />
      </div>

      {/* ========================================================= */}
      {/* 8. FLOATING TOOLTIP WHILE DRAGGING (No intrusive lines)  */}
      {/* ========================================================= */}
      {tooltip && (
        <div
          className="absolute -top-7 px-2 py-0.5 bg-[#1e295d] text-white text-[11px] font-bold rounded shadow-md pointer-events-none -translate-x-1/2 z-50 whitespace-nowrap"
          style={{ left: `${tooltip.x}px` }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};
