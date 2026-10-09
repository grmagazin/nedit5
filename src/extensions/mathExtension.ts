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
        'tiptap-math-inline inline-flex items-center align-middle mx-0.5 px-0.5 py-0 rounded-xs cursor-pointer transition-colors text-inherit hover:bg-sky-500/10 hover:underline hover:decoration-dotted hover:decoration-sky-500/60 select-none no-underline print:p-0 print:m-0 print:border-0 print:bg-transparent print:shadow-none print:text-black';
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
        'tiptap-math-block my-2.5 py-1 px-2 text-center cursor-pointer transition-colors text-inherit hover:bg-indigo-500/10 rounded-md select-none overflow-x-auto print:p-0 print:m-0 print:border-0 print:bg-transparent print:shadow-none print:text-black';
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
