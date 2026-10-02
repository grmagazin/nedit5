import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats } from '../types';

export interface JsonBackupImage {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string; // "data:image/...;base64,..."
  sizeBytes: number;
  width?: number;
  height?: number;
}

export interface JsonBackupDocument {
  schema?: string;
  version?: string;
  generator?: string;
  timestamp: string; // ISO 8601
  document: {
    title: string;
    htmlContent: string;
    plainText: string;
    tiptapJson?: any;
    settings: DocumentSettings;
    stats: {
      words: number;
      characters: number;
      charactersNoSpaces?: number;
      paragraphs: number;
      readingTimeMinutes: number;
    };
  };
  media: {
    totalImages: number;
    totalSizeBytes: number;
    images: JsonBackupImage[];
  };
  environment: {
    userAgent: string;
    platform: string;
    exportedAtLocal: string;
  };
}

export interface JsonBackupInspectionResult {
  rawJson: string;
  fileSizeBytes: number;
  backupDoc: JsonBackupDocument;
  formattedJson: string;
  validationErrors: string[];
  isValid: boolean;
}

export const STORAGE_KEY_JSON_BACKUP_CACHE = 'wordpad_json_backup_cache';
export const STORAGE_KEY_CONTENT = 'wordpad_document_content';
export const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';

/**
 * Converts a URL (remote HTTP, blob, or data URL) into a base64 Data URI string.
 */
