import JSZip from 'jszip';

export interface OdfEntry {
  name: string;
  size: number;
  compressedSize?: number;
  isDir: boolean;
  date?: Date;
}

export interface OdfExtractedPicture {
  name: string;
  relativePath: string;
  dataUrl: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface OdfInspectionResult {
  archiveName: string;
  projectName: string;
  fileSizeBytes: number;
  uncompressedSizeBytes: number;
  compressionRatio: string;
  totalEntries: number;
  entries: OdfEntry[];
  pictures: OdfExtractedPicture[];
  contentXml: string;
  stylesXml: string;
  metaXml: string;
  manifestXml: string;
  editorHtml: string;
  title: string;
  author: string;
  createdDate: string;
  updatedDate: string;
  cachedAt?: string;
}

export interface OdfExportOptions {
  title?: string;
  author?: string;
  projectName?: string;
  version?: string;
  createdDate?: string;
  updatedDate?: string;
}

export interface OdfCachedMeta {
  archiveName: string;
  projectName: string;
  fileSizeBytes: number;
  uncompressedSizeBytes: number;
  compressionRatio: string;
  pictureCount: number;
  entriesCount: number;
  title: string;
  author: string;
  cachedAt: string;
  picturesSummary: { name: string; sizeBytes: number; mimeType: string }[];
  snippetHtml: string;
}

const LOCAL_STORAGE_ODF_CACHE = 'office_web_odf_cache';
const LOCAL_STORAGE_ODF_SNAPSHOTS = 'word_doc_odf_snapshots';

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
 * Detect image MIME type from base64 or file extension
 */
function detectMimeType(src: string): string {
  if (src.startsWith('data:')) {
    const match = src.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64/);
    if (match && match[1]) return match[1];
  }
  if (/\.jpe?g($|\?)/i.test(src)) return 'image/jpeg';
  if (/\.png($|\?)/i.test(src)) return 'image/png';
  if (/\.gif($|\?)/i.test(src)) return 'image/gif';
  if (/\.webp($|\?)/i.test(src)) return 'image/webp';
  if (/\.svg($|\?)/i.test(src)) return 'image/svg+xml';
  return 'image/png';
}

function getExtensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    case 'image/svg+xml': return 'svg';
    case 'image/png':
    default:
      return 'png';
  }
}

/**
 * Escape text for XML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert DOM nodes inside HTML into OASIS OpenDocument XML tags
 */
