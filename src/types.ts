export type RibbonTab = 'file' | 'home' | 'insert' | 'table' | 'layout' | 'review' | 'view' | 'format' | 'convert' | 'seo' | 'help';

export type PageOrientation = 'portrait' | 'landscape';

export type PageSize =
  | 'a4'
  | 'letter'
  | 'legal'
  | 'a3'
  | 'a5'
  | 'executive'
  | 'tabloid'
  | 'b5'
  | 'a6'
  | 'folio'
  | 'statement'
  | 'ledger';

export type PageMargin = 'normal' | 'narrow' | 'moderate' | 'wide' | 'custom';

export interface CustomMarginValues {
  left: number; // in inches
  right: number; // in inches
  top?: number;
  bottom?: number;
  firstLineIndent?: number; // in inches relative to left margin
  leftIndent?: number; // in inches relative to left margin
}

export interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readingTimeMinutes: number;
}

export type ThemeMode = 'light' | 'canvasDark' | 'fullDark' | 'sepia';

export type PageBorderStyle =
  | 'simple-shadow'
  | 'deep-shadow'
  | 'box-border'
  | 'thick-border'
  | 'dots-border'
  | 'double-border'
  | 'none';

export interface DocumentSettings {
  title: string;
  themeMode?: ThemeMode;
  author?: string;
  tags?: string;
  version?: string;
  createdDate?: string;
  updatedDate?: string;
  // Smart Header & Footer settings
  headerLeft?: string;
  headerRight?: string;
  headerShowPages?: boolean;
  headerPageStart?: number;
  headerPageTotal?: number;
  headerPageSeparator?: string;
  footerLeft?: string;
  footerRight?: string;
  footerShowPages?: boolean;
  footerPageStart?: number;
  footerPageTotal?: number;
  footerPageSeparator?: string;
  showHeaderFooter?: boolean;
  orientation: PageOrientation;
  pageSize: PageSize;
  margins: PageMargin;
  customMargins?: CustomMarginValues;
  pageColor: string;
  zoom: number; // e.g. 100
  showRuler: boolean;
  showGridlines: boolean;
  showParagraphMarks?: boolean;
  showNavigationPane?: boolean;
  showSeoPane?: boolean;
  showTableEditPane?: boolean;
  enableTableHandle?: boolean; // auto activate if a table focused
  showBorderEditPane?: boolean;
  enableBorderHandle?: boolean; // auto activate if a table focused (deactivated by default)
  showHyperLinkPane?: boolean;
  hyperLinkMode?: 'navigate' | 'edit';
  showTranslatePane?: boolean;
  showAiAssistantPane?: boolean;
  aiAssistantIntent?: 'grammar' | 'improve' | 'summarize' | null;
  aiAssistantTriggerTimestamp?: number;
  showImageWizardPane?: boolean;
  showQuickBlocksPane?: boolean;
  showVoiceCommandPane?: boolean;
  showSpellCheckPane?: boolean;
  showFormatterPane?: boolean;
  isFocusMode?: boolean;
  viewMode: 'print' | 'read' | 'web';
  isDarkMode: boolean;
  columns?: 1 | 2;
  layoutPages?: 1 | 2;
  showShadow?: boolean;
  pageBorderStyle?: PageBorderStyle;
  watermark?: string;
  customWatermark?: string;
}

export interface TableDimensions {
  rows: number;
  cols: number;
}

export interface DocumentComment {
  id: string;
  author: string;
  text: string;
  selectedText?: string;
  timestamp: string;
  resolved?: boolean;
}

export interface DocumentSnapshot {
  id: string;
  name: string;
  timestamp: string;
  htmlContent: string;
  wordCount: number;
  previewImage?: string;
}
