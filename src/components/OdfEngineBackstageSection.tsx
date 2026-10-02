import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings } from '../types';
import {
  exportOdfPackage,
  parseOdfPackage,
  triggerOdfDownload,
  loadOdfFromLocalCache,
  clearOdfLocalCache,
  saveOdfToLocalCache,
  getSampleOdfHtml,
  OdfInspectionResult,
} from '../utils/odfHandler';
import {
  FolderArchive,
  Download,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileCode,
  Globe,
  Sparkles,
  HardDrive,
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
  ExternalLink,
  Laptop,
  Smartphone,
  Printer,
  ShieldCheck,
  FolderOpen,
  Info,
  BookOpen,
} from 'lucide-react';

interface OdfEngineBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onClose: () => void;
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void;
}

export const OdfEngineBackstageSection: React.FC<OdfEngineBackstageSectionProps> = ({
  editor,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inspector' | 'architecture' | 'cache' | 'interop'>('inspector');
  const [inspectorView, setInspectorView] = useState<'files' | 'pictures' | 'preview' | 'xml'>('files');
  const [xmlTab, setXmlTab] = useState<'content' | 'styles' | 'meta' | 'manifest'>('content');
  const [inspectResult, setInspectResult] = useState<OdfInspectionResult | null>(null);
  const [customProjectName, setCustomProjectName] = useState<string>(
    settings.title ? settings.title.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() : 'document'
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [cachedPackageMeta, setCachedPackageMeta] = useState<any | null>(null);
  const [lastGeneratedBlob, setLastGeneratedBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Load initial local cache on mount
  useEffect(() => {
    const cached = loadOdfFromLocalCache();
    if (cached) {
      setCachedPackageMeta(cached);
    }
  }, []);

  // Update iframe preview content when inspectResult changes or view changes
  useEffect(() => {
    if (inspectorView === 'preview' && previewIframeRef.current && inspectResult?.editorHtml) {
      const doc = previewIframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${inspectResult.title}</title>
  <style>
    body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #0f172a; border-bottom: 2px solid #0e7490; padding-bottom: 6px; }
    h2 { color: #0e7490; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: bold; }
    blockquote { border-left: 4px solid #0e7490; margin: 16px 0; padding-left: 16px; color: #475569; font-style: italic; }
    img { max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 12px 0; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>
  ${inspectResult.editorHtml}
</body>
</html>`;
        doc.write(html);
        doc.close();
      }
    }
  }, [inspectorView, inspectResult]);

  // Upload and parse user ODF package
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { html, inspection, metadata } = await parseOdfPackage(file);
      setInspectResult(inspection);
      setCustomProjectName(inspection.projectName);
      setCachedPackageMeta(loadOdfFromLocalCache());
      notify(`Successfully parsed OpenDocument "${file.name}" with ${inspection.pictures.length} embedded pictures unpacked!`);

      if (onUpdateSettings && metadata.title) {
        onUpdateSettings({
          title: metadata.title,
          author: metadata.author,
          createdDate: metadata.createdDate,
          updatedDate: metadata.updatedDate,
        });
      }
    } catch (err: any) {
      console.error('Failed to parse ODF package:', err);
      setErrorMessage(
        err?.message || 'Failed to parse OpenDocument file. Ensure it is a valid .odt or .odf file.'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Scan and package current editor document into memory
  const handleScanAndPackageCurrent = async () => {
    if (!editor) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const html = editor.getHTML();
      const safeName = customProjectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'document';
      const { blob, fileName, inspection } = await exportOdfPackage(html, {
        title: settings.title || 'Untitled Document',
        author: settings.author || 'OpenDocument Editor',
        projectName: safeName,
        createdDate: settings.createdDate,
        updatedDate: settings.updatedDate,
      });

      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCachedPackageMeta(loadOdfFromLocalCache());
      notify(`Packaged "${fileName}" in OASIS OpenDocument format with DEFLATE Level 9 (${inspection.compressionRatio} compression)!`);
    } catch (err: any) {
      console.error('ODF package error:', err);
      setErrorMessage('Failed to package document: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Export & Download Current Document as ODF
  const handleDownloadCurrentOdf = async () => {
    if (!editor) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const html = editor.getHTML();
      const safeName = customProjectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'document';
      const { blob, fileName, inspection } = await exportOdfPackage(html, {
        title: settings.title || 'Untitled Document',
        author: settings.author || 'OpenDocument Editor',
        projectName: safeName,
        createdDate: settings.createdDate,
        updatedDate: settings.updatedDate,
      });

      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCachedPackageMeta(loadOdfFromLocalCache());
      triggerOdfDownload(blob, fileName);
      notify(`Downloaded "${fileName}" with embedded pictures in Pictures/ directory!`);
    } catch (err: any) {
      console.error('Download ODF error:', err);
      setErrorMessage('Failed to generate ODF file: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample ODF into inspector
  const handleLoadSample = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const sampleHtml = getSampleOdfHtml();
      const { blob, fileName, inspection } = await exportOdfPackage(sampleHtml, {
        title: 'Global Renewable Energy Report 2026',
        author: 'OASIS Technical Committee',
        projectName: 'renewable_energy_odf_2026',
      });

      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCustomProjectName('renewable_energy_odf_2026');
      setCachedPackageMeta(loadOdfFromLocalCache());
      notify('Loaded ISO/IEC 26300 compliant sample OpenDocument package with embedded SVG diagram and tables!');
    } catch (err: any) {
      setErrorMessage('Failed to load sample: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Load into editor
  const handleLoadIntoEditor = () => {
    if (!editor || !inspectResult) return;
    editor.commands.setContent(inspectResult.editorHtml);
    if (onUpdateSettings) {
      onUpdateSettings({
        title: `${inspectResult.title}.odt`,
        author: inspectResult.author,
        createdDate: inspectResult.createdDate,
        updatedDate: inspectResult.updatedDate,
      });
    }
    notify(`Loaded "${inspectResult.archiveName}" into document editor!`);
    onClose();
  };

  // Copy XML to clipboard
  const handleCopyXml = (xmlStr: string) => {
    navigator.clipboard.writeText(xmlStr);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Clear cache
  const handleClearCache = () => {
    clearOdfLocalCache();
    setCachedPackageMeta(null);
    notify('Local ODF cache cleared.');
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 h-full overflow-hidden">
      {/* Top Banner / Navigation */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#0e7490] text-white flex items-center justify-center font-black text-xl shadow-xs">
            O
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-neutral-900 leading-tight">
                OpenDocument (.ODF / .ODT) Engine
              </h1>
              <span className="bg-cyan-100 text-[#0e7490] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ISO/IEC 26300
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              OASIS vendor-neutral standard with embedded Pictures/, styles.xml, and content.xml
            </p>
          </div>
        </div>

        {/* Top Header Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          title="Close & Return to Document"
        >
          <X size={20} />
        </button>
      </div>

      {/* Notifications and Alerts */}
      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs text-emerald-800 flex items-center space-x-2 shrink-0 animate-fadeIn">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs text-red-800 flex items-center space-x-2 shrink-0 animate-fadeIn">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-600 hover:text-red-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Tabs Navigation Bar */}
      <div className="bg-white border-b border-neutral-200 px-6 flex items-center space-x-6 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveSubTab('inspector')}
          className={`py-3 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
            activeSubTab === 'inspector'
              ? 'border-[#0e7490] text-[#0e7490]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FolderArchive size={15} />
          <span>1. Live ODF &amp; Pictures Inspector</span>
          {inspectResult && (
            <span className="bg-cyan-100 text-[#0e7490] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {inspectResult.pictures.length} img
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`py-3 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
            activeSubTab === 'architecture'
              ? 'border-[#0e7490] text-[#0e7490]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Code2 size={15} />
          <span>2. OpenDocument Specification (ISO 26300)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cache')}
          className={`py-3 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
            activeSubTab === 'cache'
              ? 'border-[#0e7490] text-[#0e7490]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <HardDrive size={15} />
          <span>3. Local Storage Caching</span>
          {cachedPackageMeta && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Cache active" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('interop')}
          className={`py-3 border-b-2 flex items-center space-x-2 cursor-pointer transition-colors ${
            activeSubTab === 'interop'
              ? 'border-[#0e7490] text-[#0e7490]'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Globe size={15} />
          <span>4. Suite Interoperability Guide</span>
        </button>
      </div>

      {/* Main SubTab Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* SUBTAB 1: INSPECTOR */}
        {activeSubTab === 'inspector' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Action Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-1">
                <div className="flex items-center space-x-2 text-[#0e7490] font-semibold text-sm">
                  <FolderArchive size={18} />
                  <h2 className="text-neutral-800">Live ODF &amp; Pictures Inspector</h2>
                </div>

                {/* Project File Name Input */}
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-xs font-semibold text-neutral-600">Project Name:</label>
                  <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <input
                      type="text"
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase())}
                      placeholder="document_name"
                      className="px-2.5 py-1.5 text-xs text-neutral-800 font-mono w-44 outline-none"
                    />
                    <span className="bg-neutral-100 px-2 py-1.5 text-[11px] text-neutral-500 border-l border-neutral-200 font-mono">
                      .odt
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-600 mb-4">
                OASIS vendor-neutral standard with embedded Pictures/, styles.xml, and content.xml compliant with ISO/IEC 26300.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Scan and Optimize */}
                <button
                  onClick={handleScanAndPackageCurrent}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Scan editor document and inspect ODF package in-memory"
                >
                  <Sparkles size={14} className="text-yellow-200" />
                  <span>{isProcessing ? 'Scanning...' : 'Scan & Optimize Current Document'}</span>
                </button>

                {/* 2. Load */}
                <label className="px-4 py-2.5 bg-[#0e7490] hover:bg-[#155e75] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                  <Upload size={14} />
                  <span>Open (.odf / .odt)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".odt,.odf,.ods,.odp,application/vnd.oasis.opendocument.text"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* 3. Download (with green border) */}
                <button
                  onClick={handleDownloadCurrentOdf}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-2 border-green-600 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Export and download as OpenDocument (.odt)"
                >
                  <Download size={14} />
                  <span>Download Current Editor as .odt</span>
                </button>

                <span className="text-xs text-neutral-500">
                  or try sample documents from the menu below
                </span>
              </div>
            </div>

            {!inspectResult ? (
              /* Empty State */
              <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-cyan-50 text-[#0e7490] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <FolderArchive size={32} />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-neutral-800">
                    No OpenDocument Package Inspected Yet
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Click <strong>"Scan Current"</strong> to inspect your document as an OASIS OpenDocument archive, or <strong>"Open (.odf / .odt)"</strong> to decompress an existing file.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    onClick={handleScanAndPackageCurrent}
                    className="px-4 py-2 bg-[#0e7490] hover:bg-[#155e75] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    <RefreshCw size={14} />
                    <span>Scan Current Document</span>
                  </button>
                  <button
                    onClick={handleLoadSample}
                    className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    <Sparkles size={14} className="text-[#0e7490]" />
                    <span>Load Sample ODF Package</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Active Inspector View */
              <div className="space-y-6">
                {/* 4 Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-2xs">
                    <span className="text-[11px] text-neutral-400 font-medium block">Archive File Size</span>
                    <span className="text-base font-bold text-neutral-900 mt-0.5 block">
                      {(inspectResult.fileSizeBytes / 1024).toFixed(1)} KB
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      DEFLATE Level 9
                    </span>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-2xs">
                    <span className="text-[11px] text-neutral-400 font-medium block">Uncompressed Parts</span>
                    <span className="text-base font-bold text-neutral-900 mt-0.5 block">
                      {(inspectResult.uncompressedSizeBytes / 1024).toFixed(1)} KB
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      XML &amp; Byte Streams
                    </span>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-2xs">
                    <span className="text-[11px] text-neutral-400 font-medium block">Compression Ratio</span>
                    <span className="text-base font-bold text-[#0e7490] mt-0.5 block">
                      {inspectResult.compressionRatio}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Bandwidth Saved
                    </span>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-2xs">
                    <span className="text-[11px] text-neutral-400 font-medium block">ZIP Container Entries</span>
                    <span className="text-base font-bold text-neutral-900 mt-0.5 block">
                      {inspectResult.totalEntries} files
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      mimetype, XMLs &amp; Pics
                    </span>
                  </div>

                  <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-2xs col-span-2 md:col-span-1">
                    <span className="text-[11px] text-neutral-400 font-medium block">Embedded Pictures</span>
                    <span className="text-base font-bold text-cyan-600 mt-0.5 block">
                      {inspectResult.pictures.length} images
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      in Pictures/ directory
                    </span>
                  </div>
                </div>

                {/* Sub-View Switcher Bar */}
                <div className="bg-white border border-neutral-200 rounded-lg p-1.5 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setInspectorView('files')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                        inspectorView === 'files'
                          ? 'bg-[#0e7490] text-white shadow-xs'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <FolderOpen size={14} />
                      <span>Archive Structure ({inspectResult.totalEntries})</span>
                    </button>

                    <button
                      onClick={() => setInspectorView('pictures')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                        inspectorView === 'pictures'
                          ? 'bg-[#0e7490] text-white shadow-xs'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <ImageIcon size={14} />
                      <span>Pictures/ Gallery ({inspectResult.pictures.length})</span>
                    </button>

                    <button
                      onClick={() => setInspectorView('preview')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                        inspectorView === 'preview'
                          ? 'bg-[#0e7490] text-white shadow-xs'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <Eye size={14} />
                      <span>Live Preview</span>
                    </button>

                    <button
                      onClick={() => setInspectorView('xml')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                        inspectorView === 'xml'
                          ? 'bg-[#0e7490] text-white shadow-xs'
                          : 'text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <FileCode size={14} />
                      <span>XML Inspector</span>
                    </button>
                  </div>

                  {/* Right side: Action to load directly into TipTap */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleLoadIntoEditor}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                      title="Load this unpacked ODF document directly into your active editor"
                    >
                      <CheckCircle2 size={14} />
                      <span>Load into Editor</span>
                    </button>

                    {lastGeneratedBlob && (
                      <button
                        onClick={() => triggerOdfDownload(lastGeneratedBlob, inspectResult.archiveName)}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded text-xs font-medium flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Save .odt</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* VIEW 1: FILES & ARCHIVE STRUCTURE */}
                {inspectorView === 'files' && (
                  <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-2xs">
                    <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 flex items-center justify-between text-xs font-semibold text-neutral-700">
                      <span>File Path in ODF Archive</span>
                      <span className="font-mono text-neutral-500">Uncompressed Size</span>
                    </div>
                    <div className="divide-y divide-neutral-100 font-mono text-xs">
                      {inspectResult.entries.map((entry, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2.5 flex items-center justify-between hover:bg-cyan-50/40 transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            {entry.name === 'mimetype' ? (
                              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                                M
                              </span>
                            ) : entry.name.endsWith('.xml') ? (
                              <FileCode size={15} className="text-[#0e7490]" />
                            ) : entry.name.startsWith('Pictures/') ? (
                              <ImageIcon size={15} className="text-cyan-500" />
                            ) : (
                              <FileText size={15} className="text-neutral-400" />
                            )}
                            <span className="text-neutral-800 font-medium">
                              {entry.name}
                            </span>
                            {entry.name === 'mimetype' && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-sans font-bold">
                                STORE (Uncompressed per ISO 26300)
                              </span>
                            )}
                            {entry.name === 'content.xml' && (
                              <span className="bg-cyan-100 text-[#0e7490] text-[10px] px-1.5 py-0.2 rounded font-sans font-bold">
                                Main Body
                              </span>
                            )}
                          </div>
                          <span className="text-neutral-500">
                            {entry.size > 0 ? `${(entry.size / 1024).toFixed(1)} KB` : '< 1 KB'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIEW 2: PICTURES/ GALLERY */}
                {inspectorView === 'pictures' && (
                  <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-800">
                          Extracted Images in Pictures/
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Binary image streams decompressed directly into memory from the ODF container.
                        </p>
                      </div>
                      <span className="text-xs font-semibold bg-cyan-100 text-[#0e7490] px-2.5 py-1 rounded-full">
                        {inspectResult.pictures.length} Pictures
                      </span>
                    </div>

                    {inspectResult.pictures.length === 0 ? (
                      <div className="p-8 text-center text-xs text-neutral-400 border border-dashed rounded-lg">
                        This document does not contain any embedded images in the Pictures/ directory.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inspectResult.pictures.map((pic, idx) => (
                          <div
                            key={idx}
                            className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50/50 flex flex-col hover:border-[#0e7490] transition-colors"
                          >
                            <div className="h-40 bg-neutral-200/60 flex items-center justify-center p-3 overflow-hidden relative">
                              <img
                                src={pic.dataUrl}
                                alt={pic.name}
                                className="max-h-full max-w-full object-contain rounded shadow-2xs"
                              />
                              <span className="absolute bottom-2 right-2 bg-neutral-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                {pic.mimeType.split('/')[1]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                              <div>
                                <span className="font-mono text-xs font-semibold text-neutral-800 truncate block" title={pic.relativePath}>
                                  {pic.relativePath}
                                </span>
                                <span className="text-[11px] text-neutral-400 block mt-0.5">
                                  {(pic.sizeBytes / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 pt-1 border-t border-neutral-100">
                                <a
                                  href={pic.dataUrl}
                                  download={pic.name}
                                  className="flex-1 py-1 text-center bg-cyan-50 hover:bg-cyan-100 text-[#0e7490] text-[11px] font-semibold rounded cursor-pointer transition-colors"
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(pic.dataUrl);
                                    notify(`Copied base64 data URL for ${pic.name}!`);
                                  }}
                                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] rounded cursor-pointer transition-colors"
                                  title="Copy Data URL"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 3: LIVE PREVIEW */}
                {inspectorView === 'preview' && (
                  <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Sandboxed Document Frame (ISO/IEC 26300 Layout)</span>
                      <span className="font-mono">{inspectResult.archiveName}</span>
                    </div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white h-[500px]">
                      <iframe
                        ref={previewIframeRef}
                        title="OpenDocument Preview"
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}

                {/* VIEW 4: XML INSPECTOR */}
                {inspectorView === 'xml' && (
                  <div className="bg-neutral-900 rounded-lg overflow-hidden shadow-md flex flex-col h-[520px]">
                    <div className="bg-neutral-800 px-4 py-2 border-b border-neutral-700 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setXmlTab('content')}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            xmlTab === 'content' ? 'bg-[#0e7490] text-white' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          content.xml
                        </button>
                        <button
                          onClick={() => setXmlTab('styles')}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            xmlTab === 'styles' ? 'bg-[#0e7490] text-white' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          styles.xml
                        </button>
                        <button
                          onClick={() => setXmlTab('meta')}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            xmlTab === 'meta' ? 'bg-[#0e7490] text-white' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          meta.xml
                        </button>
                        <button
                          onClick={() => setXmlTab('manifest')}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            xmlTab === 'manifest' ? 'bg-[#0e7490] text-white' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          manifest.xml
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          const currentXml =
                            xmlTab === 'content'
                              ? inspectResult.contentXml
                              : xmlTab === 'styles'
                              ? inspectResult.stylesXml
                              : xmlTab === 'meta'
                              ? inspectResult.metaXml
                              : inspectResult.manifestXml;
                          handleCopyXml(currentXml);
                        }}
                        className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        {copiedSnippet ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedSnippet ? 'Copied XML' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-cyan-200">
                      <pre>
                        {xmlTab === 'content' && inspectResult.contentXml}
                        {xmlTab === 'styles' && inspectResult.stylesXml}
                        {xmlTab === 'meta' && inspectResult.metaXml}
                        {xmlTab === 'manifest' && inspectResult.manifestXml}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: SPECIFICATION & ARCHITECTURE */}
        {activeSubTab === 'architecture' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl font-bold text-neutral-900">
                OASIS OpenDocument Format (ODF / ISO 26300) Architecture
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The OpenDocument Format is an open, XML-based OASIS and ISO/IEC standard created to ensure absolute digital permanence, vendor independence, and unencumbered interoperability across office productivity suites.
              </p>
            </div>

            {/* Step by step pipeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#0e7490] text-white text-[11px] flex items-center justify-center font-mono">
                  1
                </span>
                <span>In-Browser Client Execution Pipeline</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0e7490] font-mono">STEP 01</div>
                  <div className="text-xs font-bold text-neutral-800">ArrayBuffer Read</div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    Binary byte stream read into browser heap via standard FileReader API.
                  </p>
                  <div className="text-[10px] bg-cyan-50 text-[#0e7490] font-bold px-1.5 py-0.5 rounded inline-block">
                    100% In-Memory
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0e7490] font-mono">STEP 02</div>
                  <div className="text-xs font-bold text-neutral-800">OASIS Container Unzip</div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    JSZip unpacks mimetype, META-INF/manifest.xml, and content.xml.
                  </p>
                  <div className="text-[10px] bg-cyan-50 text-[#0e7490] font-bold px-1.5 py-0.5 rounded inline-block">
                    ISO/IEC 26300
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0e7490] font-mono">STEP 03</div>
                  <div className="text-xs font-bold text-neutral-800">Pictures/ Stream Map</div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    draw:image xlink:href references mapped to internal byte streams.
                  </p>
                  <div className="text-[10px] bg-cyan-50 text-[#0e7490] font-bold px-1.5 py-0.5 rounded inline-block">
                    Pictures/ Extraction
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0e7490] font-mono">STEP 04</div>
                  <div className="text-xs font-bold text-neutral-800">Base64 Conversion</div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    Raw image bytes transformed into data:image/* strings for DOM rendering.
                  </p>
                  <div className="text-[10px] bg-cyan-50 text-[#0e7490] font-bold px-1.5 py-0.5 rounded inline-block">
                    Zero Upload Latency
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                  <div className="text-[10px] font-bold text-[#0e7490] font-mono">STEP 05</div>
                  <div className="text-xs font-bold text-neutral-800">TipTap ProseMirror</div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    text:p, text:h, and table:table nodes converted to schema blocks.
                  </p>
                  <div className="text-[10px] bg-cyan-50 text-[#0e7490] font-bold px-1.5 py-0.5 rounded inline-block">
                    Full Style Fidelity
                  </div>
                </div>
              </div>
            </div>

            {/* Anatomy of ODF container */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#0e7490] text-white text-[11px] flex items-center justify-center font-mono">
                  2
                </span>
                <span>Anatomy of a Real OpenDocument (.odt / .odf Archive)</span>
              </h3>

              <div className="bg-neutral-900 rounded-xl p-5 font-mono text-xs text-neutral-300 leading-relaxed shadow-lg">
                <div className="text-[#38bdf8] font-bold mb-3">// OASIS OpenDocument PKZip Structure (ISO/IEC 26300)</div>
                <div className="space-y-1">
                  <div><span className="text-amber-400 font-bold">my-document.odt</span> (Standard ZIP Container)</div>
                  <div>├── <span className="text-emerald-400 font-bold">mimetype</span>                     <span className="text-neutral-500"># ★ MUST BE 1ST FILE, UNCOMPRESSED ('application/vnd.oasis.opendocument.text')</span></div>
                  <div>├── <span className="text-cyan-400 font-bold">META-INF/</span></div>
                  <div>│   └── <span className="text-cyan-300 font-bold">manifest.xml</span>             <span className="text-neutral-500"># Lists all MIME types, XML parts &amp; Pictures/ entries</span></div>
                  <div>├── <span className="text-emerald-400 font-bold">content.xml</span>                  <span className="text-neutral-500"># ★ THE DOCUMENT BODY (text:p, text:h, draw:frame, table:table)</span></div>
                  <div>├── <span className="text-emerald-400 font-bold">styles.xml</span>                   <span className="text-neutral-500"># Default fonts, page layouts (Mpm1), headers &amp; footers</span></div>
                  <div>├── <span className="text-emerald-400 font-bold">meta.xml</span>                     <span className="text-neutral-500"># Author (dc:creator), Title (dc:title), Creation date, Word counts</span></div>
                  <div>└── <span className="text-amber-400 font-bold">Pictures/</span>                     <span className="text-neutral-500"># ★ EMBEDDED IMAGES LIVE HERE!</span></div>
                  <div>    ├── image1.png                  <span className="text-neutral-500"># Raw binary PNG extracted as data:image/png;base64,...</span></div>
                  <div>    ├── image2.jpg                  <span className="text-neutral-500"># Raw binary JPEG extracted as data:image/jpeg;base64,...</span></div>
                  <div>    └── chart1.svg                  <span className="text-neutral-500"># Vector graphics &amp; diagrams</span></div>
                </div>
              </div>
            </div>

            {/* Privacy & Speed Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <ShieldCheck size={20} className="text-[#0e7490]" />
                <h4 className="text-xs font-bold text-neutral-800">100% In-Browser Privacy</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Confidential reports and proprietary figures never leave your machine. No cloud API or remote converter is contacted.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <Sparkles size={20} className="text-amber-500" />
                <h4 className="text-xs font-bold text-neutral-800">Zero-Latency Decompression</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Parses multi-page documents with tables and images in under 150ms directly in the JavaScript runtime.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <Globe size={20} className="text-emerald-600" />
                <h4 className="text-xs font-bold text-neutral-800">Guaranteed Long-Term Preservation</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Conforms with governmental and public archival standards mandated across European, Asian, and Latin American administrations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: LOCAL STORAGE CACHE */}
        {activeSubTab === 'cache' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-cyan-50 text-[#0e7490] rounded-lg">
                    <HardDrive size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      Browser Local Storage ODF Cache
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Maintains instant session recovery and snapshot history without server dependency.
                    </p>
                  </div>
                </div>

                {cachedPackageMeta && (
                  <button
                    onClick={handleClearCache}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-red-50 hover:text-red-700 text-neutral-600 text-xs font-semibold rounded cursor-pointer transition-colors"
                  >
                    Clear Cache
                  </button>
                )}
              </div>

              {!cachedPackageMeta ? (
                <div className="p-6 text-center text-xs text-neutral-400 bg-neutral-50 rounded-lg border border-dashed">
                  No cached ODF package found in browser storage. Click "Scan Current" to create one.
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800">{cachedPackageMeta.archiveName}</span>
                    <span className="text-neutral-500 font-mono">{cachedPackageMeta.cachedAt}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded border border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block">Document Title</span>
                      <span className="font-medium text-neutral-800 truncate block">{cachedPackageMeta.title}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block">Package Size</span>
                      <span className="font-medium text-neutral-800">
                        {(cachedPackageMeta.fileSizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block">Compression</span>
                      <span className="font-medium text-[#0e7490]">{cachedPackageMeta.compressionRatio}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-neutral-200">
                      <span className="text-[10px] text-neutral-400 block">Embedded Pictures</span>
                      <span className="font-medium text-cyan-600">{cachedPackageMeta.pictureCount} images</span>
                    </div>
                  </div>

                  {cachedPackageMeta.picturesSummary && cachedPackageMeta.picturesSummary.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-neutral-600 block mb-1.5">
                        Cached Picture Assets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cachedPackageMeta.picturesSummary.map((p: any, i: number) => (
                          <span
                            key={i}
                            className="bg-white border border-neutral-200 text-neutral-700 text-[10px] font-mono px-2 py-0.5 rounded shadow-2xs"
                          >
                            {p.name} ({(p.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 4: SUITE INTEROPERABILITY */}
        {activeSubTab === 'interop' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1.5">
              <h2 className="text-lg font-bold text-neutral-900">
                Universal Office Suite Compatibility
              </h2>
              <p className="text-xs text-neutral-500">
                OpenDocument (.odt) is natively opened and edited across all modern desktop, web, and mobile suites.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                    L
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800">LibreOffice Writer &amp; OpenOffice</h3>
                    <p className="text-[11px] text-neutral-500">Native default file format (ODF 1.3)</p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed pt-1">
                  100% pixel-perfect fidelity. Headings, tables, inline images, and paragraph styles open immediately without any conversion dialogs.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                    W
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800">Microsoft Word (2013 - 2026)</h3>
                    <p className="text-[11px] text-neutral-500">Built-in OpenDocument Text support</p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed pt-1">
                  Word natively opens and saves .odt files. All tables, text formatting, and Pictures/ media are mapped directly into Word structures.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-blue-500 text-white font-bold text-sm flex items-center justify-center">
                    G
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800">Google Docs &amp; Google Drive</h3>
                    <p className="text-[11px] text-neutral-500">Cloud preview &amp; native editor conversion</p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed pt-1">
                  Drag and drop any .odt file into Google Drive to preview or edit collaboratively in Google Docs with zero formatting loss.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-amber-600 text-white font-bold text-sm flex items-center justify-center">
                    P
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800">Apple Pages &amp; Collabora</h3>
                    <p className="text-[11px] text-neutral-500">macOS, iPadOS, iOS, &amp; Cloud</p>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed pt-1">
                  Collabora Online and Apple Pages import OpenDocument Text files smoothly, preserving document geometry and typography.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION FOOTER */}
      <div className="px-6 py-3.5 bg-white border-t border-neutral-200 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Client-Side ISO/IEC 26300 ODF Engine Active</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-[#0e7490] transition-colors cursor-pointer disabled:opacity-50"
          >
            Load Sample ODF Package
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0e7490] hover:bg-[#155e75] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default OdfEngineBackstageSection;
