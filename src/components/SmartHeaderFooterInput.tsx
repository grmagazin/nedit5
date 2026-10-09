import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  FileText,
  User,
  Calendar,
  FileCode,
  Tag as TagIcon,
  Clock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export interface SmartDocValues {
  title?: string;
  author?: string;
  date?: string;
  filename?: string;
  tag?: string;
  created?: string;
  updated?: string;
}

interface SmartHeaderFooterInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  inputClassName?: string;
  dropdownAlign?: 'left' | 'right';
  smartValues?: SmartDocValues;
  disabled?: boolean;
}

/**
 * Resolves smart dynamic tokens if written into the text (e.g., {title}, {date})
 */
export function resolveSmartText(text: string, values?: SmartDocValues): string {
  if (!text) return '';
  const now = new Date();
  const dateStr = values?.date || now.toLocaleDateString();
  const titleStr = values?.title || '';
  const authorStr = values?.author || '';
  const filenameStr = values?.filename || `${(titleStr || 'Document').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}.docx`;
  const tagStr = values?.tag || 'General';
  const createdStr = values?.created || dateStr;
  const updatedStr = values?.updated || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return text
    .replace(/\{title\}|\{Title\}/g, titleStr)
    .replace(/\{author\}|\{Author\}/g, authorStr)
    .replace(/\{date\}|\{Date\}/g, dateStr)
    .replace(/\{filename\}|\{Filename\}/g, filenameStr)
    .replace(/\{tag\}|\{Tag\}/g, tagStr)
    .replace(/\{created\}|\{Created\}/g, createdStr)
    .replace(/\{updated\}|\{Updated\}/g, updatedStr);
}

export const SmartHeaderFooterInput: React.FC<SmartHeaderFooterInputProps> = ({
  value,
  onChange,
  placeholder = 'Header / Footer Text',
  title = 'Header / Footer Text',
  className = '',
  inputClassName = '',
  dropdownAlign = 'left',
  smartValues,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute fallback values if not provided
  const now = new Date();
  const todayFormatted = now.toLocaleDateString();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const resolvedValues: Required<SmartDocValues> = {
    title: smartValues?.title?.trim() || 'Document Title',
    author: smartValues?.author?.trim() || 'Author Name',
    date: smartValues?.date?.trim() || todayFormatted,
    filename:
      smartValues?.filename?.trim() ||
      `${(smartValues?.title?.trim() || 'Document').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}.docx`,
    tag: smartValues?.tag?.trim() || 'Draft',
    created: smartValues?.created?.trim() || todayFormatted,
    updated: smartValues?.updated?.trim() || timeFormatted,
  };

  const menuItems = [
    {
      id: 'title',
      label: 'Title',
      token: '{title}',
      value: resolvedValues.title,
      icon: <FileText size={13} className="text-blue-600 shrink-0" />,
    },
    {
      id: 'author',
      label: 'Author',
      token: '{author}',
      value: resolvedValues.author,
      icon: <User size={13} className="text-emerald-600 shrink-0" />,
    },
    {
      id: 'date',
      label: 'Date',
      token: '{date}',
      value: resolvedValues.date,
      icon: <Calendar size={13} className="text-amber-600 shrink-0" />,
    },
    {
      id: 'filename',
      label: 'Filename',
      token: '{filename}',
      value: resolvedValues.filename,
      icon: <FileCode size={13} className="text-indigo-600 shrink-0" />,
    },
    {
      id: 'tag',
      label: 'Tag',
      token: '{tag}',
      value: resolvedValues.tag,
      icon: <TagIcon size={13} className="text-purple-600 shrink-0" />,
    },
    {
      id: 'created',
      label: 'Created',
      token: '{created}',
      value: resolvedValues.created,
      icon: <Clock size={13} className="text-teal-600 shrink-0" />,
    },
    {
      id: 'updated',
      label: 'Updated',
      token: '{updated}',
      value: resolvedValues.updated,
      icon: <RefreshCw size={13} className="text-rose-600 shrink-0" />,
    },
  ];

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectItem = (itemVal: string) => {
    onChange(itemVal);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Free Text Input: User can type anything freely */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full text-xs font-medium text-neutral-800 placeholder:text-neutral-400 bg-white border border-neutral-300 rounded px-2 pr-6 py-1 focus:outline-none focus:border-[#185abd] hover:border-neutral-400 shadow-2xs transition-colors truncate ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${inputClassName}`}
        title={title}
      />

      {/* Smart Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`absolute right-1 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#185abd] hover:bg-neutral-100 p-0.5 rounded cursor-pointer transition-colors ${
          isOpen ? 'text-[#185abd] bg-blue-50' : ''
        }`}
        title="Quick Insert Smart Field (Title, Author, Date, Filename, Tag, Created, Updated)"
      >
        <ChevronDown size={12} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Smart Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-1 w-52 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 text-left text-xs ${
            dropdownAlign === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          <div className="px-2.5 py-1 border-b border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-semibold uppercase tracking-wider bg-neutral-50/70">
            <span className="flex items-center gap-1 text-[#185abd]">
              <Sparkles size={10} /> Smart Insert
            </span>
            <span>Free Text</span>
          </div>

          <div className="py-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectItem(item.value)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-blue-50/70 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-colors group"
              >
                <div className="flex items-center space-x-2 truncate pr-1">
                  {item.icon}
                  <div className="flex flex-col text-left truncate">
                    <span className="font-semibold text-[11px] leading-tight text-neutral-800 group-hover:text-[#185abd]">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-neutral-400 truncate max-w-[125px]">
                      {item.value}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-neutral-400 font-mono shrink-0 bg-neutral-100 group-hover:bg-blue-100/70 px-1 py-0.5 rounded">
                  insert
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-neutral-100 px-2 py-1 bg-neutral-50/60 flex items-center justify-between text-[10px] text-neutral-500">
            <button
              type="button"
              onClick={() => handleSelectItem('')}
              className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
            >
              Clear
            </button>
            <span className="text-neutral-400 italic">or type directly</span>
          </div>
        </div>
      )}
    </div>
  );
};
