import { Editor } from '@tiptap/react';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { DocumentSettings, DocumentStats } from '../types';

export interface MarkdownFrontmatter {
  title?: string;
  author?: string;
  date?: string;
  version?: string;
  category?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

export interface MarkdownImageRef {
  alt: string;
  src: string;
  title?: string;
  isBase64: boolean;
  sizeBytes?: number;
}

export interface MarkdownDocumentPackage {
  filename: string;
  markdownContent: string;
  htmlContent: string;
  plainText: string;
  frontmatter: MarkdownFrontmatter;
  images: MarkdownImageRef[];
  stats: {
    words: number;
    characters: number;
    lines: number;
    headingsCount: number;
    tablesCount: number;
    tasksCount: number;
    readingTimeMinutes: number;
  };
  settings: DocumentSettings;
  generatedAt: string;
}

export interface MarkdownInspectionResult {
  rawMarkdown: string;
  fileSizeBytes: number;
  packageDoc: MarkdownDocumentPackage;
  validationErrors: string[];
  isValid: boolean;
}

export const STORAGE_KEY_MARKDOWN_CACHE = 'wordpad_markdown_cache';
export const STORAGE_KEY_CONTENT = 'wordpad_document_content';
export const STORAGE_KEY_SETTINGS = 'wordpad_document_settings';

/**
 * Configure Turndown with GFM tables, strikethrough, task lists, and formatting.
 */
export function createConfiguredTurndown(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Table rule for GFM markdown tables
  turndown.addRule('tables', {
    filter: 'table',
    replacement: function (_content, node) {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.rows);
      if (rows.length === 0) return '';

      const tableData: string[][] = [];
      let maxCols = 0;

      rows.forEach((row) => {
        const cells = Array.from(row.cells).map((cell) =>
          cell.textContent?.trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ') || ''
        );
        if (cells.length > maxCols) maxCols = cells.length;
        tableData.push(cells);
      });

      if (tableData.length === 0 || maxCols === 0) return '';

      // Normalize all rows to maxCols
      tableData.forEach((row) => {
        while (row.length < maxCols) row.push('');
      });

      let md = '\n\n';

      // Header row
      const headerRow = tableData[0];
      md += '| ' + headerRow.join(' | ') + ' |\n';

      // Separator row
      const sep = headerRow.map(() => '---');
      md += '| ' + sep.join(' | ') + ' |\n';

      // Body rows
      for (let i = 1; i < tableData.length; i++) {
        md += '| ' + tableData[i].join(' | ') + ' |\n';
      }

      return md + '\n';
    },
  });

  // Task list rule for TipTap taskItems
  turndown.addRule('taskItems', {
    filter: function (node) {
      return (
        node.nodeName === 'LI' &&
        (node.getAttribute('data-type') === 'taskItem' ||
          node.classList.contains('task-item') ||
          node.querySelector('input[type="checkbox"]') !== null)
      );
    },
    replacement: function (content, node) {
      const el = node as HTMLElement;
      const isChecked =
        el.getAttribute('data-checked') === 'true' ||
        (el.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked === true;
      const cleanContent = content.trim().replace(/^\[[ x]\]\s*/i, '');
      return `\n- [${isChecked ? 'x' : ' '}] ${cleanContent}\n`;
    },
  });

  // Underline / Highlight rule
  turndown.addRule('underline', {
    filter: ['u'],
    replacement: function (content) {
      return `<u>${content}</u>`;
    },
  });

  turndown.addRule('mark', {
    filter: ['mark'],
    replacement: function (content) {
      return `==${content}==`;
    },
  });

  // Subscript and Superscript
  turndown.addRule('subscript', {
    filter: ['sub'],
    replacement: function (content) {
      return `~${content}~`;
    },
  });

  turndown.addRule('superscript', {
    filter: ['sup'],
    replacement: function (content) {
      return `^${content}^`;
    },
  });

  return turndown;
}

/**
 * Converts editor HTML to Markdown with frontmatter and structure analysis.
 */
export function htmlToMarkdownPackage(
  editor: Editor | null,
  settings: DocumentSettings,
  stats: DocumentStats,
  includeFrontmatter: boolean = true
): MarkdownDocumentPackage {
  const htmlContent = editor ? editor.getHTML() : '<p></p>';
  const plainText = editor ? editor.getText() : '';

  // Extract images
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const imgEls = Array.from(doc.querySelectorAll('img'));
  const images: MarkdownImageRef[] = imgEls.map((img) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || 'image';
    const title = img.getAttribute('title') || undefined;
    const isBase64 = src.startsWith('data:');
    const sizeBytes = isBase64 ? Math.round((src.length * 3) / 4) : undefined;
    return { alt, src, title, isBase64, sizeBytes };
  });

