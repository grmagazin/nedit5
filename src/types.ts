export type RibbonTab = 'file' | 'home' | 'insert' | 'table' | 'layout' | 'review' | 'view' | 'format' | 'convert' | 'seo' | 'help';

export type PageOrientation = 'portrait' | 'landscape';

export type PageSize = 'letter' | 'a4' | 'legal';

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

export interface DocumentSettings {
  title: string;
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
  showImageWizardPane?: boolean;
  showQuickBlocksPane?: boolean;
  showVoiceCommandPane?: boolean;
  showSpellCheckPane?: boolean;
  isFocusMode?: boolean;
  viewMode: 'print' | 'read' | 'web';
  isDarkMode: boolean;
  columns?: 1 | 2;
  showShadow?: boolean;
  watermark?: string;
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
}
