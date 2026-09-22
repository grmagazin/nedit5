import React from 'react';
import { DocumentSettings, DocumentStats } from '../types';
import { 
  Check, 
  BookOpen, 
  FileText, 
  Globe, 
  Minus, 
  Plus 
} from 'lucide-react';

interface StatusBarProps {
  stats: DocumentStats;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenStats: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  settings,
  onUpdateSettings,
  onOpenStats,
}) => {
  return (
    <footer id="word-status-bar" className="h-6 bg-[#185abd] text-white flex items-center justify-between px-3 text-[11px] select-none no-print z-20 shadow-inner">
      {/* Left side: Page, Word Count, Proofing */}
      <div className="flex items-center space-x-3">
        <span className="hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          Page 1 of 1
        </span>

        <button
          onClick={onOpenStats}
          className="hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          title="Click to view detailed document statistics"
        >
          {stats.words} {stats.words === 1 ? 'word' : 'words'}
        </button>

        <div className="hidden sm:flex items-center space-x-1 hover:bg-white/15 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          <Check size={11} className="text-emerald-300" />
          <span className="text-[10px]">No proofing errors</span>
        </div>

        <span className="hidden md:inline-block text-blue-200/80">
          English (United States)
        </span>
      </div>

      {/* Right side: View modes, Zoom slider & percentage */}
      <div className="flex items-center space-x-2.5">
        {/* View Layout Switchers */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => onUpdateSettings({ viewMode: 'read' })}
            title="Read Mode"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'read' ? 'bg-white/30 text-white' : 'hover:bg-white/15 text-blue-100'
            }`}
          >
            <BookOpen size={12} />
          </button>
          <button
            onClick={() => onUpdateSettings({ viewMode: 'print' })}
            title="Print Layout"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'print' ? 'bg-white/30 text-white' : 'hover:bg-white/15 text-blue-100'
            }`}
          >
            <FileText size={12} />
          </button>
          <button
            onClick={() => onUpdateSettings({ viewMode: 'web' })}
            title="Web Layout"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'web' ? 'bg-white/30 text-white' : 'hover:bg-white/15 text-blue-100'
            }`}
          >
            <Globe size={12} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-blue-400/40">
          <button
            onClick={() => onUpdateSettings({ zoom: Math.max(50, settings.zoom - 10) })}
            title="Zoom Out"
            className="hover:bg-white/20 p-0.5 rounded text-white/90 cursor-pointer"
          >
            <Minus size={11} />
          </button>

          <input
            type="range"
            min="50"
            max="180"
            step="5"
            value={settings.zoom}
            onChange={(e) => onUpdateSettings({ zoom: parseInt(e.target.value, 10) })}
            className="w-16 sm:w-24 h-1 bg-blue-300/40 rounded-lg appearance-none cursor-pointer accent-white"
          />

          <button
            onClick={() => onUpdateSettings({ zoom: Math.min(180, settings.zoom + 10) })}
            title="Zoom In"
            className="hover:bg-white/20 p-0.5 rounded text-white/90 cursor-pointer"
          >
            <Plus size={11} />
          </button>

          <button
            onClick={() => onUpdateSettings({ zoom: 100 })}
            className="w-9 text-right hover:bg-white/15 px-1 py-0.5 rounded cursor-pointer transition-colors"
            title="Reset Zoom to 100%"
          >
            {settings.zoom}%
          </button>
        </div>
      </div>
    </footer>
  );
};
