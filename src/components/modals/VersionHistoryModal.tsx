import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { History, X, Sparkles, Plus, Save, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { DocumentSnapshot } from '../../types';
import { asyncSaveSnapshot, asyncDeleteSnapshot } from '../../utils/indexedDbStorage';

export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  snapshots: DocumentSnapshot[];
  onUpdateSnapshots: (snapshots: DocumentSnapshot[]) => void;
  onNotify?: (message: string) => void;
  totalPages?: number;
}

const MAX_VERSIONS = 6;

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  editor,
  snapshots,
  onUpdateSnapshots,
  onNotify,
  totalPages,
}) => {
  const [customVersionName, setCustomVersionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Manual Version Save Handler (Strictly capped at 6 versions max)
  const handleSaveManualVersion = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const html = editor.getHTML();
      const text = editor.getText();
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      const name = customVersionName.trim() || `Version ${snapshots.length + 1}`;

      const newSnap: DocumentSnapshot = {
        id: `ver-${Date.now()}`,
        name,
        timestamp: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        htmlContent: html,
        wordCount,
      };

      // Newest version goes to index 0
      const combined = [newSnap, ...snapshots];

      // Keep only up to 6 versions. When 7th is added, oldest is automatically pruned!
      const kept = combined.slice(0, MAX_VERSIONS);
      const toPrune = combined.slice(MAX_VERSIONS);

      // Delete pruned versions from IndexedDB storage
      for (const p of toPrune) {
        await asyncDeleteSnapshot(p.id);
      }

      // Persist the new version
      await asyncSaveSnapshot(newSnap, MAX_VERSIONS);

      onUpdateSnapshots(kept);
      setCustomVersionName('');
      onNotify?.(`Version "${name}" saved successfully! (Max capacity: 6)`);
    } catch (err) {
      console.error('Error saving manual version:', err);
      onNotify?.('Error saving version.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      id="word-version-history-modal"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ position: 'fixed', zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6 w-full max-w-2xl max-h-[88vh] flex flex-col text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#2563eb] dark:text-blue-400">
            <History size={20} />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
              Document Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 10+ and 20+ Page Guidance Banner */}
        {totalPages && totalPages >= 10 && (
          <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center space-x-2">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            <span>
              {totalPages >= 20
                ? '⚡ 20+ pages detected: Manual page calculation enabled for high-speed editing.'
                : '💡 Tip: For 10+ page documents, switch to Manual Page Calculation in the footer for faster typing.'}
            </span>
          </div>
        )}

        {/* Manual Version Save Box (Manual Save) */}
        <div className="bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3.5 my-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center space-x-1.5">
              <Plus size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Save Current Version (Manual Save)</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
              {snapshots.length} / {MAX_VERSIONS} versions
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customVersionName}
              onChange={(e) => setCustomVersionName(e.target.value)}
              placeholder={`Version name (e.g. Version ${snapshots.length + 1}, Final Report, Draft v2)`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveManualVersion();
                }
              }}
              className="flex-1 text-xs px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-neutral-100"
            />
            <button
              onClick={handleSaveManualVersion}
              disabled={isSaving || !editor}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all shadow-xs shrink-0"
            >
              <Save size={13} />
              <span>{isSaving ? 'Saving...' : 'Save Version'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10.5px] text-neutral-500 dark:text-neutral-400">
            <span>ℹ️ Max capacity: <strong>6 versions</strong>.</span>
            <span>When a 7th version is added, the oldest is automatically purged (FIFO).</span>
          </div>
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
          {snapshots.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 dark:text-neutral-500 text-xs">
              No saved versions yet. Type a version name above and click "Save Version".
            </div>
          ) : (
            snapshots.slice(0, MAX_VERSIONS).map((snap, index) => (
              <div
                key={snap.id}
                className="p-3 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50/40 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between transition-colors shadow-2xs"
              >
                <div className="flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100">{snap.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full font-medium">
                        {snap.wordCount} words
                      </span>
                      {index === 0 && (
                        <span className="text-[9.5px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 rounded font-semibold border border-emerald-300 dark:border-emerald-800">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <Clock size={11} />
                      <span>{snap.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => {
                      if (editor && snap.htmlContent) {
                        // Emergency Auto-Backup before restore to guarantee safety
                        try {
                          const currentHtml = editor.getHTML();
                          const currentWords = editor.storage.characterCount?.words?.() ?? 0;
                          const preRestoreSnap: DocumentSnapshot = {
                            id: `ver-${Date.now()}`,
                            name: `Auto-Backup before "${snap.name}"`,
                            timestamp: new Date().toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                            htmlContent: currentHtml,
                            wordCount: currentWords,
                          };

                          const combined = [preRestoreSnap, ...snapshots];
                          const kept = combined.slice(0, MAX_VERSIONS);
                          const toPrune = combined.slice(MAX_VERSIONS);
                          for (const p of toPrune) {
                            await asyncDeleteSnapshot(p.id);
                          }
                          await asyncSaveSnapshot(preRestoreSnap, MAX_VERSIONS);
                          onUpdateSnapshots(kept);
                        } catch {}

                        editor.commands.setContent(snap.htmlContent);
                        onClose();
                        onNotify?.(`Restored to "${snap.name}" (Safety auto-backup created)`);
                      }
                    }}
                    className="px-3 py-1 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    Restore
                  </button>
                  <button
                    onClick={async () => {
                      const updated = snapshots.filter((s) => s.id !== snap.id);
                      onUpdateSnapshots(updated);
                      await asyncDeleteSnapshot(snap.id);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Delete version"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400 flex items-center space-x-1">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Async IndexedDB storage &bull; Automatic FIFO pruning (max 6)</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VersionHistoryModal;
