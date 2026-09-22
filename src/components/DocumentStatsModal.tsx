import React from 'react';
import { DocumentStats } from '../types';
import { FileText, X, Clock, AlignLeft } from 'lucide-react';

interface DocumentStatsModalProps {
  stats: DocumentStats;
  onClose: () => void;
}

export const DocumentStatsModal: React.FC<DocumentStatsModalProps> = ({ stats, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none no-print">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-300 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#185abd] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-semibold text-sm">
            <FileText size={16} />
            <span>Word Count &amp; Statistics</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-4 space-y-3 text-xs text-neutral-700">
          <div className="grid grid-cols-2 gap-y-2 border-b border-neutral-200 pb-3">
            <span className="text-neutral-500">Pages:</span>
            <span className="font-semibold text-right">1</span>

            <span className="text-neutral-500">Words:</span>
            <span className="font-semibold text-right text-[#185abd]">{stats.words.toLocaleString()}</span>

            <span className="text-neutral-500">Characters (no spaces):</span>
            <span className="font-semibold text-right">{stats.charactersNoSpaces.toLocaleString()}</span>

            <span className="text-neutral-500">Characters (with spaces):</span>
            <span className="font-semibold text-right">{stats.characters.toLocaleString()}</span>

            <span className="text-neutral-500">Paragraphs:</span>
            <span className="font-semibold text-right">{stats.paragraphs.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between bg-blue-50/60 p-2.5 rounded border border-blue-100">
            <div className="flex items-center space-x-2 text-[#185abd]">
              <Clock size={15} />
              <span className="font-medium">Estimated Reading Time:</span>
            </div>
            <span className="font-bold text-[#185abd]">
              {stats.readingTimeMinutes <= 1 ? '< 1 min' : `~${stats.readingTimeMinutes} mins`}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-4 py-2.5 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
