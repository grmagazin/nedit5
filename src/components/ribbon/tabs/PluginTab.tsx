import React from 'react';
import { Editor } from '@tiptap/react';
import {
  FileSpreadsheet,
  Presentation,
  Palette,
  Images,
  Sparkles,
  Globe,
  Sigma,
  Calculator,
  Search,
  ExternalLink,
} from 'lucide-react';
import { DocumentSettings } from '../../../types';

export interface PluginTabProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (newSettings: Partial<DocumentSettings>) => void;
  isDarkUi?: boolean;
  onNotify?: (msg: string) => void;
}

interface PluginItem {
  id: string;
  name: string;
  url: string;
  tooltip: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorGradient: string;
  iconColor: string;
}

const PRODUCTIVITY_PLUGINS: PluginItem[] = [
  {
    id: 'ncalc',
    name: 'ncalc',
    url: 'https://ncalc5.netlify.app/',
    tooltip: 'Spreadsheet',
    badge: 'Spreadsheet',
    icon: FileSpreadsheet,
    colorGradient: 'from-emerald-600 to-green-700',
    iconColor: '#107c41',
  },
  {
    id: 'slide',
    name: 'Slide',
    url: 'https://nsl.base44.app/',
    tooltip: 'Presentation',
    badge: 'Presentation',
    icon: Presentation,
    colorGradient: 'from-amber-600 to-orange-700',
    iconColor: '#c43e1c',
  },
];

const CREATIVE_PLUGINS: PluginItem[] = [
  {
    id: 'npaint',
    name: 'npaint',
    url: 'https://ndraw.base44.app/',
    tooltip: 'Photo Editor',
    badge: 'Photo Editor',
    icon: Palette,
    colorGradient: 'from-violet-600 to-indigo-700',
    iconColor: '#7c3aed',
  },
];

const SEARCH_PLUGINS: PluginItem[] = [
  {
    id: 'pixfind',
    name: 'PixFind',
    url: 'https://photo.zite.so/',
    tooltip: 'Pics Finder',
    badge: 'Pics Finder',
    icon: Images,
    colorGradient: 'from-sky-500 to-blue-600',
    iconColor: '#0284c7',
  },
  {
    id: 'engine',
    name: 'Engine',
    url: 'https://engine.zite.so/',
    tooltip: 'Search Engine',
    badge: 'Search Engine',
    icon: Globe,
    colorGradient: 'from-teal-600 to-cyan-600',
    iconColor: '#0d9488',
  },
  {
    id: 'omniai',
    name: 'OmniAi',
    url: 'https://omn.base44.app/',
    tooltip: 'Ai Web finder',
    badge: 'AI Web finder',
    icon: Sparkles,
    colorGradient: 'from-fuchsia-600 to-pink-600',
    iconColor: '#9333ea',
  },
];

const MATH_PLUGINS: PluginItem[] = [
  {
    id: 'calcfx',
    name: 'CalcFX',
    url: 'https://calcfx.ai.studio/',
    tooltip: 'Scientific Calculator',
    badge: 'Calculator',
    icon: Calculator,
    colorGradient: 'from-[#0284c7] to-[#185abd]',
    iconColor: '#0284c7',
  },
  {
    id: 'solver',
    name: 'Solver',
    url: 'https://slv.base44.app/',
    tooltip: 'Math Solver',
    badge: 'Math Solver',
    icon: Sigma,
    colorGradient: 'from-rose-500 to-red-600',
    iconColor: '#e11d48',
  },
];

