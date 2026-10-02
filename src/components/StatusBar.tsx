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
  totalPages?: number;
  activePage?: number;
  onToggleNavigation?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  settings,
  onUpdateSettings,
  onOpenStats,
  totalPages = 1,
  activePage = 1,
  onToggleNavigation,
}) => {
  const effectiveThemeMode = settings.themeMode || (settings.isDarkMode ? 'fullDark' : 'light');
  const isDarkFooter = effectiveThemeMode === 'fullDark' || effectiveThemeMode === 'canvasDark';
  const isSepiaFooter = effectiveThemeMode === 'sepia';

  const footerBgClass = isDarkFooter
    ? 'bg-[#181818] text-neutral-300 border-t border-[#2d2d2d]'
    : isSepiaFooter
    ? 'bg-[#3f2e22] text-[#fbf8ee] border-t border-[#302218]'
    : 'bg-[#185abd] text-white shadow-inner';

  const hoverBgClass = isDarkFooter
    ? 'hover:bg-white/10'
    : isSepiaFooter
    ? 'hover:bg-white/10'
    : 'hover:bg-white/15';

  const subTextColor = isDarkFooter
    ? 'text-neutral-400'
    : isSepiaFooter
    ? 'text-[#d6c4a6]'
    : 'text-blue-200/80';

  const dividerBorder = isDarkFooter
    ? 'border-neutral-700'
    : isSepiaFooter
    ? 'border-[#5e4939]'
    : 'border-blue-400/40';

  const rangeTrackClass = isDarkFooter
    ? 'bg-neutral-700'
    : isSepiaFooter
    ? 'bg-[#5e4939]'
    : 'bg-blue-300/40';

  return (
    <footer id="word-status-bar" className={`h-6 ${footerBgClass} flex items-center justify-between px-3 text-[11px] select-none no-print z-20`}>
      {/* Left side: Page, Word Count, Proofing */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleNavigation}
          className={`${hoverBgClass} px-1.5 py-0.5 rounded cursor-pointer transition-colors font-medium`}
          title="Click to view Navigation Pages"
        >
          Page {activePage} of {totalPages}
        </button>

        <button
          onClick={onOpenStats}
          className={`${hoverBgClass} px-1.5 py-0.5 rounded cursor-pointer transition-colors`}
          title="Click to view detailed document statistics"
        >
          {stats.words} {stats.words === 1 ? 'word' : 'words'}
        </button>

        <div className={`hidden sm:flex items-center space-x-1 ${hoverBgClass} px-1.5 py-0.5 rounded cursor-pointer transition-colors`}>
          <Check size={11} className="text-emerald-400" />
          <span className="text-[10px]">No proofing errors</span>
        </div>

        <span className={`hidden md:inline-block ${subTextColor}`}>
          English (United States)
        </span>
      </div>

      {/* Center section: Support App Link */}
      <div className="flex items-center justify-center">
        <a
          href="https://grmagazin.blogspot.com/p/donate.html"
          target="_blank"
          rel="noopener noreferrer"
          className={`${hoverBgClass} px-2 py-0.5 rounded cursor-pointer transition-colors text-[11px] font-medium flex items-center`}
          title="Support App (Opens in a new tab)"
        >
          ❤️ Support App 
        </a>
      </div>

      {/* Right side: View modes, Zoom slider & percentage */}
      <div className="flex items-center space-x-2.5">
        {/* View Layout Switchers */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => onUpdateSettings({ viewMode: 'read' })}
            title="Read Mode"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'read'
                ? isDarkFooter
                  ? 'bg-white/20 text-white font-medium'
                  : 'bg-white/30 text-white'
                : `${hoverBgClass} ${isDarkFooter ? 'text-neutral-400' : 'text-blue-100'}`
            }`}
          >
            <BookOpen size={12} />
          </button>
          <button
            onClick={() => onUpdateSettings({ viewMode: 'print' })}
            title="Print Layout"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'print'
                ? isDarkFooter
                  ? 'bg-white/20 text-white font-medium'
                  : 'bg-white/30 text-white'
                : `${hoverBgClass} ${isDarkFooter ? 'text-neutral-400' : 'text-blue-100'}`
            }`}
          >
            <FileText size={12} />
          </button>
          <button
            onClick={() => onUpdateSettings({ viewMode: 'web' })}
            title="Web Layout"
            className={`p-1 rounded transition-colors ${
              settings.viewMode === 'web'
                ? isDarkFooter
                  ? 'bg-white/20 text-white font-medium'
                  : 'bg-white/30 text-white'
                : `${hoverBgClass} ${isDarkFooter ? 'text-neutral-400' : 'text-blue-100'}`
            }`}
          >
            <Globe size={12} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center space-x-1.5 pl-2 border-l ${dividerBorder}`}>
          <button
            onClick={() => onUpdateSettings({ zoom: Math.max(50, settings.zoom - 10) })}
            title="Zoom Out"
            className={`${hoverBgClass} p-0.5 rounded text-white/90 cursor-pointer`}
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
            className={`w-16 sm:w-24 h-1 ${rangeTrackClass} rounded-lg appearance-none cursor-pointer accent-blue-500`}
          />

          <button
            onClick={() => onUpdateSettings({ zoom: Math.min(180, settings.zoom + 10) })}
            title="Zoom In"
            className={`${hoverBgClass} p-0.5 rounded text-white/90 cursor-pointer`}
          >
            <Plus size={11} />
          </button>

          <button
            onClick={() => onUpdateSettings({ zoom: 100 })}
            className={`w-9 text-right ${hoverBgClass} px-1 py-0.5 rounded cursor-pointer transition-colors`}
            title="Reset Zoom to 100%"
          >
            {settings.zoom}%
          </button>
        </div>
      </div>
    </footer>
  );
};
