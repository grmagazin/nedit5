import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats } from '../types';
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Save,
  Download,
  Printer,
  Info,
  CheckCircle2,
  FileCode,
  FilePlus,
  Share2,
  Clock,
  User,
} from 'lucide-react';

const InfoSetupSection = React.lazy(
  () => import('./InfoSetupSection')
);

const NewDocumentSection = React.lazy(
  () => import('./NewDocumentSection')
);

const DocxEngineBackstageSection = React.lazy(
  () => import('./DocxEngineBackstageSection')
);

const HtmlZipEngineBackstageSection = React.lazy(
  () => import('./HtmlZipEngineBackstageSection')
);

const OdfEngineBackstageSection = React.lazy(
  () => import('./OdfEngineBackstageSection')
);

const JsonBackupEngineBackstageSection = React.lazy(
  () => import('./JsonBackupEngineBackstageSection')
);

const MarkdownEngineBackstageSection = React.lazy(
  () => import('./MarkdownEngineBackstageSection')
);

const PdfEngineBackstageSection = React.lazy(
  () => import('./PdfEngineBackstageSection')
);

const PrintBackstageSection = React.lazy(
  () => import('./PrintBackstageSection')
);

const OpenDocumentSmartPanel = React.lazy(
  () => import('./OpenDocumentSmartPanel')
);

interface FileBackstageProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats: DocumentStats;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onClose: () => void;
  onSaveToLocalStorage: () => void;
  onPrint: () => void;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: (enabled: boolean) => void;
  onCleanLocalStorage?: () => void;
  initialTab?: BackstageTab;
}

export type BackstageTab = 'info' | 'new' | 'open' | 'backup' | 'docx' | 'htmlzip' | 'odf' | 'markdown' | 'pdf' | 'save' | 'print';

