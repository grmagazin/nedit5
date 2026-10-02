import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings } from '../types';
import { BackstageTab } from './FileBackstage';
import {
  FolderOpen,
  FileText,
  FileCode,
  Download,
  Upload,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  BookOpen,
  Cpu,
  ShieldCheck,
  Code2,
  Globe,
  Terminal,
} from 'lucide-react';
import { parseDocxFile } from '../utils/docxHandler';
import { parseOdfPackage } from '../utils/odfHandler';
import { parseMarkdownString, restoreMarkdownToEditor } from '../utils/markdownHandler';
import { restoreJsonBackup } from '../utils/jsonBackupHandler';

interface OpenDocumentSmartPanelProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onSwitchTab: (tab: BackstageTab) => void;
  onShowMessage: (msg: string) => void;
}

export const OpenDocumentSmartPanel: React.FC<OpenDocumentSmartPanelProps> = ({
  editor,
  settings,
  onClose,
  onUpdateSettings,
  onSwitchTab,
  onShowMessage,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Hidden file inputs for each card
  const docxInputRef = useRef<HTMLInputElement>(null);
  const odtInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const universalInputRef = useRef<HTMLInputElement>(null);

  // Smart Universal File Processor
  const processSelectedFile = async (file: File) => {
    if (!editor || !file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    setProcessingStatus(`Parsing and importing "${fileName}"...`);

    try {
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ');

      // 1. DOCX (.docx)
      if (extension === 'docx') {
        const result = await parseDocxFile(file, fileName);
        if (result && result.htmlContent) {
          editor.commands.setContent(result.htmlContent);
          onUpdateSettings({ title: cleanTitle });
          onShowMessage(`Imported Microsoft Word document: "${fileName}"`);
          onClose();
          return;
        }
      }

      // 2. ODF / ODT (.odt, .odf)
      if (extension === 'odt' || extension === 'odf') {
        const result = await parseOdfPackage(file);
        if (result && result.html) {
          editor.commands.setContent(result.html);
          onUpdateSettings({
            title: result.metadata?.title || cleanTitle,
            author: result.metadata?.author || settings.author,
          });
          onShowMessage(`Imported OpenDocument text: "${fileName}"`);
          onClose();
          return;
        }
      }

      // 3. MARKDOWN (.md, .markdown)
      if (extension === 'md' || extension === 'markdown') {
        const text = await file.text();
        const inspection = parseMarkdownString(text);
        if (inspection && inspection.packageDoc) {
          restoreMarkdownToEditor(inspection.packageDoc, editor, onUpdateSettings);
          onShowMessage(`Imported Markdown document: "${fileName}"`);
          onClose();
          return;
        }
      }

      // 4. JSON BACKUP (.json)
      if (extension === 'json') {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.document && parsed.document.htmlContent) {
            restoreJsonBackup(parsed, editor, onUpdateSettings, () => {});
            onShowMessage(`Restored full JSON backup: "${fileName}"`);
            onClose();
            return;
          } else {
            // Raw JSON file: display formatted JSON in editor
            editor.commands.setContent(
              `<pre><code>${JSON.stringify(parsed, null, 2)}</code></pre>`
            );
            onUpdateSettings({ title: cleanTitle });
            onShowMessage(`Loaded JSON data into editor: "${fileName}"`);
            onClose();
            return;
          }
        } catch {
          // If JSON parse fails, fall through to text reader
        }
      }

      // 5. HTML (.html, .htm, .xhtml)
      if (extension === 'html' || extension === 'htm' || extension === 'xhtml') {
        const text = await file.text();
        editor.commands.setContent(text);
        onUpdateSettings({ title: cleanTitle });
        onShowMessage(`Imported HTML document: "${fileName}"`);
        onClose();
        return;
      }

      // 6. IMAGES (.png, .jpg, .jpeg, .svg, .webp, .gif)
      if (
        file.type.startsWith('image/') ||
        ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(extension)
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            editor.chain().focus().setImage({ src: dataUrl }).run();
            onShowMessage(`Inserted image "${fileName}" into document!`);
            onClose();
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // 7. PDF (.pdf)
      if (extension === 'pdf') {
        onSwitchTab('pdf');
        onShowMessage(`Opened PDF Engine for "${fileName}". Use Print Preview to inspect layout.`);
        return;
      }

      // 8. PLAIN TEXT / FALLBACK (.txt, .log, .csv, .rtf, all other files)
      const text = await file.text();
      const formattedHtml = text
        .split('\n\n')
        .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
        .join('');
      editor.commands.setContent(formattedHtml || `<p>${text}</p>`);
      onUpdateSettings({ title: cleanTitle });
      onShowMessage(`Imported text file: "${fileName}"`);
      onClose();
    } catch (err: any) {
      console.error('Failed to import file:', err);
      setErrorMessage(
        err?.message || `Could not parse "${fileName}". Ensure the file format is valid.`
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  return (
    <div className="max-w-5xl space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 bg-[#185abd] text-white rounded-lg shadow-2xs">
              <FolderOpen size={20} />
            </div>
            <span>Open Document Hub</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Choose a format below to open and import local documents, or launch its dedicated conversion engine
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <label className="px-3.5 py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
            <Upload size={14} />
            <span>Universal File Browse</span>
            <input
              ref={universalInputRef}
              type="file"
              accept="*/*"
              onChange={(e) => {
                if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Error / Processing Banner */}
      {processingStatus && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
          <div className="w-4 h-4 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>{processingStatus}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertCircle size={15} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:text-red-900 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Drag & Drop Target Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          isDragging
            ? 'border-[#185abd] bg-blue-50/70 scale-[1.01]'
            : 'border-neutral-300 hover:border-[#185abd] bg-white/70'
        }`}
      >
        <div className="flex items-center justify-center space-x-2 text-xs font-medium text-neutral-600">
          <Upload size={16} className={isDragging ? 'text-[#185abd]' : 'text-neutral-400'} />
          <span>
            {isDragging
              ? 'Drop your file here to open instantly!'
              : 'Drag and drop any document (DOCX, ODT, PDF, HTML, MD, TXT, JSON, Images) anywhere on this grid to open'}
          </span>
        </div>
      </div>

      {/* SMART 3x3 GRID OF 9 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {/* ROW 1 - CARD 1: 📄 DOCX (Microsoft Word) */}
        <div className="bg-white border border-neutral-200/90 hover:border-blue-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#185abd] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  W
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#185abd] transition-colors">
                    DOCX Document
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">ECMA-376 · Word 2007-365</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                .docx
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Open and render Word OpenXML documents with tables, styled text runs, headings, and inline images.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import .docx</span>
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('docx')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-blue-50/60 text-neutral-700 hover:text-[#185abd] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open DOCX Engine</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 1 - CARD 2: 📄 ODT (OpenDocument Text) */}
        <div className="bg-white border border-neutral-200/90 hover:border-cyan-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0e7490] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  O
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#0e7490] transition-colors">
                    ODT / ODF Document
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">ISO/IEC 26300 · LibreOffice</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100">
                .odt
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Import OpenDocument format packages containing content.xml, picture assets, and formatting styles.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#0e7490] hover:bg-[#155e75] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import .odt</span>
              <input
                ref={odtInputRef}
                type="file"
                accept=".odt,.odf"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('odf')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-cyan-50/60 text-neutral-700 hover:text-[#0e7490] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open ODF Engine</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 1 - CARD 3: 📕 PDF (Portable Document) */}
        <div className="bg-white border border-neutral-200/90 hover:border-red-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#dc2626] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#dc2626] transition-colors">
                    PDF Document
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">ISO 32000-2 · Vector Driver</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-50 text-red-700 border border-red-100">
                .pdf
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Inspect document pagination, configure vector print spooling, and preview printable PDF pages.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <button
              onClick={() => onSwitchTab('pdf')}
              className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <BookOpen size={13} />
              <span>Open PDF Engine</span>
            </button>

            <button
              onClick={() => onSwitchTab('print')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-red-50/60 text-neutral-700 hover:text-[#dc2626] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open Print Workstation</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 2 - CARD 4: 🌐 HTML / ZIP (Web Package) */}
        <div className="bg-white border border-neutral-200/90 hover:border-orange-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e34f26] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  H
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#e34f26] transition-colors">
                    HTML / Web ZIP
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">HTML5 · Standalone / ZIP</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                .html / .zip
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Open standalone HTML web documents or extract full ZIP packages with bundled media and styles.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#e34f26] hover:bg-[#c93d16] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import HTML</span>
              <input
                ref={htmlInputRef}
                type="file"
                accept=".html,.htm,.zip"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('htmlzip')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-orange-50/60 text-neutral-700 hover:text-[#e34f26] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open HTML Engine</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 2 - CARD 5: 📝 MD (Markdown) */}
        <div className="bg-white border border-neutral-200/90 hover:border-indigo-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6366f1] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  M
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#6366f1] transition-colors">
                    Markdown Document
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">GFM · CommonMark · YAML</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                .md
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Import GitHub-flavored Markdown text with frontmatter headers, tables, task lists, and code blocks.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import .md</span>
              <input
                ref={mdInputRef}
                type="file"
                accept=".md,.markdown"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('markdown')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-indigo-50/60 text-neutral-700 hover:text-[#6366f1] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open Markdown Engine</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 2 - CARD 6: 📄 TXT (Plain Text) */}
        <div className="bg-white border border-neutral-200/90 hover:border-slate-400 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#475569] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  T
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#475569] transition-colors">
                    Plain Text File
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">UTF-8 / ASCII Clean Text</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                .txt
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Load unformatted raw text files, logs, scripts, and notes formatted into clean document paragraphs.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#334155] hover:bg-[#1e293b] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import .txt</span>
              <input
                ref={txtInputRef}
                type="file"
                accept=".txt,.text,.log"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={async () => {
                try {
                  const clipText = await navigator.clipboard.readText();
                  if (clipText && editor) {
                    const formatted = clipText
                      .split('\n\n')
                      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                      .join('');
                    editor.commands.setContent(formatted || `<p>${clipText}</p>`);
                    onShowMessage('Pasted clipboard text into document!');
                    onClose();
                  }
                } catch {
                  onShowMessage('Unable to access system clipboard');
                }
              }}
              className="w-full py-1.5 bg-neutral-50 hover:bg-slate-100 text-neutral-700 hover:text-neutral-900 border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Paste from Clipboard</span>
            </button>
          </div>
        </div>

        {/* ROW 3 - CARD 7: {} JSON (Backup & State) */}
        <div className="bg-white border border-neutral-200/90 hover:border-amber-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#d97706] text-white flex items-center justify-center font-black text-sm shadow-xs font-mono">
                  {'{}'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#d97706] transition-colors">
                    JSON Backup
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Full State Restore · Self-Contained</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                .json
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Restore complete portable JSON snapshots with embedded images, document settings, and history.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Open / Import .json</span>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('backup')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-amber-50/60 text-neutral-700 hover:text-[#d97706] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Open Backup Engine</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ROW 3 - CARD 8: 🖼 Images (Graphics & Media) */}
        <div className="bg-white border border-neutral-200/90 hover:border-emerald-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#059669] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#059669] transition-colors">
                    Images &amp; Media
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">PNG, JPG, SVG, WebP, GIF</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Media
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Insert and place high-resolution photos, vector graphics, diagrams, and illustrations directly into canvas.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Browse Image File</span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                if (editor) {
                  editor.chain().focus().setImage({
                    src: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop',
                    alt: 'Sample Workspace Image',
                  }).run();
                  onShowMessage('Inserted sample workspace image!');
                  onClose();
                }
              }}
              className="w-full py-1.5 bg-neutral-50 hover:bg-emerald-50/60 text-neutral-700 hover:text-[#059669] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Insert Sample Image</span>
            </button>
          </div>
        </div>

        {/* ROW 3 - CARD 9: ⋯ More Formats (Universal & Templates) */}
        <div className="bg-white border border-neutral-200/90 hover:border-purple-300 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center font-black text-sm shadow-xs font-mono">
                  ⋯
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-[#7c3aed] transition-colors">
                    More Formats
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">RTF, CSV, XML, All Files</span>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                Universal
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed mb-4">
              Universal smart opener with auto-format detection or browse curated starter templates and themes.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="w-full py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs">
              <FolderOpen size={13} />
              <span>Browse Any File</span>
              <input
                type="file"
                accept="*/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={() => onSwitchTab('new')}
              className="w-full py-1.5 bg-neutral-50 hover:bg-purple-50/60 text-neutral-700 hover:text-[#7c3aed] border border-neutral-200 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Browse Templates Gallery</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenDocumentSmartPanel;