  const headingsCount = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  const tablesCount = doc.querySelectorAll('table').length;
  const tasksCount = doc.querySelectorAll('[data-type="taskItem"], input[type="checkbox"]').length;

  const turndown = createConfiguredTurndown();
  let bodyMarkdown = turndown.turndown(htmlContent);

  // Clean extra blank lines
  bodyMarkdown = bodyMarkdown.replace(/\n{3,}/g, '\n\n').trim();

  // Create frontmatter
  const frontmatter: MarkdownFrontmatter = {
    title: settings.title || 'Untitled Document',
    author: settings.author || 'Author',
    date: settings.createdDate || new Date().toISOString().split('T')[0],
    version: settings.version || '1.0.0',
    pageSize: settings.pageSize || 'letter',
    orientation: settings.orientation || 'portrait',
    margins: settings.margins || 'normal',
    words: stats.words,
    characters: stats.characters,
  };

  let fullMarkdown = bodyMarkdown;

  if (includeFrontmatter) {
    const frontmatterYaml = [
      '---',
      `title: "${(frontmatter.title || 'Document').replace(/"/g, '\\"')}"`,
      `author: "${(frontmatter.author || '').replace(/"/g, '\\"')}"`,
      `date: "${frontmatter.date || ''}"`,
      `version: "${frontmatter.version || '1.0.0'}"`,
      `pageSize: "${frontmatter.pageSize}"`,
      `orientation: "${frontmatter.orientation}"`,
      `margins: "${frontmatter.margins}"`,
      `words: ${stats.words}`,
      'generator: "Office Pro Word Engine - Markdown System (M)"',
      '---',
      '',
      bodyMarkdown,
    ].join('\n');
    fullMarkdown = frontmatterYaml;
  }

  const lines = fullMarkdown.split('\n').length;
  const safeFilename = (settings.title || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  return {
    filename: `${safeFilename}.md`,
    markdownContent: fullMarkdown,
    htmlContent,
    plainText,
    frontmatter,
    images,
    stats: {
      words: stats.words,
      characters: stats.characters,
      lines,
      headingsCount,
      tablesCount,
      tasksCount,
      readingTimeMinutes: stats.readingTimeMinutes,
    },
    settings: { ...settings },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Triggers browser download of the Markdown file.
 */
export function triggerMarkdownDownload(
  packageDoc: MarkdownDocumentPackage,
  filename?: string
): void {
  const chosenFilename = filename
    ? (filename.endsWith('.md') ? filename : `${filename}.md`)
    : packageDoc.filename;

  const blob = new Blob([packageDoc.markdownContent], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = chosenFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Parses raw Markdown text (with optional YAML frontmatter) into HTML and inspection metrics.
 */
export function parseMarkdownString(rawText: string): MarkdownInspectionResult {
  const validationErrors: string[] = [];
  let contentWithoutFrontmatter = rawText;
  const frontmatter: MarkdownFrontmatter = {};

  // Check for YAML frontmatter block: ^---\n([\s\S]*?)\n---
  const frontmatterMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1];
    contentWithoutFrontmatter = rawText.slice(frontmatterMatch[0].length);

    yamlContent.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      }
    });
  }

  // Parse Markdown to HTML via marked
  let htmlResult = '';
  try {
    marked.setOptions({
      gfm: true,
      breaks: false,
    });
    const parsedHtml = marked.parse(contentWithoutFrontmatter);
    htmlResult = typeof parsedHtml === 'string' ? parsedHtml : '';
  } catch (err: any) {
    validationErrors.push('Markdown parsing error: ' + err.message);
    htmlResult = `<p>${contentWithoutFrontmatter}</p>`;
  }