export const FileBackstage: React.FC<FileBackstageProps> = ({
  editor,
  settings,
  stats,
  onUpdateSettings,
  onClose,
  onSaveToLocalStorage,
  onPrint,
  autoSaveEnabled = true,
  onToggleAutoSave,
  onCleanLocalStorage,
  initialTab = 'info',
}) => {
  const [activeTab, setActiveTab] = useState<BackstageTab>(initialTab);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleExportHtml = () => {
    if (!editor) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${settings.title}</title>
<style>
  body { font-family: 'Calibri', 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 850px; margin: 40px auto; padding: 20px; }
  h1 { color: #185abd; font-size: 28px; }
  h2 { color: #2b579a; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; }
  th { background-color: #f3f4f6; }
  blockquote { border-left: 4px solid #185abd; padding-left: 16px; color: #4b5563; font-style: italic; background: #f9fafb; }
</style>
</head>
<body>
${editor.getHTML()}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.title || 'Document'}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveSuccessMsg('Downloaded Word-compatible HTML document!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleExportText = () => {
    if (!editor) return;
    const text = editor.getText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.title || 'Document'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveSuccessMsg('Downloaded plain text file!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      editor.commands.setContent(content);
      onUpdateSettings({ title: file.name.replace(/\.[^/.]+$/, '') });
      onClose();
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-[#f3f2f1] z-50 flex select-none no-print animate-in fade-in duration-150">
      {/* Left Backstage Navigation (Microsoft Word deep blue) */}
      <div className="w-56 bg-[#185abd] text-white flex flex-col justify-between p-3 shrink-0 shadow-lg">
        <div>
          {/* Back Arrow button */}
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-white/15 px-3 py-2 rounded-md transition-colors w-full cursor-pointer mb-4 font-semibold text-xs"
          >
            <ArrowLeft size={16} />
            <span>Return to Document</span>
          </button>

          {/* Navigation Items */}
          <div className="space-y-1 text-xs">
            <button
              onClick={() => setActiveTab('info')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'info' ? 'bg-white/25 text-white font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <Info size={16} />
              <span>Info &amp; Setup</span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'new' ? 'bg-white/25 text-white font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <FilePlus size={16} />
              <span>New</span>
            </button>

            <button
              onClick={() => setActiveTab('open')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'open' ? 'bg-white/25 text-white font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <FolderOpen size={16} />
              <span>Open</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'backup' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-[#f59e0b] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                J
              </div>
              <span>Backup (.json)</span>
            </button>

            <button
              onClick={() => setActiveTab('docx')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'docx' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-white text-[#185abd] flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                W
              </div>
              <span>Microsoft Word (.docx)</span>
            </button>

            <button
              onClick={() => setActiveTab('htmlzip')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'htmlzip' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-[#e34f26] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                H
              </div>
              <span>Html + Images (ZIP)</span>
            </button>

            <button
              onClick={() => setActiveTab('odf')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'odf' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-[#0e7490] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                O
              </div>
              <span>OpenDocument (.ODF)</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'markdown' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-[#6366f1] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                M
              </div>
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'pdf' ? 'bg-white/25 text-white font-bold shadow-xs' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <div className="w-4 h-4 rounded bg-[#dc2626] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0 shadow-2xs">
                P
              </div>
              <span>PDF Document (.pdf)</span>
            </button>

            <button
              onClick={() => setActiveTab('save')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'save' ? 'bg-white/25 text-white font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <Download size={16} />
              <span>Save As &amp; Export</span>
            </button>

            <button
              onClick={() => setActiveTab('print')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded cursor-pointer transition-colors ${
                activeTab === 'print' ? 'bg-white/25 text-white font-bold' : 'hover:bg-white/10 text-white/90'
              }`}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Footer info in backstage */}
        <div className="text-[11px] text-blue-200/70 px-2">
          Microsoft Word Engine &bull; Tiptap
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${(activeTab === 'docx' || activeTab === 'htmlzip' || activeTab === 'odf' || activeTab === 'backup' || activeTab === 'markdown') ? 'p-0' : 'p-8'} bg-white flex flex-col`}>
        {saveSuccessMsg && activeTab !== 'docx' && activeTab !== 'htmlzip' && activeTab !== 'odf' && activeTab !== 'backup' && activeTab !== 'markdown' && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* INFO & SETUP TAB */}
        {activeTab === 'info' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Document Properties &amp; Setup...</span>
                </div>
              </div>
            }
          >
            <InfoSetupSection
              editor={editor}
              settings={settings}
              stats={stats}
              onUpdateSettings={onUpdateSettings}
              onSaveToLocalStorage={onSaveToLocalStorage}
              autoSaveEnabled={autoSaveEnabled}
              onToggleAutoSave={onToggleAutoSave}
              onCleanLocalStorage={onCleanLocalStorage}
              onShowMessage={(msg) => {
                setSaveSuccessMsg(msg);
                setTimeout(() => setSaveSuccessMsg(null), 3000);
              }}
            />
          </React.Suspense>
        )}

        {/* NEW TAB (TEMPLATES CATALOG) */}
        {activeTab === 'new' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Document Templates Catalog...</span>
                </div>
              </div>
            }
          >
            <NewDocumentSection
              editor={editor}
              settings={settings}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onSaveToLocalStorage={onSaveToLocalStorage}
            />
          </React.Suspense>
        )}

        {/* OPEN TAB (SMART 3x3 FORMAT HUB) */}
        {activeTab === 'open' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Open Document Hub...</span>
                </div>
              </div>
            }
          >
            <OpenDocumentSmartPanel
              editor={editor}
              settings={settings}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onSwitchTab={(tab) => setActiveTab(tab)}
              onShowMessage={(msg) => {
                setSaveSuccessMsg(msg);
                setTimeout(() => setSaveSuccessMsg(null), 3500);
              }}
            />
          </React.Suspense>
        )}

        {/* SAVE AS & EXPORT TAB */}
        {activeTab === 'save' && (
          <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-semibold text-neutral-800">Export &amp; Save As</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-100 text-[#185abd] rounded">
                    <FileCode size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">Word-Compatible HTML</h3>
                    <p className="text-[11px] text-neutral-500">Opens directly in MS Word and browsers</p>
                  </div>
                </div>
                <button
                  onClick={handleExportHtml}
                  className="mt-2 w-full py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-medium cursor-pointer"
                >
                  Download HTML (.html)
                </button>
              </div>

              <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-neutral-100 text-neutral-700 rounded">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">Plain Text File</h3>
                    <p className="text-[11px] text-neutral-500">Unformatted clean text</p>
                  </div>
                </div>
                <button
                  onClick={handleExportText}
                  className="mt-2 w-full py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Download Text (.txt)
                </button>
              </div>

              {/* Microsoft Word (.docx) Card */}
              <div className="border border-blue-200 bg-blue-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-100 text-[#185abd] rounded font-black text-sm">
                    W
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">Microsoft Word (.docx) Document</h3>
                    <p className="text-[11px] text-neutral-500">
                      Standard ECMA-376 OpenXML document with formatted headings, preserved tables, inline images, and native desktop Word styling.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('docx')}
                  className="mt-2 w-full py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open Microsoft Word (.docx) Engine</span>
                </button>
              </div>

              {/* HTML + Images ZIP Package Card */}
              <div className="border border-orange-200 bg-orange-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-orange-100 text-[#e34f26] rounded font-black text-sm">
                    H
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">HTML + Images Web Package (.zip)</h3>
                    <p className="text-[11px] text-neutral-500">
                      High-compression GZIP archive with <code className="bg-neutral-100 px-1 rounded font-mono">projectname.html</code> and <code className="bg-neutral-100 px-1 rounded font-mono">/images/</code> folder. 100% offline compatible across all browsers.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('htmlzip')}
                  className="mt-2 w-full py-2 bg-[#e34f26] hover:bg-[#c93d16] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open HTML + Images (ZIP) Web Engine</span>
                </button>
              </div>

              {/* OASIS OpenDocument (.odf / .odt) Card */}
              <div className="border border-cyan-200 bg-cyan-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-cyan-100 text-[#0e7490] rounded font-black text-sm">
                    O
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">OpenDocument Text (.odt / .odf)</h3>
                    <p className="text-[11px] text-neutral-500">
                      ISO/IEC 26300 standard package with <code className="bg-neutral-100 px-1 rounded font-mono">content.xml</code>, <code className="bg-neutral-100 px-1 rounded font-mono">Pictures/</code> media folder, and uncompressed <code className="bg-neutral-100 px-1 rounded font-mono">mimetype</code>. Native format for LibreOffice, Google Docs, and Word.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('odf')}
                  className="mt-2 w-full py-2 bg-[#0e7490] hover:bg-[#155e75] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open OpenDocument (.ODF) Engine</span>
                </button>
              </div>

              {/* Markdown (.md) Card */}
              <div className="border border-indigo-200 bg-indigo-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-indigo-100 text-[#6366f1] rounded font-black text-sm">
                    M
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">Markdown (.md) Document</h3>
                    <p className="text-[11px] text-neutral-500">
                      GitHub-Flavored Markdown (GFM) with YAML Frontmatter headers, table preservation, interactive task lists, and syntax highlights.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('markdown')}
                  className="mt-2 w-full py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open Markdown (.md) Engine</span>
                </button>
              </div>

              {/* PDF Document (.pdf) Card */}
              <div className="border border-red-200 bg-red-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-red-100 text-[#dc2626] rounded font-black text-sm">
                    P
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">PDF Document (.pdf) Vector Export</h3>
                    <p className="text-[11px] text-neutral-500">
                      High-fidelity ISO 32000 vector print engine with custom margins, paper geometry, zero-loss typography, and clean multi-page pagination.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className="mt-2 w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open PDF Document (.pdf) Engine</span>
                </button>
              </div>

              {/* JSON Backup (.json) Card */}
              <div className="border border-amber-200 bg-amber-50/20 rounded-lg p-4 hover:shadow-md transition-shadow sm:col-span-2">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-amber-100 text-[#d97706] rounded font-black text-sm">
                    J
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-800">JSON Document Backup (.json)</h3>
                    <p className="text-[11px] text-neutral-500">
                      Complete state serialization with embedded base64 images, document settings, and metadata. 100% self-contained and offline portable.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('backup')}
                  className="mt-2 w-full py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <span>Open Backup (.json) Engine</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JSON BACKUP (.JSON) ENGINE TAB */}
        {activeTab === 'backup' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                  <span>Loading JSON Backup (.json) Engine...</span>
                </div>
              </div>
            }
          >
            <JsonBackupEngineBackstageSection
              editor={editor}
              settings={settings}
              stats={stats}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onSaveToLocalStorage={onSaveToLocalStorage}
            />
          </React.Suspense>
        )}

        {/* MICROSOFT WORD (.DOCX) ENGINE TAB */}
        {activeTab === 'docx' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Microsoft Word (.docx) Engine...</span>
                </div>
              </div>
            }
          >
            <DocxEngineBackstageSection
              editor={editor}
              settings={settings}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
            />
          </React.Suspense>
        )}

        {/* HTML + IMAGES (ZIP) ENGINE TAB */}
        {activeTab === 'htmlzip' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#e34f26] border-t-transparent rounded-full animate-spin" />
                  <span>Loading HTML + Images (ZIP) Web Package Engine...</span>
                </div>
              </div>
            }
          >
            <HtmlZipEngineBackstageSection
              editor={editor}
              settings={settings}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
            />
          </React.Suspense>
        )}

        {/* OPENDOCUMENT (.ODF) ENGINE TAB */}
        {activeTab === 'odf' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#0e7490] border-t-transparent rounded-full animate-spin" />
                  <span>Loading OpenDocument (.ODF) Engine...</span>
                </div>
              </div>
            }
          >
            <OdfEngineBackstageSection
              editor={editor}
              settings={settings}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
            />
          </React.Suspense>
        )}

        {/* MARKDOWN (.MD) ENGINE TAB */}
        {activeTab === 'markdown' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Markdown (.md) Engine...</span>
                </div>
              </div>
            }
          >
            <MarkdownEngineBackstageSection
              editor={editor}
              settings={settings}
              stats={stats}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onSaveToLocalStorage={onSaveToLocalStorage}
            />
          </React.Suspense>
        )}

        {/* PDF EXPORT & PRINT ENGINE TAB */}
        {activeTab === 'pdf' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
                  <span>Loading PDF Export &amp; Print Engine...</span>
                </div>
              </div>
            }
          >
            <PdfEngineBackstageSection
              editor={editor}
              settings={settings}
              stats={stats}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onPrint={onPrint}
            />
          </React.Suspense>
        )}

        {/* PRINT TAB (SMART PRINT WORKSTATION) */}
        {activeTab === 'print' && (
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-neutral-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Print Workstation...</span>
                </div>
              </div>
            }
          >
            <PrintBackstageSection
              editor={editor}
              settings={settings}
              stats={stats}
              onClose={onClose}
              onUpdateSettings={onUpdateSettings}
              onPrint={onPrint}
              onSwitchToPdfTab={() => setActiveTab('pdf')}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};
