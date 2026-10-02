import { Editor } from '@tiptap/react';

/**
 * Word-grade Format Painter definition.
 * Captures both inline character marks and paragraph-level block node attributes/types,
 * stored strictly in memory (avoiding the OS clipboard entirely).
 */
export interface CopiedWordFormat {
  // Character formatting (inline marks)
  character: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    subscript: boolean;
    superscript: boolean;
    color?: string;
    fontSize?: string;
    fontFamily?: string;
    letterSpacing?: string;
    textShadow?: string;
    markerHighlight?: string;
    highlight?: {
      color?: string;
    } | null;
  };
  // Paragraph formatting (node attributes & block type)
  paragraph: {
    nodeType: 'paragraph' | 'heading' | 'blockquote' | 'codeBlock';
    headingLevel?: 1 | 2 | 3;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: string | null;
    textDirection?: 'ltr' | 'rtl' | null;
    indent?: string | null;
    rightIndent?: string | null;
    firstLineIndent?: string | null;
    paragraphSpacingTop?: string | null;
    paragraphSpacingBottom?: string | null;
  };
  // List formatting
  list?: {
    isList: boolean;
    listType?: 'bulletList' | 'orderedList' | 'taskList';
  };
  // Single-use (standard click) vs Persistent (double-click in Microsoft Word)
  mode: 'single' | 'persistent';
  timestamp: number;
}

/**
 * Safely copies complete formatting from the active Tiptap editor selection.
 * Avoids navigator.clipboard completely.
 */
export function copyFormatFromEditor(
  editor: Editor,
  mode: 'single' | 'persistent' = 'single'
): CopiedWordFormat | null {
  if (!editor || !editor.state) return null;

  const { selection } = editor.state;
  const { $from } = selection;

  // 1. Character Formatting (Inline marks)
  const textStyleAttrs = editor.getAttributes('textStyle') || {};
  const highlightAttrs = editor.isActive('highlight')
    ? editor.getAttributes('highlight')
    : null;

  const character = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    subscript: editor.isActive('subscript'),
    superscript: editor.isActive('superscript'),
    color: textStyleAttrs.color || undefined,
    fontSize: textStyleAttrs.fontSize || undefined,
    fontFamily: textStyleAttrs.fontFamily || undefined,
    letterSpacing: textStyleAttrs.letterSpacing || undefined,
    textShadow: textStyleAttrs.textShadow || undefined,
    markerHighlight: textStyleAttrs.markerHighlight || undefined,
    highlight: highlightAttrs?.color ? { color: highlightAttrs.color } : null,
  };

  // 2. Paragraph Formatting (Block node attributes & type)
  // Traverse up to find the closest block node
  let blockNode = $from.parent;
  let blockDepth = $from.depth;
  while (blockDepth > 0 && !blockNode.isBlock) {
    blockDepth--;
    blockNode = $from.node(blockDepth);
  }

  const blockAttrs = blockNode.attrs || {};
  let nodeType: 'paragraph' | 'heading' | 'blockquote' | 'codeBlock' = 'paragraph';
  let headingLevel: 1 | 2 | 3 | undefined = undefined;

  if (blockNode.type.name === 'heading') {
    nodeType = 'heading';
    headingLevel = (blockAttrs.level as 1 | 2 | 3) || 1;
  } else if (blockNode.type.name === 'blockquote') {
    nodeType = 'blockquote';
  } else if (blockNode.type.name === 'codeBlock') {
    nodeType = 'codeBlock';
  }

  // Determine active alignment
  let textAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
  if (editor.isActive({ textAlign: 'center' }) || blockAttrs.textAlign === 'center') {
    textAlign = 'center';
  } else if (editor.isActive({ textAlign: 'right' }) || blockAttrs.textAlign === 'right') {
    textAlign = 'right';
  } else if (editor.isActive({ textAlign: 'justify' }) || blockAttrs.textAlign === 'justify') {
    textAlign = 'justify';
  }

  const paragraph = {
    nodeType,
    headingLevel,
    textAlign,
    lineHeight: blockAttrs.lineHeight || null,
    textDirection: blockAttrs.textDirection || null,
    indent: blockAttrs.indent || null,
    rightIndent: blockAttrs.rightIndent || null,
    firstLineIndent: blockAttrs.firstLineIndent || null,
    paragraphSpacingTop: blockAttrs.paragraphSpacingTop || null,
    paragraphSpacingBottom: blockAttrs.paragraphSpacingBottom || null,
  };

  // 3. List Formatting
  let isList = false;
  let listType: 'bulletList' | 'orderedList' | 'taskList' | undefined = undefined;

  if (editor.isActive('bulletList')) {
    isList = true;
    listType = 'bulletList';
  } else if (editor.isActive('orderedList')) {
    isList = true;
    listType = 'orderedList';
  } else if (editor.isActive('taskList')) {
    isList = true;
    listType = 'taskList';
  }

  return {
    character,
    paragraph,
    list: {
      isList,
      listType,
    },
    mode,
    timestamp: Date.now(),
  };
}

/**
 * Applies the copied format to the current editor selection or targeted paragraph.
 */