export const PluginTab: React.FC<PluginTabProps> = ({
  settings,
  onUpdateSettings,
  isDarkUi = false,
  onNotify,
}) => {
  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  const handleOpenPlugin = (plugin: PluginItem) => {
    notify(`Opening ${plugin.name} (${plugin.tooltip}) in new tab...`);
    window.open(plugin.url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenFxWizard = () => {
    onUpdateSettings({
      showFxWizardPane: !settings.showFxWizardPane,
      fxWizardLatex: '',
      fxWizardIsBlock: false,
    });
    notify(settings.showFxWizardPane ? 'Closed Fx Wizard' : 'Opened Fx Equation Wizard');
  };

  const renderPluginButton = (plugin: PluginItem) => {
    const IconComponent = plugin.icon;
    return (
      <button
        key={plugin.id}
        type="button"
        onClick={() => handleOpenPlugin(plugin)}
        title={`${plugin.tooltip} — ${plugin.name} (${plugin.url})`}
        className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-200 cursor-pointer transition-all min-w-[62px] group active:scale-95 shadow-2xs hover:shadow-xs"
      >
        <div className="relative mb-0.5">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plugin.colorGradient} text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}
          >
            <IconComponent size={16} className="text-white" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow-2xs border border-neutral-200 dark:border-neutral-700">
            <ExternalLink size={8} className="text-neutral-500 dark:text-neutral-300" />
          </span>
        </div>
        <span className="text-[11px] font-semibold text-center text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5">
          {plugin.name}
        </span>
        <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-medium leading-none truncate max-w-[70px] text-center">
          {plugin.badge}
        </span>
      </button>
    );
  };

  return (
    <div className="flex items-start space-x-0 w-full select-none pt-0.5 animate-in fade-in duration-150 overflow-x-auto pb-1">
      {/* GROUP 1: Productivity (ncalc, Slide) */}
      <div className="flex flex-col items-center pr-3 border-r border-[#dad9d8] dark:border-neutral-700 shrink-0">
        <div className="flex items-start space-x-1.5">
          {PRODUCTIVITY_PLUGINS.map(renderPluginButton)}
        </div>
        <span className="text-[10px] text-center text-neutral-400 dark:text-neutral-500 font-medium mt-1 tracking-wide">
          Productivity
        </span>
      </div>

      {/* GROUP 2: Creative & Design (npaint) */}
      <div className="flex flex-col items-center px-3 border-r border-[#dad9d8] dark:border-neutral-700 shrink-0">
        <div className="flex items-start space-x-1.5">
          {CREATIVE_PLUGINS.map(renderPluginButton)}
        </div>
        <span className="text-[10px] text-center text-neutral-400 dark:text-neutral-500 font-medium mt-1 tracking-wide">
          Creative Tools
        </span>
      </div>

      {/* GROUP 3: Search (PixFind, Engine, OmniAi) */}
      <div className="flex flex-col items-center px-3 border-r border-[#dad9d8] dark:border-neutral-700 shrink-0">
        <div className="flex items-start space-x-1.5">
          {SEARCH_PLUGINS.map(renderPluginButton)}
        </div>
        <span className="text-[10px] text-center text-neutral-400 dark:text-neutral-500 font-medium mt-1 tracking-wide">
          Search
        </span>
      </div>

      {/* GROUP 4: Math & Equations (CalcFX, Solver, Fx Wizard) */}
      <div className="flex flex-col items-center px-3 border-r border-[#dad9d8] dark:border-neutral-700 shrink-0">
        <div className="flex items-start space-x-1.5">
          {MATH_PLUGINS.map(renderPluginButton)}

          {/* Fx Wizard Equation Sidebar Toggle */}
          <button
            type="button"
            onClick={handleOpenFxWizard}
            title="Fx Wizard — Open/Close Fx Mathematical Equation Right Toolbar"
            className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[56px] transition-all ${
              settings.showFxWizardPane
                ? isDarkUi
                  ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa]'
                  : 'bg-[#cde4f7] border-[#185abd] text-[#185abd] shadow-xs'
                : isDarkUi
                ? 'border-transparent hover:bg-white/10 text-neutral-300'
                : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 flex items-center justify-center mb-0.5">
              <span className="text-xs font-serif italic font-extrabold leading-none">Fx</span>
            </div>
            <span className="text-[11px] font-medium text-center text-neutral-700 dark:text-neutral-200 leading-tight">
              Fx Wizard
            </span>
            <span className="text-[9px] text-[#0284c7] dark:text-sky-400 font-medium leading-none">
              Equation
            </span>
          </button>
        </div>
        <span className="text-[10px] text-center text-neutral-400 dark:text-neutral-500 font-medium mt-1 tracking-wide">
          Math Tools
        </span>
      </div>
    </div>
  );
};

export default PluginTab;
