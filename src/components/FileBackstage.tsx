import React, { useState } from 'react';
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
import { initialDocumentContent } from '../utils/initialContent';

interface FileBackstageProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats: DocumentStats;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onClose: () => void;
  onSaveToLocalStorage: () => void;
  onPrint: () => void;
}

type BackstageTab = 'info' | 'new' | 'open' | 'save' | 'print';

export const FileBackstage: React.FC<FileBackstageProps> = ({
  editor,
  settings,
  stats,
  onUpdateSettings,
  onClose,
  onSaveToLocalStorage,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState<BackstageTab>('info');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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

  const handleNewDocument = (type: 'blank' | 'report' | 'memo') => {
    if (!editor) return;
    if (type === 'blank') {
      editor.commands.setContent('<p></p>');
      onUpdateSettings({ title: 'New Document' });
    } else if (type === 'report') {
      editor.commands.setContent(initialDocumentContent);
      onUpdateSettings({ title: 'Executive Report' });
    } else if (type === 'memo') {
      editor.commands.setContent(`
        <h1 style="color: #185abd;">MEMORANDUM</h1>
        <p><strong>TO:</strong> All Team Members<br /><strong>FROM:</strong> Project Lead<br /><strong>DATE:</strong> ${new Date().toLocaleDateString()}<br /><strong>SUBJECT:</strong> Project Status &amp; Deliverables</p>
        <hr />
        <h2>Overview</h2>
        <p>Please review the milestones outlined below for this sprint.</p>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Complete project scoping review</p></div></li>
          <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Update deployment pipeline</p></div></li>
        </ul>
      `);
      onUpdateSettings({ title: 'Internal Memorandum' });
    }
    onClose();
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
              <span>Info</span>
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
              onClick={() => {
                onSaveToLocalStorage();
                setSaveSuccessMsg('Document successfully saved to local storage!');
                setTimeout(() => setSaveSuccessMsg(null), 3000);
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded hover:bg-white/10 text-white/90 cursor-pointer transition-colors"
            >
              <Save size={16} />
              <span>Save</span>
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
      <div className="flex-1 overflow-y-auto p-8 bg-white">
        {saveSuccessMsg && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-neutral-800 mb-6">Document Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left col: Actions */}
              <div className="md:col-span-2 space-y-4">
                <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 text-[#185abd] rounded">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-800">Protect Document</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Control what types of changes people can make to this document.
                    </p>
                    <button
                      onClick={() => onUpdateSettings({ viewMode: settings.viewMode === 'read' ? 'print' : 'read' })}
                      className="mt-2 text-xs text-[#185abd] hover:underline font-medium cursor-pointer"
                    >
                      {settings.viewMode === 'read' ? 'Switch to Edit Mode' : 'Switch to Read-Only Mode'}
                    </button>
                  </div>
                </div>

                <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 flex items-start space-x-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-800">Inspect Document</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Before sharing, be aware that this document contains {stats.words} words and {stats.paragraphs} paragraphs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right col: Document Properties */}
              <div className="border border-neutral-200 rounded-lg p-4 bg-white text-xs space-y-3">
                <h3 className="font-semibold text-neutral-800 border-b border-neutral-200 pb-2">Properties</h3>
                <div className="space-y-2 text-neutral-600">
                  <div className="flex justify-between">
                    <span>Title:</span>
                    <span className="font-medium text-neutral-900 truncate max-w-[120px]">{settings.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Words:</span>
                    <span className="font-medium text-neutral-900">{stats.words}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Characters:</span>
                    <span className="font-medium text-neutral-900">{stats.characters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading time:</span>
                    <span className="font-medium text-neutral-900">~{stats.readingTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orientation:</span>
                    <span className="font-medium text-neutral-900 capitalize">{settings.orientation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margins:</span>
                    <span className="font-medium text-neutral-900 capitalize">{settings.margins}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW TAB */}
        {activeTab === 'new' && (
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-neutral-800 mb-6">New Document</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Blank Document Template */}
              <div
                onClick={() => handleNewDocument('blank')}
                className="group border border-neutral-200 hover:border-[#185abd] rounded-lg p-4 cursor-pointer hover:shadow-md transition-all flex flex-col items-center text-center bg-white"
              >
                <div className="w-28 h-36 bg-white border border-neutral-300 group-hover:border-[#185abd] shadow-xs rounded flex items-center justify-center mb-3">
                  <FilePlus size={28} className="text-neutral-300 group-hover:text-[#185abd]" />
                </div>
                <span className="font-semibold text-sm text-neutral-800 group-hover:text-[#185abd]">
                  Blank Document
                </span>
                <span className="text-xs text-neutral-400 mt-1">Start from a clean slate</span>
              </div>

              {/* Strategic Report Template */}
              <div
                onClick={() => handleNewDocument('report')}
                className="group border border-neutral-200 hover:border-[#185abd] rounded-lg p-4 cursor-pointer hover:shadow-md transition-all flex flex-col items-center text-center bg-white"
              >
                <div className="w-28 h-36 bg-neutral-50 border border-neutral-300 group-hover:border-[#185abd] shadow-xs rounded p-2 text-left mb-3 overflow-hidden">
                  <div className="h-2 w-16 bg-[#185abd] rounded-xs mb-1.5" />
                  <div className="h-1.5 w-20 bg-neutral-300 rounded-xs mb-1" />
                  <div className="h-1.5 w-24 bg-neutral-300 rounded-xs mb-2" />
                  <div className="h-1 w-full bg-neutral-200 rounded-xs mb-1" />
                  <div className="h-1 w-full bg-neutral-200 rounded-xs mb-1" />
                  <div className="h-1 w-16 bg-neutral-200 rounded-xs" />
                </div>
                <span className="font-semibold text-sm text-neutral-800 group-hover:text-[#185abd]">
                  Executive Report
                </span>
                <span className="text-xs text-neutral-400 mt-1">Complete with tables &amp; KPIs</span>
              </div>

              {/* Team Memorandum Template */}
              <div
                onClick={() => handleNewDocument('memo')}
                className="group border border-neutral-200 hover:border-[#185abd] rounded-lg p-4 cursor-pointer hover:shadow-md transition-all flex flex-col items-center text-center bg-white"
              >
                <div className="w-28 h-36 bg-neutral-50 border border-neutral-300 group-hover:border-[#185abd] shadow-xs rounded p-2 text-left mb-3 overflow-hidden">
                  <div className="text-[8px] font-bold text-[#185abd] mb-1">MEMORANDUM</div>
                  <div className="h-1 w-full bg-neutral-300 rounded-xs mb-1" />
                  <div className="h-1 w-20 bg-neutral-300 rounded-xs mb-2" />
                  <div className="h-1 w-full bg-neutral-200 rounded-xs mb-1" />
                  <div className="h-1 w-full bg-neutral-200 rounded-xs" />
                </div>
                <span className="font-semibold text-sm text-neutral-800 group-hover:text-[#185abd]">
                  Internal Memo
                </span>
                <span className="text-xs text-neutral-400 mt-1">Action items and checklists</span>
              </div>
            </div>
          </div>
        )}

        {/* OPEN TAB */}
        {activeTab === 'open' && (
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold text-neutral-800 mb-6">Open Document</h1>
            <div className="border-2 border-dashed border-neutral-300 hover:border-[#185abd] rounded-xl p-8 text-center bg-neutral-50/50">
              <FolderOpen size={36} className="text-[#185abd] mx-auto mb-3" />
              <h3 className="font-semibold text-sm text-neutral-800">Open file from computer</h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Supports HTML documents, Rich Text, and plain text files.
              </p>
              <label className="inline-block px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold cursor-pointer shadow-xs">
                Browse Files
                <input
                  type="file"
                  accept=".html,.txt,.json,.docx"
                  onChange={handleOpenFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
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
            </div>
          </div>
        )}

        {/* PRINT TAB */}
        {activeTab === 'print' && (
          <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-semibold text-neutral-800">Print Document</h1>
            <div className="flex items-start space-x-6">
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => onPrint(), 200);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-md font-semibold text-sm shadow-sm cursor-pointer"
              >
                <Printer size={18} />
                <span>Print Document</span>
              </button>

              <div className="text-xs text-neutral-600 space-y-1.5 pt-1">
                <p>&bull; Set printer destination to <strong>Save as PDF</strong> for instant digital output.</p>
                <p>&bull; Ribbon controls and rulers are automatically hidden on print.</p>
                <p>&bull; Paper size configured as <strong>{settings.pageSize.toUpperCase()}</strong> with <strong>{settings.margins}</strong> margins.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
