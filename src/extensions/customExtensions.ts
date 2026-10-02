import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import '@tiptap/extension-text-style';

export const CustomDiv = Node.create({
  name: 'divBlock',
  group: 'block',
  content: 'block*',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const el = element as HTMLElement;
          const cls = el.getAttribute('class') || '';
          const style = el.getAttribute('style') || '';
          if (
            cls.includes('divTable') ||
            cls.includes('divTableRow') ||
            cls.includes('divTableCell') ||
            cls.includes('divTableHeading') ||
            cls.includes('divTableBody') ||
            cls.includes('table-') ||
            cls.includes('table-row') ||
            cls.includes('table-cell') ||
            style.includes('display: flex') ||
            style.includes('display: table') ||
            el.hasAttribute('data-div-table')
          ) {
            return {};
          }
          return false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});

export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderTop: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderTop || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderTop ? { style: `border-top: ${attributes.borderTop}` } : {},
      },
      borderRight: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderRight || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderRight ? { style: `border-right: ${attributes.borderRight}` } : {},
      },
      borderBottom: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderBottom || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderBottom ? { style: `border-bottom: ${attributes.borderBottom}` } : {},
      },
      borderLeft: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderLeft || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderLeft ? { style: `border-left: ${attributes.borderLeft}` } : {},
      },
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderTop: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderTop || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderTop ? { style: `border-top: ${attributes.borderTop}` } : {},
      },
      borderRight: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderRight || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderRight ? { style: `border-right: ${attributes.borderRight}` } : {},
      },
      borderBottom: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderBottom || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderBottom ? { style: `border-bottom: ${attributes.borderBottom}` } : {},
      },
      borderLeft: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.borderLeft || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.borderLeft ? { style: `border-left: ${attributes.borderLeft}` } : {},
      },
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

export const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      class: {
        default: 'word-divider',
        parseHTML: (element: HTMLElement) => element.getAttribute('class') || 'word-divider',
        renderHTML: (attributes: Record<string, any>) => {
          return {
            class: attributes.class || 'word-divider',
          };
        },
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    letterSpacing: {
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
    paragraphFormatting: {
      setTextDirection: (direction: 'auto' | 'ltr' | 'rtl') => ReturnType;
      unsetTextDirection: () => ReturnType;
      setParagraphIndent: (indent: string) => ReturnType;
      unsetParagraphIndent: () => ReturnType;
      setParagraphRightIndent: (rightIndent: string) => ReturnType;
      unsetParagraphRightIndent: () => ReturnType;
      increaseParagraphIndent: () => ReturnType;
      decreaseParagraphIndent: () => ReturnType;
      setFirstLineIndent: (firstLineIndent: string) => ReturnType;
      unsetFirstLineIndent: () => ReturnType;
      setParagraphSpacing: (spacing: { top?: string; bottom?: string }) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export const FontFamily = Extension.create({
  name: 'fontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontFamily?.replace(/['"]+/g, ''),
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontFamily) {
                return {};
              }
              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (attributes.lineHeight === null || attributes.lineHeight === undefined || attributes.lineHeight === '') {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'lineHeight')
          );
        },
    };
  },
});