export async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string; size: number }> {
  // If already base64 data URI
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64Part = url.split(',')[1] || '';
    const approxSize = Math.round((base64Part.length * 3) / 4);
    return { base64: url, mimeType, size: approxSize };
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const mimeType = blob.type || 'image/png';
    const size = blob.size;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve({ base64, mimeType, size });
      };
      reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    // If fetch failed due to CORS or offline, create a lightweight SVG placeholder base64
    console.warn(`Could not fetch image at ${url}, generating offline placeholder:`, err);
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"><rect width="400" height="240" fill="#f1f5f9" rx="8"/><text x="50%" y="45%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14" font-weight="bold">Archived Image Resource</text><text x="50%" y="60%" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="11">${url.substring(0, 45)}...</text></svg>`;
    const fallbackBase64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(fallbackSvg)))}`;
    return {
      base64: fallbackBase64,
      mimeType: 'image/svg+xml',
      size: fallbackBase64.length,
    };
  }
}

/**
 * Creates a complete JSON backup with inline base64 images extracted and embedded.
 */
export async function createJsonBackupDocument(
  editor: Editor | null,
  settings: DocumentSettings,
  stats: DocumentStats
): Promise<JsonBackupDocument> {
  const title = settings.title || 'Untitled Document';
  let htmlContent = editor ? editor.getHTML() : '<p></p>';
  const plainText = editor ? editor.getText() : '';
  const tiptapJson = editor ? editor.getJSON() : null;

  // Extract all <img> tags and convert their src attributes into base64 Data URLs
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const imgElements = Array.from(doc.querySelectorAll('img'));
  const images: JsonBackupImage[] = [];

  let totalSizeBytes = 0;

  for (let idx = 0; idx < imgElements.length; idx++) {
    const img = imgElements[idx];
    const originalSrc = img.getAttribute('src');
    if (!originalSrc) continue;

    try {
      const { base64, mimeType, size } = await urlToBase64(originalSrc);
      const imgId = `img_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`;
      const alt = img.getAttribute('alt') || `embedded_image_${idx + 1}`;
      const width = img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10) || undefined;
      const height = img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10) || undefined;

      // Update the DOM element to point to the standalone base64
      img.setAttribute('src', base64);
      img.setAttribute('data-backup-id', imgId);

      images.push({
        id: imgId,
        name: alt,
        mimeType,
        base64Data: base64,
        sizeBytes: size,
        width,
        height,
      });

      totalSizeBytes += size;
    } catch (e) {
      console.error(`Error processing image ${idx}:`, e);
    }
  }

  // Serialized HTML with 100% self-contained base64 images
  const finalHtmlContent = doc.body.innerHTML;

  const backupDoc: JsonBackupDocument = {
    schema: 'https://office.tiptap.engine/schemas/v2/backup.json',
    version: '2.0.0',
    generator: 'Office Pro Word Engine - JSON Backup System',
    timestamp: new Date().toISOString(),
    document: {
      title,
      htmlContent: finalHtmlContent,
      plainText,
      tiptapJson,
      settings: { ...settings },
      stats: {
        words: stats.words,
        characters: stats.characters,
        charactersNoSpaces: stats.charactersNoSpaces,
        paragraphs: stats.paragraphs,
        readingTimeMinutes: stats.readingTimeMinutes,
      },
    },
    media: {
      totalImages: images.length,
      totalSizeBytes,
      images,
    },
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      exportedAtLocal: new Date().toLocaleString(),
    },
  };

  return backupDoc;
}

/**
 * Triggers download of the JSON backup document file.
 */
export function triggerJsonDownload(
  backupDoc: JsonBackupDocument,
  filename?: string,
  minify: boolean = false
): void {
  const safeTitle = (filename || backupDoc.document.title || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const jsonString = minify
    ? JSON.stringify(backupDoc)
    : JSON.stringify(backupDoc, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}.backup.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Parses and inspects an uploaded JSON backup file string.
 */
export function parseJsonBackupString(jsonStr: string): JsonBackupInspectionResult {
  const validationErrors: string[] = [];
  let parsed: any = null;

  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    return {
      rawJson: jsonStr,
      fileSizeBytes: jsonStr.length,
      backupDoc: {} as any,
      formattedJson: jsonStr.substring(0, 500),
      validationErrors: ['Invalid JSON syntax: ' + err.message],
      isValid: false,
    };
  }

  // Graceful normalizations for different possible JSON versions
  if (!parsed || typeof parsed !== 'object') {
    validationErrors.push('Root payload must be a JSON object.');
  }

  // Handle standard v2 format or v1 legacy format
  let backupDoc: JsonBackupDocument;

  if (parsed.document && parsed.document.htmlContent !== undefined) {
    // Schema v2 format
    backupDoc = {
      schema: parsed.schema || 'https://office.tiptap.engine/schemas/v2/backup.json',
      version: parsed.version || '2.0.0',
      generator: parsed.generator || 'JSON Backup Engine',
      timestamp: parsed.timestamp || new Date().toISOString(),
      document: {
        title: parsed.document.title || 'Restored Document',
        htmlContent: parsed.document.htmlContent || '<p></p>',
        plainText: parsed.document.plainText || '',
        tiptapJson: parsed.document.tiptapJson,
        settings: parsed.document.settings || ({} as DocumentSettings),
        stats: parsed.document.stats || {
          words: 0,
          characters: 0,
          paragraphs: 0,
          readingTimeMinutes: 0,
        },
      },
      media: {
        totalImages: parsed.media?.images?.length || 0,
        totalSizeBytes: parsed.media?.totalSizeBytes || 0,
        images: parsed.media?.images || [],
      },
      environment: parsed.environment || {
        userAgent: 'Restored from JSON',
        platform: 'Web',
        exportedAtLocal: new Date().toLocaleString(),
      },
    };
  } else if (parsed.content || parsed.html) {
    // Legacy simple format: { content: '...', settings: {...}, title: '...' }
    backupDoc = {
      schema: 'https://office.tiptap.engine/schemas/v2/backup.json',
      version: '2.0.0',
      generator: 'Imported Legacy JSON',
      timestamp: new Date().toISOString(),
      document: {
        title: parsed.title || 'Imported Document',
        htmlContent: parsed.content || parsed.html || '<p></p>',
        plainText: '',
        settings: parsed.settings || {},
        stats: { words: 0, characters: 0, paragraphs: 0, readingTimeMinutes: 0 },
      },
      media: {
        totalImages: 0,
        totalSizeBytes: 0,
        images: [],
      },
      environment: {
        userAgent: 'Imported',
        platform: 'Legacy',
        exportedAtLocal: new Date().toLocaleString(),
      },
    };
  } else {
    validationErrors.push('Missing essential document content in JSON payload.');
    backupDoc = {} as any;
  }

  // Validate images in media if present
  if (backupDoc.media?.images) {
    for (let i = 0; i < backupDoc.media.images.length; i++) {
      const img = backupDoc.media.images[i];
      if (!img.base64Data || !img.base64Data.startsWith('data:')) {
        validationErrors.push(`Image #${i + 1} (${img.name || 'unnamed'}) is missing valid base64 URI data.`);
      }
    }
  }

  const formattedJson = JSON.stringify(parsed, null, 2);

  return {
    rawJson: jsonStr,
    fileSizeBytes: new Blob([jsonStr]).size,
    backupDoc,
    formattedJson,
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}

