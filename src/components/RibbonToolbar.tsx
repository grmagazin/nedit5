import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import { findTable } from '@tiptap/pm/tables';
import { TextSelection } from '@tiptap/pm/state';
import {
  CopiedWordFormat,
  copyFormatFromEditor,
  applyFormatToEditor,
  describeFormat,
} from '../utils/formatPainter';
import { cleanAllSpacing } from '../utils/spacingUtils';
import {
  RibbonTab,
  PageMargin,
  PageOrientation,
  PageSize,
  DocumentSettings,
  DocumentComment,
  DocumentSnapshot,
  ThemeMode,
  PageBorderStyle,
} from '../types';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Indent,
  Outdent,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Link2,
  Minus,
  Quote,
  Code,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  Sparkles,
  Columns,
  Maximize2,
  FileText,
  Copy,
  Scissors,
  ClipboardPaste,
  Paintbrush,
  Eraser,
  Space,
  RemoveFormatting,
  Globe,
  BookOpen,
  Combine,
  Unlink,
  ImageOff,
  Tag,
  Eye,
  Grid,
  ZoomIn,
  ZoomOut,
  FilePlus2,
  Calendar,
  Smile,
  LayoutGrid,
  Mic,
  Wand2,
  SplitSquareVertical,
  Layers,
  Wand,
  Check,
  Trash2,
  TableProperties,
  Rows,
  SquareDashed,
  Download,
  HelpCircle,
  Heading1,
  Heading2,
  Heading3,
  SearchCheck,
  Scan,
  RotateCw,
  Square,
  Stamp,
  CheckCheck,
  BarChart3,
  SpellCheck,
  Languages,
  MessageSquarePlus,
  MessageSquare,
  Camera,
  History,
  X,
  Ruler,
  Pilcrow,
  Moon,
  TextQuote,
  Target,
  Zap,
  Heading,
  Replace,
  Keyboard,
  Info,
  AlertCircle,
  Sun,
  Play,
  Pause,
  Volume2,
  Gauge,
  Headphones,
} from 'lucide-react';

const InsertPictureModal = React.lazy(() => import('./InsertPictureModal'));
const SymbolsPickerModal = React.lazy(() => import('./SymbolsPickerModal'));
const InsertLinkModal = React.lazy(() =>
  import('./InsertLinkModal').then((m) => ({ default: m.InsertLinkModal }))
);
const EquationWizardPopup = React.lazy(() =>
  import('./EquationWizardPopup').then((m) => ({ default: m.EquationWizardPopup }))
);
const AiImageModal = React.lazy(() => import('./AiImageModal'));
const ScreenCaptureTool = React.lazy(() =>
  import('./ScreenCaptureTool').then((m) => ({ default: m.ScreenCaptureTool }))
);
const AiRewriteModal = React.lazy(() => import('./modals/AiRewriteModal'));
const VersionHistoryModal = React.lazy(() => import('./modals/VersionHistoryModal'));
const ChartGeneratorModal = React.lazy(() => import('./modals/ChartGeneratorModal'));
const SeoTab = React.lazy(() => import('./ribbon/tabs/SeoTab'));
const HelpTab = React.lazy(() => import('./ribbon/tabs/HelpTab'));
import { snapshotStore } from '../utils/snapshotStore';
import { captureDocumentScreenSnapshot } from '../utils/screenSnapshot';

export const DOCUMENT_PAGE_SIZES: {
  id: PageSize;
  name: string;
  inches: string;
  metric: string;
}[] = [
  { id: 'a4', name: 'A4', inches: '8,7 × 11,6"', metric: '210 × 297 mm' },
  { id: 'letter', name: 'Letter', inches: '8.5 × 11"', metric: '216 × 279 mm' },
  { id: 'legal', name: 'Legal', inches: '8.5 × 14"', metric: '216 × 356 mm' },
  { id: 'a3', name: 'A3', inches: '11.69 × 16.54"', metric: '297 × 420 mm' },
  { id: 'a5', name: 'A5', inches: '5.83 × 8.27"', metric: '148 × 210 mm' },
  { id: 'executive', name: 'Executive', inches: '7.25 × 10.5"', metric: '184 × 267 mm' },
  { id: 'tabloid', name: 'Tabloid', inches: '11 × 17"', metric: '279 × 432 mm' },
  { id: 'b5', name: 'B5', inches: '6.93 × 9.84"', metric: '176 × 250 mm' },
  { id: 'a6', name: 'A6', inches: '4.13 × 5.83"', metric: '105 × 148 mm' },
  { id: 'folio', name: 'Folio', inches: '8.5 × 13"', metric: '216 × 330 mm' },
  { id: 'statement', name: 'Statement', inches: '5.5 × 8.5"', metric: '140 × 216 mm' },
  { id: 'ledger', name: 'Ledger', inches: '17 × 11"', metric: '432 × 279 mm' },
];

interface RibbonToolbarProps {
  editor: Editor | null;
  activeTab: RibbonTab;
  onSelectTab: (tab: RibbonTab) => void;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage: () => void;
  onOpenFindReplace: () => void;
  onOpenStats: () => void;
  comments?: DocumentComment[];
  onSetComments?: React.Dispatch<React.SetStateAction<DocumentComment[]>>;
  showCommentsPanel?: boolean;
  onToggleCommentsPanel?: (show?: boolean) => void;
  formatPainter?: CopiedWordFormat | null;
  onToggleFormatPainter?: (mode?: 'single' | 'persistent') => void;
  onClearFormatPainter?: () => void;
  onApplyFormatPainter?: () => void;
  autoCorrectEnabled?: boolean;
  onToggleAutoCorrect?: () => void;
}

