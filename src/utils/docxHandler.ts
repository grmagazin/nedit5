import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  AlignmentType,
  UnderlineType,
  ShadingType,
} from 'docx';

export interface DocxZipEntry {
  name: string;
  size: number;
  compressedSize?: number;
  isDir: boolean;
  date?: Date;
}

export interface DocxExtractedMedia {
  name: string;
  dataUrl: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface DocxInspectionResult {
  fileName: string;
  fileSizeBytes: number;
  totalEntries: number;
  entries: DocxZipEntry[];
  media: DocxExtractedMedia[];
  documentXmlSnippet: string;
  htmlContent: string;
  extractedStylesCount?: {
    coloredRuns: number;
    customSizedRuns: number;
    boldRuns: number;
    imagesCount: number;
    tablesCount: number;
  };
}

/**
 * CSS Color to 6-character Hex string (e.g. "185ABD") for DOCX
 */
export function cssColorToHex(colorStr?: string | null): string | undefined {
  if (!colorStr) return undefined;
  const c = colorStr.trim();
  if (!c || c === 'inherit' || c === 'transparent' || c === 'initial') return undefined;

  // Hex format #RGB or #RRGGBB
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    return hex.slice(0, 6).toUpperCase();
  }

  // RGB / RGBA format
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }

  // Standard named colors
  const namedColors: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    red: 'DC2626',
    blue: '185ABD',
    green: '16A34A',
    yellow: 'FACC15',
    orange: 'EA580C',
    purple: '9333EA',
    pink: 'EC4899',
    gray: '6B7280',
    grey: '6B7280',
    slate: '475569',
  };
  return namedColors[c.toLowerCase()];
}

/**
 * Convert CSS font size string (e.g. "14pt", "24px", "1.5rem") to DOCX half-points (e.g. 28)
 */
export function fontSizeToHalfPoints(sizeStr?: string | null): number | undefined {
  if (!sizeStr) return undefined;
  const s = sizeStr.trim().toLowerCase();
  if (s.endsWith('pt')) {
    const val = parseFloat(s);
    return isNaN(val) ? undefined : Math.round(val * 2);
  }
  if (s.endsWith('px')) {
    const px = parseFloat(s);
    return isNaN(px) ? undefined : Math.round((px * 72 / 96) * 2);
  }
  if (s.endsWith('rem') || s.endsWith('em')) {
    const em = parseFloat(s);
    return isNaN(em) ? undefined : Math.round((em * 12) * 2);
  }
  const num = parseFloat(s);
  return isNaN(num) ? undefined : Math.round(num * 2);
}

/**
 * Convert Base64 string to Uint8Array
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
 * Convert image (data URL or URL) to a standard DOCX-compatible binary format and detect type
 */
async function processImageForDocx(
  src: string
): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' } | null> {
  try {
    if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
      return { bytes: base64ToUint8Array(src), type: 'jpg' };
    }
    if (src.startsWith('data:image/gif')) {
      return { bytes: base64ToUint8Array(src), type: 'gif' };
    }
    if (src.startsWith('data:image/png')) {
      return { bytes: base64ToUint8Array(src), type: 'png' };
    }

    // For external URLs, SVG, or WebP, fetch and rasterize to PNG via Canvas
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = img.naturalWidth || 400;
          const h = img.naturalHeight || 300;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL('image/png');
            resolve({ bytes: base64ToUint8Array(pngUrl), type: 'png' });
            return;
          }
        } catch (e) {
          console.warn('Canvas rasterization failed:', e);
        }
        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch (err) {
    console.warn('Could not process image for DOCX export:', err);
    return null;
  }
}

/**
 * Measure image intrinsic and scaled dimensions preserving aspect ratio
 * Max page printable width is ~580px
 */
