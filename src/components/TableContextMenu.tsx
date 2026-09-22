import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Rows,
  Columns,
  Trash2,
  PlusCircle,
  Table as TableIcon,
  Grid,
} from 'lucide-react';

interface TableContextMenuProps {
  editor: Editor | null;
  onOpenTableEdit?: () => void;
  onOpenBorderEdit?: () => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  editor,
  onOpenTableEdit,
  onOpenBorderEdit,
}) => {
  if (!editor || !editor.isActive('table')) {
    return null;
  }

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-[#185abd]/30 shadow-xl rounded-lg px-3 py-1.5 flex items-center space-x-1 z-30 text-xs select-none no-print animate-in fade-in slide-in-from-bottom-2">
      <button
        onClick={onOpenTableEdit}
        title="Open Table Edit Right Toolbar"
        className="flex items-center space-x-1 font-semibold text-[#185abd] hover:text-blue-800 pr-2 border-r border-neutral-200 cursor-pointer"
      >
        <TableIcon size={14} />
        <span>Table Edit</span>
      </button>

      <button
        onClick={onOpenBorderEdit}
        title="Open Border Edit Right Toolbar"
        className="flex items-center space-x-1 font-semibold text-[#185abd] hover:text-blue-800 pr-2 border-r border-neutral-200 cursor-pointer"
      >
        <Grid size={14} />
        <span>Borders</span>
      </button>

      {/* Row Operations */}
      <div className="flex items-center space-x-0.5 px-1 border-r border-neutral-200">
        <button
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          title="Insert Row Above"
        >
          + Row Above
        </button>
        <button
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          title="Insert Row Below"
        >
          + Row Below
        </button>
        <button
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="px-2 py-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
          title="Delete Row"
        >
          - Row
        </button>
      </div>

      {/* Column Operations */}
      <div className="flex items-center space-x-0.5 px-1 border-r border-neutral-200">
        <button
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          title="Insert Column Left"
        >
          + Col Left
        </button>
        <button
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          title="Insert Column Right"
        >
          + Col Right
        </button>
        <button
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="px-2 py-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
          title="Delete Column"
        >
          - Col
        </button>
      </div>

      {/* Header & Delete Table */}
      <div className="flex items-center space-x-0.5 pl-1">
        <button
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          className="px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 cursor-pointer"
          title="Toggle Header Row"
        >
          Header Row
        </button>
        <button
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
          title="Delete Entire Table"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
