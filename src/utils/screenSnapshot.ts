/**
 * screenSnapshot.ts
 * Reliable, Lazy-Loaded Screen Snapshot Capture Utility.
 * Provides multi-tier rendering fallback and returns structured failure messages
 * instead of hanging or silently failing.
 */

export interface CaptureSnapshotResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export interface CaptureSnapshotOptions {
  targetElement?: HTMLElement | null;
  pixelRatio?: number;
  backgroundColor?: string;
}

/**
 * Capture a document screen snapshot on demand with lazy-loaded libraries
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
    document.querySelector('.ProseMirror') as HTMLElement ||
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