export async function getImageDimensions(
  src: string,
  imgEl?: HTMLImageElement
): Promise<{ width: number; height: number }> {
  let width = 0;
  let height = 0;

  if (imgEl) {
    const attrW = imgEl.getAttribute('width');
    const attrH = imgEl.getAttribute('height');
    if (attrW) width = parseInt(attrW, 10);
    if (attrH) height = parseInt(attrH, 10);

    if (!width && imgEl.style.width) width = parseInt(imgEl.style.width, 10);
    if (!height && imgEl.style.height) height = parseInt(imgEl.style.height, 10);

    if (imgEl.naturalWidth && !width) width = imgEl.naturalWidth;
    if (imgEl.naturalHeight && !height) height = imgEl.naturalHeight;
  }

  if (width > 0 && height > 0) {
    const maxWidth = 580;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    return { width, height };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 450;
      let h = img.naturalHeight || 300;
      const maxWidth = 580;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      resolve({ width: 450, height: 280 });
    };
    img.src = src;
  });
}

/**
 * High-Fidelity OpenXML to HTML Converter:
 * Parses word/document.xml with full support for:
 * - Bold, Italic, Underline, Strikethrough
 * - Exact Text Colors (w:color)
 * - Exact Font Sizes (w:sz -> pt)
 * - Exact Font Families (w:rFonts)
 * - Highlights & Shading (w:highlight, w:shd)
 * - Paragraph Alignment (w:jc: center, right, both, left)
 * - Embedded Images with real dimensions & aspect ratio from _rels
 * - Full Tables with cell backgrounds and borders
 */
