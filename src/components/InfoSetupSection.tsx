import React, { useState, useEffect, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats, DocumentSnapshot } from '../types';
import { calculateDocumentPages, formatSmartPageText } from '../utils/pageCalculator';
import {
  Save,
  Clock,
  Check,
  RefreshCw,
  Sparkles,
  FileText,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Tag,
  User,
  Hash,
  Database,
  Trash2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface InfoSetupSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats: DocumentStats;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onSaveToLocalStorage: () => void;
  onShowMessage: (msg: string) => void;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: (enabled: boolean) => void;
  onCleanLocalStorage?: () => void;
}

export const InfoSetupSection: React.FC<InfoSetupSectionProps> = ({
  editor,
  settings,
  stats,
  onUpdateSettings,
  onSaveToLocalStorage,
  onShowMessage,
  autoSaveEnabled = true,
  onToggleAutoSave,
  onCleanLocalStorage,
}) => {
  // Estimated pages based on word count (approx 250 words per page)
  const estimatedPages = Math.max(1, Math.ceil((stats?.words || 1) / 250));

  // Storage management state
  const [storageSizeKB, setStorageSizeKB] = useState<string>('0');
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanSuccessMsg, setCleanSuccessMsg] = useState<string | null>(null);

  const calculateStorageUsage = () => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('wordpad_') || key.startsWith('word_'))) {
          const val = localStorage.getItem(key) || '';
          totalBytes += (key.length + val.length) * 2;
        }
      }
      setStorageSizeKB((totalBytes / 1024).toFixed(1));
    } catch {
      setStorageSizeKB('0');
    }
  };

  useEffect(() => {
    calculateStorageUsage();
  }, []);

  const handleCleanStorage = () => {
    if (onCleanLocalStorage) {
      onCleanLocalStorage();
    } else {
      try {
        const keysToRemove = [
          'wordpad_document_content',
          'wordpad_document_settings',
          'word_doc_snapshots',
          'wordpad_json_backup_cache',
          'wordpad_markdown_cache',
          'wordpad_image_library',
          'wordpad_recent_symbols',
          'wordpad_autosave_enabled',
        ];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('wordpad_') || k.startsWith('word_'))) {
            localStorage.removeItem(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {
        console.error('Clean error:', err);
      }
    }
    setShowCleanConfirm(false);
    calculateStorageUsage();
    setCleanSuccessMsg('Local storage successfully cleaned! Cached documents and data erased from browser.');
    onShowMessage('Local storage cleaned! All offline cached document data wiped.');
    setTimeout(() => setCleanSuccessMsg(null), 4000);
  };

  // Current values or defaults
  const title = settings.title || 'Untitled Document.docx';
  const author = settings.author || 'Alexander Morgan';
  const tags = settings.tags || 'Personal';
  const version = settings.version || '1.0.0';
  const createdDate = settings.createdDate || '9/17/2026, 9:08:44 AM';
  const updatedDate = settings.updatedDate || '9/23/2026, 4:36:34 PM';

  // Real multi-page calculation
  const calculatedPages = useMemo(() => {
    return calculateDocumentPages(editor, settings.pageSize, settings.orientation);
  }, [editor?.state.doc, settings.pageSize, settings.orientation]);
  const realTotalPages = Math.max(1, calculatedPages.length);

  // Header settings
  const headerLeft = settings.headerLeft || '';
  const headerRight = settings.headerRight || '';
  const headerShowPages = settings.headerShowPages ?? false;
  const headerPageState = settings.headerPageStart !== undefined ? (settings.headerPageStart === 0 ? 0 : 1) : 1;
  const headerMaxState = settings.headerPageTotal !== undefined ? (settings.headerPageTotal === 0 ? 0 : 1) : 1;
  const headerPageSeparator = settings.headerPageSeparator !== undefined ? settings.headerPageSeparator : '-';

  // Footer settings
  const footerLeft = settings.footerLeft || '';
  const footerRight = settings.footerRight || '';
  const footerShowPages = settings.footerShowPages ?? true;
  const footerPageState = settings.footerPageStart !== undefined ? (settings.footerPageStart === 0 ? 0 : 1) : 1;
  const footerMaxState = settings.footerPageTotal !== undefined ? (settings.footerPageTotal === 0 ? 0 : 1) : 1;
  const footerPageSeparator = settings.footerPageSeparator !== undefined ? settings.footerPageSeparator : '-';

  // Formatted smart page strings for visual preview
  const headerPreviewText = formatSmartPageText({
    showPages: headerShowPages,
    pageState: headerPageState,
    maxState: headerMaxState,
    separator: headerPageSeparator,
    currentPage: 1,
    totalPages: realTotalPages,
  });

  const footerPreviewText = formatSmartPageText({
    showPages: footerShowPages,
    pageState: footerPageState,
    maxState: footerMaxState,
    separator: footerPageSeparator,
    currentPage: 1,
    totalPages: realTotalPages,
  });

  // State for feedback indicator
  const [justSaved, setJustSaved] = useState(false);

  // Quick "Now" timestamp
  const getFormattedNow = () => {
    return new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Handle Save Now
  const handleSaveNow = () => {
    const now = getFormattedNow();
    onUpdateSettings({ updatedDate: now });
    onSaveToLocalStorage();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    onShowMessage('Document properties & header/footer saved successfully!');
  };

  // Handle Save Snapshot
  const handleSaveSnapshot = () => {
    if (!editor) return;
    const now = getFormattedNow();
    const ver = settings.version ? `v${settings.version}` : 'v1.0';
    const snapshotName = `${settings.title || 'Document'} (${ver}) - ${now}`;

    const snap: DocumentSnapshot = {
      id: Date.now().toString(),
      name: snapshotName,
      timestamp: new Date().toISOString(),
      htmlContent: editor.getHTML(),
      wordCount: stats.words,
    };

    try {
      const raw = localStorage.getItem('word_doc_snapshots');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(snap);
      localStorage.setItem('word_doc_snapshots', JSON.stringify(list));
      onShowMessage(`Snapshot milestone "${snap.name}" recorded!`);
    } catch (err) {
      console.error('Snapshot save error:', err);
      onShowMessage('Saved snapshot locally.');
    }
  };

  // Cycle separators: '-' -> 'of' -> '/' -> '' (empty) -> '-'
  const cycleHeaderSeparator = () => {
    const current = headerPageSeparator;
    const next = current === '-' ? 'of' : current === 'of' ? '/' : current === '/' ? '' : '-';
    onUpdateSettings({ headerPageSeparator: next });
  };

  const cycleFooterSeparator = () => {
    const current = footerPageSeparator;
    const next = current === '-' ? 'of' : current === 'of' ? '/' : current === '/' ? '' : '-';
    onUpdateSettings({ footerPageSeparator: next });
  };

  // Preset quick templates
  const applyPreset = (preset: 'executive' | 'academic' | 'confidential' | 'clean') => {
    switch (preset) {
      case 'executive':
        onUpdateSettings({
          headerLeft: title.replace(/\.[^.]+$/, ''),
          headerRight: author,
          headerShowPages: false,
          footerLeft: 'Confidential & Proprietary',
          footerRight: `Version ${version}`,
          footerShowPages: true,
          footerPageSeparator: '-',
          showHeaderFooter: true,
        });
        onShowMessage('Applied Executive Header & Footer preset');
        break;
      case 'academic':
        onUpdateSettings({
          headerLeft: '',
          headerRight: `${author} | ${title.replace(/\.[^.]+$/, '')}`,
          headerShowPages: false,
          footerLeft: '',
          footerRight: '',
          footerShowPages: true,
          footerPageSeparator: 'of',
          showHeaderFooter: true,
        });
        onShowMessage('Applied Academic / Research preset');
        break;
      case 'confidential':
        onUpdateSettings({
          headerLeft: 'STRICTLY CONFIDENTIAL',
          headerRight: 'DO NOT DISTRIBUTE',
          headerShowPages: false,
          footerLeft: '© ' + new Date().getFullYear() + ' ' + author,
          footerRight: '',
          footerShowPages: true,
          footerPageSeparator: '-',
          showHeaderFooter: true,
        });
        onShowMessage('Applied Confidential Legal preset');
        break;
      case 'clean':
        onUpdateSettings({
          headerLeft: '',
          headerRight: '',
          headerShowPages: false,
          footerLeft: '',
          footerRight: '',
          footerShowPages: true,
          footerPageSeparator: '-',
          showHeaderFooter: true,
        });
        onShowMessage('Reset to Clean Page Numbering');
        break;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Info</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Document properties and quick actions.
        </p>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Document Properties Card (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs p-6 md:p-7 space-y-4">
            {/* Title */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-xs font-medium text-neutral-500 select-none">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => onUpdateSettings({ title: e.target.value })}
                className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[240px] truncate"
                placeholder="Document Title"
              />
            </div>

            {/* Author */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-xs font-medium text-neutral-500 select-none">Author</span>
              <input
                type="text"
                value={author}
                onChange={(e) => onUpdateSettings({ author: e.target.value })}
                className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[240px] truncate"
                placeholder="Author Name"
              />
            </div>

            {/* Tags */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-xs font-medium text-neutral-500 select-none">Tags</span>
              <input
                type="text"
                value={tags}
                onChange={(e) => onUpdateSettings({ tags: e.target.value })}
                className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[240px] truncate"
                placeholder="e.g. Personal, Report, Financial"
              />
            </div>

            {/* Version */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-xs font-medium text-neutral-500 select-none">Version</span>
              <input
                type="text"
                value={version}
                onChange={(e) => onUpdateSettings({ version: e.target.value })}
                className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[120px] truncate"
                placeholder="1.0.0"
              />
            </div>

            {/* Created */}
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-xs font-medium text-neutral-500 select-none">Created</span>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={createdDate}
                  onChange={(e) => onUpdateSettings({ createdDate: e.target.value })}
                  className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[180px] truncate"
                  placeholder="Date Created"
                />
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ createdDate: getFormattedNow() })}
                  title="Set Created to current time"
                  className="text-neutral-400 hover:text-[#185abd] text-[10px] p-1 rounded hover:bg-neutral-100 transition-colors"
                >
                  <RefreshCw size={11} />
                </button>
              </div>
            </div>

            {/* Updated */}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-medium text-neutral-500 select-none">Updated</span>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={updatedDate}
                  onChange={(e) => onUpdateSettings({ updatedDate: e.target.value })}
                  className="text-right font-medium text-neutral-900 text-xs bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#185abd] focus:outline-hidden py-1 px-1.5 transition-colors rounded-xs max-w-[180px] truncate"
                  placeholder="Date Updated"
                />
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ updatedDate: getFormattedNow() })}
                  title="Update timestamp to now"
                  className="text-neutral-400 hover:text-[#185abd] text-[10px] p-1 rounded hover:bg-neutral-100 transition-colors"
                >
                  <RefreshCw size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveNow}
              className="px-5 py-2.5 bg-[#185abd] hover:bg-[#12448f] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-xs active:scale-98 transition-all"
            >
              {justSaved ? <Check size={16} /> : <Save size={16} />}
              <span>{justSaved ? 'Saved!' : 'Save Now'}</span>
            </button>

            <button
              onClick={handleSaveSnapshot}
              className="px-5 py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-2xs active:scale-98 transition-all"
            >
              <Clock size={16} className="text-neutral-500" />
              <span>Save Snapshot</span>
            </button>
          </div>

          {/* Document Word Metrics Info Pill */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-lg p-3 text-[11px] text-neutral-600 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText size={14} className="text-[#185abd]" />
              <span><strong>{stats.words}</strong> words &bull; <strong>{stats.characters}</strong> chars</span>
            </div>
            <span className="text-neutral-400">~{stats.readingTimeMinutes} min read</span>
          </div>

          {/* LOCAL STORAGE & PRIVACY MANAGEMENT CARD */}
          <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 text-[#185abd] rounded-md">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-800 tracking-tight">
                    Local Storage &amp; Privacy Setup
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Offline browser database and cache control
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200">
                {storageSizeKB} KB cached
              </span>
            </div>

            {/* AutoSave status and toggle row */}
            <div className="flex items-center justify-between py-1 text-xs">
              <div>
                <span className="font-semibold text-neutral-700 block">AutoSave Mode</span>
                <span className="text-[11px] text-neutral-500">
                  {autoSaveEnabled
                    ? 'Saving document automatically on each keystroke'
                    : 'Auto-save disabled (Safe for public/shared computers)'}
                </span>
              </div>
              {onToggleAutoSave && (
                <button
                  type="button"
                  onClick={() => onToggleAutoSave(!autoSaveEnabled)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                    autoSaveEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                  }`}
                  title="Toggle AutoSave"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      autoSaveEnabled ? 'bg-white' : 'bg-neutral-500'
                    }`}
                  />
                  <span>{autoSaveEnabled ? 'AutoSave ON' : 'AutoSave OFF'}</span>
                </button>
              )}
            </div>

            {/* Success message banner */}
            {cleanSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>{cleanSuccessMsg}</span>
              </div>
            )}

            {/* Clean storage button / confirm */}
            <div className="pt-1">
              {!showCleanConfirm ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCleanConfirm(true)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 border border-red-200 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-700 rounded text-xs font-medium cursor-pointer transition-colors"
                    title="Clean all cached documents and settings from local storage"
                  >
                    <Trash2 size={14} className="text-red-600" />
                    <span>Clean Local Storage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSaveToLocalStorage();
                      calculateStorageUsage();
                      onShowMessage('Saved to Local DB manually!');
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 border border-neutral-300 hover:border-[#185abd] bg-neutral-50 hover:bg-white text-neutral-700 hover:text-[#185abd] rounded text-xs font-medium cursor-pointer transition-colors"
                    title="Save current document to Local DB now"
                  >
                    <Save size={14} />
                    <span>Save Now to Local DB</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2.5">
                  <div className="flex items-start space-x-2 text-xs text-red-900">
                    <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Clean Local Storage?</strong> This will erase all offline cached drafts, settings, and snapshots from this browser. Use this before logging off public PCs.
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCleanConfirm(false)}
                      className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-800 bg-white border border-neutral-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCleanStorage}
                      className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 font-semibold rounded cursor-pointer shadow-2xs"
                    >
                      Confirm Clean
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-500 leading-normal">
              <ShieldCheck size={11} className="inline mr-1 text-neutral-400" />
              Untrusted / Public network protection: Disable AutoSave and click <strong>Clean Local Storage</strong> to ensure no document data remains cached on this computer.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>Header &amp; Footer Smart Presets</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyPreset('executive')}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-[#185abd] hover:text-[#185abd] rounded text-left font-medium text-neutral-700 transition-colors shadow-2xs"
              >
                Executive Report
              </button>
              <button
                type="button"
                onClick={() => applyPreset('academic')}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-[#185abd] hover:text-[#185abd] rounded text-left font-medium text-neutral-700 transition-colors shadow-2xs"
              >
                Academic Paper
              </button>
              <button
                type="button"
                onClick={() => applyPreset('confidential')}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-[#185abd] hover:text-[#185abd] rounded text-left font-medium text-neutral-700 transition-colors shadow-2xs"
              >
                Confidential Legal
              </button>
              <button
                type="button"
                onClick={() => applyPreset('clean')}
                className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:border-[#185abd] hover:text-[#185abd] rounded text-left font-medium text-neutral-700 transition-colors shadow-2xs"
              >
                Clean Page Numbers
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Document Header & Footer (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <h2 className="text-base md:text-lg font-bold text-neutral-800 text-center mb-5 tracking-tight">
            Document Header &amp; Footer
          </h2>

          <div className="w-full max-w-[440px] flex flex-col items-center space-y-4">
            {/* TOP HEADER CONTROLS (Add Left Text | Pages 1 - 44 | Add Right Text) */}
            <div className="w-full flex items-center justify-between gap-1.5">
              {/* Header Left Text Input */}
              <input
                type="text"
                placeholder="Add Left Text"
                value={headerLeft}
                onChange={(e) => onUpdateSettings({ headerLeft: e.target.value })}
                className="border border-neutral-400 bg-white hover:bg-neutral-50 focus:bg-white focus:border-[#185abd] text-neutral-800 text-xs px-2.5 py-1 rounded w-28 md:w-32 focus:outline-hidden text-center placeholder:text-neutral-500 shadow-2xs transition-all"
                title="Header Left Text"
              />

              {/* Pages Center Controls */}
              <div className="flex items-center space-x-1" title="Smart Page Numbering Configuration">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ headerShowPages: !headerShowPages })}
                  className={`border text-xs px-2 py-1 rounded font-medium cursor-pointer transition-colors shadow-2xs ${
                    headerShowPages
                      ? 'bg-[#185abd] border-[#185abd] text-white font-semibold'
                      : 'border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title="Toggle Header Page Numbers (Blue = Active)"
                >
                  Pages
                </button>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={1}
                  value={headerPageState}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onUpdateSettings({ headerPageStart: isNaN(v) || v <= 0 ? 0 : 1 });
                  }}
                  onClick={() => {
                    onUpdateSettings({ headerPageStart: headerPageState === 1 ? 0 : 1 });
                  }}
                  className={`border text-xs px-1.5 py-1 rounded w-9 text-center font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                    headerPageState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/60 font-black'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-400'
                  }`}
                  title="Page Counter State: 1 = Show Current Page, 0 = No Page. Click or type 0 or 1"
                />
                <button
                  type="button"
                  onClick={cycleHeaderSeparator}
                  className={`border border-neutral-400 hover:bg-neutral-100 text-neutral-700 text-xs px-1.5 py-1 rounded font-mono font-bold cursor-pointer shadow-2xs min-w-[26px] ${
                    headerPageSeparator === '' ? 'bg-amber-50 text-neutral-400 italic text-[11px]' : 'bg-white'
                  }`}
                  title={`Separator: ${headerPageSeparator === '' ? 'Empty (none)' : `"${headerPageSeparator}"`}. Click to cycle: '-' | 'of' | '/' | empty`}
                >
                  {headerPageSeparator === '' ? '∅' : headerPageSeparator}
                </button>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={1}
                  value={headerMaxState}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onUpdateSettings({ headerPageTotal: isNaN(v) || v <= 0 ? 0 : 1 });
                  }}
                  onClick={() => {
                    onUpdateSettings({ headerPageTotal: headerMaxState === 1 ? 0 : 1 });
                  }}
                  className={`border text-xs px-1.5 py-1 rounded w-9 text-center font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                    headerMaxState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/60 font-black'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-400'
                  }`}
                  title={`Max Pages State: 1 = Show Total Pages (${realTotalPages}), 0 = No Total Pages. Click or type 0 or 1`}
                />
              </div>

              {/* Header Right Text Input */}
              <input
                type="text"
                placeholder="Add Right Text"
                value={headerRight}
                onChange={(e) => onUpdateSettings({ headerRight: e.target.value })}
                className="border border-neutral-400 bg-white hover:bg-neutral-50 focus:bg-white focus:border-[#185abd] text-neutral-800 text-xs px-2.5 py-1 rounded w-28 md:w-32 focus:outline-hidden text-center placeholder:text-neutral-500 shadow-2xs transition-all"
                title="Header Right Text"
              />
            </div>

            {/* DOCUMENT PAGE SHEET VISUAL PREVIEW */}
            <div
              className="w-full max-w-[360px] h-[430px] bg-white border-2 border-neutral-900 rounded-[2px] p-5 flex flex-col justify-between relative select-none transition-shadow"
              style={{
                boxShadow: '8px 8px 0px rgba(17, 24, 39, 0.95)',
              }}
            >
              {/* Top Header Live Render */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 border-b border-neutral-200/80 pb-1.5 font-sans h-5">
                <span className="truncate max-w-[35%] font-medium">
                  {headerLeft || <span className="opacity-0">Header Left</span>}
                </span>
                <span className="text-center font-medium">
                  {headerPreviewText}
                </span>
                <span className="truncate max-w-[35%] text-right font-medium">
                  {headerRight || <span className="opacity-0">Header Right</span>}
                </span>
              </div>

              {/* Watermark Setup Row (Matches User Photo with Red Label & Box) */}
              <div className="flex items-center justify-center space-x-2 pt-2.5 pb-1 z-10">
                <span className="text-xs font-bold text-red-600 select-none">Watermark</span>
                <input
                  type="text"
                  placeholder="Set your watermark here"
                  value={settings.customWatermark ?? ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    onUpdateSettings({
                      customWatermark: text,
                      watermark: 'Your Mark',
                    });
                    onSaveToLocalStorage();
                  }}
                  className="border border-red-500 bg-white text-neutral-900 text-xs px-2.5 py-1 rounded w-48 text-center placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-red-400 shadow-2xs font-medium"
                  title="Set your custom watermark. Selecting 'Your Mark' stamps this text on pages."
                />
              </div>

              {/* Watermark Live Ghost Overlay in Preview Sheet */}
              {settings.watermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                  <span className="text-3xl font-black uppercase tracking-widest text-neutral-300/40 -rotate-45 transform whitespace-nowrap">
                    {settings.watermark === 'Your Mark'
                      ? (settings.customWatermark || 'YOUR MARK')
                      : settings.watermark}
                  </span>
                </div>
              )}

              {/* Center Stylized Paragraph Text Lines (matching user screenshot) */}
              <div className="flex-1 flex flex-col justify-center space-y-4 px-3 my-2">
                {/* Paragraph 1 */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-1/3 bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-1/4 bg-neutral-800 rounded-full" />
                </div>

                {/* Paragraph 2 */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-1/2 bg-neutral-800 rounded-full" />
                </div>

                {/* Paragraph 3 */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-1/3 bg-neutral-800 rounded-full" />
                </div>

                {/* Paragraph 4 */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-1/4 bg-neutral-800 rounded-full" />
                </div>

                {/* Paragraph 5 */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full" />
                  <div className="h-1.5 w-1/3 bg-neutral-800 rounded-full" />
                </div>
              </div>

              {/* Bottom Footer Live Render */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-200/80 pt-1.5 font-sans h-5">
                <span className="truncate max-w-[35%] font-medium">
                  {footerLeft || <span className="opacity-0">Footer Left</span>}
                </span>
                <span className="text-center font-medium">
                  {footerPreviewText}
                </span>
                <span className="truncate max-w-[35%] text-right font-medium">
                  {footerRight || <span className="opacity-0">Footer Right</span>}
                </span>
              </div>
            </div>

            {/* BOTTOM FOOTER CONTROLS (Add Left Text | Pages 1 - 44 | Add Right Text) */}
            <div className="w-full flex items-center justify-between gap-1.5">
              {/* Footer Left Text Input */}
              <input
                type="text"
                placeholder="Add Left Text"
                value={footerLeft}
                onChange={(e) => onUpdateSettings({ footerLeft: e.target.value })}
                className="border border-neutral-400 bg-white hover:bg-neutral-50 focus:bg-white focus:border-[#185abd] text-neutral-800 text-xs px-2.5 py-1 rounded w-28 md:w-32 focus:outline-hidden text-center placeholder:text-neutral-500 shadow-2xs transition-all"
                title="Footer Left Text"
              />

              {/* Pages Center Controls */}
              <div className="flex items-center space-x-1" title="Smart Page Numbering Configuration">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ footerShowPages: !footerShowPages })}
                  className={`border text-xs px-2 py-1 rounded font-medium cursor-pointer transition-colors shadow-2xs ${
                    footerShowPages
                      ? 'bg-[#185abd] border-[#185abd] text-white font-semibold'
                      : 'border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                  title="Toggle Footer Page Numbers (Blue = Active)"
                >
                  Pages
                </button>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={1}
                  value={footerPageState}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onUpdateSettings({ footerPageStart: isNaN(v) || v <= 0 ? 0 : 1 });
                  }}
                  onClick={() => {
                    onUpdateSettings({ footerPageStart: footerPageState === 1 ? 0 : 1 });
                  }}
                  className={`border text-xs px-1.5 py-1 rounded w-9 text-center font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                    footerPageState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/60 font-black'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-400'
                  }`}
                  title="Page Counter State: 1 = Show Current Page, 0 = No Page. Click or type 0 or 1"
                />
                <button
                  type="button"
                  onClick={cycleFooterSeparator}
                  className={`border border-neutral-400 hover:bg-neutral-100 text-neutral-700 text-xs px-1.5 py-1 rounded font-mono font-bold cursor-pointer shadow-2xs min-w-[26px] ${
                    footerPageSeparator === '' ? 'bg-amber-50 text-neutral-400 italic text-[11px]' : 'bg-white'
                  }`}
                  title={`Separator: ${footerPageSeparator === '' ? 'Empty (none)' : `"${footerPageSeparator}"`}. Click to cycle: '-' | 'of' | '/' | empty`}
                >
                  {footerPageSeparator === '' ? '∅' : footerPageSeparator}
                </button>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={1}
                  value={footerMaxState}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    onUpdateSettings({ footerPageTotal: isNaN(v) || v <= 0 ? 0 : 1 });
                  }}
                  onClick={() => {
                    onUpdateSettings({ footerPageTotal: footerMaxState === 1 ? 0 : 1 });
                  }}
                  className={`border text-xs px-1.5 py-1 rounded w-9 text-center font-bold transition-colors cursor-pointer shadow-2xs select-none ${
                    footerMaxState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/60 font-black'
                      : 'border-neutral-300 bg-neutral-100 text-neutral-400'
                  }`}
                  title={`Max Pages State: 1 = Show Total Pages (${realTotalPages}), 0 = No Total Pages. Click or type 0 or 1`}
                />
              </div>

              {/* Footer Right Text Input */}
              <input
                type="text"
                placeholder="Add Right Text"
                value={footerRight}
                onChange={(e) => onUpdateSettings({ footerRight: e.target.value })}
                className="border border-neutral-400 bg-white hover:bg-neutral-50 focus:bg-white focus:border-[#185abd] text-neutral-800 text-xs px-2.5 py-1 rounded w-28 md:w-32 focus:outline-hidden text-center placeholder:text-neutral-500 shadow-2xs transition-all"
                title="Footer Right Text"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSetupSection;

