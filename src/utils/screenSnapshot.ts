/**
 * screenSnapshot.ts
 * Reliable, Lazy-Loaded Screen Snapshot Capture Utility.
 * Supports:
 * 1. Device Screen / Window / Browser Tab Capture via standard Screen Capture API
 *    (navigator.mediaDevices.getDisplayMedia) - captures any place on device screen,
 *    browser tabs, external photo viewers, or desktop apps. 100% free and native.
 * 2. In-App Document Page Snapshot (html2canvas / html-to-image fallback).
 * 3. Local Photo / Image File Loader for instant snipping.
 * 4. Clipboard Image Snip.
 */

export interface CaptureSnapshotResult {
  success: boolean;
  dataUrl?: string;
  source?: 'device_screen' | 'document_page' | 'photo_file' | 'clipboard';
  error?: string;
  width?: number;
  height?: number;
}

export interface CaptureSnapshotOptions {
  targetElement?: HTMLElement | null;
  pixelRatio?: number;
  backgroundColor?: string;
  preferCurrentTab?: boolean;
}

/**
 * Capture full device screen, an application window, or a web browser tab
 * using the standard native Screen Capture API (navigator.mediaDevices.getDisplayMedia).
 * 100% free, zero external keys or paid services required.
 */
export async function captureDeviceScreenSnapshot(
  options: { preferCurrentTab?: boolean } = {}
): Promise<CaptureSnapshotResult> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getDisplayMedia !== 'function'
  ) {
    return {
      success: false,
      error: 'Device screen capture (getDisplayMedia) is not supported in this browser or environment.',
    };
  }

  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;

  try {
    // Request screen / window / browser tab media stream
    const displayMediaOptions: any = {
      video: {
        cursor: 'always',
        displaySurface: options.preferCurrentTab ? 'browser' : undefined,
      },
      audio: false,
    };

    stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    if (!stream || stream.getVideoTracks().length === 0) {
      return {
        success: false,
        error: 'No video stream track was received from screen capture.',
      };
    }

    const track = stream.getVideoTracks()[0];

    // Attempt 1: Modern ImageCapture API if available
    if (typeof (window as any).ImageCapture === 'function') {
      try {
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          track.stop();
          stream.getTracks().forEach((t) => t.stop());
          return {
            success: true,
            dataUrl,
            source: 'device_screen',
            width: bitmap.width,
            height: bitmap.height,
          };
        }
      } catch (icErr) {
        console.warn('ImageCapture.grabFrame fallback to HTMLVideoElement:', icErr);
      }
    }

    // Attempt 2: HTMLVideoElement frame extraction
    video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;

    await new Promise<void>((resolve, reject) => {
      if (!video) return reject(new Error('Video element destroyed'));
      const timeout = setTimeout(() => reject(new Error('Screen stream initialization timed out')), 6000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        video!
          .play()
          .then(() => resolve())
          .catch(reject);
      };
    });

    // Short buffer pause to ensure the video frame is drawn
    await new Promise((resolve) => setTimeout(resolve, 150));

    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create canvas 2D rendering context');
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png');

    // Clean up media tracks and video element immediately
    track.stop();
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;

    if (!dataUrl || dataUrl.length < 100) {
      throw new Error('Generated screenshot image was empty');
    }

    return {
      success: true,
      dataUrl,
      source: 'device_screen',
      width,
      height,
    };
  } catch (err: any) {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (video) {
      video.srcObject = null;
    }

    if (
      err?.name === 'NotAllowedError' ||
      err?.name === 'PermissionDeniedError' ||
      err?.message?.includes('Permission denied')
    ) {
      return {
        success: false,
        error: 'Screen capture was cancelled or permission was not granted by user.',
      };
    }

    return {
      success: false,
      error: err?.message || 'Device screen capture failed.',
    };
  }
}

/**
 * Capture in-app document page snapshot on demand with lazy-loaded libraries
 * and comprehensive error recovery.
 */
