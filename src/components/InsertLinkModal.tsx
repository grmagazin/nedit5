import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles, Check, Clipboard } from 'lucide-react';
import { isLikelyUrlOrEmail, normalizeUrlOrEmail } from '../utils/linkUtils';

interface InsertLinkModalProps {
  editor: Editor | null;
  onClose: () => void;
}

export const InsertLinkModal: React.FC<InsertLinkModalProps> = ({
  editor,
  onClose,
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [openInNewWindow, setOpenInNewWindow] = useState(false);
  const [noFollow, setNoFollow] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let hasExplicitSelection = false;
    let selText = '';

    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        hasExplicitSelection = true;
        selText = editor.state.doc.textBetween(from, to, ' ').trim();
        setDisplayText(selText);
      }

      // Check if cursor/selection already has an active link
      const attrs = editor.getAttributes('link');
      if (attrs.href) {
        setLinkUrl(attrs.href);
        if (attrs.target === '_blank') setOpenInNewWindow(true);
        if (attrs.rel && attrs.rel.includes('nofollow')) setNoFollow(true);
        return; // Retain existing link properties
      }

      // If the selected text itself is a URL or email address
      if (hasExplicitSelection && isLikelyUrlOrEmail(selText)) {
        setLinkUrl(normalizeUrlOrEmail(selText));
        setDetectedBadge('Auto-detected from selection');
        return;
      }
    }

    // Smart clipboard check: read current clipboard text; if valid URL or email, populate link dialog
    const inspectClipboard = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const raw = await navigator.clipboard.readText();
          if (!raw) return;
          const clipText = raw.trim().replace(/^[<"']|[>"']$/g, '').trim();
          if (clipText && isLikelyUrlOrEmail(clipText)) {
            const formatted = normalizeUrlOrEmail(clipText);
            setLinkUrl(formatted);
            setDetectedBadge(
              clipText.includes('@') && !clipText.includes('://')
                ? 'Email detected in clipboard'
                : 'Link detected in clipboard'
            );

            // If user had no selection, use clipboard text as display text
            if (!hasExplicitSelection) {
              setDisplayText(clipText);
            }
          }
        }
      } catch {
        // Clipboard read may be blocked by browser permissions; graceful fallback
      }
    };

    inspectClipboard();
  }, [editor]);

  const handleInsert = () => {
    if (!editor) {
      onClose();
      return;
    }

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onClose();
      return;
    }

    const finalUrl = normalizeUrlOrEmail(trimmedUrl);
    const target = openInNewWindow ? '_blank' : null;
    const rel = noFollow ? 'nofollow' : null;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    const originalSelectedText = hasSelection
      ? editor.state.doc.textBetween(from, to, ' ')
      : '';

    if (hasSelection) {
      if (displayText && displayText !== originalSelectedText) {
        // Text to display was changed: replace selection with new text and link
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: displayText,
            marks: [
              {
                type: 'link',
                attrs: { href: finalUrl, target, rel },
              },
            ],
          })
          .run();
      } else {
        // Set link directly on selection
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: finalUrl, target, rel })
          .run();
      }
    } else {
      // No selection: insert text with link
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
              attrs: { href: finalUrl, target, rel },
            },
          ],
        })
        .run();
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInsert();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-6 w-full max-w-[340px] text-neutral-800 space-y-4"
        onKeyDown={handleKeyDown}
      >
        {/* Header matching Photo 1 */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900 leading-tight">
              Insert Hyperlink
            </h3>
            {detectedBadge && (
              <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <Sparkles size={11} className="text-blue-600" />
                <span>Auto-filled</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1 leading-normal">
            Wraps selected text, or enter display text below.
          </p>
        </div>

        {/* Link URL field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-600">
              Link URL
            </label>
            {detectedBadge && (
              <span className="text-[10px] text-blue-600 font-medium flex items-center space-x-1">
                <Clipboard size={10} />
                <span>{detectedBadge}</span>
              </span>
            )}
          </div>
          <input
            ref={urlInputRef}
            type="text"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            autoFocus
            className="w-full text-xs px-3 py-2 bg-[#f8fafc] border border-neutral-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-neutral-800 transition-colors placeholder:text-neutral-400"
          />
        </div>

        {/* Text to display field */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">
            Text to display
          </label>
          <input
            type="text"
            placeholder="Display text (optional)"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-[#f8fafc] border border-neutral-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-neutral-800 transition-colors placeholder:text-neutral-400"
          />
        </div>

        {/* Checkboxes matching Photo 1 */}
        <div className="space-y-2 pt-1 text-xs text-neutral-700">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openInNewWindow}
              onChange={(e) => setOpenInNewWindow(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-neutral-700 font-normal">
              Open in new window
            </span>
          </label>

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noFollow}
              onChange={(e) => setNoFollow(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-neutral-700 font-normal">
              rel=&quot;nofollow&quot;
            </span>
          </label>
        </div>

        {/* Footer buttons matching Photo 1 */}
        <div className="flex items-center justify-end space-x-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-md font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="px-4 py-1.5 text-xs text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md font-semibold transition-colors cursor-pointer shadow-xs flex items-center space-x-1"
          >
            <span>Insert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