/**
 * Restores a parsed JSON backup document into the active editor and application state.
 */
export function restoreJsonBackup(
  backupDoc: JsonBackupDocument,
  editor: Editor | null,
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void,
  onSaveToLocalStorage: () => void
): void {
  if (!editor || !backupDoc.document) return;

  const { htmlContent, settings, title } = backupDoc.document;

  // Restore content with embedded base64 images intact
  editor.commands.setContent(htmlContent);

  // Restore settings and title
  const updatedSettings: Partial<DocumentSettings> = {
    ...(settings || {}),
    title: title || settings?.title || 'Restored Document',
    updatedDate: new Date().toLocaleString(),
  };

  onUpdateSettings(updatedSettings);

  // Sync to browser localStorage immediately
  try {
    localStorage.setItem(STORAGE_KEY_CONTENT, htmlContent);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updatedSettings));
    saveJsonBackupToCache(backupDoc);
  } catch (err) {
    console.warn('LocalStorage quota warning during JSON restore:', err);
  }

  onSaveToLocalStorage();
}

/**
 * LocalStorage caching for the latest JSON backup inspection or generated backup.
 */
export function saveJsonBackupToCache(backupDoc: JsonBackupDocument): void {
  try {
    const compactCache = {
      timestamp: backupDoc.timestamp,
      title: backupDoc.document.title,
      words: backupDoc.document.stats.words,
      imagesCount: backupDoc.media.totalImages,
      sizeBytes: new Blob([JSON.stringify(backupDoc)]).size,
      backupDoc,
    };
    localStorage.setItem(STORAGE_KEY_JSON_BACKUP_CACHE, JSON.stringify(compactCache));
  } catch (err) {
    console.warn('Unable to cache JSON backup in localStorage:', err);
  }
}

export function loadJsonBackupFromCache(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_JSON_BACKUP_CACHE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load JSON backup from localStorage:', err);
    return null;
  }
}

export function clearJsonBackupCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_JSON_BACKUP_CACHE);
  } catch (err) {
    console.warn('Failed to clear JSON backup cache:', err);
  }
}

/**
 * Returns a high-fidelity sample backup document with base64 embedded vector media.
 */
