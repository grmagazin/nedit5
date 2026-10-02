import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import {
  Clipboard,
  Scissors,
  Copy,
  ClipboardPaste,
  Paintbrush,
  Sparkles,
  Type,
  Square,
  Highlighter,
  Tag,
  Box,
  Gem,
  X,
  Check,
  RotateCcw,
  Sliders,
  CaseSensitive,
  SlidersHorizontal,
  Eraser,
  Wand2,
} from 'lucide-react';
import { ThemeMode } from '../types';
import {
  CopiedWordFormat,
  copyFormatFromEditor,
  applyFormatToEditor,
  describeFormat,
} from '../utils/formatPainter';

interface FormatterSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  formatPainter?: CopiedWordFormat | null;
  onToggleFormatPainter?: (mode?: 'single' | 'persistent') => void;
  onClearFormatPainter?: () => void;
  onApplyFormatPainter?: () => void;
  themeMode?: ThemeMode;
}

export const FormatterSidebar: React.FC<FormatterSidebarProps> = ({
  editor,
  onClose,
  formatPainter: propFormatPainter,
  onToggleFormatPainter,
  onClearFormatPainter,
  onApplyFormatPainter,
  themeMode = 'light',
}) => {
  // 4 Theme Modes Analysis
  const isSepia = themeMode === 'sepia';
  const isFullDark = themeMode === 'fullDark';
  const isCanvasDark = themeMode === 'canvasDark';
  const isDark = isFullDark || isCanvasDark;
  const isLight = !isDark && !isSepia;

  // Local fallback state if formatPainter is not passed from props
  const [localFormatPainter, setLocalFormatPainter] = useState<CopiedWordFormat | null>(null);
  const activeFormatPainter = propFormatPainter !== undefined ? propFormatPainter : localFormatPainter;

  // Custom text shadow state
  const [showCustomShadow, setShowCustomShadow] = useState(false);
  const [shadowColor, setShadowColor] = useState(isDark ? '#38bdf8' : '#000000');
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowX, setShadowX] = useState(2);
  const [shadowY, setShadowY] = useState(2);

  // Outline color state
  const [outlineColor, setOutlineColor] = useState<string>(isDark ? '#60a5fa' : isSepia ? '#7c4a1e' : '#185abd');
  const [outlineWidth, setOutlineWidth] = useState<number>(1.5);

  // Toast / Pill notification
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'amber' | 'emerald' | 'blue' | 'indigo' | 'neutral';
  } | null>(null);

  const notify = (msg: string, type: 'amber' | 'emerald' | 'blue' | 'indigo' | 'neutral' = 'neutral') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  };

  // 1. CLIPBOARD ACTIONS (Aligned with Home buttons philosophy)
  const handleCut = async () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      const text = editor.state.selection.$from.parent.textContent;
      if (text) {
        await navigator.clipboard.writeText(text);
        editor.chain().focus().deleteCurrentNode().run();
        notify('Transferred paragraph to clipboard', 'amber');
      } else {
        notify('Select text or place cursor in paragraph to cut', 'amber');
      }
      return;
    }

    const text = editor.state.doc.textBetween(from, to, '\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        document.execCommand('cut');
      }
      editor.chain().focus().deleteSelection().run();
      notify('Transferred to clipboard', 'amber');
    } catch {
      document.execCommand('cut');
      notify('Transferred to clipboard', 'amber');
    }
  };

  const handleCopy = async (format: 'all' | 'text' | 'html' | 'code' = 'all') => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    let text = '';
    if (!empty) {
      text = editor.state.doc.textBetween(from, to, '\n');
    } else {
      text = editor.state.selection.$from.parent.textContent;
    }

    if (!text) {
      notify('Select text to copy', 'neutral');
      return;
    }

    try {
      if (format === 'code') {
        await navigator.clipboard.writeText(`\`\`\`\n${text}\n\`\`\``);
        notify('Copied as Code Block', 'emerald');
      } else if (format === 'html') {
        const slice = editor.state.doc.slice(from, to);
        const tempDiv = document.createElement('div');
        tempDiv.innerText = text;
        await navigator.clipboard.writeText(tempDiv.innerHTML);
        notify('Copied as HTML snippet', 'emerald');
      } else {
        await navigator.clipboard.writeText(text);
        notify('Selected area Copied', 'emerald');
      }
    } catch {
      document.execCommand('copy');
      notify('Selected area Copied', 'emerald');
    }
  };

  const handlePaste = async (format: 'default' | 'plain' | 'code' = 'default') => {
    if (!editor) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (format === 'code') {
            editor.chain().focus().insertContent(`<pre><code>${text}</code></pre>`).run();
            notify('Pasted as Code Block', 'blue');
          } else if (format === 'plain') {
            editor.chain().focus().insertContent(text).run();
            notify('Pasted as Plain Text', 'blue');
          } else {
            editor.commands.insertContent(text);
            notify('Pasted from clipboard', 'blue');
          }
          return;
        }
      }
      notify('Use CTRL + V to paste directly', 'blue');
    } catch {
      notify('Use CTRL + V to paste directly', 'blue');
    }
  };

  // 2. FORMAT PAINTER ACTIONS (Home buttons philosophy)
  const handleCopyPainter = (mode: 'single' | 'persistent' = 'single') => {
    if (!editor) return;
    if (onToggleFormatPainter) {
      onToggleFormatPainter(mode);
    } else {
      const format = copyFormatFromEditor(editor, mode);
      if (format) {
        setLocalFormatPainter(format);
      }
    }
    notify(`Format copied in memory (${mode === 'single' ? '1 use' : 'persistent'})`, 'indigo');
  };

  const handlePastePainter = () => {
    if (!editor) return;
    if (!activeFormatPainter) {
      notify('No format copied yet. Click Copy Format first.', 'neutral');
      return;
    }
    if (onApplyFormatPainter) {
      onApplyFormatPainter();
    } else {
      applyFormatToEditor(editor, activeFormatPainter);
      if (activeFormatPainter.mode === 'single') {
        setLocalFormatPainter(null);
      }
    }
    notify(`Format applied: ${describeFormat(activeFormatPainter)}`, 'indigo');
  };

  const handleClearPainter = () => {
    if (onClearFormatPainter) {
      onClearFormatPainter();
    } else {
      setLocalFormatPainter(null);
    }
    notify('Format painter memory cleared', 'neutral');
  };

  // 3. TEXT SHADOWS (Simple CSS & Tiptap Mark)
  const handleApplyTextShadow = (shadowStyle: string | null) => {
    if (!editor) return;
    if (!shadowStyle) {
      (editor.chain().focus() as any).unsetTextShadow().run();
      notify('Text shadow removed', 'neutral');
      return;
    }

    const { empty } = editor.state.selection;
    if (empty) {
      notify('Select text to apply shadow', 'neutral');
      return;
    }

    (editor.chain().focus() as any).setTextShadow(shadowStyle).run();
    notify('Text shadow applied', 'emerald');
  };

  const handleApplyCustomShadow = () => {
    const css = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;
    handleApplyTextShadow(css);
  };

  // 4. MARKER HIGHLIGHT (Realistic bottom-half linear gradient)
  const handleMarkerHighlight = (color: string) => {
    if (!editor) return;
    const { empty } = editor.state.selection;
    if (empty) {
      notify('Select text to apply marker highlight', 'neutral');
      return;
    }

    const gradient = `linear-gradient(180deg, transparent 42%, ${color} 42%)`;
    (editor.chain().focus() as any).setMarkerHighlight(gradient).run();
    notify('Marker highlight applied', 'emerald');
  };

  const handleRemoveMarkerHighlight = () => {
    if (!editor) return;
    (editor.chain().focus() as any).unsetMarkerHighlight().run();
    editor.chain().focus().unsetHighlight().run();
    notify('Highlight / Marker removed', 'neutral');
  };

  const handleSolidHighlight = (color: string) => {
    if (!editor) return;
    const { empty } = editor.state.selection;
    if (empty) {
      notify('Select text to highlight', 'neutral');
      return;
    }
    editor.chain().focus().setHighlight({ color }).run();
    notify('Solid highlight applied', 'emerald');
  };

  // 5. TEXT OUTLINE (Webkit Text Stroke)
  const handleApplyOutline = () => {
    if (!editor) return;
    const { empty } = editor.state.selection;
    if (empty) {
      notify('Select heading or text first', 'neutral');
      return;
    }
    const stroke = `${outlineWidth}px ${outlineColor}`;
    (editor.chain().focus() as any).setTextOutline(stroke).run();
    notify('Text outline applied', 'emerald');
  };

  const handleRemoveOutline = () => {
    if (!editor) return;
    (editor.chain().focus() as any).unsetTextOutline().run();
    notify('Text outline removed', 'neutral');
  };

  // 6. BADGE STYLE
  const handleApplyBadge = (bgColor: string, textColor: string) => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      notify('Select text to turn into a badge', 'neutral');
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const badgeHtml = `<span style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; line-height: 1.4; margin: 0 2px;">${selectedText}</span>`;
    editor.chain().focus().insertContent(badgeHtml).run();
    notify('Badge style applied', 'emerald');
  };

  // 7. PARAGRAPH BOX (Card, Note, Info, Success, Warning, Ribbon, Quote, Draft)
  const handleParagraphBox = (
    type: 'card' | 'note' | 'info' | 'success' | 'warning' | 'ribbon' | 'quote' | 'draft'
  ) => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const selectedText = !empty
      ? editor.state.doc.textBetween(from, to, '\n')
      : editor.state.selection.$from.parent.textContent || 'Callout text here...';

    let boxHtml = '';
    switch (type) {
      case 'card':
        boxHtml = `<div style="background-color: ${isDark ? '#262629' : '#f8fafc'}; border: 1px solid ${isDark ? '#3f3f46' : '#e2e8f0'}; border-radius: 8px; padding: 14px 18px; margin: 12px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06);"><p>${selectedText}</p></div>`;
        break;
      case 'note':
        boxHtml = `<div style="background-color: ${isDark ? '#2a2512' : '#fefce8'}; border-left: 4px solid #eab308; border-radius: 4px; padding: 12px 16px; margin: 12px 0;"><p style="color: ${isDark ? '#fde047' : '#713f12'}; font-weight: 500;"><strong>Note:</strong> ${selectedText}</p></div>`;
        break;
      case 'info':
        boxHtml = `<div style="background-color: ${isDark ? '#14253d' : '#eff6ff'}; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 12px 16px; margin: 12px 0;"><p style="color: ${isDark ? '#93c5fd' : '#1e3a8a'}; font-weight: 500;"><strong>Info:</strong> ${selectedText}</p></div>`;
        break;
      case 'success':
        boxHtml = `<div style="background-color: ${isDark ? '#13281c' : '#f0fdf4'}; border-left: 4px solid #22c55e; border-radius: 4px; padding: 12px 16px; margin: 12px 0;"><p style="color: ${isDark ? '#86efac' : '#14532d'}; font-weight: 500;"><strong>Success:</strong> ${selectedText}</p></div>`;
        break;
      case 'warning':
        boxHtml = `<div style="background-color: ${isDark ? '#2b151a' : '#fff1f2'}; border-left: 4px solid #f43f5e; border-radius: 4px; padding: 12px 16px; margin: 12px 0;"><p style="color: ${isDark ? '#fda4af' : '#881337'}; font-weight: 500;"><strong>Warning:</strong> ${selectedText}</p></div>`;
        break;
      case 'ribbon':
        boxHtml = `<div style="background: linear-gradient(90deg, #185abd 0%, #2563eb 100%); color: white; padding: 10px 16px; border-radius: 6px; margin: 12px 0; font-weight: 600;"><p>${selectedText}</p></div>`;
        break;
      case 'quote':
        boxHtml = `<blockquote style="background-color: ${isDark ? '#20242c' : '#f1f5f9'}; border-left: 3px solid #64748b; font-style: italic; padding: 10px 16px; margin: 12px 0; color: ${isDark ? '#cbd5e1' : '#334155'};"><p>"${selectedText}"</p></blockquote>`;
        break;
      case 'draft':
        boxHtml = `<div style="border: 2px dashed ${isDark ? '#52525b' : '#94a3b8'}; background-color: ${isDark ? '#18181b' : '#fafafa'}; border-radius: 6px; padding: 12px 16px; margin: 12px 0;"><p style="color: ${isDark ? '#a1a1aa' : '#475569'};">${selectedText}</p></div>`;
        break;
    }

    editor.chain().focus().insertContent(boxHtml).run();
    notify(`${type.charAt(0).toUpperCase() + type.slice(1)} box inserted`, 'emerald');
  };

  const handleClearBlockStyle = () => {
    if (!editor) return;
    editor.chain().focus().clearNodes().setParagraph().run();
    notify('Paragraph box styling cleared', 'neutral');
  };

  // 8. TOOLS ("TOOS")
  const handleClearAllFormatting = () => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().setParagraph().run();
    (editor.chain().focus() as any).unsetTextShadow().unsetMarkerHighlight().unsetTextOutline().run();
    notify('All formatting cleared completely', 'neutral');
  };

  const handleTransformCase = (type: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      notify('Select text to transform case', 'neutral');
      return;
    }
    const text = editor.state.doc.textBetween(from, to, ' ');
    let transformed = text;
    if (type === 'upper') {
      transformed = text.toUpperCase();
    } else if (type === 'lower') {
      transformed = text.toLowerCase();
    } else if (type === 'title') {
      transformed = text.replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (type === 'sentence') {
      transformed = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    }
    editor.chain().focus().insertContent(transformed).run();
    notify(`Transformed to ${type.toUpperCase()}`, 'emerald');
  };

  const handleCopyAsStyle = async () => {
    if (!editor) return;
    const attrs = editor.getAttributes('textStyle') || {};
    const parts: string[] = [];
    if (attrs.color) parts.push(`color: ${attrs.color};`);
    if (attrs.fontSize) parts.push(`font-size: ${attrs.fontSize};`);
    if (attrs.fontFamily) parts.push(`font-family: ${attrs.fontFamily};`);
    if (attrs.textShadow) parts.push(`text-shadow: ${attrs.textShadow};`);
    if (attrs.letterSpacing) parts.push(`letter-spacing: ${attrs.letterSpacing};`);
    if (editor.isActive('bold')) parts.push('font-weight: bold;');
    if (editor.isActive('italic')) parts.push('font-style: italic;');
    if (editor.isActive('underline')) parts.push('text-decoration: underline;');

    const snippet = parts.length > 0 ? parts.join(' ') : 'font-size: 14px; color: #333333;';
    await navigator.clipboard.writeText(snippet);
    notify('Computed CSS Style copied to clipboard!', 'emerald');
  };

  // Selection Metrics
  const selectionMetrics = useMemo(() => {
    if (!editor) return { words: 0, chars: 0 };
    const { from, to, empty } = editor.state.selection;
    if (empty) return { words: 0, chars: 0 };
    const text = editor.state.doc.textBetween(from, to, ' ').trim();
    return {
      chars: text.length,
      words: text ? text.split(/\s+/).length : 0,
    };
  }, [editor?.state.selection]);

  // Dynamic Class Tokens for 4 Theme Modes
  const asideClasses = isFullDark
    ? 'bg-[#18181b] border-neutral-800 text-neutral-200'
    : isCanvasDark
    ? 'bg-[#1e293b] border-[#334155] text-[#f1f5f9]'
    : isSepia
    ? 'bg-[#fbf7ee] border-[#ded3be] text-[#2c231c]'
    : 'bg-white border-neutral-200 text-neutral-800';

  const headerBgClasses = isFullDark
    ? 'bg-[#202024]/90 border-b border-[#2e2e32]'
    : isCanvasDark
    ? 'bg-[#0f172a]/90 border-b border-[#334155]'
    : isSepia
    ? 'bg-[#f4ebd9]/90 border-b border-[#ded3be]'
    : 'bg-neutral-50/90 border-b border-neutral-200';

  const headerTitleColor = isFullDark
    ? 'text-[#60a5fa]'
    : isCanvasDark
    ? 'text-[#38bdf8]'
    : isSepia
    ? 'text-[#7c4a1e]'
    : 'text-[#185abd]';

  const badgeBg = isFullDark
    ? 'bg-[#2563eb] text-white'
    : isCanvasDark
    ? 'bg-[#0284c7] text-white'
    : isSepia
    ? 'bg-[#7c4a1e] text-[#fbf7ee]'
    : 'bg-[#185abd] text-white';

  const dividerClasses = isFullDark
    ? 'divide-[#27272a]'
    : isCanvasDark
    ? 'divide-[#334155]'
    : isSepia
    ? 'divide-[#ded3be]'
    : 'divide-neutral-100';

  const sectionHeaderColor = isFullDark
    ? 'text-neutral-400'
    : isCanvasDark
    ? 'text-[#94a3b8]'
    : isSepia
    ? 'text-[#8c6b4f]'
    : 'text-neutral-500';

  const subpanelBg = isFullDark
    ? 'bg-[#242427] border-[#38383c]'
    : isCanvasDark
    ? 'bg-[#0f172a]/70 border-[#334155]'
    : isSepia
    ? 'bg-[#f4ebd9] border-[#ded3be]'
    : 'bg-neutral-50 border-neutral-200';

  const chipBtnClasses = isFullDark
    ? 'bg-[#27272a] hover:bg-[#38383c] text-neutral-200 border-[#3f3f46]'
    : isCanvasDark
    ? 'bg-[#334155] hover:bg-[#475569] text-[#f1f5f9] border-[#475569]'
    : isSepia
    ? 'bg-[#ece3d0] hover:bg-[#ded3be] text-[#3f2e22] border-[#ded3be]'
    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200';

  const shadowPreviewTextColor = isDark
    ? 'text-white'
    : isSepia
    ? 'text-[#3f2e22]'
    : 'text-neutral-900';

  return (
    <aside
      className={`w-76 sm:w-84 flex-shrink-0 border-l shadow-2xl flex flex-col h-full overflow-y-auto select-none z-20 transition-colors ${asideClasses}`}
      style={{ minWidth: '315px' }}
      aria-label="Ultimate Formatter Right Toolbar"
    >
      {/* Toast Feedback Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-8 z-50 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
            notification.type === 'amber'
              ? 'bg-amber-600'
              : notification.type === 'emerald'
              ? 'bg-emerald-600'
              : notification.type === 'blue'
              ? 'bg-[#0078d4]'
              : notification.type === 'indigo'
              ? 'bg-indigo-600'
              : 'bg-neutral-800'
          }`}
        >
          {notification.type === 'amber' && <Scissors size={13} className="shrink-0" />}
          {notification.type === 'emerald' && <Check size={13} className="shrink-0 stroke-[3]" />}
          {notification.type === 'blue' && <ClipboardPaste size={13} className="shrink-0" />}
          {notification.type === 'indigo' && <Sparkles size={13} className="shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 backdrop-blur-xs sticky top-0 z-10 transition-colors ${headerBgClasses}`}>
        <div className="flex items-center space-x-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs ${badgeBg}`}>
            <Wand2 size={15} />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className={`text-sm font-bold tracking-tight leading-none ${headerTitleColor}`}>
                Ultimate Formatter
              </h2>
            </div>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
              Advanced Text Effects & Styling Suite
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            isDark
              ? 'text-neutral-400 hover:text-white hover:bg-white/10'
              : isSepia
              ? 'text-[#8c6b4f] hover:text-[#2c231c] hover:bg-[#ece3d0]'
              : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60'
          }`}
          title="Close Ultimate Formatter (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      <div className={`p-3.5 space-y-5 text-xs divide-y transition-colors ${dividerClasses}`}>
        {/* 1. CLIPBOARD (Home Buttons Philosophy: Cut, Copy, Paste) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <div className={`flex items-center space-x-1.5 ${sectionHeaderColor}`}>
              <Clipboard size={13} className={headerTitleColor} />
              <span>Clipboard</span>
            </div>
            {selectionMetrics.chars > 0 && (
              <span className="text-[10px] font-normal text-neutral-400 capitalize lowercase">
                {selectionMetrics.words} words ({selectionMetrics.chars} chars)
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Cut */}
            <button
              onClick={handleCut}
              title="Cut (Ctrl+X) — Transferred to clipboard"
              className={`py-2 px-2 rounded-lg font-semibold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                isDark
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 border-amber-800/60'
                  : isSepia
                  ? 'bg-[#f7eed9] hover:bg-[#f0e3c5] text-amber-900 border-[#ded3be]'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <Scissors size={15} className="text-amber-600 mb-0.5" />
              <span className="text-[11px]">Cut</span>
            </button>

            {/* Copy */}
            <button
              onClick={() => handleCopy('all')}
              title="Copy (Ctrl+C) — Selected area Copied"
              className={`py-2 px-2 rounded-lg font-semibold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                isDark
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 border-emerald-800/60'
                  : isSepia
                  ? 'bg-[#eaf4ea] hover:bg-[#dbeede] text-emerald-900 border-[#ded3be]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <Copy size={15} className="text-emerald-600 mb-0.5" />
              <span className="text-[11px]">Copy</span>
            </button>

            {/* Paste */}
            <button
              onClick={() => handlePaste('default')}
              title="Paste (Ctrl+V) — Insert from clipboard"
              className={`py-2 px-2 rounded-lg font-semibold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                isDark
                  ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-200 border-blue-800/60'
                  : isSepia
                  ? 'bg-[#e9eff7] hover:bg-[#d8e4f2] text-blue-950 border-[#ded3be]'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
              }`}
            >
              <ClipboardPaste size={15} className="text-[#0078d4] mb-0.5" />
              <span className="text-[11px]">Paste</span>
            </button>
          </div>

          {/* Quick Sub-actions */}
          <div className="flex items-center gap-1 pt-0.5 text-[10px]">
            <span className="text-neutral-400 font-medium">As:</span>
            <button
              onClick={() => handleCopy('text')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${chipBtnClasses}`}
              title="Copy as clean Plain Text"
            >
              Plain Text
            </button>
            <button
              onClick={() => handleCopy('html')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${chipBtnClasses}`}
              title="Copy as HTML snippet"
            >
              HTML
            </button>
            <button
              onClick={() => handleCopy('code')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors border ${chipBtnClasses}`}
              title="Copy wrapped in Code Block"
            >
              Code Block
            </button>
          </div>
        </div>

        {/* 2. FORMAT PAINTER (Home Philosophy: Memory-based, 1-use & persistent, Paste Format) */}
        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <div className={`flex items-center space-x-1.5 ${sectionHeaderColor}`}>
              <Paintbrush size={13} className="text-amber-600" />
              <span>Format Painter</span>
            </div>
            {activeFormatPainter && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-500 animate-pulse">
                {activeFormatPainter.mode === 'single' ? '1 Use' : 'Persistent'}
              </span>
            )}
          </div>

          {/* Active format status banner if copied */}
          {activeFormatPainter && (
            <div className={`p-2 rounded-lg border text-[11px] flex items-center justify-between transition-colors ${
              isDark
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : isSepia
                ? 'bg-[#f4ebd9] border-[#ded3be] text-[#7c4a1e]'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="truncate mr-1 font-medium">
                <span className="font-bold">Memory: </span>
                <span>{describeFormat(activeFormatPainter)}</span>
              </div>
              <button
                onClick={handleClearPainter}
                className="text-amber-500 hover:text-red-500 text-[10px] font-bold underline cursor-pointer shrink-0 ml-1"
              >
                Clear
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            {/* Copy Format (1-use) */}
            <button
              onClick={() => handleCopyPainter('single')}
              title="Copy formatting from active text (1 use)"
              className={`py-1.5 px-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 shadow-2xs transition-all cursor-pointer ${
                isSepia
                  ? 'bg-[#7c4a1e] hover:bg-[#633a17]'
                  : isDark
                  ? 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                  : 'bg-[#185abd] hover:bg-[#12458a]'
              }`}
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>

            {/* Persistent Multi-use */}
            <button
              onClick={() => handleCopyPainter('persistent')}
              title="Copy format for continuous multi-painting across sections"
              className={`py-1.5 px-2 border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                isDark
                  ? 'bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/60'
                  : isSepia
                  ? 'bg-[#efe4cf] hover:bg-[#e4d7be] text-[#7c4a1e] border-[#ded3be]'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Multi-Use</span>
            </button>

            {/* Paste Format */}
            <button
              onClick={handlePastePainter}
              disabled={!activeFormatPainter}
              title="Apply copied format directly to selection"
              className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 shadow-2xs transition-all cursor-pointer"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>Paste</span>
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight">
            Copies character & paragraph formatting strictly in memory without overwriting your OS clipboard.
          </p>
        </div>

        {/* 3. TEXT SHADOWS (Simple CSS presets & Custom Slider builder) */}
        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <div className={`flex items-center space-x-1.5 ${sectionHeaderColor}`}>
              <Type size={13} className={headerTitleColor} />
              <span>Text Shadows (CSS)</span>
            </div>
            <button
              onClick={() => setShowCustomShadow(!showCustomShadow)}
              className={`flex items-center space-x-1 text-[10px] font-semibold cursor-pointer transition-colors ${
                isDark ? 'text-neutral-400 hover:text-white' : isSepia ? 'text-[#8c6b4f] hover:text-[#2c231c]' : 'text-neutral-500 hover:text-[#185abd]'
              }`}
              title="Toggle Custom CSS Shadow Builder"
            >
              <SlidersHorizontal size={11} />
              <span>{showCustomShadow ? 'Presets' : 'Custom'}</span>
            </button>
          </div>

          {!showCustomShadow ? (
            <div className="grid grid-cols-4 gap-1.5">
              {/* None */}
              <button
                onClick={() => handleApplyTextShadow(null)}
                className={`py-1.5 px-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer text-center ${chipBtnClasses}`}
                title="Remove text shadow"
              >
                None
              </button>

              {/* Soft */}
              <button
                onClick={() =>
                  handleApplyTextShadow(
                    isDark ? '1px 1px 3px rgba(0,0,0,0.85)' : '1px 1px 2px rgba(0,0,0,0.25)'
                  )
                }
                className={`py-1.5 px-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer text-center ${chipBtnClasses} ${shadowPreviewTextColor}`}
                style={{
                  textShadow: isDark ? '1px 1px 3px rgba(0,0,0,0.9)' : '1px 1px 2px rgba(0,0,0,0.3)',
                }}
                title="Soft Depth Shadow"
              >
                Soft
              </button>

              {/* Medium */}
              <button
                onClick={() =>
                  handleApplyTextShadow(
                    isDark ? '2px 2px 4px rgba(0,0,0,0.95)' : '2px 2px 4px rgba(0,0,0,0.45)'
                  )
                }
                className={`py-1.5 px-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer text-center ${chipBtnClasses} ${shadowPreviewTextColor}`}
                style={{
                  textShadow: isDark ? '2px 2px 4px rgba(0,0,0,0.95)' : '2px 2px 4px rgba(0,0,0,0.45)',
                }}
                title="Medium Drop Shadow"
              >
                Medium
              </button>

              {/* Strong */}
              <button
                onClick={() =>
                  handleApplyTextShadow(
                    isDark ? '3px 3px 6px #000000' : '3px 3px 6px rgba(0,0,0,0.7)'
                  )
                }
                className={`py-1.5 px-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer text-center ${chipBtnClasses} ${shadowPreviewTextColor}`}
                style={{
                  textShadow: isDark ? '3px 3px 6px #000000' : '3px 3px 6px rgba(0,0,0,0.7)',
                }}
                title="Strong Contrast Shadow"
              >
                Strong
              </button>

              {/* Blue Glow */}
              <button
                onClick={() => handleApplyTextShadow('0 0 8px rgba(56,189,248,0.8)')}
                className="py-1.5 px-1 rounded-md border border-blue-400/50 bg-blue-500/10 text-[11px] font-bold text-sky-400 transition-colors cursor-pointer text-center"
                style={{ textShadow: '0 0 8px rgba(56,189,248,0.8)' }}
                title="Neon Sky Glow"
              >
                Blue Glow
              </button>

              {/* Warm Glow */}
              <button
                onClick={() => handleApplyTextShadow('0 0 8px rgba(251,146,60,0.8)')}
                className="py-1.5 px-1 rounded-md border border-amber-400/50 bg-amber-500/10 text-[11px] font-bold text-amber-500 transition-colors cursor-pointer text-center"
                style={{ textShadow: '0 0 8px rgba(251,146,60,0.8)' }}
                title="Warm Amber Glow"
              >
                Warm Glow
              </button>

              {/* Retro Pop */}
              <button
                onClick={() =>
                  handleApplyTextShadow(
                    isDark ? '2px 2px 0px #38bdf8' : '2px 2px 0px #000000'
                  )
                }
                className={`py-1.5 px-1 rounded-md border text-[11px] font-black transition-colors cursor-pointer text-center ${chipBtnClasses} ${shadowPreviewTextColor}`}
                style={{
                  textShadow: isDark ? '2px 2px 0px #38bdf8' : '2px 2px 0px rgba(0,0,0,0.85)',
                }}
                title="Retro Pop Hard Shadow"
              >
                Retro Pop
              </button>

              {/* Letterpress */}
              <button
                onClick={() =>
                  handleApplyTextShadow(
                    isDark
                      ? '0px 1px 2px rgba(0,0,0,0.9), 0px -1px 1px rgba(255,255,255,0.2)'
                      : '0px 1px 1px rgba(255,255,255,0.8), 0px -1px 1px rgba(0,0,0,0.3)'
                  )
                }
                className={`py-1.5 px-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer text-center ${chipBtnClasses} ${shadowPreviewTextColor}`}
                style={{
                  textShadow: isDark
                    ? '0px 1px 2px rgba(0,0,0,0.9)'
                    : '0px 1px 1px rgba(255,255,255,0.8), 0px -1px 1px rgba(0,0,0,0.3)',
                }}
                title="Letterpress Inset Effect"
              >
                Letterpress
              </button>
            </div>
          ) : (
            /* Custom CSS Shadow Builder */
            <div className={`p-2.5 rounded-xl border space-y-2 transition-colors ${subpanelBg}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-neutral-400">Shadow Color</span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="color"
                    value={shadowColor}
                    onChange={(e) => setShadowColor(e.target.value)}
                    className="w-6 h-6 rounded border border-neutral-400/40 cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-neutral-400">{shadowColor}</span>
                </div>
              </div>

              {/* Blur Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Blur Radius</span>
                  <span className="font-mono">{shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={shadowBlur}
                  onChange={(e) => setShadowBlur(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg cursor-pointer accent-[#185abd]"
                />
              </div>

              {/* Offset X & Y */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Offset X</span>
                    <span className="font-mono">{shadowX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    value={shadowX}
                    onChange={(e) => setShadowX(Number(e.target.value))}
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg cursor-pointer accent-[#185abd]"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Offset Y</span>
                    <span className="font-mono">{shadowY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    value={shadowY}
                    onChange={(e) => setShadowY(Number(e.target.value))}
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 rounded-lg cursor-pointer accent-[#185abd]"
                  />
                </div>
              </div>

              {/* Live Preview & Apply Button */}
              <div
                className={`py-1 text-center font-bold rounded border ${
                  isDark ? 'bg-neutral-900 border-neutral-700 text-white' : isSepia ? 'bg-[#fffcf5] border-[#ded3be] text-[#2c231c]' : 'bg-white border-neutral-200 text-neutral-900'
                }`}
                style={{ textShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}` }}
              >
                Preview Shadow Aa
              </div>
              <button
                onClick={handleApplyCustomShadow}
                className="w-full py-1.5 rounded-lg bg-[#185abd] hover:bg-[#12458a] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Apply Custom Shadow
              </button>
            </div>
          )}
        </div>

        {/* 4. MARKER HIGHLIGHT (Realistic bottom half linear gradient highlighter) */}
        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <div className={`flex items-center space-x-1.5 ${sectionHeaderColor}`}>
              <Highlighter size={13} className={headerTitleColor} />
              <span>Marker Highlight</span>
            </div>
            <button
              onClick={handleRemoveMarkerHighlight}
              className="text-[10px] font-medium text-rose-500 hover:text-rose-700 flex items-center space-x-0.5 cursor-pointer"
              title="Remove any active highlight or marker"
            >
              <Eraser size={11} />
              <span>Remove</span>
            </button>
          </div>

          {/* Marker Highlighters (Realistic Pen bottom 58%) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-neutral-400">Pen Gradient (Realistic):</span>
            <div className="grid grid-cols-6 gap-1.5">
              {[
                { name: 'Yellow', color: '#fef08a', border: 'border-yellow-400' },
                { name: 'Green', color: '#bbf7d0', border: 'border-emerald-400' },
                { name: 'Pink', color: '#fbcfe8', border: 'border-pink-400' },
                { name: 'Sky', color: '#bae6fd', border: 'border-sky-400' },
                { name: 'Orange', color: '#fed7aa', border: 'border-orange-400' },
                { name: 'Purple', color: '#e9d5ff', border: 'border-purple-400' },
              ].map((m) => (
                <button
                  key={m.name}
                  onClick={() => handleMarkerHighlight(m.color)}
                  className={`h-7 rounded-md border ${m.border} flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-2xs font-bold text-[10px] text-neutral-900`}
                  style={{
                    background: `linear-gradient(180deg, transparent 40%, ${m.color} 40%)`,
                  }}
                  title={`${m.name} Marker Highlight`}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>

          {/* Solid Highlighter Options */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold text-neutral-400">Solid Background:</span>
            <div className="grid grid-cols-6 gap-1.5">
              {[
                { color: '#fef08a', label: 'Yellow' },
                { color: '#a7f3d0', label: 'Mint' },
                { color: '#fed7aa', label: 'Peach' },
                { color: '#fecaca', label: 'Rose' },
                { color: '#bae6fd', label: 'Sky' },
                { color: '#e9d5ff', label: 'Lilac' },
              ].map((s) => (
                <button
                  key={s.color}
                  onClick={() => handleSolidHighlight(s.color)}
                  className="h-6 rounded border border-neutral-400/40 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-2xs text-[10px] font-bold text-neutral-900"
                  style={{ backgroundColor: s.color }}
                  title={`${s.label} Solid Highlight`}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. TEXT OUTLINE & BADGE STYLES */}
        <div className="pt-4 space-y-2.5">
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            <Square size={13} className={headerTitleColor} />
            <span>Outline & Badges</span>
          </div>

          {/* Outline Stroke */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={outlineColor}
                onChange={(e) => setOutlineColor(e.target.value)}
                className="w-7 h-7 rounded border border-neutral-400/40 cursor-pointer p-0.5"
                title="Outline Stroke Color"
              />
              <select
                value={outlineWidth}
                onChange={(e) => setOutlineWidth(Number(e.target.value))}
                className={`flex-1 px-2 py-1 text-xs border rounded-md ${
                  isDark
                    ? 'bg-[#27272a] border-[#3f3f46] text-neutral-100'
                    : isSepia
                    ? 'bg-[#fffcf5] border-[#ded3be] text-[#2c231c]'
                    : 'bg-white border-neutral-300 text-neutral-800'
                }`}
              >
                <option value={1}>1px Stroke</option>
                <option value={1.5}>1.5px Stroke (Standard)</option>
                <option value={2}>2px Bold Stroke</option>
                <option value={3}>3px Heavy Stroke</option>
              </select>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleApplyOutline}
                className="flex-1 py-1.5 px-3 bg-[#185abd] hover:bg-[#12458a] text-white rounded-md text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Apply Outline
              </button>
              <button
                onClick={handleRemoveOutline}
                className={`py-1.5 px-2.5 border rounded-md text-xs transition-all cursor-pointer text-center ${chipBtnClasses}`}
                title="Remove outline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Inline Badges */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold text-neutral-400">Inline Pill Badges:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { bg: '#2563eb', text: '#ffffff', label: 'Primary' },
                { bg: '#16a34a', text: '#ffffff', label: 'Success' },
                { bg: '#ea580c', text: '#ffffff', label: 'Warning' },
                { bg: '#475569', text: '#ffffff', label: 'Slate' },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() => handleApplyBadge(b.bg, b.text)}
                  className="py-1 px-2 rounded-full text-[10px] font-bold text-white transition-transform active:scale-95 cursor-pointer text-center shadow-xs"
                  style={{ backgroundColor: b.bg }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6. PARAGRAPH BOX (Card, Note, Info, Success, Warning, Ribbon, Quote, Draft) */}
        <div className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <div className={`flex items-center space-x-1.5 ${sectionHeaderColor}`}>
              <Box size={13} className={headerTitleColor} />
              <span>Paragraph Box</span>
            </div>
            <button
              onClick={handleClearBlockStyle}
              className="text-[10px] font-medium text-rose-500 hover:text-rose-700 flex items-center space-x-0.5 cursor-pointer"
              title="Reset box to normal paragraph"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight">
            Wraps active text or paragraph inside high-grade callout containers.
          </p>

          <div className="grid grid-cols-4 gap-1.5">
            {/* Card */}
            <button
              onClick={() => handleParagraphBox('card')}
              className={`py-1.5 px-2 border rounded-md text-[11px] font-medium transition-colors cursor-pointer text-center ${chipBtnClasses}`}
              title="Clean neutral card with subtle border"
            >
              Card
            </button>

            {/* Note / Tip */}
            <button
              onClick={() => handleParagraphBox('note')}
              className="py-1.5 px-2 border border-yellow-400/60 bg-yellow-500/10 text-[11px] font-medium text-yellow-600 dark:text-yellow-400 rounded-md transition-colors cursor-pointer text-center"
              title="Yellow tip note with amber border"
            >
              Note
            </button>

            {/* Info */}
            <button
              onClick={() => handleParagraphBox('info')}
              className="py-1.5 px-2 border border-blue-400/60 bg-blue-500/10 text-[11px] font-medium text-blue-600 dark:text-blue-400 rounded-md transition-colors cursor-pointer text-center"
              title="Informational callout box"
            >
              Info
            </button>

            {/* Success */}
            <button
              onClick={() => handleParagraphBox('success')}
              className="py-1.5 px-2 border border-emerald-400/60 bg-emerald-500/10 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 rounded-md transition-colors cursor-pointer text-center"
              title="Success callout box"
            >
              Success
            </button>

            {/* Warning */}
            <button
              onClick={() => handleParagraphBox('warning')}
              className="py-1.5 px-2 border border-rose-400/60 bg-rose-500/10 text-[11px] font-medium text-rose-600 dark:text-rose-400 rounded-md transition-colors cursor-pointer text-center"
              title="Warning alert box"
            >
              Warning
            </button>

            {/* Ribbon */}
            <button
              onClick={() => handleParagraphBox('ribbon')}
              className="py-1.5 px-2 bg-gradient-to-r from-[#185abd] to-[#2563eb] text-white rounded-md text-[11px] font-bold transition-transform active:scale-95 cursor-pointer text-center shadow-xs"
              title="Office Blue Gradient Banner"
            >
              Ribbon
            </button>

            {/* Quote */}
            <button
              onClick={() => handleParagraphBox('quote')}
              className={`py-1.5 px-2 border text-[11px] font-serif italic rounded-md transition-colors cursor-pointer text-center ${chipBtnClasses}`}
              title="Italic Quotation Callout"
            >
              Quote
            </button>

            {/* Draft */}
            <button
              onClick={() => handleParagraphBox('draft')}
              className={`py-1.5 px-2 border border-dashed text-[11px] font-mono rounded-md transition-colors cursor-pointer text-center ${chipBtnClasses}`}
              title="Dashed draft box"
            >
              Draft
            </button>
          </div>
        </div>

        {/* 7. TOOLS ("TOOS" - Transform Case, Clear All, CSS Inspector) */}
        <div className="pt-4 space-y-2.5 pb-6">
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider ${sectionHeaderColor}`}>
            <Gem size={13} className={headerTitleColor} />
            <span>Tools</span>
          </div>

          {/* Text Case Transformations */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
              <CaseSensitive size={12} />
              <span>Change Letter Case:</span>
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleTransformCase('upper')}
                className={`py-1 px-1.5 rounded border text-[10px] font-bold cursor-pointer text-center ${chipBtnClasses}`}
                title="ALL UPPERCASE"
              >
                UPPER
              </button>
              <button
                onClick={() => handleTransformCase('lower')}
                className={`py-1 px-1.5 rounded border text-[10px] font-medium cursor-pointer text-center ${chipBtnClasses}`}
                title="all lowercase"
              >
                lower
              </button>
              <button
                onClick={() => handleTransformCase('title')}
                className={`py-1 px-1.5 rounded border text-[10px] font-medium cursor-pointer text-center ${chipBtnClasses}`}
                title="Capitalize Each Word"
              >
                Title Case
              </button>
              <button
                onClick={() => handleTransformCase('sentence')}
                className={`py-1 px-1.5 rounded border text-[10px] font-medium cursor-pointer text-center ${chipBtnClasses}`}
                title="Sentence case"
              >
                Sentence
              </button>
            </div>
          </div>

          {/* Utility Action Buttons */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={handleCopyAsStyle}
              className={`w-full py-1.5 px-3 border rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all cursor-pointer text-center ${chipBtnClasses}`}
            >
              <Copy size={13} className="text-neutral-400" />
              <span>Copy Computed CSS Style</span>
            </button>

            <button
              onClick={handleClearAllFormatting}
              className="w-full py-1.5 px-3 border border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-xs font-semibold text-rose-500 flex items-center justify-center space-x-1.5 transition-all cursor-pointer text-center"
            >
              <Eraser size={13} />
              <span>Clear All Formatting</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
