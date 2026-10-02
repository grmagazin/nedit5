import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats } from '../types';
import {
  MarkdownDocumentPackage,
  MarkdownInspectionResult,
  htmlToMarkdownPackage,
  triggerMarkdownDownload,
  parseMarkdownString,
  restoreMarkdownToEditor,
  saveMarkdownToLocalCache,
  loadMarkdownFromLocalCache,
  clearMarkdownLocalCache,
  getSampleMarkdown,
} from '../utils/markdownHandler';
import {
  Download,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileCode,
  Sparkles,
  HardDrive,
  FolderArchive,
  Eye,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  X,
  FileText,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Database,
  ListTodo,
  Table,
  Cpu,
  Hash,
  ExternalLink,
} from 'lucide-react';

interface MarkdownEngineBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats: DocumentStats;
  onClose: () => void;
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void;
  onSaveToLocalStorage?: () => void;
}

export const MarkdownEngineBackstageSection: React.FC<MarkdownEngineBackstageSectionProps> = ({
  editor,
  settings,
  stats,
  onClose,
  onUpdateSettings,
  onSaveToLocalStorage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inspector' | 'syntax' | 'cache' | 'ecosystem'>('inspector');
  const [inspectorView, setInspectorView] = useState<'markdown' | 'preview' | 'frontmatter' | 'images'>('markdown');
  const [inspectResult, setInspectResult] = useState<MarkdownInspectionResult | null>(null);
  const [includeFrontmatter, setIncludeFrontmatter] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>(
    settings.title ? settings.title.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() : 'document'
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [cachedPackageMeta, setCachedPackageMeta] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Convert current active editor content on mount as default inspection result
  useEffect(() => {
    try {
      const pkg = htmlToMarkdownPackage(editor, settings, stats, includeFrontmatter);
      const parsed = parseMarkdownString(pkg.markdownContent);
      setInspectResult(parsed);
    } catch (e) {
      console.error('Error generating initial markdown snapshot:', e);
    }

    const cached = loadMarkdownFromLocalCache();
    if (cached) {
      setCachedPackageMeta(cached);
    }
  }, [includeFrontmatter]);

  // Update iframe preview when inspectResult changes or view changes
  useEffect(() => {
    if (inspectorView === 'preview' && previewIframeRef.current && inspectResult?.packageDoc?.htmlContent) {
      const doc = previewIframeRef.current.contentDocument;
      if (doc) {
        const isDark = inspectResult.packageDoc.settings.isDarkMode || inspectResult.packageDoc.settings.pageColor === '#0f172a' || inspectResult.packageDoc.settings.pageColor === '#18181b';
        const pageBg = inspectResult.packageDoc.settings.pageColor || (isDark ? '#0f172a' : '#ffffff');
        const textColor = isDark ? '#f8fafc' : '#1e293b';

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                  line-height: 1.65;
                  color: ${textColor};
                  background-color: ${pageBg};
                  padding: 36px;
                  max-width: 860px;
                  margin: 0 auto;
                  box-sizing: border-box;
                }
                h1 { color: ${isDark ? '#60a5fa' : '#1e3a8a'}; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 16px; }
                h2 { color: ${isDark ? '#93c5fd' : '#1d4ed8'}; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-top: 24px; }
                h3 { color: ${isDark ? '#bfdbfe' : '#2563eb'}; margin-top: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
                th { background: rgba(99, 102, 241, 0.08); font-weight: 600; color: #4338ca; }
                blockquote { border-left: 4px solid #6366f1; margin: 18px 0; padding: 6px 18px; background: rgba(99, 102, 241, 0.04); font-style: italic; border-radius: 0 4px 4px 0; }
                img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin: 16px 0; }
                code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12.5px; color: #db2777; }
                pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 12px; }
                pre code { background: transparent; color: inherit; padding: 0; }
                ul[data-type="taskList"], ul { padding-left: 24px; }
                li[data-type="taskItem"] { list-style: none; display: flex; align-items: flex-start; margin: 6px 0; margin-left: -20px; }
                li[data-type="taskItem"] input[type="checkbox"] { margin-right: 8px; margin-top: 5px; }
                hr { border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0; }
              </style>
            </head>
            <body>
              ${inspectResult.packageDoc.htmlContent}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [inspectorView, inspectResult]);

  // Handle Generate and Download Markdown file
  const handleDownloadMarkdown = (withFrontmatter: boolean = includeFrontmatter) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      notify('Exporting document to Markdown (.md)...');
      const pkg = htmlToMarkdownPackage(editor, settings, stats, withFrontmatter);
      triggerMarkdownDownload(pkg, customFilename);

      saveMarkdownToLocalCache(pkg);
      setCachedPackageMeta(loadMarkdownFromLocalCache());

      const parsed = parseMarkdownString(pkg.markdownContent);
      setInspectResult(parsed);

      notify(`Successfully generated and downloaded "${customFilename}.md"!`);
    } catch (err: any) {
      console.error('Error generating markdown download:', err);
      setErrorMessage('Failed to export Markdown: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Upload / Load Markdown file
  const handleUploadMarkdownFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseMarkdownString(text);

        if (!result.isValid) {
          setErrorMessage('Validation note: ' + result.validationErrors.join(', '));
        }

        setInspectResult(result);
        saveMarkdownToLocalCache(result.packageDoc);
        setCachedPackageMeta(loadMarkdownFromLocalCache());

        const baseTitle = file.name.replace(/\.[^.]+$/, '');
        setCustomFilename(baseTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_'));

        notify(`Loaded and parsed "${file.name}" (${(result.fileSizeBytes / 1024).toFixed(1)} KB, ${result.packageDoc.stats.words} words)`);
      } catch (err: any) {
        setErrorMessage('Failed to parse uploaded Markdown file: ' + err.message);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Restore inspected Markdown into active TipTap editor
  const handleRestoreToEditor = () => {
    if (!inspectResult || !inspectResult.packageDoc) return;

    restoreMarkdownToEditor(
      inspectResult.packageDoc,
      editor,
      onUpdateSettings,
      onSaveToLocalStorage
    );

    notify(`Document restored from Markdown into the active editor!`);
    onClose();
  };

  // Load sample Markdown specification
  const handleLoadSample = () => {
    const sample = getSampleMarkdown();
    const parsed = parseMarkdownString(sample);
    setInspectResult(parsed);
    saveMarkdownToLocalCache(parsed.packageDoc);
    setCachedPackageMeta(loadMarkdownFromLocalCache());
    notify('Loaded Sample Markdown Specification with GFM Tables & Frontmatter.');
  };

  // Scan and verify current editor document serialization to Markdown in-memory
  const handleScanCurrentEditor = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      notify('Scanning and serializing current document to Markdown...');
      const pkg = htmlToMarkdownPackage(editor, settings, stats, includeFrontmatter);
      const parsed = parseMarkdownString(pkg.markdownContent);
      setInspectResult(parsed);
      saveMarkdownToLocalCache(pkg);
      setCachedPackageMeta(loadMarkdownFromLocalCache());
      notify('Smart Scan complete: Markdown verified with 100% fidelity!');
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage('Failed to scan document: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy raw Markdown
  const handleCopyRawMarkdown = () => {
    if (!inspectResult) return;
    navigator.clipboard.writeText(inspectResult.rawMarkdown);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-neutral-800">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-8 py-5 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#6366f1] text-white flex items-center justify-center font-black text-xl shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-neutral-900">Markdown (.md) Engine</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  GFM Compliant
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck size={12} />
                  <span>YAML Frontmatter</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  Bi-directional Sync
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Convert, import, export, and inspect GitHub-Flavored Markdown documents with tables, checklists, and metadata
              </p>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Restore to Editor Button */}
            {inspectResult?.packageDoc?.htmlContent && (
              <button
                onClick={handleRestoreToEditor}
                className="px-3.5 py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="Restore this markdown into the active editor document"
              >
                <ArrowRight size={14} />
                <span>Restore to Editor</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close & Return to Document"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sub-tabs navigation */}
        <div className="flex items-center space-x-6 mt-5 border-b border-neutral-200 text-xs">
          <button
            onClick={() => setActiveSubTab('inspector')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'inspector'
                ? 'border-[#6366f1] text-[#4f46e5]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Eye size={14} />
            <span>1. Live Markdown &amp; Preview Inspector</span>
          </button>

          <button
            onClick={() => setActiveSubTab('syntax')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'syntax'
                ? 'border-[#6366f1] text-[#4f46e5]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Cpu size={14} />
            <span>2. GFM Flavor &amp; Syntax Specification</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cache')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'cache'
                ? 'border-[#6366f1] text-[#4f46e5]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <HardDrive size={14} />
            <span>3. Local Storage Caching</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ecosystem')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'ecosystem'
                ? 'border-[#6366f1] text-[#4f46e5]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <BookOpen size={14} />
            <span>4. Ecosystem &amp; Publishing Guide</span>
          </button>
        </div>
      </div>

      {/* Messages banner */}
      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-8 py-2.5 text-xs text-emerald-800 flex items-center space-x-2 animate-fadeIn shrink-0">
          <CheckCircle2 size={15} className="text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-8 py-2.5 text-xs text-red-800 flex items-center justify-between animate-fadeIn shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle size={15} className="text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* SUB-TAB 1: LIVE MARKDOWN & PREVIEW INSPECTOR */}
        {activeSubTab === 'inspector' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Action Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-1">
                <div className="flex items-center space-x-2 text-[#6366f1] font-semibold text-sm">
                  <FolderArchive size={18} />
                  <h2 className="text-neutral-800">Live Markdown &amp; Preview Inspector</h2>
                </div>

                {/* Project File Name Input */}
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-xs font-semibold text-neutral-600">Project Name:</label>
                  <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                      placeholder="document"
                      className="px-2.5 py-1.5 text-xs text-neutral-800 font-mono w-44 outline-none"
                    />
                    <span className="bg-neutral-100 px-2 py-1.5 text-[11px] text-neutral-500 border-l border-neutral-200 font-mono">
                      .md
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-600 mb-4">
                Convert, import, export, and inspect GitHub-Flavored Markdown documents with tables, checklists, and metadata.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Scan and Optimize */}
                <button
                  onClick={handleScanCurrentEditor}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Scan and verify current editor document export & markdown serialization"
                >
                  <Sparkles size={14} className="text-yellow-200" />
                  <span>{isProcessing ? 'Analyzing...' : 'Scan & Optimize Current Document'}</span>
                </button>

                {/* 2. Load */}
                <label className="px-4 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                  <Upload size={14} />
                  <span>Load (Upload) .md</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown,.txt,text/markdown,text/plain"
                    onChange={handleUploadMarkdownFile}
                    className="hidden"
                  />
                </label>

                {/* 3. Download (with green border) */}
                <button
                  onClick={() => handleDownloadMarkdown(includeFrontmatter)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-2 border-green-600 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Save the current document as a real .md file"
                >
                  <Download size={14} />
                  <span>Save (Download) .md</span>
                </button>

                <span className="text-xs text-neutral-500">
                  or try sample documents from the menu below
                </span>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Markdown Size
                </span>
                <span className="text-xl font-bold text-neutral-900 mt-1 block">
                  {inspectResult ? `${(inspectResult.fileSizeBytes / 1024).toFixed(1)} KB` : 'Ready'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {inspectResult ? `${inspectResult.fileSizeBytes} bytes` : 'Click Save or Load'}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Total Words
                </span>
                <span className="text-xl font-bold text-indigo-600 mt-1 block">
                  {inspectResult?.packageDoc?.stats?.words ?? stats.words}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  ~{inspectResult?.packageDoc?.stats?.readingTimeMinutes ?? stats.readingTimeMinutes} min read
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Lines &amp; Structure
                </span>
                <span className="text-xl font-bold text-neutral-900 mt-1 block">
                  {inspectResult?.packageDoc?.stats?.lines || 0} lines
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {inspectResult?.packageDoc?.stats?.headingsCount || 0} headings
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Tables &amp; Tasks
                </span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {inspectResult?.packageDoc?.stats?.tablesCount || 0} tables
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {inspectResult?.packageDoc?.stats?.tasksCount || 0} task items
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  GFM Compliance
                </span>
                <span className="text-xl font-bold text-sky-600 mt-1 block">
                  {inspectResult?.isValid ? '100% GFM' : 'Verified'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">GitHub Compatible</span>
              </div>
            </div>

            {/* Filename & Format Settings */}
            <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-neutral-700">Export Filename:</span>
                  <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1">
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      className="bg-transparent text-xs text-neutral-800 outline-hidden font-mono w-44"
                      placeholder="document"
                    />
                    <span className="text-xs text-neutral-400 font-mono">.md</span>
                  </div>
                </div>

                <label className="flex items-center space-x-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeFrontmatter}
                    onChange={(e) => setIncludeFrontmatter(e.target.checked)}
                    className="rounded border-neutral-300 text-[#6366f1] focus:ring-[#6366f1]"
                  />
                  <span>Include YAML Frontmatter metadata</span>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadMarkdown(includeFrontmatter)}
                  className="px-3.5 py-1.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download size={13} />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={() => handleDownloadMarkdown(false)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Export raw Markdown without YAML Frontmatter header"
                >
                  <span>Raw (No YAML)</span>
                </button>
              </div>
            </div>

            {/* Sub-view switcher for Inspector */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="border-b border-neutral-200 px-5 py-3 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => setInspectorView('markdown')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'markdown'
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <Code2 size={13} />
                    <span>Raw Markdown Code</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('preview')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'preview'
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <Eye size={13} />
                    <span>Live Sandboxed Preview</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('frontmatter')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'frontmatter'
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <FileText size={13} />
                    <span>YAML Frontmatter</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('images')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'images'
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <ImageIcon size={13} />
                    <span>Media &amp; Images ({inspectResult?.packageDoc?.images?.length || 0})</span>
                  </button>
                </div>

                {inspectResult && (
                  <button
                    onClick={handleCopyRawMarkdown}
                    className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-neutral-100 cursor-pointer"
                  >
                    {copiedSnippet ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                )}
              </div>

              {/* View Content */}
              <div className="p-6">
                {/* 1. RAW MARKDOWN CODE VIEW */}
                {inspectorView === 'markdown' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Full GFM Markdown syntax representation:</span>
                      <span className="font-mono">
                        {inspectResult ? `${inspectResult.rawMarkdown.split('\n').length} lines` : '0 lines'}
                      </span>
                    </div>
                    <pre className="p-4 bg-neutral-900 text-indigo-200 font-mono text-xs rounded-lg overflow-x-auto max-h-[520px] leading-relaxed border border-neutral-800 select-all whitespace-pre-wrap">
                      {inspectResult?.rawMarkdown || '// No Markdown content available'}
                    </pre>
                  </div>
                )}

                {/* 2. LIVE SANDBOXED PREVIEW VIEW */}
                {inspectorView === 'preview' && (
                  <div className="space-y-3">
                    <div className="text-xs text-neutral-500 flex items-center justify-between">
                      <span>Isolated sandboxed rendering of the parsed Markdown content:</span>
                      <span className="font-mono text-[11px]">
                        Title: {inspectResult?.packageDoc?.settings?.title || 'Document'}
                      </span>
                    </div>
                    <div className="w-full h-[520px] rounded-lg border border-neutral-300 overflow-hidden shadow-inner bg-white">
                      <iframe
                        ref={previewIframeRef}
                        title="Markdown Sandbox"
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}

                {/* 3. YAML FRONTMATTER VIEW */}
                {inspectorView === 'frontmatter' && (
                  <div className="space-y-4">
                    <div className="bg-neutral-50 rounded-lg p-5 border border-neutral-200 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
                        <FileText size={15} className="text-[#6366f1]" />
                        <span>Parsed Frontmatter Key-Value Mapping</span>
                      </h4>
                      {inspectResult?.packageDoc?.frontmatter &&
                      Object.keys(inspectResult.packageDoc.frontmatter).length > 0 ? (
                        <div className="space-y-2 text-xs">
                          {Object.entries(inspectResult.packageDoc.frontmatter).map(([key, val]) => (
                            <div key={key} className="flex justify-between py-1.5 border-b border-neutral-200">
                              <span className="font-mono text-neutral-500">{key}</span>
                              <span className="font-semibold text-neutral-800 font-mono">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-neutral-400 text-xs">
                          No YAML frontmatter header found in this document.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. MEDIA & IMAGES VIEW */}
                {inspectorView === 'images' && (
                  <div>
                    {inspectResult?.packageDoc?.images?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {inspectResult.packageDoc.images.map((img, i) => (
                          <div
                            key={i}
                            className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2 flex flex-col justify-between"
                          >
                            <div className="h-32 bg-white rounded border border-neutral-200 flex items-center justify-center overflow-hidden p-2">
                              <img
                                src={img.src}
                                alt={img.alt}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="font-bold text-neutral-800 truncate" title={img.alt}>
                                {img.alt || `Image #${i + 1}`}
                              </div>
                              <div className="flex justify-between text-[11px] text-neutral-500">
                                <span>{img.isBase64 ? 'Base64 Inline' : 'Linked URL'}</span>
                                {img.sizeBytes && (
                                  <span className="font-mono">{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`![${img.alt}](${img.src})`);
                                notify(`Copied Markdown tag for ${img.alt || 'image'}!`);
                              }}
                              className="w-full mt-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Copy size={12} />
                              <span>Copy ![]() Syntax</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-2">
                        <ImageIcon size={32} className="mx-auto text-neutral-300" />
                        <h4 className="text-xs font-bold text-neutral-700">No Images Found in Markdown</h4>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                          Insert images or paste screenshots in your document to see their Markdown syntax tags here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: GFM FLAVOR & SYNTAX SPECIFICATION */}
        {activeSubTab === 'syntax' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <Cpu size={18} className="text-[#6366f1]" />
                <span>GitHub Flavored Markdown (GFM) Compatibility Matrix</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The Markdown Engine implements bidirectional fidelity transformations with Turndown for HTML-to-Markdown and Marked for Markdown-to-HTML.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs">
                    <Table size={15} />
                    <span>GFM Grid Tables</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Calculates uniform column padding and delimiter row separators (<code className="text-indigo-600">| --- |</code>) for clean terminal rendering.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs">
                    <ListTodo size={15} />
                    <span>Interactive Tasks</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Preserves checked status with <code className="text-indigo-600">- [x]</code> and <code className="text-indigo-600">- [ ]</code> synced to TipTap task items.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs">
                    <FileText size={15} />
                    <span>YAML Frontmatter</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Extracts document title, author, version, orientation, margins, and tags into structured YAML blocks.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-neutral-900">Syntax Reference &amp; Conversion Examples</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
                      <th className="py-2.5 px-3 text-left font-bold">Element</th>
                      <th className="py-2.5 px-3 text-left font-bold">Markdown Syntax</th>
                      <th className="py-2.5 px-3 text-left font-bold">HTML / TipTap Equivalent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-600">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">Heading 1</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600"># Document Title</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">&lt;h1&gt;Document Title&lt;/h1&gt;</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">Checklist Task</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">- [x] Completed task</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">&lt;li data-type="taskItem" data-checked="true"&gt;</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">Data Table</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">| Col1 | Col2 |</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">&lt;table&gt;&lt;tr&gt;&lt;td&gt;...&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">Fenced Code</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">```typescript ... ```</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">&lt;pre&gt;&lt;code class="language-typescript"&gt;</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">Blockquote</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">&gt; Callout quote</td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">&lt;blockquote&gt;Callout quote&lt;/blockquote&gt;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LOCAL STORAGE CACHING */}
        {activeSubTab === 'cache' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center space-x-2 text-neutral-900">
                  <HardDrive size={18} className="text-[#6366f1]" />
                  <h3 className="text-base font-bold">Local Storage Persistent Markdown Cache</h3>
                </div>
                {cachedPackageMeta && (
                  <button
                    onClick={() => {
                      clearMarkdownLocalCache();
                      setCachedPackageMeta(null);
                      notify('Markdown cache cleared from local storage.');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Clear Cache
                  </button>
                )}
              </div>

              {cachedPackageMeta ? (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cached Document Title</span>
                      <span className="font-bold text-neutral-800">{cachedPackageMeta.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Timestamp</span>
                      <span className="text-neutral-700">{new Date(cachedPackageMeta.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Payload Size</span>
                      <span className="font-mono text-neutral-700">
                        {(cachedPackageMeta.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Word Count &amp; Lines</span>
                      <span className="text-neutral-700">
                        {cachedPackageMeta.words} words &bull; {cachedPackageMeta.lines} lines &bull; {cachedPackageMeta.imagesCount} images
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => {
                        if (cachedPackageMeta.packageDoc) {
                          restoreMarkdownToEditor(
                            cachedPackageMeta.packageDoc,
                            editor,
                            onUpdateSettings,
                            onSaveToLocalStorage
                          );
                          notify('Restored document from Markdown LocalStorage cache!');
                          onClose();
                        }
                      }}
                      className="px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Restore Cached Snapshot to Editor
                    </button>

                    <button
                      onClick={() => {
                        if (cachedPackageMeta.packageDoc) {
                          triggerMarkdownDownload(cachedPackageMeta.packageDoc, cachedPackageMeta.title);
                          notify('Exported cached Markdown file!');
                        }
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Download Cached File (.md)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <HardDrive size={32} className="mx-auto text-neutral-300" />
                  <h4 className="text-xs font-bold text-neutral-700">No Markdown Cached in LocalStorage</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Whenever you generate or upload a Markdown file, a persistent recovery snapshot is cached here in your browser.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: ECOSYSTEM & PUBLISHING */}
        {activeSubTab === 'ecosystem' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <BookOpen size={18} className="text-[#6366f1]" />
                <span>Interoperability &amp; Multi-Engine Architecture</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The Office Pro Word Processor suite offers five specialized export/import engines tailored for distinct publication targets:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-white text-[#185abd] font-bold flex items-center justify-center text-[10px] border border-neutral-300">
                      W
                    </div>
                    <span className="font-bold text-neutral-800">Microsoft Word (.docx)</span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    Native OpenXML format for enterprise distribution, Microsoft 365, Word Desktop, and formal legal contracts.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-[#e34f26] text-white font-bold flex items-center justify-center text-[10px]">
                      H
                    </div>
                    <span className="font-bold text-neutral-800">HTML + Images (.zip)</span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    Web-standard archive with an index.html file and an images/ asset directory for CMS and web publishing.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-[#0e7490] text-white font-bold flex items-center justify-center text-[10px]">
                      O
                    </div>
                    <span className="font-bold text-neutral-800">OpenDocument (.odf / .odt)</span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    ISO/IEC 26300 open international standard for LibreOffice Writer, public sector compliance, and long-term digital preservation.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-indigo-300 bg-indigo-50/50 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-[#6366f1] text-white font-bold flex items-center justify-center text-[10px]">
                      M
                    </div>
                    <span className="font-bold text-neutral-900">Markdown (.md)</span>
                  </div>
                  <p className="text-neutral-700 text-[11px]">
                    GitHub Flavored Markdown with YAML Frontmatter for developer docs, Obsidian vaults, Git repos, and Static Site Generators (Astro, Hugo, Next.js).
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/50 space-y-1.5 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-[#f59e0b] text-white font-bold flex items-center justify-center text-[10px]">
                      J
                    </div>
                    <span className="font-bold text-neutral-900">Backup (.json)</span>
                  </div>
                  <p className="text-neutral-700 text-[11px]">
                    Complete state serialization with embedded base64 images for instant local backups, offline resilience, and programmatic integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION FOOTER */}
      <div className="px-6 py-3.5 bg-white border-t border-neutral-200 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Client-Side GFM Markdown Engine Active</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-[#4f46e5] transition-colors cursor-pointer disabled:opacity-50"
          >
            Load Sample Markdown
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEngineBackstageSection;
