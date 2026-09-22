import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageMargin, CustomMarginValues } from '../types';

interface InteractiveRulerProps {
  margins: PageMargin;
  customMargins?: CustomMarginValues;
  pageWidth: number; // in px, e.g. 816
  zoom?: number; // 100 is 1.0
  onUpdateMargin: (margin: PageMargin) => void;
  onUpdateCustomMargins: (custom: CustomMarginValues) => void;
  onUpdateIndent?: (indent: { firstLine?: number; left?: number }) => void;
}

type DragTarget = 'left-margin' | 'right-margin' | 'first-line-indent' | 'hanging-indent' | null;

const MARGIN_INCHES: Record<PageMargin, { left: number; right: number }> = {
  normal: { left: 1.0, right: 1.0 },
  narrow: { left: 0.5, right: 0.5 },
  moderate: { left: 0.75, right: 0.75 },
  wide: { left: 1.5, right: 1.5 },
  custom: { left: 1.0, right: 1.0 },
};

export const InteractiveRuler: React.FC<InteractiveRulerProps> = ({
  margins,
  customMargins,
  pageWidth,
  zoom = 100,
  onUpdateMargin,
  onUpdateCustomMargins,
  onUpdateIndent,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Determine current active margin in inches
  const currentLeft = customMargins?.left ?? MARGIN_INCHES[margins]?.left ?? 1.0;
  const currentRight = customMargins?.right ?? MARGIN_INCHES[margins]?.right ?? 1.0;
  const currentFirstLine = customMargins?.firstLineIndent ?? 0;
  const currentLeftIndent = customMargins?.leftIndent ?? 0;

  // 96 CSS pixels per inch (standard display DPI)
  const pxPerInch = 96;
  const totalInches = pageWidth / pxPerInch; // e.g. 8.5 for 816px

  // Drag state
  const [activeDrag, setActiveDrag] = useState<DragTarget>(null);
  const [dragInches, setDragInches] = useState<{
    left: number;
    right: number;
    firstLine: number;
    leftIndent: number;
  }>({
    left: currentLeft,
    right: currentRight,
    firstLine: currentFirstLine,
    leftIndent: currentLeftIndent,
  });

  const [tooltip, setTooltip] = useState<{ text: string; x: number } | null>(null);

  // Sync dragInches when props change and not actively dragging
  useEffect(() => {
    if (!activeDrag) {
      setDragInches({
        left: currentLeft,
        right: currentRight,
        firstLine: currentFirstLine,
        leftIndent: currentLeftIndent,
      });
    }
  }, [currentLeft, currentRight, currentFirstLine, currentLeftIndent, activeDrag]);

  const scale = zoom / 100;

  // Snap to 1/8" (0.125) helper
  const snapToEighth = (val: number) => {
    return Math.round(val * 8) / 8;
  };

  const handleStartDrag = (target: DragTarget, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveDrag(target);

    const startClientX = e.clientX;
    const initialLeft = dragInches.left;
    const initialRight = dragInches.right;
    const initialFirstLine = dragInches.firstLine;
    const initialLeftIndent = dragInches.leftIndent;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = (moveEvent.clientX - startClientX) / scale;
      const deltaInches = deltaPx / pxPerInch;

      if (target === 'left-margin') {
        let newLeft = Math.max(0.25, Math.min(totalInches - initialRight - 1.5, initialLeft + deltaInches));
        if (!moveEvent.shiftKey) newLeft = snapToEighth(newLeft);

        setDragInches((prev) => ({ ...prev, left: newLeft }));
        setTooltip({
          text: `Left Margin: ${newLeft.toFixed(2)}"`,
          x: newLeft * pxPerInch,
        });
      } else if (target === 'right-margin') {
        let newRight = Math.max(0.25, Math.min(totalInches - initialLeft - 1.5, initialRight - deltaInches));
        if (!moveEvent.shiftKey) newRight = snapToEighth(newRight);

        setDragInches((prev) => ({ ...prev, right: newRight }));
        setTooltip({
          text: `Right Margin: ${newRight.toFixed(2)}"`,
          x: pageWidth - newRight * pxPerInch,
        });
      } else if (target === 'first-line-indent') {
        let newFirstLine = Math.max(-1.0, Math.min(2.0, initialFirstLine + deltaInches));
        if (!moveEvent.shiftKey) newFirstLine = snapToEighth(newFirstLine);

        setDragInches((prev) => ({ ...prev, firstLine: newFirstLine }));
        setTooltip({
          text: `First Line Indent: ${newFirstLine > 0 ? '+' : ''}${newFirstLine.toFixed(2)}"`,
          x: (initialLeft + newFirstLine) * pxPerInch,
        });
      } else if (target === 'hanging-indent') {
        let newLeftIndent = Math.max(-0.5, Math.min(2.0, initialLeftIndent + deltaInches));
        if (!moveEvent.shiftKey) newLeftIndent = snapToEighth(newLeftIndent);

        setDragInches((prev) => ({ ...prev, leftIndent: newLeftIndent }));
        setTooltip({
          text: `Left Indent: ${newLeftIndent > 0 ? '+' : ''}${newLeftIndent.toFixed(2)}"`,
          x: (initialLeft + newLeftIndent) * pxPerInch,
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';

      setActiveDrag(null);
      setTooltip(null);

      // Commit changes to parent
      setDragInches((latest) => {
        onUpdateMargin('custom');
        onUpdateCustomMargins({
          left: latest.left,
          right: latest.right,
          firstLineIndent: latest.firstLine,
          leftIndent: latest.leftIndent,
        });
        if (onUpdateIndent) {
          onUpdateIndent({
            firstLine: latest.firstLine,
            left: latest.leftIndent,
          });
        }
        return latest;
      });
    };

    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const leftPx = dragInches.left * pxPerInch;
  const rightPx = dragInches.right * pxPerInch;
  const activeWidthPx = Math.max(50, pageWidth - leftPx - rightPx);

  // First line and hanging indent pixel offsets relative to left margin
  const firstLinePx = dragInches.firstLine * pxPerInch;
  const leftIndentPx = dragInches.leftIndent * pxPerInch;

  return (
    <div
      ref={rulerRef}
      className="h-6 bg-[#e2e8f0] border-b border-[#cbd5e1] flex items-center select-none no-print overflow-visible relative shadow-2xs"
      style={{ width: `${pageWidth}px` }}
    >
      {/* 1. Left Shaded Margin */}
      <div
        className="h-full bg-[#dbe2ea] border-r border-[#94a3b8] relative flex-shrink-0"
        style={{ width: `${leftPx}px` }}
      />

      {/* 2. Active Printable Document Area (White Background) */}
      <div
        className="h-full bg-white relative flex items-center flex-shrink-0"
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
              <span className="text-[9px] font-sans font-semibold text-neutral-600 -translate-x-1/2 mb-0.5 select-none leading-none">
                {i}
              </span>

              {/* Major Inch Tick */}
              <div className="w-px h-2.5 bg-neutral-400" />

              {/* 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8 Sub-Ticks */}
              <div
                className="absolute w-px h-1 bg-neutral-300 top-3.5"
                style={{ left: `${pxPerInch * 0.125}px` }}
              />
              <div
                className="absolute w-px h-1.5 bg-neutral-400 top-3"
                style={{ left: `${pxPerInch * 0.25}px` }}
              />
              <div
                className="absolute w-px h-1 bg-neutral-300 top-3.5"
                style={{ left: `${pxPerInch * 0.375}px` }}
              />
              <div
                className="absolute w-px h-2 bg-neutral-500 top-2.5"
                style={{ left: `${pxPerInch * 0.5}px` }}
              />
              <div
                className="absolute w-px h-1 bg-neutral-300 top-3.5"
                style={{ left: `${pxPerInch * 0.625}px` }}
              />
              <div
                className="absolute w-px h-1.5 bg-neutral-400 top-3"
                style={{ left: `${pxPerInch * 0.75}px` }}
              />
              <div
                className="absolute w-px h-1 bg-neutral-300 top-3.5"
                style={{ left: `${pxPerInch * 0.875}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* 3. Right Shaded Margin */}
      <div
        className="h-full bg-[#dbe2ea] border-l border-[#94a3b8] relative flex-shrink-0"
        style={{ width: `${rightPx}px` }}
      />

      {/* ========================================================= */}
      {/* INTERACTIVE MARKERS (Blue triangles matching photo)      */}
      {/* ========================================================= */}

      {/* LEFT MARGIN & INDENT MARKERS */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-auto"
        style={{ left: `${leftPx}px` }}
      >
        {/* Top Marker: First Line Indent (Blue Triangle Pointing Down) */}
        <div
          onMouseDown={(e) => handleStartDrag('first-line-indent', e)}
          className="absolute top-0 -translate-x-1/2 cursor-ew-resize p-0.5 hover:scale-125 transition-transform"
          style={{ left: `${firstLinePx}px` }}
          title={`First Line Indent: ${dragInches.firstLine.toFixed(2)}"`}
        >
          <div className="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-t-[6px] border-t-[#185abd] drop-shadow-xs" />
        </div>

        {/* Bottom Marker: Hanging / Left Indent (Blue Triangle Pointing Up + Box) */}
        <div
          onMouseDown={(e) => handleStartDrag('hanging-indent', e)}
          className="absolute bottom-0 -translate-x-1/2 cursor-ew-resize p-0.5 hover:scale-125 transition-transform"
          style={{ left: `${leftIndentPx}px` }}
          title={`Left Indent: ${dragInches.leftIndent.toFixed(2)}"`}
        >
          <div className="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-b-[6px] border-b-[#185abd] drop-shadow-xs" />
          <div className="w-[7px] h-[3px] bg-[#185abd] mx-auto mt-[0.5px] rounded-[0.5px]" />
        </div>

        {/* Left Margin Boundary Handle (Drags entire left margin) */}
        <div
          onMouseDown={(e) => handleStartDrag('left-margin', e)}
          className="absolute top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-ew-resize hover:bg-[#185abd]/15 transition-colors"
          title={`Left Margin: ${dragInches.left.toFixed(2)}"`}
        />
      </div>

      {/* RIGHT MARGIN MARKER */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-auto"
        style={{ left: `${pageWidth - rightPx}px` }}
      >
        {/* Right Margin Marker: Blue Triangle Pointing Up */}
        <div
          onMouseDown={(e) => handleStartDrag('right-margin', e)}
          className="absolute bottom-0 -translate-x-1/2 cursor-ew-resize p-0.5 hover:scale-125 transition-transform"
          title={`Right Margin: ${dragInches.right.toFixed(2)}"`}
        >
          <div className="w-0 h-0 border-l-[4.5px] border-l-transparent border-r-[4.5px] border-r-transparent border-b-[6px] border-b-[#185abd] drop-shadow-xs" />
          <div className="w-[7px] h-[3px] bg-[#185abd] mx-auto mt-[0.5px] rounded-[0.5px]" />
        </div>

        {/* Right Margin Boundary Handle */}
        <div
          onMouseDown={(e) => handleStartDrag('right-margin', e)}
          className="absolute top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-ew-resize hover:bg-[#185abd]/15 transition-colors"
          title={`Right Margin: ${dragInches.right.toFixed(2)}"`}
        />
      </div>

      {/* ========================================================= */}
      {/* ACTIVE DRAG GUIDELINES & TOOLTIP (Like MS Word)          */}
      {/* ========================================================= */}
      {activeDrag && (
        <>
          {/* Vertical dashed guideline that extends down through the document */}
          <div
            className="absolute top-6 w-0 border-l-2 border-dashed border-[#185abd] z-50 pointer-events-none opacity-80"
            style={{
              left:
                activeDrag === 'left-margin'
                  ? `${leftPx}px`
                  : activeDrag === 'right-margin'
                  ? `${pageWidth - rightPx}px`
                  : activeDrag === 'first-line-indent'
                  ? `${leftPx + firstLinePx}px`
                  : `${leftPx + leftIndentPx}px`,
              height: '1200px',
            }}
          />

          {/* Floating Tooltip displaying exact inches */}
          {tooltip && (
            <div
              className="absolute -top-7 px-2 py-0.5 bg-[#1e295d] text-white text-[11px] font-bold rounded shadow-md pointer-events-none -translate-x-1/2 z-50 whitespace-nowrap"
              style={{ left: `${tooltip.x}px` }}
            >
              {tooltip.text}
            </div>
          )}
        </>
      )}
    </div>
  );
};
