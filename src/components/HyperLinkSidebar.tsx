import React, { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Link2,
  X,
  Copy,
  AlertTriangle,
  Unlink,
  Check,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  isLikelyUrlOrEmail,
  normalizeUrlOrEmail,
  validateLinkUrl,
  LinkValidationResult,
} from '../utils/linkUtils';

interface HyperLinkSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  mode?: 'navigate' | 'edit';
  onToggleMode?: (mode: 'navigate' | 'edit') => void;
}

export const HyperLinkSidebar: React.FC<HyperLinkSidebarProps> = ({
  editor,
  onClose,
  mode: controlledMode,
  onToggleMode,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [openInNewWindow, setOpenInNewWindow] = useState(false);
  const [relNoFollow, setRelNoFollow] = useState(false);
  const [relSponsored, setRelSponsored] = useState(false);
  const [relUgc, setRelUgc] = useState(false);
  const [titleAttr, setTitleAttr] = useState('');
  const [ariaLabel, setAriaLabel] = useState('');

  // Mode state: 'navigate' (blue) vs 'edit' (green)
  const [localMode, setLocalMode] = useState<'navigate' | 'edit'>(() => {
    try {
      const saved = localStorage.getItem('wordpad_hyperlink_mode');
      if (saved === 'edit' || saved === 'navigate') return saved;
    } catch {
      // ignore
    }
    return 'navigate';
  });

  const currentMode = controlledMode ?? localMode;

  const handleToggleMode = (nextMode: 'navigate' | 'edit') => {
    setLocalMode(nextMode);
    try {
      localStorage.setItem('wordpad_hyperlink_mode', nextMode);
    } catch {
      // ignore
    }
    if (onToggleMode) {
      onToggleMode(nextMode);
    }
  };

  // Status and feedback states
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [checkResult, setCheckResult] = useState<LinkValidationResult | null>(null);
  const [applyFeedback, setApplyFeedback] = useState(false);

  // Sync state from editor when selection moves
  const syncFromEditor = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const selectedContent = hasSelection
      ? editor.state.doc.textBetween(from, to, ' ').trim()
      : '';

    const attrs = editor.getAttributes('link');
    const isLinkActive = editor.isActive('link');

    if (isLinkActive && attrs.href) {
      setLinkUrl(attrs.href);
      if (hasSelection) {
        setDisplayText(selectedContent);
      } else {
        // If cursor inside link without wide selection, find the full text of this link mark
        const { $from } = editor.state.selection;
        let linkFullText = '';
        const parent = $from.parent;
        parent.nodesBetween(0, parent.content.size, (child) => {
          if (child.isText && child.marks) {
            const hasThisLink = child.marks.some(
              (m) => m.type.name === 'link' && m.attrs.href === attrs.href
            );
            if (hasThisLink) {
              linkFullText += child.text || '';
            }
          }
        });
        setDisplayText(linkFullText || attrs.href);
      }
      setOpenInNewWindow(attrs.target === '_blank');
      const rel = attrs.rel || '';
      setRelNoFollow(rel.includes('nofollow'));
      setRelSponsored(rel.includes('sponsored'));
      setRelUgc(rel.includes('ugc'));
      setTitleAttr(attrs.title || '');
      setAriaLabel(attrs['aria-label'] || '');
      setCheckResult(null);
    } else if (hasSelection) {
      setDisplayText(selectedContent);
      if (isLikelyUrlOrEmail(selectedContent)) {
        setLinkUrl(normalizeUrlOrEmail(selectedContent));
      }
      setCheckResult(null);
    }
  }, [editor]);

  useEffect(() => {
    syncFromEditor();

    if (!editor) return;
    editor.on('selectionUpdate', syncFromEditor);
    return () => {
      editor.off('selectionUpdate', syncFromEditor);
    };
  }, [editor, syncFromEditor]);

  // Inspect clipboard if fields are currently empty
  useEffect(() => {
    const checkClip = async () => {
      try {
        if (!linkUrl && navigator.clipboard && navigator.clipboard.readText) {
          const text = (await navigator.clipboard.readText()).trim();
          if (text && isLikelyUrlOrEmail(text)) {
            setLinkUrl(normalizeUrlOrEmail(text));
            if (!displayText) {
              setDisplayText(text);
            }
          }
        }
      } catch {
        // clipboard unavailable
      }
    };
    checkClip();
  }, [linkUrl, displayText]);

  // Apply or update link in editor
  const handleApplyLink = () => {
    if (!editor) return;

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setApplyFeedback(true);
      setTimeout(() => setApplyFeedback(false), 2000);
      return;
    }

    const finalUrl = normalizeUrlOrEmail(trimmedUrl);
    const target = openInNewWindow ? '_blank' : null;
    const relParts = [
      relNoFollow && 'nofollow',
      relSponsored && 'sponsored',
      relUgc && 'ugc',
    ].filter(Boolean);
    const rel = relParts.length > 0 ? relParts.join(' ') : null;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const originalSelectedText = hasSelection
      ? editor.state.doc.textBetween(from, to, ' ')
      : '';

    if (hasSelection) {
      if (displayText && displayText !== originalSelectedText) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: displayText,
            marks: [
              {
                type: 'link',
                attrs: {
                  href: finalUrl,
                  target,
                  rel,
                },
              },
            ],
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: finalUrl, target, rel })
          .run();
      }
    } else {
      const textToInsert = displayText.trim() || finalUrl;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: textToInsert,
          marks: [
            {
              type: 'link',
              attrs: {
                href: finalUrl,
                target,
                rel,
              },
            },
          ],
        })
        .run();
    }

    setApplyFeedback(true);
    setTimeout(() => setApplyFeedback(false), 2000);
  };

  // Remove Link button
  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkUrl('');
    setOpenInNewWindow(false);
    setRelNoFollow(false);
    setRelSponsored(false);
    setRelUgc(false);
    setTitleAttr('');
    setAriaLabel('');
    setCheckResult(null);
  };

  // Copy Link button
  const handleCopyLink = () => {
    if (!linkUrl) return;
    try {
      navigator.clipboard.writeText(linkUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2200);
    } catch {
      // fallback
    }
  };

  // Broken Link Check button
  const handleCheckLink = () => {
    if (!linkUrl.trim()) {
      setCheckResult({ status: 'invalid', message: 'No URL entered to check' });
      return;
    }
    const result = validateLinkUrl(linkUrl);
    setCheckResult(result);
  };

  return (
    <aside
      className="w-72 sm:w-80 bg-white border-l border-neutral-200/90 flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200"
      aria-label="Hyper Link Toolbar"
    >
      {/* 1. Header matching Photo 2 */}
      <div className="h-12 border-b border-neutral-200/90 flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center space-x-2 text-neutral-800">
          <Link2 size={16} className="text-[#6366f1] rotate-45" />
          <h2 className="font-bold text-sm tracking-tight text-neutral-800">
            Hyper Link
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigate mode (blue) / Edit mode (green) toggle pill */}
          <button
            type="button"
            onClick={() => handleToggleMode(currentMode === 'navigate' ? 'edit' : 'navigate')}
            title={
              currentMode === 'navigate'
                ? 'You are in Navigate mode. Click to switch to Edit mode (green)'
                : 'You are in Edit mode. Click to switch to Navigate mode (blue)'
            }
            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border shadow-2xs ${
              currentMode === 'navigate'
                ? 'bg-[#eff6ff] text-[#1d4ed8] border-blue-300 hover:bg-[#dbeafe] hover:border-blue-400'
                : 'bg-[#f0fdf4] text-[#15803d] border-emerald-300 hover:bg-[#dcfce7] hover:border-emerald-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentMode === 'navigate' ? 'bg-[#2563eb]' : 'bg-[#16a34a]'
              }`}
            />
            <span className="whitespace-nowrap font-semibold">
              {currentMode === 'navigate' ? 'Navigate mode' : 'Edit mode'}
            </span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Close Hyper Link Sidebar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body matching Photo 2 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Text to display field */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">
            Text to display
          </label>
          <input
            type="text"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            placeholder="Display text in document"
            className="w-full px-3 py-1.5 bg-[#f8fafc] border border-neutral-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 text-xs transition-colors"
          />
        </div>

        {/* Edit Link (URL) field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-600">
              Edit Link (URL)
            </label>
            {linkUrl && (
              <a
                href={normalizeUrlOrEmail(linkUrl)}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview URL in new tab"
                className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center space-x-0.5"
              >
                <span>Visit</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setCheckResult(null);
            }}
            placeholder="https://example.com"
            className="w-full px-3 py-1.5 bg-[#f8fafc] border border-neutral-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 text-xs transition-colors"
          />
        </div>

        {/* Link Options checkboxes */}
        <div className="space-y-1.5 pt-1">
          <span className="block text-xs font-medium text-neutral-600 mb-1.5">
            Link Options
          </span>

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openInNewWindow}
              onChange={(e) => setOpenInNewWindow(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-neutral-700">Open in new window</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={relNoFollow}
              onChange={(e) => setRelNoFollow(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-neutral-700">rel=&quot;nofollow&quot;</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={relSponsored}
              onChange={(e) => setRelSponsored(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-neutral-700">rel=&quot;sponsored&quot;</span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={relUgc}
              onChange={(e) => setRelUgc(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-neutral-700">rel=&quot;ugc&quot;</span>
          </label>
        </div>

        {/* Title Attribute field */}
        <div className="space-y-1 pt-1">
          <label className="block text-xs font-medium text-neutral-600">
            Title Attribute
          </label>
          <input
            type="text"
            value={titleAttr}
            onChange={(e) => setTitleAttr(e.target.value)}
            placeholder="Tooltip text on hover"
            className="w-full px-3 py-1.5 bg-[#f8fafc] border border-neutral-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 text-xs transition-colors placeholder:text-neutral-400"
          />
        </div>

        {/* ARIA Label field */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">
            ARIA Label
          </label>
          <input
            type="text"
            value={ariaLabel}
            onChange={(e) => setAriaLabel(e.target.value)}
            placeholder="Accessible label"
            className="w-full px-3 py-1.5 bg-[#f8fafc] border border-neutral-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 text-xs transition-colors placeholder:text-neutral-400"
          />
        </div>

        {/* Apply Link action button */}
        <button
          type="button"
          onClick={handleApplyLink}
          className="w-full py-2 px-3 bg-[#185abd] hover:bg-[#114999] text-white rounded-md font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
        >
          {applyFeedback ? (
            <>
              <Check size={14} className="text-emerald-300" />
              <span>Link Applied!</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-blue-200" />
              <span>Apply / Update Hyperlink</span>
            </>
          )}
        </button>

        {/* Subtle Divider */}
        <hr className="border-neutral-200 my-2" />

        {/* Copy Link Button matching Photo 2 */}
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={!linkUrl}
          className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 disabled:hover:bg-neutral-50 border border-neutral-200 rounded-md font-medium text-neutral-700 text-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
        >
          {copyFeedback ? (
            <>
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-neutral-500" />
              <span>Copy Link</span>
            </>
          )}
        </button>

        {/* Broken Link Check Button matching Photo 2 */}
        <button
          type="button"
          onClick={handleCheckLink}
          className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md font-medium text-neutral-700 text-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-2xs"
        >
          <AlertTriangle size={14} className="text-neutral-500" />
          <span>Broken Link Check</span>
        </button>

        {/* Validation Result Box */}
        {checkResult && (
          <div
            className={`p-2.5 rounded-md text-xs border ${
              checkResult.status === 'valid'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : checkResult.status === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-1.5 font-semibold">
              {checkResult.status === 'valid' ? (
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              )}
              <span className="capitalize">{checkResult.status}</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {checkResult.message}
            </p>
          </div>
        )}

        {/* Remove Link Button (Red Button) matching Photo 2 */}
        <button
          type="button"
          onClick={handleRemoveLink}
          className="w-full py-2 px-3 bg-[#ef4444] hover:bg-[#dc2626] active:scale-[0.99] text-white rounded-md font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2 mt-2"
        >
          <Unlink size={14} className="text-white" />
          <span>Remove Link</span>
        </button>
      </div>
    </aside>
  );
};
