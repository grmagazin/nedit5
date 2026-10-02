import JSZip from 'jszip';

export interface HtmlZipEntry {
  name: string;
  size: number;
  compressedSize?: number;
  isDir: boolean;
  date?: Date;
}

export interface HtmlZipExtractedMedia {
  name: string;
  relativePath: string;
  dataUrl: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface HtmlZipInspectionResult {
  archiveName: string;
  projectName: string;
  fileSizeBytes: number;
  uncompressedSizeBytes: number;
  compressionRatio: string;
  totalEntries: number;
  entries: HtmlZipEntry[];
  media: HtmlZipExtractedMedia[];
  mainHtmlName: string;
  mainHtmlSnippet: string;
  rawHtml: string;
  editorHtml: string;
  cachedAt?: string;
}

export interface HtmlZipExportOptions {
  title?: string;
  projectName?: string;
  fontFamily?: string;
  includeReadme?: boolean;
  includeIndexHtml?: boolean;
}

const LOCAL_CACHE_KEY = 'office_web_html_zip_cache';

/**
 * Base64 string to Uint8Array
 */
function base64ToUint8Array(base64Str: string): Uint8Array {
  const pureBase64 = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  const binaryStr = atob(pureBase64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uint8Array to Base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert external or blob image to PNG Uint8Array via Canvas
 */
async function fetchImageToUint8Array(
  src: string
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          const bytes = base64ToUint8Array(dataUrl);
          resolve({ bytes, mimeType: 'image/png' });
          return;
        }
      } catch (err) {
        console.warn('Canvas rasterization failed:', err);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Sanitize filename for safe zip packaging
 */
export function sanitizeProjectName(name?: string): string {
  if (!name) return 'document';
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'document'
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * High-Fidelity Standalone HTML Generator:
 * Creates a modern, beautiful W3C HTML5 document compatible with 100% of browsers
 * (Chrome, Edge, Safari, Firefox, Opera, Mobile) with no external scripts or internet access required.
 */
export function generateStandaloneHtml(
  contentHtml: string,
  title = 'Document',
  fontFamily = 'Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif'
): string {
  const safeTitle = escapeHtml(title);
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Web Word Processor - HTML + Images Standalone Engine">
  <meta name="description" content="Offline-compatible standalone web package containing ${safeTitle}">
  <title>${safeTitle}</title>
  <style>
    /* ==========================================================================
       Office Web Suite - Standalone HTML5 Document Styles
       100% Offline Compatible across all browsers without plugins or servers
       ========================================================================== */
    :root {
      --text-main: #1f2937;
      --text-muted: #64748b;
      --heading-color: #0f172a;
      --brand-primary: #185abd;
      --brand-dark: #12448f;
      --border-light: #e2e8f0;
      --bg-page: #f1f5f9;
      --bg-document: #ffffff;
      --shadow-doc: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
    }

    * {
      box-sizing: border-box;
    }

    html {
      color-scheme: light;
      font-size: 16px;
    }

    body {
      margin: 0;
      padding: 40px 16px;
      font-family: ${fontFamily};
      color: var(--text-main);
      background-color: var(--bg-page);
      line-height: 1.68;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Standard A4 / Letter printable card container */
    .document-card {
      max-width: 860px;
      margin: 0 auto;
      background: var(--bg-document);
      padding: 56px 64px;
      border-radius: 8px;
      box-shadow: var(--shadow-doc);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }

    /* Typography hierarchy */
    h1, h2, h3, h4, h5, h6 {
      color: var(--heading-color);
      font-weight: 700;
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      line-height: 1.25;
      letter-spacing: -0.015em;
    }

    h1 {
      font-size: 2.25rem;
      color: var(--brand-primary);
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.35em;
      margin-top: 0.5em;
    }

    h2 {
      font-size: 1.6rem;
      color: var(--brand-dark);
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.25em;
    }

    h3 {
      font-size: 1.28rem;
    }

    h4 {
      font-size: 1.1rem;
    }

    p {
      margin: 1.1em 0;
      color: inherit;
    }

    /* Embedded Images in relative folder /images/ */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 24px auto;
      border-radius: 6px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      object-fit: contain;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 28px 0;
      font-size: 0.95rem;
      border: 1px solid var(--border-light);
      border-radius: 6px;
      overflow: hidden;
    }

    th, td {
      border: 1px solid var(--border-light);
      padding: 10px 14px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: var(--heading-color);
    }

    tr:nth-child(even) td {
      background-color: #fcfdfe;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid var(--brand-primary);
      margin: 24px 0;
      padding: 14px 20px;
      background-color: #f8fafc;
      color: #475569;
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }

    /* Lists */
    ul, ol {
      padding-left: 28px;
      margin: 1.2em 0;
    }

    li {
      margin-bottom: 0.45em;
    }

    /* Code & Preformatted */
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f1f5f9;
      padding: 0.2em 0.45em;
      border-radius: 4px;
      font-size: 85%;
      color: #0f172a;
    }

    pre {
      background-color: #0f172a;
      color: #f8fafc;
      padding: 18px 20px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    /* Marks & Accents */
    mark {
      background-color: #fef08a;
      padding: 0.1em 0.3em;
      border-radius: 2px;
    }

    s, del {
      color: #94a3b8;
    }

    /* Document Footer */
    .document-footer {
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid var(--border-light);
      font-size: 0.82rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .document-footer .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }

    .document-footer .brand-badge::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10b981;
    }

    /* Print media optimization */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        color: #000000 !important;
      }
      .document-card {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .document-footer {
        display: none !important;
      }
      img {
        page-break-inside: avoid;
        box-shadow: none !important;
      }
      tr, table {
        page-break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
      }
    }

    /* Mobile screens */
    @media (max-width: 640px) {
      body {
        padding: 12px 8px;
      }
      .document-card {
        padding: 28px 20px;
        border-radius: 4px;
      }
      h1 {
        font-size: 1.75rem;
      }
      h2 {
        font-size: 1.35rem;
      }
    }
  </style>
</head>
<body>
  <main class="document-card">
    <div class="document-content">
${contentHtml}
    </div>
    <footer class="document-footer">
      <span class="brand-badge">${safeTitle}</span>
      <span>Universal Standalone Web Package &bull; Generated ${now}</span>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Export current document to a high-compression GZIP/DEFLATE (.zip) archive
 * containing:
 * - [projectname].html (Clean, standalone responsive HTML)
 * - index.html (Direct browser entry point)
 * - /images/ folder containing all document images
 * - README.txt with offline double-click opening instructions
 * - metadata.json
 */
export async function exportHtmlZipPackage(
  html: string,
  options: HtmlZipExportOptions = {}
): Promise<{ blob: Blob; fileName: string; inspection: HtmlZipInspectionResult }> {
  const title = options.title || 'Document';
  const projectName = sanitizeProjectName(options.projectName || title);
  const zip = new JSZip();

  // Create images folder
  const imagesFolder = zip.folder('images');
  const mediaList: HtmlZipExtractedMedia[] = [];

  // Parse HTML DOM to extract images and rewrite relative src paths
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = Array.from(doc.querySelectorAll('img'));

  let imageCounter = 1;

  for (const img of imgElements) {
    const src = img.getAttribute('src') || '';
    if (!src) continue;

    let imgBytes: Uint8Array | null = null;
    let ext = 'png';
    let mimeType = 'image/png';

    if (src.startsWith('data:image/')) {
      const match = src.match(/^data:(image\/([a-zA-Z0-9+.-]+));base64,/);
      if (match) {
        mimeType = match[1];
        const subType = match[2].toLowerCase();
        if (subType === 'jpeg' || subType === 'jpg') ext = 'jpg';
        else if (subType === 'svg+xml' || subType === 'svg') ext = 'svg';
        else if (subType === 'webp') ext = 'webp';
        else if (subType === 'gif') ext = 'gif';
        else ext = 'png';
      }
      try {
        imgBytes = base64ToUint8Array(src);
      } catch (e) {
        console.warn('Failed to decode data URL:', e);
      }
    } else if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
      const fetched = await fetchImageToUint8Array(src);
      if (fetched) {
        imgBytes = fetched.bytes;
        mimeType = fetched.mimeType;
        ext = 'png';
      }
    }

    if (imgBytes && imagesFolder) {
      const fileNameOnly = `img_${imageCounter}.${ext}`;
      const relativePath = `images/${fileNameOnly}`;

      imagesFolder.file(fileNameOnly, imgBytes, { binary: true });

      // Update image element src in rewritten HTML
      img.setAttribute('src', relativePath);

      // Measure dimensions if available
      const w = img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10) || undefined;
      const h = img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10) || undefined;

      mediaList.push({
        name: fileNameOnly,
        relativePath,
        dataUrl: src.startsWith('data:') ? src : `data:${mimeType};base64,${uint8ArrayToBase64(imgBytes)}`,
        sizeBytes: imgBytes.byteLength,
        mimeType,
        width: w,
        height: h,
      });

      imageCounter++;
    }
  }

