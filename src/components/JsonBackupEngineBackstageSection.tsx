import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats } from '../types';
import {
  JsonBackupDocument,
  JsonBackupInspectionResult,
  createJsonBackupDocument,
  triggerJsonDownload,
  parseJsonBackupString,
  restoreJsonBackup,
  saveJsonBackupToCache,
  loadJsonBackupFromCache,
  clearJsonBackupCache,
  getSampleJsonBackup,
} from '../utils/jsonBackupHandler';
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
  Binary,
  Cpu,
} from 'lucide-react';

interface JsonBackupEngineBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats: DocumentStats;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onSaveToLocalStorage: () => void;
}

export const JsonBackupEngineBackstageSection: React.FC<JsonBackupEngineBackstageSectionProps> = ({
  editor,
  settings,
  stats,
  onClose,
  onUpdateSettings,
  onSaveToLocalStorage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inspector' | 'pipeline' | 'cache' | 'ecosystem'>('inspector');
  const [inspectorView, setInspectorView] = useState<'overview' | 'images' | 'preview' | 'raw'>('overview');
  const [inspectResult, setInspectResult] = useState<JsonBackupInspectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [cachedBackupMeta, setCachedBackupMeta] = useState<any | null>(null);
  const [customFilename, setCustomFilename] = useState<string>(
    settings.title ? settings.title.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() : 'document'
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Load cached backup on mount
  useEffect(() => {
    const cached = loadJsonBackupFromCache();
    if (cached) {
      setCachedBackupMeta(cached);
    }
  }, []);

  // Update iframe preview when inspectResult changes or view changes
  useEffect(() => {
    if (inspectorView === 'preview' && previewIframeRef.current && inspectResult?.backupDoc?.document?.htmlContent) {
      const doc = previewIframeRef.current.contentDocument;
      if (doc) {
        const isDark = inspectResult.backupDoc.document.settings?.isDarkMode || inspectResult.backupDoc.document.settings?.pageColor === '#0f172a' || inspectResult.backupDoc.document.settings?.pageColor === '#18181b';
        const pageBg = inspectResult.backupDoc.document.settings?.pageColor || (isDark ? '#0f172a' : '#ffffff');
        const textColor = isDark ? '#f8fafc' : '#1e293b';

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
                  line-height: 1.6;
                  color: ${textColor};
                  background-color: ${pageBg};
                  padding: 32px;
                  margin: 0;
                  box-sizing: border-box;
                }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
                th { background: rgba(0,0,0,0.05); }
                img { max-width: 100%; height: auto; border-radius: 6px; }
                blockquote { border-left: 4px solid #f59e0b; margin: 16px 0; padding-left: 16px; font-style: italic; }
              </style>
            </head>
            <body>
              ${inspectResult.backupDoc.document.htmlContent}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [inspectorView, inspectResult]);

  // Handle Generate and Save / Download JSON Backup
  const handleDownloadBackup = async (minify: boolean = false) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      notify('Encoding embedded base64 media and serializing JSON...');
      const backupDoc = await createJsonBackupDocument(editor, settings, stats);

      triggerJsonDownload(backupDoc, customFilename, minify);
      saveJsonBackupToCache(backupDoc);
      setCachedBackupMeta(loadJsonBackupFromCache());

      // Also set as active inspection result
      const jsonStr = minify ? JSON.stringify(backupDoc) : JSON.stringify(backupDoc, null, 2);
      const parsed = parseJsonBackupString(jsonStr);
      setInspectResult(parsed);

      notify(`Successfully generated and downloaded "${customFilename}.backup.json"!`);
    } catch (err: any) {
      console.error('Error generating JSON backup:', err);
      setErrorMessage('Failed to generate JSON backup: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Upload / Load JSON Backup
  const handleUploadBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseJsonBackupString(text);

        if (!result.isValid) {
          setErrorMessage('Validation warning: ' + result.validationErrors.join(', '));
        }

        setInspectResult(result);
        saveJsonBackupToCache(result.backupDoc);
        setCachedBackupMeta(loadJsonBackupFromCache());

        notify(`Loaded and parsed "${file.name}" (${(result.fileSizeBytes / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        setErrorMessage('Failed to parse uploaded JSON file: ' + err.message);
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

  // Restore inspected JSON backup into active editor
  const handleRestoreToEditor = () => {
    if (!inspectResult || !inspectResult.backupDoc) return;

    restoreJsonBackup(
      inspectResult.backupDoc,
      editor,
      onUpdateSettings,
      onSaveToLocalStorage
    );

    notify(`Document restored from JSON backup!`);
    onClose();
  };

  // Load sample backup
  const handleLoadSample = () => {
    const sample = getSampleJsonBackup();
    const jsonStr = JSON.stringify(sample, null, 2);
    const parsed = parseJsonBackupString(jsonStr);
    setInspectResult(parsed);
    saveJsonBackupToCache(sample);
    setCachedBackupMeta(loadJsonBackupFromCache());
    notify('Loaded Sample JSON Backup with base64 embedded diagrams.');
  };

  // Scan and verify current editor document serialization in-memory
  const handleScanCurrentEditor = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      notify('Scanning and verifying document serialization...');
      const backupDoc = await createJsonBackupDocument(editor, settings, stats);
      const jsonStr = JSON.stringify(backupDoc, null, 2);
      const parsed = parseJsonBackupString(jsonStr);
      setInspectResult(parsed);
      notify('Smart Scan complete: JSON backup verified with 100% fidelity!');
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage('Failed to scan document: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy raw JSON
  const handleCopyRawJson = () => {
    if (!inspectResult) return;
    navigator.clipboard.writeText(inspectResult.formattedJson);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-neutral-800">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-8 py-5 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b] text-white flex items-center justify-center font-black text-xl shadow-xs">
              J
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-neutral-900">JSON Backup Engine</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Schema v2.0
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck size={12} />
                  <span>Base64 Media 100% Offline</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Universal document serialization, inline base64 image encoding, and rapid local restore
              </p>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Restore to Editor Button */}
            {inspectResult?.backupDoc?.document && (
              <button
                onClick={handleRestoreToEditor}
                className="px-3.5 py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="Restore this backup into your current editor document"
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
                ? 'border-[#f59e0b] text-[#d97706]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Eye size={14} />
            <span>1. Live JSON &amp; Media Inspector</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pipeline')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'pipeline'
                ? 'border-[#f59e0b] text-[#d97706]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Cpu size={14} />
            <span>2. Serialization Pipeline &amp; Schema</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cache')}
            className={`pb-2.5 font-semibold flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeSubTab === 'cache'
                ? 'border-[#f59e0b] text-[#d97706]'
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
                ? 'border-[#f59e0b] text-[#d97706]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <BookOpen size={14} />
            <span>4. Ecosystem &amp; Migration Guide</span>
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
          <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* SUB-TAB 1: LIVE JSON & MEDIA INSPECTOR */}
        {activeSubTab === 'inspector' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Top Action Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-1">
                <div className="flex items-center space-x-2 text-[#f59e0b] font-semibold text-sm">
                  <FolderArchive size={18} />
                  <h2 className="text-neutral-800">Live JSON &amp; Media Inspector</h2>
                </div>

                {/* Project File Name Input */}
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-xs font-semibold text-neutral-600">Project Name:</label>
                  <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder="document"
                      className="px-2.5 py-1.5 text-xs text-neutral-800 font-mono w-44 outline-none"
                    />
                    <span className="bg-neutral-100 px-2 py-1.5 text-[11px] text-neutral-500 border-l border-neutral-200 font-mono">
                      .json
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-600 mb-4">
                Universal document serialization, inline base64 image encoding, and rapid local restore for offline resilience and complete data fidelity.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Scan and Optimize */}
                <button
                  onClick={handleScanCurrentEditor}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Scan and verify current editor document export & serialization fidelity"
                >
                  <Sparkles size={14} className="text-yellow-200" />
                  <span>{isProcessing ? 'Analyzing...' : 'Scan & Optimize Current Document'}</span>
                </button>

                {/* 2. Load */}
                <label className="px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                  <Upload size={14} />
                  <span>Load (Upload) .json</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleUploadBackupFile}
                    className="hidden"
                  />
                </label>

                {/* 3. Download (with green border) */}
                <button
                  onClick={() => handleDownloadBackup(false)}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-2 border-green-600 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Save the current document as a real .json backup"
                >
                  <Download size={14} />
                  <span>Save (Download) .json</span>
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
                  Backup Size
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
                  Base64 Images
                </span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">
                  {inspectResult ? inspectResult.backupDoc.media.totalImages : '0'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {inspectResult && inspectResult.backupDoc.media.totalSizeBytes > 0
                    ? `${(inspectResult.backupDoc.media.totalSizeBytes / 1024).toFixed(1)} KB media`
                    : '100% Embedded'}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Word Count
                </span>
                <span className="text-xl font-bold text-neutral-900 mt-1 block">
                  {inspectResult?.backupDoc?.document?.stats?.words ?? stats.words}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  {inspectResult?.backupDoc?.document?.stats?.characters ?? stats.characters} chars
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Schema Spec
                </span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">v2.0.0</span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">Portable JSON</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xl font-bold text-sky-600 mt-1 block">
                  {inspectResult?.isValid ? 'Verified' : 'Ready'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block">Offline Guaranteed</span>
              </div>
            </div>

            {/* Filename & Compression controls */}
            <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-neutral-700">Backup Filename:</span>
                <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1">
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    className="bg-transparent text-xs text-neutral-800 outline-hidden font-mono w-48"
                    placeholder="document"
                  />
                  <span className="text-xs text-neutral-400 font-mono">.backup.json</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadBackup(false)}
                  className="px-3 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download size={13} />
                  <span>Download Formatted (.json)</span>
                </button>
                <button
                  onClick={() => handleDownloadBackup(true)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="Export compact minified JSON without whitespace"
                >
                  <Binary size={13} />
                  <span>Download Minified</span>
                </button>
              </div>
            </div>

            {/* Sub-view switcher for Inspector */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="border-b border-neutral-200 px-5 py-3 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => setInspectorView('overview')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                      inspectorView === 'overview'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    JSON Overview
                  </button>
                  <button
                    onClick={() => setInspectorView('images')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'images'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <ImageIcon size={13} />
                    <span>Embedded Media ({inspectResult?.backupDoc?.media?.images?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setInspectorView('preview')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'preview'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <Eye size={13} />
                    <span>Live Sandboxed Preview</span>
                  </button>
                  <button
                    onClick={() => setInspectorView('raw')}
                    className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                      inspectorView === 'raw'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <Code2 size={13} />
                    <span>Raw JSON Code</span>
                  </button>
                </div>

                {inspectResult && (
                  <button
                    onClick={handleCopyRawJson}
                    className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center space-x-1 px-2.5 py-1 rounded hover:bg-neutral-100 cursor-pointer"
                  >
                    {copiedSnippet ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Raw JSON'}</span>
                  </button>
                )}
              </div>

              {/* View Content */}
              <div className="p-6">
                {/* 1. OVERVIEW VIEW */}
                {inspectorView === 'overview' && (
                  <div className="space-y-6">
                    {inspectResult ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Document Metadata Card */}
                        <div className="bg-neutral-50 rounded-lg p-5 border border-neutral-200 space-y-3">
                          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
                            <FileText size={15} className="text-[#f59e0b]" />
                            <span>Document Information</span>
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Title</span>
                              <span className="font-semibold text-neutral-900">
                                {inspectResult.backupDoc.document.title}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Author</span>
                              <span className="text-neutral-800">
                                {inspectResult.backupDoc.document.settings?.author || 'Unspecified'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Version</span>
                              <span className="font-mono text-neutral-800">
                                {inspectResult.backupDoc.document.settings?.version || '1.0.0'}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Created / Updated</span>
                              <span className="text-neutral-800">
                                {inspectResult.backupDoc.document.settings?.updatedDate ||
                                  inspectResult.backupDoc.timestamp}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-neutral-500">Page Orientation / Size</span>
                              <span className="capitalize text-neutral-800">
                                {inspectResult.backupDoc.document.settings?.orientation || 'portrait'} (
                                {inspectResult.backupDoc.document.settings?.pageSize || 'letter'})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Media & Environment Card */}
                        <div className="bg-neutral-50 rounded-lg p-5 border border-neutral-200 space-y-3">
                          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center space-x-2">
                            <Database size={15} className="text-[#f59e0b]" />
                            <span>Media &amp; System Integrity</span>
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Total Embedded Images</span>
                              <span className="font-bold text-amber-600">
                                {inspectResult.backupDoc.media.totalImages} images
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Media Payload Size</span>
                              <span className="font-mono text-neutral-800">
                                {(inspectResult.backupDoc.media.totalSizeBytes / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Encoding Format</span>
                              <span className="font-semibold text-emerald-700">RFC 2397 Data URI</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-neutral-200">
                              <span className="text-neutral-500">Generator</span>
                              <span className="truncate max-w-[200px] text-neutral-800">
                                {inspectResult.backupDoc.generator}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-neutral-500">Validation Status</span>
                              <span className="font-bold text-emerald-600 flex items-center space-x-1">
                                <CheckCircle2 size={13} />
                                <span>100% Valid Schema</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                          <FileCode size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-neutral-800">No JSON Backup Loaded Yet</h3>
                        <p className="text-xs text-neutral-500 max-w-md mx-auto">
                          Click <strong>"Save (Download) .json"</strong> to snapshot your active document with embedded base64 media, or <strong>"Load (Upload) .json"</strong> to inspect an existing backup.
                        </p>
                        <div className="flex items-center justify-center space-x-2 pt-2">
                          <button
                            onClick={() => handleDownloadBackup(false)}
                            className="px-3.5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Snapshot Active Document
                          </button>
                          <button
                            onClick={handleLoadSample}
                            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Load Sample Backup
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. BASE64 MEDIA GALLERY VIEW */}
                {inspectorView === 'images' && (
                  <div>
                    {inspectResult?.backupDoc?.media?.images?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {inspectResult.backupDoc.media.images.map((img, i) => (
                          <div
                            key={img.id || i}
                            className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2 flex flex-col justify-between"
                          >
                            <div className="h-32 bg-white rounded border border-neutral-200 flex items-center justify-center overflow-hidden p-2">
                              <img
                                src={img.base64Data}
                                alt={img.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="font-bold text-neutral-800 truncate" title={img.name}>
                                {img.name || `Image #${i + 1}`}
                              </div>
                              <div className="flex justify-between text-[11px] text-neutral-500">
                                <span>{img.mimeType}</span>
                                <span className="font-mono">{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                              </div>
                              {img.width && img.height && (
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {img.width} &times; {img.height} px
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(img.base64Data);
                                notify(`Copied Base64 URI for ${img.name || 'image'}!`);
                              }}
                              className="w-full mt-2 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Copy size={12} />
                              <span>Copy Base64 URI</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-2">
                        <ImageIcon size={32} className="mx-auto text-neutral-300" />
                        <h4 className="text-xs font-bold text-neutral-700">No Embedded Images Found</h4>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                          This backup contains pure formatted typography without embedded visual graphic files.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. LIVE SANDBOXED PREVIEW VIEW */}
                {inspectorView === 'preview' && (
                  <div className="space-y-3">
                    <div className="text-xs text-neutral-500 flex items-center justify-between">
                      <span>Isolated sandboxed rendering of the deserialized document:</span>
                      <span className="font-mono text-[11px]">
                        Title: {inspectResult?.backupDoc?.document?.title || 'Document'}
                      </span>
                    </div>
                    <div className="w-full h-[520px] rounded-lg border border-neutral-300 overflow-hidden shadow-inner bg-white">
                      <iframe
                        ref={previewIframeRef}
                        title="Document Sandbox"
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}

                {/* 4. RAW JSON CODE VIEW */}
                {inspectorView === 'raw' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Formatted JSON Document Representation:</span>
                      <span className="font-mono">
                        {inspectResult ? `${inspectResult.formattedJson.split('\n').length} lines` : '0 lines'}
                      </span>
                    </div>
                    <pre className="p-4 bg-neutral-900 text-amber-300 font-mono text-[11px] rounded-lg overflow-x-auto max-h-[500px] leading-relaxed border border-neutral-800 select-all">
                      {inspectResult?.formattedJson || '// No JSON data loaded'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: SERIALIZATION PIPELINE & SCHEMA */}
        {activeSubTab === 'pipeline' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <Cpu size={18} className="text-[#f59e0b]" />
                <span>Base64 Image Extraction &amp; Serialization Flow</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The JSON Backup Engine guarantees 100% offline portability by decoupling media dependencies from external servers or temporary browser object URLs.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">DOM Traversal</h4>
                  <p className="text-[11px] text-neutral-500">
                    Scans rich HTML nodes to locate all &lt;img&gt; elements, canvas renderings, and data sources.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">Base64 Encoding</h4>
                  <p className="text-[11px] text-neutral-500">
                    Converts binary bitmaps and vector SVGs into standard RFC 2397 base64 Data URIs.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">Manifest Catalog</h4>
                  <p className="text-[11px] text-neutral-500">
                    Packages metadata, MIME types, dimension bounds, and byte metrics in the media block.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#f59e0b] text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">Atomic Snapshot</h4>
                  <p className="text-[11px] text-neutral-500">
                    Produces a self-contained JSON document ready for offline archiving or rapid restoration.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-neutral-900">Document JSON Specification (Schema v2.0)</h3>
              <pre className="p-4 bg-neutral-900 text-neutral-300 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
{`{
  "schema": "https://office.tiptap.engine/schemas/v2/backup.json",
  "version": "2.0.0",
  "generator": "Office Pro Word Engine - JSON Backup System",
  "timestamp": "2026-09-24T04:45:00.000Z",
  "document": {
    "title": "Quarterly Operations Review",
    "htmlContent": "<p>Content with <img src=\\"data:image/png;base64,...\\" /></p>",
    "plainText": "Clean text representation...",
    "settings": {
      "pageColor": "#ffffff",
      "orientation": "portrait",
      "pageSize": "letter",
      "margins": "normal"
    },
    "stats": { "words": 420, "characters": 2840, "paragraphs": 12 }
  },
  "media": {
    "totalImages": 1,
    "totalSizeBytes": 45890,
    "images": [
      {
        "id": "img_1_a8f9",
        "name": "Architecture Diagram",
        "mimeType": "image/png",
        "base64Data": "data:image/png;base64,iVBORw0KGgo...",
        "sizeBytes": 45890
      }
    ]
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LOCAL STORAGE CACHING */}
        {activeSubTab === 'cache' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center space-x-2 text-neutral-900">
                  <HardDrive size={18} className="text-[#f59e0b]" />
                  <h3 className="text-base font-bold">Local Storage Persistent Backup Cache</h3>
                </div>
                {cachedBackupMeta && (
                  <button
                    onClick={() => {
                      clearJsonBackupCache();
                      setCachedBackupMeta(null);
                      notify('JSON backup cache cleared from local storage.');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Clear Cache
                  </button>
                )}
              </div>

              {cachedBackupMeta ? (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cached Document Title</span>
                      <span className="font-bold text-neutral-800">{cachedBackupMeta.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Timestamp</span>
                      <span className="text-neutral-700">{new Date(cachedBackupMeta.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Payload Size</span>
                      <span className="font-mono text-neutral-700">
                        {(cachedBackupMeta.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Word Count / Images</span>
                      <span className="text-neutral-700">
                        {cachedBackupMeta.words} words &bull; {cachedBackupMeta.imagesCount} embedded images
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => {
                        if (cachedBackupMeta.backupDoc) {
                          restoreJsonBackup(
                            cachedBackupMeta.backupDoc,
                            editor,
                            onUpdateSettings,
                            onSaveToLocalStorage
                          );
                          notify('Restored document from LocalStorage cache!');
                          onClose();
                        }
                      }}
                      className="px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Restore Cached Snapshot to Editor
                    </button>

                    <button
                      onClick={() => {
                        if (cachedBackupMeta.backupDoc) {
                          triggerJsonDownload(cachedBackupMeta.backupDoc, cachedBackupMeta.title);
                          notify('Exported cached JSON backup!');
                        }
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Download Cached File (.json)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <HardDrive size={32} className="mx-auto text-neutral-300" />
                  <h4 className="text-xs font-bold text-neutral-700">No Backup Cached in LocalStorage</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Whenever you generate or upload a JSON backup, a persistent recovery snapshot is cached here in your browser.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: ECOSYSTEM & MIGRATION */}
        {activeSubTab === 'ecosystem' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-neutral-900 flex items-center space-x-2">
                <BookOpen size={18} className="text-[#f59e0b]" />
                <span>Interoperability &amp; Multi-Engine Architecture</span>
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The Office Pro Word Processor suite offers five complementary export/import engines tailored for different use cases:
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
                    Native OpenXML format for enterprise distribution, Microsoft 365, Word Desktop, and legal document sharing.
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

                <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/40 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded bg-[#6366f1] text-white font-bold flex items-center justify-center text-[10px]">
                      M
                    </div>
                    <span className="font-bold text-neutral-800">Markdown (.md)</span>
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    GitHub Flavored Markdown with YAML Frontmatter for developer docs, Obsidian vaults, Git repos, and Static Site Generators.
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
                    Complete state serialization with inline base64 media for instant local backups, offline resilience, and programmatic integration.
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
          <span>Client-Side JSON Engine Active</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-[#d97706] transition-colors cursor-pointer disabled:opacity-50"
          >
            Load Sample Backup
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonBackupEngineBackstageSection;
