import React from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Sparkles, X, Calculator, Image as ImageIcon, Volume2, FileText, Check } from 'lucide-react';

export interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 word-modal-backdrop"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 w-full max-w-xl text-neutral-800 dark:text-neutral-100 animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2 text-[#185abd] dark:text-blue-400">
            <BookOpen size={20} />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              Nedit v5.5 Quick Guide &amp; Feature Walkthrough
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs text-neutral-700 dark:text-neutral-300 pr-1">
          {/* Feature 1: Table Tools & Smart Math */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg">
            <div className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Calculator size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Table Tools &amp; Smart Math (v5.5)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold px-1.5 py-0.2 rounded">
                New v5.5
              </span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed text-[11px]">
              In the <strong>Table</strong> tab, click <strong>Tools</strong> to open the modular right toolbar. Calculate cell selections in 1 click (SUM, AVG, MIN, MAX, COUNT, PRODUCT) with <code>&rarr; RIGHT</code> or <code>&darr; DOWN</code>. Use the green <strong>Smart Sort (Selected Area)</strong> button to sort only highlighted cells (A–Z / Z–A) while strictly preserving outside rows, headers, and totals.
            </p>
          </div>

          {/* Feature 2: Image Wizard & Responsive Engine */}
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg">
            <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <ImageIcon size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Image Wizard &amp; Responsive Engine (v5.5)</span>
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold px-1.5 py-0.2 rounded">
                New v5.5
              </span>
            </div>
            <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-[11px]">
              Open the <strong>Image Wizard</strong> from the Insert tab or by clicking an image. Click <strong>&ldquo;Make image responsive [save]&rdquo;</strong> to automatically configure 100% fluid mobile width and auto-height. You can also re-encode to 600–1600px, compress to WebP/JPG/PNG, instantly save Alt Text (SEO), or snip document screenshots.
            </p>
          </div>

          {/* Feature 3: TTS Document Read Aloud */}
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-lg">
            <div className="font-semibold text-teal-900 dark:text-teal-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Volume2 size={14} className="text-teal-600 dark:text-teal-400" />
                <span>Document Read Aloud (TTS Voice Narration) (v5.5)</span>
              </span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold px-1.5 py-0.2 rounded">
                New v5.5
              </span>
            </div>
            <p className="text-teal-800 dark:text-teal-200 leading-relaxed text-[11px]">
              In the <strong>Help</strong> tab under Document Read, click <strong>Read Aloud</strong> to listen to selected paragraphs or the entire document. Adjust reading speed from 0.5x to 2.0x, choose from all system/browser voice models, and follow along with real-time sentence tracking.
            </p>
          </div>

          {/* Feature 4: AI Writing Assistant */}
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-lg">
            <div className="font-semibold text-purple-900 dark:text-purple-300 mb-1 flex items-center space-x-1.5">
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              <span>AI Writing Assistant &amp; Image Studio</span>
            </div>
            <p className="text-purple-800 dark:text-purple-200 leading-relaxed text-[11px]">
              Click the <strong>AI Assistant</strong> button in the Help or Review tab to open the smart writing assistant. Powered by Gemini, you can summarize selections, improve writing flow, check spelling/grammar, generate custom illustrations, and translate text.
            </p>
          </div>

          {/* Feature 5: Full-Fidelity Export */}
          <div className="p-3 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg">
            <div className="font-semibold text-slate-800 dark:text-neutral-200 mb-1 flex items-center space-x-1.5">
              <FileText size={14} className="text-slate-500" />
              <span>Full-Fidelity File Export &amp; Security</span>
            </div>
            <p className="text-slate-600 dark:text-neutral-300 leading-relaxed text-[11px]">
              Under <strong>File &rarr; Save As</strong> or Backstage, export to authentic Microsoft Word (<code>.docx</code>), OpenDocument (<code>.odt</code>), vector PDF, HTML+Images (ZIP), or Markdown. Operating 100% client-side with IndexedDB continuous autosave and Version History rollbacks.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] text-white rounded font-medium cursor-pointer transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QuickGuideModal;
