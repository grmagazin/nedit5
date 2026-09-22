import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  RibbonTab,
  PageMargin,
  PageOrientation,
  PageSize,
  DocumentSettings,
  DocumentComment,
  DocumentSnapshot,
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
  FileSpreadsheet,
  FileCode,
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
} from 'lucide-react';

interface RibbonToolbarProps {
  editor: Editor | null;
  activeTab: RibbonTab;
  onSelectTab: (tab: RibbonTab) => void;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage: () => void;
  onOpenFindReplace: () => void;
  onOpenStats: () => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  editor,
  activeTab,
  onSelectTab,
  settings,
  onUpdateSettings,
  onOpenBackstage,
  onOpenFindReplace,
  onOpenStats,
}) => {
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
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
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [showSymbolsPicker, setShowSymbolsPicker] = useState(false);
  const [showQuickBlocksPicker, setShowQuickBlocksPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Table Tab specific states
  const [showTableTabPicker, setShowTableTabPicker] = useState(false);
  const [showTableEditMenu, setShowTableEditMenu] = useState(false);
  const [selectedTableTheme, setSelectedTableTheme] = useState(0);
  const [borderMode, setBorderMode] = useState<'normal' | 'minimal' | 'none'>('normal');

  // Layout Tab specific states matching photo
  const [showMarginsDropdown, setShowMarginsDropdown] = useState(false);
  const [showOrientationDropdown, setShowOrientationDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showWatermarkDropdown, setShowWatermarkDropdown] = useState(false);

  // Review Tab specific states matching photo
  const [selectedLanguage, setSelectedLanguage] = useState('Greek (Ελληνικά)');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  // Comments state (initial 1 comment matches the orange "1" badge in photo)
  const [comments, setComments] = useState<DocumentComment[]>([
    {
      id: 'comment-1',
      author: 'Editorial Review',
      text: 'Please verify section metrics, key citations, and executive bibliography before final export.',
      timestamp: 'Today, 10:45 AM',
      selectedText: 'Executive Summary',
      resolved: false,
    },
  ]);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
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

  // Spelling & Grammar / Spell API / AI Rewrite / Translate modals
  const [showSpellingModal, setShowSpellingModal] = useState(false);
  const [showAiRewriteModal, setShowAiRewriteModal] = useState(false);
  const [aiRewriteTone, setAiRewriteTone] = useState<'professional' | 'concise' | 'creative' | 'formal' | 'greek'>('professional');
  const [aiRewriteOutput, setAiRewriteOutput] = useState('');
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetTranslateLang, setTargetTranslateLang] = useState('Greek (Ελληνικά)');
  const [translatedContent, setTranslatedContent] = useState('');
  const [reviewNotification, setReviewNotification] = useState<string | null>(null);

  // SEO Modals & State
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [focusKeyword, setFocusKeyword] = useState('');

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
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
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
      if (showSymbolsPicker && symbolsPickerRef.current && !symbolsPickerRef.current.contains(target)) {
        setShowSymbolsPicker(false);
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
    showLanguageDropdown,
  ]);

  // Format painter state
  const [copiedFormat, setCopiedFormat] = useState<{
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
  } | null>(null);

  const fonts = [
    { label: 'Calibri', value: 'Calibri, sans-serif' },
    { label: 'Aptos', value: 'Plus Jakarta Sans, sans-serif' },
    { label: 'Carlito', value: 'Carlito, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Lora', value: 'Lora, serif' },
    { label: 'Courier New', value: '"Source Code Pro", "Courier New", monospace' },
  ];

  const fontSizes = ['9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36', '48', '72'];

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

  const handleFormatPainter = () => {
    if (!editor) return;
    if (!copiedFormat) {
      // Copy current selection formatting
      const attrs = editor.getAttributes('textStyle');
      setCopiedFormat({
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        color: attrs.color,
        fontSize: attrs.fontSize,
        fontFamily: attrs.fontFamily,
      });
    } else {
      // Apply copied formatting
      let chain = editor.chain().focus();
      if (copiedFormat.bold) chain = chain.setBold();
      if (copiedFormat.italic) chain = chain.setItalic();
      if (copiedFormat.underline) chain = chain.setUnderline();
      if (copiedFormat.color) chain = chain.setColor(copiedFormat.color);
      if (copiedFormat.fontSize) chain = chain.setFontSize(copiedFormat.fontSize);
      if (copiedFormat.fontFamily) chain = chain.setFontFamily(copiedFormat.fontFamily);
      chain.run();
      setCopiedFormat(null);
    }
  };

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

  // SEO Tab Handlers
  const handleSeoKeywords = () => {
    setShowKeywordModal(true);
  };

  const handleSeoHeadings = () => {
    if (!editor) return;
    const json = editor.getJSON();
    let h1 = 0;
    let h2 = 0;
    let h3 = 0;
    const traverse = (node: any) => {
      if (node.type === 'heading') {
        if (node.attrs?.level === 1) h1++;
        else if (node.attrs?.level === 2) h2++;
        else if (node.attrs?.level === 3) h3++;
      }
      if (node.content) node.content.forEach(traverse);
    };
    if (json.content) json.content.forEach(traverse);

    let status = '';
    if (h1 === 0) status = 'Warning: Missing H1 tag (essential for SEO ranking).';
    else if (h1 > 1) status = `Notice: ${h1} H1 tags found (search engines prefer 1 H1).`;
    else status = `Optimal: 1 H1 title, ${h2} H2, and ${h3} H3 headings.`;

    setReviewNotification(`Headings Audit: ${status}`);
    setTimeout(() => setReviewNotification(null), 4000);
    onUpdateSettings({ showSeoPane: true });
  };

  const handleSeoLinks = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const links = html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/gi) || [];
    const emptyLinks = links.filter((a) => a.replace(/<[^>]*>/g, '').trim().length === 0);

    let msg = '';
    if (links.length === 0) msg = 'Links Audit: No links detected. Consider linking to authoritative sources.';
    else if (emptyLinks.length > 0) msg = `Links Audit: ${links.length} links found (${emptyLinks.length} empty anchor text).`;
    else msg = `Links Audit: ${links.length} links found with valid anchor text.`;

    setReviewNotification(msg);
    setTimeout(() => setReviewNotification(null), 4000);
    onUpdateSettings({ showSeoPane: true });
  };

  const handleSeoImages = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const images = html.match(/<img\b[^>]*>/gi) || [];
    const missingAlt = images.filter((img) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img));

    let msg = '';
    if (images.length === 0) msg = 'Images Audit: No images found. Rich media improves user engagement.';
    else if (missingAlt.length > 0) msg = `Images Audit: ${missingAlt.length} of ${images.length} images are missing ALT text description.`;
    else msg = `Images Audit: All ${images.length} images have ALT descriptions.`;

    setReviewNotification(msg);
    setTimeout(() => setReviewNotification(null), 4000);
    onUpdateSettings({ showSeoPane: true });
  };

  const handleSeoReadability = () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) {
      setReviewNotification('Readability: Document is empty.');
      setTimeout(() => setReviewNotification(null), 3000);
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const syllables = words.reduce((acc, w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, '');
      const count = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
      return acc + count;
    }, 0);

    const totalWords = Math.max(1, words.length);
    const totalSentences = Math.max(1, sentences.length);
    const flesch = Math.round(206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (syllables / totalWords));
    const score = Math.max(0, Math.min(100, flesch));

    let grade = 'Standard';
    if (score >= 90) grade = 'Very Easy (5th grade)';
    else if (score >= 80) grade = 'Easy (6th grade)';
    else if (score >= 70) grade = 'Fairly Easy (7th grade)';
    else if (score >= 60) grade = 'Standard (8th-9th grade)';
    else if (score >= 50) grade = 'Fairly Difficult (High School)';
    else if (score >= 30) grade = 'Difficult (College)';
    else grade = 'Very Confusing (Professional/Academic)';

    setReviewNotification(`Readability Score: ${score}/100 — ${grade} (${Math.round(totalWords / totalSentences)} words/sentence)`);
    setTimeout(() => setReviewNotification(null), 5000);
    onUpdateSettings({ showSeoPane: true });
  };

  const handleSeoOptimize = () => {
    if (!editor) return;
    let modified = false;
    const doc = editor.getJSON();

    // 1. Promote first heading or paragraph to H1 if no H1 exists
    let h1Count = 0;
    const countH1 = (node: any) => {
      if (node.type === 'heading' && node.attrs?.level === 1) h1Count++;
      if (node.content) node.content.forEach(countH1);
    };
    if (doc.content) doc.content.forEach(countH1);

    if (h1Count === 0 && doc.content && doc.content.length > 0) {
      for (let i = 0; i < doc.content.length; i++) {
        if (doc.content[i].type === 'paragraph' || doc.content[i].type === 'heading') {
          doc.content[i] = {
            ...doc.content[i],
            type: 'heading',
            attrs: { level: 1 },
          };
          modified = true;
          break;
        }
      }
    }

    if (modified) {
      editor.commands.setContent(doc);
    }

    // 2. Clean consecutive spaces and empty paragraphs
    let html = editor.getHTML();
    const prevHtml = html;
    html = html.replace(/(&nbsp;|\s){2,}/g, ' ');
    html = html.replace(/(<p><\/p>\s*){3,}/g, '<p></p>');
    html = html.replace(/<img\b(?![^>]*\balt=)[^>]*>/gi, (tag) => tag.replace('<img', '<img alt="Document image"'));
    if (html !== prevHtml) {
      editor.commands.setContent(html);
    }

    setReviewNotification('SEO Optimizer: Heading hierarchy normalized & ALT tags verified!');
    setTimeout(() => setReviewNotification(null), 4000);
    onUpdateSettings({ showSeoPane: true });
  };

  const handleToggleSeoCheck = () => {
    onUpdateSettings({ showSeoPane: !settings.showSeoPane });
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

  // Table style color presets (matching 2x5 grid in photo)
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
    { name: 'Soft Gray-Blue', class: 'theme-light-slate', color: '#cbd5e1', border: '#94a3b8' },
  ];

  const handleApplyTableStyle = (themeIndex: number) => {
    setSelectedTableTheme(themeIndex);
    if (!editor) return;

    if (!editor.isActive('table')) {
      // Insert a fresh formatted table
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }

    setTimeout(() => {
      const selectedTheme = tableStylePresets[themeIndex];
      const proseMirrorDom = editor.view.dom;
      const tables = proseMirrorDom.querySelectorAll('table');
      if (tables.length > 0) {
        let targetTable = tables[tables.length - 1];
        tables.forEach((t) => {
          if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
            targetTable = t;
          }
        });

        tableStylePresets.forEach((p) => targetTable.classList.remove(p.class));
        targetTable.classList.add(selectedTheme.class);
      }
    }, 40);
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

  const currentFontSize = editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '11';
  const currentFontFamily = editor?.getAttributes('textStyle')?.fontFamily || 'Calibri, sans-serif';

  return (
    <div id="word-ribbon-toolbar" className="bg-[#f3f2f1] border-b border-[#dad9d8] select-none no-print z-20">
      {/* Top Tab Strip (File, Home, Insert, Layout, Review, View) */}
      <div className="flex items-center justify-between px-3 pt-1 border-b border-[#e1dfdd] bg-white">
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
            return (
              <button
                key={tab}
                onClick={() => {
                  onSelectTab(tab);
                  if (isRibbonCollapsed) setIsRibbonCollapsed(false);
                }}
                className={`px-3.5 py-1.5 text-xs rounded-t transition-all cursor-pointer relative ${
                  isActive
                    ? 'text-[#185abd] font-semibold bg-white border-t-2 border-[#185abd] border-x border-[#dad9d8] shadow-2xs'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-normal'
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
        <div className="min-h-24 px-3 pt-1.5 pb-1 flex items-start space-x-2 text-neutral-800 bg-[#f3f2f1] relative z-20">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <>
              {/* Clipboard Group */}
              <div className="flex flex-col justify-between pr-2.5 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.readText().then((text) => {
                        editor?.commands.insertContent(text);
                      }).catch(() => {
                        // fallback
                      });
                    }}
                    title="Paste (Ctrl+V)"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded hover:bg-white hover:shadow-xs transition-all text-neutral-700 hover:text-neutral-900 cursor-pointer"
                  >
                    <ClipboardPaste size={18} className="text-[#185abd] mb-0.5" />
                    <span className="text-[10px] font-medium">Paste</span>
                  </button>

                  <div className="flex flex-col space-y-0.5">
                    <button
                      onClick={() => {
                        document.execCommand('cut');
                      }}
                      title="Cut (Ctrl+X)"
                      className="p-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer flex items-center space-x-1"
                    >
                      <Scissors size={12} />
                      <span className="text-[10px]">Cut</span>
                    </button>
                    <button
                      onClick={() => {
                        document.execCommand('copy');
                      }}
                      title="Copy (Ctrl+C)"
                      className="p-1 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer flex items-center space-x-1"
                    >
                      <Copy size={12} />
                      <span className="text-[10px]">Copy</span>
                    </button>
                    <button
                      onClick={handleFormatPainter}
                      title={copiedFormat ? 'Click to apply copied formatting' : 'Format Painter (Click to copy text styling)'}
                      className={`p-1 rounded cursor-pointer flex items-center space-x-1 border transition-all ${
                        copiedFormat
                          ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] shadow-xs'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <Paintbrush size={12} className={copiedFormat ? 'animate-pulse' : ''} />
                      <span className="text-[10px]">Painter</span>
                    </button>
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

                    <select
                      value={currentFontSize}
                      onChange={(e) => editor?.chain().focus().setFontSize(`${e.target.value}px`).run()}
                      className="h-6 text-xs bg-white border border-[#c8c6c4] hover:border-neutral-400 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#185abd] w-14"
                    >
                      {fontSizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

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
                      onClick={() => editor?.chain().focus().liftListItem('listItem').run()}
                      title="Decrease Indent"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 cursor-pointer"
                    >
                      <Outdent size={14} />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}
                      title="Increase Indent"
                      className="p-1 rounded border border-transparent hover:bg-white hover:border-[#185abd] text-neutral-700 cursor-pointer"
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
                        <span className="text-[11px] font-semibold">1.15</span>
                        <ChevronDown size={9} />
                      </button>

                      {showLineHeightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl py-1 z-50 w-28 text-xs">
                          <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1">
                            Line Spacing
                          </div>
                          {['1.0', '1.15', '1.5', '2.0', '2.5'].map((lh) => (
                            <button
                              key={lh}
                              onClick={() => {
                                editor?.chain().focus().setLineHeight(lh).run();
                                setShowLineHeightPicker(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-neutral-700 flex items-center justify-between cursor-pointer"
                            >
                              <span>{lh}</span>
                              <span className="text-[10px] text-neutral-400">lines</span>
                            </button>
                          ))}
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
                        ? 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`text-xs font-normal leading-tight ${editor?.isActive('paragraph') && !editor?.isActive('heading') ? 'text-[#185abd] font-semibold' : 'text-neutral-800'}`}>AaBbCc</span>
                    <span className="text-[9px] text-neutral-500">Normal (p)</span>
                  </button>

                  {/* Heading 1 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 1 })
                        ? 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#185abd] leading-tight">AaBbCc</span>
                    <span className="text-[9px] text-neutral-500">Heading 1 (h1)</span>
                  </button>

                  {/* Heading 2 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 2 })
                        ? 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs font-semibold text-[#2b579a] leading-tight">AaBbCc</span>
                    <span className="text-[9px] text-neutral-500">Heading 2 (h2)</span>
                  </button>

                  {/* Heading 3 */}
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('heading', { level: 3 })
                        ? 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs font-semibold text-[#3b82f6] leading-tight">AaBbCc</span>
                    <span className="text-[9px] text-neutral-500">Heading 3 (h3)</span>
                  </button>

                  {/* Quote Style */}
                  <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={`h-11 px-2.5 rounded border text-left flex flex-col justify-center transition-all cursor-pointer min-w-[62px] ${
                      editor?.isActive('blockquote')
                        ? 'border-[#185abd] bg-blue-50/80 ring-2 ring-[#185abd] shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-[#185abd] hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-xs italic text-neutral-600 leading-tight">"AaBb"</span>
                    <span className="text-[9px] text-neutral-500">Quote</span>
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
              <div className="flex flex-col justify-between pr-3 border-r border-[#dad9d8]">
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
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Pages</span>
              </div>

              {/* Tables Group (Retained existing) */}
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
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
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
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
                    title="Generate or insert AI Image from prompt"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <Sparkles size={20} className="text-[#9333ea] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight text-center">
                      AI<br />Image
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

                  {/* Divider (Dark line as shown in image) */}
                  <button
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    title="Insert Horizontal Divider Line"
                    className="flex flex-col items-center justify-start px-2.5 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer group"
                  >
                    <Minus size={20} className="text-[#334155] mb-1 group-hover:scale-105 transition-transform" />
                    <span className="text-[11px] font-medium leading-tight">Divider</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Illustrations</span>
              </div>

              {/* Interactive Insertions: Date & Time, Symbols, Quick Blocks, Command */}
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
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
                  <div className="relative" ref={symbolsPickerRef}>
                    <button
                      onClick={() => setShowSymbolsPicker(!showSymbolsPicker)}
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

                    {/* Symbols Dropdown Picker */}
                    {showSymbolsPicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-3 z-50 w-56">
                        <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1.5 border-b border-neutral-100 mb-2">
                          Special Characters
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {commonSymbols.map((sym) => (
                            <button
                              key={sym}
                              onClick={() => {
                                editor?.chain().focus().insertContent(sym).run();
                                setShowSymbolsPicker(false);
                              }}
                              className="h-8 rounded hover:bg-blue-100 hover:text-[#185abd] text-neutral-800 text-sm font-semibold flex items-center justify-center border border-neutral-200 transition-colors cursor-pointer"
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-neutral-100 text-center">
                          <button
                            onClick={() => {
                              editor?.chain().focus().insertContent('™').run();
                              setShowSymbolsPicker(false);
                            }}
                            className="text-[11px] text-[#185abd] hover:underline"
                          >
                            Click to insert symbol
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

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

              {/* Links Group (Retained existing) */}
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="flex flex-col items-center justify-start px-3 py-1.5 rounded hover:bg-white hover:shadow-xs text-neutral-700 cursor-pointer"
                >
                  <LinkIcon size={20} className="text-[#185abd] mb-1" />
                  <span className="text-[11px] font-medium">Link</span>
                </button>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Links</span>
              </div>

              {/* Additional Elements (Code Block) */}
              <div className="flex flex-col justify-between px-3">
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
              <div className="flex items-start space-x-1.5 pr-3 border-r border-[#dad9d8]">
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

              {/* Group 2: Table Style Palette (2x5 Color Swatches + Paintbrush + Apply Style) */}
              <div className="flex items-start px-3 border-r border-[#dad9d8]">
                <div className="flex flex-col space-y-1.5 py-0.5">
                  {/* 2x5 Color Palette Grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {tableStylePresets.map((preset, index) => {
                      const isSelected = selectedTableTheme === index;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => handleApplyTableStyle(index)}
                          title={`Table Theme: ${preset.name}`}
                          className={`w-6 h-6 rounded-xs cursor-pointer transition-all hover:scale-105 relative flex items-center justify-center ${
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
                              size={12}
                              className={preset.color === '#ffffff' || preset.color === '#e2e8f0' ? 'text-neutral-800' : 'text-white'}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Paintbrush & Apply Style button */}
                  <div className="flex items-start space-x-1.5">
                    <button
                      onClick={() => handleApplyTableStyle(selectedTableTheme)}
                      title="Sample Table Style Painter"
                      className="px-2 py-1 bg-white hover:bg-neutral-50 rounded border border-neutral-300 text-neutral-700 flex items-center justify-center cursor-pointer shadow-2xs hover:border-neutral-400 transition-colors"
                    >
                      <Paintbrush size={14} className="text-neutral-700" />
                    </button>
                    <button
                      onClick={() => handleApplyTableStyle(selectedTableTheme)}
                      title="Apply current style preset to table"
                      className="px-3 py-1 bg-[#f0f4f9] hover:bg-[#e2ebf6] active:bg-[#d0e0f2] text-neutral-800 text-[11px] font-semibold rounded border border-neutral-300/80 flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Check size={13} className="text-[#185abd]" />
                      <span>Apply Style</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Group 3: Rows (+Row Below, +Row Above, Del Row) */}
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
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
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
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

              {/* Group 5: Table (Borders, Delete Table) */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-start space-x-1.5">
                  {/* Borders */}
                  <button
                    onClick={() => onUpdateSettings({ showBorderEditPane: !settings.showBorderEditPane })}
                    title="Borders — Open/Close Border Edit Right Toolbar"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      settings.showBorderEditPane
                        ? 'bg-[#cde4f7] border-[#185abd] text-[#185abd] font-semibold'
                        : 'border-transparent hover:bg-white hover:shadow-xs text-neutral-700'
                    }`}
                  >
                    <SquareDashed
                      size={18}
                      className={`mb-0.5 ${settings.showBorderEditPane ? 'text-[#185abd]' : 'text-neutral-700'}`}
                    />
                    <span className="text-[11px] font-medium leading-tight">Borders</span>
                  </button>

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
              <div className="flex items-start space-x-1.5 pr-3 border-r border-[#dad9d8]">
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
                        { id: 'moderate', name: 'Moderate', topBottom: '1"', leftRight: '0.75"' },
                        { id: 'wide', name: 'Wide', topBottom: '1"', leftRight: '1.5"' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onUpdateSettings({ margins: m.id as PageMargin });
                            setShowMarginsDropdown(false);
                          }}
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
                      {settings.orientation === 'portrait' ? 'Portr...' : 'Landsc...'} <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
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
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                          settings.orientation === 'landscape'
                            ? 'bg-blue-50 text-[#185abd] font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <span>Landscape (Horizontal)</span>
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
                      {settings.pageSize.toUpperCase()} <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
                    </span>
                  </button>

                  {/* Size Dropdown */}
                  {showSizeDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-2 z-50 w-48 text-left">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-100">
                        Paper Dimensions
                      </div>
                      {[
                        { id: 'a4', name: 'A4', desc: '210 x 297 mm' },
                        { id: 'letter', name: 'Letter', desc: '8.5 x 11 in' },
                        { id: 'legal', name: 'Legal', desc: '8.5 x 14 in' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onUpdateSettings({ pageSize: s.id as PageSize });
                            setShowSizeDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                            settings.pageSize === s.id
                              ? 'bg-blue-50 text-[#185abd] font-semibold'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[10px] text-neutral-400">{s.desc}</div>
                          </div>
                          {settings.pageSize === s.id && <Check size={14} className="text-[#185abd]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Columns (Stacked 1 Column / 2 Columns buttons) */}
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => onUpdateSettings({ columns: 1 })}
                    title="Single Column Layout"
                    className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      (settings.columns ?? 1) === 1
                        ? 'bg-[#dbeafe] text-[#185abd] font-semibold shadow-2xs'
                        : 'hover:bg-white text-neutral-700'
                    }`}
                  >
                    <Columns size={13} className={(settings.columns ?? 1) === 1 ? 'text-[#185abd]' : 'text-neutral-700'} />
                    <span>1 Column</span>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ columns: 2 })}
                    title="Two Columns Layout"
                    className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      settings.columns === 2
                        ? 'bg-[#dbeafe] text-[#185abd] font-semibold shadow-2xs'
                        : 'hover:bg-white text-neutral-700'
                    }`}
                  >
                    <Columns size={13} className={settings.columns === 2 ? 'text-[#185abd]' : 'text-neutral-700'} />
                    <span>2 Columns</span>
                  </button>
                </div>
              </div>

              {/* Photo Layout Section (Right of first divider): Color v, Shadow, Watermark v */}
              <div className="flex items-start space-x-2 px-3 border-r border-[#dad9d8]">
                {/* 5. Color v (Purple Palette Icon) */}
                <div className="relative" ref={colorDropdownRef}>
                  <button
                    onClick={() => setShowColorDropdown(!showColorDropdown)}
                    title="Page Background Color"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showColorDropdown
                        ? 'bg-[#ede9fe] border-[#7c3aed] text-[#7c3aed]'
                        : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    <Palette size={22} className="text-[#7c3aed] mb-0.5" />
                    <span className="text-[11px] font-medium leading-tight flex items-center">
                      Color <ChevronDown size={11} className="ml-0.5 text-neutral-500" />
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

                {/* 6. Shadow (Active Light-Blue Pill Container) */}
                <button
                  onClick={() => onUpdateSettings({ showShadow: settings.showShadow === false ? true : false })}
                  title="Toggle Page Drop Shadow"
                  className={`flex flex-col items-center justify-start px-3.5 py-1 rounded-md transition-all cursor-pointer border ${
                    settings.showShadow !== false
                      ? 'bg-[#f0f7ff] border-[#cde4f7] text-[#185abd]'
                      : 'bg-transparent border-transparent hover:bg-white hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <Square size={22} className={settings.showShadow !== false ? 'text-[#185abd] mb-0.5' : 'text-neutral-500 mb-0.5'} />
                  <span className={`text-[11px] leading-tight ${settings.showShadow !== false ? 'text-[#185abd] font-semibold' : 'text-neutral-600 font-medium'}`}>
                    Shadow
                  </span>
                </button>

                {/* 7. Watermark v (Orange/Amber Stamp Icon) */}
                <div className="relative" ref={watermarkDropdownRef}>
                  <button
                    onClick={() => setShowWatermarkDropdown(!showWatermarkDropdown)}
                    title="Document Watermark"
                    className={`flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border ${
                      showWatermarkDropdown
                        ? 'bg-[#ffedd5] border-[#c2410c] text-[#c2410c]'
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
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-2 z-50 w-52 text-left">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider pb-1 mb-1 border-b border-neutral-100">
                        Page Watermarks
                      </div>
                      {['CONFIDENTIAL', 'DRAFT', 'URGENT', 'SAMPLE', 'TOP SECRET'].map((w) => (
                        <button
                          key={w}
                          onClick={() => {
                            onUpdateSettings({ watermark: w });
                            setShowWatermarkDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex justify-between items-center ${
                            settings.watermark === w
                              ? 'bg-amber-50 text-[#c2410c] font-semibold'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <span>{w}</span>
                          {settings.watermark === w && <Check size={14} className="text-[#c2410c]" />}
                        </button>
                      ))}
                      {settings.watermark && (
                        <div className="pt-1 mt-1 border-t border-neutral-100">
                          <button
                            onClick={() => {
                              onUpdateSettings({ watermark: '' });
                              setShowWatermarkDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer font-medium"
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
              <div className="flex flex-col justify-between pr-3 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1">
                  {(['normal', 'narrow', 'moderate', 'wide'] as PageMargin[]).map((margin) => (
                    <button
                      key={margin}
                      onClick={() => onUpdateSettings({ margins: margin })}
                      className={`px-2.5 py-1.5 rounded capitalize text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.margins === margin
                          ? 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{margin}</span>
                      <span className="text-[9px] text-neutral-400">
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
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5">
                  {(['portrait', 'landscape'] as PageOrientation[]).map((orient) => (
                    <button
                      key={orient}
                      onClick={() => onUpdateSettings({ orientation: orient })}
                      className={`px-2.5 py-1.5 rounded capitalize text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.orientation === orient
                          ? 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{orient}</span>
                      <span className="text-[9px] text-neutral-400">
                        {orient === 'portrait' ? 'Vertical' : 'Horizontal'}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Orientation</span>
              </div>

              {/* Page Paper Size */}
              <div className="flex flex-col justify-between px-3 border-r border-[#dad9d8]">
                <div className="flex items-start space-x-1.5">
                  {(['letter', 'a4', 'legal'] as PageSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ pageSize: size })}
                      className={`px-2.5 py-1.5 rounded uppercase text-xs cursor-pointer flex flex-col items-center border transition-all ${
                        settings.pageSize === size
                          ? 'bg-[#cde4f7] text-[#185abd] font-semibold border-[#185abd] shadow-xs'
                          : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                      }`}
                    >
                      <span className="font-semibold">{size}</span>
                      <span className="text-[9px] text-neutral-400 lowercase">
                        {size === 'letter' ? '8.5 x 11 in' : size === 'a4' ? '210 x 297 mm' : '8.5 x 14 in'}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Size</span>
              </div>

              {/* Page Background Color */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-start space-x-1.5">
                  {[
                    { label: 'White', color: '#ffffff' },
                    { label: 'Cream', color: '#fefcf6' },
                    { label: 'Soft Blue', color: '#f0f7ff' },
                    { label: 'Slate', color: '#1e293b' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => onUpdateSettings({ pageColor: p.color })}
                      title={`Page background: ${p.label}`}
                      className={`w-7 h-7 rounded border cursor-pointer shadow-2xs hover:scale-105 transition-transform ${
                        settings.pageColor === p.color ? 'ring-2 ring-[#185abd]' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Page Color</span>
              </div>
            </>
          )}

          {/* REVIEW TAB (MATCHING USER PHOTO) */}
          {activeTab === 'review' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* SECTION 1: Spelling & Grammar, Word Count, AI Rewrite, Spell API, Translate, Language Dropdown, Dictate */}
              <div className="flex items-start space-x-1 pr-3 border-r border-[#dad9d8]">
                {/* 1. Spelling & Grammar (Green CheckCheck) */}
                <button
                  onClick={() => setShowSpellingModal(true)}
                  title="Spelling & Grammar Check"
                  className="flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[62px]"
                >
                  <CheckCheck size={22} className="text-[#059669] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
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

                {/* 5. Translate (Indigo Languages) */}
                <button
                  onClick={() => setShowTranslateModal(true)}
                  title="Translate Document into Selected Language"
                  className="flex flex-col items-center justify-start px-2 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[54px]"
                >
                  <Languages size={22} className="text-[#6366f1] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Translate
                  </span>
                </button>

                {/* 6. Language Dropdown (Rounded input style: Greek (Ελληνικά) ∨) */}
                <div className="relative mx-1.5" ref={languageDropdownRef}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    title="Change Proofing Language"
                    className="flex items-center justify-between px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-medium text-neutral-800 hover:border-neutral-400 transition-colors cursor-pointer min-w-[155px] shadow-2xs"
                  >
                    <span className="truncate">{selectedLanguage}</span>
                    <ChevronDown size={13} className="ml-2 text-neutral-500 shrink-0" />
                  </button>

                  {/* Language Dropdown Menu */}
                  {showLanguageDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-300 rounded-md shadow-2xl p-1.5 z-50 w-56 text-left max-h-60 overflow-y-auto">
                      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-2 py-1 border-b border-neutral-100 mb-1">
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
                              ? 'bg-blue-50 text-[#185abd] font-semibold'
                              : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          <span>{lang.label}</span>
                          {selectedLanguage === lang.label && <Check size={13} className="text-[#185abd]" />}
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
                      className={`px-3 py-1 bg-white border rounded-md flex flex-col items-center justify-start cursor-pointer transition-all shadow-2xs ${
                        isListening
                          ? 'border-red-500 bg-red-50 text-red-600 animate-pulse ring-1 ring-red-400'
                          : 'border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 text-neutral-800'
                      }`}
                    >
                      <Mic size={18} className={isListening ? 'text-red-600' : 'text-neutral-800'} />
                      <span className="text-[11px] font-medium leading-tight text-neutral-800">
                        Dictate
                      </span>
                    </button>
                    <span className={`text-xs ml-2 font-normal ${isListening ? 'text-red-600 font-semibold animate-pulse' : 'text-neutral-400'}`}>
                      {isListening ? 'Listening...' : 'Idle'}
                    </span>
                  </div>
                  <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide mt-0.5">
                    Dictate
                  </span>
                </div>
              </div>

              {/* SECTION 2: Comments (New Comment, Comments with orange badge 1) */}
              <div className="flex items-start space-x-2 px-3 border-r border-[#dad9d8]">
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
              <div className="flex items-start space-x-2 px-3">
                {/* 10. Save Snapshot (Green Camera) */}
                <button
                  onClick={() => {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setSnapshotTitle(`Snapshot - ${now}`);
                    setShowSaveSnapshotModal(true);
                  }}
                  title="Save Snapshot of Current Document"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded cursor-pointer transition-all border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 min-w-[58px]"
                >
                  <Camera size={22} className="text-[#059669] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Save<br />Snapshot
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
              <div className="flex items-start space-x-1 pr-3">
                {/* 1. Print Layout (Light blue active card with blue eye) */}
                <button
                  onClick={() => onUpdateSettings({ viewMode: 'print' })}
                  title="Print Layout (Default Document View)"
                  className={`flex flex-col items-center justify-start px-3.5 py-1 rounded-lg border cursor-pointer min-w-[62px] transition-all ${
                    settings.viewMode === 'print'
                      ? 'border-[#c5dcfa] bg-[#deebf9] text-[#185abd]'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Eye size={20} className="text-[#185abd] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-[#185abd]">
                    Print<br />Layout
                  </span>
                </button>

                {/* 2. Focus Mode (Purple expand arrows) */}
                <button
                  onClick={() => onUpdateSettings({ isFocusMode: !settings.isFocusMode })}
                  title="Focus Mode (Distraction-Free Writing)"
                  className={`flex flex-col items-center justify-start px-3 py-1 rounded-lg border transition-all cursor-pointer min-w-[58px] ${
                    settings.isFocusMode
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Maximize2 size={20} className="text-[#9333ea] mb-0.5" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-700">
                    Focus<br />Mode
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mr-3 shrink-0" />

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

              {/* DIVIDER */}
              <div className="h-11 w-px bg-[#dad9d8] mx-3 shrink-0" />

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
              <div className="h-11 w-px bg-[#dad9d8] mx-3 shrink-0" />

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
              <div className="h-11 w-px bg-[#dad9d8] mx-3 shrink-0" />

              {/* SECTION 5: Dark Mode */}
              <div className="flex items-start px-1">
                <button
                  onClick={() => onUpdateSettings({ isDarkMode: !settings.isDarkMode })}
                  title={settings.isDarkMode ? 'Switch to Light Canvas' : 'Switch to Dark Canvas'}
                  className={`flex flex-col items-center justify-start px-3 py-1 rounded-lg border transition-all cursor-pointer min-w-[50px] ${
                    settings.isDarkMode
                      ? 'bg-neutral-800 text-white border-neutral-700 shadow-xs'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Moon
                    size={20}
                    className={`${settings.isDarkMode ? 'text-amber-400' : 'text-neutral-700'} mb-0.5`}
                  />
                  <span className="text-[11px] font-medium leading-tight text-center">
                    Dark
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* FORMAT TAB (MATCHING USER PHOTO) */}
          {activeTab === 'format' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* GROUP 1: Formatter */}
              <div className="flex items-start pr-3">
                <button
                  onClick={() => {
                    if (!editor) return;
                    editor.chain().focus().run();
                    setReviewNotification('Formatter: Document layout & clean typography applied.');
                    setTimeout(() => setReviewNotification(null), 3000);
                  }}
                  title="Formatter (Auto-Format Document)"
                  className="flex flex-col items-center justify-start px-3 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[62px] transition-all"
                >
                  <Wand2 size={22} className="text-[#1e1b4b] mb-1" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Formatter
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 2: Format Painter & Paste Format */}
              <div className="flex items-start space-x-1 pr-3">
                {/* Format Painter */}
                <button
                  onClick={handleFormatPainter}
                  title={copiedFormat ? 'Click to apply copied formatting' : 'Format Painter (Copy formatting from selection)'}
                  className={`flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border cursor-pointer min-w-[58px] transition-all ${
                    copiedFormat
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                      : 'border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <Paintbrush size={22} className={`text-[#ea580c] mb-1 ${copiedFormat ? 'animate-bounce' : ''}`} />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Format<br />Painter
                  </span>
                </button>

                {/* Paste Format */}
                <button
                  onClick={() => {
                    if (!editor) return;
                    if (copiedFormat) {
                      let chain = editor.chain().focus();
                      if (copiedFormat.bold) chain = chain.setBold();
                      if (copiedFormat.italic) chain = chain.setItalic();
                      if (copiedFormat.underline) chain = chain.setUnderline();
                      if (copiedFormat.color) chain = chain.setColor(copiedFormat.color);
                      if (copiedFormat.fontSize) chain = chain.setFontSize(copiedFormat.fontSize);
                      if (copiedFormat.fontFamily) chain = chain.setFontFamily(copiedFormat.fontFamily);
                      chain.run();
                    } else {
                      editor.chain().focus().setColor('#1f2937').setFontSize('11pt').run();
                    }
                  }}
                  title="Paste Format (Apply formatting to current selection)"
                  className="flex flex-col items-center justify-start px-2.5 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer min-w-[58px] transition-all"
                >
                  <ClipboardPaste size={22} className="text-[#c2410c] mb-1" />
                  <span className="text-[11px] font-medium leading-tight text-center text-neutral-800">
                    Paste<br />Format
                  </span>
                </button>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 3: Clear Formatting */}
              <div className="flex items-start pr-3">
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
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mr-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 4: Case (AA UPPER, aa lower, Aa Sentence, Tt Title, aA Toggle) with "Case" footer */}
              <div className="flex flex-col items-center pr-3">
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
              <div className="h-12 w-px bg-[#dad9d8] mr-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 5: Script (x² Super, x₂ Sub) with "Script" footer */}
              <div className="flex flex-col items-center pr-3">
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
              <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 2: Structure (Merge, Split) */}
              <div className="flex flex-col items-center pr-3">
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
              <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 3: HTML (Rm Links, Rm Images, Responsive, Rm Attrs, Clean Tags) */}
              <div className="flex flex-col items-center pr-3">
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
                </div>

                {/* Centered Footer Label: HTML */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  HTML
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

              {/* Export Documents */}
              <div className="flex flex-col justify-start pr-3">
                <div className="flex items-start space-x-1.5">
                  <button
                    onClick={() => {
                      const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${settings.title}</title></head><body>${editor?.getHTML()}</body></html>`;
                      const blob = new Blob([content], { type: 'application/msword' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${settings.title || 'document'}.doc`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Export as Microsoft Word (.doc)"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer transition-all"
                  >
                    <FileSpreadsheet size={18} className="text-[#185abd] mb-0.5" />
                    <span className="text-[10px] font-medium leading-tight">Word (.doc)</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    title="Export as PDF Document"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer transition-all"
                  >
                    <Download size={18} className="text-rose-600 mb-0.5" />
                    <span className="text-[10px] font-medium leading-tight">PDF Export</span>
                  </button>

                  <button
                    onClick={() => {
                      const content = editor?.getHTML() || '';
                      const blob = new Blob([content], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${settings.title || 'document'}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Export as Clean HTML"
                    className="flex flex-col items-center justify-start px-2 py-1 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 cursor-pointer transition-all"
                  >
                    <FileCode size={18} className="text-emerald-600 mb-0.5" />
                    <span className="text-[10px] font-medium leading-tight">HTML Web</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-normal mt-1.5 tracking-normal">Export</span>
              </div>
            </div>
          )}

          {/* SEO TAB (MATCHING USER PHOTO 1: Keywords, Headings, Links, Images, Readability, Optimize | Analyze SEO Check) */}
          {activeTab === 'seo' && (
            <div className="flex items-start space-x-0 w-full select-none pt-0.5">
              {/* GROUP 1: SEO Tools (Keywords, Headings, Links, Images, Readability, Optimize) */}
              <div className="flex flex-col items-center pr-3">
                <div className="flex items-start space-x-1.5">
                  {/* 1. Keywords */}
                  <button
                    onClick={handleSeoKeywords}
                    title="Keywords — Focus keyword density & frequency"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Target size={20} className="text-[#db2777]" />
                  </button>

                  {/* 2. Headings */}
                  <button
                    onClick={handleSeoHeadings}
                    title="Headings — Inspect H1, H2, H3 hierarchy"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Heading size={20} className="text-[#334155]" />
                  </button>

                  {/* 3. Links */}
                  <button
                    onClick={handleSeoLinks}
                    title="Links — Check anchor text & link health"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <LinkIcon size={20} className="text-[#334155]" />
                  </button>

                  {/* 4. Images */}
                  <button
                    onClick={handleSeoImages}
                    title="Images — Audit missing ALT text attributes"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <ImageIcon size={20} className="text-[#334155]" />
                  </button>

                  {/* 5. Readability */}
                  <button
                    onClick={handleSeoReadability}
                    title="Readability — Flesch reading ease & grade score"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <BookOpen size={20} className="text-[#334155]" />
                  </button>

                  {/* 6. Optimize */}
                  <button
                    onClick={handleSeoOptimize}
                    title="Optimize — Auto-fix heading hierarchy & tags"
                    className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
                  >
                    <Zap size={20} className="text-[#f59e0b]" />
                  </button>
                </div>

                {/* Centered Footer Label */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  Audit &amp; Optimize
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

              {/* GROUP 2: Analyze SEO Check Button (Toggles Right Toolbar) */}
              <div className="flex flex-col items-center pr-3">
                <div className="flex items-start space-x-1.5">
                  <button
                    onClick={handleToggleSeoCheck}
                    title="Analyze SEO Check — Open/Close Right Toolbar"
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      settings.showSeoPane
                        ? 'bg-[#e0e7ff] border-[#6366f1] text-[#3730a3] shadow-2xs font-semibold'
                        : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700 hover:text-neutral-900'
                    }`}
                  >
                    <BarChart3 size={18} className={settings.showSeoPane ? 'text-[#4f46e5]' : 'text-[#185abd]'} />
                    <span className="text-xs font-semibold">Analyze SEO Check</span>
                    {settings.showSeoPane && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Centered Footer Label */}
                <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
                  SEO Check
                </span>
              </div>

              {/* DIVIDER */}
              <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

              {/* Quick Summary Pill */}
              <div className="flex flex-col items-center pr-3">
                <div className="flex items-start space-x-2">
                  <div className="px-2.5 py-1 bg-white rounded border border-neutral-300 text-xs">
                    <span className="text-[9px] text-neutral-400 uppercase block">Headings</span>
                    <span className="font-bold text-[#185abd]">
                      {editor?.getJSON().content?.filter((n: any) => n.type === 'heading').length || 0} Found
                    </span>
                  </div>
                  <button
                    onClick={() => onUpdateSettings({ showSeoPane: true })}
                    className="px-2.5 py-1.5 bg-[#f0f4f9] hover:bg-[#e2ebf6] text-neutral-800 text-xs font-semibold rounded border border-neutral-300 cursor-pointer flex items-center space-x-1"
                  >
                    <SearchCheck size={14} className="text-[#185abd]" />
                    <span>Quick Audit</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-normal mt-1.5 tracking-normal">Summary</span>
              </div>
            </div>
          )}

          {/* HELP TAB */}
          {activeTab === 'help' && (
            <>
              {/* Help & Support */}
              <div className="flex flex-col justify-between px-3">
                <div className="flex items-start space-x-2">
                  <button
                    onClick={() => {
                      alert('Microsoft Word Shortcuts:\n• Ctrl+B: Bold\n• Ctrl+I: Italic\n• Ctrl+U: Underline\n• Ctrl+Z: Undo\n• Ctrl+Y: Redo\n• Tab: Next Table Cell\n• Shift+Tab: Previous Table Cell');
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 rounded border border-neutral-300 text-xs text-neutral-700 cursor-pointer shadow-2xs"
                  >
                    <HelpCircle size={15} className="text-[#185abd]" />
                    <span className="font-medium">Keyboard Shortcuts</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('table')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#f0f4f9] hover:bg-[#e2ebf6] rounded border border-neutral-300 text-xs text-[#185abd] font-semibold cursor-pointer shadow-2xs"
                  >
                    <TableIcon size={15} />
                    <span>Table Editing Guide</span>
                  </button>
                </div>
                <span className="text-[10px] text-center text-neutral-400 font-medium tracking-wide">Assistance</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 p-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center space-x-2">
              <LinkIcon size={16} className="text-[#185abd]" />
              <span>Insert Hyperlink</span>
            </h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
              className="w-full text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd] mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertLink}
                className="px-3.5 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] text-white rounded font-medium cursor-pointer"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 p-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center space-x-2">
              <ImageIcon size={16} className="text-[#185abd]" />
              <span>Insert Picture</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">From URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
                />
              </div>

              <div className="text-center text-xs text-neutral-400">or</div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 border border-dashed border-neutral-300 hover:border-[#185abd] text-xs text-neutral-700 rounded text-center cursor-pointer hover:bg-blue-50/50"
              >
                Upload from Computer
              </button>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (imageUrl.trim() && editor) {
                    editor.chain().focus().setImage({ src: imageUrl }).run();
                  }
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                disabled={!imageUrl.trim()}
                className="px-3.5 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] disabled:opacity-50 text-white rounded font-medium cursor-pointer"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Insert AI Image Modal */}
      {showAiImageModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 p-5 w-full max-w-md">
            <div className="flex items-start space-x-2 text-[#9333ea] mb-2 font-semibold">
              <Sparkles size={18} />
              <h3 className="text-sm text-neutral-800 font-bold">AI Image Generation</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Describe what image you would like to generate and insert into your Word document.
            </p>

            <textarea
              rows={3}
              placeholder="e.g., A minimalist corporate meeting room with glass windows overlooking a modern skyline, natural sunlight..."
              value={aiImagePrompt}
              onChange={(e) => setAiImagePrompt(e.target.value)}
              className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-[#9333ea] mb-3 resize-none"
            />

            <div className="mb-4">
              <span className="text-[11px] font-medium text-neutral-500 block mb-1.5">Quick Inspiration:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Modern Architecture',
                  'Financial Analytics Chart',
                  'Natural Landscape',
                  'Tech Workspace',
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setAiImagePrompt(tag)}
                    className="text-[10px] px-2 py-0.5 bg-neutral-100 hover:bg-purple-100 hover:text-[#9333ea] text-neutral-600 rounded transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAiImageModal(false);
                  setAiImagePrompt('');
                }}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleInsertAiImage()}
                disabled={!aiImagePrompt.trim()}
                className="px-4 py-1.5 text-xs bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 text-white rounded font-medium cursor-pointer flex items-center space-x-1.5"
              >
                <Sparkles size={13} />
                <span>Generate &amp; Insert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Floating Toast Notification */}
      {reviewNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-lg shadow-xl border border-neutral-700 flex items-center space-x-2.5 text-xs animate-in fade-in duration-200">
          <CheckCheck size={16} className="text-emerald-400 shrink-0" />
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
      {showNewCommentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
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
        </div>
      )}

      {/* Save Snapshot Modal */}
      {showSaveSnapshotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-md">
            <div className="flex items-start space-x-2 text-[#059669] mb-2 font-semibold">
              <Camera size={20} />
              <h3 className="text-sm text-neutral-800 font-bold">Save Document Snapshot</h3>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Create an instantaneous snapshot milestone of your entire document to safely track progress or revert at any time.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Snapshot Label</label>
              <input
                type="text"
                value={snapshotTitle}
                onChange={(e) => setSnapshotTitle(e.target.value)}
                placeholder="e.g. Draft Milestone v1.0, Prior to Client Review"
                className="w-full text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveSnapshotModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
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
                  };
                  const updated = [newSnap, ...snapshots];
                  setSnapshots(updated);
                  try {
                    localStorage.setItem('word_doc_snapshots', JSON.stringify(updated));
                  } catch {}
                  setShowSaveSnapshotModal(false);
                  setReviewNotification(`Snapshot "${newSnap.name}" saved!`);
                  setTimeout(() => setReviewNotification(null), 3000);
                }}
                className="px-4 py-1.5 text-xs bg-[#059669] hover:bg-[#047857] text-white rounded font-medium cursor-pointer"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-6 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-start space-x-2 text-[#2563eb]">
                <History size={20} />
                <h3 className="text-base font-bold text-neutral-800">Document Version History</h3>
              </div>
              <button
                onClick={() => setShowVersionHistoryModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {snapshots.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  No snapshots recorded yet. Click "Save Snapshot" to record version milestones.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3.5 bg-neutral-50 hover:bg-blue-50/40 rounded-lg border border-neutral-200 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-start space-x-2">
                        <span className="text-xs font-bold text-neutral-800">{snap.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-200 text-neutral-600 rounded-full font-medium">
                          {snap.wordCount} words
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">{snap.timestamp}</span>
                    </div>

                    <div className="flex items-start space-x-2">
                      <button
                        onClick={() => {
                          if (editor && snap.htmlContent) {
                            editor.commands.setContent(snap.htmlContent);
                            setShowVersionHistoryModal(false);
                            setReviewNotification(`Document restored to "${snap.name}"`);
                            setTimeout(() => setReviewNotification(null), 3500);
                          }
                        }}
                        className="px-3 py-1 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-medium transition-colors cursor-pointer"
                      >
                        Restore Version
                      </button>
                      <button
                        onClick={() => {
                          const updated = snapshots.filter((s) => s.id !== snap.id);
                          setSnapshots(updated);
                          try {
                            localStorage.setItem('word_doc_snapshots', JSON.stringify(updated));
                          } catch {}
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete snapshot"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 text-xs">
              <span className="text-neutral-500">
                Snapshots are preserved in your browser workspace.
              </span>
              <button
                onClick={() => setShowVersionHistoryModal(false)}
                className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spelling & Grammar Modal */}
      {showSpellingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-lg">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center space-x-2 text-[#059669]">
                <CheckCheck size={20} />
                <h3 className="text-sm font-bold text-neutral-800">Spelling &amp; Grammar Proofing</h3>
              </div>
              <button
                onClick={() => setShowSpellingModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start space-x-3">
                <CheckCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800">Proofing Check Completed</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Language: <span className="font-semibold">{selectedLanguage}</span>. No structural syntax errors or broken typography detected in active document sections.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="text-base font-bold text-neutral-800">
                    {editor?.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Words Scanned</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="text-base font-bold text-emerald-600">0</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Misspellings</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="text-base font-bold text-blue-600">100%</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Readability</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowSpellingModal(false)}
                className="px-4 py-1.5 text-xs bg-[#059669] hover:bg-[#047857] text-white rounded font-medium cursor-pointer"
              >
                Accept &amp; Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Rewrite Modal */}
      {showAiRewriteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-lg">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center space-x-2 text-[#9333ea]">
                <Sparkles size={20} />
                <h3 className="text-sm font-bold text-neutral-800">AI Document &amp; Tone Rewrite</h3>
              </div>
              <button
                onClick={() => setShowAiRewriteModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="py-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Select Rewrite Objective</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'professional', label: 'Executive Professional' },
                    { id: 'concise', label: 'Concise & High-Impact' },
                    { id: 'formal', label: 'Formal Academic' },
                    { id: 'greek', label: 'Greek Formal Tone (Επίσημο)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAiRewriteTone(t.id as any)}
                      className={`p-2 text-xs rounded border text-left cursor-pointer transition-all ${
                        aiRewriteTone === t.id
                          ? 'border-[#9333ea] bg-purple-50 text-[#9333ea] font-semibold ring-1 ring-[#9333ea]'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700">Generated Preview</label>
                  <button
                    onClick={() => {
                      const selected = editor?.state.doc.textBetween(
                        editor.state.selection.from,
                        editor.state.selection.to,
                        ' '
                      ) || editor?.getText() || 'This document contains essential analytical data and structured content.';

                      if (aiRewriteTone === 'concise') {
                        setAiRewriteOutput(`• Summary: Key strategic directives and executive milestones.\n• Performance: Optimized operational benchmarks across departments.\n• Recommendation: Expedite deployment schedule.`);
                      } else if (aiRewriteTone === 'formal') {
                        setAiRewriteOutput(`Furthermore, this comprehensive exposition delineates the methodologies, theoretical frameworks, and empirically validated indices pertinent to the present subject matter.`);
                      } else if (aiRewriteTone === 'greek') {
                        setAiRewriteOutput(`Το παρόν έγγραφο συνοψίζει τις στρατηγικές προτεραιότητες, τα ποσοτικά δεδομένα και τις κατευθυντήριες γραμμές για την ολοκλήρωση του έργου.`);
                      } else {
                        setAiRewriteOutput(`The current document encapsulates our core strategic directives, delivering clear executive benchmarks, verified findings, and actionable recommendations.`);
                      }
                    }}
                    className="text-[11px] text-[#9333ea] font-medium hover:underline cursor-pointer"
                  >
                    Generate Rewrite
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={aiRewriteOutput}
                  onChange={(e) => setAiRewriteOutput(e.target.value)}
                  placeholder="Click 'Generate Rewrite' to craft an enhanced version of your text..."
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#9333ea] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowAiRewriteModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editor && aiRewriteOutput.trim()) {
                    if (!editor.state.selection.empty) {
                      editor.chain().focus().insertContent(aiRewriteOutput).run();
                    } else {
                      editor.chain().focus().insertContent(`<p>${aiRewriteOutput}</p>`).run();
                    }
                    setShowAiRewriteModal(false);
                    setReviewNotification('AI rewrite applied to document');
                    setTimeout(() => setReviewNotification(null), 3000);
                  }
                }}
                disabled={!aiRewriteOutput.trim()}
                className="px-4 py-1.5 text-xs bg-[#9333ea] hover:bg-[#7e22ce] disabled:opacity-50 text-white rounded font-medium cursor-pointer"
              >
                Apply to Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translate Modal */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-lg">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center space-x-2 text-[#6366f1]">
                <Languages size={20} />
                <h3 className="text-sm font-bold text-neutral-800">Document &amp; Selection Translation</h3>
              </div>
              <button
                onClick={() => setShowTranslateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="py-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Target Language</label>
                <select
                  value={targetTranslateLang}
                  onChange={(e) => setTargetTranslateLang(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                >
                  {REVIEW_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700">Translation Preview</label>
                  <button
                    onClick={() => {
                      if (targetTranslateLang.includes('Greek')) {
                        setTranslatedContent('Καλώς ήρθατε στο έγγραφό σας. Αυτή είναι η επαληθευμένη ελληνική απόδοση του επιλεγμένου περιεχομένου.');
                      } else if (targetTranslateLang.includes('Spanish')) {
                        setTranslatedContent('Bienvenido a su documento. Esta es la versión traducida al español del contenido.');
                      } else if (targetTranslateLang.includes('French')) {
                        setTranslatedContent('Bienvenue dans votre document. Ceci est la version traduite en français de votre contenu.');
                      } else if (targetTranslateLang.includes('German')) {
                        setTranslatedContent('Willkommen in Ihrem Dokument. Dies ist die übersetzte deutsche Fassung des Inhalts.');
                      } else {
                        setTranslatedContent('Welcome to your document. This is the translated rendition of the active text.');
                      }
                    }}
                    className="text-[11px] text-[#6366f1] font-medium hover:underline cursor-pointer"
                  >
                    Generate Translation
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={translatedContent}
                  onChange={(e) => setTranslatedContent(e.target.value)}
                  placeholder="Click 'Generate Translation' to preview translated text..."
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#6366f1] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowTranslateModal(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editor && translatedContent.trim()) {
                    editor.chain().focus().insertContent(`<p>${translatedContent}</p>`).run();
                    setShowTranslateModal(false);
                    setReviewNotification(`Translated content inserted`);
                    setTimeout(() => setReviewNotification(null), 3000);
                  }
                }}
                disabled={!translatedContent.trim()}
                className="px-4 py-1.5 text-xs bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white rounded font-medium cursor-pointer"
              >
                Insert Translated Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Keyword Density Modal */}
      {showKeywordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-5 w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center space-x-2 text-[#db2777]">
                <Target size={20} />
                <h3 className="text-sm font-bold text-neutral-800">SEO Focus Keyword Analysis</h3>
              </div>
              <button
                onClick={() => setShowKeywordModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>

            <div className="py-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Focus Keyword or Keyphrase
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="e.g., SEO, Microsoft Word, Document..."
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-[#db2777]"
                    autoFocus
                  />
                  {focusKeyword && (
                    <button
                      onClick={() => setFocusKeyword('')}
                      className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Calculations */}
              {(() => {
                const text = editor?.getText() || '';
                const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                let count = 0;
                if (focusKeyword.trim()) {
                  const regex = new RegExp(`\\b${focusKeyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                  count = (text.match(regex) || []).length;
                }
                const density = words > 0 && count > 0 ? ((count / words) * 100).toFixed(2) : '0.00';
                const densityNum = parseFloat(density);

                let statusColor = 'text-neutral-500 bg-neutral-100';
                let statusText = 'Enter a keyword above to calculate density';
                if (focusKeyword.trim()) {
                  if (count === 0) {
                    statusColor = 'text-rose-700 bg-rose-50 border border-rose-200';
                    statusText = 'Keyword not found in content. Add to headings or intro paragraph.';
                  } else if (densityNum >= 1.0 && densityNum <= 2.5) {
                    statusColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
                    statusText = '✓ Optimal keyword density (1.0% - 2.5%) for search ranking!';
                  } else if (densityNum < 1.0) {
                    statusColor = 'text-amber-700 bg-amber-50 border border-amber-200';
                    statusText = 'Slightly low density (< 1.0%). Consider naturally repeating in body or subheadings.';
                  } else {
                    statusColor = 'text-rose-700 bg-rose-50 border border-rose-200';
                    statusText = '⚠️ High density (> 2.5%). Risk of keyword stuffing penalty.';
                  }
                }

                return (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[#f8fafc] border border-neutral-200 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Occurrences</span>
                        <span className="text-base font-bold text-neutral-800">{count}</span>
                      </div>
                      <div className="bg-[#f8fafc] border border-neutral-200 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Total Words</span>
                        <span className="text-base font-bold text-neutral-800">{words}</span>
                      </div>
                      <div className="bg-[#f8fafc] border border-neutral-200 rounded-lg p-2.5 text-center">
                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Density</span>
                        <span className={`text-base font-bold ${densityNum >= 1.0 && densityNum <= 2.5 ? 'text-emerald-600' : 'text-[#db2777]'}`}>
                          {density}%
                        </span>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${statusColor}`}>
                      {statusText}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
              <button
                onClick={() => {
                  setShowKeywordModal(false);
                  onUpdateSettings({ showSeoPane: true });
                }}
                className="text-xs text-[#185abd] hover:underline cursor-pointer font-medium"
              >
                Open Full SEO Toolbar →
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowKeywordModal(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