function htmlElementToOdfXml(
  node: Node,
  imageMap: Map<string, { odfPath: string; mimeType: string }>
): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return '';
    return escapeXml(text);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Helper to convert child nodes
  const childrenXml = Array.from(el.childNodes)
    .map(child => htmlElementToOdfXml(child, imageMap))
    .join('');

  switch (tag) {
    case 'h1':
      return `<text:h text:style-name="Heading_20_1" text:outline-level="1">${childrenXml}</text:h>\n`;
    case 'h2':
      return `<text:h text:style-name="Heading_20_2" text:outline-level="2">${childrenXml}</text:h>\n`;
    case 'h3':
      return `<text:h text:style-name="Heading_20_3" text:outline-level="3">${childrenXml}</text:h>\n`;
    case 'h4':
      return `<text:h text:style-name="Heading_20_4" text:outline-level="4">${childrenXml}</text:h>\n`;
    case 'h5':
    case 'h6':
      return `<text:h text:style-name="Heading_20_5" text:outline-level="5">${childrenXml}</text:h>\n`;

    case 'p':
      return `<text:p text:style-name="Standard">${childrenXml || ' '}</text:p>\n`;

    case 'strong':
    case 'b':
      return `<text:span text:style-name="T_Bold">${childrenXml}</text:span>`;

    case 'em':
    case 'i':
      return `<text:span text:style-name="T_Italic">${childrenXml}</text:span>`;

    case 'u':
      return `<text:span text:style-name="T_Underline">${childrenXml}</text:span>`;

    case 's':
    case 'del':
    case 'strike':
      return `<text:span text:style-name="T_Strike">${childrenXml}</text:span>`;

    case 'code':
      return `<text:span text:style-name="T_Source_Code">${childrenXml}</text:span>`;

    case 'span': {
      // Check inline styles like color
      const color = el.style.color;
      if (color) {
        return `<text:span text:style-name="T_Color">${childrenXml}</text:span>`;
      }
      return childrenXml;
    }

    case 'a': {
      const href = el.getAttribute('href') || '#';
      return `<text:a xlink:type="simple" xlink:href="${escapeXml(href)}">${childrenXml}</text:a>`;
    }

    case 'ul':
      return `<text:list text:style-name="L_Bullet">${childrenXml}</text:list>\n`;

    case 'ol':
      return `<text:list text:style-name="L_Number">${childrenXml}</text:list>\n`;

    case 'li': {
      // Item contains a paragraph
      let content = childrenXml;
      if (!content.trim().startsWith('<text:p')) {
        content = `<text:p text:style-name="Standard">${content}</text:p>`;
      }
      return `<text:list-item>${content}</text:list-item>\n`;
    }

    case 'blockquote':
      return `<text:p text:style-name="Quotations">${childrenXml}</text:p>\n`;

    case 'pre':
      return `<text:p text:style-name="Preformatted_20_Text">${childrenXml}</text:p>\n`;

    case 'table': {
      return `<table:table table:name="Table_${Date.now()}" table:style-name="Table_Standard">\n${childrenXml}</table:table>\n`;
    }

    case 'thead':
    case 'tbody':
    case 'tfoot':
      return childrenXml;

    case 'tr':
      return `<table:table-row>\n${childrenXml}</table:table-row>\n`;

    case 'th':
    case 'td': {
      let cellContent = childrenXml;
      if (!cellContent.trim().startsWith('<text:p') && !cellContent.trim().startsWith('<text:h')) {
        cellContent = `<text:p text:style-name="Table_Contents">${cellContent || ' '}</text:p>`;
      }
      return `<table:table-cell office:value-type="string">\n${cellContent}\n</table:table-cell>\n`;
    }

    case 'hr':
      return `<text:p text:style-name="Horizontal_Line">________________________________________</text:p>\n`;

    case 'br':
      return `<text:line-break/>`;

    case 'img': {
      const src = el.getAttribute('src') || '';
      const mapped = imageMap.get(src);
      if (mapped) {
        const alt = el.getAttribute('alt') || 'Embedded Picture';
        const width = el.getAttribute('width') ? `${el.getAttribute('width')}px` : '15cm';
        const height = el.getAttribute('height') ? `${el.getAttribute('height')}px` : '10cm';
        return `<draw:frame draw:name="${escapeXml(alt)}" draw:style-name="fr1" text:anchor-type="as-char" svg:width="${width}" svg:height="${height}">
  <draw:image xlink:href="${mapped.odfPath}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
</draw:frame>\n`;
      }
      return '';
    }

    case 'div':
    case 'section':
    case 'article':
    default:
      return childrenXml;
  }
}

/**
 * Generate standard OASIS OpenDocument meta.xml
 */