export function openXmlToHtml(
  xmlString: string,
  relMap: Map<string, string>,
  mediaMap: Map<string, DocxExtractedMedia>
): { html: string; stats: { coloredRuns: number; customSizedRuns: number; boldRuns: number; imagesCount: number; tablesCount: number } } {
  const stats = {
    coloredRuns: 0,
    customSizedRuns: 0,
    boldRuns: 0,
    imagesCount: 0,
    tablesCount: 0,
  };

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  const body = xmlDoc.querySelector('w\\:body, body');

  if (!body) {
    return { html: '', stats };
  }

  let htmlResult = '';

  // Helper to escape HTML text
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Helper to parse a single run (w:r)
  const parseRun = (rNode: Element): string => {
    // Check for images inside run (w:drawing or w:pict)
    const drawing = rNode.querySelector('w\\:drawing, drawing, w\\:pict, pict');
    if (drawing) {
      // Find blip embed ID
      const blip = drawing.querySelector('a\\:blip, blip');
      const imagedata = drawing.querySelector('v\\:imagedata, imagedata');
      const rId =
        blip?.getAttribute('r:embed') ||
        blip?.getAttribute('embed') ||
        imagedata?.getAttribute('r:id') ||
        imagedata?.getAttribute('id');

      if (rId && relMap.has(rId)) {
        const mediaPath = relMap.get(rId)!;
        const normalizedName = mediaPath.replace(/^.*[\\/]/, '');
        const media = mediaMap.get(normalizedName) || mediaMap.get(mediaPath);

        if (media) {
          stats.imagesCount++;
          // Read extent cx and cy (914400 EMUs = 1 inch = 96 px -> 1 px = 9525 EMUs)
          const extent = drawing.querySelector('wp\\:extent, extent');
          let widthStyle = 'max-width: 100%; height: auto;';
          let widthAttr = '';
          let heightAttr = '';

          if (extent) {
            const cx = parseInt(extent.getAttribute('cx') || '0', 10);
            const cy = parseInt(extent.getAttribute('cy') || '0', 10);
            if (cx > 0 && cy > 0) {
              const wPx = Math.round(cx / 9525);
              const hPx = Math.round(cy / 9525);
              widthAttr = ` width="${wPx}"`;
              heightAttr = ` height="${hPx}"`;
              widthStyle = `width: ${wPx}px; max-width: 100%; height: auto;`;
            }
          }

          return `<img src="${media.dataUrl}" alt="${escapeHtml(media.name)}"${widthAttr}${heightAttr} style="${widthStyle} border-radius: 4px; margin: 8px 0; display: inline-block;" />`;
        }
      }
    }

    // Read text inside w:t
    const tNodes = Array.from(rNode.querySelectorAll('w\\:t, t'));
    let text = '';
    for (const t of tNodes) {
      text += t.textContent || '';
    }

    // Check for line breaks
    if (rNode.querySelector('w\\:br, br')) {
      text += '<br/>';
    }

    if (!text) return '';

    // Run properties (w:rPr)
    const rPr = rNode.querySelector('w\\:rPr, rPr');
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrike = false;
    let color: string | null = null;
    let fontSizePt: number | null = null;
    let fontFamily: string | null = null;
    let highlight: string | null = null;

    if (rPr) {
      // Bold
      const bNode = rPr.querySelector('w\\:b, b');
      if (bNode) {
        const val = bNode.getAttribute('w:val');
        if (val !== '0' && val !== 'false') {
          isBold = true;
          stats.boldRuns++;
        }
      }

      // Italic
      const iNode = rPr.querySelector('w\\:i, i');
      if (iNode) {
        const val = iNode.getAttribute('w:val');
        if (val !== '0' && val !== 'false') isItalic = true;
      }

      // Underline
      const uNode = rPr.querySelector('w\\:u, u');
      if (uNode) {
        const val = uNode.getAttribute('w:val');
        if (val && val !== 'none') isUnderline = true;
      }

      // Strike
      if (rPr.querySelector('w\\:strike, strike, w\\:dstrike, dstrike')) {
        isStrike = true;
      }

      // Text color
      const colorNode = rPr.querySelector('w\\:color, color');
      if (colorNode) {
        const val = colorNode.getAttribute('w:val');
        if (val && val !== 'auto' && val !== '000000') {
          color = `#${val}`;
          stats.coloredRuns++;
        }
      }

      // Font size (w:sz is in half-points)
      const szNode = rPr.querySelector('w\\:sz, sz');
      if (szNode) {
        const val = szNode.getAttribute('w:val');
        if (val) {
          const halfPoints = parseInt(val, 10);
          if (!isNaN(halfPoints) && halfPoints > 0) {
            fontSizePt = halfPoints / 2;
            stats.customSizedRuns++;
          }
        }
      }

      // Font family
      const fontsNode = rPr.querySelector('w\\:rFonts, rFonts');
      if (fontsNode) {
        fontFamily =
          fontsNode.getAttribute('w:ascii') ||
          fontsNode.getAttribute('w:hAnsi') ||
          fontsNode.getAttribute('ascii');
      }

      // Highlight
      const hlNode = rPr.querySelector('w\\:highlight, highlight');
      if (hlNode) {
        const val = hlNode.getAttribute('w:val');
        if (val && val !== 'none') {
          highlight = val;
        }
      }
    }

    // Build styled HTML span
    let inner = escapeHtml(text);
    if (isStrike) inner = `<s>${inner}</s>`;
    if (isUnderline) inner = `<u>${inner}</u>`;
    if (isItalic) inner = `<em>${inner}</em>`;
    if (isBold) inner = `<strong>${inner}</strong>`;

    const styles: string[] = [];
    if (color) styles.push(`color: ${color}`);
    if (fontSizePt) styles.push(`font-size: ${fontSizePt}pt`);
    if (fontFamily) styles.push(`font-family: '${fontFamily}', sans-serif`);
    if (highlight) styles.push(`background-color: ${highlight}`);

    if (styles.length > 0) {
      return `<span style="${styles.join('; ')}">${inner}</span>`;
    }
    return inner;
  };

  // Helper to parse a paragraph (w:p)
  const parseParagraph = (pNode: Element): string => {
    const pPr = pNode.querySelector('w\\:pPr, pPr');

    // Alignment
    let align = 'left';
    const jc = pPr?.querySelector('w\\:jc, jc');
    if (jc) {
      const val = jc.getAttribute('w:val');
      if (val === 'center') align = 'center';
      else if (val === 'right') align = 'right';
      else if (val === 'both') align = 'justify';
    }

    // Heading Style
    let tagName = 'p';
    const pStyle = pPr?.querySelector('w\\:pStyle, pStyle');
    if (pStyle) {
      const val = pStyle.getAttribute('w:val')?.toLowerCase() || '';
      if (val.includes('heading1') || val === 'title') tagName = 'h1';
      else if (val.includes('heading2') || val === 'subtitle') tagName = 'h2';
      else if (val.includes('heading3')) tagName = 'h3';
      else if (val.includes('heading4')) tagName = 'h4';
    }

    // Check if list item
    const numPr = pPr?.querySelector('w\\:numPr, numPr');
    const isListItem = Boolean(numPr);

    // Parse children runs in sequential order
    let content = '';
    const childRuns = Array.from(pNode.children).filter((c) => {
      const name = c.localName || c.tagName.split(':').pop();
      return name === 'r' || name === 'drawing' || name === 'hyperlink';
    });

    for (const child of childRuns) {
      const name = child.localName || child.tagName.split(':').pop();
      if (name === 'r' || name === 'drawing') {
        content += parseRun(child);
      } else if (name === 'hyperlink') {
        const subRuns = Array.from(child.querySelectorAll('w\\:r, r'));
        let linkText = '';
        for (const sr of subRuns) linkText += parseRun(sr);
        content += `<a href="#">${linkText}</a>`;
      }
    }

    if (!content.trim()) {
      return '<p><br/></p>';
    }

    const pStyles: string[] = [];
    if (align !== 'left') pStyles.push(`text-align: ${align}`);

    const styleAttr = pStyles.length > 0 ? ` style="${pStyles.join('; ')}"` : '';

    if (isListItem) {
      return `<ul><li>${content}</li></ul>`;
    }

    return `<${tagName}${styleAttr}>${content}</${tagName}>`;
  };

  // Helper to parse a table (w:tbl)
  const parseTable = (tblNode: Element): string => {
    stats.tablesCount++;
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;"><tbody>';

    const rows = Array.from(tblNode.querySelectorAll('w\\:tr, tr'));
    for (const tr of rows) {
      tableHtml += '<tr>';
      const cells = Array.from(tr.querySelectorAll('w\\:tc, tc'));
      for (const tc of cells) {
        const tcPr = tc.querySelector('w\\:tcPr, tcPr');
        const shd = tcPr?.querySelector('w\\:shd, shd');
        const fill = shd?.getAttribute('w:fill');

        const cellStyles: string[] = [
          'border: 1px solid #cbd5e1',
          'padding: 8px 12px',
          'vertical-align: top',
        ];

        if (fill && fill !== 'auto') {
          cellStyles.push(`background-color: #${fill}`);
        }

        let cellContent = '';
        const pNodes = Array.from(tc.querySelectorAll('w\\:p, p'));
        for (const p of pNodes) {
          cellContent += parseParagraph(p);
        }

        tableHtml += `<td style="${cellStyles.join('; ')}">${cellContent || '&nbsp;'}</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table>';
    return tableHtml;
  };

  // Iterate top-level children of body in document order
  const topNodes = Array.from(body.children);
  for (const node of topNodes) {
    const name = node.localName || node.tagName.split(':').pop();
    if (name === 'p') {
      htmlResult += parseParagraph(node);
    } else if (name === 'tbl') {
      htmlResult += parseTable(node);
    }
  }

  return { html: htmlResult, stats };
}

/**
 * Parse an uploaded .docx file in-memory using JSZip + High-Fidelity OpenXML Engine
 * with fallback to Mammoth.js
 */
export async function parseDocxFile(
  file: File | ArrayBuffer,
  fileName = 'document.docx'
): Promise<DocxInspectionResult> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const fileSizeBytes = arrayBuffer.byteLength;

  // 1. Unzip via JSZip
  const zip = await JSZip.loadAsync(arrayBuffer);
  const entries: DocxZipEntry[] = [];
  const media: DocxExtractedMedia[] = [];
  const mediaMap = new Map<string, DocxExtractedMedia>();
  const relMap = new Map<string, string>();
  let documentXmlText = '';
  let documentXmlSnippet = '';

  const filePromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    entries.push({
      name: relativePath,
      size: (zipEntry as any)._data?.uncompressedSize || 0,
      compressedSize: (zipEntry as any)._data?.compressedSize || 0,
      isDir: zipEntry.dir,
      date: zipEntry.date,
    });

    // Check for document.xml
    if (relativePath === 'word/document.xml') {
      filePromises.push(
        zipEntry.async('text').then((text) => {
          documentXmlText = text;
          documentXmlSnippet = text.slice(0, 3000);
        })
      );
    }

    // Check for relationships
    if (relativePath === 'word/_rels/document.xml.rels') {
      filePromises.push(
        zipEntry.async('text').then((relsText) => {
          const parser = new DOMParser();
          const relsDoc = parser.parseFromString(relsText, 'application/xml');
          const relElements = Array.from(relsDoc.querySelectorAll('Relationship, relationship'));
          for (const rel of relElements) {
            const id = rel.getAttribute('Id') || rel.getAttribute('id');
            const target = rel.getAttribute('Target') || rel.getAttribute('target');
            if (id && target) {
              relMap.set(id, target);
            }
          }
        })
      );
    }

    // Check for media files
    if (relativePath.startsWith('word/media/') && !zipEntry.dir) {
      const fileNameOnly = relativePath.replace('word/media/', '');
      const ext = fileNameOnly.split('.').pop()?.toLowerCase() || 'png';
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'svg') mimeType = 'image/svg+xml';
      else if (ext === 'webp') mimeType = 'image/webp';

      filePromises.push(
        zipEntry.async('base64').then((base64) => {
          const dataUrl = `data:${mimeType};base64,${base64}`;
          const approxSize = Math.round((base64.length * 3) / 4);
          const item: DocxExtractedMedia = {
            name: fileNameOnly,
            dataUrl,
            sizeBytes: approxSize,
            mimeType,
          };
          media.push(item);
          mediaMap.set(fileNameOnly, item);
          mediaMap.set(relativePath, item);
          mediaMap.set(`media/${fileNameOnly}`, item);
        })
      );
    }
  });

  await Promise.all(filePromises);

  // 2. High-Fidelity OpenXML Parsing
  let htmlContent = '';
  let extractedStats = {
    coloredRuns: 0,
    customSizedRuns: 0,
    boldRuns: 0,
    imagesCount: 0,
    tablesCount: 0,
  };

  if (documentXmlText) {
    try {
      const openXmlResult = openXmlToHtml(documentXmlText, relMap, mediaMap);
      if (openXmlResult.html && openXmlResult.html.trim().length > 30) {
        htmlContent = openXmlResult.html;
        extractedStats = openXmlResult.stats;
      }
    } catch (err) {
      console.warn('OpenXML custom parser warning, falling back to Mammoth:', err);
    }
  }

  // 3. Fallback to Mammoth if needed
  if (!htmlContent) {
    try {
      const mammothResult = await (mammoth as any).convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "u => u",
            "strike => s",
            "highlight => mark",
          ],
          convertImage: (mammoth as any).images.imgElement((image: any) => {
            return image.read('base64').then((imageBuffer: string) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`,
              };
            });
          }),
        }
      );
      htmlContent = mammothResult.value || '';
    } catch (err) {
      console.error('Mammoth conversion error:', err);
      htmlContent = `<p>Document parsed (${entries.length} files in archive).</p>`;
    }
  }

  // Sort entries: directories first, then files
  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    fileName,
    fileSizeBytes,
    totalEntries: entries.length,
    entries,
    media,
    documentXmlSnippet,
    htmlContent,
    extractedStylesCount: extractedStats,
  };
}

