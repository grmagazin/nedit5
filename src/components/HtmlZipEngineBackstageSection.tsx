import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings } from '../types';
import {
  exportHtmlZipPackage,
  parseHtmlZipPackage,
  triggerZipDownload,
  loadHtmlZipFromLocalCache,
  clearHtmlZipLocalCache,
  saveHtmlZipToLocalCache,
  sanitizeProjectName,
  HtmlZipInspectionResult,
} from '../utils/htmlZipHandler';
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
} from 'lucide-react';

interface HtmlZipEngineBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onClose: () => void;
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void;
}

export const HtmlZipEngineBackstageSection: React.FC<HtmlZipEngineBackstageSectionProps> = ({
  editor,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inspector' | 'architecture' | 'cache' | 'sharing'>('inspector');
  const [inspectorView, setInspectorView] = useState<'files' | 'images' | 'preview' | 'html'>('files');
  const [inspectResult, setInspectResult] = useState<HtmlZipInspectionResult | null>(null);
  const [customProjectName, setCustomProjectName] = useState<string>(
    sanitizeProjectName(settings.title || 'project_document')
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
    const cached = loadHtmlZipFromLocalCache();
    if (cached) {
      setCachedPackageMeta(cached);
    }
  }, []);

  // Update iframe preview content when inspectResult changes or view changes
  useEffect(() => {
    if (inspectorView === 'preview' && previewIframeRef.current && inspectResult?.rawHtml) {
      const doc = previewIframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        // For the preview iframe, if images have data URLs in editorHtml, we can render the standalone HTML with images intact
        const parser = new DOMParser();
        const fullDoc = parser.parseFromString(inspectResult.rawHtml, 'text/html');

        // Replace relative image sources with their in-memory data URLs for live preview
        const mediaMap = new Map<string, string>();
        inspectResult.media.forEach((m) => {
          mediaMap.set(m.relativePath, m.dataUrl);
          mediaMap.set(m.name, m.dataUrl);
          mediaMap.set(`images/${m.name}`, m.dataUrl);
        });

        const imgs = Array.from(fullDoc.querySelectorAll('img'));
        for (const img of imgs) {
          const src = img.getAttribute('src');
          if (src && mediaMap.has(src)) {
            img.setAttribute('src', mediaMap.get(src)!);
          }
        }

        doc.write(fullDoc.documentElement.outerHTML);
        doc.close();
      }
    }
  }, [inspectorView, inspectResult]);

  // Upload and parse user HTML ZIP package
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await parseHtmlZipPackage(file, file.name);
      setInspectResult(result);
      setCustomProjectName(result.projectName);
      setCachedPackageMeta(loadHtmlZipFromLocalCache());
      notify(`Successfully parsed "${file.name}" with ${result.media.length} images unpacked!`);
    } catch (err: any) {
      console.error('Failed to parse HTML zip package:', err);
      setErrorMessage(
        err?.message || 'Failed to parse ZIP package. Ensure it contains an HTML file and images.'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Scan & package current document in-memory (creates ZIP with images folder & standalone HTML)
  const handleScanAndPackageCurrent = async () => {
    if (!editor) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const html = editor.getHTML();
      const safeName = sanitizeProjectName(customProjectName || settings.title || 'document');
      const { blob, fileName, inspection } = await exportHtmlZipPackage(html, {
        title: settings.title || 'Document',
        projectName: safeName,
      });

      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCachedPackageMeta(loadHtmlZipFromLocalCache());
      notify(`Packaged "${fileName}" with GZIP Deflate level 9 (${inspection.compressionRatio} compression)!`);
    } catch (err: any) {
      console.error('Package error:', err);
      setErrorMessage('Failed to package document: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Export & Download Current Document as HTML + Images ZIP
  const handleDownloadCurrentZip = async () => {
    if (!editor) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const html = editor.getHTML();
      const safeName = sanitizeProjectName(customProjectName || settings.title || 'document');
      const { blob, fileName, inspection } = await exportHtmlZipPackage(html, {
        title: settings.title || 'Document',
        projectName: safeName,
      });

      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCachedPackageMeta(loadHtmlZipFromLocalCache());
      triggerZipDownload(blob, fileName);
      notify(`Downloaded "${fileName}" containing ${safeName}.html and /images/ directory!`);
    } catch (err: any) {
      console.error('Download ZIP error:', err);
      setErrorMessage('Failed to generate ZIP archive: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Download already inspected/generated ZIP
  const handleDownloadInspectedZip = async () => {
    if (!inspectResult) return;
    if (lastGeneratedBlob) {
      triggerZipDownload(lastGeneratedBlob, inspectResult.archiveName);
      notify(`Downloaded "${inspectResult.archiveName}"!`);
      return;
    }
    // Re-package if needed
    if (editor) {
      await handleDownloadCurrentZip();
    }
  };

  // Load parsed/inspected HTML into TipTap Editor
  const handleLoadIntoEditor = () => {
    if (!editor || !inspectResult) return;
    editor.commands.setContent(inspectResult.editorHtml);
    if (onUpdateSettings && inspectResult.projectName) {
      onUpdateSettings({ title: inspectResult.projectName });
    }
    notify('Loaded HTML content and images directly into document editor!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Load a rich sample with images and tables to test the packaging immediately
  const handleLoadSamplePackage = async () => {
    if (!editor) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const sampleHtml = `
      <h1 style="color: #185abd; font-size: 28pt; margin-bottom: 8px;">2026 Global AI &amp; Cloud Infrastructure Architecture</h1>
      <p style="font-size: 14pt; color: #4b5563; margin-top: 0;"><strong>Executive Technology Briefing</strong> &bull; Next-Generation Web Document Distribution</p>
      <hr style="border: 0; border-top: 2px solid #e2e8f0; margin: 20px 0;" />
      
      <h2 style="color: #1e3a8a; font-size: 18pt;">1. Enterprise Systems Overview</h2>
      <p>This document illustrates the universal <strong>HTML + Images (ZIP)</strong> packaging format. The archive contains the primary HTML document, pre-rendered responsive typography, and an isolated <code>/images/</code> folder housing all high-resolution figures.</p>
      
      <blockquote style="border-left: 4px solid #185abd; padding: 12px 18px; background: #f8fafc; font-style: italic; color: #334155; margin: 18px 0;">
        "Self-contained web archives eliminate proprietary viewer requirements, enabling 100% offline document fidelity on any browser (Chrome, Edge, Safari, Firefox) across Windows, macOS, Linux, iOS, and Android."
      </blockquote>

      <p>Figure 1.0 displays an architectural schematic extracted cleanly into the <code>images/</code> folder upon export:</p>
      <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='260' viewBox='0 0 600 260'><rect width='600' height='260' fill='%23185abd' rx='12'/><rect x='20' y='20' width='160' height='220' fill='%232563eb' rx='8'/><text x='100' y='120' fill='white' font-family='sans-serif' font-weight='bold' font-size='16' text-anchor='middle'>project.html</text><text x='100' y='145' fill='%2393c5fd' font-family='sans-serif' font-size='12' text-anchor='middle'>W3C Document</text><rect x='220' y='20' width='160' height='220' fill='%231d4ed8' rx='8'/><text x='300' y='120' fill='white' font-family='sans-serif' font-weight='bold' font-size='16' text-anchor='middle'>/images/ folder</text><text x='300' y='145' fill='%2393c5fd' font-family='sans-serif' font-size='12' text-anchor='middle'>img_1.png, img_2.jpg</text><rect x='420' y='20' width='160' height='220' fill='%231e40af' rx='8'/><text x='500' y='120' fill='white' font-family='sans-serif' font-weight='bold' font-size='16' text-anchor='middle'>100% Offline</text><text x='500' y='145' fill='%2393c5fd' font-family='sans-serif' font-size='12' text-anchor='middle'>Any Browser</text></svg>" alt="Architecture Pipeline" width="600" height="260" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />

      <h2 style="color: #1e3a8a; font-size: 18pt;">2. Performance &amp; Compression Metrics</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Technology Stack</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Storage Engine</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Browser Support</th>
            <th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left;">Offline Capability</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px;"><strong>HTML5 + Media ZIP</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">GZIP DEFLATE Level 9</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px; color: #16a34a;">100% Native (All Browsers)</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px; color: #16a34a;">Instant Offline</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">Microsoft Word (.docx)</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">ECMA-376 ZIP XML</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px; color: #eab308;">Requires Office or Parser</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">Requires MS Word app</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">PDF Document</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">PostScript Streams</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px; color: #16a34a;">Universal PDF Viewer</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">Static / Read-only</td>
          </tr>
        </tbody>
      </table>
      
      <p>Figure 2.0 shows high-speed data transfer vector illustration:</p>
      <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='550' height='200' viewBox='0 0 550 200'><rect width='550' height='200' fill='%23f1f5f9' rx='10' stroke='%23cbd5e1'/><circle cx='80' cy='100' r='50' fill='%23e34f26'/><text x='80' y='108' fill='white' font-family='sans-serif' font-weight='bold' font-size='24' text-anchor='middle'>HTML</text><circle cx='470' cy='100' r='50' fill='%2310b981'/><text x='470' y='108' fill='white' font-family='sans-serif' font-weight='bold' font-size='24' text-anchor='middle'>ZIP</text><path d='M140 100 L410 100' stroke='%23185abd' stroke-width='6' stroke-dasharray='10 6'/><text x='275' y='80' fill='%231e3a8a' font-family='sans-serif' font-weight='bold' font-size='14' text-anchor='middle'>GZIP Deflate Lvl 9 &bull; Zero Server Latency</text></svg>" alt="Data Transmission" width="550" height="200" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />
    `;

    editor.commands.setContent(sampleHtml);
    setCustomProjectName('sample_cloud_architecture');

    try {
      const { blob, fileName, inspection } = await exportHtmlZipPackage(sampleHtml, {
        title: 'Global AI & Cloud Infrastructure Architecture',
        projectName: 'sample_cloud_architecture',
      });
      setInspectResult(inspection);
      setLastGeneratedBlob(blob);
      setCachedPackageMeta(loadHtmlZipFromLocalCache());
      notify('Loaded sample report & generated HTML+Images ZIP package in memory!');
    } catch (err: any) {
      console.warn('Sample packaging error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (!inspectResult?.rawHtml) return;
    navigator.clipboard.writeText(inspectResult.rawHtml);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleRestoreFromCache = () => {
    const cached = loadHtmlZipFromLocalCache();
    if (!cached) {
      notify('No package currently cached in local storage.');
      return;
    }
    setCachedPackageMeta(cached);
    notify(`Loaded cached metadata for "${cached.archiveName}"!`);
  };

  const handleClearCache = () => {
    clearHtmlZipLocalCache();
    setCachedPackageMeta(null);
    notify('Local cache cleared successfully.');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-neutral-800">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#e34f26] via-[#d63d14] to-[#bd2c08] text-white px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3.5">
          {/* HTML Brand Icon Box */}
          <div className="w-10 h-10 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center font-black text-2xl text-white shadow-xs">
            H
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold tracking-tight text-white">
                HTML + Images (ZIP) Web Package Engine
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/25 text-white tracking-wide uppercase border border-white/30">
                W3C Standalone &bull; GZIP Deflate Lvl 9
              </span>
            </div>
            <p className="text-xs text-orange-100 font-normal mt-0.5">
              Save and load offline-portable web packages: <code className="bg-black/20 px-1 rounded font-mono">projectname.html</code> + <code className="bg-black/20 px-1 rounded font-mono">/images/</code> folder — opens in 100% of browsers without any software
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Close & Return to Document"
        >
          <X size={20} />
        </button>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center border-b border-neutral-200 bg-neutral-50 px-6 text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveSubTab('inspector')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'inspector'
              ? 'border-[#e34f26] text-[#e34f26] font-bold bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
          }`}
        >
          <FolderArchive size={15} />
          <span>1. Live ZIP &amp; Asset Inspector</span>
        </button>

        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'architecture'
              ? 'border-[#e34f26] text-[#e34f26] font-bold bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
          }`}
        >
          <Globe size={15} />
          <span>2. Browser Portability &amp; Architecture</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cache')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'cache'
              ? 'border-[#e34f26] text-[#e34f26] font-bold bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
          }`}
        >
          <HardDrive size={15} />
          <span>3. Local Cache &amp; GZIP Storage</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sharing')}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 cursor-pointer transition-colors ${
            activeSubTab === 'sharing'
              ? 'border-[#e34f26] text-[#e34f26] font-bold bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
          }`}
        >
          <Laptop size={15} />
          <span>4. Zero-Software Offline Guide</span>
        </button>
      </div>

      {/* 3. NOTIFICATION & ERROR BANNERS */}
      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle size={16} className="text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4. MAIN SCROLLABLE CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-100/60">
        {/* SUBTAB 1: LIVE ZIP & ASSET INSPECTOR */}
        {activeSubTab === 'inspector' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Action Bar / Controls Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
                    <FolderArchive size={16} className="text-[#e34f26]" />
                    <span>Package, Inspect &amp; Restore HTML + Images Archives</span>
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Extracts embedded images into a dedicated <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">/images/</code> folder and produces a self-contained <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-700">[projectname].html</code> readable on any device.
                  </p>
                </div>

                {/* Project File Name Input */}
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-xs font-semibold text-neutral-600">Project Name:</label>
                  <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <input
                      type="text"
                      value={customProjectName}
                      onChange={(e) => setCustomProjectName(sanitizeProjectName(e.target.value))}
                      placeholder="project_name"
                      className="px-2.5 py-1.5 text-xs text-neutral-800 font-mono w-40 outline-none"
                    />
                    <span className="bg-neutral-100 px-2 py-1.5 text-[11px] text-neutral-500 border-l border-neutral-200">
                      .zip
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-3">
                {/* 1. Scan and Optimize */}
                <button
                  onClick={handleScanAndPackageCurrent}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Package current document in-memory into HTML + Images ZIP"
                >
                  <Sparkles size={14} className="text-yellow-200" />
                  <span>{isProcessing ? 'Packaging...' : 'Scan & Package Current Document'}</span>
                </button>

                {/* 2. Load */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-[#e34f26] hover:bg-[#c93d16] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Upload an existing .zip package to inspect and load"
                >
                  <Upload size={14} />
                  <span>{isProcessing ? 'Reading...' : 'Upload & Inspect .zip Archive'}</span>
                </button>

                {/* 3. Download (with green border) */}
                <button
                  onClick={handleDownloadCurrentZip}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-2 border-green-600 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate and download .zip package"
                >
                  <Download size={14} />
                  <span>Download .zip Package</span>
                </button>

                <span className="text-xs text-neutral-500">
                  or try sample documents from the menu below
                </span>
              </div>
            </div>

            {/* If inspectResult exists, show details & inspector views */}
            {inspectResult ? (
              <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
                {/* Inspection Header Bar */}
                <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#e34f26] flex items-center justify-center font-bold">
                      <FolderArchive size={20} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-sm text-neutral-800">
                          {inspectResult.archiveName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          GZIP {inspectResult.compressionRatio} Saved
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-neutral-500 mt-0.5">
                        <span>
                          Archive Size:{' '}
                          <strong>{(inspectResult.fileSizeBytes / 1024).toFixed(1)} KB</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Uncompressed:{' '}
                          <strong>{(inspectResult.uncompressedSizeBytes / 1024).toFixed(1)} KB</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Files: <strong>{inspectResult.totalEntries}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Images: <strong>{inspectResult.media.length}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={handleLoadIntoEditor}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                      title="Load unpacked document and images into editor"
                    >
                      <ArrowRight size={14} />
                      <span>Load into Editor</span>
                    </button>

                    <button
                      onClick={handleDownloadInspectedZip}
                      className="px-3.5 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      <Download size={14} />
                      <span>Save .zip</span>
                    </button>
                  </div>
                </div>

                {/* Inspector Sub-tabs */}
                <div className="flex items-center border-b border-neutral-200 px-6 bg-white text-xs">
                  <button
                    onClick={() => setInspectorView('files')}
                    className={`py-3 px-4 border-b-2 font-medium cursor-pointer transition-colors flex items-center space-x-1.5 ${
                      inspectorView === 'files'
                        ? 'border-[#e34f26] text-[#e34f26] font-bold'
                        : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Layers size={14} />
                    <span>Archive File Tree ({inspectResult.entries.length})</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('images')}
                    className={`py-3 px-4 border-b-2 font-medium cursor-pointer transition-colors flex items-center space-x-1.5 ${
                      inspectorView === 'images'
                        ? 'border-[#e34f26] text-[#e34f26] font-bold'
                        : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ImageIcon size={14} />
                    <span>Extracted /images/ Gallery ({inspectResult.media.length})</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('preview')}
                    className={`py-3 px-4 border-b-2 font-medium cursor-pointer transition-colors flex items-center space-x-1.5 ${
                      inspectorView === 'preview'
                        ? 'border-[#e34f26] text-[#e34f26] font-bold'
                        : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Eye size={14} />
                    <span>Standalone Browser Preview</span>
                  </button>

                  <button
                    onClick={() => setInspectorView('html')}
                    className={`py-3 px-4 border-b-2 font-medium cursor-pointer transition-colors flex items-center space-x-1.5 ${
                      inspectorView === 'html'
                        ? 'border-[#e34f26] text-[#e34f26] font-bold'
                        : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Code2 size={14} />
                    <span>Raw HTML5 Code</span>
                  </button>
                </div>

                {/* Sub-view 1: File Tree */}
                {inspectorView === 'files' && (
                  <div className="p-6">
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 text-[11px] font-bold text-neutral-600 grid grid-cols-12">
                        <span className="col-span-6">Archive Path</span>
                        <span className="col-span-3 text-right">Raw Size</span>
                        <span className="col-span-3 text-right">Target Format</span>
                      </div>
                      <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto font-mono text-xs">
                        {inspectResult.entries.map((entry, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-2.5 flex items-center justify-between hover:bg-neutral-50/80 transition-colors grid grid-cols-12"
                          >
                            <div className="col-span-6 flex items-center space-x-2 text-neutral-800">
                              {entry.isDir || entry.name.endsWith('/') ? (
                                <FolderOpen size={14} className="text-amber-500" />
                              ) : entry.name.endsWith('.html') ? (
                                <FileCode size={14} className="text-orange-500" />
                              ) : entry.name.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i) ? (
                                <ImageIcon size={14} className="text-blue-500" />
                              ) : (
                                <FileText size={14} className="text-neutral-400" />
                              )}
                              <span className={entry.name.endsWith('.html') ? 'font-bold text-orange-900' : ''}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="col-span-3 text-right text-neutral-500">
                              {entry.isDir ? '--' : `${(entry.size / 1024).toFixed(1)} KB`}
                            </span>
                            <span className="col-span-3 text-right text-neutral-600">
                              {entry.name.endsWith('.html')
                                ? 'W3C Standalone'
                                : entry.name.startsWith('images/')
                                ? 'Optimized Media'
                                : 'Plain Text / Meta'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-view 2: Extracted Images Gallery */}
                {inspectorView === 'images' && (
                  <div className="p-6">
                    {inspectResult.media.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400 text-xs">
                        <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No images found in this package archive.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inspectResult.media.map((img, idx) => (
                          <div
                            key={idx}
                            className="border border-neutral-200 rounded-lg p-3 bg-white flex flex-col justify-between hover:shadow-sm transition-shadow"
                          >
                            <div className="aspect-video bg-neutral-100 rounded flex items-center justify-center overflow-hidden mb-3 border border-neutral-100">
                              <img
                                src={img.dataUrl}
                                alt={img.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-neutral-800 truncate" title={img.name}>
                                  {img.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 shrink-0 uppercase">
                                  {img.mimeType.split('/')[1]}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                                <span>{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                                <span className="font-mono text-[10px]">{img.relativePath}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-view 3: Standalone Browser Preview */}
                {inspectorView === 'preview' && (
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>
                          Sandboxed iframe simulating a clean browser viewport opening{' '}
                          <strong>{inspectResult.mainHtmlName}</strong> directly from disk.
                        </span>
                      </div>
                    </div>
                    <div className="border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-inner h-[500px]">
                      <iframe
                        ref={previewIframeRef}
                        title="Standalone Browser Preview"
                        className="w-full h-full border-none"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-view 4: Raw HTML5 Code */}
                {inspectorView === 'html' && (
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-mono">
                        {inspectResult.mainHtmlName} ({inspectResult.rawHtml.length} characters)
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        {copiedSnippet ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedSnippet ? 'Copied HTML!' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                      {inspectResult.rawHtml}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State: Initial Prompt */
              <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#e34f26] flex items-center justify-center mx-auto">
                  <Globe size={28} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-base text-neutral-800">
                    Ready to Package Your Document for 100% Offline Browsing
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Click <strong>Scan &amp; Package Current Document</strong> to package your current content into a compressed ZIP file with an isolated <code className="bg-neutral-100 px-1 rounded font-mono">/images/</code> folder, or load our rich sample package to experience it.
                  </p>
                </div>
                <div className="flex justify-center space-x-3 pt-2">
                  <button
                    onClick={handleScanAndPackageCurrent}
                    disabled={isProcessing}
                    className="px-5 py-2.5 bg-[#e34f26] hover:bg-[#c93d16] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs cursor-pointer"
                  >
                    <Sparkles size={15} />
                    <span>Package Current Document Now</span>
                  </button>
                  <button
                    onClick={handleLoadSamplePackage}
                    disabled={isProcessing}
                    className="px-5 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                  >
                    <FileText size={15} />
                    <span>Load Rich Sample Package</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: BROWSER PORTABILITY & ARCHITECTURE */}
        {activeSubTab === 'architecture' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-[#e34f26] font-bold text-base">
                <Globe size={20} />
                <h2>How HTML + Images (ZIP) Web Packaging Works</h2>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                When you share a Word document (.docx) or proprietary file, recipients frequently face font mismatches, mobile rendering glitches, or lack desktop Microsoft Office software. The <strong>HTML + Images (ZIP)</strong> package solves this by turning your document into a standalone, W3C-compliant web package that opens on every computer, tablet, and smartphone natively.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-orange-50/50 border border-orange-200 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2 text-orange-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>DOM Asset Extraction</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    The engine scans all document text, tables, styles, and <code className="bg-white px-1 rounded font-mono">&lt;img&gt;</code> tags. It converts base64 image streams into clean binary PNG/JPEG files saved directly to the <code className="bg-white px-1 rounded font-mono">/images/</code> folder.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Relative Link Rewriting</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    Inside <code className="bg-white px-1 rounded font-mono">projectname.html</code>, all image sources are cleanly pointed to relative paths like <code className="bg-white px-1 rounded font-mono">images/img_1.png</code>. No network connection or external CDN is ever required.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>GZIP Deflate Lvl 9 ZIP</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    JSZip applies maximum Deflate compression (Level 9), compressing text by up to 80% and bundling everything into a neat single <code className="bg-white px-1 rounded font-mono">.zip</code> file ready for instant email, flash drive, or cloud transfer.
                  </p>
                </div>
              </div>
            </div>

            {/* Browser Matrix Table */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Native Browser &amp; Platform Support Matrix
              </h3>
              <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px]">
                    <tr>
                      <th className="p-3">Platform / Browser</th>
                      <th className="p-3">Software Needed</th>
                      <th className="p-3">Offline Access</th>
                      <th className="p-3">Print &amp; PDF Capability</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    <tr>
                      <td className="p-3 font-semibold">Google Chrome (Win / Mac / Linux)</td>
                      <td className="p-3 text-neutral-500">None (Native)</td>
                      <td className="p-3 text-emerald-600 font-semibold">100% Offline</td>
                      <td className="p-3">Ctrl+P / Cmd+P</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ Verified</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Microsoft Edge (Windows 10/11)</td>
                      <td className="p-3 text-neutral-500">None (Native)</td>
                      <td className="p-3 text-emerald-600 font-semibold">100% Offline</td>
                      <td className="p-3">Ctrl+P</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ Verified</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Apple Safari (macOS &amp; iOS)</td>
                      <td className="p-3 text-neutral-500">None (Native)</td>
                      <td className="p-3 text-emerald-600 font-semibold">100% Offline</td>
                      <td className="p-3">Cmd+P / Share &gt; Print</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ Verified</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Mozilla Firefox</td>
                      <td className="p-3 text-neutral-500">None (Native)</td>
                      <td className="p-3 text-emerald-600 font-semibold">100% Offline</td>
                      <td className="p-3">Ctrl+P</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ Verified</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Android Mobile (Chrome / Samsung)</td>
                      <td className="p-3 text-neutral-500">None (Native)</td>
                      <td className="p-3 text-emerald-600 font-semibold">100% Offline</td>
                      <td className="p-3">Share &gt; Print as PDF</td>
                      <td className="p-3 text-emerald-700 font-bold">✓ Verified</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: LOCAL CACHE & GZIP STORAGE */}
        {activeSubTab === 'cache' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-[#e34f26] font-bold text-base">
                <HardDrive size={20} />
                <h2>Browser Local Cache &amp; GZIP Storage Engine</h2>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                To guarantee lightning-fast performance and prevent any data loss when switching between tabs or sessions, the engine automatically registers package snapshots in your browser's private local storage.
              </p>

              {/* Cache Status Card */}
              <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-xs text-neutral-800">
                      Local Storage Cache Status
                    </span>
                  </div>
                  {cachedPackageMeta && (
                    <span className="text-[11px] text-neutral-500">
                      Cached at {new Date(cachedPackageMeta.cachedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {cachedPackageMeta ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                    <div className="p-3 bg-white border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 block">Cached Archive</span>
                      <strong className="text-neutral-800 font-mono truncate block">
                        {cachedPackageMeta.archiveName}
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 block">Package Size</span>
                      <strong className="text-neutral-800">
                        {(cachedPackageMeta.fileSizeBytes / 1024).toFixed(1)} KB
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 block">Images Extracted</span>
                      <strong className="text-neutral-800">
                        {cachedPackageMeta.mediaCount || 0} media assets
                      </strong>
                    </div>
                    <div className="p-3 bg-white border border-neutral-200 rounded-lg">
                      <span className="text-[10px] text-neutral-500 block">Compression Ratio</span>
                      <strong className="text-emerald-700">
                        {cachedPackageMeta.compressionRatio || 'N/A'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-neutral-200 rounded-lg text-center text-xs text-neutral-400">
                    No active HTML ZIP package currently stored in local cache. Click "Scan &amp; Package Current Document" to generate one.
                  </div>
                )}

                <div className="flex items-center space-x-2.5 pt-2">
                  <button
                    onClick={handleRestoreFromCache}
                    className="px-3.5 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={13} />
                    <span>Check / Refresh Cache</span>
                  </button>

                  {cachedPackageMeta && (
                    <button
                      onClick={handleClearCache}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <X size={13} />
                      <span>Clear Local Cache</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: ZERO-SOFTWARE OFFLINE GUIDE */}
        {activeSubTab === 'sharing' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center space-x-2 text-[#e34f26] font-bold text-base">
                <Laptop size={20} />
                <h2>Zero-Software Offline Viewing &amp; Distribution Guide</h2>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                When you distribute a document as an <strong>HTML + Images ZIP package</strong>, anyone can open and view it without installing any word processing software, PDF viewers, or office suites. Here is how recipients open it:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-xs text-neutral-800">
                    <Laptop size={16} className="text-blue-600" />
                    <span>Windows, Mac &amp; Linux Desktops</span>
                  </div>
                  <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Right-click the downloaded <code>.zip</code> file and select <strong>Extract All...</strong> (or double-click on macOS).</li>
                    <li>Open the extracted folder.</li>
                    <li>Double-click <strong><code>projectname.html</code></strong> or <strong><code>index.html</code></strong>.</li>
                    <li>It immediately opens in your default browser with complete styling, responsive layout, and embedded images!</li>
                  </ol>
                </div>

                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-xs text-neutral-800">
                    <Smartphone size={16} className="text-emerald-600" />
                    <span>iPhones, iPads &amp; Android Phones</span>
                  </div>
                  <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Tap the <code>.zip</code> file in the <strong>Files</strong> app (iOS) or <strong>My Files</strong> (Android) to uncompress.</li>
                    <li>Tap <strong><code>projectname.html</code></strong>.</li>
                    <li>Safari or Chrome will instantly display the document with touch scrolling and pinch-to-zoom!</li>
                  </ol>
                </div>
              </div>

              {/* Web Hosting Quick Note */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 font-bold text-amber-900">
                  <Globe size={16} className="text-amber-700" />
                  <span>Instant Static Web Hosting</span>
                </div>
                <p className="text-neutral-700 leading-relaxed text-[11px]">
                  Because the package includes both <code className="bg-white px-1 rounded font-mono">index.html</code> and the <code className="bg-white px-1 rounded font-mono">/images/</code> folder, you can also drag and drop the unzipped folder into any static web host (GitHub Pages, Netlify, Cloudflare Pages, Vercel, or AWS S3) and immediately have a live, public, ultra-fast website for your report!
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
          <span>Client-Side HTML+Images Engine Active</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadSamplePackage}
            disabled={isProcessing}
            className="px-4 py-2 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-lg text-xs font-semibold text-[#e34f26] transition-colors cursor-pointer disabled:opacity-50"
          >
            Load Rich Sample Package
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#e34f26] hover:bg-[#c93d16] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default HtmlZipEngineBackstageSection;
