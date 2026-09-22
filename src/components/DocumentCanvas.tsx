import React, { useMemo, useState } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { DocumentSettings } from '../types';
import { InteractiveRuler } from './InteractiveRuler';
import { EditorContextMenu } from './EditorContextMenu';
import { ImageClickMenu } from './ImageClickMenu';

interface DocumentCanvasProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  editor,
  settings,
  onUpdateSettings,
}) => {
  // Page dimension calculations (standard 96 DPI screen resolution)
  const pageDimensions = useMemo(() => {
    let width = 816; // 8.5 inches * 96
    let minHeight = 1056; // 11 inches * 96

    if (settings.pageSize === 'a4') {
      width = 794;
      minHeight = 1123;
    } else if (settings.pageSize === 'legal') {
      width = 816;
      minHeight = 1344;
    }

    if (settings.orientation === 'landscape') {
      const temp = width;
      width = minHeight;
      minHeight = temp;
    }

    return { width, minHeight };
  }, [settings.pageSize, settings.orientation]);

  // Margin padding calculation in exact pixels matching ruler
  const marginPaddingStyle = useMemo(() => {
    if (settings.customMargins) {
      return {
        paddingLeft: `${Math.round(settings.customMargins.left * 96)}px`,
        paddingRight: `${Math.round(settings.customMargins.right * 96)}px`,
        paddingTop: `${Math.round((settings.customMargins.top ?? 1.0) * 96)}px`,
        paddingBottom: `${Math.round((settings.customMargins.bottom ?? 1.0) * 96)}px`,
      };
    }
    switch (settings.margins) {
      case 'narrow':
        return { padding: '48px' }; // ~0.5 inch (48px)
      case 'moderate':
        return { padding: '72px' }; // ~0.75 inch (72px)
      case 'wide':
        return { padding: '96px 144px' }; // ~1.0in top/bottom, 1.5in left/right
      case 'normal':
      default:
        return { padding: '96px' }; // ~1.0 inch (96px)
    }
  }, [settings.margins, settings.customMargins]);

  const scale = settings.zoom / 100;

  // 2-Column NEdit4 / Word Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <main
      id="word-canvas-workspace"
      onContextMenu={handleContextMenu}
      className={`flex-1 overflow-y-auto overflow-x-auto relative flex flex-col items-center py-6 px-4 transition-colors ${
        settings.isDarkMode ? 'bg-[#1a1d21]' : 'bg-[#f3f2f1]'
      }`}
      style={{
        backgroundImage: settings.showGridlines
          ? `linear-gradient(to right, ${settings.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px), linear-gradient(to bottom, ${settings.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px)`
          : undefined,
        backgroundSize: settings.showGridlines ? '24px 24px' : undefined,
      }}
    >
      {/* Container scaling wrapper */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${Math.max(0, (scale - 1) * 800)}px`,
        }}
        className="flex flex-col items-center transition-transform duration-100 ease-out"
      >
        {/* Top Interactive Ruler */}
        {settings.showRuler && (
          <div className="mb-1 rounded-t-xs overflow-hidden shadow-xs">
            <InteractiveRuler
              margins={settings.margins}
              customMargins={settings.customMargins}
              pageWidth={pageDimensions.width}
              zoom={settings.zoom}
              onUpdateMargin={(margin) => onUpdateSettings({ margins: margin })}
              onUpdateCustomMargins={(custom) =>
                onUpdateSettings({ customMargins: custom, margins: 'custom' })
              }
            />
          </div>
        )}

        {/* The Word Document Page Sheet */}
        <div
          id="word-document-page"
          className={`print-page transition-shadow duration-200 border border-neutral-300/80 rounded-[2px] relative overflow-hidden ${
            settings.showShadow !== false
              ? settings.isDarkMode
                ? 'shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
                : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'
              : 'shadow-none'
          } ${settings.viewMode === 'read' ? 'cursor-default select-text' : ''}`}
          style={{
            ...marginPaddingStyle,
            width: `${pageDimensions.width}px`,
            minHeight: `${pageDimensions.minHeight}px`,
            backgroundColor: settings.pageColor,
            color: settings.pageColor === '#1e293b' ? '#f8fafc' : '#1f2937',
          }}
          onClick={() => {
            if (settings.viewMode !== 'read' && editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          {/* Watermark Overlay if active */}
          {settings.watermark && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
              aria-hidden="true"
            >
              <span className="text-6xl md:text-7xl font-black uppercase tracking-widest text-neutral-400/20 -rotate-45 transform whitespace-nowrap">
                {settings.watermark}
              </span>
            </div>
          )}

          <div className={`relative z-10 ${settings.columns === 2 ? '[&_.ProseMirror]:columns-2 [&_.ProseMirror]:gap-8' : ''} ${
            settings.showParagraphMarks ? 'word-paragraph-marks-active' : ''
          }`}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* 2-Column NEdit4 / Word Right-Click Context Menu */}
      <EditorContextMenu
        editor={editor}
        isOpen={contextMenu.isOpen}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Image Click Menu (Auto-appears when clicking an image, hides when clicking elsewhere) */}
      <ImageClickMenu
        editor={editor}
        onOpenImageWizard={() => onUpdateSettings({ showImageWizardPane: true })}
      />
    </main>
  );
};
