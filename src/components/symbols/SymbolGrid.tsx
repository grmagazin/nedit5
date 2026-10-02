import React from 'react';
import { SymbolItem } from './SymbolsData';

interface SymbolGridProps {
  items: SymbolItem[];
  selectedChar?: string | null;
  onSelect: (item: SymbolItem) => void;
  onHover?: (item: SymbolItem | null) => void;
  isDark?: boolean;
}

export const SymbolGrid: React.FC<SymbolGridProps> = ({
  items,
  selectedChar,
  onSelect,
  onHover,
  isDark = false,
}) => {
  return (
    <div className="grid grid-cols-10 gap-2 p-1 select-none">
      {items.map((item) => {
        const isSelected = selectedChar === item.char;
        return (
          <button
            key={item.char + item.name}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHover?.(item)}
            onFocus={() => onHover?.(item)}
            title={`${item.name} ${item.code ? `(${item.code})` : ''}`}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border text-base sm:text-lg flex items-center justify-center transition-colors cursor-pointer font-medium leading-none ${
              isSelected
                ? isDark
                  ? 'border-blue-500 bg-blue-950/70 text-blue-300 ring-2 ring-blue-500/50 font-bold shadow-2xs'
                  : 'border-[#185abd] bg-blue-50/80 text-blue-900 ring-2 ring-[#185abd]/30 font-bold shadow-2xs'
                : isDark
                ? 'border-neutral-700 bg-neutral-800 text-neutral-100 hover:border-blue-400 hover:bg-neutral-700 hover:text-blue-300'
                : 'border-neutral-200 bg-white text-neutral-800 hover:border-[#185abd] hover:bg-blue-50/60 hover:text-[#185abd]'
            }`}
          >
            {item.char}
          </button>
        );
      })}
    </div>
  );
};

export default SymbolGrid;
