import React, { useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  CheckCircle2,
  X,
  Ban,
  Square,
  Grid,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
  Eraser,
  Zap,
  Check,
  ChevronDown,
} from 'lucide-react';

interface BorderEditSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  enableBorderHandle: boolean;
  onToggleEnableHandle: (enabled: boolean) => void;
}

export const BorderEditSidebar: React.FC<BorderEditSidebarProps> = ({
  editor,
  onClose,
  enableBorderHandle,
  onToggleEnableHandle,
}) => {
  // Border type selection: 'none' | 'outline' | 'inside' | 'all' | 'top' | 'bottom' | 'left' | 'right'
  const [borderType, setBorderType] = useState<string>('outline');

  // Line style: 'solid' | 'dashed' | 'dotted'
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  // Thickness: '1px' | '2px' | '3px'
  const [thickness, setThickness] = useState<string>('1px');

  // Current color
  const [color, setColor] = useState<string>('#000000');

  // Cell Background Color preview in Colors section
  const [cellColor, setCellColor] = useState<string>('#ffffff');

  // Hidden native color inputs
  const colorInputRef = useRef<HTMLInputElement>(null);
  const cellColorInputRef = useRef<HTMLInputElement>(null);

  // Palette 8 swatches matching screenshot
  const paletteColors = [
    '#000000',
    '#334155',
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea',
    '#ea580c',
    '#0d9488',
  ];

  // Helper to get active table or insert one
  const getActiveTable = (): HTMLTableElement | null => {
    if (!editor) return null;
    if (!editor.isActive('table')) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
    const proseMirrorDom = editor.view.dom;
    const tables = proseMirrorDom.querySelectorAll('table');
    if (tables.length === 0) return null;

    let targetTable = tables[tables.length - 1];
    tables.forEach((t) => {
      if (t.contains(document.activeElement) || window.getSelection()?.containsNode(t, true)) {
        targetTable = t;
      }
    });
    return targetTable;
  };

  // Helper to apply border configuration
  const applyBorders = (
    type: string,
    style: string,
    width: string,
    borderColor: string,
    isSmart: boolean = false
  ) => {
    const table = getActiveTable();
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr'));
    const borderVal = `${width} ${style} ${borderColor}`;
    const defaultBorder = '1px solid #d1d5db';

    // Remove preset borders classes if any
    table.classList.remove('borders-none', 'borders-minimal');

    if (type === 'none') {
      rows.forEach((row) => {
        Array.from(row.children).forEach((cell) => {
          (cell as HTMLElement).style.border = '1px dashed #e2e8f0';
        });
      });
      table.style.border = 'none';
      return;
    }

    if (isSmart) {
      // Smart Apply: Outer border with chosen style + soft inside grid
      table.style.border = borderVal;
      rows.forEach((row, rIdx) => {
        Array.from(row.children).forEach((cell, cIdx) => {
          const el = cell as HTMLElement;
          if (rIdx === 0) {
            el.style.borderBottom = borderVal;
          } else {
            el.style.borderBottom = `1px solid ${borderColor}40`;
          }
          if (cIdx < row.children.length - 1) {
            el.style.borderRight = `1px solid ${borderColor}40`;
          } else {
            el.style.borderRight = 'none';
          }
          el.style.borderTop = 'none';
          el.style.borderLeft = 'none';
        });
      });
      return;
    }

    if (type === 'all') {
      rows.forEach((row) => {
        Array.from(row.children).forEach((cell) => {
          (cell as HTMLElement).style.border = borderVal;
        });
      });
      table.style.border = borderVal;
      return;
    }

    if (type === 'outline') {
      table.style.border = borderVal;
      const totalRows = rows.length;
      rows.forEach((row, rIdx) => {
        const cells = Array.from(row.children);
        const totalCols = cells.length;
        cells.forEach((cell, cIdx) => {
          const el = cell as HTMLElement;
          if (rIdx === 0) el.style.borderTop = borderVal;
          if (rIdx === totalRows - 1) el.style.borderBottom = borderVal;
          if (cIdx === 0) el.style.borderLeft = borderVal;
          if (cIdx === totalCols - 1) el.style.borderRight = borderVal;
        });
      });
      return;
    }

    if (type === 'inside') {
      const totalRows = rows.length;
      rows.forEach((row, rIdx) => {
        const cells = Array.from(row.children);
        const totalCols = cells.length;
        cells.forEach((cell, cIdx) => {
          const el = cell as HTMLElement;
          // Internal horizontal border
          if (rIdx < totalRows - 1) {
            el.style.borderBottom = borderVal;
          }
          // Internal vertical border
          if (cIdx < totalCols - 1) {
            el.style.borderRight = borderVal;
          }
          if (rIdx === 0) el.style.borderTop = defaultBorder;
          if (rIdx === totalRows - 1) el.style.borderBottom = defaultBorder;
          if (cIdx === 0) el.style.borderLeft = defaultBorder;
          if (cIdx === totalCols - 1) el.style.borderRight = defaultBorder;
        });
      });
      return;
    }

    if (type === 'top') {
      table.style.borderTop = borderVal;
      if (rows.length > 0) {
        Array.from(rows[0].children).forEach((cell) => {
          (cell as HTMLElement).style.borderTop = borderVal;
        });
      }
      return;
    }

    if (type === 'bottom') {
      table.style.borderBottom = borderVal;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        Array.from(lastRow.children).forEach((cell) => {
          (cell as HTMLElement).style.borderBottom = borderVal;
        });
      }
      return;
    }

    if (type === 'left') {
      table.style.borderLeft = borderVal;
      rows.forEach((row) => {
        if (row.children.length > 0) {
          (row.children[0] as HTMLElement).style.borderLeft = borderVal;
        }
      });
      return;
    }

    if (type === 'right') {
      table.style.borderRight = borderVal;
      rows.forEach((row) => {
        if (row.children.length > 0) {
          const lastCell = row.children[row.children.length - 1];
          (lastCell as HTMLElement).style.borderRight = borderVal;
        }
      });
      return;
    }
  };

  // Clear all custom styling back to standard
  const handleClear = () => {
    const table = getActiveTable();
    if (!table) return;

    table.style.border = '';
    table.classList.remove('borders-none', 'borders-minimal');
    const cells = table.querySelectorAll('td, th');
    cells.forEach((c) => {
      const el = c as HTMLElement;
      el.style.border = '';
      el.style.borderTop = '';
      el.style.borderBottom = '';
      el.style.borderLeft = '';
      el.style.borderRight = '';
      el.style.backgroundColor = '';
    });
  };

  // Apply cell background
  const handleApplyCellColor = () => {
    if (!editor) return;
    const selection = window.getSelection();
    let cell = selection?.anchorNode as HTMLElement | null;
    while (cell && cell.tagName !== 'TD' && cell.tagName !== 'TH' && cell !== document.body) {
      cell = cell.parentElement;
    }
    if (cell && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
      cell.style.backgroundColor = cellColor;
    } else {
      const table = getActiveTable();
      if (table) {
        const activeCells = table.querySelectorAll('.selectedCell, td:focus-within, th:focus-within');
        if (activeCells.length > 0) {
          activeCells.forEach((c) => ((c as HTMLElement).style.backgroundColor = cellColor));
        } else {
          // If no specific cell focused, apply to header or first cell
          const first = table.querySelector('th, td');
          if (first) (first as HTMLElement).style.backgroundColor = cellColor;
        }
      }
    }
  };

  // Apply border color directly
  const handleApplyBorderColor = () => {
    applyBorders(borderType, lineStyle, thickness, color);
  };

  return (
    <aside
      className="w-80 bg-white border-l border-[#e2e8f0] flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200"
      aria-label="Border Edit Toolbar"
    >
      {/* 1. Header (Solid Word Blue with check icon and title) */}
      <div className="h-12 bg-[#185abd] flex items-center justify-between px-4 shrink-0 shadow-xs">
        <div className="flex items-center space-x-2 text-white">
          <CheckCircle2 size={18} strokeWidth={2.2} />
          <h2 className="font-semibold text-[15px] tracking-tight text-white">Border Edit</h2>
        </div>

        <button
          onClick={onClose}
          title="Close Border Edit"
          className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Enable Border Handle Toggle (Deactivated by default as requested) */}
      <div className="px-4 py-3 border-b border-[#e2e8f0] bg-white flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800">Enable border handle</span>
          <span className="text-[10px] text-slate-400">Auto-activate toolbar when a table is focused</span>
        </div>
        <button
          role="switch"
          aria-checked={enableBorderHandle}
          onClick={() => onToggleEnableHandle(!enableBorderHandle)}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shrink-0 ${
            enableBorderHandle ? 'bg-[#185abd]' : 'bg-slate-300'
          }`}
          title="Toggle auto activate on table focus (deactivated by default)"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
              enableBorderHandle ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 3. Scrollable Toolbar Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-700 text-xs">
        {/* TOP 8 BORDER BUTTONS (2 rows of 4) */}
        <div className="space-y-2">
          {/* Row 1: None, Outline, Inside, All */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: 'None', icon: Ban },
              { id: 'outline', label: 'Outline', icon: Square },
              { id: 'inside', label: 'Inside', icon: Grid },
              { id: 'all', label: 'All', icon: LayoutGrid },
            ].map((btn) => {
              const Icon = btn.icon;
              const isActive = borderType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setBorderType(btn.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-semibold ring-1 ring-[#2563eb]'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-[11px]">{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Top, Bottom, Left, Right */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'top', label: 'Top', icon: ArrowUp },
              { id: 'bottom', label: 'Bottom', icon: ArrowDown },
              { id: 'left', label: 'Left', icon: ArrowLeft },
              { id: 'right', label: 'Right', icon: ArrowRight },
            ].map((btn) => {
              const Icon = btn.icon;
              const isActive = borderType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setBorderType(btn.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-semibold ring-1 ring-[#2563eb]'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-[11px]">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LINE STYLE SECTION */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Line Style
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'solid', label: 'Solid' },
              { id: 'dashed', label: 'Dashed' },
              { id: 'dotted', label: 'Dotted' },
            ].map((item) => {
              const isActive = lineStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setLineStyle(item.id as any)}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-semibold ring-1 ring-[#2563eb]'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-12 h-1 mb-1.5 ${
                      item.id === 'solid'
                        ? 'bg-current'
                        : item.id === 'dashed'
                        ? 'border-b-2 border-dashed border-current'
                        : 'border-b-2 border-dotted border-current'
                    }`}
                  />
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* THICKNESS SECTION */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Thickness
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '1px', label: '1px', h: 'h-[1.5px]' },
              { id: '2px', label: '2px', h: 'h-[2.5px]' },
              { id: '3px', label: '3px', h: 'h-[3.5px]' },
            ].map((item) => {
              const isActive = thickness === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setThickness(item.id)}
                  className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#2563eb] bg-blue-50/50 text-[#2563eb] font-semibold ring-1 ring-[#2563eb]'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-12 ${item.h} bg-current mb-1.5`} />
                  <span className="text-[11px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLOR SECTION */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Color
          </div>

          {/* Row 1: 8 Color Swatches */}
          <div className="grid grid-cols-8 gap-1.5">
            {paletteColors.map((c) => {
              const isSelected = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-md border transition-transform cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[#2563eb] ring-offset-1 scale-110 border-slate-400'
                      : 'border-slate-300 hover:scale-105'
                  }`}
                  title={`Color ${c}`}
                />
              );
            })}
          </div>

          {/* Row 2: Selected preview, White, Custom Palette, Hex Code */}
          <div className="grid grid-cols-4 gap-2 items-center pt-1">
            {/* Color Preview Swatch */}
            <div
              style={{ backgroundColor: color }}
              className="h-9 rounded-lg border border-slate-300 shadow-2xs"
              title={`Selected color: ${color}`}
            />

            {/* White Swatch */}
            <button
              onClick={() => setColor('#ffffff')}
              className="h-9 rounded-lg border border-slate-300 bg-white hover:border-slate-400 cursor-pointer shadow-2xs"
              title="White"
            />

            {/* Custom Palette Picker Button */}
            <button
              onClick={() => colorInputRef.current?.click()}
              className="h-9 rounded-lg border border-slate-300 hover:border-slate-400 flex items-center justify-center bg-white text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs relative"
              title="Pick Custom Color"
            >
              <Palette size={18} />
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </button>

            {/* Hex Display Box */}
            <div className="h-9 rounded-lg border border-slate-300 flex items-center justify-center px-1 font-mono text-[11px] text-slate-700 bg-slate-50 shadow-2xs">
              {color.toUpperCase()}
            </div>
          </div>
        </div>

        {/* COLORS SECTION (Cell & Border Apply Rows) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Colors
          </div>

          {/* Cell Color Row */}
          <div className="flex items-center justify-between bg-slate-50/70 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-700 font-medium">
              <Palette size={15} className="text-slate-500" />
              <span>Cell</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => cellColorInputRef.current?.click()}
                style={{ backgroundColor: cellColor }}
                className="w-8 h-7 rounded border border-slate-300 shadow-2xs cursor-pointer relative"
                title="Change cell background color"
              >
                <input
                  ref={cellColorInputRef}
                  type="color"
                  value={cellColor}
                  onChange={(e) => setCellColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </button>
              <button
                onClick={handleApplyCellColor}
                className="py-1 px-3 bg-[#185abd] hover:bg-[#154c9e] text-white font-medium rounded text-xs cursor-pointer transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Border Color Row */}
          <div className="flex items-center justify-between bg-slate-50/70 p-2 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-700 font-medium">
              <Square size={15} className="text-slate-500" />
              <span>Border</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                style={{ backgroundColor: color }}
                className="w-8 h-7 rounded border border-slate-300 shadow-2xs"
                title={`Border color: ${color}`}
              />
              <button
                onClick={handleApplyBorderColor}
                className="py-1 px-3 bg-[#185abd] hover:bg-[#154c9e] text-white font-medium rounded text-xs cursor-pointer transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* VISUAL BORDER EDIT SECTION */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {/* Banner Button */}
          <div className="h-8 bg-[#254587] text-white font-semibold flex items-center justify-center space-x-2 rounded-md shadow-xs text-xs">
            <div className="w-3.5 h-3.5 border border-dashed border-white/80 rounded-xs" />
            <ChevronDown size={14} className="text-white/80" />
            <span>Border Edit</span>
          </div>

          {/* 8 Visual Diagram Cards (2 rows of 4) */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { id: 'none', label: 'None' },
              { id: 'outline', label: 'Outline' },
              { id: 'inside', label: 'Inside' },
              { id: 'all', label: 'All' },
              { id: 'top', label: 'Top' },
              { id: 'bottom', label: 'Bottom' },
              { id: 'left', label: 'Left' },
              { id: 'right', label: 'Right' },
            ].map((card) => {
              const isSelected = borderType === card.id;
              return (
                <button
                  key={card.id}
                  onClick={() => setBorderType(card.id)}
                  className={`p-2 rounded-lg border flex flex-col items-center justify-between transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-[#2563eb] ring-2 ring-[#2563eb] bg-blue-50/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Miniature diagram box */}
                  <div className="w-10 h-10 border border-slate-300 rounded relative flex items-center justify-center bg-white mb-1.5 overflow-hidden">
                    {card.id === 'none' && (
                      <span className="text-[10px] text-slate-300 select-none">✕</span>
                    )}
                    {card.id === 'outline' && (
                      <div className="w-8 h-8 border-2 border-slate-800" />
                    )}
                    {card.id === 'inside' && (
                      <div className="w-full h-full relative">
                        <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-slate-800 -translate-y-1/2" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-slate-800 -translate-x-1/2" />
                      </div>
                    )}
                    {card.id === 'all' && (
                      <div className="w-8 h-8 border border-slate-800 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 -translate-y-1/2" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-800 -translate-x-1/2" />
                      </div>
                    )}
                    {card.id === 'top' && (
                      <div className="absolute top-1 left-1.5 right-1.5 h-[2px] bg-slate-800" />
                    )}
                    {card.id === 'bottom' && (
                      <div className="absolute bottom-1 left-1.5 right-1.5 h-[2px] bg-slate-800" />
                    )}
                    {card.id === 'left' && (
                      <div className="absolute left-1.5 top-1.5 bottom-1.5 w-[2px] bg-slate-800" />
                    )}
                    {card.id === 'right' && (
                      <div className="absolute right-1.5 top-1.5 bottom-1.5 w-[2px] bg-slate-800" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
                      isSelected ? 'font-bold text-[#2563eb]' : 'text-slate-600'
                    }`}
                  >
                    {card.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Footer (Clear, Smart Apply, Apply) */}
      <div className="p-3 border-t border-[#e2e8f0] bg-white flex items-center space-x-2 shrink-0">
        {/* Clear Button */}
        <button
          onClick={handleClear}
          className="flex-1 py-2 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs hover:border-slate-400"
        >
          <Eraser size={14} className="text-slate-500" />
          <span>Clear</span>
        </button>

        {/* Smart Apply Button */}
        <button
          onClick={() => applyBorders(borderType, lineStyle, thickness, color, true)}
          className="flex-1 py-2 px-2 bg-[#15803d] hover:bg-[#166534] text-white font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
        >
          <Zap size={14} className="text-amber-300 fill-amber-300" />
          <span>Smart Apply</span>
        </button>

        {/* Apply Button */}
        <button
          onClick={() => applyBorders(borderType, lineStyle, thickness, color, false)}
          className="flex-1 py-2 px-2 bg-[#185abd] hover:bg-[#154c9e] text-white font-medium rounded-lg text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
        >
          <Check size={15} />
          <span>Apply</span>
        </button>
      </div>
    </aside>
  );
};
