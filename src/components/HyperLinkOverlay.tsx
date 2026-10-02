import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { ExternalLink, Edit3, ArrowRightLeft, Link2 } from 'lucide-react';
import { DocumentSettings } from '../types';

interface HyperLinkOverlayProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
}

interface HoverState {
  element: HTMLAnchorElement;
  href: string;
  target?: string;
  rect: DOMRect;
  text: string;
}

export const HyperLinkOverlay: React.FC<HyperLinkOverlayProps> = ({
  editor,
  settings,
  onUpdateSettings,
}) => {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const isOverTooltipRef = useRef(false);

  const mode = settings.hyperLinkMode || 'navigate';
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Tooltip message exact strings as requested by user
  const tooltipText =
    mode === 'navigate'
      ? 'You are in Navigate mode , change that state in hyper Toolbar'
      : 'You are in Edit mode , change that state in hyper Toolbar';

  // Attach click & hover capture listeners to the editor ProseMirror DOM
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;

    const editorDom = editor.view.dom;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a') as HTMLAnchorElement | null;

      if (link && editorDom.contains(link)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        const href = link.getAttribute('href') || '';
        const targetAttr = link.getAttribute('target') || undefined;
        const text = link.textContent || '';
        const rect = link.getBoundingClientRect();

        const currentMode = settingsRef.current.hyperLinkMode || 'navigate';
        const currentTooltip =
          currentMode === 'navigate'
            ? 'You are in Navigate mode , change that state in hyper Toolbar'
            : 'You are in Edit mode , change that state in hyper Toolbar';

        // Update the native title attribute as well for browser-level tooltip compatibility
        link.setAttribute('title', currentTooltip);

        setHoverState({
          element: link,
          href,
          target: targetAttr,
          rect,
          text,
        });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest('a') as HTMLAnchorElement | null;

      if (link && editorDom.contains(link)) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = window.setTimeout(() => {
          if (!isOverTooltipRef.current) {
            setHoverState(null);
          }
        }, 300);
      }
    };

    // Use mouseover/mouseout listeners to manage floating tooltip
    editorDom.addEventListener('mouseover', handleMouseOver);
    editorDom.addEventListener('mouseout', handleMouseOut);

    return () => {
      editorDom.removeEventListener('mouseover', handleMouseOver);
      editorDom.removeEventListener('mouseout', handleMouseOut);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [editor]);

  // Update native title attributes on all links whenever hyperLinkMode changes
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    const links = editor.view.dom.querySelectorAll('a');
    links.forEach((a) => {
      a.setAttribute('title', tooltipText);
    });
  }, [editor, tooltipText]);

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(120);

  useEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h && Math.abs(h - measuredHeight) > 2) {
        setMeasuredHeight(h);
      }
    }
  }, [hoverState, mode, measuredHeight]);

  if (!hoverState) return null;

  // Calculate position in fixed viewport coords
  const { rect } = hoverState;
  const tooltipWidth = 320;
  const tooltipHeight = measuredHeight || 120;
  const verticalGap = 16; // Generous clear gap above link so link text is fully visible and clickable

  // Show above if enough space, else below
  const showAbove = rect.top >= tooltipHeight + verticalGap + 12;
  const top = showAbove
    ? rect.top - tooltipHeight - verticalGap
    : Math.min(window.innerHeight - tooltipHeight - 12, rect.bottom + verticalGap);
  const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2));

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        zIndex: 9999,
      }}
      className={`rounded-lg border shadow-xl p-2.5 transition-all pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
        mode === 'navigate'
          ? 'bg-white/95 border-blue-300 text-blue-950 shadow-blue-500/10 dark:bg-slate-900/95 dark:border-blue-700 dark:text-blue-100'
          : 'bg-white/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10 dark:bg-slate-900/95 dark:border-emerald-700 dark:text-emerald-100'
      }`}
      onMouseEnter={() => {
        isOverTooltipRef.current = true;
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }}
      onMouseLeave={() => {
        isOverTooltipRef.current = false;
        hoverTimeoutRef.current = window.setTimeout(() => {
          setHoverState(null);
        }, 200);
      }}
    >
      {/* Header bar: Mode badge + Toggle action */}
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-neutral-200/70 dark:border-neutral-700/70 mb-1.5">
        <div className="flex items-center space-x-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              mode === 'navigate' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          />
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
              mode === 'navigate'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
            }`}
          >
            {mode === 'navigate' ? 'Navigate mode' : 'Edit mode'}
          </span>
        </div>

        {/* Quick state switcher in tooltip */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const nextMode = mode === 'navigate' ? 'edit' : 'navigate';
            onUpdateSettings({ hyperLinkMode: nextMode });
          }}
          className={`flex items-center space-x-1 text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
            mode === 'navigate'
              ? 'text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50'
              : 'text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
          }`}
          title="Switch link state mode"
        >
          <ArrowRightLeft size={10} />
          <span>Switch to {mode === 'navigate' ? 'Edit' : 'Navigate'}</span>
        </button>
      </div>

      {/* Primary Tooltip Text (Exact User-Specified String) */}
      <div className="text-[11px] font-semibold leading-snug mb-1.5 flex items-start space-x-1.5">
        <Link2
          size={13}
          className={`shrink-0 mt-0.5 ${
            mode === 'navigate' ? 'text-blue-600' : 'text-emerald-600'
          }`}
        />
        <span>{tooltipText}</span>
      </div>

      {/* Target URL and Click Action Hint */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (mode === 'navigate') {
            const href = hoverState.href;
            if (href) {
              if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
                window.location.href = href;
              } else {
                window.open(
                  href.startsWith('http://') || href.startsWith('https://') ? href : `https://${href}`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }
            }
          } else {
            onUpdateSettings({ showHyperLinkPane: true });
          }
        }}
        title={mode === 'navigate' ? 'Click to open URL' : 'Click to edit link in HyperLink toolbar'}
        className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-100/80 dark:bg-slate-800/80 px-2 py-1 rounded cursor-pointer hover:bg-neutral-200/80 dark:hover:bg-slate-700/80 transition-colors"
      >
        <span className="truncate max-w-[190px]" title={hoverState.href}>
          {hoverState.href}
        </span>

        {mode === 'navigate' ? (
          <span className="flex items-center space-x-0.5 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
            <span>Click = Open</span>
            <ExternalLink size={10} />
          </span>
        ) : (
          <span className="flex items-center space-x-0.5 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
            <span>Click = Edit</span>
            <Edit3 size={10} />
          </span>
        )}
      </div>
    </div>
  );
};