function generateMetaXml(options: {
  title: string;
  author: string;
  createdDate: string;
  updatedDate: string;
  wordCount: number;
  paraCount: number;
  charCount: number;
}): string {
  const isoCreated = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:ooo="http://openoffice.org/2004/office"
  xmlns:grddl="http://www.w3.org/2003/g/data-view#"
  office:version="1.3">
  <office:meta>
    <meta:generator>OpenDocument Engine (ISO/IEC 26300 &amp; OASIS Compliant)</meta:generator>
    <dc:title>${escapeXml(options.title)}</dc:title>
    <dc:creator>${escapeXml(options.author)}</dc:creator>
    <meta:initial-creator>${escapeXml(options.author)}</meta:initial-creator>
    <dc:date>${isoCreated}</dc:date>
    <meta:creation-date>${isoCreated}</meta:creation-date>
    <meta:editing-cycles>1</meta:editing-cycles>
    <meta:editing-duration>PT15M</meta:editing-duration>
    <meta:document-statistic
      meta:paragraph-count="${options.paraCount}"
      meta:word-count="${options.wordCount}"
      meta:character-count="${options.charCount}"
      meta:table-count="1"
      meta:image-count="1"/>
  </office:meta>
</office:document-meta>`;
}

/**
 * Generate standard OASIS OpenDocument styles.xml
 */
function generateStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.3">
  <office:font-face-decls>
    <style:font-face style:name="Calibri" svg:font-family="Calibri" style:font-family-generic="swiss" style:font-pitch="variable"/>
    <style:font-face style:name="Segoe UI" svg:font-family="'Segoe UI'" style:font-family-generic="swiss" style:font-pitch="variable"/>
    <style:font-face style:name="Times New Roman" svg:font-family="'Times New Roman'" style:font-family-generic="roman" style:font-pitch="variable"/>
    <style:font-face style:name="Courier New" svg:font-family="'Courier New'" style:font-family-generic="modern" style:font-pitch="fixed"/>
  </office:font-face-decls>
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.25cm" fo:line-height="115%"/>
      <style:text-properties style:font-name="Calibri" fo:font-size="11pt" fo:color="#1e293b"/>
    </style:default-style>
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
    <style:style style:name="Heading_20_1" style:family="paragraph" style:parent-style-name="Standard" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.2cm"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="18pt" fo:font-weight="bold" fo:color="#0f172a"/>
    </style:style>
    <style:style style:name="Heading_20_2" style:family="paragraph" style:parent-style-name="Standard" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.35cm" fo:margin-bottom="0.15cm"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="14pt" fo:font-weight="bold" fo:color="#1e3a8a"/>
    </style:style>
    <style:style style:name="Heading_20_3" style:family="paragraph" style:parent-style-name="Standard" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.3cm" fo:margin-bottom="0.15cm"/>
      <style:text-properties style:font-name="Segoe UI" fo:font-size="12pt" fo:font-weight="bold" fo:color="#334155"/>
    </style:style>
  </office:styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="Mpm1"/>
  </office:master-styles>
</office:document-styles>`;
}

/**
 * Generate standard OASIS OpenDocument META-INF/manifest.xml
 */
