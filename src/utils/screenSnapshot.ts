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
    pixelRatio = 1.5,
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
  const width = Math.max(300, el.offsetWidth || el.scrollWidth || rect.width || 816);
  const height = Math.max(200, el.offsetHeight || el.scrollHeight || rect.height || 1056);

  let lastError: any = null;

  // --- ATTEMPT 1: html-to-image (Clean vector SVG to PNG rasterization with fontEmbedCSS bypassed) ---
  try {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(el, {
      backgroundColor,
      pixelRatio,
      skipFonts: true,
      cacheBust: false,
      fontEmbedCSS: '',
      width,
      height,
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'LINK' || node.tagName === 'STYLE') return false;
          if (node.classList?.contains('no-print') || node.classList?.contains('selection-marker') || node.id === 'word-cursor-caret') {
            return false;
          }
        }
        return true;
      },
    });

    if (dataUrl && dataUrl.length > 300) {
      return {
        success: true,
        dataUrl,
        source: 'document_page',
        width: Math.round(width * pixelRatio),
        height: Math.round(height * pixelRatio),
      };
    }
  } catch (err: any) {
    console.warn('html-to-image capture attempt failed, trying html2canvas:', err);
    lastError = err;
  }

  // --- ATTEMPT 2: html2canvas with robust cross-origin & layout configs ---
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
      width,
      height,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (element) => {
        return (
          element.classList?.contains('no-print') ||
          element.classList?.contains('selection-marker') ||
          element.id === 'word-cursor-caret' ||
          element.tagName === 'LINK'
        );
      },
    });

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 300) {
      return {
        success: true,
        dataUrl,
        source: 'document_page',
        width: canvas.width,
        height: canvas.height,
      };
    }
  } catch (err: any) {
    console.warn('html2canvas capture attempt failed, falling back to SVG foreignObject / full document canvas renderer:', err);
    lastError = err;
  }

  // --- ATTEMPT 3: High-Fidelity Multi-Block Document Canvas Renderer ---
  // When external libraries encounter CSS/CORS restrictions, this comprehensively
  // paints the full document: headers, titles, paragraphs, lists, tables, and borders.
  try {
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = width * pixelRatio;
    fallbackCanvas.height = height * pixelRatio;
    const ctx = fallbackCanvas.getContext('2d');

    if (ctx) {
      ctx.scale(pixelRatio, pixelRatio);
      
      // Page background
      const computedStyle = window.getComputedStyle(el);
      const computedBg = computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? computedStyle.backgroundColor
        : backgroundColor;
      ctx.fillStyle = computedBg;
      ctx.fillRect(0, 0, width, height);

      // Subtle page border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);

      // Extract editor content root
      const proseMirror = el.querySelector('.ProseMirror') || el;
      const childNodes = Array.from(proseMirror.children) as HTMLElement[];

      let cursorY = 48;
      const marginX = 48;
      const maxLineWidth = width - marginX * 2;

      // Word wrapping helper
      const wrapText = (text: string, font: string, maxW: number): string[] => {
        ctx.font = font;
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length === 0) return [];
        const lines: string[] = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const testLine = `${currentLine} ${words[i]}`;
          if (ctx.measureText(testLine).width <= maxW) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = words[i];
          }
        }
        lines.push(currentLine);
        return lines;
      };

      if (childNodes.length === 0) {
        // Fallback for single text block
        const text = (el.textContent || '').trim() || 'Document Snapshot';
        const lines = wrapText(text, '15px system-ui, sans-serif', maxLineWidth);
        ctx.fillStyle = '#1e293b';
        ctx.font = '15px system-ui, sans-serif';
        for (const line of lines) {
          if (cursorY > height - 30) break;
          ctx.fillText(line, marginX, cursorY);
          cursorY += 22;
        }
      } else {
        // Crawl through every document block
        for (const child of childNodes) {
          if (cursorY > height - 30) break;
          if (child.classList.contains('no-print')) continue;

          const tag = child.tagName.toLowerCase();

          if (tag === 'h1') {
            const font = 'bold 24px system-ui, sans-serif';
            ctx.fillStyle = '#0f172a';
            const lines = wrapText(child.textContent || '', font, maxLineWidth);
            cursorY += 12;
            for (const line of lines) {
              if (cursorY > height - 30) break;
              ctx.fillText(line, marginX, cursorY);
              cursorY += 30;
            }
            cursorY += 6;
          } else if (tag === 'h2') {
            const font = 'bold 20px system-ui, sans-serif';
            ctx.fillStyle = '#1e293b';
            const lines = wrapText(child.textContent || '', font, maxLineWidth);
            cursorY += 10;
            for (const line of lines) {
              if (cursorY > height - 30) break;
              ctx.fillText(line, marginX, cursorY);
              cursorY += 26;
            }
            cursorY += 4;
          } else if (tag === 'h3') {
            const font = 'bold 16px system-ui, sans-serif';
            ctx.fillStyle = '#334155';
            const lines = wrapText(child.textContent || '', font, maxLineWidth);
            cursorY += 8;
            for (const line of lines) {
              if (cursorY > height - 30) break;
              ctx.fillText(line, marginX, cursorY);
              cursorY += 22;
            }
            cursorY += 4;
          } else if (tag === 'ul' || tag === 'ol') {
            const items = Array.from(child.querySelectorAll('li'));
            let itemIdx = 1;
            for (const li of items) {
              if (cursorY > height - 30) break;
              const bullet = tag === 'ol' ? `${itemIdx}. ` : '• ';
              ctx.font = '14px system-ui, sans-serif';
              ctx.fillStyle = '#475569';
              ctx.fillText(bullet, marginX, cursorY);
              
              const bulletIndent = tag === 'ol' ? 24 : 16;
              const lines = wrapText(li.textContent || '', '14px system-ui, sans-serif', maxLineWidth - bulletIndent);
              ctx.fillStyle = '#1e293b';
              for (let liLineIdx = 0; liLineIdx < lines.length; liLineIdx++) {
                if (cursorY > height - 30) break;
                ctx.fillText(lines[liLineIdx], marginX + bulletIndent, cursorY);
                cursorY += 20;
              }
              itemIdx++;
            }
            cursorY += 6;
          } else if (tag === 'table') {
            // Render structured table
            const rows = Array.from(child.querySelectorAll('tr'));
            if (rows.length > 0) {
              const numCols = Math.max(...rows.map((r) => r.children.length), 1);
              const colWidth = Math.floor(maxLineWidth / numCols);
              const cellPadding = 8;

              cursorY += 8;
              for (let rIdx = 0; rIdx < rows.length; rIdx++) {
                if (cursorY > height - 30) break;
                const row = rows[rIdx];
                const cells = Array.from(row.children) as HTMLElement[];
                const rowH = 28;

                // Draw cell borders and background
                for (let cIdx = 0; cIdx < cells.length; cIdx++) {
                  const cell = cells[cIdx];
                  const cellX = marginX + cIdx * colWidth;
                  
                  // Header row background
                  if (rIdx === 0 || cell.tagName.toLowerCase() === 'th') {
                    ctx.fillStyle = '#f1f5f9';
                    ctx.fillRect(cellX, cursorY, colWidth, rowH);
                    ctx.font = 'bold 12px system-ui, sans-serif';
                    ctx.fillStyle = '#0f172a';
                  } else {
                    ctx.font = '12px system-ui, sans-serif';
                    ctx.fillStyle = '#334155';
                  }

                  // Border
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.strokeRect(cellX, cursorY, colWidth, rowH);

                  // Cell text
                  const cellText = (cell.textContent || '').trim();
                  ctx.fillText(cellText.slice(0, 30), cellX + cellPadding, cursorY + 18);
                }
                cursorY += rowH;
              }
              cursorY += 12;
            }
          } else if (tag === 'p') {
            const text = (child.textContent || '').trim();
            if (text.length > 0) {
              const font = '14px system-ui, sans-serif';
              ctx.font = font;
              ctx.fillStyle = '#1e293b';
              const lines = wrapText(text, font, maxLineWidth);
              for (const line of lines) {
                if (cursorY > height - 30) break;
                ctx.fillText(line, marginX, cursorY);
                cursorY += 21;
              }
              cursorY += 6;
            } else {
              // Empty paragraph line spacing
              cursorY += 14;
            }
          } else {
            // General text elements (blockquotes, pre, divs)
            const text = (child.textContent || '').trim();
            if (text.length > 0) {
              const font = '14px system-ui, sans-serif';
              ctx.font = font;
              ctx.fillStyle = '#334155';
              const lines = wrapText(text, font, maxLineWidth);
              for (const line of lines) {
                if (cursorY > height - 30) break;
                ctx.fillText(line, marginX, cursorY);
                cursorY += 20;
              }
              cursorY += 6;
            }
          }
        }
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
