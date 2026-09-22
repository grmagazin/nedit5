import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  WrapText,
  X,
  Pencil,
  Wand2,
  Trash2,
} from 'lucide-react';

interface ImageClickMenuProps {
  editor: Editor | null;
  onOpenImageWizard?: () => void;
}

export const ImageClickMenu: React.FC<ImageClickMenuProps> = ({
  editor,
  onOpenImageWizard,
}) => {
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [widthPx, setWidthPx] = useState<number>(600);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [floatWrap, setFloatWrap] = useState<'none' | 'left' | 'right'>('none');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Calculate and update menu position directly above the image
  const updatePosition = useCallback((img: HTMLImageElement) => {
    const rect = img.getBoundingClientRect();
    const menuWidth = 560; // approximate width of the floating toolbar
    const menuHeight = 44;

    // Position directly above the image
    let top = rect.top - menuHeight - 8;
    let left = rect.left + rect.width / 2 - menuWidth / 2;

    // If too close to the top of the viewport (e.g. under ribbon toolbar), position below
    if (top < 125) {
      top = rect.bottom + 10;
    }

    // Clamp left to avoid overflowing screen boundaries
    left = Math.max(16, Math.min(left, window.innerWidth - menuWidth - 16));

    setMenuPosition({ top, left });
  }, []);

  // Listen to clicks in the document & editor
  useEffect(() => {
    if (!editor) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If clicked inside our menu, don't close
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      // If clicked an image inside ProseMirror
      if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
        const img = target as HTMLImageElement;

        // Clear previous selected image outline
        if (selectedImg && selectedImg !== img) {
          selectedImg.classList.remove('selected-image-active');
          selectedImg.removeAttribute('data-selected');
        }

        // Apply blue border to current image
        img.classList.add('selected-image-active');
        img.setAttribute('data-selected', 'true');
        setSelectedImg(img);

        // Read attributes from image
        const currentWidth = img.offsetWidth || 600;
        setWidthPx(currentWidth);

        const currentAlign = (img.getAttribute('data-alignment') as 'left' | 'center' | 'right') || 'left';
        setAlignment(currentAlign);

        const currentFloat = (img.getAttribute('data-float') as 'none' | 'left' | 'right') || 'none';
        setFloatWrap(currentFloat);

        updatePosition(img);

        // Select the image node in TipTap if possible
        try {
          const pos = editor.view.posAtDOM(img, 0);
          if (pos >= 0) {
            editor.commands.setNodeSelection(pos);
          }
        } catch {
          // ignore
        }
        return;
      }

      // Clicked something else in TipTap or outside: hide menu & remove outline
      if (selectedImg) {
        selectedImg.classList.remove('selected-image-active');
        selectedImg.removeAttribute('data-selected');
        setSelectedImg(null);
        setMenuPosition(null);
      }
    };

    const handleScrollOrResize = () => {
      if (selectedImg) {
        // If image was removed from DOM, close menu
        if (!document.body.contains(selectedImg)) {
          setSelectedImg(null);
          setMenuPosition(null);
          return;
        }
        updatePosition(selectedImg);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImg) {
        selectedImg.classList.remove('selected-image-active');
        selectedImg.removeAttribute('data-selected');
        setSelectedImg(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    const handleSelectionUpdate = () => {
      // If the active selection in TipTap is no longer an image, close
      if (!editor.isActive('image') && selectedImg) {
        selectedImg.classList.remove('selected-image-active');
        selectedImg.removeAttribute('data-selected');
        setSelectedImg(null);
        setMenuPosition(null);
      }
    };
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (selectedImg) {
        selectedImg.classList.remove('selected-image-active');
        selectedImg.removeAttribute('data-selected');
      }
    };
  }, [editor, selectedImg, updatePosition]);

  if (!selectedImg || !menuPosition) {
    return null;
  }

  // Width Slider Handler
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setWidthPx(val);
    if (selectedImg) {
      selectedImg.style.width = `${val}px`;
      selectedImg.style.maxWidth = '100%';
      selectedImg.removeAttribute('width');
      selectedImg.setAttribute('data-width', `${val}px`);
      editor?.commands.updateAttributes('image', { width: `${val}px` });
      updatePosition(selectedImg);
    }
  };

  // Preset Width Percentages
  const handleSetPercentWidth = (percent: number) => {
    if (!selectedImg) return;
    selectedImg.style.width = `${percent}%`;
    selectedImg.style.maxWidth = '100%';
    selectedImg.setAttribute('data-width', `${percent}%`);
    const newPx = Math.round(selectedImg.offsetWidth);
    setWidthPx(newPx);
    editor?.commands.updateAttributes('image', { width: `${percent}%` });
    updatePosition(selectedImg);
  };

  // Maximize / Full Width
  const handleFullWidth = () => {
    if (!selectedImg) return;
    selectedImg.style.width = '100%';
    selectedImg.style.maxWidth = '100%';
    selectedImg.setAttribute('data-width', '100%');
    const newPx = Math.round(selectedImg.offsetWidth);
    setWidthPx(newPx);
    editor?.commands.updateAttributes('image', { width: '100%' });
    updatePosition(selectedImg);
  };

  // Alignment Handler
  const handleAlignment = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    setAlignment(align);
    selectedImg.setAttribute('data-alignment', align);

    if (align === 'left') {
      selectedImg.style.display = 'block';
      selectedImg.style.marginLeft = '0';
      selectedImg.style.marginRight = 'auto';
    } else if (align === 'center') {
      selectedImg.style.display = 'block';
      selectedImg.style.marginLeft = 'auto';
      selectedImg.style.marginRight = 'auto';
    } else if (align === 'right') {
      selectedImg.style.display = 'block';
      selectedImg.style.marginLeft = 'auto';
      selectedImg.style.marginRight = '0';
    }

    editor?.commands.updateAttributes('image', { alignment: align });
    updatePosition(selectedImg);
  };

  // Float / Text Wrap Handler
  const handleFloatWrap = (mode: 'none' | 'left' | 'right') => {
    if (!selectedImg) return;
    setFloatWrap(mode);
    selectedImg.setAttribute('data-float', mode);

    if (mode === 'left') {
      selectedImg.style.float = 'left';
      selectedImg.style.margin = '0.5rem 1.25rem 0.75rem 0';
      selectedImg.style.display = 'inline-block';
    } else if (mode === 'right') {
      selectedImg.style.float = 'right';
      selectedImg.style.margin = '0.5rem 0 0.75rem 1.25rem';
      selectedImg.style.display = 'inline-block';
    } else {
      selectedImg.style.float = 'none';
      selectedImg.style.margin = '0.5rem 0';
      selectedImg.style.display = 'inline-block';
    }

    editor?.commands.updateAttributes('image', { float: mode });
    updatePosition(selectedImg);
  };

  // Delete Image
  const handleDeleteImage = () => {
    if (!selectedImg) return;
    selectedImg.remove();
    setSelectedImg(null);
    setMenuPosition(null);
    editor?.commands.focus();
  };

  return (
    <div
      ref={menuRef}
      id="nedit4-image-click-menu"
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 9999,
      }}
      className="bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl px-2.5 py-1.5 flex items-center space-x-2 text-xs select-none transition-all duration-75 animate-in fade-in zoom-in-95"
    >
      {/* 1. Width Slider */}
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min={100}
          max={1200}
          step={10}
          value={widthPx}
          onChange={handleSliderChange}
          className="w-24 md:w-28 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#185abd]"
          title={`Image width: ${widthPx}px`}
        />
        <span className="text-[11px] font-mono text-neutral-600 min-w-[46px] text-right font-medium">
          {widthPx}px
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-neutral-200" />

      {/* 2. Width Presets: 25%, 50%, 75%, 100%, Expand */}
      <div className="flex items-center space-x-0.5">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleSetPercentWidth(pct)}
            className="px-1.5 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
            title={`Set width to ${pct}%`}
          >
            {pct}%
          </button>
        ))}

        <button
          onClick={handleFullWidth}
          className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer transition-colors"
          title="Expand / Full Width (100%)"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-neutral-200" />

      {/* 3. Alignment Buttons: Left, Center, Right */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => handleAlignment('left')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            alignment === 'left'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>

        <button
          onClick={() => handleAlignment('center')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            alignment === 'center'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>

        <button
          onClick={() => handleAlignment('right')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            alignment === 'right'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-neutral-200" />

      {/* 4. Text Wrap / Float Buttons: Wrap Left, Wrap Right, Inline / No Wrap */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => handleFloatWrap('left')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            floatWrap === 'left'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Float Left (Wrap text around right)"
        >
          <WrapText size={14} className="scale-x-[-1]" />
        </button>

        <button
          onClick={() => handleFloatWrap('right')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            floatWrap === 'right'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Float Right (Wrap text around left)"
        >
          <WrapText size={14} />
        </button>

        <button
          onClick={() => handleFloatWrap('none')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            floatWrap === 'none'
              ? 'bg-[#185abd] text-white shadow-xs'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
          title="Inline / Break text (No text wrap)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-neutral-200" />

      {/* 5. Quick Actions: Edit (Pencil), Filters (Wand2), Delete (Trash2) */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => onOpenImageWizard?.()}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md cursor-pointer transition-colors"
          title="Edit Image Details & Resize (Opens Image Wizard)"
        >
          <Pencil size={14} />
        </button>

        <button
          onClick={() => onOpenImageWizard?.()}
          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
          title="Image Filters & Enhancements (Image Wizard)"
        >
          <Wand2 size={14} />
        </button>

        <button
          onClick={handleDeleteImage}
          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
          title="Delete Image"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