function generateManifestXml(files: { path: string; mimeType: string }[]): string {
  const entries = files
    .map(f => `  <manifest:file-entry manifest:full-path="${escapeXml(f.path)}" manifest:media-type="${escapeXml(f.mimeType)}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
${entries}
</manifest:manifest>`;
}

/**
 * Generate full OASIS OpenDocument content.xml
 */
function generateContentXml(bodyTextXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
  xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0"
  xmlns:math="http://www.w3.org/1998/Math/MathML"
  xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"
  xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0"
  xmlns:ooo="http://openoffice.org/2004/office"
  xmlns:ooow="http://openoffice.org/2004/writer"
  xmlns:oooc="http://openoffice.org/2004/calc"
  xmlns:dom="http://www.w3.org/2001/xml-events"
  xmlns:xforms="http://www.w3.org/2002/xforms"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:rpt="http://openoffice.org/2005/report"
  xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:grddl="http://www.w3.org/2003/g/data-view#"
  xmlns:tableooo="http://openoffice.org/2009/table"
  xmlns:drawooo="http://openoffice.org/2010/draw"
  xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
  xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"
  xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0"
  xmlns:formx="urn:openoffice:names:experimental:ooxml-odf-interop:xmlns:form:1.0"
  xmlns:css3t="http://www.w3.org/TR/css3-text/"
  office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="T_Bold" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="T_Italic" style:family="text">
      <style:text-properties fo:font-style="italic"/>
    </style:style>
    <style:style style:name="T_Underline" style:family="text">
      <style:text-properties style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"/>
    </style:style>
    <style:style style:name="T_Strike" style:family="text">
      <style:text-properties style:text-line-through-style="solid"/>
    </style:style>
    <style:style style:name="T_Source_Code" style:family="text">
      <style:text-properties style:font-name="Courier New" fo:font-family="'Courier New'" fo:background-color="#f1f5f9" fo:color="#0f172a"/>
    </style:style>
    <style:style style:name="T_Color" style:family="text">
      <style:text-properties fo:color="#2563eb"/>
    </style:style>
    <style:style style:name="Table_Standard" style:family="table">
      <style:table-properties style:width="17cm" table:align="margins"/>
    </style:style>
    <style:style style:name="Table_Contents" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.1cm" fo:margin-bottom="0.1cm"/>
      <style:text-properties fo:font-size="10pt"/>
    </style:style>
    <style:style style:name="Quotations" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-left="1cm" fo:margin-right="1cm" fo:margin-top="0.25cm" fo:margin-bottom="0.25cm" fo:border-left="0.1cm solid #cbd5e1" fo:padding-left="0.3cm"/>
      <style:text-properties fo:font-style="italic" fo:color="#475569"/>
    </style:style>
    <style:style style:name="fr1" style:family="graphic" style:parent-style-name="Graphics">
      <style:graphic-properties style:wrap="parallel" style:number-wrapped-paragraphs="no-limit" style:vertical-pos="top" style:vertical-rel="paragraph" style:horizontal-pos="center" style:horizontal-rel="paragraph"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${bodyTextXml}
    </office:text>
  </office:body>
</office:document-content>`;
}

/**
 * EXPORT: Converts current editor HTML into an OASIS OpenDocument (.odt / .odf) package
 */
export async function exportOdfPackage(
  editorHtml: string,
  options: OdfExportOptions = {}
): Promise<{ blob: Blob; fileName: string; inspection: OdfInspectionResult }> {
  const docTitle = options.title || 'Untitled Document';
  const authorName = options.author || 'OpenDocument Editor';
  const rawProjectName = options.projectName || docTitle.replace(/\.[^.]+$/, '');
  const safeProjectName = rawProjectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'document';
  const fileName = `${safeProjectName}.odt`;

  // Parse HTML using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(editorHtml || '<p>Empty Document</p>', 'text/html');

  // Extract all images
  const images = Array.from(doc.querySelectorAll('img'));
  const imageMap = new Map<string, { odfPath: string; mimeType: string; bytes: Uint8Array }>();
  const extractedPictures: OdfExtractedPicture[] = [];

  let imgCounter = 1;
  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src) continue;

    if (!imageMap.has(src)) {
      const mimeType = detectMimeType(src);
      const ext = getExtensionForMime(mimeType);
      const odfPath = `Pictures/image${imgCounter}.${ext}`;
      const picName = `image${imgCounter}.${ext}`;
      imgCounter++;

      let bytes: Uint8Array;
      if (src.startsWith('data:')) {
        bytes = base64ToUint8Array(src);
      } else {
        try {
          const resp = await fetch(src);
          const buf = await resp.arrayBuffer();
          bytes = new Uint8Array(buf);
        } catch {
          // Fallback 1x1 transparent png
          bytes = base64ToUint8Array('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        }
      }

      imageMap.set(src, { odfPath, mimeType, bytes });
      extractedPictures.push({
        name: picName,
        relativePath: odfPath,
        dataUrl: src.startsWith('data:') ? src : `data:${mimeType};base64,${btoa(String.fromCharCode(...bytes.slice(0, 100)))}`,
        sizeBytes: bytes.byteLength,
        mimeType,
        width: img.naturalWidth || parseInt(img.getAttribute('width') || '0', 10) || undefined,
        height: img.naturalHeight || parseInt(img.getAttribute('height') || '0', 10) || undefined,
      });
    }
  }

  // Convert HTML Body to OpenDocument XML Body
  let bodyXml = '';
  Array.from(doc.body.childNodes).forEach(node => {
    bodyXml += htmlElementToOdfXml(node, imageMap);
  });

  if (!bodyXml.trim()) {
    bodyXml = `<text:p text:style-name="Standard">${escapeXml(doc.body.textContent || ' ')}</text:p>`;
  }

  // Stats calculation
  const textContent = doc.body.textContent || '';
  const words = textContent.trim().split(/\s+/).filter(Boolean).length;
  const chars = textContent.length;
  const paras = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr').length || 1;

  // Generate ODF XML parts
  const contentXml = generateContentXml(bodyXml);
  const stylesXml = generateStylesXml();
  const metaXml = generateMetaXml({
    title: docTitle,
    author: authorName,
    createdDate: options.createdDate || new Date().toLocaleString(),
    updatedDate: options.updatedDate || new Date().toLocaleString(),
    wordCount: words,
    charCount: chars,
    paraCount: paras,
  });

  const manifestFiles: { path: string; mimeType: string }[] = [];
  imageMap.forEach((val) => {
    manifestFiles.push({ path: val.odfPath, mimeType: val.mimeType });
  });
  const manifestXml = generateManifestXml(manifestFiles);

  // Package into standard ZIP container using JSZip
  const zip = new JSZip();

  // OASIS Standard: mimetype must be the FIRST file, and stored UNCOMPRESSED (stored)
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('content.xml', contentXml);
  zip.file('styles.xml', stylesXml);
  zip.file('meta.xml', metaXml);
  zip.file('META-INF/manifest.xml', manifestXml);

  // Add pictures
  imageMap.forEach((val) => {
    zip.file(val.odfPath, val.bytes);
  });

  // Generate Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.oasis.opendocument.text',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Build entries list
  const entries: OdfEntry[] = [];
  let uncompressedSize = 0;
  zip.forEach((relPath, entry) => {
    // estimate uncompressed size
    entries.push({
      name: relPath,
      size: (entry as any)._data ? (entry as any)._data.uncompressedSize || 0 : 0,
      isDir: entry.dir,
      date: entry.date,
    });
  });

  uncompressedSize = contentXml.length + stylesXml.length + metaXml.length + manifestXml.length;
  extractedPictures.forEach(p => uncompressedSize += p.sizeBytes);

  const fileSizeBytes = blob.size;
  const ratioNum = uncompressedSize > 0 ? Math.max(0, Math.round((1 - fileSizeBytes / uncompressedSize) * 100)) : 0;
  const compressionRatio = `${ratioNum}%`;

  const inspection: OdfInspectionResult = {
    archiveName: fileName,
    projectName: safeProjectName,
    fileSizeBytes,
    uncompressedSizeBytes: uncompressedSize,
    compressionRatio,
    totalEntries: entries.length,
    entries,
    pictures: extractedPictures,
    contentXml,
    stylesXml,
    metaXml,
    manifestXml,
    editorHtml,
    title: docTitle,
    author: authorName,
    createdDate: options.createdDate || new Date().toLocaleString(),
    updatedDate: options.updatedDate || new Date().toLocaleString(),
    cachedAt: new Date().toISOString(),
  };

  saveOdfToLocalCache({
    archiveName: fileName,
    projectName: safeProjectName,
    fileSizeBytes,
    uncompressedSizeBytes: uncompressedSize,
    compressionRatio,
    pictureCount: extractedPictures.length,
    entriesCount: entries.length,
    title: docTitle,
    author: authorName,
    cachedAt: new Date().toLocaleString(),
    picturesSummary: extractedPictures.map(p => ({
      name: p.name,
      sizeBytes: p.sizeBytes,
      mimeType: p.mimeType,
    })),
    snippetHtml: editorHtml.substring(0, 500),
  });

  return { blob, fileName, inspection };
}

/**
 * PARSE: Reads an OASIS OpenDocument (.odt / .odf) file, extracts embedded pictures, and reconstructs HTML
 */
export async function parseOdfPackage(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<{
  html: string;
  inspection: OdfInspectionResult;
  metadata: { title: string; author: string; createdDate: string; updatedDate: string };
}> {
  let buffer: ArrayBuffer;
  let archiveName = 'document.odt';

  if (fileOrBuffer instanceof File) {
    archiveName = fileOrBuffer.name;
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Blob) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  const zip = await JSZip.loadAsync(buffer);

  // Verify ODF mimetype or content.xml
  const hasContentXml = zip.file('content.xml') !== null;
  if (!hasContentXml) {
    throw new Error('Not a valid OpenDocument archive: missing content.xml');
  }

  const contentXml = await zip.file('content.xml')!.async('text');
  const stylesXml = zip.file('styles.xml') ? await zip.file('styles.xml')!.async('text') : '';
  const metaXml = zip.file('meta.xml') ? await zip.file('meta.xml')!.async('text') : '';
  const manifestXml = zip.file('META-INF/manifest.xml') ? await zip.file('META-INF/manifest.xml')!.async('text') : '';

  // Extract all pictures in Pictures/ or media/
  const extractedPictures: OdfExtractedPicture[] = [];
  const pictureDataMap = new Map<string, string>(); // relative path -> data URL

  const pictureEntries = Object.keys(zip.files).filter(path => {
    return (path.startsWith('Pictures/') || path.startsWith('media/') || path.startsWith('Images/')) && !zip.files[path].dir;
  });

  for (const picPath of pictureEntries) {
    const file = zip.files[picPath];
    const mimeType = detectMimeType(picPath);
    const base64Data = await file.async('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    const name = picPath.split('/').pop() || picPath;

    pictureDataMap.set(picPath, dataUrl);
    // Also store normalized without leading slash
    pictureDataMap.set(picPath.replace(/^\//, ''), dataUrl);

    extractedPictures.push({
      name,
      relativePath: picPath,
      dataUrl,
      sizeBytes: Math.round((base64Data.length * 3) / 4),
      mimeType,
    });
  }

  // Parse metadata from meta.xml
  let title = archiveName.replace(/\.[^.]+$/, '');
  let author = 'OpenDocument Author';
  let createdDate = new Date().toLocaleString();
  let updatedDate = new Date().toLocaleString();

  if (metaXml) {
    try {
      const metaDoc = new DOMParser().parseFromString(metaXml, 'text/xml');
      const titleEl = metaDoc.querySelector('title, dc\\:title');
      if (titleEl && titleEl.textContent?.trim()) title = titleEl.textContent.trim();

      const creatorEl = metaDoc.querySelector('creator, dc\\:creator, initial-creator, meta\\:initial-creator');
      if (creatorEl && creatorEl.textContent?.trim()) author = creatorEl.textContent.trim();

      const dateEl = metaDoc.querySelector('date, dc\\:date, creation-date, meta\\:creation-date');
      if (dateEl && dateEl.textContent?.trim()) {
        createdDate = new Date(dateEl.textContent.trim()).toLocaleString();
        updatedDate = createdDate;
      }
    } catch (e) {
      console.warn('Failed to parse meta.xml in ODF archive', e);
    }
  }

  // Convert content.xml to HTML for TipTap
  const contentDoc = new DOMParser().parseFromString(contentXml, 'text/xml');

  function odfNodeToHtml(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeXml(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const localName = el.localName || el.nodeName.split(':').pop() || '';

    const children = Array.from(el.childNodes).map(odfNodeToHtml).join('');

    switch (localName) {
      case 'h': {
        const level = el.getAttribute('text:outline-level') || '1';
        const hTag = `h${Math.min(6, Math.max(1, parseInt(level, 10)))}`;
        return `<${hTag}>${children || '&nbsp;'}</${hTag}>`;
      }

      case 'p':
        return `<p>${children || '&nbsp;'}</p>`;

      case 'span': {
        const styleName = el.getAttribute('text:style-name') || '';
        let wrap = children;
        if (/bold/i.test(styleName)) wrap = `<strong>${wrap}</strong>`;
        if (/italic/i.test(styleName)) wrap = `<em>${wrap}</em>`;
        if (/underline/i.test(styleName)) wrap = `<u>${wrap}</u>`;
        if (/strike/i.test(styleName)) wrap = `<s>${wrap}</s>`;
        return wrap;
      }

      case 'a': {
        const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '#';
        return `<a href="${escapeXml(href)}">${children}</a>`;
      }

      case 'list': {
        return `<ul>${children}</ul>`;
      }

      case 'list-item':
        return `<li>${children}</li>`;

      case 'table':
        return `<table border="1"><tbody>${children}</tbody></table>`;

      case 'table-row':
        return `<tr>${children}</tr>`;

      case 'table-cell':
        return `<td>${children || '&nbsp;'}</td>`;

      case 'frame': {
        // Find inner draw:image
        const imgEl = el.querySelector('image');
        if (imgEl) {
          const href = imgEl.getAttribute('xlink:href') || imgEl.getAttribute('href') || '';
          const cleanHref = href.replace(/^(\.\/|\/)/, '');
          const dataUrl = pictureDataMap.get(cleanHref) || pictureDataMap.get(href) || '';
          if (dataUrl) {
            return `<p><img src="${dataUrl}" alt="Embedded ODF Picture" style="max-width: 100%; height: auto; border-radius: 4px;" /></p>`;
          }
        }
        return children;
      }

      case 'image': {
        const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
        const cleanHref = href.replace(/^(\.\/|\/)/, '');
        const dataUrl = pictureDataMap.get(cleanHref) || pictureDataMap.get(href) || '';
        if (dataUrl) {
          return `<img src="${dataUrl}" alt="Embedded ODF Picture" style="max-width: 100%; height: auto;" />`;
        }
        return '';
      }

      case 'line-break':
        return `<br/>`;

      case 'body':
      case 'text':
      case 'document-content':
      default:
        return children;
    }
  }

  const officeText = contentDoc.querySelector('office\\:text, text');
  let finalHtml = '';
  if (officeText) {
    finalHtml = Array.from(officeText.childNodes).map(odfNodeToHtml).join('\n');
  } else {
    finalHtml = Array.from(contentDoc.childNodes).map(odfNodeToHtml).join('\n');
  }

  if (!finalHtml.trim()) {
    finalHtml = `<p>${escapeXml(contentDoc.textContent || 'Empty document')}</p>`;
  }

  // Compile entries
  const entries: OdfEntry[] = [];
  let uncompressedBytes = 0;
  zip.forEach((path, entry) => {
    entries.push({
      name: path,
      size: (entry as any)._data?.uncompressedSize || 0,
      isDir: entry.dir,
      date: entry.date,
    });
  });

  uncompressedBytes = contentXml.length + stylesXml.length + metaXml.length;
  extractedPictures.forEach(p => uncompressedBytes += p.sizeBytes);

  const fileSizeBytes = buffer.byteLength;
  const ratioNum = uncompressedBytes > 0 ? Math.max(0, Math.round((1 - fileSizeBytes / uncompressedBytes) * 100)) : 0;
  const compressionRatio = `${ratioNum}%`;

  const inspection: OdfInspectionResult = {
    archiveName,
    projectName: title.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
    fileSizeBytes,
    uncompressedSizeBytes: uncompressedBytes,
    compressionRatio,
    totalEntries: entries.length,
    entries,
    pictures: extractedPictures,
    contentXml,
    stylesXml,
    metaXml,
    manifestXml,
    editorHtml: finalHtml,
    title,
    author,
    createdDate,
    updatedDate,
    cachedAt: new Date().toISOString(),
  };

  saveOdfToLocalCache({
    archiveName,
    projectName: title.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
    fileSizeBytes,
    uncompressedSizeBytes: uncompressedBytes,
    compressionRatio,
    pictureCount: extractedPictures.length,
    entriesCount: entries.length,
    title,
    author,
    cachedAt: new Date().toLocaleString(),
    picturesSummary: extractedPictures.map(p => ({
      name: p.name,
      sizeBytes: p.sizeBytes,
      mimeType: p.mimeType,
    })),
    snippetHtml: finalHtml.substring(0, 500),
  });

  return {
    html: finalHtml,
    inspection,
    metadata: { title, author, createdDate, updatedDate },
  };
}

/**
 * Local Storage helpers
 */
export function saveOdfToLocalCache(data: OdfCachedMeta): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ODF_CACHE, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache ODF metadata in localStorage', e);
  }
}

export function loadOdfFromLocalCache(): OdfCachedMeta | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ODF_CACHE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearOdfLocalCache(): void {
  localStorage.removeItem(LOCAL_STORAGE_ODF_CACHE);
}

/**
 * Trigger file download helper
 */
export function triggerOdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Sample rich ODF content generator for immediate testing
 */
export function getSampleOdfHtml(): string {
  return `<h1>Global Climate &amp; Renewable Energy Report 2026</h1>
<p>This document is authored and compiled in strict compliance with the <strong>OASIS OpenDocument Format (ISO/IEC 26300)</strong> standard. The OpenDocument specification defines a vendor-neutral, XML-based file format for office applications.</p>
<h2>1. Executive Summary &amp; Key Findings</h2>
<p>Rapid advances in solar photovoltaic technology, offshore wind farms, and grid-scale lithium-iron-phosphate battery storage systems have reduced global clean energy generation costs by <em>42% over the last five years</em>.</p>
<p><img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='260' viewBox='0 0 600 260'><rect width='600' height='260' fill='%230e7490' rx='12'/><text x='300' y='50' fill='white' font-family='sans-serif' font-size='20' font-weight='bold' text-anchor='middle'>Global Renewable Capacity Growth</text><rect x='60' y='160' width='80' height='60' fill='%2338bdf8' rx='4'/><rect x='160' y='130' width='80' height='90' fill='%2338bdf8' rx='4'/><rect x='260' y='100' width='80' height='120' fill='%2338bdf8' rx='4'/><rect x='360' y='70' width='80' height='150' fill='%2338bdf8' rx='4'/><rect x='460' y='40' width='80' height='180' fill='%23f59e0b' rx='4'/><text x='100' y='240' fill='white' font-family='sans-serif' font-size='12' text-anchor='middle'>2022</text><text x='200' y='240' fill='white' font-family='sans-serif' font-size='12' text-anchor='middle'>2023</text><text x='300' y='240' fill='white' font-family='sans-serif' font-size='12' text-anchor='middle'>2024</text><text x='400' y='240' fill='white' font-family='sans-serif' font-size='12' text-anchor='middle'>2025</text><text x='500' y='240' fill='%23f59e0b' font-family='sans-serif' font-size='12' font-weight='bold' text-anchor='middle'>2026 (Target)</text></svg>" alt="Clean Energy Trends Diagram" /></p>
<h2>2. Technical Performance Matrix</h2>
<p>Below is the comparative breakdown of generation efficiency across key energy vectors:</p>
<table border="1">
  <thead>
    <tr>
      <th><strong>Energy Sector</strong></th>
      <th><strong>2024 Capacity (GW)</strong></th>
      <th><strong>2026 Forecast (GW)</strong></th>
      <th><strong>YoY Growth</strong></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Utility Solar PV</td>
      <td>1,420</td>
      <td>2,150</td>
      <td>+51.4%</td>
    </tr>
    <tr>
      <td>Offshore Wind</td>
      <td>380</td>
      <td>620</td>
      <td>+63.1%</td>
    </tr>
    <tr>
      <td>Grid Battery Storage</td>
      <td>190</td>
      <td>480</td>
      <td>+152.6%</td>
    </tr>
  </tbody>
</table>
<blockquote>"The transition to open document standards guarantees archival stability and digital longevity across decades without fear of proprietary lock-in." — OASIS Technical Committee</blockquote>
<p>Every element in this file is structured into clean <code>office:body</code>, <code>office:text</code>, and <code>Pictures/</code> parts ready for LibreOffice Writer, Google Docs, and Microsoft Word.</p>`;
}
