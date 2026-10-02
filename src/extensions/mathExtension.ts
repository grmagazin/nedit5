import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex: string) => ReturnType;
    };
    mathBlock: {
      insertMathBlock: (latex: string) => ReturnType;
    };
  }
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
      },
      {
        tag: 'span.tiptap-math-inline',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math-inline',
        class: 'tiptap-math-inline',
      }),
      HTMLAttributes['data-latex'] || '',
    ];
  },

  addCommands() {
    return {
      insertMathInline:
        (latex: string) =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContent([
              {
                type: this.name,
                attrs: { latex },
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('span');
      dom.className =
        'tiptap-math-inline inline-flex items-center align-middle mx-1 px-1.5 py-0.5 rounded cursor-pointer transition-all border border-sky-300/80 bg-sky-50/70 hover:bg-sky-100 dark:bg-sky-950/40 dark:border-sky-700 text-neutral-900 dark:text-neutral-100 hover:ring-2 hover:ring-sky-400 select-none';
      dom.title = `Equation: ${node.attrs.latex} (Click to edit in Fx Wizard)`;

      const render = () => {
        const latex = node.attrs.latex || '';
        try {
          dom.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          dom.textContent = latex;
        }
      };

      render();

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent('open-fx-wizard', {
            detail: { latex: node.attrs.latex, isBlock: false, pos: getPos() },
          })
        );
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== node.type.name) return false;
          if (updatedNode.attrs.latex !== node.attrs.latex) {
            node = updatedNode;
            render();
          }
          return true;
        },
      };
    };
  },
});

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
      {
        tag: 'div.tiptap-math-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'math-block',
        class: 'tiptap-math-block',
      }),
      HTMLAttributes['data-latex'] || '',
    ];
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex: string) =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { latex },
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className =
        'tiptap-math-block my-3 py-3 px-4 rounded-xl cursor-pointer transition-all border border-indigo-200/90 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-800 text-center hover:ring-2 hover:ring-indigo-400 select-none overflow-x-auto';
      dom.title = `Math Block: ${node.attrs.latex} (Click to edit in Fx Wizard)`;

      const render = () => {
        const latex = node.attrs.latex || '';
        try {
          dom.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
          });
        } catch {
          dom.textContent = latex;
        }
      };

      render();

      dom.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent('open-fx-wizard', {
            detail: { latex: node.attrs.latex, isBlock: true, pos: getPos() },
          })
        );
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== node.type.name) return false;
          if (updatedNode.attrs.latex !== node.attrs.latex) {
            node = updatedNode;
            render();
          }
          return true;
        },
      };
    };
  },
});
