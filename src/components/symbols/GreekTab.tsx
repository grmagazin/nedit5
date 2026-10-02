import React from 'react';
import { SymbolGrid } from './SymbolGrid';
import { GREEK_SYMBOLS, SymbolItem } from './SymbolsData';

interface TabProps {
  onSelect: (item: SymbolItem) => void;
  onHover?: (item: SymbolItem | null) => void;
  selectedChar?: string | null;
  filterQuery?: string;
  isDark?: boolean;
}

export const GreekTab: React.FC<TabProps> = ({
  onSelect,
  onHover,
  selectedChar,
  filterQuery = '',
  isDark = false,
}) => {
  const filtered = filterQuery
    ? GREEK_SYMBOLS.filter(
        (s) =>
          s.char.includes(filterQuery) ||
          s.name.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : GREEK_SYMBOLS;

  if (filtered.length === 0) {
    return (
      <div className={`py-8 text-center text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
        No Greek symbols matching "{filterQuery}"
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

export default GreekTab;