export function getSampleJsonBackup(): JsonBackupDocument {
  // Embedded base64 SVG diagram of a modern cloud architecture
  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260">
    <rect width="600" height="260" fill="#0f172a" rx="12"/>
    <rect x="30" y="30" width="160" height="90" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
    <text x="110" y="65" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Client Tier</text>
    <text x="110" y="85" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">React &bull; TipTap &bull; Web</text>
    <line x1="190" y1="75" x2="250" y2="75" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4"/>
    <polygon points="250,71 258,75 250,79" fill="#38bdf8"/>
    <rect x="260" y="30" width="160" height="90" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="2"/>
    <text x="340" y="65" fill="#10b981" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">JSON Engine</text>
    <text x="340" y="85" fill="#94a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Base64 &bull; Serialization</text>
    <line x1="420" y1="75" x2="480" y2="75" stroke="#10b981" stroke-width="2" stroke-dasharray="4"/>
    <polygon points="480,71 488,75 480,79" fill="#10b981"/>
    <rect x="490" y="30" width="80" height="90" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
    <text x="530" y="65" fill="#f59e0b" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Archive</text>
    <text x="530" y="85" fill="#94a3b8" font-family="sans-serif" font-size="10" text-anchor="middle">Portable</text>
    <rect x="30" y="150" width="540" height="80" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="1"/>
    <text x="50" y="180" fill="#f8fafc" font-family="sans-serif" font-size="12" font-weight="bold">&bull; 100% Offline Portable Document Representation</text>
    <text x="50" y="202" fill="#94a3b8" font-family="sans-serif" font-size="11">Images are automatically encoded into base64 Data URIs to eliminate broken external links.</text>
  </svg>`;

  const base64Diagram = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sampleSvg)))}`;

  const htmlContent = `
    <h1 style="color: #d97706; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; margin-bottom: 4px;">Enterprise Architecture &amp; JSON Backup Specification</h1>
    <p style="color: #64748b; font-size: 13px; margin-top: 0;"><em>Office Pro Document Suite &bull; System Specification v2.0.0 &bull; Confidential</em></p>
    
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
    
    <h2 style="color: #b45309; margin-top: 20px;">1. Purpose &amp; Offline Portability</h2>
    <p>This document verifies the integrity of the <strong>JSON Backup (.json)</strong> serialization engine. All rich text nodes, styled tables, typography parameters, and visual illustrations are converted into self-contained base64 data structures.</p>
    
    <p style="text-align: center; margin: 20px 0;">
      <img src="${base64Diagram}" alt="JSON Backup Pipeline Architecture" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
    </p>
    
    <h2 style="color: #b45309; margin-top: 20px;">2. Performance &amp; Benchmarks</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #fef3c7;">
          <th style="border: 1px solid #fcd34d; padding: 10px; text-align: left; color: #92400e;">Metric</th>
          <th style="border: 1px solid #fcd34d; padding: 10px; text-align: left; color: #92400e;">Target SLA</th>
          <th style="border: 1px solid #fcd34d; padding: 10px; text-align: left; color: #92400e;">Observed Result</th>
          <th style="border: 1px solid #fcd34d; padding: 10px; text-align: left; color: #92400e;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">Base64 Image Extraction</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">&lt; 250ms</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;"><strong>64ms</strong></td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px; color: #16a34a;">Passed</td>
        </tr>
        <tr>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">Full Schema Validation</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">100% Compliant</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;"><strong>100%</strong></td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px; color: #16a34a;">Passed</td>
        </tr>
        <tr>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">Roundtrip Restore Latency</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;">&lt; 100ms</td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px;"><strong>38ms</strong></td>
          <td style="border: 1px solid #fcd34d; padding: 8px 10px; color: #16a34a;">Optimal</td>
        </tr>
      </tbody>
    </table>
    
    <h2 style="color: #b45309; margin-top: 20px;">3. Verification Checklist</h2>
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Client-side base64 encoding with MIME type detection</p></div></li>
      <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Complete metadata, headers, footers, and margins preservation</p></div></li>
      <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Automatic sync with LocalStorage and one-click restoration</p></div></li>
    </ul>
  `;

  return {
    schema: 'https://office.tiptap.engine/schemas/v2/backup.json',
    version: '2.0.0',
    generator: 'Office Pro Word Engine - JSON Backup System',
    timestamp: new Date().toISOString(),
    document: {
      title: 'Enterprise Architecture & JSON Backup Specification',
      htmlContent,
      plainText: 'Enterprise Architecture & JSON Backup Specification. System Specification v2.0.0. All rich text nodes and visual illustrations are converted into self-contained base64 data structures.',
      settings: {
        title: 'Enterprise Architecture & JSON Backup Specification',
        author: 'Chief Systems Architect',
        version: '2.0.0',
        pageColor: '#ffffff',
        isDarkMode: false,
        margins: 'normal',
        orientation: 'portrait',
        pageSize: 'letter',
        zoom: 100,
        showRuler: true,
        showGridlines: false,
        viewMode: 'print',
      },
      stats: {
        words: 168,
        characters: 1140,
        charactersNoSpaces: 980,
        paragraphs: 7,
        readingTimeMinutes: 1,
      },
    },
    media: {
      totalImages: 1,
      totalSizeBytes: base64Diagram.length,
      images: [
        {
          id: 'img_sample_1',
          name: 'JSON Backup Pipeline Architecture',
          mimeType: 'image/svg+xml',
          base64Data: base64Diagram,
          sizeBytes: base64Diagram.length,
          width: 600,
          height: 260,
        },
      ],
    },
    environment: {
      userAgent: 'Sample Engine Simulator',
      platform: 'Universal',
      exportedAtLocal: new Date().toLocaleString(),
    },
  };
}
