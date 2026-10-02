import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  X,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  CheckSquare,
  Columns,
  MousePointerClick,
  HelpCircle,
  Share2,
  Quote,
  Code,
  Trash2,
  Check,
  Palette,
  Paintbrush,
} from 'lucide-react';
import { ThemeMode } from '../types';

interface QuickBlocksSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  themeMode?: ThemeMode;
}

// 3D Isometric Brick Icon for the header
const BrickIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 3L20 7.5L12 12L4 7.5L12 3Z"
      fill="#ea580c"
      stroke="#c2410c"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M4 7.5L12 12V20.5L4 16V7.5Z"
      fill="#c2410c"
      stroke="#9a3412"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M12 12L20 7.5V16L12 20.5V12Z"
      fill="#9a3412"
      stroke="#7c2d12"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M7 8L12 5.5L17 8.2"
      stroke="#f97316"
      strokeWidth="0.8"
      strokeLinecap="round"
    />
  </svg>
);

// Helper: Convert Hex to RGBA tint for backgrounds
function hexToRgba(hex: string, alpha: number = 0.12): string {
  const clean = hex.replace('#', '').trim();
  const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper: Determine contrast text color (black or white) for button background
function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '').trim();
  const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#0f172a' : '#ffffff';
}

export const QuickBlocksSidebar: React.FC<QuickBlocksSidebarProps> = ({
  editor,
  onClose,
  themeMode = 'light',
}) => {
  const [notification, setNotification] = useState<string | null>(null);

  // Custom colorpicker state (Default: deactivated as requested)
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);
  const [customHex, setCustomHex] = useState<string>('eab308'); // yellow default matching photo
  const colorInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Safe Hex formatting
  const effectiveHex = customHex.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6) || '000000';
  const effectiveColor = `#${effectiveHex}`;

  // Quick palette swatches
  const quickPalette = ['000000', 'eab308', '2563eb', '16a34a', 'dc2626', '8b5cf6'];

  // Insert block with optional custom accent & background color
  const insertBlock = (type: string) => {
    if (!editor) return;

    const accent = useCustomColor ? effectiveColor : null;
    const bgTint = accent ? hexToRgba(accent, 0.12) : null;

    switch (type) {
      case 'info': {
        const border = accent || '#3b82f6';
        const bg = bgTint || '#eff6ff';
        const txt = accent || '#1d4ed8';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="info" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 0 8px 8px 0; color: ${txt};"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>ℹ️</span> <span>Info</span></div><p style="margin: 0; font-size: 13px; color: ${txt}; line-height: 1.5;">This section highlights helpful context, background guidelines, or reference material for the reader.</p></div><p></p>`
          )
          .run();
        showToast('Info panel inserted');
        break;
      }

      case 'warning': {
        const border = accent || '#f59e0b';
        const bg = bgTint || '#fffbeb';
        const txt = accent || '#92400e';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="warning" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 0 8px 8px 0; color: ${txt};"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>⚠️</span> <span>Warning</span></div><p style="margin: 0; font-size: 13px; color: ${txt}; line-height: 1.5;">Review prerequisites and ensure careful validation before proceeding with this operation.</p></div><p></p>`
          )
          .run();
        showToast('Warning panel inserted');
        break;
      }

      case 'error': {
        const border = accent || '#ef4444';
        const bg = bgTint || '#fef2f2';
        const txt = accent || '#b91c1c';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="error" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 0 8px 8px 0; color: ${txt};"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>⛔</span> <span>Error</span></div><p style="margin: 0; font-size: 13px; color: ${txt}; line-height: 1.5;">An exception occurred or action failed. Verify prerequisites and retry the operation.</p></div><p></p>`
          )
          .run();
        showToast('Error panel inserted');
        break;
      }

      case 'success': {
        const border = accent || '#10b981';
        const bg = bgTint || '#f0fdf4';
        const txt = accent || '#047857';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="success" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 0 8px 8px 0; color: ${txt};"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>✅</span> <span>Success</span></div><p style="margin: 0; font-size: 13px; color: ${txt}; line-height: 1.5;">The system verification completed with zero errors and all requirements are satisfied.</p></div><p></p>`
          )
          .run();
        showToast('Success panel inserted');
        break;
      }

      case 'note': {
        const border = accent || '#64748b';
        const bg = bgTint || '#f8fafc';
        const txt = accent || '#334155';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="note" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border-left: 4px solid ${border}; border-radius: 0 8px 8px 0; color: ${txt};"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><span>📝</span> <span>Note</span></div><p style="margin: 0; font-size: 13px; color: ${txt}; line-height: 1.5;">General memo, reminder, or supplementary detail regarding this section.</p></div><p></p>`
          )
          .run();
        showToast('Note panel inserted');
        break;
      }

      case 'checklist': {
        const chkColor = accent || '#185abd';
        const bg = bgTint || '#ffffff';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="checklist" style="margin: 16px 0; padding: 14px 18px; background-color: ${bg}; border: 1px solid ${accent || '#e2e8f0'}; border-radius: 8px;"><div style="font-weight: 700; font-size: 13px; color: ${accent || '#1e293b'}; margin-bottom: 8px;">📋 Action Checklist</div><ul style="list-style: none; padding-left: 0; margin: 0; font-size: 13px; line-height: 1.8; color: #334155;"><li style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" checked style="accent-color: ${chkColor}; cursor: pointer;" /> <span>Review initial scope and technical requirements</span></li><li style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" style="accent-color: ${chkColor}; cursor: pointer;" /> <span>Conduct milestone validation and stakeholder demo</span></li><li style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" style="accent-color: ${chkColor}; cursor: pointer;" /> <span>Finalize sign-off and publication</span></li></ul></div><p></p>`
          )
          .run();
        showToast('Checklist inserted');
        break;
      }

      // Columns: 2 columns block styled with custom background & border
      case 'columns': {
        const colBg = bgTint || '#f8fafc';
        const colBorder = accent ? `border: 1px solid ${accent}50; border-top: 3px solid ${accent};` : 'border: 1px solid #e2e8f0;';
        const headerColor = accent || '#1e293b';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="columns" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 18px 0;"><div style="padding: 14px 16px; background-color: ${colBg}; ${colBorder} border-radius: 8px;"><h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${headerColor};">Column 1: Key Findings</h4><p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">Detailed observations, metrics, and core qualitative findings.</p></div><div style="padding: 14px 16px; background-color: ${colBg}; ${colBorder} border-radius: 8px;"><h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${headerColor};">Column 2: Recommended Next Steps</h4><p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">Action items, assigned owners, and target delivery milestones.</p></div></div><p></p>`
          )
          .run();
        showToast('2-Columns block inserted');
        break;
      }

      // Button: background uses custom color with automatic contrast text
      case 'button': {
        const btnBg = accent || '#185abd';
        const btnText = accent ? getContrastTextColor(accent) : '#ffffff';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="button" style="margin: 16px 0; display: inline-block;"><a href="#" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background-color: ${btnBg}; color: ${btnText}; font-weight: 600; font-size: 13px; text-decoration: none; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"><span>Get Started</span> <span style="font-size: 14px;">&rarr;</span></a></div><p></p>`
          )
          .run();
        showToast('Button inserted');
        break;
      }

      // FAQ with custom accent
      case 'faq': {
        const borderLeft = accent ? `border-left: 3px solid ${accent};` : '';
        const bg = bgTint || '#ffffff';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="faq" style="margin: 16px 0; border: 1px solid ${accent || '#e2e8f0'}; border-radius: 8px; overflow: hidden; background-color: ${bg};"><details style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; ${borderLeft} cursor: pointer;" open><summary style="font-weight: 600; font-size: 13px; color: #1e293b; outline: none; user-select: none;">❓ Frequently Asked Question: How do I export this report?</summary><div style="margin-top: 8px; font-size: 12px; color: #475569; line-height: 1.6;"><p style="margin: 0;">Navigate to the File menu and select Print or Save as PDF. Vector quality and layouts are preserved automatically.</p></div></details><details style="padding: 12px 16px; ${borderLeft} cursor: pointer;"><summary style="font-weight: 600; font-size: 13px; color: #1e293b; outline: none; user-select: none;">❓ Can team members collaborate in real time?</summary><div style="margin-top: 8px; font-size: 12px; color: #475569; line-height: 1.6;"><p style="margin: 0;">Yes, documents support offline caching and cloud sync with instant revision history.</p></div></details></div><p></p>`
          )
          .run();
        showToast('FAQ accordion inserted');
        break;
      }

      // Social icons with optional background
      case 'social': {
        const bg = bgTint || '#f8fafc';
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="social" style="margin: 16px 0; padding: 10px 14px; background-color: ${bg}; border: 1px solid ${accent || '#e2e8f0'}; border-radius: 8px; display: inline-flex; align-items: center; gap: 16px; font-size: 12px; color: #475569;"><a href="#" style="color: #0a66c2; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span>💼</span> LinkedIn</a><span style="color: #cbd5e1;">&bull;</span><a href="#" style="color: #24292f; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span>🐙</span> GitHub</a><span style="color: #cbd5e1;">&bull;</span><a href="#" style="color: #0284c7; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span>🌐</span> Website</a><span style="color: #cbd5e1;">&bull;</span><a href="#" style="color: #dc2626; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><span>✉️</span> Email</a></div><p></p>`
          )
          .run();
        showToast('Social icons inserted');
        break;
      }

      // Quotes: custom border & soft background tint
      case 'quote': {
        const qBorder = accent || '#64748b';
        const bg = bgTint || '#f8fafc';
        editor
          .chain()
          .focus()
          .insertContent(
            `<blockquote data-quick-block="quote" style="border-left: 4px solid ${qBorder}; padding: 12px 18px; margin: 16px 0; background-color: ${bg}; font-style: italic; color: #334155; border-radius: 0 8px 8px 0;"><p style="margin: 0; font-size: 14px; line-height: 1.6;">“Simplicity is about subtracting the obvious and adding the meaningful.”</p></blockquote><p></p>`
          )
          .run();
        showToast('Quote inserted');
        break;
      }

      // Code: custom accent border & background highlight
      case 'code': {
        const borderStyle = accent ? `border-left: 4px solid ${accent}; border: 1px solid ${accent}50;` : 'border: 1px solid #1e293b;';
        editor
          .chain()
          .focus()
          .insertContent(
            `<pre data-quick-block="code" style="background-color: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.6; margin: 16px 0; ${borderStyle} overflow-x: auto;"><code>// Example calculation block
function calculateSavings(baseline, optimized) {
  const diff = baseline - optimized;
  return ((diff / baseline) * 100).toFixed(1) + "%";
}</code></pre><p></p>`
          )
          .run();
        showToast('Code block inserted');
        break;
      }

      default:
        break;
    }
  };

  // Safe removal of active block
  const handleRemoveActiveBlock = () => {
    if (!editor) return;

    if (editor.isActive('blockquote')) {
      editor.chain().focus().toggleBlockquote().run();
      showToast('Block removed');
      return;
    }
    if (editor.isActive('codeBlock')) {
      editor.chain().focus().toggleCodeBlock().run();
      showToast('Block removed');
      return;
    }

    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let el = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode.parentElement;
      while (el && el !== editor.view.dom) {
        if (
          el.getAttribute('data-quick-block') ||
          el.tagName === 'BLOCKQUOTE' ||
          el.tagName === 'DETAILS' ||
          el.tagName === 'PRE'
        ) {
          el.remove();
          editor.commands.focus();
          showToast('Block removed');
          return;
        }
        el = el.parentElement;
      }
    }

    editor.chain().focus().deleteSelection().run();
    showToast('Selection removed');
  };

  // Smart feature: Apply active color to the currently selected block (cos it's difficult to change later)
  const handleApplyColorToCurrentBlock = () => {
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    let el = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode.parentElement;
    while (el && el !== editor.view.dom) {
      if (
        el.getAttribute('data-quick-block') ||
        el.tagName === 'BLOCKQUOTE' ||
        el.tagName === 'DETAILS' ||
        el.tagName === 'PRE'
      ) {
        const bg = hexToRgba(effectiveColor, 0.12);
        el.style.borderColor = effectiveColor;
        el.style.backgroundColor = bg;
        if (el.tagName === 'BLOCKQUOTE' || el.getAttribute('data-quick-block') === 'info' || el.getAttribute('data-quick-block') === 'warning' || el.getAttribute('data-quick-block') === 'error' || el.getAttribute('data-quick-block') === 'success' || el.getAttribute('data-quick-block') === 'note') {
          el.style.borderLeftColor = effectiveColor;
        }
        showToast('Color applied to selected block');
        return;
      }
      el = el.parentElement;
    }
    showToast('Click inside a block first to color it');
  };

  // Block definitions matching the user's recommended list in the screenshot
  const blockItems = [
    {
      id: 'info',
      title: 'Info',
      subtitle: 'Information panel',
      icon: <Info size={20} className="text-[#38bdf8]" />,
    },
    {
      id: 'warning',
      title: 'Warning',
      subtitle: 'Warning panel',
      icon: <AlertTriangle size={20} className="text-[#fbbf24]" />,
    },
    {
      id: 'error',
      title: 'Error',
      subtitle: 'Error panel',
      icon: <AlertCircle size={20} className="text-[#f87171]" />,
    },
    {
      id: 'success',
      title: 'Success',
      subtitle: 'Success panel',
      icon: <CheckCircle2 size={20} className="text-[#4ade80]" />,
    },
    {
      id: 'note',
      title: 'Note',
      subtitle: 'General note panel',
      icon: <FileText size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'checklist',
      title: 'Checklist',
      subtitle: 'Action items checklist',
      icon: <CheckSquare size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'columns',
      title: 'Columns',
      subtitle: '2-column layout block',
      icon: <Columns size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'button',
      title: 'Button',
      subtitle: 'Call-to-action button',
      icon: <MousePointerClick size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'faq',
      title: 'FAQ',
      subtitle: 'Collapsible Q&A',
      icon: <HelpCircle size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'social',
      title: 'Social icons',
      subtitle: 'Social links strip',
      icon: <Share2 size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'quote',
      title: 'Quote',
      subtitle: 'Indented blockquote',
      icon: <Quote size={20} className="text-[#94a3b8]" />,
    },
    {
      id: 'code',
      title: 'Code',
      subtitle: 'Syntax code box',
      icon: <Code size={20} className="text-[#94a3b8]" />,
    },
  ];

  // Dynamic styles for the 4 dark/light modes
  const isSepia = themeMode === 'sepia';
  const isDark = themeMode === 'fullDark' || themeMode === 'canvasDark';

  const asideBg = isDark
    ? 'bg-[#18181b] border-neutral-800 text-neutral-200'
    : isSepia
    ? 'bg-[#f5eedc] border-[#ded3be] text-[#2c231c]'
    : 'bg-white border-slate-200 text-slate-800';

  const headerBg = isDark
    ? 'bg-[#18181b] border-neutral-800 text-neutral-100'
    : isSepia
    ? 'bg-[#ece3d0] border-[#ded3be] text-[#2c231c]'
    : 'bg-white border-slate-200 text-slate-800';

  const itemHoverBg = isDark
    ? 'hover:bg-neutral-800/80'
    : isSepia
    ? 'hover:bg-[#e4d8c0]'
    : 'hover:bg-slate-100/80';

  const itemTitleColor = isDark
    ? 'text-neutral-100 group-hover:text-white'
    : isSepia
    ? 'text-[#2c231c] group-hover:text-black'
    : 'text-slate-800 group-hover:text-slate-900';

  const itemSubtitleColor = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#7c6953]'
    : 'text-slate-500';

  const bottomPanelBg = isDark
    ? 'bg-[#18181b] border-neutral-800'
    : isSepia
    ? 'bg-[#ece3d0] border-[#ded3be]'
    : 'bg-slate-50 border-slate-200';

  const hexInputBg = isDark
    ? 'bg-[#242426] border-neutral-700 text-neutral-200'
    : isSepia
    ? 'bg-[#fbf8ee] border-[#cfc2aa] text-[#2c231c]'
    : 'bg-white border-slate-300 text-slate-800';

  return (
    <aside
      id="quick-blocks-sidebar"
      className={`w-72 flex-shrink-0 border-l flex flex-col h-full z-20 select-none shadow-2xl animate-in slide-in-from-right duration-150 ${asideBg}`}
    >
      {/* Header Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${headerBg}`}>
        <div className="flex items-center space-x-2 font-semibold text-sm">
          <BrickIcon size={18} />
          <span>Quick Blocks</span>
        </div>
        <button
          onClick={onClose}
          className="opacity-70 hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Close Quick Blocks"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Blocks List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {/* Toast */}
        {notification && (
          <div className="bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-medium mb-2 animate-in fade-in">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span className="truncate">{notification}</span>
          </div>
        )}

        {/* List of Recommended Blocks */}
        {blockItems.map((item) => (
          <button
            key={item.id}
            onClick={() => insertBlock(item.id)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer group ${itemHoverBg}`}
          >
            {/* Icon */}
            <div className="shrink-0 flex items-center justify-center">
              {item.icon}
            </div>

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold leading-tight ${itemTitleColor}`}>
                {item.title}
              </div>
              <div className={`text-[11px] truncate mt-0.5 leading-tight ${itemSubtitleColor}`}>
                {item.subtitle}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Colorpicker Section (Default Deactivated) */}
      <div className={`p-3 border-t space-y-2.5 shrink-0 ${bottomPanelBg}`}>
        {/* Activation Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-medium opacity-90">
            <Palette size={13} className="opacity-70" />
            <span>Custom Color &amp; Background</span>
          </div>
          <button
            role="switch"
            aria-checked={useCustomColor}
            onClick={() => setUseCustomColor(!useCustomColor)}
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
              useCustomColor ? 'bg-amber-500' : isDark ? 'bg-neutral-700' : 'bg-slate-300'
            }`}
            title="Toggle custom color (default: deactivated)"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                useCustomColor ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Color Swatch & Hex Input (Matching screenshot) */}
        <div className={`flex items-center space-x-2 ${!useCustomColor ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Color Box */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            style={{ backgroundColor: effectiveColor }}
            className="w-8 h-8 rounded shrink-0 border border-black/20 dark:border-white/20 cursor-pointer shadow-xs hover:scale-105 transition-transform relative overflow-hidden"
            title="Choose custom block color & background tint"
          >
            <input
              ref={colorInputRef}
              type="color"
              value={effectiveColor}
              onChange={(e) => setCustomHex(e.target.value.replace('#', ''))}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </button>

          {/* Hex Display / Input */}
          <div className={`flex-1 flex items-center rounded px-2.5 py-1 text-xs font-mono border ${hexInputBg}`}>
            <span className="opacity-50 mr-1.5 select-none font-bold">#</span>
            <input
              type="text"
              value={customHex}
              maxLength={6}
              onChange={(e) => setCustomHex(e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6))}
              className="bg-transparent text-xs font-mono outline-none w-full uppercase"
              placeholder="000000"
            />
          </div>
        </div>

        {/* Palette Swatches & Quick Repaint */}
        {useCustomColor && (
          <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-1">
              {quickPalette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCustomHex(hex)}
                  style={{ backgroundColor: `#${hex}` }}
                  className={`w-5 h-5 rounded-xs border cursor-pointer transition-transform hover:scale-110 ${
                    customHex.toLowerCase() === hex.toLowerCase()
                      ? 'border-white ring-1 ring-black/40 dark:ring-white/60'
                      : 'border-black/20 dark:border-white/20'
                  }`}
                  title={`#${hex}`}
                />
              ))}
            </div>

            {/* Smart Apply to Selected Block */}
            <button
              onClick={handleApplyColorToCurrentBlock}
              className={`w-full py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center space-x-1.5 cursor-pointer border transition-colors ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                  : isSepia
                  ? 'bg-[#fbf8ee] hover:bg-[#e4d8c0] text-[#2c231c] border-[#cfc2aa]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Apply active color to block currently selected in document"
            >
              <Paintbrush size={12} className="opacity-70" />
              <span>Apply Color to Active Block</span>
            </button>
          </div>
        )}

        {/* Remove Block Action */}
        <button
          onClick={handleRemoveActiveBlock}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 font-medium py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 text-xs cursor-pointer transition-colors"
          title="Click inside any block, then remove it"
        >
          <Trash2 size={13} />
          <span>Remove active block</span>
        </button>
      </div>
    </aside>
  );
};

export default QuickBlocksSidebar;