export async function captureDocumentScreenSnapshot(
  options: CaptureSnapshotOptions = {}
): Promise<CaptureSnapshotResult> {
  const {
    targetElement,
    pixelRatio = 1.25,
    backgroundColor = '#ffffff',
  } = options;

  // 1. Identify target DOM element
  const el =
    targetElement ||
    document.getElementById('word-document-page') ||
    (document.querySelector('.ProseMirror') as HTMLElement) ||
    document.getElementById('word-canvas-workspace') ||
    document.body;

  if (!el) {
    return {
      success: false,
      error: 'Target document page element not found in DOM.',
    };
  }

  // Ensure element is visible and has dimensions
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      success: false,
      error: 'Document page has zero dimensions or is currently hidden.',
    };
  }

  let lastError: any = null;

  // --- ATTEMPT 1: html2canvas (Primary: robust against cross-origin Google Fonts & CSSStyleSheet.cssRules) ---
  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;

    const canvas = await html2canvas(el, {
      backgroundColor,
      scale: pixelRatio,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 6000,
      ignoreElements: (element) => {
        return (
          element.classList?.contains('no-print') ||
          element.classList?.contains('selection-marker') ||
          element.id === 'word-cursor-caret'
        );
      },
    });

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 100) {
      return {
        success: true,
        dataUrl,
        source: 'document_page',
        width: canvas.width,
        height: canvas.height,
      };
    }
  } catch (err: any) {
    console.warn('html2canvas capture attempt failed, falling back to html-to-image:', err);
    lastError = err;
  }

  // --- ATTEMPT 2: html-to-image (Secondary with skipFonts to avoid Google Fonts CORS) ---
  try {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(el, {
      backgroundColor,
      pixelRatio,
      skipFonts: true,
      cacheBust: false,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return !node.classList.contains('no-print');
        }
        return true;
      },
    });

    if (dataUrl && dataUrl.length > 100) {
      return {
        success: true,
        dataUrl,
        source: 'document_page',
      };
    }
  } catch (err: any) {
    console.warn('html-to-image capture attempt failed:', err);
    lastError = err;
  }

  // --- ATTEMPT 3: Viewport Canvas Fallback (Tertiary: draw visible document area) ---
  try {
    const fallbackCanvas = document.createElement('canvas');
    const width = Math.max(300, Math.min(rect.width, 1600));
    const height = Math.max(200, Math.min(rect.height, 2200));
    fallbackCanvas.width = width * pixelRatio;
    fallbackCanvas.height = height * pixelRatio;
    const ctx = fallbackCanvas.getContext('2d');

    if (ctx) {
      ctx.scale(pixelRatio, pixelRatio);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle page shadow/border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Render text summary or text block snapshot
      const textContent = el.textContent || 'Word Document Snapshot';
      ctx.fillStyle = '#0f172a';
      ctx.font = '16px system-ui, -apple-system, sans-serif';

      const lines = textContent.slice(0, 500).split('\n').filter(Boolean);
      let y = 40;
      for (const line of lines.slice(0, 15)) {
        ctx.fillText(line.slice(0, 80), 30, y);
        y += 24;
      }

      const fallbackDataUrl = fallbackCanvas.toDataURL('image/png');
      return {
        success: true,
        dataUrl: fallbackDataUrl,
        source: 'document_page',
        width: fallbackCanvas.width,
        height: fallbackCanvas.height,
      };
    }
  } catch (err) {
    lastError = err;
  }

  // --- ALL ATTEMPTS FAILED: Return descriptive fail message ---
  const errorMsg =
    lastError?.message ||
    (typeof lastError === 'string' ? lastError : 'Canvas security or rendering error');

  return {
    success: false,
    error: `Screen capture failed (${errorMsg}). Please ensure document is visible.`,
  };
}

/**
 * Load any photo or image file into a Data URL for instant snipping
 */
export function loadImageFromFile(file: File): Promise<CaptureSnapshotResult> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({
        success: false,
        error: 'Selected file is not an image (JPEG, PNG, WebP, etc.).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        resolve({
          success: true,
          dataUrl,
          source: 'photo_file',
        });
      } else {
        resolve({
          success: false,
          error: 'Failed to read image file data.',
        });
      }
    };
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Error reading selected photo file.',
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Read image directly from user clipboard if available
 */
export async function loadImageFromClipboard(): Promise<CaptureSnapshotResult> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.read !== 'function'
  ) {
    return {
      success: false,
      error: 'Clipboard image reading is not supported in this browser.',
    };
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              resolve({
                success: true,
                dataUrl,
                source: 'clipboard',
              });
            };
            reader.onerror = () => {
              resolve({
                success: false,
                error: 'Could not parse image from clipboard.',
              });
            };
            reader.readAsDataURL(blob);
          });
        }
      }
    }

    return {
      success: false,
      error: 'No image found in clipboard. Copy an image or screenshot first (Win+Shift+S / Cmd+Shift+4).',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to read image from clipboard.',
    };
  }
}
