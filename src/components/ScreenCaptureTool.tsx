import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Wand2,
  Check,
  Download,
  X,
  RotateCcw,
  Crop,
  Maximize2,
} from 'lucide-react';
import { snapshotStore } from '../utils/snapshotStore';

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenCaptureToolProps {
  isOpen: boolean;
  baseImageUrl: string;
  onClose: () => void;
  onConfirmCapture: (capturedDataUrl: string) => void;
}

export const ScreenCaptureTool: React.FC<ScreenCaptureToolProps> = ({
  isOpen,
  baseImageUrl,
  onClose,
  onConfirmCapture,
}) => {
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'create' | 'move' | string>('create');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<SelectionRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset selection when modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setSelection(null);
      setIsDragging(false);
    }
  }, [isOpen, baseImageUrl]);

  // Handle keyboard shortcuts (Escape to close, Enter to confirm selection)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (selection && selection.width > 10 && selection.height > 10) {
          handleCropAndConfirm(selection);
        } else {
          handleCaptureFull();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selection, baseImageUrl]);

  // Helper to extract cropped image from the base image
  const handleCropAndConfirm = useCallback(
    (rect: SelectionRect) => {
      if (!imgRef.current) return;
      const img = imgRef.current;

      const displayWidth = img.clientWidth || img.offsetWidth;
      const displayHeight = img.clientHeight || img.offsetHeight;

      if (!displayWidth || !displayHeight) return;

      const scaleX = img.naturalWidth / displayWidth;
      const scaleY = img.naturalHeight / displayHeight;

      const sx = Math.max(0, Math.round(rect.x * scaleX));
      const sy = Math.max(0, Math.round(rect.y * scaleY));
      const sw = Math.min(img.naturalWidth - sx, Math.round(rect.width * scaleX));
      const sh = Math.min(img.naturalHeight - sy, Math.round(rect.height * scaleY));

      if (sw <= 0 || sh <= 0) return;

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const croppedDataUrl = canvas.toDataURL('image/png');

      // Save to snapshotStore (in-memory, sessionStorage, and safe localStorage)
      snapshotStore.setLatestSnapshot(croppedDataUrl, 'snip');

      onConfirmCapture(croppedDataUrl);
    },
    [onConfirmCapture]
  );

  // Capture the full snapshot without cropping
  const handleCaptureFull = useCallback(() => {
    snapshotStore.setLatestSnapshot(baseImageUrl, 'screen_capture');
    onConfirmCapture(baseImageUrl);
  }, [baseImageUrl, onConfirmCapture]);

  // Download selection as PNG
  const handleDownloadSelection = useCallback(() => {
    if (!selection || !imgRef.current) return;
    const img = imgRef.current;
    const displayWidth = img.clientWidth || img.offsetWidth;
    const displayHeight = img.clientHeight || img.offsetHeight;
    if (!displayWidth || !displayHeight) return;

    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;
    const sx = Math.max(0, Math.round(selection.x * scaleX));
    const sy = Math.max(0, Math.round(selection.y * scaleY));
    const sw = Math.min(img.naturalWidth - sx, Math.round(selection.width * scaleX));
    const sh = Math.min(img.naturalHeight - sy, Math.round(selection.height * scaleY));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const croppedDataUrl = canvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = croppedDataUrl;
    a.download = `screen-snip-${Date.now()}.png`;
    a.click();
  }, [selection]);

  if (!isOpen) return null;

  // Convert client coordinates to image-relative coordinates
  const getImageCoords = (e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0, imgWidth: 0, imgHeight: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    return { x, y, imgWidth: rect.width, imgHeight: rect.height };
  };

  // Start drag interaction
  const handleMouseDown = (e: React.MouseEvent, mode: string = 'create') => {
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getImageCoords(e);
    setIsDragging(true);
    setDragMode(mode);
    setDragStart({ x, y });
    setInitialRect(selection);

    if (mode === 'create') {
      setSelection({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imgRef.current) return;
    const { x, y, imgWidth, imgHeight } = getImageCoords(e);

    if (dragMode === 'create') {
      const left = Math.min(dragStart.x, x);
      const top = Math.min(dragStart.y, y);
      const width = Math.abs(x - dragStart.x);
      const height = Math.abs(y - dragStart.y);
      setSelection({ x: left, y: top, width, height });
    } else if (dragMode === 'move' && initialRect) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const newX = Math.max(0, Math.min(imgWidth - initialRect.width, initialRect.x + dx));
      const newY = Math.max(0, Math.min(imgHeight - initialRect.height, initialRect.y + dy));
      setSelection({ ...initialRect, x: newX, y: newY });
    } else if (initialRect) {
      // Handle corner resizing (nw, ne, sw, se, n, s, e, w)
      let { x: rx, y: ry, width: rw, height: rh } = initialRect;
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (dragMode.includes('e')) rw = Math.max(10, initialRect.width + dx);
      if (dragMode.includes('s')) rh = Math.max(10, initialRect.height + dy);
      if (dragMode.includes('w')) {
        const proposedW = initialRect.width - dx;
        if (proposedW > 10) {
          rx = initialRect.x + dx;
          rw = proposedW;
        }
      }
      if (dragMode.includes('n')) {
        const proposedH = initialRect.height - dy;
        if (proposedH > 10) {
          ry = initialRect.y + dy;
          rh = proposedH;
        }
      }
      setSelection({ x: rx, y: ry, width: rw, height: rh });
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selection) {
      if (selection.width < 12 || selection.height < 12) {
        setSelection(null);
      }
    }
  };

  const imgWidth = imgRef.current?.clientWidth || 0;
  const imgHeight = imgRef.current?.clientHeight || 0;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex flex-col items-center justify-between p-4 select-none overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-4xl bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center justify-between text-white z-20 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#185abd] flex items-center justify-center text-white shadow-xs">
            <Camera size={18} />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5 text-neutral-100">
              <span>Lightweight Screen Capture Tool</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                Snipping Area
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Drag over the document to select an area to snip, or capture full page
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {selection && selection.width > 12 && selection.height > 12 ? (
            <button
              onClick={() => handleCropAndConfirm(selection)}
              className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Snip selected area and send to Image Wizard"
            >
              <Check size={14} />
              <span>Send Area to Image Wizard</span>
            </button>
          ) : (
            <button
              onClick={handleCaptureFull}
              className="px-3.5 py-1.5 bg-[#185abd] hover:bg-[#134896] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Send full snapshot to Image Wizard"
            >
              <Maximize2 size={14} />
              <span>Capture Full Page</span>
            </button>
          )}

          {selection && (
            <button
              onClick={() => setSelection(null)}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset area selection"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          <div className="w-px h-5 bg-neutral-700 mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Cancel & close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Interactive Snip Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center my-3 relative overflow-hidden cursor-crosshair"
      >
        <div className="relative inline-block max-h-full max-w-full shadow-2xl rounded-sm border border-neutral-700/60 bg-white">
          <img
            ref={imgRef}
            src={baseImageUrl}
            alt="Screen capture preview"
            className="max-h-[78vh] max-w-[90vw] object-contain select-none pointer-events-none block"
            draggable={false}
          />

          {/* Mouse interaction transparent surface */}
          <div
            className="absolute inset-0 z-10"
            onMouseDown={(e) => handleMouseDown(e, 'create')}
          />

          {/* Scrim Overlay Mask (Darkens unselected regions) */}
          {selection && imgWidth > 0 && imgHeight > 0 && (
            <>
              {/* Top Scrim */}
              <div
                className="absolute left-0 top-0 right-0 bg-black/55 pointer-events-none z-10"
                style={{ height: `${selection.y}px` }}
              />
              {/* Bottom Scrim */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-black/55 pointer-events-none z-10"
                style={{ height: `${imgHeight - (selection.y + selection.height)}px` }}
              />
              {/* Left Scrim */}
              <div
                className="absolute left-0 bg-black/55 pointer-events-none z-10"
                style={{
                  top: `${selection.y}px`,
                  height: `${selection.height}px`,
                  width: `${selection.x}px`,
                }}
              />
              {/* Right Scrim */}
              <div
                className="absolute right-0 bg-black/55 pointer-events-none z-10"
                style={{
                  top: `${selection.y}px`,
                  height: `${selection.height}px`,
                  width: `${imgWidth - (selection.x + selection.width)}px`,
                }}
              />

              {/* Active Selection Box */}
              <div
                className="absolute z-20 border-2 border-[#185abd] shadow-lg cursor-move"
                style={{
                  left: `${selection.x}px`,
                  top: `${selection.y}px`,
                  width: `${selection.width}px`,
                  height: `${selection.height}px`,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.7), inset 0 0 16px rgba(24,90,189,0.15)',
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Dimensions Label Tag */}
                <div className="absolute -top-6 left-0 bg-[#185abd] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                  {Math.round(selection.width)} × {Math.round(selection.height)} px
                </div>

                {/* 8 Resize Handles */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-nwse-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                />
                <div
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-ns-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-nesw-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                />
                <div
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-ew-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-nwse-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-ns-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-nesw-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                />
                <div
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#185abd] rounded-[2px] cursor-ew-resize shadow-xs"
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                />

                {/* Floating Context Toolbar Below Selection */}
                {selection.width >= 40 && selection.height >= 40 && !isDragging && (
                  <div
                    className="absolute -bottom-11 right-0 bg-white/95 backdrop-blur-xs text-neutral-800 border border-neutral-300 rounded-lg p-1 shadow-xl flex items-center gap-1.5 z-30"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleCropAndConfirm(selection)}
                      className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Snip and send directly to Image Wizard (Saved to local storage)"
                    >
                      <Check size={13} />
                      <span>Send to Image Wizard</span>
                    </button>
                    <button
                      onClick={handleDownloadSelection}
                      className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download snippet as PNG"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setSelection(null)}
                      className="p-1 hover:bg-neutral-100 text-neutral-500 rounded text-[11px] transition-colors cursor-pointer"
                      title="Clear selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Hint Footer */}
      <div className="text-center text-xs text-neutral-400 py-1">
        💡 Drag a rectangle to snip any area • Use corner handles to adjust • Press{' '}
        <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px]">
          Enter
        </kbd>{' '}
        to confirm or{' '}
        <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px]">
          Esc
        </kbd>{' '}
        to exit
      </div>
    </div>
  );
};