  // Get rewritten content HTML
  const rewrittenBodyHtml = doc.body.innerHTML;

  // Build the complete standalone HTML page
  const fullHtmlContent = generateStandaloneHtml(
    rewrittenBodyHtml,
    title,
    options.fontFamily || 'Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  );

  // 1. Primary file: [projectname].html
  const mainHtmlFileName = `${projectName}.html`;
  zip.file(mainHtmlFileName, fullHtmlContent);

  // 2. Index file: index.html for instant local web servers / browser opening
  if (options.includeIndexHtml !== false) {
    zip.file('index.html', fullHtmlContent);
  }

  // 3. User README.txt with offline instructions
  if (options.includeReadme !== false) {
    const readmeContent = `======================================================================
HTML + IMAGES STANDALONE WEB PACKAGE
Package: ${projectName}.zip
Document: ${title}
Generated: ${new Date().toISOString()}
======================================================================

HOW TO OPEN & VIEW THIS DOCUMENT:
----------------------------------------------------------------------
1. Unzip this package to any folder on your computer:
   - Windows: Right-click > Extract All...
   - Mac: Double-click to expand
   - Linux / ChromeOS: Extract using Archive Manager or unzip command

2. Open in ANY Web Browser:
   Double-click "${mainHtmlFileName}" (or "index.html").
   It will open immediately in:
   - Google Chrome
   - Microsoft Edge
   - Apple Safari
   - Mozilla Firefox
   - Opera, Brave, Chromium, Android & iOS browsers

ZERO DEPENDENCIES / ZERO SOFTWARE NEEDED:
----------------------------------------------------------------------
- No Microsoft Office or Word installation required.
- No active internet connection needed (100% offline).
- No web server or node runtime needed.
- All embedded photos, diagrams, and illustrations are stored locally
  in the "images/" directory and loaded via relative file links.

PRINTING & PDF EXPORT:
----------------------------------------------------------------------
To print or save as a PDF:
Press Ctrl+P (or Cmd+P on Mac) inside any browser.
The page is pre-formatted with clean page margins and print styling.

PACKAGE STRUCTURE:
----------------------------------------------------------------------
- ${mainHtmlFileName}    : Standalone document with embedded styling
- index.html             : Standard web entry point
- images/                : High-resolution media directory (${mediaList.length} images)
- README.txt             : This guide
- metadata.json          : Archive metadata and technical properties
======================================================================`;
    zip.file('README.txt', readmeContent);
  }

  // 4. metadata.json
  const metadata = {
    generator: 'Word Processor HTML+Images Engine',
    version: '1.0.0',
    title,
    projectName,
    mainHtml: mainHtmlFileName,
    imagesCount: mediaList.length,
    exportedAt: new Date().toISOString(),
    compression: 'DEFLATE-level-9 (GZIP Compatible)',
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Generate GZIP/DEFLATE compressed ZIP blob (Level 9 for maximum compression)
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  const zipFileName = `${projectName}.zip`;

  // Compute inspection result
  const entries: HtmlZipEntry[] = [];
  let uncompressedTotal = 0;

  zip.forEach((relativePath, zipEntry) => {
    const uncomp = (zipEntry as any)._data?.uncompressedSize || 0;
    uncompressedTotal += uncomp;
    entries.push({
      name: relativePath,
      size: uncomp,
      compressedSize: (zipEntry as any)._data?.compressedSize || 0,
      isDir: zipEntry.dir,
      date: zipEntry.date,
    });
  });

  const compressionRatio =
    uncompressedTotal > 0
      ? `${Math.round((1 - zipBlob.size / uncompressedTotal) * 100)}%`
      : '0%';

  const inspection: HtmlZipInspectionResult = {
    archiveName: zipFileName,
    projectName,
    fileSizeBytes: zipBlob.size,
    uncompressedSizeBytes: uncompressedTotal || zipBlob.size,
    compressionRatio,
    totalEntries: entries.length,
    entries,
    media: mediaList,
    mainHtmlName: mainHtmlFileName,
    mainHtmlSnippet: fullHtmlContent.slice(0, 3000),
    rawHtml: fullHtmlContent,
    editorHtml: html,
    cachedAt: new Date().toISOString(),
  };

  // Cache in local storage for quick retrieval
  saveHtmlZipToLocalCache(inspection);

  return {
    blob: zipBlob,
    fileName: zipFileName,
    inspection,
  };
}

/**
 * Parse an uploaded HTML + Images ZIP package in-memory:
 * - Finds the primary .html file
 * - Unpacks all files in /images/ into base64 data URLs
 * - Rewrites relative image links to inline data URLs for seamless TipTap editor editing
 */
export async function parseHtmlZipPackage(
  file: File | ArrayBuffer,
  fileName = 'archive.zip'
): Promise<HtmlZipInspectionResult> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const fileSizeBytes = arrayBuffer.byteLength;

  const zip = await JSZip.loadAsync(arrayBuffer);
  const entries: HtmlZipEntry[] = [];
  const mediaMap = new Map<string, HtmlZipExtractedMedia>();
  const mediaList: HtmlZipExtractedMedia[] = [];

  let htmlCandidateName = '';
  let htmlCandidateText = '';
  let uncompressedTotal = 0;

  const filePromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    const uncomp = (zipEntry as any)._data?.uncompressedSize || 0;
    uncompressedTotal += uncomp;

    entries.push({
      name: relativePath,
      size: uncomp,
      compressedSize: (zipEntry as any)._data?.compressedSize || 0,
      isDir: zipEntry.dir,
      date: zipEntry.date,
    });

    if (zipEntry.dir) return;

    // Check if image file
    const lowerName = relativePath.toLowerCase();
    const isImage =
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.gif') ||
      lowerName.endsWith('.svg');

    if (isImage) {
      const fileNameOnly = relativePath.split('/').pop() || relativePath;
      let mimeType = 'image/png';
      if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
      else if (lowerName.endsWith('.gif')) mimeType = 'image/gif';
      else if (lowerName.endsWith('.svg')) mimeType = 'image/svg+xml';

      filePromises.push(
        zipEntry.async('base64').then((base64) => {
          const dataUrl = `data:${mimeType};base64,${base64}`;
          const approxSize = Math.round((base64.length * 3) / 4);
          const item: HtmlZipExtractedMedia = {
            name: fileNameOnly,
            relativePath,
            dataUrl,
            sizeBytes: approxSize,
            mimeType,
          };
          mediaList.push(item);
          // Store multiple key variants for robust URL matching
          mediaMap.set(relativePath, item);
          mediaMap.set(fileNameOnly, item);
          mediaMap.set(`images/${fileNameOnly}`, item);
          mediaMap.set(`./images/${fileNameOnly}`, item);
          mediaMap.set(`/${relativePath}`, item);
        })
      );
    }

    // Check for HTML file candidates
    if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
      // Prioritize non-index.html if available, or index.html
      const isTopLevel = !relativePath.includes('/') || relativePath.split('/').length === 1;
      if (isTopLevel) {
        filePromises.push(
          zipEntry.async('text').then((text) => {
            if (!htmlCandidateText || (!relativePath.includes('index') && htmlCandidateName.includes('index'))) {
              htmlCandidateName = relativePath;
              htmlCandidateText = text;
            }
          })
        );
      }
    }
  });

  await Promise.all(filePromises);

  // If still no HTML, pick any .html found in any directory
  if (!htmlCandidateText) {
    for (const entry of entries) {
      if (entry.name.toLowerCase().endsWith('.html') || entry.name.toLowerCase().endsWith('.htm')) {
        const fileInZip = zip.file(entry.name);
        if (fileInZip) {
          htmlCandidateName = entry.name;
          htmlCandidateText = await fileInZip.async('text');
          break;
        }
      }
    }
  }

  if (!htmlCandidateText) {
    throw new Error('No .html document found in the provided ZIP archive.');
  }

  // Parse HTML and replace relative image sources with data URLs for the TipTap editor
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlCandidateText, 'text/html');

  const imgElements = Array.from(doc.querySelectorAll('img'));
  for (const img of imgElements) {
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) continue;

    // Normalize path
    const normalized = src.replace(/^(\.\/|\/)/, '');
    const fileNameOnly = src.split('/').pop() || src;

    const matchedMedia =
      mediaMap.get(src) ||
      mediaMap.get(normalized) ||
      mediaMap.get(`images/${fileNameOnly}`) ||
      mediaMap.get(fileNameOnly);

    if (matchedMedia) {
      img.setAttribute('src', matchedMedia.dataUrl);
    }
  }

  // Extract clean content HTML for the editor
  // Look for .document-content, .document-card, <main>, or <body>
  let editorHtml = '';
  const contentEl =
    doc.querySelector('.document-content') ||
    doc.querySelector('.document-card') ||
    doc.querySelector('main') ||
    doc.body;

  if (contentEl) {
    // Clone to remove footer if present
    const clone = contentEl.cloneNode(true) as HTMLElement;
    const footer = clone.querySelector('.document-footer');
    if (footer) footer.remove();
    editorHtml = clone.innerHTML;
  } else {
    editorHtml = doc.body.innerHTML;
  }

  // Sort entries: folders first, then alphabetically
  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  const projectName = htmlCandidateName.replace(/\.html?$/i, '') || 'document';
  const compressionRatio =
    uncompressedTotal > 0
      ? `${Math.round((1 - fileSizeBytes / uncompressedTotal) * 100)}%`
      : '0%';

  const inspection: HtmlZipInspectionResult = {
    archiveName: fileName,
    projectName,
    fileSizeBytes,
    uncompressedSizeBytes: uncompressedTotal || fileSizeBytes,
    compressionRatio,
    totalEntries: entries.length,
    entries,
    media: mediaList,
    mainHtmlName: htmlCandidateName,
    mainHtmlSnippet: htmlCandidateText.slice(0, 3000),
    rawHtml: htmlCandidateText,
    editorHtml,
    cachedAt: new Date().toISOString(),
  };

  saveHtmlZipToLocalCache(inspection);

  return inspection;
}