/**
 * High-Fidelity Export from HTML string to real ECMA-376 .docx file:
 * - Preserves EXACT image order in document flow
 * - Preserves exact image aspect ratio and scales neatly for printable page width
 * - Preserves font colors, sizes, families, bolds, italics, underlines, and alignments
 * - Preserves full table layouts, cell background colors, and cell text styles
 */
export async function exportDocxFromHtml(html: string, title = 'Document'): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const docxChildren: any[] = [];

  // Helper: process inline nodes into TextRun and ImageRun in sequential order
  const processInlineNodes = async (
    parentElement: HTMLElement | ChildNode,
    inheritedStyles: {
      bold?: boolean;
      italics?: boolean;
      underline?: boolean;
      strike?: boolean;
      color?: string;
      size?: number;
      font?: string;
      shading?: string;
    } = {}
  ): Promise<any[]> => {
    const runs: any[] = [];

    for (const child of Array.from(parentElement.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (text) {
          const runOptions: any = {
            text,
            bold: inheritedStyles.bold,
            italics: inheritedStyles.italics,
            strike: inheritedStyles.strike,
          };
          if (inheritedStyles.underline) {
            runOptions.underline = { type: UnderlineType.SINGLE };
          }
          if (inheritedStyles.color) {
            runOptions.color = inheritedStyles.color;
          }
          if (inheritedStyles.size) {
            runOptions.size = inheritedStyles.size;
          }
          if (inheritedStyles.font) {
            runOptions.font = inheritedStyles.font;
          }
          if (inheritedStyles.shading) {
            runOptions.shading = {
              fill: inheritedStyles.shading,
              type: ShadingType.CLEAR,
            };
          }
          runs.push(new TextRun(runOptions));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // If child is an image, preserve its exact sequential order in the run stream!
        if (tagName === 'img') {
          const imgEl = el as HTMLImageElement;
          const src = imgEl.src || imgEl.getAttribute('src');
          if (src) {
            const imgData = await processImageForDocx(src);
            if (imgData && imgData.bytes.length > 0) {
              const dims = await getImageDimensions(src, imgEl);
              runs.push(
                new ImageRun({
                  data: imgData.bytes,
                  transformation: {
                    width: dims.width,
                    height: dims.height,
                  },
                  type: imgData.type,
                })
              );
            }
          }
          continue;
        }

        // Compute styling for inline element
        const currentStyles = { ...inheritedStyles };

        if (tagName === 'strong' || tagName === 'b' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0', 10) >= 600) {
          currentStyles.bold = true;
        }
        if (tagName === 'em' || tagName === 'i' || el.style.fontStyle === 'italic') {
          currentStyles.italics = true;
        }
        if (tagName === 'u' || el.style.textDecoration?.includes('underline')) {
          currentStyles.underline = true;
        }
        if (tagName === 's' || tagName === 'del' || el.style.textDecoration?.includes('line-through')) {
          currentStyles.strike = true;
        }

        const hexColor = cssColorToHex(el.style.color);
        if (hexColor) currentStyles.color = hexColor;

        const halfPts = fontSizeToHalfPoints(el.style.fontSize);
        if (halfPts) currentStyles.size = halfPts;

        if (el.style.fontFamily) {
          currentStyles.font = el.style.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
        }

        const bgHex = cssColorToHex(el.style.backgroundColor);
        if (bgHex) currentStyles.shading = bgHex;
        if (tagName === 'mark') currentStyles.shading = 'FEF08A';

        // Recurse child nodes
        const subRuns = await processInlineNodes(el, currentStyles);
        runs.push(...subRuns);
      }
    }

    return runs;
  };

  // Helper: get alignment from style or attribute
  const getAlignment = (el: HTMLElement): typeof AlignmentType[keyof typeof AlignmentType] => {
    const align = (el.style.textAlign || el.getAttribute('align') || '').toLowerCase();
    if (align === 'center') return AlignmentType.CENTER;
    if (align === 'right') return AlignmentType.RIGHT;
    if (align === 'justify') return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
  };

  // Helper: process block elements
  const processBlock = async (el: HTMLElement) => {
    const tagName = el.tagName.toLowerCase();

    // 1. Standalone Images
    if (tagName === 'img') {
      const imgEl = el as HTMLImageElement;
      const src = imgEl.src || imgEl.getAttribute('src');
      if (src) {
        const imgData = await processImageForDocx(src);
        if (imgData && imgData.bytes.length > 0) {
          const dims = await getImageDimensions(src, imgEl);
          docxChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: imgData.bytes,
                  transformation: {
                    width: dims.width,
                    height: dims.height,
                  },
                  type: imgData.type,
                }),
              ],
              spacing: { before: 180, after: 180 },
            })
          );
        }
      }
      return;
    }

    // 2. Headings
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      let level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1;
      let defaultSize = 36; // 18pt
      if (tagName === 'h2') {
        level = HeadingLevel.HEADING_2;
        defaultSize = 30; // 15pt
      } else if (tagName === 'h3') {
        level = HeadingLevel.HEADING_3;
        defaultSize = 26; // 13pt
      }

      const alignment = getAlignment(el);
      const runs = await processInlineNodes(el, {
        bold: true,
        size: fontSizeToHalfPoints(el.style.fontSize) || defaultSize,
        color: cssColorToHex(el.style.color),
      });

      docxChildren.push(
        new Paragraph({
          heading: level,
          alignment,
          children: runs.length > 0 ? runs : [new TextRun({ text: el.textContent || '', bold: true })],
          spacing: { before: 240, after: 120 },
        })
      );
      return;
    }

    // 3. Blockquotes
    if (tagName === 'blockquote') {
      const runs = await processInlineNodes(el, {
        italics: true,
        color: cssColorToHex(el.style.color) || '4B5563',
      });
      docxChildren.push(
        new Paragraph({
          children: runs,
          indent: { left: 720 },
          spacing: { before: 140, after: 140 },
        })
      );
      return;
    }

    // 4. Tables
    if (tagName === 'table') {
      const rows: TableRow[] = [];
      const trElements = Array.from(el.querySelectorAll('tr'));

      for (const tr of trElements) {
        const cells: TableCell[] = [];
        const cellElements = Array.from(tr.querySelectorAll('th, td')) as HTMLElement[];

        for (const cellEl of cellElements) {
          const isHeader = cellEl.tagName.toLowerCase() === 'th';
          const bgHex = cssColorToHex(cellEl.style.backgroundColor);
          const cellRuns = await processInlineNodes(cellEl, {
            bold: isHeader || cellEl.style.fontWeight === 'bold',
            color: cssColorToHex(cellEl.style.color),
          });

          const cellOptions: any = {
            children: [
              new Paragraph({
                children: cellRuns.length > 0 ? cellRuns : [new TextRun({ text: cellEl.textContent?.trim() || '' })],
                alignment: getAlignment(cellEl),
              }),
            ],
            width: {
              size: Math.floor(100 / (cellElements.length || 1)),
              type: WidthType.PERCENTAGE,
            },
          };

          if (bgHex) {
            cellOptions.shading = {
              fill: bgHex,
              type: ShadingType.CLEAR,
            };
          } else if (isHeader) {
            cellOptions.shading = {
              fill: 'F1F5F9',
              type: ShadingType.CLEAR,
            };
          }

          cells.push(new TableCell(cellOptions));
        }

        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
      }

      if (rows.length > 0) {
        docxChildren.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      }
      return;
    }

    // 5. Lists (ul, ol)
    if (tagName === 'ul' || tagName === 'ol') {
      const liElements = Array.from(el.querySelectorAll('li')) as HTMLElement[];
      for (const li of liElements) {
        const runs = await processInlineNodes(li);
        docxChildren.push(
          new Paragraph({
            children: runs,
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      }
      return;
    }

    // 6. Standard Paragraph / Div
    const alignment = getAlignment(el);
    const runs = await processInlineNodes(el, {
      color: cssColorToHex(el.style.color),
      size: fontSizeToHalfPoints(el.style.fontSize),
    });

    if (runs.length > 0) {
      docxChildren.push(
        new Paragraph({
          alignment,
          children: runs,
          spacing: { after: 120, line: 276 },
        })
      );
    }
  };

  // Top level elements
  const topElements = Array.from(body.childNodes);
  for (const node of topElements) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      await processBlock(node as HTMLElement);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      docxChildren.push(
        new Paragraph({
          children: [new TextRun({ text: node.textContent.trim() })],
          spacing: { after: 120 },
        })
      );
    }
  }

  // Fallback if empty document
  if (docxChildren.length === 0) {
    docxChildren.push(new Paragraph({ text: body.textContent || title }));
  }

  const docxDocument = new Document({
    title,
    sections: [
      {
        properties: {},
        children: docxChildren,
      },
    ],
  });

  return await Packer.toBlob(docxDocument);
}

/**
 * Trigger browser file download
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
