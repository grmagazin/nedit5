import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  FileText,
  User,
  Calendar,
  FileCode,
  Tag,
  Clock,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { DocumentSettings } from '../types';

interface SmartTextInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  settings?: Partial<DocumentSettings>;
  dropdownPosition?: 'left' | 'right' | 'center';
}

export const SmartTextInput: React.FC<SmartTextInputProps> = ({
  value,
  onChange,
  placeholder = 'Add text',
  title = 'Text input',
  className = '',
  inputClassName = '',
  disabled = false,
  settings,
  dropdownPosition = 'center',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const docTitle = settings?.title || 'Document';
  const docAuthor = settings?.author || 'Alexander Morgan';
  const todayDate = new Date().toLocaleDateString();
  const filename = settings?.title
    ? settings.title.endsWith('.docx')
      ? settings.title
      : `${settings.title}.docx`
    : 'Document.docx';
  const docTag = settings?.tags || 'Personal';
  const createdDate = settings?.createdDate || todayDate;
  const updatedDate = settings?.updatedDate || todayDate;

  const smartOptions = [
    {
      id: 'title',
      label: 'Title',
      value: docTitle,
      icon: <FileText size={12} className="text-[#185abd] shrink-0" />,
    },
    {
      id: 'author',
      label: 'Author',
      value: docAuthor,
      icon: <User size={12} className="text-purple-600 shrink-0" />,
    },
    {
      id: 'date',
      label: 'Date',
      value: todayDate,
      icon: <Calendar size={12} className="text-emerald-600 shrink-0" />,
    },
    {
      id: 'filename',
      label: 'Filename',
      value: filename,
      icon: <FileCode size={12} className="text-amber-600 shrink-0" />,
    },
    {
      id: 'tag',
      label: 'Tag',
      value: docTag,
      icon: <Tag size={12} className="text-pink-600 shrink-0" />,
    },
    {
      id: 'created',
      label: 'Created',
      value: createdDate,
      icon: <Clock size={12} className="text-neutral-500 shrink-0" />,
    },
    {
      id: 'updated',
      label: 'Updated',
      value: updatedDate,
      icon: <RefreshCw size={12} className="text-cyan-600 shrink-0" />,
    },
  ];

  const handleSelectOption = (val: string) => {
    onChange(val);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getPositionClass = () => {
    switch (dropdownPosition) {
      case 'left':
        return 'left-0';
      case 'right':
        return 'right-0';
      case 'center':
      default:
        return 'left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center border border-neutral-300 bg-white hover:border-neutral-400 focus-within:border-[#185abd] focus-within:ring-1 focus-within:ring-[#185abd]/30 rounded transition-all shadow-2xs ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={title}
        className={`w-full text-xs text-neutral-800 bg-transparent px-2 py-1 outline-none text-center placeholder:text-neutral-400 font-medium truncate ${inputClassName}`}
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-1 text-neutral-400 hover:text-[#185abd] hover:bg-neutral-100 rounded-r h-full flex items-center justify-center cursor-pointer transition-colors shrink-0"
        title="Smart metadata dropdown: Title, Author, Date, Filename, Tag, Created, Updated"
      >
        <ChevronDown
          size={11}
          className={`transform transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#185abd]' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 text-xs select-none z-50 animate-in fade-in zoom-in-95 duration-100 ${getPositionClass()}`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
            Insert Smart Metadata
          </div>

          <div className="max-h-56 overflow-y-auto py-0.5">
            {smartOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.value)}
                className="w-full px-2.5 py-1.5 flex items-center space-x-2 text-left hover:bg-blue-50/80 hover:text-[#185abd] transition-colors cursor-pointer group"
              >
                {opt.icon}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 group-hover:text-[#185abd]">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-neutral-400 group-hover:text-[#185abd]/70 truncate max-w-[80px] ml-1.5">
                    {opt.value}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-neutral-100 pt-0.5 mt-0.5">
            <button
              type="button"
              onClick={() => handleSelectOption('')}
              className="w-full px-2.5 py-1.5 flex items-center space-x-2 text-left hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 size={12} className="text-neutral-400 group-hover:text-red-500 shrink-0" />
              <span className="font-medium text-[11px]">Clear (Empty)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTextInput;