export function applyFormatToEditor(editor: Editor, format: CopiedWordFormat): void {
  if (!editor || !editor.state || !format) return;

  const { empty } = editor.state.selection;
  let chain = editor.chain().focus();

  // 1. CHARACTER FORMATTING (Inline Marks)
  if (!empty) {
    // If text is selected: reset marks first, then apply copied marks
    chain = chain.unsetAllMarks();

    if (format.character.bold) chain = chain.setBold();
    if (format.character.italic) chain = chain.setItalic();
    if (format.character.underline) chain = chain.setUnderline();
    if (format.character.strike) chain = chain.setStrike();
    if (format.character.subscript) chain = chain.setSubscript();
    if (format.character.superscript) chain = chain.setSuperscript();

    if (format.character.highlight?.color) {
      chain = chain.setHighlight({ color: format.character.highlight.color });
    }

    if (format.character.color) {
      chain = chain.setColor(format.character.color);
    }
    if (format.character.fontSize) {
      chain = chain.setFontSize(format.character.fontSize);
    }
    if (format.character.fontFamily) {
      chain = chain.setFontFamily(format.character.fontFamily);
    }
    if (format.character.letterSpacing) {
      chain = chain.setLetterSpacing(format.character.letterSpacing);
    }
    if (format.character.textShadow) {
      chain = (chain as any).setTextShadow(format.character.textShadow);
    }
    if (format.character.markerHighlight) {
      chain = (chain as any).setMarkerHighlight(format.character.markerHighlight);
    }
  }

  // 2. PARAGRAPH FORMATTING (Node attributes & block type)
  // Apply block structure: heading vs paragraph vs blockquote
  if (format.paragraph.nodeType === 'heading' && format.paragraph.headingLevel) {
    chain = chain.setHeading({ level: format.paragraph.headingLevel });
  } else if (format.paragraph.nodeType === 'paragraph') {
    chain = chain.setParagraph();
  } else if (format.paragraph.nodeType === 'blockquote') {
    if (!editor.isActive('blockquote')) {
      chain = chain.wrapIn('blockquote');
    }
  }

  // Alignment
  if (format.paragraph.textAlign) {
    chain = chain.setTextAlign(format.paragraph.textAlign);
  }

  // Line Height
  if (format.paragraph.lineHeight) {
    chain = chain.setLineHeight(format.paragraph.lineHeight);
  } else {
    chain = chain.unsetLineHeight();
  }

  // Text Direction
  if (format.paragraph.textDirection) {
    chain = chain.setTextDirection(format.paragraph.textDirection);
  } else {
    chain = chain.unsetTextDirection();
  }

  // Paragraph Indent
  if (format.paragraph.indent) {
    chain = chain.setParagraphIndent(format.paragraph.indent);
  } else {
    chain = chain.unsetParagraphIndent();
  }

  // Paragraph Right Indent
  if (format.paragraph.rightIndent) {
    chain = chain.setParagraphRightIndent(format.paragraph.rightIndent);
  } else {
    chain = chain.unsetParagraphRightIndent();
  }

  // First Line Indent
  if (format.paragraph.firstLineIndent) {
    chain = chain.setFirstLineIndent(format.paragraph.firstLineIndent);
  } else {
    chain = chain.unsetFirstLineIndent();
  }

  // Paragraph Spacing
  if (format.paragraph.paragraphSpacingTop || format.paragraph.paragraphSpacingBottom) {
    chain = chain.setParagraphSpacing({
      top: format.paragraph.paragraphSpacingTop || undefined,
      bottom: format.paragraph.paragraphSpacingBottom || undefined,
    });
  }

  // 3. LIST FORMATTING
  if (format.list?.isList && format.list.listType) {
    if (format.list.listType === 'bulletList' && !editor.isActive('bulletList')) {
      chain = chain.toggleBulletList();
    } else if (format.list.listType === 'orderedList' && !editor.isActive('orderedList')) {
      chain = chain.toggleOrderedList();
    } else if (format.list.listType === 'taskList' && !editor.isActive('taskList')) {
      chain = chain.toggleTaskList();
    }
  }

  // Execute all chained operations in a single clean ProseMirror transaction
  chain.run();
}

/**
 * Generates a human-friendly description of the copied formatting for feedback tooltips.
 */
export function describeFormat(format: CopiedWordFormat): string {
  const parts: string[] = [];

  // Font details
  if (format.character.fontFamily) {
    const cleanFont = format.character.fontFamily.split(',')[0].replace(/['"]/g, '');
    parts.push(cleanFont);
  }
  if (format.character.fontSize) {
    parts.push(format.character.fontSize);
  }

  // Styles
  const styles: string[] = [];
  if (format.character.bold) styles.push('Bold');
  if (format.character.italic) styles.push('Italic');
  if (format.character.underline) styles.push('Underline');
  if (format.character.strike) styles.push('Strike');
  if (format.character.highlight) styles.push('Highlight');
  if (styles.length > 0) parts.push(styles.join('+'));

  // Paragraph
  if (format.paragraph.nodeType === 'heading') {
    parts.push(`Heading ${format.paragraph.headingLevel}`);
  }
  if (format.paragraph.textAlign && format.paragraph.textAlign !== 'left') {
    parts.push(`${format.paragraph.textAlign.charAt(0).toUpperCase() + format.paragraph.textAlign.slice(1)} align`);
  }
  if (format.paragraph.lineHeight) {
    parts.push(`${format.paragraph.lineHeight} line spacing`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Default formatting';
}
