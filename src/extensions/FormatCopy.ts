import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface StoredMark {
  type: string;
  attrs: Record<string, any>;
}

export interface StoredNodeAttrs {
  textAlign?: string;
  lineHeight?: string;
  level?: number;
  [key: string]: any;
}

export interface StoredFormat {
  marks: StoredMark[];
  nodeAttrs: StoredNodeAttrs | null;
  nodeType?: string;
  textSnippet?: string;
}

export interface FormatCopyStorage {
  active: boolean;
  persistent: boolean;
  format: StoredFormat | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formatCopy: {
      copyFormat: (persistent?: boolean) => ReturnType;
      pasteFormat: (targetRange?: { from: number; to: number }) => ReturnType;
      cancelFormatCopy: () => ReturnType;
    };
  }
}

export const FormatCopy = Extension.create<any, FormatCopyStorage>({
  name: 'formatCopy',

  addStorage() {
    return {
      active: false,
      persistent: false,
      format: null,
    };
  },

  addCommands() {
    return {
      copyFormat:
        (persistent = false) =>
        ({ state, editor }) => {
          const { from, to } = state.selection;
          const marks: StoredMark[] = [];

          const addMark = (type: string, attrs: Record<string, any>) => {
            const exists = marks.some(
              (m) => m.type === type && JSON.stringify(m.attrs) === JSON.stringify(attrs)
            );
            if (!exists) {
              marks.push({ type, attrs: { ...attrs } });
            }
          };

          if (from !== to) {
            let foundFirstText = false;
            state.doc.nodesBetween(from, to, (node) => {
              if (!node.isText) return;
              if (!foundFirstText) {
                foundFirstText = true;
                node.marks.forEach((m) => addMark(m.type.name, m.attrs));
                return false;
              }
            });
            if (!foundFirstText) {
              state.selection.$from.marks().forEach((m) => addMark(m.type.name, m.attrs));
            }
          } else {
            // Collapsed selection: read marks at current position
            state.selection.$from.marks().forEach((m) => addMark(m.type.name, m.attrs));

            const textStyleAttrs = editor.getAttributes('textStyle');
            if (textStyleAttrs && Object.keys(textStyleAttrs).length > 0) {
              addMark('textStyle', textStyleAttrs);
            }
            const highlightAttrs = editor.getAttributes('highlight');
            if (highlightAttrs && highlightAttrs.color) {
              addMark('highlight', highlightAttrs);
            }
            ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'code'].forEach((mName) => {
              if (editor.isActive(mName)) {
                addMark(mName, {});
              }
            });
          }

          // Capture parent block node attributes (alignment, line-height, heading level)
          const $from = state.doc.resolve(from);
          const parent = $from.parent;
          let nodeAttrs: StoredNodeAttrs | null = null;
          let nodeType: string | undefined = undefined;

          if (parent) {
            nodeType = parent.type.name;
            nodeAttrs = {
              textAlign: parent.attrs.textAlign || undefined,
              lineHeight: parent.attrs.lineHeight || undefined,
              level: parent.attrs.level || undefined,
            };
          }

          const textSnippet = from !== to ? state.doc.textBetween(from, to).slice(0, 30) : '';

          this.storage.format = {
            marks,
            nodeAttrs,
            nodeType,
            textSnippet,
          };
          this.storage.active = true;
          this.storage.persistent = Boolean(persistent);

          // Emit custom event for UI updates
          (editor as any).emit('formatCopyUpdate', {
            active: true,
            persistent: Boolean(persistent),
            format: this.storage.format,
          });

          return true;
        },

      pasteFormat:
        (targetRange) =>
        ({ state, dispatch, editor }) => {
          const format = this.storage.format;
          if (!format) return false;

          let from = targetRange ? targetRange.from : state.selection.from;
          let to = targetRange ? targetRange.to : state.selection.to;

          // If selection is collapsed, expand to the word at cursor
          if (from === to) {
            const $pos = state.doc.resolve(from);
            const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, '\uFFFC');
            const offset = $pos.parentOffset;

            let start = offset;
            let end = offset;
            while (start > 0 && /\S/.test(text[start - 1])) start--;
            while (end < text.length && /\S/.test(text[end])) end++;

            if (start < end) {
              from = $pos.start() + start;
              to = $pos.start() + end;
            } else {
              from = $pos.start();
              to = $pos.end();
            }
          }

          if (from >= to) {
            return false;
          }

          let tr = state.tr;

          // 1. Remove existing styling marks in range
          const stylingMarks = [
            'bold',
            'italic',
            'underline',
            'strike',
            'textStyle',
            'highlight',
            'subscript',
            'superscript',
            'code',
          ];

          stylingMarks.forEach((mName) => {
            const mType = state.schema.marks[mName];
            if (mType) {
              tr = tr.removeMark(from, to, mType);
            }
          });

          // 2. Add copied marks
          format.marks.forEach((storedMark) => {
            const markType = state.schema.marks[storedMark.type];
            if (markType) {
              const mark = markType.create(storedMark.attrs);
              tr = tr.addMark(from, to, mark);
            }
          });

          // 3. Apply paragraph/block attributes
          if (format.nodeAttrs) {
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.isBlock && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
                const currentAttrs = { ...node.attrs };
                if (format.nodeAttrs?.textAlign !== undefined) {
                  currentAttrs.textAlign = format.nodeAttrs.textAlign;
                }
                if (format.nodeAttrs?.lineHeight !== undefined) {
                  currentAttrs.lineHeight = format.nodeAttrs.lineHeight;
                }

                let targetType = node.type;
                if (format.nodeType === 'heading' && format.nodeAttrs?.level) {
                  const headingType = state.schema.nodes.heading;
                  if (headingType) {
                    targetType = headingType;
                    currentAttrs.level = format.nodeAttrs.level;
                  }
                } else if (format.nodeType === 'paragraph' && node.type.name === 'heading') {
                  const paraType = state.schema.nodes.paragraph;
                  if (paraType) {
                    targetType = paraType;
                    delete currentAttrs.level;
                  }
                }

                try {
                  tr = tr.setNodeMarkup(pos, targetType, currentAttrs);
                } catch {
                  // ignore unsupported
                }
              }
            });
          }

          if (dispatch) {
            dispatch(tr);
          }

          // Deactivate if not in persistent (double-click) mode
          if (!this.storage.persistent) {
            this.storage.active = false;
            this.storage.format = null;
          }

          (editor as any).emit('formatCopyUpdate', {
            active: this.storage.active,
            persistent: this.storage.persistent,
            format: this.storage.format,
          });

          return true;
        },

      cancelFormatCopy:
        () =>
        ({ editor }) => {
          this.storage.active = false;
          this.storage.persistent = false;
          this.storage.format = null;

          (editor as any).emit('formatCopyUpdate', {
            active: false,
            persistent: false,
            format: null,
          });

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Escape: () => {
        if (this.storage.active) {
          return this.editor.commands.cancelFormatCopy();
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('formatCopyPlugin');
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            mouseup: (view) => {
              if (!this.storage.active || !this.storage.format) {
                return false;
              }
              // Allow browser selection to complete
              setTimeout(() => {
                if (!this.storage.active || !this.storage.format) return;
                const sel = view.state.selection;
                this.editor.commands.pasteFormat({ from: sel.from, to: sel.to });
              }, 15);
              return false;
            },
          },
        },
      }),
    ];
  },
});