const RibbonToolbarComponent: React.FC<RibbonToolbarProps> = ({
  editor,
  activeTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  onOpenBackstage,
  onOpenFindReplace,
  onOpenStats,
  comments: propComments,
  onSetComments,
  showCommentsPanel: propShowCommentsPanel,
  onToggleCommentsPanel,
  formatPainter: propFormatPainter,
  onToggleFormatPainter,
  onClearFormatPainter,
  onApplyFormatPainter,
  autoCorrectEnabled = false,
  onToggleAutoCorrect,
}) => {
  const isRibbonCollapsed = settings.isRibbonCollapsed ?? false;
  const setIsRibbonCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isRibbonCollapsed) : val;
    onUpdateSettings({ isRibbonCollapsed: nextVal });
  };

  // 3-second popups right of Copy (green), Cut (orange), Paste (blue), Painter (purple)
  const [copyPopupVisible, setCopyPopupVisible] = useState(false);
  const [cutPopupVisible, setCutPopupVisible] = useState(false);
  const [pastePopupVisible, setPastePopupVisible] = useState(false);
  const [painterPopupVisible, setPainterPopupVisible] = useState(false);

  const copyPopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cutPopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pastePopupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const painterPopupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCopyPopup = useCallback(() => {
    setCopyPopupVisible(true);
    if (copyPopupTimerRef.current) clearTimeout(copyPopupTimerRef.current);
    copyPopupTimerRef.current = setTimeout(() => setCopyPopupVisible(false), 3000);
  }, []);

  const triggerCutPopup = useCallback(() => {
    setCutPopupVisible(true);
    if (cutPopupTimerRef.current) clearTimeout(cutPopupTimerRef.current);
    cutPopupTimerRef.current = setTimeout(() => setCutPopupVisible(false), 3000);
  }, []);

  const triggerPastePopup = useCallback(() => {
    setPastePopupVisible(true);
    if (pastePopupTimerRef.current) clearTimeout(pastePopupTimerRef.current);
    pastePopupTimerRef.current = setTimeout(() => setPastePopupVisible(false), 3000);
  }, []);

  const triggerPainterPopup = useCallback(() => {
    setPainterPopupVisible(true);
    if (painterPopupTimerRef.current) clearTimeout(painterPopupTimerRef.current);
    painterPopupTimerRef.current = setTimeout(() => setPainterPopupVisible(false), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (copyPopupTimerRef.current) clearTimeout(copyPopupTimerRef.current);
      if (cutPopupTimerRef.current) clearTimeout(cutPopupTimerRef.current);
      if (pastePopupTimerRef.current) clearTimeout(pastePopupTimerRef.current);
      if (painterPopupTimerRef.current) clearTimeout(painterPopupTimerRef.current);
    };
  }, []);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHoverRows, setTableHoverRows] = useState(3);
  const [tableHoverCols, setTableHoverCols] = useState(3);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLineHeightPicker, setShowLineHeightPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for image prompt, symbols, quick blocks, and voice dictation
  const [showAiImageModal, setShowAiImageModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [showSymbolsPicker, setShowSymbolsPicker] = useState(false);
  const [showQuickBlocksPicker, setShowQuickBlocksPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Font Size editable combobox state
  const [fontSizeInputText, setFontSizeInputText] = useState<string>('');
  const [isFontSizeEditing, setIsFontSizeEditing] = useState<boolean>(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState<boolean>(false);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);

  // Table Tab specific states
  const [showTableTabPicker, setShowTableTabPicker] = useState(false);
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const [selectedTableTheme, setSelectedTableTheme] = useState(0);
  const [selectedTableColor, setSelectedTableColor] = useState('#3b5998');
  const tableColorPickerInputRef = useRef<HTMLInputElement>(null);
  const [borderMode, setBorderMode] = useState<'normal' | 'minimal' | 'none'>('normal');

  // Layout Tab specific states matching photo
  const [showMarginsDropdown, setShowMarginsDropdown] = useState(false);
  const [showOrientationDropdown, setShowOrientationDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showWatermarkDropdown, setShowWatermarkDropdown] = useState(false);
  const [showShadowDropdown, setShowShadowDropdown] = useState(false);
  const shadowDropdownRef = useRef<HTMLDivElement>(null);

  // Review Tab specific states matching photo
  const [selectedLanguage, setSelectedLanguage] = useState('Greek (Ελληνικά)');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  // Comments state (initial 1 comment matches the orange "1" badge in photo)
  const [internalComments, setInternalComments] = useState<DocumentComment[]>([
    {
      id: 'comment-1',
      author: 'Editorial Review',
      text: 'Please verify section metrics, key citations, and executive bibliography before final export.',
      timestamp: 'Today, 10:45 AM',
      selectedText: 'Executive Summary',
      resolved: false,
    },
  ]);
  const comments = propComments ?? internalComments;
  const setComments = onSetComments ?? setInternalComments;

  const [internalShowCommentsPanel, setInternalShowCommentsPanel] = useState(false);
  const showCommentsPanel = propShowCommentsPanel ?? internalShowCommentsPanel;
  const setShowCommentsPanel = (val: boolean | ((prev: boolean) => boolean)) => {
    if (onToggleCommentsPanel) {
      if (typeof val === 'function') {
        onToggleCommentsPanel(val(showCommentsPanel));
      } else {
        onToggleCommentsPanel(val);
      }
    } else {
      setInternalShowCommentsPanel(val);
    }
  };
  const [showNewCommentModal, setShowNewCommentModal] = useState(false);
  const [newCommentAuthor, setNewCommentAuthor] = useState('Reviewer');
  const [newCommentText, setNewCommentText] = useState('');
  const [commentTargetSelection, setCommentTargetSelection] = useState('');

  // Force re-render on any editor selection or content update so formatting buttons reflect active states immediately
  const [, setEditorUpdateTrigger] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      setEditorUpdateTrigger((prev) => (prev + 1) % 10000);
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Snapshots & Version History
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('word_doc_snapshots');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rev-1',
        name: 'Initial Draft Revision',
        timestamp: 'Today, 09:30 AM',
        htmlContent: '<p>Initial working draft revision...</p>',
        wordCount: 142,
      },
    ];
  });
  const [showSaveSnapshotModal, setShowSaveSnapshotModal] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('');
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedSnapshotPreview, setSelectedSnapshotPreview] = useState<DocumentSnapshot | null>(null);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [capturedSnapshotImage, setCapturedSnapshotImage] = useState<string | null>(null);
  const [showScreenCaptureTool, setShowScreenCaptureTool] = useState(false);
  const [screenCaptureBaseImage, setScreenCaptureBaseImage] = useState<string | null>(null);

  // Robust Indent & Outdent handlers supporting lists AND standard paragraphs/headings
  const handleIncreaseIndent = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('taskList') && editor.can().sinkListItem('taskItem')) {
      editor.chain().focus().sinkListItem('taskItem').run();
      return;
    }
    if ((editor.isActive('bulletList') || editor.isActive('orderedList')) && editor.can().sinkListItem('listItem')) {
      editor.chain().focus().sinkListItem('listItem').run();
      return;
    }
    editor.chain().focus().increaseParagraphIndent().run();
  }, [editor]);

  const handleDecreaseIndent = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('taskList') && editor.can().liftListItem('taskItem')) {
      editor.chain().focus().liftListItem('taskItem').run();
      return;
    }
    if ((editor.isActive('bulletList') || editor.isActive('orderedList')) && editor.can().liftListItem('listItem')) {
      editor.chain().focus().liftListItem('listItem').run();
      return;
    }
    editor.chain().focus().decreaseParagraphIndent().run();
  }, [editor]);

  // Lazy-load free screen capture library and open lightweight screen capture tool
  const handleCaptureScreenSnapshot = useCallback(async () => {
    setIsCapturingSnapshot(true);
    setReviewNotification('📸 Initializing Screen Capture Tool...');
    try {
      const result = await captureDocumentScreenSnapshot({ pixelRatio: 1.5 });
      if (!result.success || !result.dataUrl) {
        throw new Error(result.error || 'Failed to capture document screen snapshot');
      }

      setScreenCaptureBaseImage(result.dataUrl);
      setShowScreenCaptureTool(true);
      setReviewNotification('✂️ Screen Capture Tool ready! Drag to select an area.');
      setTimeout(() => setReviewNotification(null), 3000);
    } catch (err: any) {
      console.error('Snapshot capture error:', err);
      const failMsg = err?.message || 'Screen capture failed. Check document visibility.';
      setReviewNotification(`❌ ${failMsg}`);
      setTimeout(() => setReviewNotification(null), 4500);
    } finally {
      setIsCapturingSnapshot(false);
    }
  }, []);

  // When the user captures an area in the screen capture tool:
  // Send it to Image Wizard and save it in resilient multi-tier snapshotStore!
  const handleConfirmAreaCapture = useCallback(
    (capturedAreaUrl: string) => {
      // 1. Close screen capture overlay
      setShowScreenCaptureTool(false);
      setCapturedSnapshotImage(capturedAreaUrl);

      // 2. Save in snapshotStore (in-memory + safe storage)
      snapshotStore.setLatestSnapshot(capturedAreaUrl, 'snip');

      // 3. Open Document Snapshot modal so user can save milestone or download
      setShowSaveSnapshotModal(true);

      // 4. Open Image Wizard & send captured area
      onUpdateSettings({ showImageWizardPane: true });

      // 4. Save to document snapshots history
      if (editor) {
        const text = editor.getText();
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newSnap: DocumentSnapshot = {
          id: `snap-${Date.now()}`,
          name: `Snip - ${now}`,
          timestamp: new Date().toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          htmlContent: editor.getHTML(),
          wordCount,
          previewImage: capturedAreaUrl,
        };
        const updated = [newSnap, ...snapshots];
        setSnapshots(updated);
        try {
          localStorage.setItem('word_doc_snapshots', JSON.stringify(updated.slice(0, 20)));
        } catch {}
      }

      setReviewNotification('📸 Area captured & sent to Image Wizard! Ready to resize & paste.');
      setTimeout(() => setReviewNotification(null), 4000);
    },
    [editor, onUpdateSettings, snapshots]
  );

  // Spelling & Grammar / Spell API / AI Rewrite modals
  const [showAiRewriteModal, setShowAiRewriteModal] = useState(false);
  const [aiRewriteTone, setAiRewriteTone] = useState<'professional' | 'concise' | 'creative' | 'formal' | 'greek'>('professional');
  const [aiRewriteOutput, setAiRewriteOutput] = useState('');
  const [reviewNotification, setReviewNotification] = useState<string | null>(null);

  // Fx Equation Wizard state (Lazy loaded only when Fx is clicked)
  const [showEquationPopup, setShowEquationPopup] = useState(false);
  const [equationEditingLatex, setEquationEditingLatex] = useState('');
  const [equationIsBlock, setEquationIsBlock] = useState(false);

  useEffect(() => {
    const handleOpenFx = (e: any) => {
      if (e.detail?.latex) {
        setEquationEditingLatex(e.detail.latex);
        setEquationIsBlock(!!e.detail.isBlock);
      } else {
        setEquationEditingLatex('');
        setEquationIsBlock(false);
      }
      setShowEquationPopup(true);
    };
    const handleOpenChart = () => setShowChartModal(true);

    window.addEventListener('open-fx-wizard', handleOpenFx);
    window.addEventListener('open-chart-modal', handleOpenChart);
    return () => {
      window.removeEventListener('open-fx-wizard', handleOpenFx);
      window.removeEventListener('open-chart-modal', handleOpenChart);
    };
  }, []);

  // References for outside click detection to close open dropdowns
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const lineHeightPickerRef = useRef<HTMLDivElement>(null);
  const tablePickerRef = useRef<HTMLDivElement>(null);
  const symbolsPickerRef = useRef<HTMLDivElement>(null);
  const quickBlocksPickerRef = useRef<HTMLDivElement>(null);
  const tableTabPickerRef = useRef<HTMLDivElement>(null);
  const tableEditRef = useRef<HTMLDivElement>(null);
  const marginsDropdownRef = useRef<HTMLDivElement>(null);
  const orientationDropdownRef = useRef<HTMLDivElement>(null);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const watermarkDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasAnyDropdownOpen =
      showHighlightPicker ||
      showColorPicker ||
      showLineHeightPicker ||
      showTablePicker ||
      showSymbolsPicker ||
      showQuickBlocksPicker ||
      showTableTabPicker ||
      showTableEditMenu ||
      showMarginsDropdown ||
      showOrientationDropdown ||
      showSizeDropdown ||
      showColorDropdown ||
      showWatermarkDropdown ||
      showShadowDropdown ||
      showLanguageDropdown ||
      showFontSizeDropdown;

    if (!hasAnyDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showFontSizeDropdown && fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) {
        setShowFontSizeDropdown(false);
      }
      if (showHighlightPicker && highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
        setShowHighlightPicker(false);
      }
      if (showColorPicker && colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
      if (showLineHeightPicker && lineHeightPickerRef.current && !lineHeightPickerRef.current.contains(target)) {
        setShowLineHeightPicker(false);
      }
      if (showTablePicker && tablePickerRef.current && !tablePickerRef.current.contains(target)) {
        setShowTablePicker(false);
      }
      if (showQuickBlocksPicker && quickBlocksPickerRef.current && !quickBlocksPickerRef.current.contains(target)) {
        setShowQuickBlocksPicker(false);
      }
      if (showTableTabPicker && tableTabPickerRef.current && !tableTabPickerRef.current.contains(target)) {
        setShowTableTabPicker(false);
      }
      if (showTableEditMenu && tableEditRef.current && !tableEditRef.current.contains(target)) {
        setShowTableEditMenu(false);
      }
      if (showMarginsDropdown && marginsDropdownRef.current && !marginsDropdownRef.current.contains(target)) {
        setShowMarginsDropdown(false);
      }
      if (showOrientationDropdown && orientationDropdownRef.current && !orientationDropdownRef.current.contains(target)) {
        setShowOrientationDropdown(false);
      }
      if (showSizeDropdown && sizeDropdownRef.current && !sizeDropdownRef.current.contains(target)) {
        setShowSizeDropdown(false);
      }
      if (showColorDropdown && colorDropdownRef.current && !colorDropdownRef.current.contains(target)) {
        setShowColorDropdown(false);
      }
      if (showWatermarkDropdown && watermarkDropdownRef.current && !watermarkDropdownRef.current.contains(target)) {
        setShowWatermarkDropdown(false);
      }
      if (showShadowDropdown && shadowDropdownRef.current && !shadowDropdownRef.current.contains(target)) {
        setShowShadowDropdown(false);
      }
      if (showLanguageDropdown && languageDropdownRef.current && !languageDropdownRef.current.contains(target)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    showHighlightPicker,
    showColorPicker,
    showLineHeightPicker,
    showTablePicker,
    showSymbolsPicker,
    showQuickBlocksPicker,
    showTableTabPicker,
    showTableEditMenu,
    showMarginsDropdown,
    showOrientationDropdown,
    showSizeDropdown,
    showColorDropdown,
    showWatermarkDropdown,
    showShadowDropdown,
    showLanguageDropdown,
    showFontSizeDropdown,
  ]);

  // Format painter state (in-memory, strictly avoiding clipboard)
  const [internalFormatPainter, setInternalFormatPainter] = useState<CopiedWordFormat | null>(null);
  const activeFormatPainter = propFormatPainter !== undefined ? propFormatPainter : internalFormatPainter;

  const handleFormatPainterAction = useCallback(
    (mode: 'single' | 'persistent' = 'single') => {
      if (!editor) return;
      if (activeFormatPainter) {
        if (onClearFormatPainter) {
          onClearFormatPainter();
        } else {
          setInternalFormatPainter(null);
        }
      } else {
        if (onToggleFormatPainter) {
          onToggleFormatPainter(mode);
        } else {
          const copied = copyFormatFromEditor(editor, mode);
          setInternalFormatPainter(copied);
        }
        triggerPainterPopup();
      }
    },
    [editor, activeFormatPainter, onClearFormatPainter, onToggleFormatPainter, triggerPainterPopup]
  );

  const handlePasteFormatAction = useCallback(() => {
    if (!editor) return;
    if (activeFormatPainter) {
      if (onApplyFormatPainter) {
        onApplyFormatPainter();
      } else {
        applyFormatToEditor(editor, activeFormatPainter);
        if (activeFormatPainter.mode === 'single') {
          setInternalFormatPainter(null);
        }
      }
    } else {
      editor.chain().focus().setColor('#1f2937').setFontSize('11pt').run();
    }
  }, [editor, activeFormatPainter, onApplyFormatPainter]);

  const fonts = [
    { label: 'Calibri', value: 'Calibri, sans-serif' },
    { label: 'Aptos', value: 'Plus Jakarta Sans, sans-serif' },
    { label: 'Carlito', value: 'Carlito, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Lora', value: 'Lora, serif' },
    { label: 'Garamond', value: 'Garamond, "EB Garamond", serif' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Open Sans', value: '"Open Sans", sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Playfair Display', value: '"Playfair Display", serif' },
    { label: 'Merriweather', value: 'Merriweather, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, sans-serif' },
    { label: 'Courier New', value: '"Source Code Pro", "Courier New", monospace' },
    { label: 'Consolas', value: 'Consolas, "Source Code Pro", monospace' },
    { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
  ];

  const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

  const highlightColors = [
    { name: 'Yellow', color: '#fef08a' },
    { name: 'Bright Green', color: '#86efac' },
    { name: 'Cyan', color: '#67e8f9' },
    { name: 'Pink', color: '#f472b6' },
    { name: 'Red', color: '#fca5a5' },
    { name: 'Orange', color: '#fdba74' },
    { name: 'Light Blue', color: '#93c5fd' },
    { name: 'Violet', color: '#d8b4fe' },
  ];

  const textColors = [
    { name: 'Automatic', color: '#1f2937' },
    { name: 'Word Blue', color: '#185abd' },
    { name: 'Dark Blue', color: '#1e3a8a' },
    { name: 'Navy', color: '#0f172a' },
    { name: 'Emerald', color: '#16a34a' },
    { name: 'Ruby Red', color: '#dc2626' },
    { name: 'Amber', color: '#d97706' },
    { name: 'Purple', color: '#7c3aed' },
    { name: 'Slate Gray', color: '#64748b' },
    { name: 'Deep Teal', color: '#0f766e' },
  ];

  // Convert Tab Operations
  const handleFixSpaces = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to);
      const fixed = text
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/([.,;:!?])(?=[A-Za-z])/g, '$1 ');
      editor.chain().focus().insertContent(fixed).run();
    } else {
      let html = editor.getHTML();
      html = html
        .replace(/(&nbsp;|\s){2,}/gi, ' ')
        .replace(/\s+([.,;:!?])/g, '$1');
      editor.commands.setContent(html);
    }
    setReviewNotification('Clean: Fixed spaces and normalized spacing.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleClearFormat = () => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
    setReviewNotification('Clean: Formatting cleared.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleWebClean = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/\s*style="[^"]*"/gi, '');
    html = html.replace(/\s*class="[^"]*"/gi, '');
    html = html.replace(/<!--[\s\S]*?-->/gi, '');
    html = html.replace(/<o:[^>]*>[\s\S]*?<\/o:[^>]*>/gi, '');
    html = html.replace(/<\/?(span|div)[^>]*>/gi, '');
    html = html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '');
    editor.commands.setContent(html);
    setReviewNotification('Clean: Web formatting and clipboard artifacts removed.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleNormalize = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/"([^"]*)"/g, '“$1”');
    html = html.replace(/(\w)'(\w)/g, '$1’$2');
    html = html.replace(/--/g, '—');
    html = html.replace(/\.{3}/g, '…');
    html = html.replace(/(<p>\s*<\/p>){2,}/gi, '<p></p>');
    editor.commands.setContent(html);
    setReviewNotification('Clean: Typography and paragraph spacing normalized.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleCleanWiki = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/\[(?:\d+|citation needed|edit|note \d+|source)\]/gi, '');
    html = html.replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '');
    html = html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '');
    editor.commands.setContent(html);
    setReviewNotification('Clean: Wikipedia reference citations removed.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleMergeParagraphs = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to, '\n');
      const merged = text.split('\n').map((s) => s.trim()).filter(Boolean).join(' ');
      editor.chain().focus().insertContent(merged).run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/<\/p>\s*<p>/gi, ' ');
      editor.commands.setContent(html);
    }
    setReviewNotification('Structure: Paragraphs merged into flowing text.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleSplitSentences = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const text = editor.state.doc.textBetween(from, to);
      const split = text.replace(/([.!?])\s+(?=[A-Z0-9"“'‘])/g, '$1\n\n');
      editor.chain().focus().insertContent(split).run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/([.!?])\s+(?=[A-Z0-9"“'‘])/g, '$1</p><p>');
      editor.commands.setContent(html);
    }
    setReviewNotification('Structure: Text split into individual sentences.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleRemoveLinks = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      editor.chain().focus().unsetLink().run();
    } else {
      let html = editor.getHTML();
      html = html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
      editor.commands.setContent(html);
    }
    setReviewNotification('HTML: Removed links while preserving text.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleRemoveImages = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<img\b[^>]*>/gi, '');
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '');
    editor.commands.setContent(html);
    setReviewNotification('HTML: Removed all images from document.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleMakeResponsive = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<table\b([^>]*)>/gi, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\s*(width|height)="[^"]*"/gi, '')
        .replace(/\s*style="[^"]*"/gi, '');
      return `<table ${cleanAttrs} style="width: 100%; max-width: 100%; border-collapse: collapse;">`;
    });
    html = html.replace(/<img\b([^>]*)>/gi, (_match, attrs) => {
      const cleanAttrs = attrs
        .replace(/\s*(width|height)="[^"]*"/gi, '')
        .replace(/\s*style="[^"]*"/gi, '');
      return `<img ${cleanAttrs} style="max-width: 100%; height: auto; display: block;" />`;
    });
    editor.commands.setContent(html);
    setReviewNotification('HTML: Responsive rules applied to tables & images.');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleRemoveAttributes = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<([a-z0-9]+)\b([^>]*)>/gi, (_match, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (lowerTag === 'a') {
        const hrefMatch = attrs.match(/href="([^"]*)"/i);
        return hrefMatch ? `<a href="${hrefMatch[1]}">` : '<a>';
      }
      if (lowerTag === 'img') {
        const srcMatch = attrs.match(/src="([^"]*)"/i);
        const altMatch = attrs.match(/alt="([^"]*)"/i);
        return `<img ${srcMatch ? srcMatch[0] : ''} ${altMatch ? altMatch[0] : ''} />`;
      }
      return `<${tag}>`;
    });
    editor.commands.setContent(html);
    setReviewNotification('HTML: Removed all HTML attributes (style, class, id, width).');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleRemoveTags = () => {
    if (!editor) return;
    let html = editor.getHTML();
    html = html.replace(/<\/?(span|div|font|center|section|article|header|footer|aside)\b[^>]*>/gi, '');
    editor.commands.setContent(html);
    setReviewNotification('HTML: Cleaned wrapper tags (span, div, font, center).');
    setTimeout(() => setReviewNotification(null), 3000);
  };

  const handleTableToDiv = () => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;

    // 1. Locate selected table or table containing cursor
    let targetTablePos: number | null = null;
    let targetTableNode: any = null;

    for (let d = selection.$from.depth; d > 0; d--) {
      const node = selection.$from.node(d);
      if (node.type.name === 'table') {
        targetTablePos = selection.$from.before(d);
        targetTableNode = node;
        break;
      }
    }

    // 2. If cursor not directly inside a table, check selection range or document
    if (!targetTableNode) {
      if (!selection.empty) {
        state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (node.type.name === 'table' && targetTableNode === null) {
            targetTablePos = pos;
            targetTableNode = node;
            return false;
          }
        });
      }

      // If still not found, search the document for the first table
      if (!targetTableNode) {
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'table' && targetTableNode === null) {
            targetTablePos = pos;
            targetTableNode = node;
            return false;
          }
        });
      }
    }

    if (!targetTableNode || targetTablePos === null) {
      setReviewNotification('Table to DIV: No table found to convert.');
      setTimeout(() => setReviewNotification(null), 3000);
      return;
    }

    // 3. Serialize table to HTML DOM
    let tableEl: HTMLTableElement | null = null;
    try {
      const dom = DOMSerializer.fromSchema(editor.schema).serializeNode(targetTableNode);
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(dom);
      tableEl = tempContainer.querySelector('table');
    } catch {
      // Fallback
    }

    if (!tableEl) {
      setReviewNotification('Table to DIV: Could not parse table contents.');
      setTimeout(() => setReviewNotification(null), 3000);
      return;
    }

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    if (rows.length === 0) {
      setReviewNotification('Table to DIV: Selected table has no rows.');
      setTimeout(() => setReviewNotification(null), 3000);
      return;
    }

    // 4. Smartly transform table rows and cells into divTable / divTableRow / divTableCell with <p>
    let convertedRowsHtml = '';

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.children) as HTMLElement[];
      const isHeaderRow =
        rowIndex === 0 &&
        (row.querySelector('th') !== null || cells.some((c) => c.tagName.toLowerCase() === 'th'));

      let cellsHtml = '';
      cells.forEach((cell, cellIndex) => {
        let innerHtml = cell.innerHTML.trim();
        // Ensure content is wrapped in paragraph
        if (!innerHtml.startsWith('<p') && !innerHtml.startsWith('<div')) {
          if (isHeaderRow && !innerHtml.includes('<strong>')) {
            innerHtml = `<p><strong>${innerHtml || '&nbsp;'}</strong></p>`;
          } else {
            innerHtml = `<p>${innerHtml || '&nbsp;'}</p>`;
          }
        }

        const isLastCell = cellIndex === cells.length - 1;
        cellsHtml += `<div class="divTableCell" style="flex: 1; min-width: 0; padding: 10px 14px; ${
          isLastCell ? '' : 'border-right: 1px solid #e2e8f0;'
        } word-break: break-word;">${innerHtml}</div>`;
      });

      const rowClass = isHeaderRow ? 'divTableRow divTableHeading' : 'divTableRow';
      const rowBg = isHeaderRow
        ? 'background-color: #f1f5f9; font-weight: 600;'
        : rowIndex % 2 === 1
        ? 'background-color: #f8fafc;'
        : 'background-color: #ffffff;';
      const isLastRow = rowIndex === rows.length - 1;

      convertedRowsHtml += `<div class="${rowClass}" style="display: flex; width: 100%; ${
        isLastRow ? '' : 'border-bottom: 1px solid #e2e8f0;'
      } ${rowBg}">${cellsHtml}</div>`;
    });

    const fullConvertedHtml = `<div class="divTable" style="display: flex; flex-direction: column; width: 100%; margin: 1.25rem 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">${convertedRowsHtml}</div>`;

    // 5. Replace table in editor preserving history
    editor
      .chain()
      .focus()
      .deleteRange({ from: targetTablePos, to: targetTablePos + targetTableNode.nodeSize })
      .insertContentAt(targetTablePos, fullConvertedHtml)
      .run();

    setReviewNotification('HTML: Converted table to responsive <DIV> paragraphs.');
    setTimeout(() => setReviewNotification(null), 3500);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTablePicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInsertLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const REVIEW_LANGUAGES = [
    { label: 'Greek (Ελληνικά)', code: 'el-GR' },
    { label: 'English (United States)', code: 'en-US' },
    { label: 'English (United Kingdom)', code: 'en-GB' },
    { label: 'Spanish (Español)', code: 'es-ES' },
    { label: 'French (Français)', code: 'fr-FR' },
    { label: 'German (Deutsch)', code: 'de-DE' },
    { label: 'Italian (Italiano)', code: 'it-IT' },
    { label: 'Portuguese (Português)', code: 'pt-PT' },
    { label: 'Russian (Русский)', code: 'ru-RU' },
    { label: 'Chinese (中文)', code: 'zh-CN' },
    { label: 'Japanese (日本語)', code: 'ja-JP' },
  ];

  // Toggle Voice Dictation / Speech-to-Text
  const handleToggleVoiceDictation = () => {
    if (!editor) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      const langObj = REVIEW_LANGUAGES.find((l) => l.label === selectedLanguage);
      recognition.lang = langObj?.code || 'el-GR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          editor.chain().focus().insertContent(` ${transcript} `).run();
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Insert AI Generated or Sample Curated Image
  const handleInsertAiImage = (promptText?: string) => {
    if (!editor) return;
    const prompt = promptText || aiImagePrompt;
    if (!prompt.trim()) return;
    
    // Curated high quality photo categories corresponding to the prompt
    const cleanPrompt = encodeURIComponent(prompt.trim());
    const aiImageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80#${cleanPrompt}`;
    editor.chain().focus().setImage({ src: aiImageUrl }).run();
    setShowAiImageModal(false);
    setAiImagePrompt('');
  };

  // Curated symbols list
  const commonSymbols = ['©', '®', '™', '€', '£', '¥', '§', '¶', '°', '±', '≠', '≤', '≥', '∞', '√', 'π', 'µ', '←', '↑', '→', '↓', '↔', '✔', '★', '♥', '♦', '♣', '♠'];

  // Curated quick blocks templates
  const quickBlocks = [
    {
      title: 'Executive Summary Box',
      desc: 'Highlight critical takeaways',
      content: '<blockquote style="border-left: 4px solid #185abd; padding: 12px 16px; background-color: #f0f7ff; color: #1e3a8a; border-radius: 4px;"><strong>EXECUTIVE SUMMARY</strong><p>Enter the key strategic findings and essential executive takeaways here.</p></blockquote><p></p>',
    },
    {
      title: 'Action Items Checklist',
      desc: 'Structured meeting follow-ups',
      content: '<ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"></label><div><p>Complete document review and incorporate stakeholder feedback</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Schedule executive approval sign-off meeting</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Distribute final approved memorandum to the team</p></div></li></ul><p></p>',
    },
    {
      title: 'Key Metric Callout',
      desc: 'Display bold numerical KPI',
      content: '<div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; background-color: #fafbfc; margin: 12px 0;"><h3 style="margin: 0; color: #185abd; font-size: 28px; font-weight: 700;">+34.8%</h3><p style="margin: 4px 0 0; color: #475569; font-size: 13px;">Year-over-Year Document Operational Efficiency</p></div><p></p>',
    },
    {
      title: 'Formal Sign-off Block',
      desc: 'Date and signature lines',
      content: '<table style="width: 100%; border: none; margin-top: 30px;"><tbody><tr><td style="border: none; padding: 20px 0;"><p>_____________________________</p><p><strong>Authorized Signature</strong></p><p>Date: _______________</p></td><td style="border: none; padding: 20px 0;"><p>_____________________________</p><p><strong>Witness / Notary</strong></p><p>Date: _______________</p></td></tr></tbody></table><p></p>',
    },
  ];

  // Table style color presets (matching 2x5 grid: 9 presets + 1 custom header color picker in 10th spot)
  const tableStylePresets = [
    { name: 'Slate Blue', class: 'theme-slate-blue', color: '#3b5998' },
    { name: 'Charcoal', class: 'theme-charcoal', color: '#2d3748' },
    { name: 'Olive Green', class: 'theme-olive', color: '#658a24' },
    { name: 'Warm Orange', class: 'theme-orange', color: '#e67e22' },
    { name: 'Pure White', class: 'theme-white', color: '#ffffff', border: '#cbd5e1' },
    { name: 'Azure Blue', class: 'theme-azure', color: '#185abd' },
    { name: 'Emerald Green', class: 'theme-green', color: '#10b981' },
    { name: 'Coral Red', class: 'theme-red', color: '#ef4444' },
    { name: 'Amber Gold', class: 'theme-amber', color: '#f59e0b' },
  ];

  // Smart Theme Color Helpers for Tables
  const getContrastTextColor = (hex: string): string => {
    const clean = hex.replace('#', '').trim();
    const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
    const r = parseInt(fullHex.substring(0, 2), 16) || 0;
    const g = parseInt(fullHex.substring(2, 4), 16) || 0;
    const b = parseInt(fullHex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 155 ? '#0f172a' : '#ffffff';
  };

  const getTableSoftTint = (hex: string, factor = 0.94): string => {
    const clean = hex.replace('#', '').trim();
    const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
    const r = parseInt(fullHex.substring(0, 2), 16) || 0;
    const g = parseInt(fullHex.substring(2, 4), 16) || 0;
    const b = parseInt(fullHex.substring(4, 6), 16) || 0;
    const tr = Math.round(r + (255 - r) * factor);
    const tg = Math.round(g + (255 - g) * factor);
    const tb = Math.round(b + (255 - b) * factor);
    return `#${tr.toString(16).padStart(2, '0')}${tg.toString(16).padStart(2, '0')}${tb.toString(16).padStart(2, '0')}`;
  };

  const getTableBorderColor = (hex: string, darkenFactor = 0.82): string => {
    const clean = hex.replace('#', '').trim();
    const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0');
    const r = parseInt(fullHex.substring(0, 2), 16) || 0;
    const g = parseInt(fullHex.substring(2, 4), 16) || 0;
    const b = parseInt(fullHex.substring(4, 6), 16) || 0;
    const dr = Math.round(r * darkenFactor);
    const dg = Math.round(g * darkenFactor);
    const db = Math.round(b * darkenFactor);
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  };

  const handleApplySmartTableTheme = (color: string, themeIndex: number = -1) => {
    if (!editor) return;

    if (!editor.isActive('table')) {
      // Insert a fresh formatted table if not in a table
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }

    const headerColor = color;
    const headerTextColor = getContrastTextColor(headerColor);
    const headerBorderColor = getTableBorderColor(headerColor, 0.82);
    const zebraColor = getTableSoftTint(headerColor, 0.94);
    const cellBorderColor = '#cbd5e1';

    setTimeout(() => {
      // 1. Update ProseMirror node attributes if table found in selection
      try {
        const { state, view } = editor;
        const tableInfo = findTable(state.selection.$from);
        if (tableInfo) {
          const tr = state.tr;
          let rowIndex = 0;

          tableInfo.node.forEach((rowNode: any, rowOffset: number) => {
            const isHeaderRow = rowIndex === 0;

            rowNode.forEach((cellNode: any, cellOffset: number) => {
              const absCellPos = tableInfo.pos + 1 + rowOffset + 1 + cellOffset;
              let currentStyle = (cellNode.attrs.style || '') as string;
              currentStyle = currentStyle
                .replace(/background(-color)?:\s*[^;]+;?/gi, '')
                .replace(/color:\s*[^;]+;?/gi, '')
                .replace(/border-color:\s*[^;]+;?/gi, '')
                .trim();

              let newStyle = '';
              if (isHeaderRow) {
                newStyle = `${currentStyle} background-color: ${headerColor}; color: ${headerTextColor}; border-color: ${headerBorderColor}; font-weight: 600;`.trim();
              } else {
                const isEvenDataRow = (rowIndex - 1) % 2 === 1;
                const bg = isEvenDataRow ? zebraColor : '#ffffff';
                newStyle = `${currentStyle} background-color: ${bg}; border-color: ${cellBorderColor};`.trim();
              }

              tr.setNodeMarkup(absCellPos, undefined, {
                ...cellNode.attrs,
                style: newStyle,
                backgroundColor: isHeaderRow ? headerColor : ((rowIndex - 1) % 2 === 1 ? zebraColor : '#ffffff'),
              });
            });

            rowIndex++;
          });

          view.dispatch(tr);
        }
      } catch (err) {
        console.warn('Could not set ProseMirror table attributes:', err);
      }

      // 2. Direct DOM styling on active table in view for immediate continuous rendering
      const proseMirrorDom = editor.view.dom;
      const tables = proseMirrorDom.querySelectorAll('table');
      if (tables.length > 0) {
        let targetTable: HTMLTableElement = tables[tables.length - 1] as HTMLTableElement;
        tables.forEach((t) => {
          if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
            targetTable = t as HTMLTableElement;
          }
        });

        // Clear existing style classes
        tableStylePresets.forEach((p) => targetTable.classList.remove(p.class));
        targetTable.classList.remove('theme-purple', 'theme-teal');

        if (themeIndex >= 0 && tableStylePresets[themeIndex]) {
          targetTable.classList.add(tableStylePresets[themeIndex].class);
        }

        // Set CSS custom properties on table
        targetTable.dataset.customTheme = headerColor;
        targetTable.style.setProperty('--table-header-bg', headerColor);
        targetTable.style.setProperty('--table-header-color', headerTextColor);
        targetTable.style.setProperty('--table-header-border', headerBorderColor);
        targetTable.style.setProperty('--table-zebra-bg', zebraColor);

        // Apply styles to all cells in DOM
        const rows = targetTable.querySelectorAll('tr');
        let dataRowIdx = 0;
        rows.forEach((row, rIdx) => {
          const isHeader = rIdx === 0 || row.querySelector('th') !== null;
          if (isHeader) {
            const cells = row.querySelectorAll('th, td');
            cells.forEach((cell) => {
              const el = cell as HTMLElement;
              el.style.backgroundColor = headerColor;
              el.style.color = headerTextColor;
              el.style.borderColor = headerBorderColor;
              el.style.fontWeight = '600';
              el.querySelectorAll('p, span, strong').forEach((child) => {
                (child as HTMLElement).style.color = headerTextColor;
              });
            });
          } else {
            const bg = dataRowIdx % 2 === 1 ? zebraColor : '#ffffff';
            const cells = row.querySelectorAll('td');
            cells.forEach((cell) => {
              const el = cell as HTMLElement;
              el.style.backgroundColor = bg;
              el.style.borderColor = cellBorderColor;
            });
            dataRowIdx++;
          }
        });
      }

      editor.commands.focus();
    }, 40);
  };

  const handleApplyTableStyle = (themeIndex: number) => {
    setSelectedTableTheme(themeIndex);
    const color = tableStylePresets[themeIndex]?.color || '#3b5998';
    setSelectedTableColor(color);
    handleApplySmartTableTheme(color, themeIndex);
  };

  const handleCycleTableBorders = () => {
    if (!editor) return;
    if (!editor.isActive('table')) {
      handleInsertTable(3, 3);
      return;
    }
    const nextMode = borderMode === 'normal' ? 'minimal' : borderMode === 'minimal' ? 'none' : 'normal';
    setBorderMode(nextMode);

    const proseMirrorDom = editor.view.dom;
    const tables = proseMirrorDom.querySelectorAll('table');
    tables.forEach((t) => {
      t.classList.remove('borders-minimal', 'borders-none');
      if (nextMode === 'minimal') t.classList.add('borders-minimal');
      if (nextMode === 'none') t.classList.add('borders-none');
    });
  };

  // Table Full Width toggle
  const handleToggleTableFullWidth = () => {
    if (!editor) return;
    const { state, view } = editor;
    const table = findTable(state.selection.$from);
    if (!table) return;

    const currentStyle = (table.node.attrs.style || '') as string;
    const isCurrentlyFull =
      currentStyle.includes('width: 100%') ||
      currentStyle.includes('width:100%') ||
      table.node.attrs.fullWidth === true;

    let newStyle = currentStyle
      .replace(/width:\s*[^;]+;?/gi, '')
      .replace(/table-layout:\s*[^;]+;?/gi, '')
      .trim();
    const nextFullWidth = !isCurrentlyFull;

    if (nextFullWidth) {
      newStyle = `${newStyle} width: 100%; table-layout: fixed;`.trim();
    } else {
      newStyle = `${newStyle} width: auto; table-layout: auto;`.trim();
    }

    const tr = state.tr;
    tr.setNodeMarkup(table.pos, undefined, {
      ...table.node.attrs,
      style: newStyle,
      fullWidth: nextFullWidth,
    });

    view.dispatch(tr);

    // Sync active DOM table element
    const domTables = view.dom.querySelectorAll('table');
    domTables.forEach((t: HTMLTableElement) => {
      if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
        if (nextFullWidth) {
          t.style.width = '100%';
          t.style.tableLayout = 'fixed';
        } else {
          t.style.width = 'auto';
          t.style.tableLayout = 'auto';
        }
      }
    });
  };

  // Insert Text Paragraph Above Active Table
  const handleInsertParagraphAboveTable = () => {
    if (!editor) return;
    const { state, view } = editor;
    const table = findTable(state.selection.$from);
    if (!table) return;

    const tablePos = table.pos;
    const tr = state.tr;
    const pNode = state.schema.nodes.paragraph.create();
    tr.insert(tablePos, pNode);

    // Position cursor inside newly inserted paragraph
    const targetPos = Math.max(1, tablePos + 1);
    const resolved = tr.doc.resolve(targetPos);
    tr.setSelection(TextSelection.near(resolved));

    view.dispatch(tr);
    editor.commands.focus();
  };

  // Insert Text Paragraph Below Active Table
  const handleInsertParagraphBelowTable = () => {
    if (!editor) return;
    const { state, view } = editor;
    const table = findTable(state.selection.$from);
    if (!table) return;

    const insertPos = table.pos + table.node.nodeSize;
    const tr = state.tr;
    const pNode = state.schema.nodes.paragraph.create();
    tr.insert(insertPos, pNode);

    // Position cursor inside newly inserted paragraph
    const targetPos = Math.min(tr.doc.content.size - 1, insertPos + 1);
    const resolved = tr.doc.resolve(targetPos);
    tr.setSelection(TextSelection.near(resolved));

    view.dispatch(tr);
    editor.commands.focus();
  };

  const isTableActive = editor?.isActive('table') ?? false;
  let isTableFullWidth = false;
  if (editor && isTableActive) {
    const table = findTable(editor.state.selection.$from);
    if (table) {
      const s = (table.node.attrs.style || '') as string;
      isTableFullWidth =
        s.includes('width: 100%') ||
        s.includes('width:100%') ||
        table.node.attrs.fullWidth === true;
    }
  }

  const currentFontSize =
    editor?.getAttributes('textStyle')?.fontSize?.replace(/px|pt/gi, '') || '11';

  const commitFontSize = useCallback(
    (val: string) => {
      const cleanVal = val.trim().replace(/px|pt/gi, '');
      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0 && num <= 500) {
        editor?.chain().focus().setFontSize(`${num}px`).run();
        setFontSizeInputText(String(num));
      } else {
        setFontSizeInputText(currentFontSize);
      }
      setIsFontSizeEditing(false);
      setShowFontSizeDropdown(false);
    },
    [editor, currentFontSize]
  );
  const currentFontFamily = editor?.getAttributes('textStyle')?.fontFamily || 'Calibri, sans-serif';

  const effectiveThemeMode = settings.themeMode || (settings.isDarkMode ? 'fullDark' : 'light');
  const isDarkUi = effectiveThemeMode === 'fullDark' || effectiveThemeMode === 'canvasDark';
  const isSepiaUi = effectiveThemeMode === 'sepia';

  const ribbonContainerBg = isDarkUi
    ? 'bg-[#202020] border-b border-[#333333] text-neutral-200'
    : isSepiaUi
    ? 'bg-[#ede5d5] border-b border-[#d8ccb8] text-[#362b24]'
    : 'bg-[#f3f2f1] border-b border-[#dad9d8] text-neutral-900';

  const tabStripBg = isDarkUi
    ? 'border-b border-[#2d2d2d] bg-[#1a1a1a]'
    : isSepiaUi
    ? 'border-b border-[#ded4c1] bg-[#f8f3e9]'
    : 'border-b border-[#e1dfdd] bg-white';

  // Smart background preloading for non-basic tabs on hover
  const preloadTab = useCallback((tab: RibbonTab) => {
    if (tab === 'seo') {
      import('./ribbon/tabs/SeoTab');
    } else if (tab === 'help') {
      import('./ribbon/tabs/HelpTab');
    }
  }, []);

  return (
    <div
      id="word-ribbon-toolbar"
      className={`${ribbonContainerBg} select-none no-print relative z-50`}
      style={{ position: 'relative', zIndex: 100 }}
    >
      {/* Top Tab Strip (File, Home, Insert, Layout, Review, View) */}
      <div className={`flex items-center justify-between px-3 pt-1 ${tabStripBg}`}>
        <div className="flex items-center space-x-1 text-xs font-medium">
          {/* File Backstage Tab */}
          <button
            onClick={onOpenBackstage}
            className="px-4 py-1.5 bg-[#0b3877] text-white font-bold text-xs rounded-t hover:bg-[#082855] transition-colors cursor-pointer mr-1.5 shadow-xs"
          >
            File
          </button>

          {(['home', 'insert', 'table', 'layout', 'review', 'view', 'format', 'convert', 'seo', 'help'] as RibbonTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const activeTabClass = isDarkUi
              ? 'text-blue-400 font-semibold bg-[#202020] border-t-2 border-blue-500 border-x border-[#333333] shadow-2xs'
              : isSepiaUi
              ? 'text-[#92400e] font-semibold bg-[#ede5d5] border-t-2 border-[#b45309] border-x border-[#d8ccb8] shadow-2xs'
              : 'text-[#185abd] font-semibold bg-white border-t-2 border-[#185abd] border-x border-[#dad9d8] shadow-2xs';

            const inactiveTabClass = isDarkUi
              ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white font-normal'
              : isSepiaUi
              ? 'text-[#6b5847] hover:bg-[#e6dccb] hover:text-[#2d2116] font-normal'
              : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-normal';

            return (
              <button
                key={tab}
                onMouseEnter={() => preloadTab(tab)}
                onFocus={() => preloadTab(tab)}
                onClick={() => {
                  onSelectTab(tab);
                  if (isRibbonCollapsed) setIsRibbonCollapsed(false);
                }}
                className={`px-3.5 py-1.5 text-xs rounded-t transition-all cursor-pointer relative ${
                  isActive ? activeTabClass : inactiveTabClass
                }`}
              >
                {tab === 'seo' ? 'SEO' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Collapse / Expand Ribbon Toggle */}
        <button
          onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
          title={isRibbonCollapsed ? 'Expand the ribbon' : 'Collapse the ribbon'}
          className="p-1 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
        >
          {isRibbonCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Main Ribbon Command Bar */}
      {!isRibbonCollapsed && (
        <div
          className={`min-h-24 px-3 pt-1.5 pb-1 flex items-start space-x-0 relative z-50 ${
            isDarkUi
              ? 'bg-[#202020] text-neutral-100'
              : isSepiaUi
              ? 'bg-[#ede5d5] text-[#362b24]'
              : 'bg-[#f3f2f1] text-neutral-800'
          }`}
          style={{ position: 'relative', zIndex: 100 }}
        >
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <>
              {/* Clipboard Group (2x2 Matrix: Line 1 = Paste, Cut; Line 2 = Painter, Copy) */}
              <div className="flex flex-col justify-between pr-2.5 border-r border-[#dad9d8] relative">
                <div className="flex flex-col space-y-1 relative py-0.5">
                  {/* Line 1: Paste & Cut */}
                  <div className="flex items-center space-x-1">
                    {/* Paste Button (Icon only, text as tooltip) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          triggerPastePopup();
                          if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
                            navigator.clipboard
                              .readText()
                              .then((clipText) => {
                                if (clipText && editor) {
                                  editor.commands.insertContent(clipText);
                                }
                              })
                              .catch((err) => {
                                console.warn('Direct clipboard read restricted by browser:', err);
                              });
                          }
                        }}
                        title="Paste (Ctrl+V) — Click or press Ctrl+V"
                        className="w-7 h-[25px] rounded hover:bg-white hover:shadow-xs transition-all text-neutral-700 hover:text-neutral-900 cursor-pointer flex items-center justify-center border border-transparent"
                      >
                        <ClipboardPaste size={16} className="text-[#185abd]" />
                      </button>

                      {/* Small Blue Popup Message right of Paste for 3s */}
                      {pastePopupVisible && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap bg-blue-600 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <Keyboard size={13} className="shrink-0" />
                          <span>You can use CTRL + V buttons</span>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Cut Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (editor) {
                            const { from, to, empty } = editor.state.selection;
                            if (!empty) {
                              const text = editor.state.doc.textBetween(from, to, '\n');
                              if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                navigator.clipboard
                                  .writeText(text)
                                  .then(() => {
                                    editor.chain().focus().deleteSelection().run();
                                  })
                                  .catch(() => {
                                    document.execCommand('cut');
                                  });
                              } else {
                                document.execCommand('cut');
                              }
                            } else {
                              document.execCommand('cut');
                            }
                          }
                          triggerCutPopup();
                        }}
                        title="Cut (Ctrl+X)"
                        className="h-[25px] px-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer flex items-center space-x-1 border border-transparent min-w-[48px]"
                      >
                        <Scissors size={12} className="text-neutral-600" />
                        <span className="text-[10px]">Cut</span>
                      </button>

                      {/* Small Orange Popup Message right of Cut for 3s */}
                      {cutPopupVisible && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap bg-amber-600 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <Scissors size={13} className="shrink-0" />
                          <span>Transferred to clipboard</span>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-amber-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line 2: Painter & Copy (Painter placed under Paste!) */}
                  <div className="flex items-center space-x-1">
                    {/* Format Painter Button (Icon only, text as tooltip) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const isDoubleClick = e.detail === 2;
                          handleFormatPainterAction(isDoubleClick ? 'persistent' : 'single');
                        }}
                        title={
                          activeFormatPainter
                            ? `Format Painter Active (${activeFormatPainter.mode}) — Click or select text to apply format, or click here / Esc to cancel`
                            : 'Format Painter — Click to copy format for 1 use; Double-click for persistent multi-use. Copies character & paragraph styles safely without touching clipboard!'
                        }
                        className={`w-7 h-[25px] rounded cursor-pointer flex items-center justify-center border transition-all ${
                          activeFormatPainter
                            ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] shadow-xs ring-1 ring-[#185abd]'
                            : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                        }`}
                      >
                        <Paintbrush
                          size={13}
                          className={`${
                            activeFormatPainter
                              ? 'text-[#185abd] animate-pulse'
                              : 'text-amber-600'
                          }`}
                        />
                      </button>

                      {/* Small Notification Popup right of Format Painter for 3s */}
                      {painterPopupVisible && activeFormatPainter && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap bg-indigo-600 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <Sparkles size={13} className="shrink-0" />
                          <span>Format copied in memory ({activeFormatPainter.mode})</span>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-indigo-600" />
                        </div>
                      )}
                    </div>

                    {/* Copy Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (editor) {
                            const { from, to, empty } = editor.state.selection;
                            let text = '';
                            if (!empty) {
                              text = editor.state.doc.textBetween(from, to, '\n');
                            } else {
                              text = editor.state.selection.$from.parent.textContent;
                            }
                            if (text && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                              navigator.clipboard.writeText(text).catch(() => {
                                document.execCommand('copy');
                              });
                            } else {
                              document.execCommand('copy');
                            }
                          }
                          triggerCopyPopup();
                        }}
                        title="Copy (Ctrl+C)"
                        className="h-[25px] px-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer flex items-center space-x-1 border border-transparent min-w-[48px]"
                      >
                        <Copy size={12} className="text-neutral-600" />
                        <span className="text-[10px]">Copy</span>
                      </button>

                      {/* Small Green Popup Message right of Copy for 3s */}
                      {copyPopupVisible && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap bg-emerald-600 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                          <Check size={13} className="shrink-0 stroke-[3]" />
                          <span>Selected area Copyed</span>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-emerald-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Clipboard</span>
              </div>

              {/* Font Group */}
              <div className="flex flex-col justify-between px-2.5 border-r border-[#dad9d8]">
                <div className="flex flex-col space-y-1">
                  {/* Font Family & Size Selectors */}
                  <div className="flex items-start space-x-1">
                    <select
                      value={currentFontFamily}
                      onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
                      className="h-6 text-xs bg-white border border-[#c8c6c4] hover:border-neutral-400 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-[#185abd] w-32 truncate"
                    >
                      {fonts.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Editable Font Size Combobox */}
                    <div className="relative flex items-center" ref={fontSizeDropdownRef}>
                      <input
                        type="text"
                        value={isFontSizeEditing ? fontSizeInputText : currentFontSize}
                        onChange={(e) => {
                          setFontSizeInputText(e.target.value);
                        }}
                        onFocus={(e) => {
                          setIsFontSizeEditing(true);
                          setFontSizeInputText(currentFontSize);
                          e.target.select();
                        }}
                        onBlur={() => {
                          if (isFontSizeEditing) {
                            commitFontSize(fontSizeInputText);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitFontSize(fontSizeInputText);
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === 'Escape') {
                            setFontSizeInputText(currentFontSize);
                            setIsFontSizeEditing(false);
                            setShowFontSizeDropdown(false);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        title="Font Size — Click to type custom size (e.g. 19) and press Enter, or pick from dropdown"
                        className="h-6 text-xs bg-white border border-r-0 border-[#c8c6c4] hover:border-neutral-400 rounded-l px-1 focus:outline-none focus:ring-1 focus:ring-[#185abd] w-9 text-center font-medium select-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                        title="Font Size Presets"
                        className="h-6 px-1 bg-white border border-l-0 border-[#c8c6c4] hover:bg-neutral-100 hover:border-neutral-400 rounded-r flex items-center justify-center cursor-pointer text-neutral-600"
                      >
                        <ChevronDown size={11} />
                      </button>

                      {/* Font Size Dropdown Menu */}
                      {showFontSizeDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded shadow-xl py-1 z-50 w-16 max-h-48 overflow-y-auto">
                          {fontSizes.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                commitFontSize(s);
                              }}
                              className={`w-full text-center px-2 py-0.5 text-xs hover:bg-blue-50 hover:text-[#185abd] cursor-pointer ${
                                currentFontSize === s ? 'bg-blue-100 font-bold text-[#185abd]' : 'text-neutral-700'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grow / Shrink Font buttons */}
                    <button
                      onClick={() => {
                        const next = Math.min(72, parseInt(currentFontSize, 10) + 2);
                        editor?.chain().focus().setFontSize(`${next}px`).run();
                      }}
                      title="Increase Font Size (Ctrl+])"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer font-bold text-xs"
                    >
                      A<sup>+</sup>
                    </button>
                    <button
                      onClick={() => {
                        const prev = Math.max(8, parseInt(currentFontSize, 10) - 2);
                        editor?.chain().focus().setFontSize(`${prev}px`).run();
                      }}
                      title="Decrease Font Size (Ctrl+[)"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer font-bold text-xs"
                    >
                      A<sup>-</sup>
                    </button>

                    {/* Clear Formatting */}
                    <button
                      onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                      title="Clear All Formatting"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-600 cursor-pointer text-xs"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>

                  {/* Character Styling Row */}
                  <div className="flex items-start space-x-0.5">
                    <button
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      title="Bold (Ctrl+B)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('bold')
                          ? 'bg-[#185abd] border-[#185abd] text-white font-bold shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      title="Italic (Ctrl+I)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('italic')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      title="Underline (Ctrl+U)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('underline')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Underline size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      title="Strikethrough"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('strike')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Strikethrough size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleSubscript().run()}
                      title="Subscript"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('subscript')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Subscript size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                      title="Superscript"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('superscript')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Superscript size={14} />
                    </button>

                    <div className="w-px h-4 bg-neutral-300 mx-1" />

                    {/* Text Highlight Color Dropdown */}
                    <div className="relative" ref={highlightPickerRef}>
                      <button
                        onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                        title="Text Highlight Color"
                        className={`p-1 rounded cursor-pointer flex items-center space-x-0.5 border transition-all ${
                          showHighlightPicker
                            ? 'bg-[#185abd] border-[#185abd] text-white'
                            : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700'
                        }`}
                      >
                        <Highlighter size={14} className={showHighlightPicker ? 'text-white' : 'text-amber-500'} />
                        <ChevronDown size={9} />
                      </button>

                      {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-2.5 z-50 grid grid-cols-4 gap-2 w-44">
                          <div className="col-span-4 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-100 mb-1">
                            Highlight Color
                          </div>
                          {highlightColors.map((h) => (
                            <button
                              key={h.name}
                              onClick={() => {
                                editor?.chain().focus().toggleHighlight({ color: h.color }).run();
                                setShowHighlightPicker(false);
                              }}
                              title={h.name}
                              style={{ backgroundColor: h.color }}
                              className="w-7 h-7 rounded border border-neutral-300 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                            />
                          ))}
                          <button
                            onClick={() => {
                              editor?.chain().focus().unsetHighlight().run();
                              setShowHighlightPicker(false);
                            }}
                            className="col-span-4 text-xs text-neutral-700 hover:bg-neutral-100 py-1.5 rounded text-center border-t border-neutral-200 mt-1 font-medium cursor-pointer"
                          >
                            No Color
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Font Color Dropdown */}
                    <div className="relative" ref={colorPickerRef}>
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        title="Font Color"
                        className={`p-1 rounded cursor-pointer flex items-center space-x-0.5 border transition-all ${
                          showColorPicker
                            ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                            : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-xs leading-none">A</span>
                          <span className="w-3.5 h-0.5 bg-[#185abd] rounded-full mt-0.5"></span>
                        </div>
                        <ChevronDown size={9} />
                      </button>

                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-3 z-50 w-52">
                          <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 border-b border-neutral-100 mb-2">
                            Theme Colors
                          </div>
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {textColors.map((c) => (
                              <button
                                key={c.name}
                                onClick={() => {
                                  editor?.chain().focus().setColor(c.color).run();
                                  setShowColorPicker(false);
                                }}
                                title={c.name}
                                style={{ backgroundColor: c.color }}
                                className="w-6 h-6 rounded-sm border border-neutral-300 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                              />
                            ))}
                          </div>
                          <div className="pt-2 border-t border-neutral-200">
                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                              Custom Color
                            </label>
                            <div className="flex items-start space-x-2">
                              <input
                                type="color"
                                onChange={(e) => {
                                  editor?.chain().focus().setColor(e.target.value).run();
                                  setShowColorPicker(false);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border border-neutral-300 p-0.5"
                                title="Custom color picker"
                              />
                              <span className="text-xs text-neutral-600">Pick any color</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Font</span>
              </div>

              {/* Paragraph Group */}
              <div className="flex flex-col justify-between px-2.5 border-r border-[#dad9d8]">
                <div className="flex flex-col space-y-1">
                  {/* Top Row: Lists, Indents, Spacing, Paragraph Marks */}
                  <div className="flex items-start space-x-0.5">
                    <button
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      title="Bullets"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('bulletList')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <List size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      title="Numbering"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('orderedList')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleTaskList().run()}
                      title="Checklist / Task List"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('taskList')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <CheckSquare size={14} />
                    </button>

                    <div className="w-px h-4 bg-neutral-300 mx-0.5" />

                    <button
                      onClick={handleDecreaseIndent}
                      title="Decrease Indent (Shift+Tab in lists, reduces paragraph margin)"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:bg-neutral-100 cursor-pointer transition-all"
                    >
                      <Outdent size={14} />
                    </button>
                    <button
                      onClick={handleIncreaseIndent}
                      title="Increase Indent (Tab in lists, indents paragraph margin)"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:bg-neutral-100 cursor-pointer transition-all"
                    >
                      <Indent size={14} />
                    </button>

                    <div className="w-px h-4 bg-neutral-300 mx-0.5" />

                    {/* Line spacing dropdown */}
                    <div className="relative" ref={lineHeightPickerRef}>
                      <button
                        onClick={() => setShowLineHeightPicker(!showLineHeightPicker)}
                        title="Line and Paragraph Spacing"
                        className={`p-1 rounded cursor-pointer flex items-center space-x-0.5 border transition-all ${
                          showLineHeightPicker
                            ? 'bg-[#185abd] border-[#185abd] text-white'
                            : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700'
                        }`}
                      >
                        <span className="text-[11px] font-semibold">
                          {(() => {
                            const val = editor?.getAttributes('paragraph')?.lineHeight || editor?.getAttributes('heading')?.lineHeight;
                            if (val === '0.5') return '0,5';
                            return val || '1.15';
                          })()}
                        </span>
                        <ChevronDown size={9} />
                      </button>

                      {showLineHeightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl py-1 z-50 w-36 text-xs select-none">
                          <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-0.5">
                            Line Spacing
                          </div>
                          {[
                            { val: '0', label: '0' },
                            { val: '0.5', label: '0,5' },
                            { val: '1.0', label: '1.0' },
                            { val: '1.15', label: '1.15' },
                            { val: '1.5', label: '1.5' },
                            { val: '2.0', label: '2.0' },
                            { val: '2.5', label: '2.5' },
                            { val: '3', label: '3' },
                          ].map(({ val, label }) => {
                            const isCurrent =
                              editor?.getAttributes('paragraph')?.lineHeight === val ||
                              editor?.getAttributes('heading')?.lineHeight === val;
                            return (
                              <button
                                key={val}
                                onClick={() => {
                                  editor?.chain().focus().setLineHeight(val).run();
                                  setShowLineHeightPicker(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 text-neutral-700 flex items-center justify-between cursor-pointer transition-colors ${
                                  isCurrent ? 'bg-blue-50/80 font-bold text-[#185abd]' : ''
                                }`}
                              >
                                <span>{label}</span>
                                <span className="text-[10px] text-neutral-400">lines</span>
                              </button>
                            );
                          })}

                          <div className="border-t border-neutral-100 my-1" />

                          {/* Clean (lines) - Cleans all spacing options to 'no spacing' in selected area, including table spacing */}
                          <button
                            onClick={() => {
                              if (editor) cleanAllSpacing(editor);
                              setShowLineHeightPicker(false);
                            }}
                            title="Clean all spacing (line, paragraph, and table spacing) to 'no spacing' in selected area"
                            className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-neutral-800 flex items-center justify-between cursor-pointer transition-colors group"
                          >
                            <span className="font-semibold text-amber-700">Clean</span>
                            <span className="text-[10px] text-neutral-400">lines</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Paragraph Marks (¶) */}
                    <button
                      onClick={() => onUpdateSettings({ showParagraphMarks: !settings.showParagraphMarks })}
                      title="Show/Hide Paragraph Marks (¶)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        settings.showParagraphMarks
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Pilcrow size={14} />
                    </button>
                  </div>

                  {/* Bottom Row: Alignments, Quote, Code */}
                  <div className="flex items-start space-x-0.5">
                    <button
                      onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                      title="Align Left (Ctrl+L)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive({ textAlign: 'left' }) || (!editor?.isActive({ textAlign: 'center' }) && !editor?.isActive({ textAlign: 'right' }) && !editor?.isActive({ textAlign: 'justify' }) && !editor?.isActive('heading') && editor?.isActive('paragraph'))
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <AlignLeft size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                      title="Center (Ctrl+E)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive({ textAlign: 'center' })
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <AlignCenter size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                      title="Align Right (Ctrl+R)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive({ textAlign: 'right' })
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <AlignRight size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                      title="Justify (Ctrl+J)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive({ textAlign: 'justify' })
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <AlignJustify size={14} />
                    </button>

                    <div className="w-px h-4 bg-neutral-300 mx-0.5" />

                    <button
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                      title="Quote (Blockquote)"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('blockquote')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Quote size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleCode().run()}
                      title="Inline Code"
                      className={`p-1 rounded cursor-pointer transition-all border ${
                        editor?.isActive('code')
                          ? 'bg-[#185abd] border-[#185abd] text-white shadow-xs hover:bg-[#134896]'
                          : 'border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 active:border-[#185abd]'
                      }`}
                    >
                      <Code size={14} />
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Paragraph</span>
              </div>

              {/* Styles Quick Gallery */}
              <div className="flex flex-col justify-between px-2.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5 overflow-x-auto py-0.5 max-w-[340px]">
                  {/* Normal Style */}
                  <button
                    onClick={() => editor?.chain().focus().setParagraph().run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('paragraph') && !editor?.isActive('heading')
                        ? isDarkUi
                          ? 'border-[#0078d4] bg-[#0e3a64] ring-1 ring-[#0078d4] shadow-xs'
                          : 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : isDarkUi
                        ? 'border-[#404040] bg-[#282828] hover:border-[#0078d4] hover:bg-[#333333]'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs leading-tight ${editor?.isActive('paragraph') && !editor?.isActive('heading') ? (isDarkUi ? 'text-[#93c5fd] font-semibold' : 'text-[#185abd] font-semibold') : (isDarkUi ? 'text-neutral-200 font-normal' : 'text-neutral-800 font-normal')}`}>AaBbCc</span>
                    <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}>Normal (p)</span>
                  </button>

                  {/* Heading 1 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 1 })
                        ? isDarkUi
                          ? 'border-[#0078d4] bg-[#0e3a64] ring-1 ring-[#0078d4] shadow-xs'
                          : 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : isDarkUi
                        ? 'border-[#404040] bg-[#282828] hover:border-[#0078d4] hover:bg-[#333333]'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs font-bold leading-tight ${isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]'}`}>AaBbCc</span>
                    <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}>Heading 1 (h1)</span>
                  </button>

                  {/* Heading 2 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 2 })
                        ? isDarkUi
                          ? 'border-[#0078d4] bg-[#0e3a64] ring-1 ring-[#0078d4] shadow-xs'
                          : 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : isDarkUi
                        ? 'border-[#404040] bg-[#282828] hover:border-[#0078d4] hover:bg-[#333333]'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs font-semibold leading-tight ${isDarkUi ? 'text-[#93c5fd]' : 'text-[#2b579a]'}`}>AaBbCc</span>
                    <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}>Heading 2 (h2)</span>
                  </button>

                  {/* Heading 3 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 3 })
                        ? isDarkUi
                          ? 'border-[#0078d4] bg-[#0e3a64] ring-1 ring-[#0078d4] shadow-xs'
                          : 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : isDarkUi
                        ? 'border-[#404040] bg-[#282828] hover:border-[#0078d4] hover:bg-[#333333]'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs font-semibold leading-tight ${isDarkUi ? 'text-[#bfdbfe]' : 'text-[#3b82f6]'}`}>AaBbCc</span>
                    <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}>Heading 3 (h3)</span>
                  </button>

                  {/* Quote Style */}
                  <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('blockquote')
                        ? isDarkUi
                          ? 'border-[#0078d4] bg-[#0e3a64] ring-1 ring-[#0078d4] shadow-xs'
                          : 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : isDarkUi
                        ? 'border-[#404040] bg-[#282828] hover:border-[#0078d4] hover:bg-[#333333]'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs italic leading-tight ${isDarkUi ? 'text-neutral-300' : 'text-neutral-600'}`}>"AaBb"</span>
                    <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}>Quote</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Styles</span>
              </div>

              {/* Editing Group */}
              <div className="flex flex-col justify-between pl-2.5">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={onOpenFindReplace}
                      title="Find (Ctrl+F)"
                      className="flex items-center space-x-1 px-2 py-0.5 rounded border border-transparent hover:border-[#185abd] hover:bg-white text-neutral-700 cursor-pointer text-xs transition-all"
                    >
                      <Search size={13} className="text-[#185abd]" />
                      <span className="text-[11px] font-medium">Find</span>
                    </button>
                    <button
                      onClick={onOpenFindReplace}
                      title="Replace (Ctrl+H)"
                      className="flex items-center space-x-1 px-2 py-0.5 rounded border border-transparent hover:border-[#185abd] hover:bg-white text-neutral-700 cursor-pointer text-xs transition-all"
                    >
                      <Replace size={13} className="text-[#185abd]" />
                      <span className="text-[11px] font-medium">Replace</span>
                    </button>
                  </div>

                  <button
                    onClick={() => editor?.chain().focus().selectAll().run()}
                    title="Select All (Ctrl+A)"
                    className="flex items-center space-x-1.5 px-2 py-0.5 rounded border border-transparent hover:border-[#185abd] hover:bg-white text-neutral-700 cursor-pointer text-xs transition-all"
                  >
                    <span className="font-mono text-xs font-bold text-neutral-500">⬚</span>
                    <span className="text-[11px]">Select All</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Editing</span>
              </div>
            </>
          )}

          {/* INSERT TAB */}
          {activeTab === 'insert' && (
            <>
              {/* Pages Group (Page Break, Blank Page) */}
              <div className="flex flex-col justify-between pr-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  {/* Page Break */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor
                        .chain()
                        .focus()
                        .insertContent('<hr class="word-page-break" /><p></p>')
                        .run();
                    }}
                    title="Insert Page Break (Ctrl+Enter)"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer transition-all group"
                  >
                    <SplitSquareVertical size={20} className="text-[#185abd] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Page<br />Break
                    </span>
                  </button>

                  {/* Blank Page */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor
                        .chain()
                        .focus()
                        .insertContent('<hr class="word-page-break" /><p></p><hr class="word-page-break" /><p></p>')
                        .run();
                    }}
                    title="Insert a blank page into the document"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer transition-all group"
                  >
                    <FilePlus2 size={20} className="text-[#3b5998] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Blank<br />Page
                    </span>
                  </button>

                  {/* Line (Crisp Solid Dark Horizontal Line - matches middle item in reference image) */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor
                        .chain()
                        .focus()
                        .insertContent('<hr class="word-solid-line" /><p></p>')
                        .run();
                    }}
                    title="Insert Crisp Solid Horizontal Line"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer transition-all group"
                  >
                    <div className="w-5 h-5 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <div className="w-4.5 h-[2px] bg-neutral-900 rounded-xs shadow-2xs" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Line
                    </span>
                  </button>

                  {/* Divider (Moved after Line - subtle soft divider line matching bottom item in reference image) */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor
                        .chain()
                        .focus()
                        .insertContent('<hr class="word-divider" /><p></p>')
                        .run();
                    }}
                    title="Insert Subtle Divider Line"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer transition-all group"
                  >
                    <div className="w-5 h-5 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <div className="w-4.5 h-[1.5px] bg-[#94a3b8] rounded-xs" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Divider
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Pages &amp; Lines</span>
              </div>

              {/* Tables Group (Retained existing) */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="relative" ref={tablePickerRef}>
                  <button
                    onClick={() => setShowTablePicker(!showTablePicker)}
                    className={`flex flex-col items-center justify-start px-2.5 py-1.5 rounded cursor-pointer transition-all border ${
                      showTablePicker
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <TableIcon size={20} className="text-[#185abd] mb-1" />
                    <span className="text-[11px] font-medium flex items-center">
                      Table <ChevronDown size={10} className="ml-1" />
                    </span>
                  </button>

                  {/* Interactive Word Table Grid Selector */}
                  {showTablePicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-3.5 z-50 w-60">
                      <div className="text-xs font-semibold text-neutral-700 mb-2 flex items-center justify-between">
                        <span>Insert Table</span>
                        <span className="font-mono text-[#185abd] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                          {tableHoverCols} &times; {tableHoverRows}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 bg-neutral-50 p-2.5 rounded border border-neutral-200">
                        {Array.from({ length: 36 }).map((_, i) => {
                          const r = Math.floor(i / 6) + 1;
                          const c = (i % 6) + 1;
                          const isHovered = r <= tableHoverRows && c <= tableHoverCols;
                          return (
                            <div
                              key={i}
                              onMouseEnter={() => {
                                setTableHoverRows(r);
                                setTableHoverCols(c);
                              }}
                              onClick={() => handleInsertTable(tableHoverRows, tableHoverCols)}
                              className={`w-5 h-5 rounded-xs border cursor-pointer transition-colors ${
                                isHovered
                                  ? 'bg-blue-300 border-[#185abd]'
                                  : 'bg-white border-neutral-300'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 text-[10px] text-neutral-500 text-center">
                        Hover grid to size &bull; Click to create table
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Tables</span>
              </div>

              {/* Illustrations / Media Group: Pictures, AI Image, Image Wizard, Divider */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  {/* Pictures (Green Icon as shown in image) */}
                  <button
                    onClick={() => setShowImageModal(true)}
                    title="Insert picture from file or URL"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <ImageIcon size={20} className="text-[#0e705b] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight">Pictures</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* AI Image (Purple Sparkle as shown in image) */}
                  <button
                    onClick={() => setShowAiImageModal(true)}
                    title="Generate AI Image with Gemini or AI Demo Studio"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <Sparkles size={20} className="text-[#9333ea] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      AI<br />Image
                    </span>
                  </button>

                  {/* Chart (BarChart3 - Standalone Lazy-Loaded Independent Chart Generator) */}
                  <button
                    onClick={() => setShowChartModal(true)}
                    title="Insert Chart — Generate Bar, Column, Line, or Pie chart from table values and insert as WebP image"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <BarChart3 size={20} className="text-[#2563eb] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Chart
                    </span>
                  </button>

                  {/* Image Wizard (Opens / Closes Right Toolbar Image Wizard) */}
                  <button
                    onClick={() => onUpdateSettings({ showImageWizardPane: !settings.showImageWizardPane })}
                    title="Image Wizard — Open/Close Image Wizard Right Toolbar"
                    className={`flex flex-col items-center justify-start px-2 py-1.5 rounded cursor-pointer transition-all border ${
                      settings.showImageWizardPane
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Wand2
                      size={20}
                      className={`mb-1 group-hover:scale-105 transition-transform ${
                        settings.showImageWizardPane ? 'text-[#185abd]' : 'text-[#059669]'
                      }`}
                    />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Image<br />Wizard
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Illustrations</span>
              </div>

              {/* Interactive Insertions: Date & Time, Symbols, Quick Blocks, Command */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  {/* Date & Time (Blue Calendar as shown in image) */}
                  <button
                    onClick={() => {
                      const now = new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      editor?.chain().focus().insertContent(` <strong>${now}</strong> `).run();
                    }}
                    title="Insert Current Date and Time"
                    className="flex flex-col items-center justify-start px-2 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <Calendar size={20} className="text-[#2563eb] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Date &amp;<br />Time
                    </span>
                  </button>

                  {/* Symbols (Purple Smile as shown in image) */}
                  <button
                    onClick={() => setShowSymbolsPicker(true)}
                    title="Insert Special Symbol or Character"
                    className={`flex flex-col items-center justify-start px-2.5 py-1.5 rounded cursor-pointer transition-all border ${
                      showSymbolsPicker
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Smile size={20} className="text-[#6366f1] mb-1" />
                    <span className="text-[11px] font-medium leading-tight">Symbols</span>
                  </button>

                  {/* Quick Blocks (Opens / Closes Right Toolbar Quick Blocks) */}
                  <button
                    onClick={() => onUpdateSettings({ showQuickBlocksPane: !settings.showQuickBlocksPane })}
                    title="Quick Blocks — Open/Close Quick Blocks Right Toolbar"
                    className={`flex flex-col items-center justify-start px-2 py-1.5 rounded cursor-pointer transition-all border ${
                      settings.showQuickBlocksPane
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <LayoutGrid
                      size={20}
                      className={`mb-1 group-hover:scale-105 transition-transform ${
                        settings.showQuickBlocksPane ? 'text-[#185abd]' : 'text-[#b45309]'
                      }`}
                    />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      Quick<br />Blocks
                    </span>
                  </button>

                  {/* Command (Voice Command Right Toolbar Toggle) */}
                  <button
                    onClick={() => onUpdateSettings({ showVoiceCommandPane: !settings.showVoiceCommandPane })}
                    title="Voice Command — Open/Close Voice Command Right Toolbar"
                    className={`flex flex-col items-center justify-start px-2 py-1.5 rounded cursor-pointer transition-all border ${
                      settings.showVoiceCommandPane
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Mic
                      size={20}
                      className={`mb-1 transition-transform group-hover:scale-105 ${
                        settings.showVoiceCommandPane ? 'text-[#185abd]' : 'text-[#be123c]'
                      }`}
                    />
                    <span className="text-[11px] font-medium leading-tight">Command</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Add-ins &amp; Input</span>
              </div>

              {/* Links Group */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowLinkModal(true)}
                    title="Insert Hyperlink (Auto-detects URL or email from clipboard)"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer"
                  >
                    <LinkIcon size={20} className="text-[#185abd] mb-1" />
                    <span className="text-[11px] font-medium">Link</span>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ showHyperLinkPane: !settings.showHyperLinkPane })}
                    title={`Hyper Link Toolbar (Current: ${settings.hyperLinkMode === 'edit' ? 'Edit mode' : 'Navigate mode'})`}
                    className={`relative flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs cursor-pointer transition-colors ${
                      settings.showHyperLinkPane ? 'bg-blue-100/70 text-[#185abd] shadow-xs' : 'text-neutral-700'
                    }`}
                  >
                    <div className="relative">
                      <Link2 size={20} className={settings.showHyperLinkPane ? 'text-[#185abd] mb-1 rotate-45' : 'text-indigo-600 mb-1 rotate-45'} />
                      <span
                        className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-white ${
                          settings.hyperLinkMode === 'edit' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium">Hyper</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Links</span>
              </div>

              {/* Additional Elements (Code Block) */}
              <div className="flex flex-col justify-between pl-1.5 pr-2">
                <button
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  title="Insert Code Block"
                  className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer"
                >
                  <Code size={20} className="text-[#185abd] mb-1" />
                  <span className="text-[11px] font-medium">Code</span>
                </button>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Code Block</span>
              </div>
            </>
          )}

          {/* TABLE TAB (Matching exact layout and buttons from photo) */}
          {activeTab === 'table' && (
            <>
              {/* Group 1: Table v, Table Edit, Borders */}
              <div className="flex items-start space-x-1.5 pr-1.5 border-r border-[#dad9d8]">
                {/* Table v (Blue grid icon with dropdown arrow) */}
                <div className="relative" ref={tableTabPickerRef}>
                  <button
                    onClick={() => setShowTableTabPicker(!showTableTabPicker)}
                    title="Insert table by dimension grid"
                    className={`flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border ${
                      showTableTabPicker
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <TableIcon size={22} className="text-[#185abd] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Table <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Dropdown Grid */}
                  {showTableTabPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-3 z-50 w-52">
                      <div className="text-xs font-semibold text-neutral-700 mb-2">
                        Insert Table ({tableHoverRows}x{tableHoverCols})
                      </div>
                      <div
                        className="grid grid-cols-6 gap-1 mb-2"
                        onMouseLeave={() => {
                          setTableHoverRows(3);
                          setTableHoverCols(3);
                        }}
                      >
                        {Array.from({ length: 36 }).map((_, i) => {
                          const r = Math.floor(i / 6) + 1;
                          const c = (i % 6) + 1;
                          const isHovered = r <= tableHoverRows && c <= tableHoverCols;
                          return (
                            <div
                              key={i}
                              onMouseEnter={() => {
                                setTableHoverRows(r);
                                setTableHoverCols(c);
                              }}
                              onClick={() => {
                                handleInsertTable(r, c);
                                setShowTableTabPicker(false);
                              }}
                              className={`w-5 h-5 border cursor-pointer transition-colors ${
                                isHovered
                                  ? 'bg-[#cde4f7] border-[#185abd]'
                                  : 'bg-white border-neutral-300 hover:border-neutral-400'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="pt-2 border-t border-neutral-100 flex justify-between">
                        <button
                          onClick={() => {
                            handleInsertTable(3, 3);
                            setShowTableTabPicker(false);
                          }}
                          className="text-[11px] text-[#185abd] hover:underline cursor-pointer"
                        >
                          Quick 3x3 Table
                        </button>
                        <button
                          onClick={() => {
                            handleInsertTable(4, 5);
                            setShowTableTabPicker(false);
                          }}
                          className="text-[11px] text-[#185abd] hover:underline cursor-pointer"
                        >
                          4x5 Table
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table Edit Button (Opens/Closes Table Edit Right Toolbar) */}
                <button
                  onClick={() => onUpdateSettings({ showTableEditPane: !settings.showTableEditPane })}
                  title="Table Edit — Open/Close Table Edit Right Toolbar"
                  className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                    settings.showTableEditPane
                      ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <TableProperties
                    size={22}
                    className={`mb-0.5 ${settings.showTableEditPane ? 'text-[#185abd]' : 'text-neutral-700'}`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center">
                    Table<br />Edit
                  </span>
                </button>

                {/* Borders (Opens/Closes Border Edit Right Toolbar) */}
                <button
                  onClick={() => onUpdateSettings({ showBorderEditPane: !settings.showBorderEditPane })}
                  title="Borders — Open/Close Border Edit Right Toolbar"
                  className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                    settings.showBorderEditPane
                      ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Grid
                    size={22}
                    className={`mb-0.5 ${settings.showBorderEditPane ? 'text-[#185abd]' : 'text-neutral-700'}`}
                  />
                  <span className="text-[11px] font-medium leading-tight">Borders</span>
                </button>
              </div>

              {/* Group 2: Table Style Palette (2x5 Grid matching Photo TARGET: 9 Presets + Custom Header Color Picker Swatch, 2 rows only) */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="grid grid-cols-5 gap-1.5 py-1">
                  {tableStylePresets.map((preset, index) => {
                    const isSelected = selectedTableTheme === index;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setSelectedTableTheme(index);
                          setSelectedTableColor(preset.color);
                          handleApplySmartTableTheme(preset.color, index);
                        }}
                        title={`Table Theme: ${preset.name} (${preset.color})`}
                        className={`w-[22px] h-[22px] rounded-xs cursor-pointer transition-all hover:scale-105 relative flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-[#185abd] ring-offset-1 scale-105 shadow-xs'
                            : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: preset.color,
                          border: preset.border ? `1px solid ${preset.border}` : '1px solid rgba(0,0,0,0.2)',
                        }}
                      >
                        {isSelected && (
                          <Check
                            size={11}
                            className={
                              preset.color === '#ffffff' || preset.color === '#e2e8f0' || preset.color === '#cbd5e1'
                                ? 'text-neutral-800'
                                : 'text-white'
                            }
                          />
                        )}
                      </button>
                    );
                  })}

                  {/* 10th Swatch: Custom Header Color Picker with Paintbrush Icon */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => tableColorPickerInputRef.current?.click()}
                      title={`Custom Header Color Picker (Current: ${selectedTableColor}) — Click to choose custom header color`}
                      className={`w-[22px] h-[22px] rounded-xs cursor-pointer transition-all hover:scale-105 relative flex items-center justify-center ${
                        selectedTableTheme === -1
                          ? 'ring-2 ring-[#185abd] ring-offset-1 scale-105 shadow-xs'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        backgroundColor: selectedTableColor,
                        border: '1px solid rgba(0,0,0,0.25)',
                      }}
                    >
                      <Paintbrush
                        size={12}
                        style={{ color: getContrastTextColor(selectedTableColor) }}
                        className="drop-shadow-xs"
                      />
                    </button>
                    <input
                      ref={tableColorPickerInputRef}
                      type="color"
                      value={selectedTableColor}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setSelectedTableColor(newColor);
                        setSelectedTableTheme(-1);
                        handleApplySmartTableTheme(newColor, -1);
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      tabIndex={-1}
                      title="Pick custom header row color"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Table Styles</span>
              </div>

              {/* Group 3: Rows (+Row Below, +Row Above, Del Row) */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5">
                  {/* +Row Below */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      if (!editor.isActive('table')) {
                        handleInsertTable(3, 3);
                      } else {
                        editor.chain().focus().addRowAfter().run();
                      }
                    }}
                    title="Insert Row Below current position"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Rows size={18} className="text-neutral-700" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      +Row<br />Below
                    </span>
                  </button>

                  {/* +Row Above */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      if (!editor.isActive('table')) {
                        handleInsertTable(3, 3);
                      } else {
                        editor.chain().focus().addRowBefore().run();
                      }
                    }}
                    title="Insert Row Above current position"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Rows size={18} className="text-neutral-700" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      +Row<br />Above
                    </span>
                  </button>

                  {/* Del Row */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor.chain().focus().deleteRow().run();
                    }}
                    title="Delete current Row"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-rose-50 hover:shadow-xs text-[#be123c] cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Rows size={18} className="text-[#be123c]" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight text-center text-[#be123c]">
                      Del<br />Row
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Rows</span>
              </div>

              {/* Group 4: Columns (+Col Right, +Col Left, Del Col) */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5">
                  {/* +Col Right */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      if (!editor.isActive('table')) {
                        handleInsertTable(3, 3);
                      } else {
                        editor.chain().focus().addColumnAfter().run();
                      }
                    }}
                    title="Insert Column to the Right"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Columns size={18} className="text-neutral-700" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      +Col<br />Right
                    </span>
                  </button>

                  {/* +Col Left */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      if (!editor.isActive('table')) {
                        handleInsertTable(3, 3);
                      } else {
                        editor.chain().focus().addColumnBefore().run();
                      }
                    }}
                    title="Insert Column to the Left"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Columns size={18} className="text-neutral-700" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center">
                      +Col<br />Left
                    </span>
                  </button>

                  {/* Del Col */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor.chain().focus().deleteColumn().run();
                    }}
                    title="Delete current Column"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-rose-50 hover:shadow-xs text-[#be123c] cursor-pointer group"
                  >
                    <div className="relative mb-0.5">
                      <Columns size={18} className="text-[#be123c]" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight text-center text-[#be123c]">
                      Del<br />Col
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Columns</span>
              </div>

              {/* Group 5: Table (Full width on/off, Paragraph Above, Paragraph Below, Delete Table) */}
              <div className="flex flex-col justify-between pl-1.5 pr-2">
                <div className="flex items-start space-x-2">
                  {/* Button 1: Table Full Width On/Off Toggle */}
                  <button
                    onClick={handleToggleTableFullWidth}
                    disabled={!isTableActive}
                    title={
                      isTableFullWidth
                        ? 'Table Full Width (Active: 100%) — Click to set to Auto / Normal width'
                        : 'Set Active Table to Full Width (100%)'
                    }
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      isTableFullWidth
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:shadow-xs text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-0.5 mt-0.5">
                      <Scan size={16} className={isTableFullWidth ? 'text-[#185abd]' : 'text-neutral-700'} />
                      <div
                        className={`w-6 h-3 rounded-full transition-colors relative flex items-center p-0.5 ${
                          isTableFullWidth ? 'bg-[#185abd]' : 'bg-neutral-400'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-white shadow-xs transform transition-transform ${
                            isTableFullWidth ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] font-medium leading-tight select-none">
                      Full width
                    </span>
                  </button>

                  {/* Vertical Divider */}
                  <div className="h-8 w-px bg-[#dad9d8] self-center my-auto" />

                  {/* Button 2: Add Paragraph Above Active Table */}
                  <button
                    onClick={handleInsertParagraphAboveTable}
                    disabled={!isTableActive}
                    title="Insert Text Paragraph Above Active Table"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded border border-transparent hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Pilcrow size={18} className="text-neutral-700 mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight">above</span>
                  </button>

                  {/* Button 3: Add Paragraph Below Active Table */}
                  <button
                    onClick={handleInsertParagraphBelowTable}
                    disabled={!isTableActive}
                    title="Insert Text Paragraph Below Active Table"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded border border-transparent hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Pilcrow size={18} className="text-neutral-700 mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight">below</span>
                  </button>

                  {/* Vertical Divider */}
                  <div className="h-8 w-px bg-[#dad9d8] self-center my-auto" />

                  {/* Delete Table */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      editor.chain().focus().deleteTable().run();
                    }}
                    title="Delete entire Table"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-rose-50 hover:shadow-xs text-[#be123c] cursor-pointer group"
                  >
                    <Trash2 size={18} className="text-[#be123c] mb-0.5" />
                    <span className="text-[11px] font-semibold leading-tight text-center text-[#be123c]">
                      Delete<br />Table
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Table</span>
              </div>
            </>
          )}

          {/* LAYOUT TAB */}
          {activeTab === 'layout' && (
            <>
              {/* Photo Layout Section (Left): Margins, Orientation, Size, Columns, Divider, Color, Shadow, Watermark */}
              <div className="flex items-start space-x-1.5 pr-1.5 border-r border-[#dad9d8]">
                {/* 1. Margins v */}
                <div className="relative" ref={marginsDropdownRef}>
                  <button
                    onClick={() => setShowMarginsDropdown(!showMarginsDropdown)}
                    title="Document Margins"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showMarginsDropdown
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Scan size={22} className="text-[#185abd] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Margins <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Margins Dropdown */}
                  {showMarginsDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-2 z-50 w-52 text-left">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-100">
                        Margin Presets
                      </div>
                      {[
                        { id: 'normal', name: 'Normal', topBottom: '1"', leftRight: '1"' },
                        { id: 'narrow', name: 'Narrow', topBottom: '0.5"', leftRight: '0.5"' },
                        { id: 'moderate', name: 'Mod', tooltip: 'Moderate', topBottom: '1"', leftRight: '0.75"' },
                        { id: 'wide', name: 'Wide', topBottom: '1"', leftRight: '1.5"' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onUpdateSettings({ margins: m.id as PageMargin, customMargins: undefined });
                            setShowMarginsDropdown(false);
                          }}
                          title={m.id === 'moderate' ? 'Moderate' : m.name}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                            settings.margins === m.id
                              ? 'bg-blue-50 text-[#185abd] font-semibold'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-[10px] text-neutral-400">
                              Top/Bot: {m.topBottom} | Left/Right: {m.leftRight}
                            </div>
                          </div>
                          {settings.margins === m.id && <Check size={14} className="text-[#185abd]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Orientation (Portr... v) */}
                <div className="relative" ref={orientationDropdownRef}>
                  <button
                    onClick={() => setShowOrientationDropdown(!showOrientationDropdown)}
                    title="Page Orientation"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showOrientationDropdown
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <RotateCw size={22} className="text-[#185abd] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      {settings.orientation === 'portrait' ? 'Portr...' : 'Land'} <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Orientation Dropdown */}
                  {showOrientationDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-2 z-50 w-44 text-left">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-100">
                        Page Orientation
                      </div>
                      <button
                        onClick={() => {
                          onUpdateSettings({ orientation: 'portrait' });
                          setShowOrientationDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                          settings.orientation === 'portrait'
                            ? 'bg-blue-50 text-[#185abd] font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <span>Portrait (Vertical)</span>
                        {settings.orientation === 'portrait' && <Check size={14} className="text-[#185abd]" />}
                      </button>
                      <button
                        onClick={() => {
                          onUpdateSettings({ orientation: 'landscape' });
                          setShowOrientationDropdown(false);
                        }}
                        title="Landscape"
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                          settings.orientation === 'landscape'
                            ? 'bg-blue-50 text-[#185abd] font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <span>Land (Horizontal)</span>
                        {settings.orientation === 'landscape' && <Check size={14} className="text-[#185abd]" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Paper Size (A4 v) */}
                <div className="relative" ref={sizeDropdownRef}>
                  <button
                    onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                    title="Paper Page Size"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showSizeDropdown
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <FileText size={22} className="text-[#185abd] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Size <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Size Dropdown */}
                  {showSizeDropdown && (
                    <div
                      className={`absolute top-full left-0 mt-1 border rounded-md shadow-2xl p-2 z-50 w-64 max-h-[380px] overflow-y-auto text-left ${
                        isDarkUi
                          ? 'bg-[#222] border-neutral-700 text-neutral-200'
                          : 'bg-white border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                        <span>Paper Dimensions</span>
                        <span className="text-[9px] text-neutral-400 font-normal">Default: A4</span>
                      </div>
                      {DOCUMENT_PAGE_SIZES.map((s) => {
                        const isSelected = settings.pageSize === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              onUpdateSettings({ pageSize: s.id });
                              setShowSizeDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                              isSelected
                                ? isDarkUi
                                  ? 'bg-blue-950/60 text-blue-300 font-semibold'
                                  : 'bg-blue-50 text-[#185abd] font-semibold'
                                : isDarkUi
                                ? 'text-neutral-300 hover:bg-neutral-800'
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <div>
                              <div className="font-medium flex items-center space-x-1.5">
                                <span className={isSelected ? 'font-bold' : ''}>{s.name}</span>
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal">
                                  — {s.inches}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                {s.metric}
                              </div>
                            </div>
                            {isSelected && (
                              <Check
                                size={14}
                                className={isDarkUi ? 'text-blue-400' : 'text-[#185abd]'}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Columns (Stacked 1 Col / 2 Col buttons) */}
                <div className="flex flex-col space-y-1 shrink-0">
                  <button
                    onClick={() => onUpdateSettings({ columns: 1 })}
                    title="1 Column Layout"
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                      (settings.columns ?? 1) === 1
                        ? isDarkUi
                          ? 'bg-[#1e3a5f] text-[#60a5fa] border-[#0078d4] font-semibold shadow-2xs'
                          : 'bg-[#dbeafe] text-[#185abd] border-transparent font-semibold shadow-2xs'
                        : isDarkUi
                        ? 'border-transparent hover:bg-white/10 text-neutral-300'
                        : 'border-transparent hover:bg-white text-neutral-700'
                    }`}
                  >
                    <Columns size={13} className={(settings.columns ?? 1) === 1 ? (isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]') : (isDarkUi ? 'text-neutral-300' : 'text-neutral-700')} />
                    <span className="whitespace-nowrap">1 Col</span>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ columns: 2 })}
                    title="2 Columns Layout"
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                      settings.columns === 2
                        ? isDarkUi
                          ? 'bg-[#1e3a5f] text-[#60a5fa] border-[#0078d4] font-semibold shadow-2xs'
                          : 'bg-[#dbeafe] text-[#185abd] border-transparent font-semibold shadow-2xs'
                        : isDarkUi
                        ? 'border-transparent hover:bg-white/10 text-neutral-300'
                        : 'border-transparent hover:bg-white text-neutral-700'
                    }`}
                  >
                    <Columns size={13} className={settings.columns === 2 ? (isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]') : (isDarkUi ? 'text-neutral-300' : 'text-neutral-700')} />
                    <span className="whitespace-nowrap">2 Col</span>
                  </button>
                </div>
              </div>

              {/* Photo Layout Section (Right of first divider): Color v, Shadow, Watermark v */}
              <div className="flex items-start space-x-2 px-1.5 border-r border-[#dad9d8]">
                {/* 5. Color v (Purple Palette Icon, 2px smaller) */}
                <div className="relative" ref={colorDropdownRef}>
                  <button
                    onClick={() => setShowColorDropdown(!showColorDropdown)}
                    title="Page Background Color"
                    className={`flex flex-col items-center justify-start px-1.5 py-0.5 rounded cursor-pointer transition-all border ${
                      showColorDropdown
                        ? 'bg-[#ede9fe] border-[#7c3aed] text-[#7c3aed]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Palette size={20} className="text-[#7c3aed] mb-0.5" />
                    <span className="text-[10.5px] font-medium leading-tight flex items-center">
                      Color <ChevronDown size={10} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Color Dropdown */}
                  {showColorDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-3 z-50 w-56 text-left">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-2 border-b border-neutral-100">
                        Theme Colors
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { name: 'White', hex: '#ffffff' },
                          { name: 'Cream', hex: '#fefcf6' },
                          { name: 'Soft Blue', hex: '#f0f7ff' },
                          { name: 'Ice Gray', hex: '#f8fafc' },
                          { name: 'Parchment', hex: '#fbf0d9' },
                          { name: 'Light Mint', hex: '#f0fdf4' },
                          { name: 'Lavender', hex: '#faf5ff' },
                          { name: 'Slate Dark', hex: '#1e293b' },
                        ].map((c) => (
                          <button
                            key={c.name}
                            onClick={() => {
                              onUpdateSettings({ pageColor: c.hex });
                              setShowColorDropdown(false);
                            }}
                            title={c.name}
                            className={`w-9 h-9 rounded border cursor-pointer hover:scale-105 transition-transform relative flex items-center justify-center ${
                              settings.pageColor === c.hex ? 'ring-2 ring-[#7c3aed]' : 'border-neutral-300'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {settings.pageColor === c.hex && (
                              <Check size={14} className={c.hex === '#1e293b' ? 'text-white' : 'text-neutral-800'} />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-500">Custom Color:</span>
                        <input
                          type="color"
                          value={settings.pageColor}
                          onChange={(e) => onUpdateSettings({ pageColor: e.target.value })}
                          className="w-7 h-7 rounded border border-neutral-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Shadow & Borders Dropdown (Simple Shadow, Deep Shadow, Box Border 1px, Thick Border 2px, Dots Border, Double Border, None) */}
                <div className="relative" ref={shadowDropdownRef}>
                  <button
                    onClick={() => setShowShadowDropdown(!showShadowDropdown)}
                    title="Page Shadow & Borders"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showShadowDropdown
                        ? isDarkUi
                          ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa]'
                          : 'bg-[#f0f7ff] border-[#cde4f7] text-[#185abd]'
                        : settings.pageBorderStyle && settings.pageBorderStyle !== 'none' && settings.showShadow !== false
                        ? isDarkUi
                          ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa]'
                          : 'bg-[#f0f7ff] border-[#cde4f7] text-[#185abd]'
                        : isDarkUi
                        ? 'border-transparent hover:bg-white/10 text-neutral-400'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-600'
                    }`}
                  >
                    <Square size={22} className="mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Shadow <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Shadow & Borders Dropdown Menu */}
                  {showShadowDropdown && (
                    <div
                      className={`absolute top-full left-0 mt-1 border rounded-md shadow-2xl p-2 z-50 w-56 text-left ${
                        isDarkUi
                          ? 'bg-[#222] border-neutral-700 text-neutral-200'
                          : 'bg-white border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-200 dark:border-neutral-700">
                        Page Shadow &amp; Borders
                      </div>
                      {[
                        { id: 'simple-shadow', label: 'Simple Shadow', desc: 'Soft ambient drop shadow' },
                        { id: 'deep-shadow', label: 'Deep Shadow', desc: 'Prominent executive shadow' },
                        { id: 'box-border', label: 'Box Border (1px)', desc: 'Clean 1px solid frame' },
                        { id: 'thick-border', label: 'Thick Border (2px)', desc: 'Solid 2px bold outline' },
                        { id: 'dots-border', label: 'Dots Border', desc: 'Dotted boundary frame' },
                        { id: 'double-border', label: 'Double Border', desc: 'Classic double line border' },
                        { id: 'none', label: 'None', desc: 'Borderless flat sheet' },
                      ].map((opt) => {
                        const currentStyle = settings.pageBorderStyle || (settings.showShadow === false ? 'none' : 'simple-shadow');
                        const isSelected = currentStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              onUpdateSettings({
                                pageBorderStyle: opt.id as PageBorderStyle,
                                showShadow: opt.id !== 'none',
                              });
                              setShowShadowDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                              isSelected
                                ? isDarkUi
                                  ? 'bg-blue-950/60 text-blue-300 font-semibold'
                                  : 'bg-blue-50 text-[#185abd] font-semibold'
                                : isDarkUi
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{opt.label}</span>
                              <span className="text-[10px] text-neutral-400">{opt.desc}</span>
                            </div>
                            {isSelected && <Check size={14} className={isDarkUi ? 'text-blue-400' : 'text-[#185abd]'} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 7. Watermark v (Orange/Amber Stamp Icon with 'Your Mark' option) */}
                <div className="relative" ref={watermarkDropdownRef}>
                  <button
                    onClick={() => setShowWatermarkDropdown(!showWatermarkDropdown)}
                    title="Document Watermark"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showWatermarkDropdown || settings.watermark
                        ? 'bg-[#ffedd5] border-[#c2410c] text-[#c2410c]'
                        : isDarkUi
                        ? 'border-transparent hover:bg-white/10 text-neutral-300'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Stamp size={22} className="text-[#c2410c] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Watermark <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Watermark Dropdown */}
                  {showWatermarkDropdown && (
                    <div
                      className={`absolute top-full left-0 mt-1 border rounded-md shadow-2xl p-2 z-50 w-56 text-left ${
                        isDarkUi
                          ? 'bg-[#222] border-neutral-700 text-neutral-200'
                          : 'bg-white border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-200 dark:border-neutral-700">
                        Page Watermarks
                      </div>
                      {[
                        'CONFIDENTIAL',
                        'DRAFT',
                        'URGENT',
                        'SAMPLE',
                        'TOP SECRET',
                        'Your Mark',
                      ].map((w) => {
                        const isSelected = settings.watermark === w;
                        return (
                          <button
                            key={w}
                            onClick={() => {
                              onUpdateSettings({
                                watermark: w,
                                ...(w === 'Your Mark'
                                  ? { customWatermark: settings.customWatermark || 'YOUR MARK' }
                                  : {}),
                              });
                              setShowWatermarkDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                              isSelected
                                ? 'bg-amber-50 text-[#c2410c] font-semibold'
                                : isDarkUi
                                ? 'text-neutral-300 hover:bg-neutral-800'
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {w === 'Your Mark' ? (
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-semibold">Your Mark</span>
                                  <span className="text-[9px] px-1 py-0.2 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded font-bold">
                                    Custom
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-400 italic truncate max-w-[150px]">
                                  "{settings.customWatermark || 'Set in Info & Setup'}"
                                </span>
                              </div>
                            ) : (
                              <span>{w}</span>
                            )}
                            {isSelected && <Check size={14} className="text-[#c2410c] shrink-0" />}
                          </button>
                        );
                      })}
                      {settings.watermark && (
                        <div className="pt-1 mt-1 border-t border-neutral-200 dark:border-neutral-700">
                          <button
                            onClick={() => {
                              onUpdateSettings({ watermark: '' });
                              setShowWatermarkDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer font-medium"
                          >
                            Remove Watermark
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* EXISTING BUTTONS IN LAYOUT TAB (Retained completely) */}
              {/* Margins Group */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  {(['normal', 'narrow', 'moderate', 'wide'] as PageMargin[]).map((margin) => (
                    <button
                      key={margin}
                      onClick={() => onUpdateSettings({ margins: margin, customMargins: undefined })}
                      title={margin === 'moderate' ? 'Moderate' : margin.charAt(0).toUpperCase() + margin.slice(1)}
                      className={`px-2.5 py-1.5 rounded capitalize text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.margins === margin
                          ? isDarkUi
                            ? 'bg-[#1e3a5f] text-[#60a5fa] font-semibold border-[#0078d4] shadow-xs'
                            : 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : isDarkUi
                          ? 'border-transparent hover:bg-white/10 text-neutral-300'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{margin === 'moderate' ? 'Mod' : margin}</span>
                      <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {margin === 'normal'
                          ? '1 inch'
                          : margin === 'narrow'
                          ? '0.5 inch'
                          : margin === 'moderate'
                          ? '0.75 inch'
                          : '1.5 inch'}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Margins</span>
              </div>

              {/* Orientation Group */}
              <div className="flex flex-col justify-between px-1.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5">
                  {(['portrait', 'landscape'] as PageOrientation[]).map((orient) => (
                    <button
                      key={orient}
                      onClick={() => onUpdateSettings({ orientation: orient })}
                      title={orient === 'landscape' ? 'Landscape' : 'Portrait'}
                      className={`px-2.5 py-1.5 rounded capitalize text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.orientation === orient
                          ? isDarkUi
                            ? 'bg-[#1e3a5f] text-[#60a5fa] font-semibold border-[#0078d4] shadow-xs'
                            : 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : isDarkUi
                          ? 'border-transparent hover:bg-white/10 text-neutral-300'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{orient === 'landscape' ? 'Land' : orient}</span>
                      <span className={`text-[9px] ${isDarkUi ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {orient === 'portrait' ? 'Vertical' : 'Horizontal'}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Orientation</span>
              </div>

              {/* Page Paper Size */}
              <div className="flex flex-col justify-between pl-1.5 pr-2">
                <div className="flex items-start space-x-1.5">
                  {[
                    { id: 'a4' as PageSize, name: 'A4', desc: '8,7 × 11,6"' },
                    { id: 'letter' as PageSize, name: 'Letter', desc: '8.5 × 11"' },
                    { id: 'legal' as PageSize, name: 'Legal', desc: '8.5 × 14"' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onUpdateSettings({ pageSize: s.id })}
                      className={`px-2.5 py-1.5 rounded text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.pageSize === s.id
                          ? isDarkUi
                            ? 'bg-[#1e3a5f] text-[#60a5fa] font-semibold border-[#0078d4] shadow-xs'
                            : 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : isDarkUi
                          ? 'border-transparent hover:bg-white/10 text-neutral-300'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[9px] text-neutral-400">
                        {s.desc}
                      </span>
                    </button>
                  ))}
                  {!['a4', 'letter', 'legal'].includes(settings.pageSize) && (
                    <button
                      className={`px-2.5 py-1.5 rounded text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        isDarkUi
                          ? 'bg-[#1e3a5f] text-[#60a5fa] font-semibold border-[#0078d4] shadow-xs'
                          : 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                      }`}
                    >
                      <span className="font-semibold">
                        {DOCUMENT_PAGE_SIZES.find((p) => p.id === settings.pageSize)?.name || settings.pageSize}
                      </span>
                      <span className="text-[9px] text-neutral-400">
                        {DOCUMENT_PAGE_SIZES.find((p) => p.id === settings.pageSize)?.inches || ''}
                      </span>
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                      className={`px-2 py-1.5 rounded text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        showSizeDropdown
                          ? isDarkUi
                            ? 'bg-[#1e3a5f] text-[#60a5fa] border-[#0078d4]'
                            : 'bg-[#cde4f7] text-[#185abd] border-[#185abd]'
                          : isDarkUi
                          ? 'border-transparent hover:bg-white/10 text-neutral-300'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                      title="All 12 Paper Sizes"
                    >
                      <span className="font-semibold flex items-center">
                        More <ChevronDown size={10} className="ml-0.5" />
                      </span>
                      <span className="text-[9px] text-neutral-400">12 sizes</span>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Size</span>
              </div>
            </>
          )}

          {/* REVIEW TAB (MATCHING USER PHOTO) */}
          {activeTab === 'review' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* SECTION 1: Spelling & Grammar, Word Count, AI Rewrite, Spell API, Translate, Language Dropdown, Dictate */}
              <div className="flex items-start space-x-1 pr-1.5 border-r border-[#dad9d8]">
                {/* 1. Spelling & Grammar (Green CheckCheck) - Smart open Gemini Right Toolbar */}
                <button
                  onClick={() => {
                    const isAlreadyOpenForGrammar =
                      settings.showAiAssistantPane && settings.aiAssistantIntent === 'grammar';
                    if (isAlreadyOpenForGrammar) {
                      onUpdateSettings({
                        showAiAssistantPane: false,
                        aiAssistantIntent: null,
                      });
                    } else {
                      onUpdateSettings({
                        showAiAssistantPane: true,
                        aiAssistantIntent: 'grammar',
                        aiAssistantTriggerTimestamp: Date.now(),
                        showSpellCheckPane: false,
                        showTranslatePane: false,
                        showQuickBlocksPane: false,
                        showFormatterPane: false,
                        showVoiceCommandPane: false,
                      });
                    }
                  }}
                  title="Check Spelling & Grammar with Gemini AI in selected text or document"
                  className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border min-w-[62px] ${
                    settings.showAiAssistantPane && settings.aiAssistantIntent === 'grammar'
                      ? isDarkUi
                        ? 'bg-[#064e3b] border-[#059669] text-[#34d399] shadow-xs'
                        : 'bg-[#e6f4ea] border-[#059669] text-[#059669] shadow-xs'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-300'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <CheckCheck
                    size={22}
                    className={`mb-0.5 ${
                      settings.showAiAssistantPane && settings.aiAssistantIntent === 'grammar'
                        ? isDarkUi
                          ? 'text-[#34d399]'
                          : 'text-[#059669]'
                        : 'text-[#059669]'
                    }`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center">
                    Spelling &amp;<br />Grammar
                  </span>
                </button>

                {/* 2. Word Count (Blue BarChart3) */}
                <button
                  onClick={onOpenStats}
                  title="Word Count & Statistics"
                  className="flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[52px]"
                >
                  <BarChart3 size={22} className="text-[#2563eb] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Word<br />Count
                  </span>
                </button>

                {/* 3. AI Rewrite (Purple Sparkles) */}
                <button
                  onClick={() => {
                    setAiRewriteOutput('');
                    setShowAiRewriteModal(true);
                  }}
                  title="AI Document & Selection Rewrite"
                  className="flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[54px]"
                >
                  <Sparkles size={22} className="text-[#9333ea] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    AI<br />Rewrite
                  </span>
                </button>

                {/* 4. Spell API (Crimson SpellCheck) - Toggles Right Toolbar */}
                <button
                  onClick={() => onUpdateSettings({ showSpellCheckPane: !settings.showSpellCheckPane })}
                  title="Toggle Spell Check API Panel"
                  className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border min-w-[50px] ${
                    settings.showSpellCheckPane
                      ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] shadow-xs'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <SpellCheck
                    size={22}
                    className={`mb-0.5 ${
                      settings.showSpellCheckPane ? 'text-[#185abd]' : 'text-[#e11d48]'
                    }`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Spell<br />API
                  </span>
                </button>

                {/* 5. Translate (Indigo Languages - Toggles Smart Right Toolbar) */}
                <button
                  onClick={() =>
                    onUpdateSettings({ showTranslatePane: !settings.showTranslatePane })
                  }
                  title="Translate Selection / Document (Open/Close Translate Toolbar)"
                  className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border min-w-[54px] ${
                    settings.showTranslatePane
                      ? 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Languages
                    size={22}
                    className={`${
                      settings.showTranslatePane ? 'text-[#185abd]' : 'text-[#6366f1]'
                    } mb-0.5`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center">
                    Translate
                  </span>
                </button>

                {/* 6. Language Dropdown (Rounded input style: Greek (Ελληνικά) ∨) */}
                <div className="relative mx-1.5" ref={languageDropdownRef}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    title="Change Proofing Language"
                    className={`flex items-center justify-between px-3 py-1.5 border rounded-md text-xs font-medium transition-colors cursor-pointer min-w-[155px] shadow-2xs ${
                      isDarkUi
                        ? 'bg-[#282828] border-[#404040] text-neutral-200 hover:border-neutral-500'
                        : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <span className="truncate">{selectedLanguage}</span>
                    <ChevronDown size={13} className={`ml-2 shrink-0 ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`} />
                  </button>

                  {/* Language Dropdown Menu */}
                  {showLanguageDropdown && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-md shadow-2xl p-1.5 z-50 w-56 text-left max-h-60 overflow-y-auto ${
                      isDarkUi
                        ? 'bg-[#282828] border-[#404040] text-neutral-200'
                        : 'bg-white border-neutral-300 text-neutral-800'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 border-b mb-1 ${
                        isDarkUi ? 'text-neutral-400 border-[#383838]' : 'text-neutral-500 border-neutral-100'
                      }`}>
                        Proofing Languages
                      </div>
                      {REVIEW_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.label);
                            setShowLanguageDropdown(false);
                            setReviewNotification(`Proofing language set to ${lang.label}`);
                            setTimeout(() => setReviewNotification(null), 3000);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                            selectedLanguage === lang.label
                              ? isDarkUi
                                ? 'bg-[#1e3a5f] text-[#60a5fa] font-semibold'
                                : 'bg-blue-50 text-[#185abd] font-semibold'
                              : isDarkUi
                              ? 'text-neutral-300 hover:bg-[#333333]'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <span>{lang.label}</span>
                          {selectedLanguage === lang.label && <Check size={13} className={isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]'} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Dictate (Boxed Button with mic, text Dictate, status Idle/Listening..., bottom label Dictate) */}
                <div className="flex flex-col items-center justify-start pl-1">
                  <div className="flex items-center">
                    <button
                      onClick={handleToggleVoiceDictation}
                      title={isListening ? 'Click to Stop Dictation' : 'Click to Start Voice Dictation'}
                      className={`px-3 py-1 border rounded-md flex flex-col items-center justify-start cursor-pointer transition-all shadow-2xs ${
                        isListening
                          ? isDarkUi
                            ? 'border-red-500 bg-red-950/60 text-red-400 animate-pulse ring-1 ring-red-400'
                            : 'border-red-500 bg-red-50 text-red-600 animate-pulse ring-1 ring-red-400'
                          : isDarkUi
                          ? 'border-[#404040] bg-[#282828] hover:bg-[#333333] hover:border-neutral-500 text-neutral-200'
                          : 'border-neutral-300 bg-white hover:bg-neutral-50 hover:border-neutral-400 text-neutral-800'
                      }`}
                    >
                      <Mic size={18} className={isListening ? 'text-red-500' : isDarkUi ? 'text-neutral-200' : 'text-neutral-800'} />
                      <span className={`text-[11px] font-medium leading-tight ${isDarkUi ? 'text-neutral-200' : 'text-neutral-800'}`}>
                        Dictate
                      </span>
                    </button>
                    <span className={`text-xs ml-2 font-normal ${isListening ? 'text-red-500 font-semibold animate-pulse' : 'text-neutral-400'}`}>
                      {isListening ? 'Listening...' : 'Idle'}
                    </span>
                  </div>
                  <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide mt-0.5">
                    Dictate
                  </span>
                </div>
              </div>

              {/* SECTION 2: Comments (New Comment, Comments with orange badge 1) */}
              <div className="flex items-start space-x-2 px-1.5 border-r border-[#dad9d8]">
                {/* 8. New Comment (Orange MessageSquarePlus) */}
                <button
                  onClick={() => {
                    const sel = editor?.state.doc.textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to,
                      ' '
                    ) || '';
                    setCommentTargetSelection(sel);
                    setNewCommentText('');
                    setShowNewCommentModal(true);
                  }}
                  title="Insert a New Comment"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[58px]"
                >
                  <MessageSquarePlus size={22} className="text-[#ea580c] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    New<br />Comment
                  </span>
                </button>

                {/* 9. Comments (Blue MessageSquare with orange badge count) */}
                <button
                  onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                  title="Show / Hide Comments Panel"
                  className={`flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border min-w-[58px] ${
                    showCommentsPanel
                      ? 'bg-[#dbeafe] border-[#185abd] text-[#185abd]'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <div className="relative">
                    <MessageSquare size={22} className="text-[#2563eb] mb-0.5" />
                    {comments.length > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-[#ea580c] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {comments.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Comments
                  </span>
                </button>
              </div>

              {/* SECTION 3: History & Snapshots (Save Snapshot, Version History) */}
              <div className="flex items-start space-x-2 px-1.5">
                {/* 10. Save Snapshot (Green Camera) */}
                <button
                  onClick={handleCaptureScreenSnapshot}
                  disabled={isCapturingSnapshot}
                  title="Capture Document Screen Snapshot & Send to Image Wizard (Ready to resize & paste)"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[58px] disabled:opacity-50"
                >
                  <div className="relative">
                    <Camera size={22} className={`text-[#059669] mb-0.5 ${isCapturingSnapshot ? 'animate-pulse' : ''}`} />
                    {isCapturingSnapshot && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    {isCapturingSnapshot ? (
                      <span className="text-emerald-700 font-bold">Capturing...</span>
                    ) : (
                      <>Save<br />Snapshot</>
                    )}
                  </span>
                </button>

                {/* 11. Version History (Blue History Clock) */}
                <button
                  onClick={() => setShowVersionHistoryModal(true)}
                  title="Open Document Version History"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[58px]"
                >
                  <History size={22} className="text-[#2563eb] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Version<br />History
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW TAB (MATCHING USER PHOTO) */}
          {activeTab === 'view' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* SECTION 1: Print Layout & Focus Mode */}
              <div className="flex items-start space-x-1 pr-1.5">
                {/* 1. Print Layout (Light blue active card with blue eye) */}
                <button
                  onClick={() => onUpdateSettings({ viewMode: 'print' })}
                  title="Print Layout (Default Document View)"
                  className={`flex flex-col items-center justify-start px-3.5 py-1 rounded-lg border cursor-pointer min-w-[62px] transition-all ${
                    settings.viewMode === 'print'
                      ? isDarkUi
                        ? 'border-[#0078d4] bg-[#1e3a5f] text-[#60a5fa] shadow-xs'
                        : 'border-[#c5dcfa] bg-[#deebf9] text-[#185abd]'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-300'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Eye size={20} className={settings.viewMode === 'print' ? (isDarkUi ? 'text-[#60a5fa] mb-0.5' : 'text-[#185abd] mb-0.5') : (isDarkUi ? 'text-neutral-300 mb-0.5' : 'text-neutral-700 mb-0.5')} />
                  <span className={`text-[11px] font-medium leading-tight text-center ${settings.viewMode === 'print' ? (isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]') : (isDarkUi ? 'text-neutral-300' : 'text-neutral-700')}`}>
                    Print<br />Layout
                  </span>
                </button>

                {/* 2. Focus Mode (Purple expand arrows) */}
                <button
                  onClick={() => onUpdateSettings({ isFocusMode: !settings.isFocusMode })}
                  title="Focus Mode (Distraction-Free Writing)"
                  className={`flex flex-col items-center justify-start px-3 py-1 rounded-lg border transition-all cursor-pointer min-w-[58px] ${
                    settings.isFocusMode
                      ? isDarkUi
                        ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-xs'
                        : 'bg-purple-100 border-purple-300 text-purple-700'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-300'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Maximize2 size={20} className="text-[#9333ea] mb-0.5" />
                  <span className={`text-[11px] font-medium leading-tight text-center ${isDarkUi ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    Focus<br />Mode
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mr-1.5 shrink-0" />

              {/* SECTION 2: Ruler, Gridlines, ¶ Marks Checkbox Group */}
              <div className="flex flex-col justify-start space-y-1.5 pt-0.5 text-xs select-none min-w-[105px]">
                {/* Ruler Checkbox */}
                <label
                  onClick={() => onUpdateSettings({ showRuler: !settings.showRuler })}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-[2px] flex items-center justify-center transition-colors border ${
                      settings.showRuler
                        ? 'bg-[#185abd] border-[#185abd] text-white'
                        : 'bg-white border-neutral-400'
                    }`}
                  >
                    {settings.showRuler && <Check size={11} strokeWidth={3.5} className="text-white" />}
                  </div>
                  <Ruler size={14} className="text-neutral-600 shrink-0" />
                  <span className="text-xs text-neutral-800 font-normal leading-none">Ruler</span>
                </label>

                {/* Gridlines Checkbox */}
                <label
                  onClick={() => onUpdateSettings({ showGridlines: !settings.showGridlines })}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-[2px] flex items-center justify-center transition-colors border ${
                      settings.showGridlines
                        ? 'bg-[#185abd] border-[#185abd] text-white'
                        : 'bg-white border-neutral-400'
                    }`}
                  >
                    {settings.showGridlines && <Check size={11} strokeWidth={3.5} className="text-white" />}
                  </div>
                  <Grid size={14} className="text-neutral-600 shrink-0" />
                  <span className="text-xs text-neutral-800 font-normal leading-none">Gridlines</span>
                </label>

                {/* ¶ Marks Checkbox */}
                <label
                  onClick={() =>
                    onUpdateSettings({
                      showParagraphMarks: settings.showParagraphMarks === false ? true : false,
                    })
                  }
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-[2px] flex items-center justify-center transition-colors border ${
                      settings.showParagraphMarks !== false
                        ? 'bg-[#185abd] border-[#185abd] text-white'
                        : 'bg-white border-neutral-400'
                    }`}
                  >
                    {settings.showParagraphMarks !== false && (
                      <Check size={11} strokeWidth={3.5} className="text-white" />
                    )}
                  </div>
                  <Pilcrow size={14} className="text-neutral-600 shrink-0" />
                  <span className="text-xs text-neutral-800 font-normal leading-none">¶ Marks</span>
                </label>
              </div>

              {/* SECTION 2B: Ruler Unit Selector (Inches / cm) */}
              <div className="flex items-start px-1">
                <button
                  onClick={() => {
                    const nextUnit = settings.rulerUnit === 'cm' ? 'inches' : 'cm';
                    onUpdateSettings({ rulerUnit: nextUnit });
                    try {
                      localStorage.setItem('wordpad_ruler_unit', nextUnit);
                    } catch {}
                  }}
                  title={`Ruler Measurement Unit: Currently ${
                    settings.rulerUnit === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'
                  }. Click to toggle.`}
                  className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer min-w-[54px]"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Ruler size={15} className="text-[#185abd]" />
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#185abd]/10 text-[#185abd]">
                      {settings.rulerUnit === 'cm' ? 'cm' : 'in'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700 dark:text-neutral-200">
                    Unit<br />
                    <span className="text-[9px] text-neutral-500 font-normal">
                      {settings.rulerUnit === 'cm' ? 'Metric' : 'Inches'}
                    </span>
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mx-1.5 shrink-0" />

              {/* SECTION 3: Navigation Pane */}
              <div className="flex items-start px-1">
                <button
                  onClick={() => onUpdateSettings({ showNavigationPane: !settings.showNavigationPane })}
                  title="Navigation Pane (Headings, Pages, Search)"
                  className={`flex flex-col items-center justify-start px-3 py-1 rounded-lg border transition-all cursor-pointer min-w-[70px] ${
                    settings.showNavigationPane
                      ? 'bg-purple-50 border-purple-300 text-purple-700 ring-1 ring-purple-300'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <TextQuote size={22} className="text-[#9333ea] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Navigation<br />Pane
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mx-1.5 shrink-0" />

              {/* SECTION 4: Zoom Controls (100%, Zoom In, Zoom Out) */}
              <div className="flex items-start space-x-1 px-1">
                {/* 100% Zoom Reset */}
                <button
                  onClick={() => onUpdateSettings({ zoom: 100 })}
                  title="Zoom 100%"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[50px] transition-all"
                >
                  <RotateCcw size={20} className="text-[#2563eb] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    100%
                  </span>
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => onUpdateSettings({ zoom: Math.min(200, settings.zoom + 10) })}
                  title="Zoom In (+10%)"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[58px] transition-all"
                >
                  <ZoomIn size={20} className="text-neutral-700 mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Zoom In
                  </span>
                </button>

                {/* Zoom Out */}
                <button
                  onClick={() => onUpdateSettings({ zoom: Math.max(50, settings.zoom - 10) })}
                  title="Zoom Out (-10%)"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[58px] transition-all"
                >
                  <ZoomOut size={20} className="text-neutral-700 mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Zoom Out
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mx-1.5 shrink-0" />

              {/* SECTION 5: Dark / Light Switch (Matches User Photo 1) */}
              <div className="flex flex-col items-center px-1">
                <div className="flex items-center space-x-1.5">
                  {/* 1. Light */}
                  <button
                    onClick={() => {
                      onUpdateSettings({
                        themeMode: 'light',
                        isDarkMode: false,
                        pageColor: '#ffffff',
                      });
                    }}
                    title="Light Mode — Standard clean office theme (White document, light canvas)"
                    className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer min-w-[50px] ${
                      effectiveThemeMode === 'light'
                        ? 'bg-[#0078d4] text-white border-[#0078d4] font-semibold shadow-xs'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Sun
                      size={20}
                      className={
                        effectiveThemeMode === 'light'
                          ? 'text-white mb-0.5'
                          : 'text-amber-500 mb-0.5'
                      }
                    />
                    <span
                      className={`text-[11px] leading-tight text-center font-medium ${
                        effectiveThemeMode === 'light' ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      Light
                    </span>
                  </button>

                  {/* 2. Canvas Dark (Dark Canvas, White Document - Photo 3) */}
                  <button
                    onClick={() => {
                      onUpdateSettings({
                        themeMode: 'canvasDark',
                        isDarkMode: true,
                        pageColor: '#ffffff',
                      });
                    }}
                    title="Canvas Dark — Soothing dark canvas with crisp white document (Photo 3)"
                    className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer min-w-[56px] ${
                      effectiveThemeMode === 'canvasDark'
                        ? 'bg-[#0078d4] text-white border-[#0078d4] font-semibold shadow-xs'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-[19px] h-[19px] rounded-[3px] border flex items-center justify-center mb-0.5 ${
                        effectiveThemeMode === 'canvasDark'
                          ? 'bg-neutral-900 border-white/80'
                          : 'bg-neutral-800 border-neutral-700'
                      }`}
                    >
                      <div className="w-[9px] h-[12px] bg-white rounded-[1px] shadow-2xs" />
                    </div>
                    <span
                      className={`text-[11px] leading-tight text-center font-medium ${
                        effectiveThemeMode === 'canvasDark' ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      Canvas Dark
                    </span>
                  </button>

                  {/* 3. Full Dark (Dark Canvas & Dark Document - Photo 2) */}
                  <button
                    onClick={() => {
                      onUpdateSettings({
                        themeMode: 'fullDark',
                        isDarkMode: true,
                        pageColor: '#282828',
                      });
                    }}
                    title="Full Dark — Complete dark mode for canvas, ribbon, and document page (Photo 2)"
                    className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer min-w-[54px] ${
                      effectiveThemeMode === 'fullDark'
                        ? 'bg-[#0078d4] text-white border-[#0078d4] font-bold shadow-xs'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Moon
                      size={20}
                      className={
                        effectiveThemeMode === 'fullDark'
                          ? 'text-white mb-0.5'
                          : 'text-neutral-700 mb-0.5'
                      }
                    />
                    <span
                      className={`text-[11px] leading-tight text-center font-medium ${
                        effectiveThemeMode === 'fullDark' ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      Full Dark
                    </span>
                  </button>

                  {/* 4. Sepia (Warm Eye Comfort Mode - Photo 4) */}
                  <button
                    onClick={() => {
                      onUpdateSettings({
                        themeMode: 'sepia',
                        isDarkMode: false,
                        pageColor: '#fbf8ee',
                      });
                    }}
                    title="Sepia — Warm soothing Eye Comfort reading & writing mode (Photo 4)"
                    className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer min-w-[50px] ${
                      effectiveThemeMode === 'sepia'
                        ? 'bg-[#0078d4] text-white border-[#0078d4] font-semibold shadow-xs'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-full border mb-0.5 ${
                        effectiveThemeMode === 'sepia'
                          ? 'bg-[#fbf8ee] border-white shadow-xs'
                          : 'bg-[#d4a373] border-[#a07a4a]'
                      }`}
                    />
                    <span
                      className={`text-[11px] leading-tight text-center font-medium ${
                        effectiveThemeMode === 'sepia' ? 'text-white' : 'text-neutral-700'
                      }`}
                    >
                      Sepia
                    </span>
                  </button>
                </div>

                {/* Section title exactly like Photo 1: "Dark / Light Switch" in gold/yellow bold font */}
                <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 tracking-tight mt-1 select-none">
                  Dark / Light Switch
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mx-1.5 shrink-0" />

              {/* SECTION 6: AutoCorrect ON / OFF */}
              <div className="flex flex-col items-center justify-start px-1">
                <button
                  type="button"
                  onClick={onToggleAutoCorrect}
                  title="Auto Correct"
                  className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-lg border transition-all cursor-pointer min-w-[76px] ${
                    autoCorrectEnabled
                      ? isDarkUi
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold shadow-xs'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold shadow-xs'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-400'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Sparkles
                    size={20}
                    className={
                      autoCorrectEnabled
                        ? 'text-emerald-600 dark:text-emerald-400 mb-0.5'
                        : 'text-neutral-400 mb-0.5'
                    }
                  />
                  <span className="text-[11px] leading-tight text-center font-medium">
                    Corect: <span className="font-bold">{autoCorrectEnabled ? 'ON' : 'OFF'}</span>
                  </span>
                </button>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tracking-tight mt-1 select-none">
                  Smart Guard
                </span>
              </div>
            </div>
          )}

          {/* FORMAT TAB (MATCHING USER PHOTO) */}
          {activeTab === 'format' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* GROUP 1: Ultimate Formatter */}
              <div className="flex items-start pr-1.5">
                <button
                  onClick={() => {
                    onUpdateSettings({ showFormatterPane: !settings.showFormatterPane });
                  }}
                  title="Ultimate Formatter — Open/Close Ultimate Formatter Right Sidebar"
                  className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[66px] transition-all ${
                    settings.showFormatterPane
                      ? isDarkUi
                        ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa] shadow-xs'
                        : isSepiaUi
                        ? 'bg-[#ece3d0] border-[#7c4a1e] text-[#7c4a1e] shadow-xs'
                        : 'bg-blue-100 border-[#185abd] text-[#185abd] shadow-xs'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-300'
                      : isSepiaUi
                      ? 'border-transparent hover:bg-[#ece3d0] text-[#4a3525]'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Wand2
                    size={22}
                    className={`mb-1 ${
                      settings.showFormatterPane
                        ? isDarkUi
                          ? 'text-[#60a5fa]'
                          : isSepiaUi
                          ? 'text-[#7c4a1e]'
                          : 'text-[#185abd]'
                        : isDarkUi
                        ? 'text-neutral-300'
                        : isSepiaUi
                        ? 'text-[#7c4a1e]'
                        : 'text-[#185abd]'
                    }`}
                  />
                  <span className={`text-[10px] font-semibold leading-tight text-center ${
                    isDarkUi ? 'text-neutral-200' : isSepiaUi ? 'text-[#4a3525]' : 'text-neutral-800'
                  }`}>
                    Ultimate<br />Formatter
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 2: Format Painter & Paste Format */}
              <div className="flex items-start space-x-1 pr-1.5">
                {/* Format Painter */}
                <button
                  onClick={(e) => {
                    const isDoubleClick = e.detail === 2;
                    handleFormatPainterAction(isDoubleClick ? 'persistent' : 'single');
                  }}
                  title={
                    activeFormatPainter
                      ? `Format Painter Active (${activeFormatPainter.mode}) — Click or select text to apply, or click here / Esc to cancel`
                      : 'Format Painter — Click to copy format for 1 use; Double-click for persistent multi-use. Copies character & paragraph styles safely in memory without clipboard!'
                  }
                  className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[58px] transition-all ${
                    activeFormatPainter
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-400'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Paintbrush
                    size={22}
                    className={`text-[#ea580c] mb-1 ${activeFormatPainter ? 'animate-bounce' : ''}`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Format<br />Painter
                  </span>
                </button>

                {/* Paste Format */}
                <button
                  onClick={handlePasteFormatAction}
                  title={
                    activeFormatPainter
                      ? `Paste Format — Apply ${describeFormat(activeFormatPainter)} to selection`
                      : 'Paste Format (Apply formatting to current selection)'
                  }
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[58px] transition-all"
                >
                  <ClipboardPaste size={22} className="text-[#c2410c] mb-1" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Paste<br />Format
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 3: Clear Formatting & No Spacing */}
              <div className="flex items-start space-x-1 pr-1.5">
                <button
                  onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                  title="Clear All Formatting"
                  className="flex flex-col items-center justify-start px-3 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[66px] transition-all"
                >
                  <Eraser size={22} className="text-[#e11d48] mb-1" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Clear<br />Formatting
                  </span>
                </button>

                {/* Spacing */}
                <button
                  onClick={() => {
                    if (editor) {
                      cleanAllSpacing(editor);
                    }
                  }}
                  title="no spacing"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-amber-50 hover:border-amber-300 text-neutral-700 cursor-pointer min-w-[62px] transition-all group"
                >
                  <Sparkles size={22} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800 group-hover:text-amber-800">
                    Spacing
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 4: Case (AA UPPER, aa lower, Aa Sentence, Tt Title, aA Toggle) with "Case" footer */}
              <div className="flex flex-col items-center pr-1.5">
                <div className="flex items-start space-x-2">
                  {/* AA UPPER */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      const { from, to } = editor.state.selection;
                      const text = editor.state.doc.textBetween(from, to);
                      if (text) {
                        editor.chain().focus().insertContent(text.toUpperCase()).run();
                      }
                    }}
                    title="UPPERCASE"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 cursor-pointer min-w-[42px] transition-all"
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      AA
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      UPPER
                    </span>
                  </button>

                  {/* aa lower */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      const { from, to } = editor.state.selection;
                      const text = editor.state.doc.textBetween(from, to);
                      if (text) {
                        editor.chain().focus().insertContent(text.toLowerCase()).run();
                      }
                    }}
                    title="lowercase"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 cursor-pointer min-w-[42px] transition-all"
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      aa
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      lower
                    </span>
                  </button>

                  {/* Aa Sentence */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      const { from, to } = editor.state.selection;
                      const text = editor.state.doc.textBetween(from, to);
                      if (text) {
                        const sentenceCased = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
                        editor.chain().focus().insertContent(sentenceCased).run();
                      }
                    }}
                    title="Sentence case"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 cursor-pointer min-w-[48px] transition-all"
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      Aa
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      Sentence
                    </span>
                  </button>

                  {/* Tt Title */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      const { from, to } = editor.state.selection;
                      const text = editor.state.doc.textBetween(from, to);
                      if (text) {
                        const titleCased = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
                        editor.chain().focus().insertContent(titleCased).run();
                      }
                    }}
                    title="Title Case"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 cursor-pointer min-w-[42px] transition-all"
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      Tt
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      Title
                    </span>
                  </button>

                  {/* aA Toggle */}
                  <button
                    onClick={() => {
                      if (!editor) return;
                      const { from, to } = editor.state.selection;
                      const text = editor.state.doc.textBetween(from, to);
                      if (text) {
                        const toggled = text
                          .split('')
                          .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
                          .join('');
                        editor.chain().focus().insertContent(toggled).run();
                      }
                    }}
                    title="tOGGLE cASE"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 cursor-pointer min-w-[42px] transition-all"
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      aA
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      Toggle
                    </span>
                  </button>
                </div>

                {/* Centered Footer Label */}
                <span className="text-[10px] text-center text-neutral-500 font-normal mt-1.5 tracking-wide">
                  Case
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 5: Script (x² Super, x₂ Sub) with "Script" footer */}
              <div className="flex flex-col items-center pr-1.5">
                <div className="flex items-start space-x-2">
                  {/* x² Super */}
                  <button
                    onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                    title="Superscript"
                    className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[42px] transition-all ${
                      editor?.isActive('superscript')
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      x²
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      Super
                    </span>
                  </button>

                  {/* x₂ Sub */}
                  <button
                    onClick={() => editor?.chain().focus().toggleSubscript().run()}
                    title="Subscript"
                    className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[42px] transition-all ${
                      editor?.isActive('subscript')
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <span className="text-base font-bold text-neutral-800 tracking-tight leading-none h-5 flex items-center justify-center">
                      x₂
                    </span>
                    <span className="text-[10px] text-neutral-700 font-medium leading-none mt-1.5">
                      Sub
                    </span>
                  </button>
                </div>

                {/* Centered Footer Label */}
                <span className="text-[10px] text-center text-neutral-500 font-normal mt-1.5 tracking-wide">
                  Script
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 6: Math (Fx Equation) */}
              <div className="flex flex-col items-center pr-1.5">
                <button
                  onClick={() => {
                    setEquationEditingLatex('');
                    setEquationIsBlock(false);
                    setShowEquationPopup(true);
                  }}
                  title="Fx Wizard — Insert Mathematical Equation at current caret"
                  className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[48px] transition-all ${
                    showEquationPopup
                      ? isDarkUi
                        ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa]'
                        : 'bg-[#cde4f7] border-[#185abd] text-[#185abd] shadow-xs'
                      : isDarkUi
                      ? 'border-transparent hover:bg-white/10 text-neutral-300'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <span className="text-base font-serif italic font-extrabold text-[#0284c7] dark:text-[#38bdf8] tracking-tight leading-none h-5 flex items-center justify-center">
                    Fx
                  </span>
                  <span className="text-[10px] text-neutral-700 dark:text-neutral-300 font-medium leading-none mt-1.5">
                    Equation
                  </span>
                </button>

                {/* Centered Footer Label */}
                <span className="text-[10px] text-center text-neutral-500 font-normal mt-1.5 tracking-wide">
                  Math
                </span>
              </div>
            </div>
          )}

          {/* CONVERT TAB (MATCHING USER PHOTO: Clean, Structure, HTML) */}
          {activeTab === 'convert' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* GROUP 1: Clean (Fix spaces, clear format, web clean, normalize, clean wiki) */}
              <div className="flex flex-col items-center pr-3">
                <div className="flex items-start space-x-1.5">
                  {/* 1. Fix spaces */}
                  <button
                    onClick={handleFixSpaces}
                    title="Fix spaces"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Space size={20} className="text-[#334155]" />
                  </button>

                  {/* 2. clear format */}
                  <button
                    onClick={handleClearFormat}
                    title="Clear format"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <RemoveFormatting size={20} className="text-[#334155]" />
                  </button>

                  {/* 3. web clean */}
                  <button
                    onClick={handleWebClean}
                    title="Web clean"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Globe size={20} className="text-[#334155]" />
                  </button>

                  {/* 4. normalize */}
                  <button
                    onClick={handleNormalize}
                    title="Normalize"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Wand2 size={20} className="text-[#334155]" />
                  </button>

                  {/* 5. clean wiki */}
                  <button
                    onClick={handleCleanWiki}
                    title="Clean wiki"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <BookOpen size={20} className="text-[#334155]" />
                  </button>
                </div>

                {/* Centered Footer Label: Clean */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  Clean
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 2: Structure (Merge, Split) */}
              <div className="flex flex-col items-center pr-1.5">
                <div className="flex items-start space-x-1.5">
                  {/* 6. Merge */}
                  <button
                    onClick={handleMergeParagraphs}
                    title="Merge"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Combine size={20} className="text-[#334155]" />
                  </button>

                  {/* 7. Split */}
                  <button
                    onClick={handleSplitSentences}
                    title="Split"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Scissors size={20} className="text-[#334155]" />
                  </button>
                </div>

                {/* Centered Footer Label: Structure */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  Structure
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-1.5 shrink-0 self-start mt-0.5" />

              {/* GROUP 3: HTML (Rm Links, Rm Images, Responsive, Rm Attrs, Clean Tags) */}
              <div className="flex flex-col items-center pr-1.5">
                <div className="flex items-start space-x-1.5">
                  {/* 8. Rm Links */}
                  <button
                    onClick={handleRemoveLinks}
                    title="Rm Links"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Unlink size={20} className="text-[#334155]" />
                  </button>

                  {/* 9. Rm Images */}
                  <button
                    onClick={handleRemoveImages}
                    title="Rm Images"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <ImageOff size={20} className="text-[#334155]" />
                  </button>

                  {/* 10. Responsive */}
                  <button
                    onClick={handleMakeResponsive}
                    title="Responsive"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Ruler size={20} className="text-[#334155]" />
                  </button>

                  {/* 11. Rm Attrs */}
                  <button
                    onClick={handleRemoveAttributes}
                    title="Rm Attrs"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Eraser size={20} className="text-[#334155]" />
                  </button>

                  {/* 12. Clean Tags / Rm Tags */}
                  <button
                    onClick={handleRemoveTags}
                    title="Clean Tags / Rm Tags"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Tag size={20} className="text-[#334155]" />
                  </button>

                  {/* 13. Spacing */}
                  <button
                    onClick={() => {
                      if (editor) {
                        cleanAllSpacing(editor);
                      }
                    }}
                    title="no spacing"
                    aria-label="no spacing"
                    className="px-2 py-1.5 rounded-lg border border-transparent hover:bg-amber-50 hover:border-amber-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center space-x-1 min-h-[34px] group"
                  >
                    <Sparkles size={14} className="text-amber-600 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="font-semibold text-[11px] text-neutral-800 group-hover:text-amber-800 leading-none whitespace-nowrap">
                      Spacing
                    </span>
                  </button>

                  {/* 14. Table to DIV converter */}
                  <button
                    onClick={handleTableToDiv}
                    title="Table to DIV converter"
                    aria-label="Table to DIV converter"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <span className="font-mono font-bold text-[11px] text-[#334155] leading-none tracking-tight select-none">
                      &lt;DIV&gt;
                    </span>
                  </button>
                </div>

                {/* Centered Footer Label: HTML */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  HTML
                </span>
              </div>
            </div>
          )}

          {/* SEO TAB (Lazy Loaded with Fast Preload) */}
          {activeTab === 'seo' && (
            <React.Suspense
              fallback={
                <div className="flex items-center space-x-2 py-4 px-4 text-xs text-neutral-500">
                  <div className="w-4 h-4 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading SEO Toolkit...</span>
                </div>
              }
            >
              <SeoTab
                editor={editor}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                isDarkUi={isDarkUi}
                onNotify={(msg) => {
                  setReviewNotification(msg);
                  setTimeout(() => setReviewNotification(null), 3500);
                }}
              />
            </React.Suspense>
          )}

          {/* HELP TAB (Lazy Loaded with Fast Preload) */}
          {activeTab === 'help' && (
            <React.Suspense
              fallback={
                <div className="flex items-center space-x-2 py-4 px-4 text-xs text-neutral-500">
                  <div className="w-4 h-4 border-2 border-[#185abd] border-t-transparent rounded-full animate-spin" />
                  <span>Loading Help &amp; Guides...</span>
                </div>
              }
            >
              <HelpTab
                editor={editor}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                isDarkUi={isDarkUi}
                onNotify={(msg) => {
                  setReviewNotification(msg);
                  setTimeout(() => setReviewNotification(null), 3500);
                }}
              />
            </React.Suspense>
          )}
        </div>
      )}

      {/* Insert Link Modal (Auto-detects clipboard URL or email - Photo 1) */}
      {showLinkModal && (
        <React.Suspense fallback={null}>
          <InsertLinkModal
            editor={editor}
            onClose={() => setShowLinkModal(false)}
          />
        </React.Suspense>
      )}

      {/* Lazy-Loaded Smart Insert Picture Modal (Matches Photo) */}
      {showImageModal && (
        <React.Suspense fallback={null}>
          <InsertPictureModal
            isOpen={showImageModal}
            onClose={() => {
              setShowImageModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3500);
            }}
          />
        </React.Suspense>
      )}

      {/* Lazy-Loaded Special Characters & Symbols Modal (Matches Screenshot) */}
      {showSymbolsPicker && (
        <React.Suspense fallback={null}>
          <SymbolsPickerModal
            isOpen={showSymbolsPicker}
            onClose={() => {
              setShowSymbolsPicker(false);
              editor?.commands.focus();
            }}
            editor={editor}
            themeMode={effectiveThemeMode}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3000);
            }}
          />
        </React.Suspense>
      )}
      {/* Lazyloaded AI Image Modal */}
      {showAiImageModal && (
        <React.Suspense fallback={null}>
          <AiImageModal
            isOpen={showAiImageModal}
            onClose={() => {
              setShowAiImageModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3500);
            }}
          />
        </React.Suspense>
      )}

      {/* Standalone Lazy-Loaded Independent Chart Generator Modal */}
      {showChartModal && (
        <React.Suspense fallback={null}>
          <ChartGeneratorModal
            isOpen={showChartModal}
            onClose={() => {
              setShowChartModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3500);
            }}
          />
        </React.Suspense>
      )}

      {/* Review Floating Toast Notification */}
      {reviewNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-xl border flex items-center space-x-2.5 text-xs animate-in fade-in duration-200 ${
            reviewNotification.startsWith('❌')
              ? 'bg-[#1e1414] text-red-100 border-red-500/80 shadow-red-950/40'
              : 'bg-[#1e293b] text-white border-neutral-700'
          }`}
        >
          {reviewNotification.startsWith('❌') ? (
            <AlertCircle size={16} className="text-red-400 shrink-0" />
          ) : (
            <CheckCheck size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{reviewNotification}</span>
        </div>
      )}

      {/* Comments Slide-Over Panel */}
      {showCommentsPanel && (
        <div className="fixed top-28 right-6 w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 z-40 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
            <div className="flex items-start space-x-2">
              <MessageSquare size={17} className="text-[#2563eb]" />
              <h3 className="text-sm font-bold text-neutral-800">Document Comments ({comments.length})</h3>
            </div>
            <div className="flex items-start space-x-1">
              <button
                onClick={() => {
                  const sel = editor?.state.doc.textBetween(
                    editor.state.selection.from,
                    editor.state.selection.to,
                    ' '
                  ) || '';
                  setCommentTargetSelection(sel);
                  setShowNewCommentModal(true);
                }}
                className="p-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                title="Add New Comment"
              >
                <MessageSquarePlus size={16} />
              </button>
              <button
                onClick={() => setShowCommentsPanel(false)}
                className="p-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                title="Close Comments Panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                <MessageSquare size={32} className="mx-auto mb-2 text-neutral-300 opacity-60" />
                No comments yet. Highlight text and click "New Comment".
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    comment.resolved
                      ? 'bg-neutral-50/70 border-neutral-200 opacity-60'
                      : 'bg-blue-50/40 border-blue-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-start space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#185abd] text-white flex items-center justify-center text-[10px] font-bold">
                        {comment.author.charAt(0)}
                      </div>
                      <span className="font-semibold text-neutral-800">{comment.author}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">{comment.timestamp}</span>
                  </div>

                  {comment.selectedText && (
                    <div className="text-[11px] italic bg-white/90 border-l-2 border-[#185abd] px-2 py-1 my-1.5 text-neutral-600 rounded-r">
                      "{comment.selectedText}"
                    </div>
                  )}

                  <p className="text-neutral-700 text-[12px] leading-relaxed mb-2">{comment.text}</p>

                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-neutral-100">
                    <button
                      onClick={() => {
                        setComments((prev) =>
                          prev.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
                        );
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      {comment.resolved ? 'Reopen' : '✓ Resolve'}
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      onClick={() => {
                        setComments((prev) => prev.filter((c) => c.id !== comment.id));
                      }}
                      className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-neutral-50 border-t border-neutral-200">
            <button
              onClick={() => {
                const sel = editor?.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to,
                  ' '
                ) || '';
                setCommentTargetSelection(sel);
                setShowNewCommentModal(true);
              }}
              className="w-full py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <MessageSquarePlus size={14} />
              <span>Add Comment</span>
            </button>
          </div>
        </div>
      )}

      {/* New Comment Modal */}
      {showNewCommentModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop" data-word-modal="true">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-md">
            <div className="flex items-start space-x-2 text-[#ea580c] mb-2 font-semibold">
              <MessageSquarePlus size={20} />
              <h3 className="text-sm text-neutral-800 font-bold">Add New Comment</h3>
            </div>

            {commentTargetSelection && (
              <div className="mb-3 p-2 bg-amber-50/70 border border-amber-200 rounded text-xs text-neutral-600 italic">
                Target text: "{commentTargetSelection}"
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Author Name</label>
              <input
                type="text"
                value={newCommentAuthor}
                onChange={(e) => setNewCommentAuthor(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Comment</label>
              <textarea
                rows={3}
                placeholder="Type your review observation, feedback, or suggestion..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd] resize-none"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewCommentModal(false);
                  setNewCommentText('');
                }}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newCommentText.trim()) return;
                  const newC: DocumentComment = {
                    id: `comment-${Date.now()}`,
                    author: newCommentAuthor.trim() || 'Reviewer',
                    text: newCommentText.trim(),
                    timestamp: 'Just now',
                    selectedText: commentTargetSelection || undefined,
                    resolved: false,
                  };
                  setComments((prev) => [newC, ...prev]);
                  setShowNewCommentModal(false);
                  setNewCommentText('');
                  setShowCommentsPanel(true);
                  setReviewNotification('Comment created');
                  setTimeout(() => setReviewNotification(null), 3000);
                }}
                disabled={!newCommentText.trim()}
                className="px-4 py-1.5 text-xs bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-50 text-white rounded font-medium cursor-pointer"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightweight Interactive Screen Capture Tool (Lazy-loaded) */}
      {showScreenCaptureTool && screenCaptureBaseImage && (
        <React.Suspense fallback={null}>
          <ScreenCaptureTool
            isOpen={showScreenCaptureTool}
            baseImageUrl={screenCaptureBaseImage}
            onClose={() => setShowScreenCaptureTool(false)}
            onConfirmCapture={handleConfirmAreaCapture}
          />
        </React.Suspense>
      )}

      {/* Save Snapshot Modal */}
      {showSaveSnapshotModal && createPortal(
        <div id="word-snapshot-modal" data-snapshot-modal="true" className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop" data-word-modal="true" style={{ position: 'fixed', zIndex: 99999 }}>
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-md">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 text-[#059669] font-semibold">
                <Camera size={20} />
                <h3 className="text-sm text-neutral-800 font-bold">Document Screen Snapshot</h3>
              </div>
              <button
                onClick={() => setShowSaveSnapshotModal(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="text-xs text-neutral-500 mb-3">
              Screen snapshot captured and sent to the Image Wizard right toolbar. You can resize it, paste it into the document, or record it as a version milestone.
            </p>

            {/* Captured Screen Snapshot Preview & Image Wizard Button */}
            {capturedSnapshotImage && (
              <div className="mb-3 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1">
                    <Check size={13} className="text-emerald-600" />
                    Sent to Image Wizard (Right Toolbar)
                  </span>
                  <button
                    onClick={() => {
                      if (capturedSnapshotImage) {
                        snapshotStore.setLatestSnapshot(capturedSnapshotImage, 'milestone');
                      }
                      onUpdateSettings({ showImageWizardPane: true });
                      setShowSaveSnapshotModal(false);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Open Image Wizard →
                  </button>
                </div>
                <div className="max-h-36 overflow-hidden rounded border border-emerald-200/80 bg-white flex items-center justify-center">
                  <img
                    src={capturedSnapshotImage}
                    alt="Captured Snapshot"
                    className="max-h-36 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Milestone Label (Optional)</label>
              <input
                type="text"
                value={snapshotTitle}
                onChange={(e) => setSnapshotTitle(e.target.value)}
                placeholder="e.g. Draft Milestone v1.0, Prior to Client Review"
                className="w-full text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
              {capturedSnapshotImage ? (
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = capturedSnapshotImage;
                    a.download = `document-snapshot-${Date.now()}.png`;
                    a.click();
                  }}
                  className="px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 border border-neutral-300 rounded font-medium cursor-pointer flex items-center gap-1.5"
                  title="Download screen snapshot as PNG file"
                >
                  <Download size={13} />
                  <span>Download PNG</span>
                </button>
              ) : <div />}

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSaveSnapshotModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (!editor) return;
                    const html = editor.getHTML();
                    const text = editor.getText();
                    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                    const newSnap: DocumentSnapshot = {
                      id: `snap-${Date.now()}`,
                      name: snapshotTitle.trim() || `Snapshot ${snapshots.length + 1}`,
                      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      htmlContent: html,
                      wordCount,
                      previewImage: capturedSnapshotImage || undefined,
                    };
                    const updated = [newSnap, ...snapshots];
                    setSnapshots(updated);
                    try {
                      localStorage.setItem('word_doc_snapshots', JSON.stringify(updated.slice(0, 20)));
                    } catch {}
                    setShowSaveSnapshotModal(false);
                    setReviewNotification(`Milestone "${newSnap.name}" saved!`);
                    setTimeout(() => setReviewNotification(null), 3000);
                  }}
                  className="px-3.5 py-1.5 text-xs bg-[#059669] hover:bg-[#047857] text-white rounded font-medium cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Version History Modal (Lazy-loaded Review tab button) */}
      {showVersionHistoryModal && (
        <React.Suspense fallback={null}>
          <VersionHistoryModal
            isOpen={showVersionHistoryModal}
            onClose={() => {
              setShowVersionHistoryModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            snapshots={snapshots}
            onUpdateSnapshots={(updated) => setSnapshots(updated)}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3500);
            }}
          />
        </React.Suspense>
      )}

      {/* AI Rewrite Modal (Lazy-loaded Review tab button) */}
      {showAiRewriteModal && (
        <React.Suspense fallback={null}>
          <AiRewriteModal
            isOpen={showAiRewriteModal}
            onClose={() => {
              setShowAiRewriteModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            onNotify={(msg) => {
              setReviewNotification(msg);
              setTimeout(() => setReviewNotification(null), 3000);
            }}
          />
        </React.Suspense>
      )}

      {/* Fx Wizard Equation Popup (Lazy-loaded only when Fx is clicked) */}
      {showEquationPopup && (
        <React.Suspense fallback={null}>
          <EquationWizardPopup
            editor={editor}
            initialLatex={equationEditingLatex}
            isBlockDefault={equationIsBlock}
            onClose={() => {
              setShowEquationPopup(false);
              setEquationEditingLatex('');
              setEquationIsBlock(false);
              editor?.commands.focus();
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export const RibbonToolbar = React.memo(RibbonToolbarComponent);
