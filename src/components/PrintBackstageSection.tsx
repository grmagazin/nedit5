import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings, DocumentStats, PageSize, PageOrientation, PageMargin } from '../types';
import {
  Printer,
  Sliders,
  CheckCircle2,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Check,
  Save,
  Palette,
  Layers,
  ArrowRight,
  Table as TableIcon,
  Scaling,
  Grid,
} from 'lucide-react';
import {
  calculateDocumentPages,
  PAGE_HEIGHT_LOOKUP,
  PAGE_WIDTH_LOOKUP,
  formatSmartPageText,
} from '../utils/pageCalculator';
import { executePrintToPdf } from '../utils/pdfPrintEngine';
import {
  SmartHeaderFooterInput,
  SmartDocValues,
  resolveSmartText,
} from './SmartHeaderFooterInput';

interface PrintBackstageSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  stats?: DocumentStats;
  onClose: () => void;
  onUpdateSettings?: (settings: Partial<DocumentSettings>) => void;
  onSaveToLocalStorage?: () => void;
  onPrint: () => void;
  onSwitchToPdfTab?: () => void;
}

export const PrintBackstageSection: React.FC<PrintBackstageSectionProps> = ({
  editor,
  settings,
  stats,
  onClose,
  onUpdateSettings,
  onSaveToLocalStorage,
  onPrint,
  onSwitchToPdfTab,
}) => {
  // Print settings (A4 preselected by default)
  const [copies, setCopies] = useState<number>(1);
  const [printerDestination, setPrinterDestination] = useState<'pdf' | 'system'>('pdf');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('1');

  // Preselected Page Size: A4 by default or from settings
  const [paperSize, setPaperSize] = useState<PageSize>(settings.pageSize || 'a4');
  const [orientation, setOrientation] = useState<PageOrientation>(settings.orientation || 'portrait');
  const [margins, setMargins] = useState<PageMargin>(settings.margins || 'narrow');

  // Smart feature toggles
  const [smartBreakOptimization, setSmartBreakOptimization] = useState<boolean>(true);
  const [printBackgroundGraphics, setPrintBackgroundGraphics] = useState<boolean>(true);
  const [highContrastMode, setHighContrastMode] = useState<boolean>(false);
  const [printHeadersFooters, setPrintHeadersFooters] = useState<boolean>(true);
  const [hideMarkupGuides, setHideMarkupGuides] = useState<boolean>(true);

  // Smart Table Print Formatting Options (Requested by user)
  const [tablePrintWidth, setTablePrintWidth] = useState<'100%' | '90%' | 'auto'>('100%');
  const [tableBetterViewGrids, setTableBetterViewGrids] = useState<boolean>(true);

  // Editable Info & Page Setup state directly within Print Workstation (Requested by User)
  const [docTitle, setDocTitle] = useState<string>(settings.title || '');
  const [docAuthor, setDocAuthor] = useState<string>(settings.author || '');
  const [docWatermark, setDocWatermark] = useState<string>(
    settings.customWatermark || (settings.watermark === 'Your Mark' ? '' : (settings.watermark || ''))
  );

  // Header & Footer Master Toggles
  const [showHeader, setShowHeader] = useState<boolean>(
    settings.showHeader !== undefined
      ? settings.showHeader
      : (settings.showHeaderFooter !== false && Boolean(settings.headerLeft || settings.headerRight || settings.headerShowPages))
  );
  const [showFooter, setShowFooter] = useState<boolean>(
    settings.showFooter !== undefined
      ? settings.showFooter
      : (settings.showHeaderFooter !== false && (Boolean(settings.footerLeft || settings.footerRight || settings.footerShowPages)))
  );

  // Header Individual Item Controls (Direct text values - NO fake fallbacks)
  const [headerLeftValue, setHeaderLeftValue] = useState<string>(settings.headerLeft || '');
  const [headerShowPagesState, setHeaderShowPagesState] = useState<boolean>(settings.headerShowPages ?? false);
  const [headerPageNumState, setHeaderPageNumState] = useState<number>(
    settings.headerPageStart !== undefined ? (settings.headerPageStart === 0 ? 0 : 1) : 1
  );
  const [headerPageSepState, setHeaderPageSepState] = useState<string>(settings.headerPageSeparator ?? '-');
  const [headerPageMaxState, setHeaderPageMaxState] = useState<number>(
    settings.headerPageTotal !== undefined ? (settings.headerPageTotal === 0 ? 0 : 1) : 1
  );
  const [headerRightValue, setHeaderRightValue] = useState<string>(settings.headerRight || '');

  // Footer Individual Item Controls (Direct text values - NO fake fallbacks)
  const [footerLeftValue, setFooterLeftValue] = useState<string>(settings.footerLeft || '');
  const [footerShowPagesState, setFooterShowPagesState] = useState<boolean>(settings.footerShowPages ?? true);
  const [footerPageNumState, setFooterPageNumState] = useState<number>(
    settings.footerPageStart !== undefined ? (settings.footerPageStart === 0 ? 0 : 1) : 1
  );
  const [footerPageSepState, setFooterPageSepState] = useState<string>(settings.footerPageSeparator ?? '-');
  const [footerPageMaxState, setFooterPageMaxState] = useState<number>(
    settings.footerPageTotal !== undefined ? (settings.footerPageTotal === 0 ? 0 : 1) : 1
  );
  const [footerRightValue, setFooterRightValue] = useState<string>(settings.footerRight || '');

  const [justSavedSetup, setJustSavedSetup] = useState<boolean>(false);

  const updateSettingsAndParent = (partial: Partial<DocumentSettings>) => {
    if (onUpdateSettings) {
      onUpdateSettings(partial);
    }
  };

  // Preview state & dynamic container scaling (Default: Fit Width as requested)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const [zoomMode, setZoomMode] = useState<'fit-page' | 'fit-width' | 'manual'>('fit-width');
  const [isSpooling, setIsSpooling] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync settings when props change
  useEffect(() => {
    if (settings.pageSize) setPaperSize(settings.pageSize);
    if (settings.orientation) setOrientation(settings.orientation);
    if (settings.margins) setMargins(settings.margins);
    if (settings.title !== undefined) setDocTitle(settings.title);
    if (settings.author !== undefined) setDocAuthor(settings.author);
    if (settings.customWatermark !== undefined || settings.watermark !== undefined) {
      setDocWatermark(settings.customWatermark || (settings.watermark === 'Your Mark' ? '' : (settings.watermark || '')));
    }
    if (settings.showHeader !== undefined) setShowHeader(settings.showHeader);
    if (settings.showFooter !== undefined) setShowFooter(settings.showFooter);
    if (settings.headerLeft !== undefined) setHeaderLeftValue(settings.headerLeft);
    if (settings.headerRight !== undefined) setHeaderRightValue(settings.headerRight);
    if (settings.headerShowPages !== undefined) setHeaderShowPagesState(settings.headerShowPages);
    if (settings.headerPageStart !== undefined) setHeaderPageNumState(settings.headerPageStart === 0 ? 0 : 1);
    if (settings.headerPageSeparator !== undefined) setHeaderPageSepState(settings.headerPageSeparator);
    if (settings.headerPageTotal !== undefined) setHeaderPageMaxState(settings.headerPageTotal === 0 ? 0 : 1);
    if (settings.footerLeft !== undefined) setFooterLeftValue(settings.footerLeft);
    if (settings.footerRight !== undefined) setFooterRightValue(settings.footerRight);
    if (settings.footerShowPages !== undefined) setFooterShowPagesState(settings.footerShowPages);
    if (settings.footerPageStart !== undefined) setFooterPageNumState(settings.footerPageStart === 0 ? 0 : 1);
    if (settings.footerPageSeparator !== undefined) setFooterPageSepState(settings.footerPageSeparator);
    if (settings.footerPageTotal !== undefined) setFooterPageMaxState(settings.footerPageTotal === 0 ? 0 : 1);
  }, [
    settings.pageSize,
    settings.orientation,
    settings.margins,
    settings.title,
    settings.author,
    settings.customWatermark,
    settings.watermark,
    settings.showHeader,
    settings.showFooter,
    settings.headerLeft,
    settings.headerRight,
    settings.headerShowPages,
    settings.headerPageStart,
    settings.headerPageSeparator,
    settings.headerPageTotal,
    settings.footerLeft,
    settings.footerRight,
    settings.footerShowPages,
    settings.footerPageStart,
    settings.footerPageSeparator,
    settings.footerPageTotal,
  ]);

  // Debug & Live Calibration Parameters (User experiment & calibration workstation)
  // Default: 1430px for A4 narrow (as requested by user)
  const [debugPreviewHeight, setDebugPreviewHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wordpad_debug_preview_height');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 600 && n <= 2400) return n;
      }
    } catch {
      // ignore
    }
    return 1430; // 1430px for A4 narrow
  });

  const [debugPrintCapacityHeight, setDebugPrintCapacityHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wordpad_debug_print_height');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 600 && n <= 2400) return n;
      }
    } catch {
      // ignore
    }
    return 1430; // 1430px for A4 narrow
  });

  // By default, preview optical simulator height is independent from print pagination calibration
  const [debugLinkHeights, setDebugLinkHeights] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wordpad_debug_link_heights');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return false; // Independent optical simulator by default
  });

  const [debugBottomBuffer, setDebugBottomBuffer] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wordpad_debug_bottom_buffer');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0 && n <= 200) return n;
      }
    } catch {
      // ignore
    }
    return 0; // Default 0px
  });

  const [debugHeaderFooterOffset, setDebugHeaderFooterOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wordpad_debug_hf_offset');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0 && n <= 150) return n;
      }
    } catch {
      // ignore
    }
    return 40; // Default 40px
  });

  // Dynamic Browser Kick Overflow parameter (px): kicks last lines to next page (+px) or adds lines to page (-px)
  const [kickOverflowPx, setKickOverflowPx] = useState<number>(() => {
    try {
      if (typeof settings.kickOverflowPx === 'number') {
        return settings.kickOverflowPx;
      }
      const saved = localStorage.getItem('wordpad_kick_overflow_px');
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= -300 && n <= 300) return n;
      }
    } catch {
      // ignore
    }
    return 0; // Default 0px
  });

  const handleUpdateKickOverflowPx = (val: number) => {
    const clamped = Math.max(-300, Math.min(300, val));
    setKickOverflowPx(clamped);
    try {
      localStorage.setItem('wordpad_kick_overflow_px', String(clamped));
    } catch {
      // ignore
    }
    setCacheVersion((v) => v + 1);
  };

  // Checkbox parameter: Do not add header and footer to printing area (browser print method)
  // When true: puts header text inside top margin, footer text inside bottom margin
  const [doNotAddHeaderFooterToPrintArea, setDoNotAddHeaderFooterToPrintArea] = useState<boolean>(() => {
    try {
      if (typeof settings.doNotAddHeaderFooterToPrintArea === 'boolean') {
        return settings.doNotAddHeaderFooterToPrintArea;
      }
      const saved = localStorage.getItem('wordpad_do_not_add_hf_to_print_area');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    return true; // Default true (matches browser print method)
  });

  const handleUpdateDoNotAddHeaderFooterToPrintArea = (checked: boolean) => {
    setDoNotAddHeaderFooterToPrintArea(checked);
    try {
      localStorage.setItem('wordpad_do_not_add_hf_to_print_area', String(checked));
    } catch {
      // ignore
    }
    setCacheVersion((v) => v + 1);
  };

  const [showDebugLab, setShowDebugLab] = useState<boolean>(true);

  // Simulator Realism Smart Parameters (Optical Realism Only)
  const [showPrintableBoundaryGuide, setShowPrintableBoundaryGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordpad_preview_boundary_guide') === 'true';
    } catch {
      // ignore
    }
    return false;
  });

  const [paperRealismFinish, setPaperRealismFinish] = useState<'bright' | 'warm'>(() => {
    try {
      const saved = localStorage.getItem('wordpad_preview_paper_finish');
      if (saved === 'warm') return 'warm';
    } catch {
      // ignore
    }
    return 'bright';
  });

  const [paperShadowDepth, setPaperShadowDepth] = useState<'subtle' | 'realistic'>('realistic');

  // Updates ONLY the optical preview sheet height (does not alter text pagination or print calibration)
  const handleUpdatePreviewHeight = (val: number) => {
    const clamped = Math.max(600, Math.min(2400, val));
    setDebugPreviewHeight(clamped);
    try {
      localStorage.setItem('wordpad_debug_preview_height', String(clamped));
    } catch {
      // ignore
    }
    if (debugLinkHeights) {
      setDebugPrintCapacityHeight(clamped);
      try {
        localStorage.setItem('wordpad_debug_print_height', String(clamped));
      } catch {
        // ignore
      }
    }
    setCacheVersion((v) => v + 1);
  };

  const handleUpdatePrintCapacityHeight = (val: number) => {
    const clamped = Math.max(600, Math.min(2400, val));
    setDebugPrintCapacityHeight(clamped);
    try {
      localStorage.setItem('wordpad_debug_print_height', String(clamped));
    } catch {
      // ignore
    }
    if (debugLinkHeights) {
      setDebugPreviewHeight(clamped);
      try {
        localStorage.setItem('wordpad_debug_preview_height', String(clamped));
      } catch {
        // ignore
      }
    }
    setCacheVersion((v) => v + 1);
  };

  const handleApplyPreset = (prevH: number, printH: number, marg: PageMargin, buff: number = 0) => {
    setDebugPreviewHeight(prevH);
    setDebugPrintCapacityHeight(printH);
    setMargins(marg);
    setDebugBottomBuffer(buff);
    try {
      localStorage.setItem('wordpad_debug_preview_height', String(prevH));
      localStorage.setItem('wordpad_debug_print_height', String(printH));
      localStorage.setItem('wordpad_debug_bottom_buffer', String(buff));
    } catch {
      // ignore
    }
    if (onUpdateSettings) {
      onUpdateSettings({ margins: marg, pageSize: 'a4' });
    }
    setCacheVersion((v) => v + 1);
    showToast(`Applied preset: A4 ${marg} (${prevH}px)`);
  };

  const baseWidthPx = PAGE_WIDTH_LOOKUP[paperSize] || 794;
  const baseHeightPx = PAGE_HEIGHT_LOOKUP[paperSize] || 1430;

  // Visual paper height for on-screen simulated sheet
  const visualPreviewHeight =
    orientation === 'landscape'
      ? baseWidthPx
      : (debugPreviewHeight > 0 ? debugPreviewHeight : baseHeightPx);

  // Slicing capacity height for pagination calculation
  const sliceCapacityHeight =
    orientation === 'landscape'
      ? baseWidthPx
      : (debugPrintCapacityHeight > 0 ? debugPrintCapacityHeight : baseHeightPx);

  const printWidth = orientation === 'landscape' ? visualPreviewHeight : baseWidthPx;
  const printHeight = orientation === 'landscape' ? baseWidthPx : visualPreviewHeight;

  // Auto-fit document scaling based on preview container
  const computeFitPageScale = () => {
    if (!previewContainerRef.current) return 0.7;
    const containerH = previewContainerRef.current.clientHeight;
    const containerW = previewContainerRef.current.clientWidth;
    const scaleH = (containerH - 80) / visualPreviewHeight;
    const scaleW = (containerW - 80) / printWidth;
    return Math.max(0.35, Math.min(1.0, Number(Math.min(scaleH, scaleW).toFixed(2))));
  };

  const computeFitWidthScale = () => {
    if (!previewContainerRef.current) return 0.85;
    const containerW = previewContainerRef.current.clientWidth;
    const scale = (containerW - 90) / printWidth;
    return Math.max(0.4, Math.min(1.3, Number(scale.toFixed(2))));
  };

  // Cache version to force clean cache & preview re-renders
  const [cacheVersion, setCacheVersion] = useState<number>(0);

  // Auto-save document and clean caching on entering Print Workstation
  useEffect(() => {
    if (onSaveToLocalStorage) {
      onSaveToLocalStorage();
    }
    setCacheVersion((v) => v + 1);
  }, [onSaveToLocalStorage]);

  // Initial mount: Set Fit Width as default view
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewZoom(computeFitWidthScale());
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Adjust zoom on paperSize, orientation, or zoomMode change
  useEffect(() => {
    if (zoomMode === 'fit-page') {
      setPreviewZoom(computeFitPageScale());
    } else if (zoomMode === 'fit-width') {
      setPreviewZoom(computeFitWidthScale());
    }
  }, [paperSize, orientation, zoomMode]);

  // Calculate pages
  const calculatedPages = useMemo(() => {
    return calculateDocumentPages(editor, paperSize, orientation, 0);
  }, [editor, paperSize, orientation, cacheVersion]);

  // Margin padding in pixels (96 DPI standard: 1 inch = 96px, 0.5 inch = 48px)
  const marginLookup: Record<PageMargin, { top: number; right: number; bottom: number; left: number }> = {
    normal: { top: 96, right: 96, bottom: 96, left: 96 }, // 25.4mm = 1 inch
    narrow: { top: 48, right: 48, bottom: 48, left: 48 }, // 12.7mm = 0.5 inch
    moderate: { top: 96, right: 72, bottom: 96, left: 72 }, // 1in top/bottom, 0.75in left/right
    wide: { top: 96, right: 192, bottom: 96, left: 192 }, // 1in top/bottom, 2in left/right
    custom: { top: 76, right: 76, bottom: 76, left: 76 }, // 20mm
  };
  const activeMarginPadding = marginLookup[margins] || marginLookup.normal;

  // Effective printable page height (A4/Letter slice capacity minus margins, bottom safety buffer, kick overflow px, and header/footer space)
  const effectivePrintableHeight = Math.max(
    400,
    sliceCapacityHeight -
      activeMarginPadding.top -
      activeMarginPadding.bottom -
      debugBottomBuffer -
      kickOverflowPx -
      (doNotAddHeaderFooterToPrintArea ? 0 : (printHeadersFooters ? debugHeaderFooterOffset : 10))
  );

  // Smart Pagination: Slices document content for preview using the freshest local document state
  const pageSlicingResult = useMemo(() => {
    if (!editor) return { chunks: ['<p class="text-neutral-400 italic">No document content</p>'], heights: [0] };
    
    // Read freshest document HTML from localStorage or active editor
    let fullHtml = editor.getHTML();
    const locallySaved = localStorage.getItem('wordpad_document_content');
    if (locallySaved && locallySaved.trim()) {
      fullHtml = locallySaved;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');

    // 1. Sync live image attributes and inline styles from editor view DOM if available
    if (editor?.view?.dom) {
      const liveImages = Array.from(editor.view.dom.querySelectorAll('img'));
      const parsedImages = Array.from(doc.querySelectorAll('img'));
      parsedImages.forEach((img, idx) => {
        const src = img.getAttribute('src');
        const live = (src ? liveImages.find((li) => li.getAttribute('src') === src) : null) || liveImages[idx];
        if (live) {
          const liveWidth = live.style.width || live.getAttribute('data-width') || live.getAttribute('width');
          let liveAlign = live.getAttribute('data-alignment') || '';
          if (!liveAlign && live.parentElement?.style?.textAlign) {
            liveAlign = live.parentElement.style.textAlign;
          }
          if (!liveAlign) {
            if (live.style.marginLeft === 'auto' && live.style.marginRight === 'auto') liveAlign = 'center';
            else if (live.style.marginLeft === 'auto' && (live.style.marginRight === '0px' || live.style.marginRight === '0')) liveAlign = 'right';
            else if (live.style.marginRight === 'auto') liveAlign = 'left';
          }
          const liveFloat = live.getAttribute('data-float') || live.style.float;

          if (liveWidth) {
            img.style.width = liveWidth;
            img.style.maxWidth = '100%';
            img.setAttribute('data-width', liveWidth);
            img.setAttribute('width', liveWidth);
          }
          if (liveAlign) {
            img.setAttribute('data-alignment', liveAlign);
          }
          if (liveFloat) {
            img.setAttribute('data-float', liveFloat);
            img.style.float = liveFloat;
          }
        }
      });
    }

    // 2. Ensure all images preserve explicit inline alignment and sizing styles
    doc.querySelectorAll('img').forEach((img) => {
      let align = img.getAttribute('data-alignment') || '';
      if (!align && img.parentElement) {
        align = img.parentElement.style.textAlign || '';
        if (!align && img.parentElement.className) {
          if (img.parentElement.className.includes('has-text-align-center')) align = 'center';
          else if (img.parentElement.className.includes('has-text-align-right')) align = 'right';
          else if (img.parentElement.className.includes('has-text-align-left')) align = 'left';
        }
      }
      if (!align) {
        if (img.style.marginLeft === 'auto' && img.style.marginRight === 'auto') align = 'center';
        else if (img.style.marginLeft === 'auto' && (img.style.marginRight === '0px' || img.style.marginRight === '0')) align = 'right';
        else if (img.style.marginRight === 'auto') align = 'left';
      }

      const width = img.getAttribute('data-width') || img.getAttribute('width') || img.style.width || '';
      const floatVal = img.getAttribute('data-float') || img.style.float || '';

      if (width) {
        img.style.width = width;
        img.style.maxWidth = '100%';
        img.setAttribute('data-width', width);
        img.setAttribute('width', width);
      }
      if (align === 'center') {
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
        img.style.float = 'none';
        img.setAttribute('data-alignment', 'center');
        if (img.parentElement) {
          img.parentElement.style.textAlign = 'center';
        }
      } else if (align === 'right') {
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = '0';
        img.style.float = 'none';
        img.setAttribute('data-alignment', 'right');
        if (img.parentElement) {
          img.parentElement.style.textAlign = 'right';
        }
      } else if (align === 'left') {
        img.style.display = 'block';
        img.style.marginLeft = '0';
        img.style.marginRight = 'auto';
        img.style.float = 'none';
        img.setAttribute('data-alignment', 'left');
        if (img.parentElement) {
          img.parentElement.style.textAlign = 'left';
        }
      }
      if (floatVal === 'left') {
        img.style.float = 'left';
        img.style.margin = '0.5rem 1.25rem 0.75rem 0';
        img.style.display = 'inline-block';
        img.setAttribute('data-float', 'left');
      } else if (floatVal === 'right') {
        img.style.float = 'right';
        img.style.margin = '0.5rem 0 0.75rem 1.25rem';
        img.style.display = 'inline-block';
        img.setAttribute('data-float', 'right');
      }
    });

    const normalizedHtml = doc.body.innerHTML;

    // Check for explicit page breaks (.word-page-break)
    const breakRegex = /<hr[^>]*class="[^"]*word-page-break[^"]*"[^>]*>|<div[^>]*class="[^"]*word-page-break[^"]*"[^>]*><\/div>/gi;
    if (breakRegex.test(normalizedHtml)) {
      const parts = normalizedHtml.split(breakRegex).filter((p) => p.trim().length > 0);
      if (parts.length > 0) return { chunks: parts, heights: parts.map(() => 0) };
    }

    // Split blocks across real physical page heights so the full printable page is utilized
    const children = Array.from(doc.body.children);
    if (children.length <= 1) return { chunks: [normalizedHtml], heights: [0] };

    const liveChildren = editor?.view?.dom ? Array.from(editor.view.dom.children) : [];

    const getElHeight = (el: Element, liveEl?: HTMLElement): number => {
      if (liveEl && liveEl.offsetHeight > 0 && liveEl.offsetHeight < 1200) {
        const style = window.getComputedStyle(liveEl);
        const mt = Math.min(20, parseFloat(style.marginTop) || 0);
        const mb = Math.min(20, parseFloat(style.marginBottom) || 0);
        return liveEl.offsetHeight + mt + mb;
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'h1') return 44;
      if (tag === 'h2') return 36;
      if (tag === 'h3') return 30;
      if (tag === 'h4' || tag === 'h5' || tag === 'h6') return 24;
      if (tag === 'hr') return 16;
      if (tag === 'ul' || tag === 'ol') {
        const items = el.querySelectorAll('li').length;
        return Math.max(28, items * 20 + 8);
      }
      if (tag === 'table') {
        const rows = el.querySelectorAll('tr').length;
        return Math.max(50, rows * 26 + 16);
      }
      if (tag === 'img') {
        const h = (el as HTMLElement).style.height || el.getAttribute('height');
        return h ? parseFloat(h) || 220 : 220;
      }
      const text = el.textContent || '';
      const lines = Math.max(1, Math.ceil(text.length / 95));
      return lines * 19 + 6;
    };

    const pages: string[] = [];
    const heights: number[] = [];
    let currentChunk: string[] = [];
    let currentHeight = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const liveEl = liveChildren[i] as HTMLElement | undefined;

      const isPageBreak =
        child.classList.contains('word-page-break') ||
        (child.tagName.toLowerCase() === 'hr' && child.className.includes('word-page-break')) ||
        Boolean(child.querySelector('.word-page-break')) ||
        child.classList.contains('word-blank-page');

      if (isPageBreak) {
        if (currentChunk.length > 0) {
          pages.push(currentChunk.join(''));
          heights.push(currentHeight);
          currentChunk = [];
          currentHeight = 0;
        }
        continue;
      }

      const elHeight = getElHeight(child, liveEl);
      const isHeading = /^H[1-6]$/i.test(child.tagName);

      // Orphan heading protection: do not leave a heading alone at the bottom of a page without its content
      const nextChild = children[i + 1];
      const nextElHeight = nextChild ? getElHeight(nextChild, liveChildren[i + 1] as HTMLElement | undefined) : 0;
      const wouldOrphanHeading = isHeading && (
        effectivePrintableHeight - currentHeight < 80 ||
        (currentHeight + elHeight + Math.min(50, nextElHeight) > effectivePrintableHeight)
      );

      if (currentHeight > 0 && (currentHeight + elHeight > effectivePrintableHeight || wouldOrphanHeading)) {
        pages.push(currentChunk.join(''));
        heights.push(currentHeight);
        currentChunk = [];
        currentHeight = 0;
      }

      currentChunk.push(child.outerHTML);
      currentHeight += elHeight;
    }

    if (currentChunk.length > 0) {
      pages.push(currentChunk.join(''));
      heights.push(currentHeight);
    }

    return {
      chunks: pages.length > 0 ? pages : [normalizedHtml],
      heights: heights.length > 0 ? heights : [currentHeight],
    };
  }, [
    editor,
    sliceCapacityHeight,
    activeMarginPadding.top,
    activeMarginPadding.bottom,
    debugBottomBuffer,
    kickOverflowPx,
    debugHeaderFooterOffset,
    printHeadersFooters,
    doNotAddHeaderFooterToPrintArea,
    cacheVersion,
  ]);

  const pageChunks = pageSlicingResult.chunks;
  const pageChunkHeights = pageSlicingResult.heights;
  const totalPages = Math.max(1, pageChunks.length);
  const activeChunkHeight = pageChunkHeights[currentPage - 1] || pageChunkHeights[0] || 0;

  // Ensure current page is in bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const activePageHtml = pageChunks[currentPage - 1] || pageChunks[0] || '';

  // Smart Document Info values for dropdown insert
  const smartDocValues: SmartDocValues = useMemo(() => {
    const now = new Date();
    const t = docTitle || settings.title || 'Document';
    return {
      title: t,
      author: docAuthor || settings.author || 'Author',
      date: now.toLocaleDateString(),
      filename: `${(t || 'Document').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'document'}.docx`,
      tag: settings.tags || settings.category || 'Draft',
      created: settings.createdDate || now.toLocaleDateString(),
      updated: settings.updatedDate || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }, [docTitle, docAuthor, settings.title, settings.author, settings.tags, settings.category, settings.createdDate, settings.updatedDate]);

  const handleUpdateTitle = (val: string) => {
    setDocTitle(val);
    updateSettingsAndParent({ title: val });
  };

  const handleUpdateAuthor = (val: string) => {
    setDocAuthor(val);
    updateSettingsAndParent({ author: val });
  };

  const handleUpdateWatermark = (val: string) => {
    setDocWatermark(val);
    updateSettingsAndParent({
      customWatermark: val,
      watermark: val.trim() ? 'Your Mark' : '',
    });
  };

  const handleToggleShowHeader = (checked: boolean) => {
    setShowHeader(checked);
    updateSettingsAndParent({
      showHeader: checked,
      showHeaderFooter: checked || showFooter,
    });
  };

  const handleToggleShowFooter = (checked: boolean) => {
    setShowFooter(checked);
    updateSettingsAndParent({
      showFooter: checked,
      showHeaderFooter: showHeader || checked,
    });
  };

  const handleUpdateHeaderLeft = (val: string) => {
    setHeaderLeftValue(val);
    updateSettingsAndParent({ headerLeft: val });
  };

  const handleToggleHeaderPages = () => {
    if (headerPageNumState === 0 && headerPageMaxState === 0) {
      setHeaderShowPagesState(true);
      setHeaderPageNumState(1);
      setHeaderPageMaxState(1);
      updateSettingsAndParent({ headerShowPages: true, headerPageStart: 1, headerPageTotal: 1 });
    } else {
      const next = !headerShowPagesState;
      setHeaderShowPagesState(next);
      if (!next) {
        setHeaderPageNumState(0);
        setHeaderPageMaxState(0);
        updateSettingsAndParent({ headerShowPages: false, headerPageStart: 0, headerPageTotal: 0 });
      } else {
        setHeaderPageNumState(1);
        setHeaderPageMaxState(1);
        updateSettingsAndParent({ headerShowPages: true, headerPageStart: 1, headerPageTotal: 1 });
      }
    }
  };

  const handleToggleHeaderPageStart = () => {
    const next = headerPageNumState === 1 ? 0 : 1;
    setHeaderPageNumState(next);
    const shouldShow = next === 1 || headerPageMaxState === 1;
    setHeaderShowPagesState(shouldShow);
    updateSettingsAndParent({ headerPageStart: next, headerShowPages: shouldShow });
  };

  const cycleHeaderSep = () => {
    const seps = ['-', 'of', '/', ''];
    const idx = seps.indexOf(headerPageSepState);
    const next = seps[(idx + 1) % seps.length];
    setHeaderPageSepState(next);
    updateSettingsAndParent({ headerPageSeparator: next });
  };

  const handleToggleHeaderPageTotal = () => {
    const next = headerPageMaxState === 1 ? 0 : 1;
    setHeaderPageMaxState(next);
    const shouldShow = headerPageNumState === 1 || next === 1;
    setHeaderShowPagesState(shouldShow);
    updateSettingsAndParent({ headerPageTotal: next, headerShowPages: shouldShow });
  };

  const handleUpdateHeaderRight = (val: string) => {
    setHeaderRightValue(val);
    updateSettingsAndParent({ headerRight: val });
  };

  const handleUpdateFooterLeft = (val: string) => {
    setFooterLeftValue(val);
    updateSettingsAndParent({ footerLeft: val });
  };

  const handleToggleFooterPages = () => {
    if (footerPageNumState === 0 && footerPageMaxState === 0) {
      setFooterShowPagesState(true);
      setFooterPageNumState(1);
      setFooterPageMaxState(1);
      updateSettingsAndParent({ footerShowPages: true, footerPageStart: 1, footerPageTotal: 1 });
    } else {
      const next = !footerShowPagesState;
      setFooterShowPagesState(next);
      if (!next) {
        setFooterPageNumState(0);
        setFooterPageMaxState(0);
        updateSettingsAndParent({ footerShowPages: false, footerPageStart: 0, footerPageTotal: 0 });
      } else {
        setFooterPageNumState(1);
        setFooterPageMaxState(1);
        updateSettingsAndParent({ footerShowPages: true, footerPageStart: 1, footerPageTotal: 1 });
      }
    }
  };

  const handleToggleFooterPageStart = () => {
    const next = footerPageNumState === 1 ? 0 : 1;
    setFooterPageNumState(next);
    const shouldShow = next === 1 || footerPageMaxState === 1;
    setFooterShowPagesState(shouldShow);
    updateSettingsAndParent({ footerPageStart: next, footerShowPages: shouldShow });
  };

  const cycleFooterSep = () => {
    const seps = ['-', 'of', '/', ''];
    const idx = seps.indexOf(footerPageSepState);
    const next = seps[(idx + 1) % seps.length];
    setFooterPageSepState(next);
    updateSettingsAndParent({ footerPageSeparator: next });
  };

  const handleToggleFooterPageTotal = () => {
    const next = footerPageMaxState === 1 ? 0 : 1;
    setFooterPageMaxState(next);
    const shouldShow = footerPageNumState === 1 || next === 1;
    setFooterShowPagesState(shouldShow);
    updateSettingsAndParent({ footerPageTotal: next, footerShowPages: shouldShow });
  };

  const handleUpdateFooterRight = (val: string) => {
    setFooterRightValue(val);
    updateSettingsAndParent({ footerRight: val });
  };

  const handleSaveSetup = () => {
    const updated: Partial<DocumentSettings> = {
      title: docTitle,
      author: docAuthor,
      customWatermark: docWatermark,
      watermark: docWatermark.trim() ? 'Your Mark' : '',
      showHeader,
      showFooter,
      showHeaderFooter: showHeader || showFooter,
      headerLeft: headerLeftValue,
      headerShowPages: headerShowPagesState,
      headerPageStart: headerPageNumState,
      headerPageSeparator: headerPageSepState,
      headerPageTotal: headerPageMaxState,
      headerRight: headerRightValue,
      footerLeft: footerLeftValue,
      footerShowPages: footerShowPagesState,
      footerPageStart: footerPageNumState,
      footerPageSeparator: footerPageSepState,
      footerPageTotal: footerPageMaxState,
      footerRight: footerRightValue,
      pageSize: paperSize,
      orientation,
      margins,
      kickOverflowPx,
      doNotAddHeaderFooterToPrintArea,
    };
    updateSettingsAndParent(updated);
    try {
      localStorage.setItem('wordpad_kick_overflow_px', String(kickOverflowPx));
      localStorage.setItem('wordpad_do_not_add_hf_to_print_area', String(doNotAddHeaderFooterToPrintArea));
    } catch {
      // ignore
    }
    if (onSaveToLocalStorage) {
      onSaveToLocalStorage();
    }
    setCacheVersion((v) => v + 1);
    setJustSavedSetup(true);
    showToast('Document Info & Page Setup saved locally!');
    setTimeout(() => setJustSavedSetup(false), 2500);
  };

  // Check if middle field has val 1 (if get val 1 print pagination)
  const headerHasPagination = headerPageNumState === 1 || headerPageMaxState === 1;

  // Smart Header & Footer Active States - strictly derived from user's explicit setup (no unwanted fallbacks like "Add Left Text" or "Add Right Text")
  const isHeaderActive = showHeader && Boolean(
    headerLeftValue.trim() ||
    headerRightValue.trim() ||
    headerHasPagination
  );

  const smartHeaderLeft = isHeaderActive ? resolveSmartText(headerLeftValue.trim(), smartDocValues) : '';
  const smartHeaderRight = isHeaderActive ? resolveSmartText(headerRightValue.trim(), smartDocValues) : '';
  const smartHeaderPageText = (isHeaderActive && headerHasPagination)
    ? formatSmartPageText({
        showPages: true,
        pageState: headerPageNumState,
        maxState: headerPageMaxState,
        separator: headerPageSepState,
        currentPage,
        totalPages,
      })
    : '';

  // Check if middle field has val 1 (if get val 1 print pagination)
  const footerHasPagination = footerPageNumState === 1 || footerPageMaxState === 1;

  const isFooterActive = showFooter && Boolean(
    footerLeftValue.trim() ||
    footerRightValue.trim() ||
    footerHasPagination
  );

  const smartFooterLeft = isFooterActive ? resolveSmartText(footerLeftValue.trim(), smartDocValues) : '';
  const smartFooterRight = isFooterActive ? resolveSmartText(footerRightValue.trim(), smartDocValues) : '';
  const smartFooterPageText = (isFooterActive && footerHasPagination)
    ? formatSmartPageText({
        showPages: true,
        pageState: footerPageNumState,
        maxState: footerPageMaxState,
        separator: footerPageSepState,
        currentPage,
        totalPages,
      })
    : '';

  // Pages to print based on page range mode ('all', 'current', 'custom')
  const pagesToPrint = useMemo(() => {
    if (pageRangeMode === 'current') {
      const idx = Math.max(0, Math.min(pageChunks.length - 1, currentPage - 1));
      return [{ chunk: pageChunks[idx], pageNum: idx + 1 }];
    }
    if (pageRangeMode === 'custom') {
      const indices = new Set<number>();
      const parts = customRange.split(',').map((p) => p.trim());
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
          if (!isNaN(startStr) && !isNaN(endStr)) {
            for (let i = startStr; i <= endStr; i++) {
              if (i >= 1 && i <= pageChunks.length) indices.add(i);
            }
          }
        } else {
          const n = parseInt(part, 10);
          if (!isNaN(n) && n >= 1 && n <= pageChunks.length) indices.add(n);
        }
      }
      if (indices.size > 0) {
        return Array.from(indices)
          .sort((a, b) => a - b)
          .map((p) => ({ chunk: pageChunks[p - 1], pageNum: p }));
      }
    }
    // Default: 'all'
    return pageChunks.map((chunk, idx) => ({ chunk, pageNum: idx + 1 }));
  }, [pageRangeMode, customRange, currentPage, pageChunks]);

  // Execute smart print
  const handleTriggerPrint = () => {
    setIsSpooling(true);
    showToast('Applying CSS print formatting and launching print spooler...');

    // Save settings if changed
    if (onUpdateSettings) {
      onUpdateSettings({
        pageSize: paperSize,
        orientation,
        margins,
      });
    }

    // Execute with dynamic stylesheet injection (including table CSS print formatting)
    executePrintToPdf(
      {
        pageSize: paperSize,
        orientation,
        margins,
        printBackgrounds: printBackgroundGraphics,
        highContrast: highContrastMode,
        documentTitle: settings.title || 'Document',
        tablePrintWidth,
        tableBetterViewGrids,
        printHeadersFooters,
      },
      () => {
        // Keep PrintBackstageSection mounted so dedicated print sheets remain in DOM!
      },
      () => {
        setIsSpooling(false);
        showToast('Print spooling finished');
      }
    );
  };

  const escapeHtml = (str: string): string => {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // Dedicated Print Preview Engine: prints the preview pages one by one via isolated sandbox
  const handlePrintPreviewPages = () => {
    setIsSpooling(true);
    showToast('Spooling exact preview pages to isolated print engine...');

    const sheetsHtml = pagesToPrint
      .map(({ chunk, pageNum }) => {
        const hPageText = isHeaderActive && headerHasPagination
          ? formatSmartPageText({
              showPages: true,
              pageState: headerPageNumState,
              maxState: headerPageMaxState,
              separator: headerPageSepState,
              currentPage: pageNum,
              totalPages: pageChunks.length,
            })
          : '';

        const fPageText = isFooterActive && footerHasPagination
          ? formatSmartPageText({
              showPages: true,
              pageState: footerPageNumState,
              maxState: footerPageMaxState,
              separator: footerPageSepState,
              currentPage: pageNum,
              totalPages: pageChunks.length,
            })
          : '';

        const isHeaderVisible = printHeadersFooters && isHeaderActive && Boolean(smartHeaderLeft || hPageText || smartHeaderRight);
        const headerHtml = isHeaderVisible
          ? `<div class="page-header ${doNotAddHeaderFooterToPrintArea ? 'header-in-margin' : ''}" style="${
              doNotAddHeaderFooterToPrintArea
                ? `position: absolute; top: ${Math.max(6, Math.round(activeMarginPadding.top * 0.22))}px; left: ${activeMarginPadding.left}px; right: ${activeMarginPadding.right}px; margin: 0; padding-bottom: 4px;`
                : ''
            }">
              <span style="max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
                ${escapeHtml(smartHeaderLeft)}
              </span>
              <span style="font-weight: 700; color: #334155;">
                ${escapeHtml(hPageText)}
              </span>
              <span style="max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; font-weight: 500;">
                ${escapeHtml(smartHeaderRight)}
              </span>
            </div>`
          : '';

        const isFooterVisible = printHeadersFooters && isFooterActive && Boolean(smartFooterLeft || fPageText || smartFooterRight);
        const footerHtml = isFooterVisible
          ? `<div class="page-footer ${doNotAddHeaderFooterToPrintArea ? 'footer-in-margin' : ''}" style="${
              doNotAddHeaderFooterToPrintArea
                ? `position: absolute; bottom: ${Math.max(6, Math.round(activeMarginPadding.bottom * 0.22))}px; left: ${activeMarginPadding.left}px; right: ${activeMarginPadding.right}px; margin: 0; padding-top: 4px;`
                : ''
            }">
              <span style="max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">
                ${escapeHtml(smartFooterLeft)}
              </span>
              <span style="font-weight: 700; color: #0f172a;">
                ${escapeHtml(fPageText)}
              </span>
              <span style="max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; font-weight: 500;">
                ${escapeHtml(smartFooterRight)}
              </span>
            </div>`
          : '';

        const watermarkHtml = docWatermark.trim()
          ? `<div class="watermark-overlay"><span class="watermark-text">${escapeHtml(docWatermark.trim())}</span></div>`
          : '';

        return `
          <div class="page-sheet">
            ${watermarkHtml}
            ${headerHtml}
            <div class="page-body ProseMirror print-preview-body ${tableBetterViewGrids ? 'preview-better-grids' : ''}" style="position: relative; z-index: 1;">
              ${chunk}
            </div>
            ${footerHtml}
          </div>
        `;
      })
      .join('\n');

    const targetWidth = tablePrintWidth === '90%' ? '90%' : '100%';

    const fullDocHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle || 'Print Preview')}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
  <style>
    @page {
      size: ${paperSize.toUpperCase()} ${orientation};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
    }
    /* Natural Math Formulas (Zero-buttonize, Print-ready) */
    .tiptap-math-inline,
    span[data-type="math-inline"] {
      display: inline-flex !important;
      align-items: center !important;
      vertical-align: middle !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 0.15em !important;
      color: #000000 !important;
    }
    .tiptap-math-block,
    div[data-type="math-block"] {
      display: block !important;
      text-align: center !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0.35em 0 !important;
      margin: 0.5em 0 !important;
      color: #000000 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .tiptap-math-inline .katex,
    .tiptap-math-block .katex {
      color: #000000 !important;
    }
    .page-sheet {
      width: 100vw;
      min-height: 100vh;
      height: 100vh;
      position: relative;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: flex;
      flex-direction: column;
      justify-content: ${doNotAddHeaderFooterToPrintArea ? 'flex-start' : 'space-between'};
      padding-top: ${activeMarginPadding.top}px;
      padding-right: ${activeMarginPadding.right}px;
      padding-bottom: ${activeMarginPadding.bottom}px;
      padding-left: ${activeMarginPadding.left}px;
      background: #ffffff;
      box-sizing: border-box;
      overflow: hidden;
    }
    .page-sheet:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .watermark-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .watermark-text {
      font-size: 54pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(203, 213, 225, 0.35);
      transform: rotate(-45deg);
      white-space: nowrap;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 16px;
      font-size: 11px;
      color: #64748b;
      flex-shrink: 0;
    }
    .header-in-margin {
      border-bottom: 1px solid #cbd5e1 !important;
      margin-bottom: 0 !important;
      z-index: 20;
    }
    .footer-in-margin {
      border-top: 1px solid #cbd5e1 !important;
      margin-top: 0 !important;
      z-index: 20;
    }
    .page-body {
      flex: 1 1 auto;
      height: ${doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : 'auto'};
      max-height: ${doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : 'none'};
      overflow: hidden;
    }
    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 16px;
      font-size: 11px;
      color: #64748b;
      flex-shrink: 0;
    }
    .tableWrapper {
      width: 100% !important;
      max-width: 100% !important;
      margin: 14px 0 !important;
    }
    table {
      width: ${targetWidth} !important;
      max-width: ${targetWidth} !important;
      min-width: ${targetWidth} !important;
      margin-left: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
      margin-right: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
      border-collapse: collapse !important;
      border: 1.5px solid #111827 !important;
      table-layout: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    col {
      width: auto !important;
    }
    th, td {
      border: 1px solid #111827 !important;
      padding: 8px 12px !important;
      min-width: 60px !important;
      word-break: normal !important;
      vertical-align: top !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      page-break-after: avoid;
      break-after: avoid;
    }
    blockquote {
      margin: 14px 0;
      padding: 10px 16px;
      border-left: 4px solid #64748b;
      background: #f8fafc;
      border-radius: 0 6px 6px 0;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    [data-quick-block="button"] a {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
    }
    /* Images formatting, sizing and alignment */
    img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 4px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    img[data-alignment="left"],
    img[style*="margin-left: 0"],
    p[style*="text-align: left"] img,
    .has-text-align-left img {
      display: block !important;
      margin-left: 0 !important;
      margin-right: auto !important;
    }
    img[data-alignment="center"],
    img[style*="margin-left: auto"][style*="margin-right: auto"],
    p[style*="text-align: center"] img,
    .has-text-align-center img {
      display: block !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    img[data-alignment="right"],
    img[style*="margin-right: 0"],
    p[style*="text-align: right"] img,
    .has-text-align-right img {
      display: block !important;
      margin-left: auto !important;
      margin-right: 0 !important;
    }
    img[data-float="left"] {
      float: left !important;
      margin: 0.5rem 1.25rem 0.75rem 0 !important;
      display: inline-block !important;
    }
    img[data-float="right"] {
      float: right !important;
      margin: 0.5rem 0 0.75rem 1.25rem !important;
      display: inline-block !important;
    }
    img[data-float="none"] {
      float: none !important;
    }
    p[style*="text-align: center"],
    .has-text-align-center {
      text-align: center !important;
    }
    p[style*="text-align: right"],
    .has-text-align-right {
      text-align: right !important;
    }
    p[style*="text-align: left"],
    .has-text-align-left {
      text-align: left !important;
    }
    p[style*="text-align: justify"],
    .has-text-align-justify {
      text-align: justify !important;
    }
  </style>
</head>
<body>
  ${sheetsHtml}
</body>
</html>`;

    // Create hidden iframe for isolated clean printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      setIsSpooling(false);
      return;
    }

    doc.open();
    doc.write(fullDocHtml);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print preview failed:', err);
      } finally {
        setIsSpooling(false);
        showToast('Print Preview pages sent to printer');
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-neutral-800 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-neutral-200 px-8 py-3.5 shrink-0 shadow-2xs flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#185abd] text-white rounded-lg shadow-xs">
            <Printer size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-neutral-900 leading-tight">ULTIMATE Print Workstation</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-[#185abd] px-2 py-0.5 rounded-full">
                Smart Setup
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Interactive print preview &bull; Smart header/footer reader &bull; A4 simulation &bull; CSS table print formatting
            </p>
          </div>
        </div>

        {/* Quick jump to dedicated PDF engine */}
        {onSwitchToPdfTab && (
          <button
            onClick={onSwitchToPdfTab}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#dc2626] border border-red-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Open dedicated ISO 32000 PDF Vector Engine"
          >
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span>PDF Vector Engine</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-blue-50 border-b border-blue-200 px-8 py-2 text-xs font-semibold text-[#185abd] flex items-center space-x-2 animate-fadeIn shrink-0 no-print">
          <CheckCircle2 size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden no-print">
        {/* Left Column: Print Controls & Settings (Fixed width, scrollable) */}
        <div className="w-80 md:w-96 border-r border-neutral-200 bg-white overflow-y-auto p-5 space-y-5 shrink-0 shadow-xs">
          {/* Big Print Buttons and Copies Counter */}
          <div className="space-y-2.5 pb-4 border-b border-neutral-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleTriggerPrint}
                disabled={isSpooling}
                className="flex-1 py-3 px-4 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0c3979] text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-75 active:scale-98"
                title="Browser Print (Ctrl+P)"
              >
                <Printer size={18} />
                <span>{isSpooling ? 'Spooling...' : 'Browser Print'}</span>
              </button>

              <div className="flex flex-col items-center border border-neutral-300 rounded-xl px-2.5 py-1 bg-neutral-50 shadow-2xs">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Copies</span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <button
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-5 h-5 flex items-center justify-center bg-white border border-neutral-200 rounded text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{copies}</span>
                  <button
                    onClick={() => setCopies(Math.min(99, copies + 1))}
                    className="w-5 h-5 flex items-center justify-center bg-white border border-neutral-200 rounded text-xs font-bold hover:bg-neutral-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Nedit Print one by one */}
            <button
              onClick={handlePrintPreviewPages}
              disabled={isSpooling}
              className="w-full py-2.5 px-4 bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-75 active:scale-98"
              title="Browers Print setings A4 margin None"
            >
              <Eye size={17} />
              <span>Nedit Print one by one</span>
            </button>

            {/* Parameter: Kick overflow lines to next page (px) */}
            <div className="pt-2 border-t border-neutral-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[11px] text-neutral-800 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Kick overflow lines to next page</span>
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  kickOverflowPx < 0
                    ? 'bg-emerald-100 text-emerald-900'
                    : kickOverflowPx > 0
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {kickOverflowPx > 0 ? `+${kickOverflowPx}px` : `${kickOverflowPx}px`}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="relative w-18 shrink-0">
                  <input
                    type="number"
                    min={-300}
                    max={300}
                    step={1}
                    value={kickOverflowPx}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleUpdateKickOverflowPx(isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-2 py-1 pr-6 bg-white border border-neutral-300 rounded font-mono text-xs font-bold text-neutral-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <span className="absolute right-1 top-1 text-[9px] text-neutral-400 pointer-events-none">px</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateKickOverflowPx(kickOverflowPx - 10)}
                  className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                  title="-10px: Add lines to page (e.g. -10px adds line to last of page)"
                >
                  -10px
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateKickOverflowPx(kickOverflowPx - 1)}
                  className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                  title="-1px: Add lines to page"
                >
                  -1px
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateKickOverflowPx(kickOverflowPx + 1)}
                  className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                  title="+1px: Kick overflow lines to next page"
                >
                  +1px
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateKickOverflowPx(kickOverflowPx + 10)}
                  className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                  title="+10px: Kick overflow lines to next page"
                >
                  +10px
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateKickOverflowPx(0)}
                  className={`px-1 py-1 rounded font-bold text-[10px] cursor-pointer transition-colors ${
                    kickOverflowPx === 0
                      ? 'bg-neutral-200 text-neutral-800'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                  title="Reset to 0px"
                >
                  0
                </button>
              </div>
              <div className="text-[10px] text-neutral-500 mt-1 flex items-center justify-between">
                <span>{kickOverflowPx < 0 ? 'Adds lines to bottom of page' : kickOverflowPx > 0 ? 'Kicks overflow lines to next page' : 'Default line pagination'}</span>
                {kickOverflowPx !== 40 && (
                  <button
                    type="button"
                    onClick={() => handleUpdateKickOverflowPx(40)}
                    className="text-[9px] text-[#185abd] hover:underline font-semibold cursor-pointer"
                  >
                    Quick 40px
                  </button>
                )}
              </div>
            </div>

            {/* Checkbox: do not add header and footer to printing area */}
            <div className="pt-2 border-t border-neutral-200/80">
              <label className="flex items-start space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={doNotAddHeaderFooterToPrintArea}
                  onChange={(e) => handleUpdateDoNotAddHeaderFooterToPrintArea(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-bold text-[11px] text-neutral-800 block">
                    do not add header and footer to printing area
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-tight mt-0.5">
                    Put header text inside top margin, put footer text inside bottom margin (browser print method)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 1: Interactive INFO & PAGE SETUP with Direct Editable Textboxes */}
          <div className="space-y-3 p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            {/* Header with Smart Sync badge & Save button */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider text-neutral-800">
                <FileText size={15} className="text-[#185abd]" />
                <span>INFO &amp; PAGE SETUP</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleSaveSetup}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-[#185abd] hover:bg-[#114b9c] text-white rounded cursor-pointer transition-all flex items-center space-x-1 shadow-2xs active:scale-95"
                  title="Save parameters directly to document & database without leaving ULTIMATE Print Workstation"
                >
                  {justSavedSetup ? <Check size={11} /> : <Save size={11} />}
                  <span>{justSavedSetup ? 'Saved!' : 'Save'}</span>
                </button>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <CheckCircle2 size={11} />
                  <span>Smart Sync</span>
                </span>
              </div>
            </div>

            {/* Row: Title & Author editable textboxes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1 border border-neutral-300 rounded-md px-2 py-1 bg-white hover:border-neutral-400 focus-within:border-[#185abd] transition-colors">
                <span className="text-neutral-400 text-[11px] font-medium shrink-0">Title:</span>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => handleUpdateTitle(e.target.value)}
                  placeholder="Document Title"
                  className="w-full text-xs font-semibold text-neutral-900 bg-transparent outline-none truncate"
                  title="Document Title"
                />
              </div>

              <div className="flex items-center space-x-1 border border-neutral-300 rounded-md px-2 py-1 bg-white hover:border-neutral-400 focus-within:border-[#185abd] transition-colors">
                <span className="text-neutral-400 text-[11px] font-medium shrink-0">Author:</span>
                <input
                  type="text"
                  value={docAuthor}
                  onChange={(e) => handleUpdateAuthor(e.target.value)}
                  placeholder="Author Name"
                  className="w-full text-xs font-semibold text-neutral-900 bg-transparent outline-none truncate"
                  title="Author Name"
                />
              </div>
            </div>

            {/* Row: Top Header Editable Controls (Header Left | Pages 1 - 1 | Header Right) */}
            <div className={`flex items-center justify-between gap-1.5 text-xs pt-0.5 transition-opacity ${showHeader ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {/* Header Left Smart Dropdown Textbox */}
              <SmartHeaderFooterInput
                value={headerLeftValue}
                onChange={handleUpdateHeaderLeft}
                placeholder="Header Left"
                title="Header Left Text (Type or Quick Insert)"
                className="w-[31%]"
                dropdownAlign="left"
                smartValues={smartDocValues}
                disabled={!showHeader}
              />

              {/* Header Center Pages Controls */}
              <div className="flex items-center space-x-0.5 shrink-0" title="Header Page Numbers Configuration">
                <button
                  type="button"
                  onClick={handleToggleHeaderPages}
                  className={`border text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-2xs ${
                    headerShowPagesState
                      ? 'bg-[#185abd] border-[#185abd] text-white font-bold'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                  title="Toggle Header Page Numbers (Blue = Active)"
                >
                  Pages
                </button>

                <button
                  type="button"
                  onClick={handleToggleHeaderPageStart}
                  className={`border text-[11px] w-6 py-0.5 rounded text-center font-bold cursor-pointer transition-colors shadow-2xs ${
                    headerPageNumState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/70 font-black'
                      : 'border-neutral-300 text-neutral-400 bg-neutral-100'
                  }`}
                  title="Page Counter State: 1 = Active, 0 = Off. Click to toggle"
                >
                  {headerPageNumState}
                </button>

                <button
                  type="button"
                  onClick={cycleHeaderSep}
                  className={`border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-[11px] px-1 py-0.5 rounded font-mono font-bold cursor-pointer min-w-[20px] shadow-2xs ${
                    headerPageSepState === '' ? 'bg-amber-50 text-neutral-400 italic' : 'bg-white'
                  }`}
                  title={`Separator: ${headerPageSepState === '' ? 'Empty (none)' : `"${headerPageSepState}"`}. Click to cycle: '-' | 'of' | '/' | none`}
                >
                  {headerPageSepState || '∅'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleHeaderPageTotal}
                  className={`border text-[11px] w-6 py-0.5 rounded text-center font-bold cursor-pointer transition-colors shadow-2xs ${
                    headerPageMaxState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/70 font-black'
                      : 'border-neutral-300 text-neutral-400 bg-neutral-100'
                  }`}
                  title="Total Pages State: 1 = Active, 0 = Off. Click to toggle"
                >
                  {headerPageMaxState}
                </button>
              </div>

              {/* Header Right Smart Dropdown Textbox */}
              <SmartHeaderFooterInput
                value={headerRightValue}
                onChange={handleUpdateHeaderRight}
                placeholder="Header Right"
                title="Header Right Text (Type or Quick Insert)"
                className="w-[31%]"
                dropdownAlign="right"
                smartValues={smartDocValues}
                disabled={!showHeader}
              />
            </div>

            {/* Miniature Document Card (Matches user reference card) */}
            <div className="w-full bg-white border-2 border-neutral-900 rounded-[3px] p-3 flex flex-col justify-between relative shadow-[4px_4px_0px_rgba(17,24,39,0.9)] select-none">
              {/* Card Top: Header Checkbox */}
              <div className="flex items-center justify-center border-b border-neutral-200 pb-1.5">
                <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-neutral-900 hover:text-[#185abd] transition-colors">
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(e) => handleToggleShowHeader(e.target.checked)}
                    className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer"
                  />
                  <span className="text-xs font-bold">Header</span>
                </label>
              </div>

              {/* Watermark Setup Row (Red label and box matching user screenshot) */}
              <div className="flex items-center justify-center space-x-2 py-2 z-10">
                <span className="text-xs font-bold text-red-600 select-none">Watermark</span>
                <input
                  type="text"
                  placeholder="Set your watermark here"
                  value={docWatermark}
                  onChange={(e) => handleUpdateWatermark(e.target.value)}
                  className="border-2 border-red-500 bg-white text-neutral-900 text-xs px-2.5 py-1 rounded-md w-48 text-center placeholder:text-neutral-400 focus:outline-none focus:border-red-600 shadow-2xs font-semibold"
                  title="Type watermark text to stamp on printed pages"
                />
              </div>

              {/* Stylized Document Paragraph Lines */}
              <div className="space-y-2.5 px-2 my-1 relative">
                {/* Watermark Ghost in Mini Preview */}
                {docWatermark.trim() && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
                    <span className="text-lg font-black uppercase tracking-widest text-neutral-300/40 -rotate-25 whitespace-nowrap">
                      {docWatermark.trim()}
                    </span>
                  </div>
                )}

                {/* Paragraph 1 */}
                <div className="space-y-1 relative z-10">
                  <div className="h-1.5 w-1/3 bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-1/4 bg-neutral-900 rounded-full" />
                </div>

                {/* Paragraph 2 */}
                <div className="space-y-1 relative z-10">
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-1/2 bg-neutral-900 rounded-full" />
                </div>

                {/* Paragraph 3 */}
                <div className="space-y-1 relative z-10">
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-full bg-neutral-900 rounded-full" />
                  <div className="h-1.5 w-1/3 bg-neutral-900 rounded-full" />
                </div>
              </div>

              {/* Card Bottom: Footer Checkbox */}
              <div className="flex items-center justify-center border-t border-neutral-200 pt-1.5">
                <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-xs text-neutral-900 hover:text-[#185abd] transition-colors">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={(e) => handleToggleShowFooter(e.target.checked)}
                    className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer"
                  />
                  <span className="text-xs font-bold">Footer</span>
                </label>
              </div>
            </div>

            {/* Row: Bottom Footer Editable Controls (Footer Left | Pages 1 - 1 | Footer Right) */}
            <div className={`flex items-center justify-between gap-1.5 text-xs pt-0.5 transition-opacity ${showFooter ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              {/* Footer Left Smart Dropdown Textbox */}
              <SmartHeaderFooterInput
                value={footerLeftValue}
                onChange={handleUpdateFooterLeft}
                placeholder="Footer Left"
                title="Footer Left Text (Type or Quick Insert)"
                className="w-[31%]"
                dropdownAlign="left"
                smartValues={smartDocValues}
                disabled={!showFooter}
              />

              {/* Footer Center Pages Controls */}
              <div className="flex items-center space-x-0.5 shrink-0" title="Footer Page Numbers Configuration">
                <button
                  type="button"
                  onClick={handleToggleFooterPages}
                  className={`border text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-2xs ${
                    footerShowPagesState
                      ? 'bg-[#185abd] border-[#185abd] text-white font-bold'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                  title="Toggle Footer Page Numbers (Blue = Active)"
                >
                  Pages
                </button>

                <button
                  type="button"
                  onClick={handleToggleFooterPageStart}
                  className={`border text-[11px] w-6 py-0.5 rounded text-center font-bold cursor-pointer transition-colors shadow-2xs ${
                    footerPageNumState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/70 font-black'
                      : 'border-neutral-300 text-neutral-400 bg-neutral-100'
                  }`}
                  title="Current Page Counter State: 1 = Active, 0 = Off. Click to toggle"
                >
                  {footerPageNumState}
                </button>

                <button
                  type="button"
                  onClick={cycleFooterSep}
                  className={`border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-[11px] px-1 py-0.5 rounded font-mono font-bold cursor-pointer min-w-[20px] shadow-2xs ${
                    footerPageSepState === '' ? 'bg-amber-50 text-neutral-400 italic' : 'bg-white'
                  }`}
                  title={`Separator: ${footerPageSepState === '' ? 'Empty (none)' : `"${footerPageSepState}"`}. Click to cycle: '-' | 'of' | '/' | none`}
                >
                  {footerPageSepState || '∅'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFooterPageTotal}
                  className={`border text-[11px] w-6 py-0.5 rounded text-center font-bold cursor-pointer transition-colors shadow-2xs ${
                    footerPageMaxState === 1
                      ? 'border-[#185abd] text-[#185abd] bg-blue-50/70 font-black'
                      : 'border-neutral-300 text-neutral-400 bg-neutral-100'
                  }`}
                  title="Total Pages State: 1 = Active, 0 = Off. Click to toggle"
                >
                  {footerPageMaxState}
                </button>
              </div>

              {/* Footer Right Smart Dropdown Textbox */}
              <SmartHeaderFooterInput
                value={footerRightValue}
                onChange={handleUpdateFooterRight}
                placeholder="Footer Right"
                title="Footer Right Text (Type or Quick Insert)"
                className="w-[31%]"
                dropdownAlign="right"
                smartValues={smartDocValues}
                disabled={!showFooter}
              />
            </div>
          </div>

          {/* Section 2: Smart Table Print Formatting (User Request) */}
          <div className="space-y-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider text-[#185abd]">
                <TableIcon size={14} />
                <span>Table Print Formatting</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-[#185abd] font-semibold px-2 py-0.5 rounded-full">
                CSS @media print
              </span>
            </div>

            {/* Table Print Width (100% or 90% or Auto) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 block">
                Table Width via CSS Print Setup
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: '100%', title: '100% Full Width' },
                  { id: '90%', title: '90% Margin-Safe' },
                  { id: 'auto', title: 'Auto Width' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTablePrintWidth(opt.id as any)}
                    className={`py-1 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      tablePrintWidth === opt.id
                        ? 'border-[#185abd] bg-white text-[#185abd] font-bold shadow-2xs'
                        : 'border-neutral-200 text-neutral-600 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="text-[11px] block">{opt.id}</span>
                    <span className="text-[9px] opacity-75 block truncate">{opt.title.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Option: Table Better View Grids */}
            <label className="flex items-start space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={tableBetterViewGrids}
                onChange={(e) => setTableBetterViewGrids(e.target.checked)}
                className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
              />
              <div>
                <span className="font-semibold text-xs text-neutral-800 block">
                  Better View Grids (High-Legibility Borders)
                </span>
                <span className="text-[11px] text-neutral-500 block leading-tight mt-0.5">
                  Preserves 1px solid borders &amp; 4px padding so tables never lose grid lines in print
                </span>
              </div>
            </label>
          </div>

          {/* Section 3: Paper Size (Preselected A4) & Orientation */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Paper Size (A4 Preselected)
                </label>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                  210 × 297 mm
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['a4', 'letter', 'legal', 'a3', 'executive', 'tabloid'] as PageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPaperSize(size);
                      if (onUpdateSettings) onUpdateSettings({ pageSize: size });
                    }}
                    className={`px-2 py-1.5 rounded-lg border font-medium uppercase text-xs transition-colors cursor-pointer ${
                      paperSize === size
                        ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 block">Orientation</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setOrientation('portrait');
                    if (onUpdateSettings) onUpdateSettings({ orientation: 'portrait' });
                  }}
                  className={`flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    orientation === 'portrait'
                      ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-3 h-4 border border-current rounded-xs" />
                  <span>Portrait (1:1.41)</span>
                </button>

                <button
                  onClick={() => {
                    setOrientation('landscape');
                    if (onUpdateSettings) onUpdateSettings({ orientation: 'landscape' });
                  }}
                  className={`flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    orientation === 'landscape'
                      ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-4 h-3 border border-current rounded-xs" />
                  <span>Landscape</span>
                </button>
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 block">Margins</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(['normal', 'narrow', 'moderate', 'wide'] as PageMargin[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMargins(m);
                      if (onUpdateSettings) onUpdateSettings({ margins: m });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border font-medium capitalize text-xs transition-colors cursor-pointer ${
                      margins === m
                        ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {m} ({marginLookup[m].top}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Section: A4 Print Calibration & Simulator Realism Lab */}
            <div className="pt-2 border-t border-neutral-100 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowDebugLab((prev) => !prev)}
                  className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wider text-blue-900 hover:text-blue-950 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>A4 Print Calibration &amp; Simulator Realism</span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {showDebugLab ? '▲' : '▼'}
                  </span>
                </button>
                <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-full">
                  Epson L3250 Calibrated
                </span>
              </div>

              {showDebugLab && (
                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-3 text-xs">
                  {/* Part 1: Physical Printing Calibration (Hardware Output) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 text-[11px] flex items-center gap-1">
                        <span>📄</span>
                        <span>1. A4 Print Calibration (Hardware Output)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                        {sliceCapacityHeight}px
                      </span>
                    </div>
                    <div className="text-[10px] text-blue-900 leading-tight">
                      Controls text pagination &amp; physical print slicing so the printer NEVER cuts the bottom lines.
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdatePrintCapacityHeight(1430);
                          setMargins('narrow');
                          showToast('Applied: 1430px Safe Fit (Narrow 48px)');
                        }}
                        className={`px-1.5 py-1.5 rounded-md border text-left cursor-pointer transition-colors ${
                          sliceCapacityHeight === 1430 && margins === 'narrow'
                            ? 'border-[#185abd] bg-white text-[#185abd] font-bold shadow-xs ring-1 ring-[#185abd]/30'
                            : 'border-blue-200 bg-white/70 text-neutral-700 hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-[10px]">🎯 1430px Safe</div>
                        <div className="text-[9px] text-neutral-500">Narrow 48px</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdatePrintCapacityHeight(1415);
                          setMargins('narrow');
                          showToast('Applied: 1415px Extra Safe (-1%)');
                        }}
                        className={`px-1.5 py-1.5 rounded-md border text-left cursor-pointer transition-colors ${
                          sliceCapacityHeight === 1415
                            ? 'border-[#185abd] bg-white text-[#185abd] font-bold shadow-xs ring-1 ring-[#185abd]/30'
                            : 'border-blue-200 bg-white/70 text-neutral-700 hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-[10px]">🛡️ 1415px Safe</div>
                        <div className="text-[9px] text-neutral-500">-1% Extra Safe</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdatePrintCapacityHeight(1508);
                          showToast('Applied: 1508px (95% A3)');
                        }}
                        className={`px-1.5 py-1.5 rounded-md border text-left cursor-pointer transition-colors ${
                          sliceCapacityHeight === 1508
                            ? 'border-[#185abd] bg-white text-[#185abd] font-bold shadow-xs ring-1 ring-[#185abd]/30'
                            : 'border-blue-200 bg-white/70 text-neutral-700 hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-[10px]">95% A3</div>
                        <div className="text-[9px] text-neutral-500">1508px Max</div>
                      </button>
                    </div>
                  </div>

                  {/* Part 2: Preview Page Height (Right Page Simulator Realism - Optical Effect Only) */}
                  <div className="space-y-1.5 pt-2 border-t border-blue-200/80">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 text-[11px] flex items-center gap-1">
                        <span>👁️</span>
                        <span>2. Preview Page Height (Right Simulator Realism)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                        {visualPreviewHeight}px
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-900 bg-amber-50/70 p-1.5 rounded border border-amber-200/60 leading-tight">
                      <strong>Optical effect only:</strong> Increases or decreases simulated sheet height in the right preview simulator to match physical paper 100%. <em>Does NOT change text pagination or print calibration!</em>
                    </div>
                    <div className="flex items-center space-x-1 pt-0.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={debugPreviewHeight}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) handleUpdatePreviewHeight(val);
                          }}
                          className="w-full px-2 py-1 pr-6 bg-white border border-neutral-300 rounded font-mono text-xs font-bold text-neutral-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1430"
                        />
                        <span className="absolute right-1.5 top-1 text-[10px] text-neutral-400 pointer-events-none">px</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewHeight(Math.max(600, debugPreviewHeight - 10))}
                        className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                        title="Decrease visual sheet height by 10px"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewHeight(Math.min(2400, debugPreviewHeight + 10))}
                        className="px-1.5 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold text-[10px] text-neutral-700 cursor-pointer shadow-2xs"
                        title="Increase visual sheet height by 10px"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewHeight(Math.max(600, Math.round(debugPreviewHeight * 0.99)))}
                        className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px] cursor-pointer"
                        title="Decrease visual sheet height by 1%"
                      >
                        -1%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewHeight(Math.min(2400, Math.round(debugPreviewHeight * 1.01)))}
                        className="px-1.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px] cursor-pointer"
                        title="Increase visual sheet height by 1%"
                      >
                        +1%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePreviewHeight(sliceCapacityHeight)}
                        className="px-1.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-bold text-[10px] cursor-pointer"
                        title="Reset simulator height to match Print Calibration height exactly"
                      >
                        Sync
                      </button>
                    </div>
                  </div>

                  {/* Smart Parameters for Simulator Realism */}
                  <div className="space-y-2 pt-2 border-t border-blue-200/80">
                    <span className="font-bold text-neutral-700 text-[10px] uppercase tracking-wider block">
                      Simulator Realism Enhancements
                    </span>

                    {/* Feature 1: Printable Boundary Guideline */}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPrintableBoundaryGuide}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowPrintableBoundaryGuide(checked);
                          try {
                            localStorage.setItem('wordpad_preview_boundary_guide', String(checked));
                          } catch {
                            // ignore
                          }
                        }}
                        className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer"
                      />
                      <div>
                        <span className="font-medium text-neutral-800 text-[11px] block">
                          Printable Boundary Guideline
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          Displays dashed boundary of printable area on the simulated sheet
                        </span>
                      </div>
                    </label>

                    {/* Feature 2: Paper Realism Finish & 3D Shadow Depth */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-neutral-600 block">Paper Finish</label>
                        <div className="flex rounded border border-neutral-200 overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setPaperRealismFinish('bright');
                              try {
                                localStorage.setItem('wordpad_preview_paper_finish', 'bright');
                              } catch {
                                // ignore
                              }
                            }}
                            className={`flex-1 py-1 text-[10px] font-medium text-center cursor-pointer ${
                              paperRealismFinish === 'bright' ? 'bg-[#185abd] text-white font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Bright White
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaperRealismFinish('warm');
                              try {
                                localStorage.setItem('wordpad_preview_paper_finish', 'warm');
                              } catch {
                                // ignore
                              }
                            }}
                            className={`flex-1 py-1 text-[10px] font-medium text-center cursor-pointer ${
                              paperRealismFinish === 'warm' ? 'bg-[#185abd] text-white font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Matte Paper
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-neutral-600 block">3D Desk Shadow</label>
                        <div className="flex rounded border border-neutral-200 overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => setPaperShadowDepth('realistic')}
                            className={`flex-1 py-1 text-[10px] font-medium text-center cursor-pointer ${
                              paperShadowDepth === 'realistic' ? 'bg-[#185abd] text-white font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Elevated
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaperShadowDepth('subtle')}
                            className={`flex-1 py-1 text-[10px] font-medium text-center cursor-pointer ${
                              paperShadowDepth === 'subtle' ? 'bg-[#185abd] text-white font-bold' : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            Subtle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Diagnostics Telemetry */}
                  <div className="p-2 rounded bg-white border border-blue-200 text-[10px] space-y-1 shadow-2xs">
                    <div className="font-bold text-blue-950 flex items-center justify-between">
                      <span>📊 Live Calibration Telemetry</span>
                      <span className="font-mono text-neutral-500 font-normal">Page {currentPage} of {totalPages}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-neutral-600 font-mono">
                      <div>Print Capacity: <span className="font-bold text-neutral-800">{sliceCapacityHeight}px</span></div>
                      <div>Simulator Sheet: <span className="font-bold text-amber-700">{visualPreviewHeight}px</span></div>
                      <div>Printable Area: <span className="font-bold text-neutral-800">{effectivePrintableHeight}px</span></div>
                      <div>Kick Overflow: <span className="font-bold text-amber-800">{kickOverflowPx > 0 ? `+${kickOverflowPx}px` : `${kickOverflowPx}px`}</span></div>
                      <div>H/F in Margins: <span className="font-bold text-emerald-700">{doNotAddHeaderFooterToPrintArea ? 'Yes' : 'No'}</span></div>
                      <div>Page Content: <span className="font-bold text-blue-600">~{activeChunkHeight}px</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Page Range */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Pages to Print
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => setPageRangeMode('all')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'all'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                All ({totalPages})
              </button>
              <button
                onClick={() => setPageRangeMode('current')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'current'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Current ({currentPage})
              </button>
              <button
                onClick={() => setPageRangeMode('custom')}
                className={`px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                  pageRangeMode === 'custom'
                    ? 'border-[#185abd] bg-blue-50/60 text-[#185abd] font-bold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Custom Range
              </button>
            </div>

            {pageRangeMode === 'custom' && (
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono outline-none focus:border-[#185abd]"
                />
              </div>
            )}
          </div>

          {/* Section 5: Smart Print Features & Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-neutral-100">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={14} className="text-[#185abd]" />
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                Print Features &amp; Quality
              </label>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printHeadersFooters}
                  onChange={(e) => setPrintHeadersFooters(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Print Running Header &amp; Footer</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Prints configured header, title, and smart page numbers
                  </span>
                </div>
              </label>

              {printHeadersFooters && (
                <label className="flex items-start space-x-2 cursor-pointer ml-5 pl-2 border-l-2 border-blue-200">
                  <input
                    type="checkbox"
                    checked={doNotAddHeaderFooterToPrintArea}
                    onChange={(e) => handleUpdateDoNotAddHeaderFooterToPrintArea(e.target.checked)}
                    className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-neutral-800 block">
                      do not add header and footer to printing area
                    </span>
                    <span className="text-[11px] text-neutral-500 block">
                      Puts header text inside top margin &amp; footer text inside bottom margin (browser print method)
                    </span>
                  </div>
                </label>
              )}

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smartBreakOptimization}
                  onChange={(e) => setSmartBreakOptimization(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Smart Break Optimization</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Prevents mid-row table truncation and orphan headings
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printBackgroundGraphics}
                  onChange={(e) => setPrintBackgroundGraphics(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">Background Graphics &amp; Cell Fills</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Preserves callout shading, colors, and table cell backgrounds
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                  className="rounded text-[#185abd] focus:ring-[#185abd] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-semibold text-neutral-800 block">High-Contrast B&amp;W Mode</span>
                  <span className="text-[11px] text-neutral-500 block">
                    Converts text to pure black to save ink on hardware printers
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Print Preview */}
        <div className="flex-1 flex flex-col bg-[#e2e8f0]/80 overflow-hidden">
          {/* Preview Navigation & Scaling Toolbar */}
          <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0 shadow-2xs">
            {/* Pager controls */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="font-semibold text-neutral-700 px-1">
                Page <span className="font-bold text-neutral-900">{currentPage}</span> of{' '}
                <span className="font-bold text-neutral-900">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            {/* A4 Simulation Badge */}
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
              <span className="uppercase font-bold text-neutral-900">{paperSize} Simulation</span>
              <span>&bull;</span>
              <span>{orientation}</span>
              <span>&bull;</span>
              <span>{tablePrintWidth} Table Width</span>
            </div>

            {/* Document Scaling Controls (Fit Page, Fit Width, Zoom) */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  setZoomMode('fit-page');
                  setPreviewZoom(computeFitPageScale());
                }}
                className={`px-2 py-1 border rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  zoomMode === 'fit-page'
                    ? 'bg-blue-50 border-[#185abd] text-[#185abd]'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Fit full page in preview area"
              >
                Fit Page
              </button>

              <button
                onClick={() => {
                  setZoomMode('fit-width');
                  setPreviewZoom(computeFitWidthScale());
                }}
                className={`px-2 py-1 border rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                  zoomMode === 'fit-width'
                    ? 'bg-blue-50 border-[#185abd] text-[#185abd]'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Fit page width"
              >
                Fit Width
              </button>

              <button
                onClick={() => {
                  setZoomMode('manual');
                  setPreviewZoom(Math.max(0.35, previewZoom - 0.1));
                }}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>

              <span className="w-12 text-center font-mono font-semibold text-neutral-700">
                {Math.round(previewZoom * 100)}%
              </span>

              <button
                onClick={() => {
                  setZoomMode('manual');
                  setPreviewZoom(Math.min(1.4, previewZoom + 0.1));
                }}
                className="p-1 border border-neutral-200 rounded hover:bg-neutral-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Paper View Container with High-Fidelity A4 Simulation & True Optical Vector Zoom */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto p-8 flex justify-center items-start"
          >
            <div
              style={{
                width: `${printWidth * previewZoom}px`,
                height: `${visualPreviewHeight * previewZoom}px`,
                minHeight: `${visualPreviewHeight * previewZoom}px`,
                position: 'relative',
              }}
              className={`transition-all duration-150 shrink-0 ${
                paperShadowDepth === 'realistic'
                  ? 'shadow-[0_22px_55px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/10'
                  : 'shadow-xl'
              }`}
            >
              <div
                style={{
                  width: `${printWidth}px`,
                  height: `${visualPreviewHeight}px`,
                  minHeight: `${visualPreviewHeight}px`,
                  paddingTop: `${activeMarginPadding.top}px`,
                  paddingRight: `${activeMarginPadding.right}px`,
                  paddingBottom: `${activeMarginPadding.bottom}px`,
                  paddingLeft: `${activeMarginPadding.left}px`,
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'top left',
                  boxSizing: 'border-box',
                  backgroundColor: paperRealismFinish === 'warm' ? '#fafaf9' : '#ffffff',
                }}
                className="border border-neutral-300 rounded-xs text-neutral-800 flex flex-col justify-between absolute top-0 left-0 overflow-hidden ring-1 ring-black/5"
              >
                {/* Hardware Printable Margin Boundary Guide (Optical Realism) */}
                {showPrintableBoundaryGuide && (
                  <div
                    className="absolute pointer-events-none border border-dashed border-sky-400/70 rounded-xs z-30"
                    style={{
                      top: `${activeMarginPadding.top}px`,
                      left: `${activeMarginPadding.left}px`,
                      right: `${activeMarginPadding.right}px`,
                      bottom: `${activeMarginPadding.bottom}px`,
                    }}
                  >
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono text-sky-600 bg-sky-50/95 px-1.5 py-0.5 rounded shadow-2xs select-none">
                      Printable Zone: {printWidth - activeMarginPadding.left - activeMarginPadding.right}×{effectivePrintableHeight}px
                    </span>
                  </div>
                )}
                {/* Running Header (Smart Read from Document Settings & Info Setup) */}
                {printHeadersFooters && isHeaderActive && (
                  doNotAddHeaderFooterToPrintArea ? (
                    <div
                      className="absolute left-0 right-0 flex items-center justify-between text-xs text-neutral-500 font-sans select-none z-20 pointer-events-none"
                      style={{
                        top: `${Math.max(6, Math.round(activeMarginPadding.top * 0.22))}px`,
                        paddingLeft: `${activeMarginPadding.left}px`,
                        paddingRight: `${activeMarginPadding.right}px`,
                        borderBottom: '1px solid #cbd5e1',
                        paddingBottom: '3px',
                      }}
                    >
                      <span className="truncate max-w-[33%] text-left font-medium">
                        {smartHeaderLeft}
                      </span>
                      <span className="text-center font-semibold text-neutral-700">
                        {smartHeaderPageText}
                      </span>
                      <span className="truncate max-w-[33%] text-right font-medium">
                        {smartHeaderRight}
                      </span>
                    </div>
                  ) : (
                    <div className="border-b border-neutral-300 pb-2 mb-3 flex items-center justify-between text-xs text-neutral-500 font-sans select-none shrink-0 relative z-10">
                      <span className="truncate max-w-[33%] text-left font-medium">
                        {smartHeaderLeft}
                      </span>
                      <span className="text-center font-semibold text-neutral-700">
                        {smartHeaderPageText}
                      </span>
                      <span className="truncate max-w-[33%] text-right font-medium">
                        {smartHeaderRight}
                      </span>
                    </div>
                  )
                )}

                {/* Ghost Watermark in Live Paper Preview */}
                {docWatermark.trim() && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                    <span className="text-4xl font-black uppercase tracking-widest text-neutral-300/35 -rotate-45 transform whitespace-nowrap">
                      {docWatermark.trim()}
                    </span>
                  </div>
                )}

                {/* Document Body Sliced For Current Page */}
                <div
                  className={`flex-1 overflow-hidden print-preview-body relative z-10 ${
                    tableBetterViewGrids ? 'preview-better-grids' : ''
                  }`}
                  style={{
                    height: doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : undefined,
                    maxHeight: doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : undefined,
                  }}
                >
                  {editor ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: activePageHtml,
                      }}
                      className={`ProseMirror pointer-events-none prose prose-base max-w-none ${
                        highContrastMode ? 'text-black font-medium' : ''
                      }`}
                    />
                  ) : (
                    <p className="text-neutral-400 italic">No document content</p>
                  )}
                </div>

                {/* Running Footer (Smart Read from Document Settings & Info Setup) */}
                {printHeadersFooters && isFooterActive && (
                  doNotAddHeaderFooterToPrintArea ? (
                    <div
                      className="absolute left-0 right-0 flex items-center justify-between text-xs text-neutral-500 font-sans select-none z-20 pointer-events-none"
                      style={{
                        bottom: `${Math.max(6, Math.round(activeMarginPadding.bottom * 0.22))}px`,
                        paddingLeft: `${activeMarginPadding.left}px`,
                        paddingRight: `${activeMarginPadding.right}px`,
                        borderTop: '1px solid #cbd5e1',
                        paddingTop: '3px',
                      }}
                    >
                      <span className="truncate max-w-[33%] text-left font-medium">
                        {smartFooterLeft}
                      </span>
                      <span className="text-center font-bold text-neutral-800">
                        {smartFooterPageText}
                      </span>
                      <span className="truncate max-w-[33%] text-right font-medium">
                        {smartFooterRight}
                      </span>
                    </div>
                  ) : (
                    <div className="border-t border-neutral-300 pt-2.5 mt-4 flex items-center justify-between text-xs text-neutral-500 font-sans select-none shrink-0 relative z-10">
                      <span className="truncate max-w-[33%] text-left font-medium">
                        {smartFooterLeft}
                      </span>
                      <span className="text-center font-bold text-neutral-800">
                        {smartFooterPageText}
                      </span>
                      <span className="truncate max-w-[33%] text-right font-medium">
                        {smartFooterRight}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Multi-Page Print Sheets (Active during browser print spooler) */}
      <div id="dedicated-print-container" className="print-only">
        {pagesToPrint.map(({ chunk, pageNum }) => {
          const hPageText = (isHeaderActive && headerHasPagination)
            ? formatSmartPageText({
                showPages: true,
                pageState: headerPageNumState,
                maxState: headerPageMaxState,
                separator: headerPageSepState,
                currentPage: pageNum,
                totalPages: pageChunks.length,
              })
            : '';

          const fPageText = (isFooterActive && footerHasPagination)
            ? formatSmartPageText({
                showPages: true,
                pageState: footerPageNumState,
                maxState: footerPageMaxState,
                separator: footerPageSepState,
                currentPage: pageNum,
                totalPages: pageChunks.length,
              })
            : '';

          return (
            <div
              key={pageNum}
              className="print-page-sheet"
              style={{
                paddingTop: `${activeMarginPadding.top}px`,
                paddingRight: `${activeMarginPadding.right}px`,
                paddingBottom: `${activeMarginPadding.bottom}px`,
                paddingLeft: `${activeMarginPadding.left}px`,
                position: 'relative',
              }}
            >
              {/* Ghost Watermark in Dedicated Print Sheet */}
              {docWatermark.trim() && (
                <div className="watermark-overlay">
                  <span className="watermark-text">{docWatermark.trim()}</span>
                </div>
              )}

              {/* Running Header on Every Page */}
              {printHeadersFooters && isHeaderActive && (
                doNotAddHeaderFooterToPrintArea ? (
                  <div
                    className="print-page-header-in-margin"
                    style={{
                      position: 'absolute',
                      top: `${Math.max(6, Math.round(activeMarginPadding.top * 0.22))}px`,
                      left: `${activeMarginPadding.left}px`,
                      right: `${activeMarginPadding.right}px`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '3px',
                      fontSize: '11px',
                      color: '#64748b',
                      zIndex: 20,
                    }}
                  >
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartHeaderLeft}
                    </span>
                    <span className="text-center font-semibold text-neutral-700">
                      {hPageText}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartHeaderRight}
                    </span>
                  </div>
                ) : (
                  <div className="print-page-header">
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartHeaderLeft}
                    </span>
                    <span className="text-center font-semibold text-neutral-700">
                      {hPageText}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartHeaderRight}
                    </span>
                  </div>
                )
              )}

              {/* Sliced Document Body for This Page */}
              <div
                className={`print-page-body ProseMirror ${
                  tableBetterViewGrids ? 'preview-better-grids' : ''
                } ${highContrastMode ? 'text-black font-medium' : ''}`}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  height: doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : undefined,
                  maxHeight: doNotAddHeaderFooterToPrintArea ? `${effectivePrintableHeight}px` : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: chunk }}
              />

              {/* Running Footer on Every Page with Bottom Indent */}
              {printHeadersFooters && isFooterActive && (
                doNotAddHeaderFooterToPrintArea ? (
                  <div
                    className="print-page-footer-in-margin"
                    style={{
                      position: 'absolute',
                      bottom: `${Math.max(6, Math.round(activeMarginPadding.bottom * 0.22))}px`,
                      left: `${activeMarginPadding.left}px`,
                      right: `${activeMarginPadding.right}px`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #cbd5e1',
                      paddingTop: '3px',
                      fontSize: '11px',
                      color: '#64748b',
                      zIndex: 20,
                    }}
                  >
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartFooterLeft}
                    </span>
                    <span className="text-center font-bold text-neutral-800">
                      {fPageText}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartFooterRight}
                    </span>
                  </div>
                ) : (
                  <div className="print-page-footer">
                    <span className="truncate max-w-[33%] text-left font-medium">
                      {smartFooterLeft}
                    </span>
                    <span className="text-center font-bold text-neutral-800">
                      {fPageText}
                    </span>
                    <span className="truncate max-w-[33%] text-right font-medium">
                      {smartFooterRight}
                    </span>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Embedded CSS for Preview Fidelity */}
      <style>{`
        .print-preview-body .tableWrapper {
          width: 100% !important;
          max-width: 100% !important;
          margin: 16px 0 !important;
        }
        .print-preview-body table {
          width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          max-width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          min-width: ${tablePrintWidth === '90%' ? '90%' : '100%'} !important;
          margin-left: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
          margin-right: ${tablePrintWidth === '90%' ? 'auto' : '0'} !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          box-sizing: border-box !important;
          border: 1.5px solid #111827 !important;
        }
        .print-preview-body col {
          width: auto !important;
          min-width: 0 !important;
        }
        .print-preview-body th,
        .print-preview-body td {
          min-width: 60px !important;
          box-sizing: border-box !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
          white-space: normal !important;
          border: 1px solid #111827 !important;
          padding: 8px 12px !important;
          vertical-align: top !important;
        }
        .print-preview-body th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          font-weight: 700 !important;
        }
        .print-preview-body img[data-alignment="left"],
        .print-preview-body p[style*="text-align: left"] img,
        .print-preview-body .has-text-align-left img {
          display: block !important;
          margin-left: 0 !important;
          margin-right: auto !important;
        }
        .print-preview-body img[data-alignment="center"],
        .print-preview-body p[style*="text-align: center"] img,
        .print-preview-body .has-text-align-center img {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .print-preview-body img[data-alignment="right"],
        .print-preview-body p[style*="text-align: right"] img,
        .print-preview-body .has-text-align-right img {
          display: block !important;
          margin-left: auto !important;
          margin-right: 0 !important;
        }
        .print-preview-body img[data-float="left"] {
          float: left !important;
          margin: 0.5rem 1.25rem 0.75rem 0 !important;
          display: inline-block !important;
        }
        .print-preview-body img[data-float="right"] {
          float: right !important;
          margin: 0.5rem 0 0.75rem 1.25rem !important;
          display: inline-block !important;
        }
      `}</style>
    </div>
  );
};

export default PrintBackstageSection;