/**
 * Save inspection result metadata to browser local cache
 */
export function saveHtmlZipToLocalCache(result: HtmlZipInspectionResult): void {
  try {
    const cacheData = {
      archiveName: result.archiveName,
      projectName: result.projectName,
      fileSizeBytes: result.fileSizeBytes,
      uncompressedSizeBytes: result.uncompressedSizeBytes,
      compressionRatio: result.compressionRatio,
      totalEntries: result.totalEntries,
      mediaCount: result.media.length,
      mainHtmlName: result.mainHtmlName,
      cachedAt: result.cachedAt || new Date().toISOString(),
      // Store small snippet for preview without blowing quota
      mainHtmlSnippet: result.mainHtmlSnippet.slice(0, 1000),
      rawHtmlPreview: result.rawHtml.slice(0, 1500),
    };
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Could not save HTML ZIP to local cache:', err);
  }
}

/**
 * Load cached package metadata from browser local cache
 */
export function loadHtmlZipFromLocalCache(): any | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read HTML ZIP local cache:', err);
    return null;
  }
}

/**
 * Clear local cache
 */
export function clearHtmlZipLocalCache(): void {
  try {
    localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch (err) {
    console.warn('Could not clear HTML ZIP local cache:', err);
  }
}

/**
 * Trigger file download helper
 */
export function triggerZipDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