  // Post-process HTML for TipTap taskItems and checklists
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlResult, 'text/html');

  // Convert task list checkboxes to TipTap task items if present
  const listItems = doc.querySelectorAll('li');
  listItems.forEach((li) => {
    const checkbox = li.querySelector('input[type="checkbox"]');
    if (checkbox) {
      const isChecked = (checkbox as HTMLInputElement).checked;
      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', isChecked ? 'true' : 'false');
      const parentUl = li.parentElement;
      if (parentUl && parentUl.tagName === 'UL') {
        parentUl.setAttribute('data-type', 'taskList');
      }
    }
  });

  // Extract images
  const imgEls = Array.from(doc.querySelectorAll('img'));
  const images: MarkdownImageRef[] = imgEls.map((img) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || 'image';
    const isBase64 = src.startsWith('data:');
    const sizeBytes = isBase64 ? Math.round((src.length * 3) / 4) : undefined;
    return { alt, src, isBase64, sizeBytes };
  });

  const finalHtml = doc.body.innerHTML;
  const plainText = doc.body.textContent || '';
  const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const characters = plainText.length;
  const lines = rawText.split('\n').length;
  const headingsCount = doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  const tablesCount = doc.querySelectorAll('table').length;
  const tasksCount = doc.querySelectorAll('li[data-type="taskItem"], input[type="checkbox"]').length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  const resolvedTitle =
    frontmatter.title ||
    doc.querySelector('h1')?.textContent?.trim() ||
    'Imported Markdown Document';

  const docSettings: DocumentSettings = {
    title: resolvedTitle,
    author: frontmatter.author || 'Imported Author',
    version: frontmatter.version || '1.0.0',
    createdDate: frontmatter.date || new Date().toISOString().split('T')[0],
    updatedDate: new Date().toLocaleDateString(),
    pageColor: '#ffffff',
    isDarkMode: false,
    margins: (frontmatter.margins as any) || 'normal',
    orientation: (frontmatter.orientation as any) || 'portrait',
    pageSize: (frontmatter.pageSize as any) || 'letter',
    zoom: 100,
    showRuler: true,
    showGridlines: false,
    viewMode: 'print',
  };

  const safeFilename = resolvedTitle
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  const packageDoc: MarkdownDocumentPackage = {
    filename: `${safeFilename}.md`,
    markdownContent: rawText,
    htmlContent: finalHtml,
    plainText,
    frontmatter,
    images,
    stats: {
      words,
      characters,
      lines,
      headingsCount,
      tablesCount,
      tasksCount,
      readingTimeMinutes,
    },
    settings: docSettings,
    generatedAt: new Date().toISOString(),
  };

  return {
    rawMarkdown: rawText,
    fileSizeBytes: new Blob([rawText]).size,
    packageDoc,
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}

/**
 * Restores a parsed Markdown document package into the active TipTap editor.
 */
export function restoreMarkdownToEditor(
  packageDoc: MarkdownDocumentPackage,
  editor: Editor | null,
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void,
  onSaveToLocalStorage?: () => void
): void {
  if (!editor) return;

  // Insert parsed HTML into editor
  editor.commands.setContent(packageDoc.htmlContent);

  // Update settings
  if (onUpdateSettings) {
    onUpdateSettings({
      ...packageDoc.settings,
      title: packageDoc.settings.title,
      updatedDate: new Date().toLocaleString(),
    });
  }

  // Update localStorage
  try {
    localStorage.setItem(STORAGE_KEY_CONTENT, packageDoc.htmlContent);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(packageDoc.settings));
    saveMarkdownToLocalCache(packageDoc);
  } catch (err) {
    console.warn('LocalStorage error while restoring Markdown:', err);
  }

  if (onSaveToLocalStorage) {
    onSaveToLocalStorage();
  }
}

/**
 * Local cache management for Markdown backups.
 */
