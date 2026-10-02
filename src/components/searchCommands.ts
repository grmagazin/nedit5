import { Editor } from '@tiptap/react';
import { DocumentSettings, PageMargin, PageOrientation, PageSize, ThemeMode } from '../types';
import { BackstageTab } from './FileBackstage';
import { cleanAllSpacing } from '../utils/spacingUtils';

export interface CommandContext {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onOpenBackstage?: (tab?: BackstageTab) => void;
  onOpenFindReplace?: () => void;
  onOpenStats?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onOpenThemes?: () => void;
  onToggleComments?: () => void;
  onSelectTab?: (tab: any) => void;
  notify?: (msg: string) => void;
}

export interface SearchCommand {
  id: string;
  label: string;
  description: string;
  category: 'Formatting' | 'Paragraph' | 'Insert' | 'Layout' | 'Themes' | 'Review & AI' | 'View' | 'Export & File';
  keywords: string[];
  shortcut?: string;
  iconType: string;
  action: (ctx: CommandContext) => void;
}

export const SEARCH_COMMANDS: SearchCommand[] = [
  // ==========================================
  // 1. FORMATTING & TYPOGRAPHY
  // ==========================================
  {
    id: 'format-bold',
    label: 'Bold',
    description: 'Make selected text bold',
    category: 'Formatting',
    keywords: ['bold', 'strong', 'weight', 'darken', 'b', 'text'],
    shortcut: 'Ctrl+B',
    iconType: 'bold',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleBold().run();
      notify?.('Toggled Bold text');
    },
  },
  {
    id: 'format-italic',
    label: 'Italic',
    description: 'Slant text for emphasis',
    category: 'Formatting',
    keywords: ['italic', 'emphasis', 'em', 'slant', 'i', 'oblique'],
    shortcut: 'Ctrl+I',
    iconType: 'italic',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleItalic().run();
      notify?.('Toggled Italic text');
    },
  },
  {
    id: 'format-underline',
    label: 'Underline',
    description: 'Underline selected text',
    category: 'Formatting',
    keywords: ['underline', 'line', 'u', 'link', 'bottom line'],
    shortcut: 'Ctrl+U',
    iconType: 'underline',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleUnderline().run();
      notify?.('Toggled Underline');
    },
  },
  {
    id: 'format-strike',
    label: 'Strikethrough',
    description: 'Cross out text with a horizontal line',
    category: 'Formatting',
    keywords: ['strike', 'strikethrough', 'cross out', 'delete line', 's'],
    shortcut: 'Ctrl+Shift+X',
    iconType: 'strikethrough',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleStrike().run();
      notify?.('Toggled Strikethrough');
    },
  },
  {
    id: 'format-subscript',
    label: 'Subscript (x₂)',
    description: 'Position text slightly below normal line (e.g. H₂O)',
    category: 'Formatting',
    keywords: ['subscript', 'sub', 'chemical', 'formula', 'below', 'x2'],
    iconType: 'subscript',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleSubscript().run();
      notify?.('Toggled Subscript');
    },
  },
  {
    id: 'format-superscript',
    label: 'Superscript (x²)',
    description: 'Position text slightly above normal line (e.g. 10²)',
    category: 'Formatting',
    keywords: ['superscript', 'super', 'math', 'exponent', 'power', 'above', 'x^2'],
    iconType: 'superscript',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleSuperscript().run();
      notify?.('Toggled Superscript');
    },
  },
  {
    id: 'format-clear',
    label: 'Clear All Formatting',
    description: 'Remove all styling and restore default text appearance',
    category: 'Formatting',
    keywords: ['clear', 'remove formatting', 'clean', 'reset', 'plain text'],
    iconType: 'eraser',
    action: ({ editor, notify }) => {
      editor?.chain().focus().unsetAllMarks().clearNodes().run();
      notify?.('Cleared all formatting from selection');
    },
  },
  {
    id: 'style-heading1',
    label: 'Heading 1',
    description: 'Major section heading (Large & Bold)',
    category: 'Formatting',
    keywords: ['heading 1', 'h1', 'title', 'header', 'section', 'big'],
    shortcut: 'Ctrl+Alt+1',
    iconType: 'heading1',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleHeading({ level: 1 }).run();
      notify?.('Applied Heading 1');
    },
  },
  {
    id: 'style-heading2',
    label: 'Heading 2',
    description: 'Subsection heading (Medium)',
    category: 'Formatting',
    keywords: ['heading 2', 'h2', 'subtitle', 'header 2', 'subsection'],
    shortcut: 'Ctrl+Alt+2',
    iconType: 'heading2',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleHeading({ level: 2 }).run();
      notify?.('Applied Heading 2');
    },
  },
  {
    id: 'style-heading3',
    label: 'Heading 3',
    description: 'Minor topic heading (Small)',
    category: 'Formatting',
    keywords: ['heading 3', 'h3', 'sub-heading', 'header 3', 'topic'],
    shortcut: 'Ctrl+Alt+3',
    iconType: 'heading3',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleHeading({ level: 3 }).run();
      notify?.('Applied Heading 3');
    },
  },
  {
    id: 'style-paragraph',
    label: 'Normal Paragraph (p)',
    description: 'Convert selection back to standard body paragraph',
    category: 'Formatting',
    keywords: ['normal', 'paragraph', 'body', 'p', 'standard text'],
    shortcut: 'Ctrl+Alt+0',
    iconType: 'pilcrow',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setParagraph().run();
      notify?.('Applied Normal Paragraph style');
    },
  },
  {
    id: 'style-blockquote',
    label: 'Quote Block',
    description: 'Format text as an indented blockquote with accent border',
    category: 'Formatting',
    keywords: ['quote', 'blockquote', 'citation', 'indent quote'],
    iconType: 'quote',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleBlockquote().run();
      notify?.('Toggled Quote style');
    },
  },
  {
    id: 'style-codeblock',
    label: 'Code Block',
    description: 'Insert preformatted multi-line syntax code block',
    category: 'Formatting',
    keywords: ['code', 'code block', 'syntax', 'programming', 'pre'],
    iconType: 'code',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleCodeBlock().run();
      notify?.('Toggled Code Block');
    },
  },

  // ==========================================
  // 2. PARAGRAPH, LISTS & ALIGNMENT
  // ==========================================
  {
    id: 'list-bullet',
    label: 'Bullet List',
    description: 'Create an unnumbered bulleted item list',
    category: 'Paragraph',
    keywords: ['bullet', 'list', 'unordered', 'dots', 'points', 'ul'],
    shortcut: 'Ctrl+Shift+8',
    iconType: 'list',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleBulletList().run();
      notify?.('Toggled Bullet List');
    },
  },
  {
    id: 'list-ordered',
    label: 'Numbered List',
    description: 'Create a sequential numbered item list (1, 2, 3...)',
    category: 'Paragraph',
    keywords: ['number', 'ordered', 'numbered list', 'sequence', 'ol'],
    shortcut: 'Ctrl+Shift+7',
    iconType: 'listOrdered',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleOrderedList().run();
      notify?.('Toggled Numbered List');
    },
  },
  {
    id: 'list-task',
    label: 'Checklist / Task List',
    description: 'Create interactive checkbox task items',
    category: 'Paragraph',
    keywords: ['task', 'checklist', 'checkbox', 'todo', 'tasks'],
    iconType: 'checkSquare',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleTaskList().run();
      notify?.('Toggled Task Checklist');
    },
  },
  {
    id: 'align-left',
    label: 'Align Left',
    description: 'Align paragraph text along left margin',
    category: 'Paragraph',
    keywords: ['align left', 'left', 'left justify'],
    shortcut: 'Ctrl+L',
    iconType: 'alignLeft',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setTextAlign('left').run();
      notify?.('Aligned text Left');
    },
  },
  {
    id: 'align-center',
    label: 'Align Center',
    description: 'Center paragraph text horizontally on the page',
    category: 'Paragraph',
    keywords: ['align center', 'center', 'middle', 'centered text'],
    shortcut: 'Ctrl+E',
    iconType: 'alignCenter',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setTextAlign('center').run();
      notify?.('Centered text');
    },
  },
  {
    id: 'align-right',
    label: 'Align Right',
    description: 'Align paragraph text along right margin',
    category: 'Paragraph',
    keywords: ['align right', 'right'],
    shortcut: 'Ctrl+R',
    iconType: 'alignRight',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setTextAlign('right').run();
      notify?.('Aligned text Right');
    },
  },
  {
    id: 'align-justify',
    label: 'Justify Text',
    description: 'Distribute text evenly between left and right margins',
    category: 'Paragraph',
    keywords: ['justify', 'full justify', 'spread text'],
    shortcut: 'Ctrl+J',
    iconType: 'alignJustify',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setTextAlign('justify').run();
      notify?.('Justified text');
    },
  },
  {
    id: 'spacing-0',
    label: 'Line Spacing: 0 (Zero)',
    description: 'Set zero line spacing for collapsed vertical line height',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'zero space', '0', '0.0'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('0').run();
      notify?.('Line spacing set to 0');
    },
  },
  {
    id: 'spacing-05',
    label: 'Line Spacing: 0.5 (Half)',
    description: 'Set half line spacing for ultra-compact text',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'half space', '0.5', '0,5'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('0.5').run();
      notify?.('Line spacing set to 0.5');
    },
  },
  {
    id: 'spacing-10',
    label: 'Line Spacing: 1.0 (Single)',
    description: 'Set single line spacing for compact text',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'single space', '1.0'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('1.0').run();
      notify?.('Line spacing set to 1.0');
    },
  },
  {
    id: 'spacing-115',
    label: 'Line Spacing: 1.15 (Office Default)',
    description: 'Standard Microsoft Word line spacing',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'default space', '1.15'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('1.15').run();
      notify?.('Line spacing set to 1.15');
    },
  },
  {
    id: 'spacing-15',
    label: 'Line Spacing: 1.5',
    description: 'Set one-and-a-half line spacing for easy reading',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', '1.5 space', '1.5'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('1.5').run();
      notify?.('Line spacing set to 1.5');
    },
  },
  {
    id: 'spacing-20',
    label: 'Line Spacing: 2.0 (Double)',
    description: 'Set double line spacing for academic essays & draft manuscripts',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'double space', '2.0'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('2.0').run();
      notify?.('Line spacing set to 2.0');
    },
  },
  {
    id: 'spacing-25',
    label: 'Line Spacing: 2.5',
    description: 'Set two-and-a-half line spacing',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', '2.5 space', '2.5'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('2.5').run();
      notify?.('Line spacing set to 2.5');
    },
  },
  {
    id: 'spacing-30',
    label: 'Line Spacing: 3.0 (Triple)',
    description: 'Set triple line spacing for wide draft review',
    category: 'Paragraph',
    keywords: ['line spacing', 'spacing', 'triple space', '3.0', '3'],
    iconType: 'arrowUpDown',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setLineHeight('3').run();
      notify?.('Line spacing set to 3');
    },
  },
  {
    id: 'spacing-clean',
    label: 'Clean Spacing (No Spacing)',
    description: 'Clean all spacing (line, paragraph, and table spacing) to no spacing in selected area',
    category: 'Paragraph',
    keywords: ['clean spacing', 'no spacing', 'remove spacing', 'clean tables spacing', 'clean', 'lines'],
    iconType: 'sparkles',
    action: ({ editor, notify }) => {
      if (editor) cleanAllSpacing(editor);
      notify?.('Cleaned all spacing in selected area to No Spacing');
    },
  },
  {
    id: 'highlight-yellow',
    label: 'Highlight Text (Yellow)',
    description: 'Apply bright yellow marker highlight to selection',
    category: 'Paragraph',
    keywords: ['highlight', 'yellow', 'marker', 'pen'],
    iconType: 'highlighter',
    action: ({ editor, notify }) => {
      editor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run();
      notify?.('Highlighted text Yellow');
    },
  },

  // ==========================================
  // 3. INSERT & TABLES
  // ==========================================
  {
    id: 'insert-table-3x3',
    label: 'Insert 3×3 Table',
    description: 'Insert 3 rows by 3 columns data table with styled header',
    category: 'Insert',
    keywords: ['table', 'insert table', 'grid', 'columns', 'rows', '3x3'],
    iconType: 'table',
    action: ({ editor, notify }) => {
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      notify?.('Inserted 3×3 Table');
    },
  },
  {
    id: 'insert-table-4x4',
    label: 'Insert 4×4 Table',
    description: 'Insert 4 rows by 4 columns data grid',
    category: 'Insert',
    keywords: ['table', '4x4', 'grid', 'matrix'],
    iconType: 'table',
    action: ({ editor, notify }) => {
      editor?.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
      notify?.('Inserted 4×4 Table');
    },
  },
  {
    id: 'insert-table-2x2',
    label: 'Insert 2×2 Table',
    description: 'Insert quick 2×2 comparison grid',
    category: 'Insert',
    keywords: ['table', '2x2', 'comparison', 'simple table'],
    iconType: 'table',
    action: ({ editor, notify }) => {
      editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
      notify?.('Inserted 2×2 Table');
    },
  },
  {
    id: 'table-add-row',
    label: 'Add Table Row Below',
    description: 'Insert a new table row beneath the active cell',
    category: 'Insert',
    keywords: ['row', 'add row', 'table row', 'insert row'],
    iconType: 'table',
    action: ({ editor, notify }) => {
      if (editor?.isActive('table')) {
        editor.chain().focus().addRowAfter().run();
        notify?.('Added Table row below');
      } else {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        notify?.('Inserted new Table (cursor was not in a table)');
      }
    },
  },
  {
    id: 'table-add-col',
    label: 'Add Table Column Right',
    description: 'Insert a new table column to the right of cursor',
    category: 'Insert',
    keywords: ['column', 'add column', 'col', 'table col'],
    iconType: 'table',
    action: ({ editor, notify }) => {
      if (editor?.isActive('table')) {
        editor.chain().focus().addColumnAfter().run();
        notify?.('Added Table column to the right');
      } else {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        notify?.('Inserted new Table');
      }
    },
  },
  {
    id: 'table-delete',
    label: 'Delete Table',
    description: 'Delete active table from document',
    category: 'Insert',
    keywords: ['delete table', 'remove table', 'clear table'],
    iconType: 'trash',
    action: ({ editor, notify }) => {
      if (editor?.isActive('table')) {
        editor.chain().focus().deleteTable().run();
        notify?.('Deleted Table');
      } else {
        notify?.('Cursor is not inside a table');
      }
    },
  },
  {
    id: 'insert-hr',
    label: 'Insert Horizontal Line',
    description: 'Add a visual divider rule between sections',
    category: 'Insert',
    keywords: ['horizontal line', 'divider', 'separator', 'rule', 'line break', 'hr'],
    iconType: 'minus',
    action: ({ editor, notify }) => {
      editor?.chain().focus().setHorizontalRule().run();
      notify?.('Inserted Horizontal Line');
    },
  },
  {
    id: 'insert-page-break',
    label: 'Insert Page Break',
    description: 'Break document flow and push remaining content to next page',
    category: 'Insert',
    keywords: ['page break', 'break', 'next page', 'split page'],
    iconType: 'fileText',
    action: ({ editor, notify }) => {
      editor?.chain().focus().insertContent('<div style="page-break-after: always; height: 1px; border-bottom: 2px dashed #94a3b8; margin: 16px 0;"></div><p></p>').run();
      notify?.('Inserted Page Break');
    },
  },
  {
    id: 'insert-link',
    label: 'Insert Hyperlink',
    description: 'Attach a web URL to the selected text',
    category: 'Insert',
    keywords: ['link', 'hyperlink', 'url', 'web link', 'href'],
    shortcut: 'Ctrl+K',
    iconType: 'link',
    action: ({ editor, onUpdateSettings, notify }) => {
      onUpdateSettings({ showHyperLinkPane: true });
      notify?.('Opened Hyperlink editor');
    },
  },
  {
    id: 'insert-image',
    label: 'Insert Picture / Image Wizard',
    description: 'Upload picture, generate AI visuals, or insert royalty-free photos',
    category: 'Insert',
    keywords: ['image', 'picture', 'photo', 'img', 'media', 'generate image'],
    iconType: 'image',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ showImageWizardPane: true });
      notify?.('Opened Image Wizard');
    },
  },
  {
    id: 'insert-signature',
    label: 'Insert Formal Signature Block',
    description: 'Add standard business sign-off with date, signature line, and title',
    category: 'Insert',
    keywords: ['signature', 'sign-off', 'closing', 'sincerely', 'letterhead'],
    iconType: 'penTool',
    action: ({ editor, notify }) => {
      const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      editor?.chain().focus().insertContent(
        `<p style="margin-top: 2rem;">Sincerely,</p><p style="margin-top: 2.5rem; border-top: 1px solid #94a3b8; display: inline-block; min-width: 200px; padding-top: 4px;"><strong>Authorized Signature</strong><br/><span style="color: #64748b; font-size: 11px;">Date: ${today}</span></p><p></p>`
      ).run();
      notify?.('Inserted Formal Signature Block');
    },
  },

  // ==========================================
  // 4. THEMES & DARK MODES
  // ==========================================
  {
    id: 'theme-full-dark',
    label: 'Full Dark Mode',
    description: 'Complete dark theme: dark ribbon, dark canvas, and high-contrast dark page',
    category: 'Themes',
    keywords: ['dark', 'full dark', 'night mode', 'dark mode', 'black', 'dark theme'],
    iconType: 'moon',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ themeMode: 'fullDark', isDarkMode: true });
      notify?.('Switched to Full Dark Mode');
    },
  },
  {
    id: 'theme-canvas-dark',
    label: 'Canvas Dark Mode',
    description: 'Dark ribbon and charcoal workspace with crisp white document paper',
    category: 'Themes',
    keywords: ['canvas dark', 'dark canvas', 'hybrid dark', 'slate', 'white paper'],
    iconType: 'moon',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ themeMode: 'canvasDark', isDarkMode: true });
      notify?.('Switched to Canvas Dark Mode');
    },
  },
  {
    id: 'theme-light',
    label: 'Light Mode',
    description: 'Classic Microsoft Word office light theme with blue accents',
    category: 'Themes',
    keywords: ['light', 'light mode', 'day mode', 'bright', 'white theme', 'office blue'],
    iconType: 'sun',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ themeMode: 'light', isDarkMode: false });
      notify?.('Switched to Light Mode');
    },
  },
  {
    id: 'theme-sepia',
    label: 'Sepia Eye Comfort Mode',
    description: 'Warm soothing parchment tones designed for long reading & writing sessions',
    category: 'Themes',
    keywords: ['sepia', 'eye comfort', 'warm', 'reading mode', 'parchment', 'amber'],
    iconType: 'sun',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ themeMode: 'sepia', isDarkMode: false });
      notify?.('Switched to Sepia Eye Comfort Mode');
    },
  },
  {
    id: 'page-shadow-toggle',
    label: 'Toggle Page Drop Shadow',
    description: 'Turn on/off realistic document sheet elevation shadow',
    category: 'Themes',
    keywords: ['shadow', 'drop shadow', 'page shadow', 'elevation', '3d'],
    iconType: 'square',
    action: ({ settings, onUpdateSettings, notify }) => {
      const nextVal = settings.showShadow === false ? true : false;
      onUpdateSettings({ showShadow: nextVal });
      notify?.(`Page Drop Shadow ${nextVal ? 'enabled' : 'disabled'}`);
    },
  },
  {
    id: 'page-color-cream',
    label: 'Page Color: Ivory Cream',
    description: 'Set document sheet background to elegant soft cream',
    category: 'Themes',
    keywords: ['page color', 'cream', 'ivory', 'background color'],
    iconType: 'palette',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageColor: '#fefcf6' });
      notify?.('Page Color set to Ivory Cream');
    },
  },
  {
    id: 'page-color-white',
    label: 'Page Color: Crisp White',
    description: 'Reset document sheet background to pure white',
    category: 'Themes',
    keywords: ['page color', 'white', 'reset page color', 'pure white'],
    iconType: 'palette',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageColor: '#ffffff' });
      notify?.('Page Color reset to Crisp White');
    },
  },
  {
    id: 'toggle-ultimate-formatter',
    label: 'Ultimate Formatter',
    description: 'Open the Ultimate Formatter right toolbar for text shadows, markers, badges, and callout boxes',
    category: 'Formatting',
    keywords: ['ultimate formatter', 'formatter', 'text shadow', 'marker', 'highlight', 'paragraph box', 'effects', 'badge', 'outline', 'format painter'],
    iconType: 'wand',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ showFormatterPane: true });
      notify?.('Ultimate Formatter opened');
    },
  },

  // ==========================================
  // 5. LAYOUT & PAGE SETUP
  // ==========================================
  {
    id: 'layout-1-col',
    label: '1 Column Layout',
    description: 'Standard single continuous column document layout',
    category: 'Layout',
    keywords: ['1 column', 'one column', 'single column', 'column layout'],
    iconType: 'columns',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ columns: 1 });
      notify?.('Layout set to 1 Column');
    },
  },
  {
    id: 'layout-2-col',
    label: '2 Columns Layout',
    description: 'Newspaper & journal-style dual column text layout',
    category: 'Layout',
    keywords: ['2 columns', 'two columns', 'dual column', 'newspaper', 'split columns'],
    iconType: 'columns',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ columns: 2 });
      notify?.('Layout set to 2 Columns');
    },
  },
  {
    id: 'layout-portrait',
    label: 'Orientation: Portrait',
    description: 'Vertical page orientation (Standard 8.5" × 11")',
    category: 'Layout',
    keywords: ['portrait', 'vertical', 'orientation', 'page orientation'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ orientation: 'portrait' });
      notify?.('Page Orientation set to Portrait');
    },
  },
  {
    id: 'layout-landscape',
    label: 'Orientation: Landscape',
    description: 'Horizontal widescreen page orientation (11" × 8.5")',
    category: 'Layout',
    keywords: ['landscape', 'horizontal', 'wide', 'orientation'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ orientation: 'landscape' });
      notify?.('Page Orientation set to Landscape');
    },
  },
  {
    id: 'margins-normal',
    label: 'Margins: Normal (1 inch)',
    description: 'Standard 1-inch margins on all four sides',
    category: 'Layout',
    keywords: ['margins', 'normal margins', '1 inch', 'margin normal'],
    iconType: 'sliders',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ margins: 'normal', customMargins: undefined });
      notify?.('Margins set to Normal (1 inch)');
    },
  },
  {
    id: 'margins-narrow',
    label: 'Margins: Narrow (0.5 inch)',
    description: 'Compact half-inch margins to fit maximum content per page',
    category: 'Layout',
    keywords: ['margins', 'narrow margins', '0.5 inch', 'half inch'],
    iconType: 'sliders',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ margins: 'narrow', customMargins: undefined });
      notify?.('Margins set to Narrow (0.5 inch)');
    },
  },
  {
    id: 'margins-wide',
    label: 'Margins: Wide (1.5 inches)',
    description: 'Generous 1.5-inch margins for literary & publishing style',
    category: 'Layout',
    keywords: ['margins', 'wide margins', '1.5 inch', 'book margins'],
    iconType: 'sliders',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ margins: 'wide', customMargins: undefined });
      notify?.('Margins set to Wide (1.5 inches)');
    },
  },
  {
    id: 'size-a4',
    label: 'Paper Size: A4 (Default)',
    description: 'Standard international A4 format (8.27 × 11.69" / 210 × 297 mm)',
    category: 'Layout',
    keywords: ['a4', 'paper size', 'size', 'international paper', '210x297'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'a4' });
      notify?.('Paper Size set to A4 (8.27 × 11.69")');
    },
  },
  {
    id: 'size-letter',
    label: 'Paper Size: Letter',
    description: 'Standard North American Letter format (8.5 × 11")',
    category: 'Layout',
    keywords: ['letter', 'paper size', 'size', 'us letter', '8.5x11'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'letter' });
      notify?.('Paper Size set to Letter (8.5 × 11")');
    },
  },
  {
    id: 'size-legal',
    label: 'Paper Size: Legal',
    description: 'Extended North American Legal format (8.5 × 14")',
    category: 'Layout',
    keywords: ['legal', 'paper size', 'size', 'long paper', '8.5x14'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'legal' });
      notify?.('Paper Size set to Legal (8.5 × 14")');
    },
  },
  {
    id: 'size-a3',
    label: 'Paper Size: A3',
    description: 'Large international A3 format (11.69 × 16.54" / 297 × 420 mm)',
    category: 'Layout',
    keywords: ['a3', 'paper size', 'size', 'large paper'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'a3' });
      notify?.('Paper Size set to A3 (11.69 × 16.54")');
    },
  },
  {
    id: 'size-a5',
    label: 'Paper Size: A5',
    description: 'Compact international A5 booklet format (5.83 × 8.27" / 148 × 210 mm)',
    category: 'Layout',
    keywords: ['a5', 'paper size', 'size', 'booklet'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'a5' });
      notify?.('Paper Size set to A5 (5.83 × 8.27")');
    },
  },
  {
    id: 'size-executive',
    label: 'Paper Size: Executive',
    description: 'Executive format (7.25 × 10.5")',
    category: 'Layout',
    keywords: ['executive', 'paper size', 'size', '7.25x10.5'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'executive' });
      notify?.('Paper Size set to Executive (7.25 × 10.5")');
    },
  },
  {
    id: 'size-tabloid',
    label: 'Paper Size: Tabloid',
    description: 'Tabloid format (11 × 17")',
    category: 'Layout',
    keywords: ['tabloid', 'paper size', 'size', '11x17'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'tabloid' });
      notify?.('Paper Size set to Tabloid (11 × 17")');
    },
  },
  {
    id: 'size-b5',
    label: 'Paper Size: B5',
    description: 'JIS B5 format (6.93 × 9.84" / 176 × 250 mm)',
    category: 'Layout',
    keywords: ['b5', 'paper size', 'size', 'japanese'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'b5' });
      notify?.('Paper Size set to B5 (6.93 × 9.84")');
    },
  },
  {
    id: 'size-a6',
    label: 'Paper Size: A6',
    description: 'Pocket A6 format (4.13 × 5.83" / 105 × 148 mm)',
    category: 'Layout',
    keywords: ['a6', 'paper size', 'size', 'postcard'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'a6' });
      notify?.('Paper Size set to A6 (4.13 × 5.83")');
    },
  },
  {
    id: 'size-folio',
    label: 'Paper Size: Folio',
    description: 'Folio format (8.5 × 13")',
    category: 'Layout',
    keywords: ['folio', 'paper size', 'size', '8.5x13'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'folio' });
      notify?.('Paper Size set to Folio (8.5 × 13")');
    },
  },
  {
    id: 'size-statement',
    label: 'Paper Size: Statement',
    description: 'Half Letter Statement format (5.5 × 8.5")',
    category: 'Layout',
    keywords: ['statement', 'paper size', 'size', 'half letter', '5.5x8.5'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'statement' });
      notify?.('Paper Size set to Statement (5.5 × 8.5")');
    },
  },
  {
    id: 'size-ledger',
    label: 'Paper Size: Ledger',
    description: 'Horizontal Ledger format (17 × 11")',
    category: 'Layout',
    keywords: ['ledger', 'paper size', 'size', '17x11'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ pageSize: 'ledger' });
      notify?.('Paper Size set to Ledger (17 × 11")');
    },
  },
  {
    id: 'watermark-confidential',
    label: 'Watermark: CONFIDENTIAL',
    description: 'Stamp semi-transparent Confidential watermark across pages',
    category: 'Layout',
    keywords: ['watermark', 'confidential', 'stamp', 'security'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ watermark: 'CONFIDENTIAL' });
      notify?.('Watermark set to CONFIDENTIAL');
    },
  },
  {
    id: 'watermark-draft',
    label: 'Watermark: DRAFT',
    description: 'Stamp Draft watermark across pages',
    category: 'Layout',
    keywords: ['watermark', 'draft', 'stamp', 'wip'],
    iconType: 'fileText',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ watermark: 'DRAFT' });
      notify?.('Watermark set to DRAFT');
    },
  },
  {
    id: 'watermark-remove',
    label: 'Remove Watermark',
    description: 'Clear any active watermark from document pages',
    category: 'Layout',
    keywords: ['remove watermark', 'clear watermark', 'delete watermark', 'no watermark'],
    iconType: 'eraser',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ watermark: '' });
      notify?.('Watermark removed');
    },
  },

  // ==========================================
  // 6. REVIEW, AI & TOOLS
  // ==========================================
  {
    id: 'tool-find-replace',
    label: 'Find and Replace',
    description: 'Search document for words or phrases and replace them',
    category: 'Review & AI',
    keywords: ['find', 'replace', 'search text', 'locate', 'query'],
    shortcut: 'Ctrl+F',
    iconType: 'search',
    action: ({ onOpenFindReplace, notify }) => {
      onOpenFindReplace?.();
      notify?.('Opened Find & Replace');
    },
  },
  {
    id: 'tool-ai-assistant',
    label: 'AI Writing Assistant',
    description: 'Open Gemini AI intelligent copilot for summarizing, drafting & rewriting',
    category: 'Review & AI',
    keywords: ['ai', 'assistant', 'copilot', 'gemini', 'generate', 'bot', 'rewrite'],
    shortcut: 'Alt+A',
    iconType: 'sparkles',
    action: ({ settings, onUpdateSettings, notify }) => {
      onUpdateSettings({ showAiAssistantPane: !settings.showAiAssistantPane });
      notify?.('Toggled AI Writing Assistant');
    },
  },
  {
    id: 'tool-seo-audit',
    label: 'Analyze SEO & Content Audit',
    description: 'Check keywords, heading depth, reading ease and search engine health',
    category: 'Review & AI',
    keywords: ['seo', 'audit', 'keywords', 'rank', 'readability', 'flesch'],
    iconType: 'barChart3',
    action: ({ settings, onUpdateSettings, notify }) => {
      onUpdateSettings({ showSeoPane: !settings.showSeoPane });
      notify?.('Toggled SEO Content Audit');
    },
  },
  {
    id: 'tool-spell-check',
    label: 'Spelling & Grammar Check (Gemini AI)',
    description: 'Inspect selected text or document for spelling and grammar errors with Gemini AI',
    category: 'Review & AI',
    keywords: ['spelling', 'grammar', 'spellcheck', 'proof', 'proofing', 'dictionary', 'gemini'],
    iconType: 'spellCheck',
    action: ({ settings, onUpdateSettings, notify }) => {
      onUpdateSettings({
        showAiAssistantPane: true,
        aiAssistantIntent: 'grammar',
        aiAssistantTriggerTimestamp: Date.now(),
        showSpellCheckPane: false,
      });
      notify?.('Opened Gemini AI Spelling & Grammar proofing');
    },
  },
  {
    id: 'tool-equation-wizard',
    label: 'Fx Equation Wizard (Κατασκευαστής Τύπων)',
    description: 'Insert mathematical equations (inline or block) with KaTeX at caret',
    category: 'Formatting',
    keywords: ['equation', 'math', 'fx', 'formula', 'latex', 'katex', 'τύπος', 'εξίσωση', 'μαθηματικά'],
    iconType: 'wand',
    action: ({ notify }) => {
      window.dispatchEvent(new CustomEvent('open-fx-wizard', { detail: {} }));
      notify?.('Opened Fx Equation Wizard');
    },
  },
  {
    id: 'tool-translate',
    label: 'Translate Document',
    description: 'Translate selection or entire document into 30+ languages',
    category: 'Review & AI',
    keywords: ['translate', 'languages', 'french', 'spanish', 'greek', 'german', 'multilingual'],
    iconType: 'languages',
    action: ({ settings, onUpdateSettings, notify }) => {
      onUpdateSettings({ showTranslatePane: !settings.showTranslatePane });
      notify?.('Opened Translation panel');
    },
  },
  {
    id: 'tool-comments',
    label: 'Comments & Annotations',
    description: 'Open comments panel to review feedback, notes, and team discussions',
    category: 'Review & AI',
    keywords: ['comments', 'notes', 'feedback', 'review', 'annotate'],
    iconType: 'messageSquare',
    action: ({ onToggleComments, notify }) => {
      onToggleComments?.();
      notify?.('Toggled Comments panel');
    },
  },
  {
    id: 'tool-word-count',
    label: 'Word Count & Statistics',
    description: 'Detailed statistics: words, characters, paragraphs, pages & reading time',
    category: 'Review & AI',
    keywords: ['word count', 'statistics', 'stats', 'characters', 'reading time', 'count'],
    iconType: 'fileCheck',
    action: ({ onOpenStats, notify }) => {
      onOpenStats?.();
      notify?.('Opened Document Statistics');
    },
  },
  {
    id: 'tool-dictation',
    label: 'Voice Dictation',
    description: 'Speak into microphone to transcribe speech directly into document',
    category: 'Review & AI',
    keywords: ['dictate', 'voice', 'microphone', 'speech to text', 'mic', 'dictation'],
    iconType: 'mic',
    action: ({ onSelectTab, notify }) => {
      onSelectTab?.('review');
      notify?.('Switched to Review tab: Click Dictate to begin');
    },
  },
  {
    id: 'tool-read-aloud',
    label: 'Read Aloud (Text to Speech)',
    description: 'Listen to document read aloud using browser voices',
    category: 'Review & AI',
    keywords: ['read aloud', 'tts', 'speech', 'listen', 'speak', 'audio'],
    iconType: 'volume2',
    action: ({ onSelectTab, notify }) => {
      onSelectTab?.('help');
      notify?.('Switched to Help tab: Click Read Aloud to listen');
    },
  },

  // ==========================================
  // 7. VIEW & NAVIGATION
  // ==========================================
  {
    id: 'view-print-layout',
    label: 'Print Layout View',
    description: 'View document exactly as it will look printed on paper',
    category: 'View',
    keywords: ['print layout', 'view', 'page view', 'default view'],
    iconType: 'eye',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ viewMode: 'print' });
      notify?.('Switched to Print Layout view');
    },
  },
  {
    id: 'view-read-mode',
    label: 'Read Mode',
    description: 'Optimized reading view maximizing screen readability',
    category: 'View',
    keywords: ['read mode', 'reading', 'book mode', 'view'],
    iconType: 'bookOpen',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ viewMode: 'read' });
      notify?.('Switched to Read Mode');
    },
  },
  {
    id: 'view-web-layout',
    label: 'Web Layout View',
    description: 'View document as a responsive continuous web page without page breaks',
    category: 'View',
    keywords: ['web layout', 'html view', 'continuous', 'web'],
    iconType: 'globe',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ viewMode: 'web' });
      notify?.('Switched to Web Layout view');
    },
  },
  {
    id: 'view-focus-zen',
    label: 'Zen Focus Mode',
    description: 'Hide toolbars and ribbon for 100% distraction-free writing (Esc to exit)',
    category: 'View',
    keywords: ['focus', 'zen', 'distraction free', 'fullscreen', 'hide ribbon'],
    shortcut: 'Esc to Exit',
    iconType: 'maximize2',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ isFocusMode: true });
      notify?.('Entered Zen Focus Mode (Press Esc to exit)');
    },
  },
  {
    id: 'view-ruler-toggle',
    label: 'Toggle Interactive Ruler',
    description: 'Show or hide the horizontal top measurement ruler',
    category: 'View',
    keywords: ['ruler', 'measure', 'inches', 'top ruler', 'guide'],
    iconType: 'sliders',
    action: ({ settings, onUpdateSettings, notify }) => {
      const nextVal = !settings.showRuler;
      onUpdateSettings({ showRuler: nextVal });
      notify?.(`Interactive Ruler ${nextVal ? 'visible' : 'hidden'}`);
    },
  },
  {
    id: 'view-nav-pane',
    label: 'Toggle Navigation Pane',
    description: 'Show document outline with clickable heading navigation',
    category: 'View',
    keywords: ['navigation pane', 'outline', 'headings tree', 'jump to heading'],
    iconType: 'layers',
    action: ({ settings, onUpdateSettings, notify }) => {
      const nextVal = !settings.showNavigationPane;
      onUpdateSettings({ showNavigationPane: nextVal });
      notify?.(`Navigation Pane ${nextVal ? 'opened' : 'closed'}`);
    },
  },
  {
    id: 'view-zoom-100',
    label: 'Zoom: 100% (Default)',
    description: 'Reset document zoom magnification to standard 100%',
    category: 'View',
    keywords: ['zoom', '100%', 'reset zoom', 'magnification'],
    iconType: 'search',
    action: ({ onUpdateSettings, notify }) => {
      onUpdateSettings({ zoom: 100 });
      notify?.('Zoom reset to 100%');
    },
  },
  {
    id: 'view-zoom-in',
    label: 'Zoom In (+10%)',
    description: 'Enlarge document canvas magnification',
    category: 'View',
    keywords: ['zoom in', 'enlarge', 'bigger'],
    iconType: 'search',
    action: ({ settings, onUpdateSettings, notify }) => {
      const nextZoom = Math.min(180, (settings.zoom || 100) + 10);
      onUpdateSettings({ zoom: nextZoom });
      notify?.(`Zoom: ${nextZoom}%`);
    },
  },
  {
    id: 'view-zoom-out',
    label: 'Zoom Out (-10%)',
    description: 'Reduce document canvas magnification to see more on screen',
    category: 'View',
    keywords: ['zoom out', 'shrink', 'smaller'],
    iconType: 'search',
    action: ({ settings, onUpdateSettings, notify }) => {
      const nextZoom = Math.max(50, (settings.zoom || 100) - 10);
      onUpdateSettings({ zoom: nextZoom });
      notify?.(`Zoom: ${nextZoom}%`);
    },
  },

  // ==========================================
  // 8. FILE & EXPORT
  // ==========================================
  {
    id: 'file-save',
    label: 'Save Document',
    description: 'Save latest document changes and revisions locally',
    category: 'Export & File',
    keywords: ['save', 'store', 'keep', 'commit', 'write'],
    shortcut: 'Ctrl+S',
    iconType: 'save',
    action: ({ onSave, notify }) => {
      onSave?.();
      notify?.('Document saved successfully');
    },
  },
  {
    id: 'file-print',
    label: 'Print / Save as PDF',
    description: 'Print document or generate high-fidelity PDF with printer preview',
    category: 'Export & File',
    keywords: ['print', 'pdf', 'export pdf', 'hardcopy', 'paper'],
    shortcut: 'Ctrl+P',
    iconType: 'printer',
    action: ({ onPrint, notify }) => {
      onPrint?.();
      notify?.('Opening Print / PDF preview');
    },
  },
  {
    id: 'file-export-docx',
    label: 'Export Microsoft Word (.docx)',
    description: 'Download standard Microsoft Word document with tables, styles and formatting',
    category: 'Export & File',
    keywords: ['docx', 'export docx', 'word', 'microsoft word', 'download word', 'save as docx'],
    iconType: 'download',
    action: ({ onOpenBackstage, notify }) => {
      onOpenBackstage?.('docx');
      notify?.('Opened DOCX Export Engine');
    },
  },
  {
    id: 'file-export-markdown',
    label: 'Export Markdown (.md)',
    description: 'Export GitHub-flavored Markdown text with tables and code blocks',
    category: 'Export & File',
    keywords: ['markdown', 'export markdown', 'md', 'github', 'plain text'],
    iconType: 'download',
    action: ({ onOpenBackstage, notify }) => {
      onOpenBackstage?.('markdown');
      notify?.('Opened Markdown Export Engine');
    },
  },
  {
    id: 'file-export-pdf',
    label: 'Export PDF Document (.pdf)',
    description: 'Export high-resolution ISO 32000 vector PDF with clean page breaks',
    category: 'Export & File',
    keywords: ['pdf', 'export pdf', 'print pdf', 'save as pdf', 'vector pdf', 'adobe'],
    iconType: 'download',
    action: ({ onOpenBackstage, notify }) => {
      onOpenBackstage?.('pdf');
      notify?.('Opened PDF Export & Print Engine');
    },
  },
  {
    id: 'file-export-html',
    label: 'Export HTML & Web Package (.zip)',
    description: 'Export clean HTML with bundled assets and embedded styling',
    category: 'Export & File',
    keywords: ['html', 'zip', 'web export', 'export html', 'website'],
    iconType: 'download',
    action: ({ onOpenBackstage, notify }) => {
      onOpenBackstage?.('htmlzip');
      notify?.('Opened HTML Export Engine');
    },
  },
  {
    id: 'file-backup-json',
    label: 'Backup Document (JSON)',
    description: 'Create complete portable snapshot backup for safe storage & transfer',
    category: 'Export & File',
    keywords: ['backup', 'json', 'restore', 'snapshot', 'archive'],
    iconType: 'download',
    action: ({ onOpenBackstage, notify }) => {
      onOpenBackstage?.('backup');
      notify?.('Opened Backup & Restore Center');
    },
  },
  {
    id: 'file-new-templates',
    label: 'New Document / Themes & Templates',
    description: 'Browse professionally designed business, resume, report, and letter templates',
    category: 'Export & File',
    keywords: ['new', 'template', 'templates', 'resume', 'cv', 'report', 'themes', 'blank'],
    iconType: 'plus',
    action: ({ onOpenThemes, onOpenBackstage, notify }) => {
      if (onOpenThemes) {
        onOpenThemes();
      } else {
        onOpenBackstage?.('new');
      }
      notify?.('Opened Themes & Templates');
    },
  },
];
