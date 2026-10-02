import React from 'react';
import { SymbolGrid } from './SymbolGrid';
import { MATH_SYMBOLS, SymbolItem } from './SymbolsData';

interface TabProps {
  onSelect: (item: SymbolItem) => void;
  onHover?: (item: SymbolItem | null) => void;
  selectedChar?: string | null;
  filterQuery?: string;
  isDark?: boolean;
}

export const MathTab: React.FC<TabProps> = ({
  onSelect,
  onHover,
  selectedChar,
  filterQuery = '',
  isDark = false,
}) => {
  const filtered = filterQuery
    ? MATH_SYMBOLS.filter(
        (s) =>
          s.char.includes(filterQuery) ||
          s.name.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : MATH_SYMBOLS;

  if (filtered.length === 0) {
    return (
      <div className={`py-8 text-center text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
        No mathematical symbols matching "{filterQuery}"
      </div>
    );
  }

  return (
    <SymbolGrid
      items={filtered}
      selectedChar={selectedChar}
      onSelect={onSelect}
      onHover={onHover}
      isDark={isDark}
    />
  );
};

export default MathTab;