export function saveMarkdownToLocalCache(packageDoc: MarkdownDocumentPackage): void {
  try {
    const compactCache = {
      timestamp: packageDoc.generatedAt,
      title: packageDoc.settings.title,
      words: packageDoc.stats.words,
      lines: packageDoc.stats.lines,
      imagesCount: packageDoc.images.length,
      sizeBytes: new Blob([packageDoc.markdownContent]).size,
      packageDoc,
    };
    localStorage.setItem(STORAGE_KEY_MARKDOWN_CACHE, JSON.stringify(compactCache));
  } catch (err) {
    console.warn('Unable to cache Markdown in localStorage:', err);
  }
}

export function loadMarkdownFromLocalCache(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MARKDOWN_CACHE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load Markdown from cache:', err);
    return null;
  }
}

export function clearMarkdownLocalCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MARKDOWN_CACHE);
  } catch (err) {
    console.warn('Failed to clear Markdown cache:', err);
  }
}

/**
 * Sample Markdown file for demonstration and quick testing.
 */
export function getSampleMarkdown(): string {
  return `---
title: "Modern Technical Specification & Markdown Engine Guide"
author: "Engineering Lead"
date: "2026-09-24"
version: "2.5.0"
category: "Architecture"
tags: ["markdown", "tiptap", "spec", "gfm"]
pageSize: "letter"
orientation: "portrait"
margins: "normal"
generator: "Office Pro Word Engine - Markdown System (M)"
---

# Modern Technical Specification & Markdown Engine Guide

> *Office Pro Document Suite • Markdown Specification v2.5.0 • GitHub Flavored Markdown (GFM) Compliant*

---

## 1. Executive Overview

This document highlights the capabilities of the **Markdown (.md)** bidirectional serialization engine. It bridges the gap between clean developer-friendly plain text documents and rich typography formatted for executive office reading.

### Key Capabilities
- **Bi-directional conversion**: Seamless conversion between TipTap rich DOM trees and clean Markdown syntax.
- **GFM Table support**: High-fidelity conversion of styled data tables into standard Markdown grid tables.
- **Task checklists**: Interactive checklists (\`- [x]\` and \`- [ ]\`) preserved with status.
- **Frontmatter awareness**: Preserves YAML headers containing document metadata, page setup, and versioning.

---

## 2. Benchmark & Compatibility Grid

| Feature Component | Markdown Syntax | TipTap Node | Fidelity Rating |
| :--- | :--- | :--- | :--- |
| **Section Headings** | \`# H1\`, \`## H2\`, \`### H3\` | Heading Level 1-6 | 100% Native |
| **Bold & Emphasis** | \`**bold**\` & \`*italic*\` | Bold & Italic Marks | 100% Native |
| **Data Tables** | \`| Col1 | Col2 |\` | Table & TableRow | 100% GFM Compliant |
| **Code Blocks** | \`\`\`typescript ... \`\`\` | CodeBlock (Fenced) | 100% Native |
| **Task Lists** | \`- [x] Done\`, \`- [ ] Todo\` | TaskList & TaskItem | 100% Interactive |
| **Blockquotes** | \`> Quote text\` | Blockquote Node | 100% Preserved |

---

## 3. Implementation Verification Checklist

- [x] Full YAML Frontmatter parsing with automatic title extraction
- [x] GFM Table formatting with aligned column pipes
- [x] Embedded Base64 media & image URL preservation
- [x] Sandboxed live visual rendering preview with typography styling
- [ ] Direct export to GitHub Readme and Obsidian Vaults

---

## 4. Code Sample: Markdown Serialization Routine

\`\`\`typescript
import { createConfiguredTurndown } from './markdownHandler';

export function exportDocumentToMarkdown(editor: Editor) {
  const turndown = createConfiguredTurndown();
  const html = editor.getHTML();
  const markdown = turndown.turndown(html);
  return markdown;
}
\`\`\`

---

## 5. Architectural Notes

Markdown documents exported through this engine are immediately usable in:
1. **GitHub Repositories**: Display flawlessly in READMEs, wikis, and PR summaries.
2. **Obsidian & Foam**: Full compatibility with second-brain knowledge management vaults.
3. **Static Site Generators**: Native feed for Astro, Next.js, Hugo, VitePress, and Docusaurus.
`;
}
