import React from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { History, X } from 'lucide-react';
import { DocumentSnapshot } from '../../types';

export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  snapshots: DocumentSnapshot[];
  onUpdateSnapshots: (snapshots: DocumentSnapshot[]) => void;
  onNotify?: (message: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  editor,
  snapshots,
  onUpdateSnapshots,
  onNotify,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      id="word-version-history-modal"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ position: 'fixed', zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-6 w-full max-w-2xl max-h-[85vh] flex flex-col text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start space-x-2 text-[#2563eb] dark:text-blue-400">
            <History size={20} />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Document Version History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-xs">
              No snapshots recorded yet. Click "Save Snapshot" to record version milestones.
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50/40 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-start space-x-2">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100">{snap.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full font-medium">
                      {snap.wordCount} words
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5">{snap.timestamp}</span>
                </div>

                <div className="flex items-start space-x-2">
                  <button
                    onClick={() => {
                      if (editor && snap.htmlContent) {
                        editor.commands.setContent(snap.htmlContent);
                        onClose();
                        onNotify?.(`Document restored to "${snap.name}"`);
                      }
                    }}
                    className="px-3 py-1 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-medium transition-colors cursor-pointer"
                  >
                    Restore Version
                  </button>
                  <button
                    onClick={() => {
                      const updated = snapshots.filter((s) => s.id !== snap.id);
                      onUpdateSnapshots(updated);
                      try {
                        localStorage.setItem('word_doc_snapshots', JSON.stringify(updated));
                      } catch {}
                    }}
                    className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete snapshot"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Snapshots are preserved in your browser workspace.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded font-medium cursor-pointer transition-colors"
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
