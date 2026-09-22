import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  X,
  Quote,
  Info,
  AlertTriangle,
  CheckCircle2,
  Code,
  Eye,
  ChevronDown,
  Layers,
  Trash2,
  Check,
} from 'lucide-react';

interface QuickBlocksSidebarProps {
  editor: Editor | null;
  onClose: () => void;
}

// 3D Isometric Brick Icon matching the header in screenshot
const BrickIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Top face */}
    <path
      d="M12 3L20 7.5L12 12L4 7.5L12 3Z"
      fill="#ea580c"
      stroke="#c2410c"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Left face */}
    <path
      d="M4 7.5L12 12V20.5L4 16V7.5Z"
      fill="#c2410c"
      stroke="#9a3412"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Right face */}
    <path
      d="M12 12L20 7.5V16L12 20.5V12Z"
      fill="#9a3412"
      stroke="#7c2d12"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Highlight sheen line on top */}
    <path
      d="M7 8L12 5.5L17 8.2"
      stroke="#f97316"
      strokeWidth="0.8"
      strokeLinecap="round"
    />
  </svg>
);

export const QuickBlocksSidebar: React.FC<QuickBlocksSidebarProps> = ({ editor, onClose }) => {
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Block definitions matching the 9 items from screenshot
  const insertBlock = (type: string) => {
    if (!editor) return;

    switch (type) {
      case 'quote':
        editor
          .chain()
          .focus()
          .insertContent(
            `<blockquote data-quick-block="quote" style="border-left: 4px solid #64748b; padding: 10px 16px; margin: 16px 0; background-color: #f8fafc; font-style: italic; color: #334155; border-radius: 0 6px 6px 0;"><p>“A great thought begins with a spark of genuine curiosity and patience.”</p></blockquote><p></p>`
          )
          .run();
        showToast('Quote inserted');
        break;

      case 'pullquote':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="pullquote" style="margin: 24px 0; padding: 18px 24px; text-align: center; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; background-color: #fafbfc;"><p style="font-size: 20px; font-family: Georgia, serif; font-style: italic; color: #1e293b; line-height: 1.6; margin: 0;">“Simplicity is about subtracting the obvious and adding the meaningful.”</p><p style="margin-top: 8px; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase;">— John Maeda, The Laws of Simplicity</p></div><p></p>`
          )
          .run();
        showToast('Pull Quote inserted');
        break;

      case 'info':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="info" style="margin: 16px 0; padding: 14px 18px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; color: #1e3a8a;"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; display: flex; items-center;">ℹ️ Info Note</div><p style="margin: 0; font-size: 13px; color: #1d4ed8; line-height: 1.5;">This section highlights helpful context, background guidelines, or reference material for the reader.</p></div><p></p>`
          )
          .run();
        showToast('Info Box inserted');
        break;

      case 'warning':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="warning" style="margin: 16px 0; padding: 14px 18px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; color: #78350f;"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">⚠️ Caution &amp; Warning</div><p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">Review prerequisites and ensure careful validation before proceeding with this operation.</p></div><p></p>`
          )
          .run();
        showToast('Warning inserted');
        break;

      case 'success':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="success" style="margin: 16px 0; padding: 14px 18px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; color: #064e3b;"><div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">✅ Success Confirmed</div><p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">The system verification completed with zero errors and all requirements are satisfied.</p></div><p></p>`
          )
          .run();
        showToast('Success Callout inserted');
        break;

      case 'code':
        editor
          .chain()
          .focus()
          .insertContent(
            `<pre data-quick-block="code" style="background-color: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.6; margin: 16px 0; border: 1px solid #1e293b; overflow-x: auto;"><code>// Example calculation block
function calculateSavings(baseline, optimized) {
  const diff = baseline - optimized;
  return ((diff / baseline) * 100).toFixed(1) + "%";
}</code></pre><p></p>`
          )
          .run();
        showToast('Code Block inserted');
        break;

      case 'spoiler':
        editor
          .chain()
          .focus()
          .insertContent(
            `<details data-quick-block="spoiler" style="margin: 16px 0; padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;"><summary style="font-weight: 600; color: #1e293b; outline: none; user-select: none;">👁 Click to reveal hidden content / spoiler</summary><div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #cbd5e1; color: #475569; font-size: 13px;"><p style="margin: 0;">This sensitive or supplementary content remains hidden until clicked by the reader.</p></div></details><p></p>`
          )
          .run();
        showToast('Spoiler inserted');
        break;

      case 'accordion':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="accordion" style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;"><details style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;" open><summary style="font-weight: 600; color: #1e293b; outline: none; user-select: none;">Section 1: General Overview &amp; Specifications</summary><div style="margin-top: 8px; color: #475569; font-size: 13px;"><p style="margin: 0;">Comprehensive breakdown of requirements, targets, and initial specifications.</p></div></details><details style="padding: 12px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;"><summary style="font-weight: 600; color: #1e293b; outline: none; user-select: none;">Section 2: Implementation &amp; Deliverables</summary><div style="margin-top: 8px; color: #475569; font-size: 13px;"><p style="margin: 0;">Step-by-step rollout procedures, milestone timelines, and stakeholder sign-off.</p></div></details></div><p></p>`
          )
          .run();
        showToast('Accordion inserted');
        break;

      case 'tabs':
        editor
          .chain()
          .focus()
          .insertContent(
            `<div data-quick-block="tabs" style="margin: 18px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"><div style="display: flex; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;"><span style="padding: 10px 16px; border-bottom: 2px solid #185abd; color: #185abd; background-color: #ffffff;">Tab 1: Overview</span><span style="padding: 10px 16px; color: #64748b;">Tab 2: Metrics</span><span style="padding: 10px 16px; color: #64748b;">Tab 3: Settings</span></div><div style="padding: 16px; background-color: #ffffff; font-size: 13px; color: #334155;"><p style="margin: 0;">Primary tab body content. Provides an organized multi-perspective layout for documents.</p></div></div><p></p>`
          )
          .run();
        showToast('Tabs inserted');
        break;

      default:
        break;
    }
  };

  // Remove active block action
  const handleRemoveActiveBlock = () => {
    if (!editor) return;

    // 1. Check if inside blockquote or codeBlock
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

    // 2. DOM-level removal of enclosing quick-block container
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

    // 3. Fallback: delete current selection or line
    editor.chain().focus().deleteSelection().run();
    showToast('Selection removed');
  };

  const blocksList = [
    {
      id: 'quote',
      title: 'Quote',
      desc: 'Indented italic blockquote',
      icon: <Quote size={18} className="text-slate-700" />,
    },
    {
      id: 'pullquote',
      title: 'Pull Quote',
      desc: 'Large centered headline quote',
      icon: <Quote size={18} className="text-slate-700" />,
    },
    {
      id: 'info',
      title: 'Info Box',
      desc: 'Blue informational callout',
      icon: <Info size={18} className="text-slate-700" />,
    },
    {
      id: 'warning',
      title: 'Warning',
      desc: 'Orange caution callout',
      icon: <AlertTriangle size={18} className="text-slate-700" />,
    },
    {
      id: 'success',
      title: 'Success',
      desc: 'Green success callout',
      icon: <CheckCircle2 size={18} className="text-slate-700" />,
    },
    {
      id: 'code',
      title: 'Code',
      desc: 'Dark syntax code block',
      icon: <Code size={18} className="text-slate-700" />,
    },
    {
      id: 'spoiler',
      title: 'Spoiler',
      desc: 'Collapsible hidden content',
      icon: <Eye size={18} className="text-slate-700" />,
    },
    {
      id: 'accordion',
      title: 'Accordion',
      desc: 'Stacked collapsible sections',
      icon: <ChevronDown size={18} className="text-slate-700" />,
    },
    {
      id: 'tabs',
      title: 'Tabs',
      desc: 'Static tabbed layout',
      icon: <Layers size={18} className="text-slate-700" />,
    },
  ];

  return (
    <aside
      id="quick-blocks-sidebar"
      className="w-84 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full z-20 select-none shadow-xl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-base">
          <BrickIcon size={22} />
          <span>Quick Blocks</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close Quick Blocks"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-lg flex items-center space-x-2 text-xs font-medium animate-in fade-in">
            <Check size={14} className="text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* Section Heading */}
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          INSERT BLOCK
        </div>

        {/* Block Cards List */}
        <div className="space-y-2.5">
          {blocksList.map((item) => (
            <button
              key={item.id}
              onClick={() => insertBlock(item.id)}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 rounded-xl p-3 flex items-center space-x-3 text-left transition-all cursor-pointer group shadow-2xs"
            >
              {/* Icon Container */}
              <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-slate-200/70 flex items-center justify-center flex-shrink-0 transition-colors">
                {item.icon}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                  {item.title}
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2">
        <button
          onClick={handleRemoveActiveBlock}
          className="w-full bg-[#f43f5e] hover:bg-[#e11d48] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-xs cursor-pointer transition-colors"
        >
          <Trash2 size={16} />
          <span>Remove Block (active)</span>
        </button>
        <p className="text-[11px] text-slate-500 text-center font-normal">
          Click inside any block, then remove it.
        </p>
      </div>
    </aside>
  );
};