export const LetterSpacing = Extension.create({
  name: 'letterSpacing',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.letterSpacing?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.letterSpacing) {
                return {};
              }
              return {
                style: `letter-spacing: ${attributes.letterSpacing}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { letterSpacing }).run();
        },
      unsetLetterSpacing:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { letterSpacing: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export const TextEffects = Extension.create({
  name: 'textEffects',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textShadow: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.textShadow || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.textShadow) return {};
              return {
                style: `text-shadow: ${attributes.textShadow}`,
              };
            },
          },
          markerHighlight: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const bg = element.style.background || element.style.backgroundImage || '';
              if (bg.includes('linear-gradient')) return bg;
              return element.getAttribute('data-marker') || null;
            },
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.markerHighlight) return {};
              return {
                style: `background: ${attributes.markerHighlight}; padding: 1px 4px; border-radius: 3px; box-decoration-break: clone; -webkit-box-decoration-break: clone;`,
                'data-marker': attributes.markerHighlight,
              };
            },
          },
          textOutline: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              (element.style as any).webkitTextStroke || (element.style as any).textStroke || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.textOutline) return {};
              return {
                style: `-webkit-text-stroke: ${attributes.textOutline}; text-stroke: ${attributes.textOutline};`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextShadow:
        (textShadow: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { textShadow }).run();
        },
      unsetTextShadow:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { textShadow: null }).removeEmptyTextStyle().run();
        },
      setMarkerHighlight:
        (markerHighlight: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { markerHighlight }).run();
        },
      unsetMarkerHighlight:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { markerHighlight: null }).removeEmptyTextStyle().run();
        },
      setTextOutline:
        (textOutline: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { textOutline }).run();
        },
      unsetTextOutline:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { textOutline: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textEffects: {
      setTextShadow: (textShadow: string) => ReturnType;
      unsetTextShadow: () => ReturnType;
      setMarkerHighlight: (markerHighlight: string) => ReturnType;
      unsetMarkerHighlight: () => ReturnType;
      setTextOutline: (textOutline: string) => ReturnType;
      unsetTextOutline: () => ReturnType;
    };
  }
}

export const ParagraphFormatting = Extension.create({
  name: 'paragraphFormatting',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textDirection: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('dir') || element.style.direction || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.textDirection) return {};
              return {
                dir: attributes.textDirection,
                style: `direction: ${attributes.textDirection}`,
              };
            },
          },
          indent: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginLeft || element.getAttribute('data-indent') || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.indent) return {};
              return {
                style: `margin-left: ${attributes.indent}`,
                'data-indent': attributes.indent,
              };
            },
          },
          rightIndent: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginRight || element.getAttribute('data-right-indent') || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.rightIndent) return {};
              return {
                style: `margin-right: ${attributes.rightIndent}`,
                'data-right-indent': attributes.rightIndent,
              };
            },
          },
          firstLineIndent: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.textIndent || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.firstLineIndent) return {};
              return {
                style: `text-indent: ${attributes.firstLineIndent}`,
              };
            },
          },
          paragraphSpacingTop: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginTop || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.paragraphSpacingTop) return {};
              return {
                style: `margin-top: ${attributes.paragraphSpacingTop}`,
              };
            },
          },
          paragraphSpacingBottom: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.paragraphSpacingBottom) return {};
              return {
                style: `margin-bottom: ${attributes.paragraphSpacingBottom}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection:
        (direction: 'auto' | 'ltr' | 'rtl') =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, { textDirection: direction })
          );
        },
      unsetTextDirection:
        () =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.resetAttributes(type, 'textDirection')
          );
        },
      setParagraphIndent:
        (indent: string) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: indent || null,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      unsetParagraphIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: null,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      setParagraphRightIndent:
        (rightIndent: string) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                rightIndent: rightIndent || null,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      unsetParagraphRightIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                rightIndent: null,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      increaseParagraphIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent;
              let currentPx = 0;
              if (currentIndent) {
                const parsed = parseFloat(currentIndent);
                if (!isNaN(parsed)) currentPx = parsed;
              }
              const newPx = Math.min(currentPx + 36, 288);
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: `${newPx}px`,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      decreaseParagraphIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection;
          let changed = false;
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent;
              if (!currentIndent) return;
              const parsed = parseFloat(currentIndent);
              const currentPx = isNaN(parsed) ? 0 : parsed;
              const newPx = Math.max(0, currentPx - 36);
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: newPx > 0 ? `${newPx}px` : null,
              });
              changed = true;
            }
          });
          if (changed && dispatch) {
            dispatch(tr);
          }
          return changed;
        },
      setFirstLineIndent:
        (firstLineIndent: string) =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, { firstLineIndent })
          );
        },
      unsetFirstLineIndent:
        () =>
        ({ commands }) => {
          return this.options.types.some((type: string) =>
            commands.resetAttributes(type, 'firstLineIndent')
          );
        },
      setParagraphSpacing:
        (spacing: { top?: string; bottom?: string }) =>
        ({ commands }) => {
          const attrs: Record<string, any> = {};
          if (spacing.top !== undefined) attrs.paragraphSpacingTop = spacing.top;
          if (spacing.bottom !== undefined) attrs.paragraphSpacingBottom = spacing.bottom;
          return this.options.types.some((type: string) =>
            commands.updateAttributes(type, attrs)
          );
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) => {
          return this.options.types.some((type: string) => {
            commands.resetAttributes(type, 'paragraphSpacingTop');
            return commands.resetAttributes(type, 'paragraphSpacingBottom');
          });
        },
    };
  },
});

