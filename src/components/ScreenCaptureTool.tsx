import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Check,
  Download,
  X,
  RotateCcw,
  Maximize2,
  Monitor,
  FileText,
  FolderOpen,
  Clipboard,
  FileDown,
  RotateCw,
} from 'lucide-react';
import { snapshotStore } from '../utils/snapshotStore';
import {
  captureDeviceScreenSnapshot,
  captureDocumentScreenSnapshot,
  loadImageFromFile,
  loadImageFromClipboard,
} from '../utils/screenSnapshot';

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
  onInsertToDocument?: (capturedDataUrl: string) => void;
  initialSource?: 'device_screen' | 'document_page' | 'photo_file' | 'clipboard';
}

export const ScreenCaptureTool: React.FC<ScreenCaptureToolProps> = ({
  isOpen,
  baseImageUrl: initialBaseImageUrl,
  onClose,
  onConfirmCapture,
  onInsertToDocument,
  initialSource = 'device_screen',
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(initialBaseImageUrl);
  const [activeSource, setActiveSource] = useState<'device_screen' | 'document_page' | 'photo_file' | 'clipboard'>(initialSource);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'create' | 'move' | string>('create');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<SelectionRect | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync image URL when prop changes
  useEffect(() => {
    if (initialBaseImageUrl) {
      setCurrentImageUrl(initialBaseImageUrl);
    }
  }, [initialBaseImageUrl]);

  // Reset selection when modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setSelection(null);
      setIsDragging(false);
      setStatusMessage(null);
    }
  }, [isOpen, currentImageUrl]);

  // Handle keyboard shortcuts (Escape to close, Enter to confirm, Ctrl+V to paste)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (selection && selection.width > 10 && selection.height > 10) {
          handleCropAndConfirm(selection, false);
        } else {
          handleCaptureFull(false);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        handlePasteFromClipboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selection, currentImageUrl]);

  // Helper to extract cropped image from the base image
  const getCroppedDataUrl = useCallback(
    (rect: SelectionRect): string | null => {
      if (!imgRef.current) return null;
      const img = imgRef.current;

      const displayWidth = img.clientWidth || img.offsetWidth;
      const displayHeight = img.clientHeight || img.offsetHeight;

      if (!displayWidth || !displayHeight) return null;

      const scaleX = img.naturalWidth / displayWidth;
      const scaleY = img.naturalHeight / displayHeight;

      const sx = Math.max(0, Math.round(rect.x * scaleX));
      const sy = Math.max(0, Math.round(rect.y * scaleY));
      const sw = Math.min(img.naturalWidth - sx, Math.round(rect.width * scaleX));
      const sh = Math.min(img.naturalHeight - sy, Math.round(rect.height * scaleY));

      if (sw <= 0 || sh <= 0) return null;

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      return canvas.toDataURL('image/png');
    },
    []
  );

  // Snip & Send to Image Wizard or Document
  const handleCropAndConfirm = useCallback(
    (rect: SelectionRect, insertDirectly = false) => {
      const croppedDataUrl = getCroppedDataUrl(rect);
      if (!croppedDataUrl) return;

      snapshotStore.setLatestSnapshot(croppedDataUrl, 'snip');

      if (insertDirectly && onInsertToDocument) {
        onInsertToDocument(croppedDataUrl);
      } else {
        onConfirmCapture(croppedDataUrl);
      }
    },
    [getCroppedDataUrl, onConfirmCapture, onInsertToDocument]
  );

  // Capture full image without cropping
  const handleCaptureFull = useCallback(
    (insertDirectly = false) => {
      snapshotStore.setLatestSnapshot(currentImageUrl, 'screen_capture');

      if (insertDirectly && onInsertToDocument) {
        onInsertToDocument(currentImageUrl);
      } else {
        onConfirmCapture(currentImageUrl);
      }
    },
    [currentImageUrl, onConfirmCapture, onInsertToDocument]
  );

  // Download selection or full image as PNG
  const handleDownload = useCallback(() => {
    let downloadUrl = currentImageUrl;
    if (selection && selection.width > 10 && selection.height > 10) {
      const cropped = getCroppedDataUrl(selection);
      if (cropped) downloadUrl = cropped;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentImageUrl, selection, getCroppedDataUrl]);

  // Recapture: Device Screen / Window / Browser Tab
  const handleRecaptureDeviceScreen = async () => {
    setIsCapturing(true);
    setStatusMessage('🖥️ Requesting Device Screen / Browser Tab / Window...');
    try {
      const result = await captureDeviceScreenSnapshot();
      if (result.success && result.dataUrl) {
        setCurrentImageUrl(result.dataUrl);
        setActiveSource('device_screen');
        setSelection(null);
        setStatusMessage('✅ Screen captured! Drag to select an area to snip.');
      } else if (result.error) {
        setStatusMessage(`⚠️ ${result.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ ${err?.message || 'Device screen capture failed'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Recapture: In-App Document Page
  const handleRecaptureDocPage = async () => {
    setIsCapturing(true);
    setStatusMessage('📄 Capturing document page snapshot...');
    try {
      const result = await captureDocumentScreenSnapshot({ pixelRatio: 1.5 });
      if (result.success && result.dataUrl) {
        setCurrentImageUrl(result.dataUrl);
        setActiveSource('document_page');
        setSelection(null);
        setStatusMessage('✅ Document page captured! Drag to select an area.');
      } else if (result.error) {
        setStatusMessage(`⚠️ ${result.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ ${err?.message || 'Document capture failed'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Recapture: Load Photo / Image file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    setStatusMessage('🖼️ Loading photo file...');
    try {
      const result = await loadImageFromFile(file);
      if (result.success && result.dataUrl) {
        setCurrentImageUrl(result.dataUrl);
        setActiveSource('photo_file');
        setSelection(null);
        setStatusMessage(`✅ Photo "${file.name}" loaded! Drag to snip an area.`);
      } else if (result.error) {
        setStatusMessage(`⚠️ ${result.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ ${err?.message || 'Failed to load photo'}`);
    } finally {
      setIsCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Recapture: Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    setIsCapturing(true);
    setStatusMessage('📋 Reading image from clipboard...');
    try {
      const result = await loadImageFromClipboard();
      if (result.success && result.dataUrl) {
        setCurrentImageUrl(result.dataUrl);
        setActiveSource('clipboard');
        setSelection(null);
        setStatusMessage('✅ Image from clipboard loaded! Drag to select an area.');
      } else if (result.error) {
        setStatusMessage(`⚠️ ${result.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`⚠️ ${err?.message || 'Failed to paste image'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Drag creation & manipulation logic
  const handleMouseDown = (e: React.MouseEvent, mode: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setIsDragging(true);
    setDragMode(mode);
    setDragStart({ x, y });

    if (mode === 'create') {
      setSelection({ x, y, width: 0, height: 0 });
      setInitialRect(null);
    } else if (selection) {
      setInitialRect({ ...selection });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    if (dragMode === 'create') {
      const left = Math.min(dragStart.x, currentX);
      const top = Math.min(dragStart.y, currentY);
      const width = Math.abs(currentX - dragStart.x);
      const height = Math.abs(currentY - dragStart.y);
      setSelection({ x: left, y: top, width, height });
    } else if (dragMode === 'move' && initialRect) {
      const dx = currentX - dragStart.x;
      const dy = currentY - dragStart.y;
      const newX = Math.max(0, Math.min(rect.width - initialRect.width, initialRect.x + dx));
      const newY = Math.max(0, Math.min(rect.height - initialRect.height, initialRect.y + dy));
      setSelection({ ...initialRect, x: newX, y: newY });
    } else if (initialRect) {
      let { x, y, width, height } = initialRect;
      const dx = currentX - dragStart.x;
      const dy = currentY - dragStart.y;

      if (dragMode.includes('e')) width = Math.max(10, Math.min(rect.width - x, initialRect.width + dx));
      if (dragMode.includes('s')) height = Math.max(10, Math.min(rect.height - y, initialRect.height + dy));
      if (dragMode.includes('w')) {
        const potentialWidth = initialRect.width - dx;
        if (potentialWidth >= 10 && initialRect.x + dx >= 0) {
          x = initialRect.x + dx;
          width = potentialWidth;
        }
      }
      if (dragMode.includes('n')) {
        const potentialHeight = initialRect.height - dy;
        if (potentialHeight >= 10 && initialRect.y + dy >= 0) {
          y = initialRect.y + dy;
          height = potentialHeight;
        }
      }
      setSelection({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (selection && (selection.width < 10 || selection.height < 10)) {
        setSelection(null);
      }
    }
  };

  if (!isOpen) return null;

  const imgWidth = imgRef.current?.clientWidth || 0;
  const imgHeight = imgRef.current?.clientHeight || 0;
  const hasValidSelection = !!(selection && selection.width > 12 && selection.height > 12);

  const toolContent = (
    <div
      id="screen-capture-tool-modal"
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xs flex flex-col items-center justify-between p-3 select-none overflow-hidden word-modal-backdrop"
      data-word-modal="true"
      data-screen-capture="true"
      style={{ position: 'fixed', zIndex: 99999 }}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-5xl bg-neutral-900/95 border border-neutral-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-white z-20 shrink-0">
        {/* Left: Branding & Capture Source Switcher */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#185abd] flex items-center justify-center text-white shadow-xs shrink-0">
            <Camera size={18} />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5 text-neutral-100">
              <span>Universal Screen Capture Tool</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                {activeSource === 'device_screen'
                  ? '🖥️ Device Screen / Tab'
                  : activeSource === 'document_page'
                  ? '📄 Doc Page'
                  : activeSource === 'photo_file'
                  ? '🖼️ Photo File'
                  : '📋 Clipboard'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Capture any place of your device screen (browser tab, photo, window) or document page
            </p>
          </div>
        </div>

        {/* Center: Recapture Source Buttons */}
        <div className="flex items-center space-x-1 bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-700">
          <button
            onClick={handleRecaptureDeviceScreen}
            disabled={isCapturing}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              activeSource === 'device_screen'
                ? 'bg-[#185abd] text-white shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
            title="Capture entire screen, application window, or web browser tab"
          >
            <Monitor size={12} />
            <span>Screen / Tab</span>
          </button>

          <button
            onClick={handleRecaptureDocPage}
            disabled={isCapturing}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              activeSource === 'document_page'
                ? 'bg-[#185abd] text-white shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
            title="Capture current document page sheet"
          >
            <FileText size={12} />
            <span>Doc Page</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCapturing}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              activeSource === 'photo_file'
                ? 'bg-[#185abd] text-white shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-700'
            }`}
            title="Open any local photo or image file to snip"
          >
            <FolderOpen size={12} />
            <span>Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={handlePasteFromClipboard}
            disabled={isCapturing}
            className="px-2 py-1 rounded text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Paste image from clipboard (Ctrl+V)"
          >
            <Clipboard size={12} />
            <span>Paste</span>
          </button>
        </div>

        {/* Right: Confirmation and Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Action 1: Insert Direct into Document */}
          {onInsertToDocument && (
            <button
              onClick={() => {
                if (hasValidSelection && selection) {
                  handleCropAndConfirm(selection, true);
                } else {
                  handleCaptureFull(true);
                }
              }}
              className="px-3 py-1.5 bg-[#185abd] hover:bg-[#134896] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Insert captured area directly into the document editor"
            >
              <FileDown size={14} />
              <span>{hasValidSelection ? 'Insert in Doc' : 'Insert Full'}</span>
            </button>
          )}

          {/* Action 2: Send to Image Wizard */}
          <button
            onClick={() => {
              if (hasValidSelection && selection) {
                handleCropAndConfirm(selection, false);
              } else {
                handleCaptureFull(false);
              }
            }}
            className="px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            title="Send area to Image Wizard for formatting, alt text, or compression"
          >
            <Check size={14} />
            <span>{hasValidSelection ? 'To Wizard' : 'Full to Wizard'}</span>
          </button>

          {/* Action 3: Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Download snippet or full screen as PNG"
          >
            <Download size={15} />
          </button>

          {selection && (
            <button
              onClick={() => setSelection(null)}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Reset area selection"
            >
              <RotateCcw size={15} />
            </button>
          )}

          <div className="w-px h-5 bg-neutral-700 mx-0.5" />

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Cancel & close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Status / Feedback notification bar if active */}
      {statusMessage && (
        <div className="w-full max-w-xl my-1 px-3 py-1 rounded-md bg-neutral-900/90 border border-neutral-700 text-neutral-200 text-xs text-center shadow-lg flex items-center justify-center gap-2">
          {isCapturing && <RotateCw size={12} className="animate-spin text-blue-400" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Interactive Snip Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full flex items-center justify-center my-2 relative overflow-hidden cursor-crosshair"
      >
        <div className="relative inline-block max-h-full max-w-full shadow-2xl rounded-sm border border-neutral-700/60 bg-neutral-950">
          <img
            ref={imgRef}
            src={currentImageUrl}
            alt="Screen capture preview"
            className="max-h-[75vh] max-w-[90vw] object-contain select-none pointer-events-none block"
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
                className="absolute left-0 top-0 right-0 bg-black/60 pointer-events-none z-10"
                style={{ height: `${selection.y}px` }}
              />
              {/* Bottom Scrim */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none z-10"
                style={{ height: `${Math.max(0, imgHeight - (selection.y + selection.height))}px` }}
              />
              {/* Left Scrim */}
              <div
                className="absolute left-0 bg-black/60 pointer-events-none z-10"
                style={{
                  top: `${selection.y}px`,
                  height: `${selection.height}px`,
                  width: `${selection.x}px`,
                }}
              />
              {/* Right Scrim */}
              <div
                className="absolute right-0 bg-black/60 pointer-events-none z-10"
                style={{
                  top: `${selection.y}px`,
                  height: `${selection.height}px`,
                  width: `${Math.max(0, imgWidth - (selection.x + selection.width))}px`,
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
                    {onInsertToDocument && (
                      <button
                        onClick={() => handleCropAndConfirm(selection, true)}
                        className="px-2 py-1 bg-[#185abd] hover:bg-[#134896] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        title="Insert cropped area directly into document editor"
                      >
                        <FileDown size={13} />
                        <span>Insert in Doc</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCropAndConfirm(selection, false)}
                      className="px-2 py-1 bg-[#059669] hover:bg-[#047857] text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Snip and send to Image Wizard"
                    >
                      <Check size={13} />
                      <span>To Wizard</span>
                    </button>
                    <button
                      onClick={handleDownload}
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
      <div className="text-center text-xs text-neutral-400 py-1 flex items-center justify-center gap-3">
        <span>💡 Drag a rectangle to snip any area</span>
        <span>•</span>
        <span>Press <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px]">Enter</kbd> to confirm</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px]">Ctrl+V</kbd> to paste photo</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px]">Esc</kbd> to exit</span>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(toolContent, document.body)
    : toolContent;
};

export default ScreenCaptureTool;
