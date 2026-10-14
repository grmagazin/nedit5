import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Target,
  Heading,
  Link as LinkIcon,
  Image as ImageIcon,
  BookOpen,
  Zap,
  BarChart3,
  SearchCheck,
} from 'lucide-react';
import { DocumentSettings } from '../../../types';

const KeywordDensityModal = React.lazy(() => import('../../modals/KeywordDensityModal'));

export interface SeoTabProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (newSettings: Partial<DocumentSettings>) => void;
  isDarkUi?: boolean;
  onNotify?: (msg: string) => void;
}

export const SeoTab: React.FC<SeoTabProps> = ({
  editor,
  settings,
  onUpdateSettings,
  isDarkUi = false,
  onNotify,
}) => {
  const [showKeywordModal, setShowKeywordModal] = useState(false);

  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // 1. Keywords
  const handleSeoKeywords = () => {
    setShowKeywordModal(true);
  };

  // 2. Headings
  const handleSeoHeadings = () => {
    if (!editor) return;
    const json = editor.getJSON();
    let h1 = 0;
    let h2 = 0;
    let h3 = 0;
    const traverse = (node: any) => {
      if (node.type === 'heading') {
        if (node.attrs?.level === 1) h1++;
        else if (node.attrs?.level === 2) h2++;
        else if (node.attrs?.level === 3) h3++;
      }
      if (node.content) node.content.forEach(traverse);
    };
    if (json.content) json.content.forEach(traverse);

    let status = '';
    if (h1 === 0) status = 'Warning: Missing H1 tag (essential for SEO ranking).';
    else if (h1 > 1) status = `Notice: ${h1} H1 tags found (search engines prefer 1 H1).`;
    else status = `Optimal: 1 H1 title, ${h2} H2, and ${h3} H3 headings.`;

    notify(`Headings Audit: ${status}`);
    onUpdateSettings({ showSeoPane: true });
  };

  // 3. Links
  const handleSeoLinks = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const links = html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/gi) || [];
    const emptyLinks = links.filter((a) => a.replace(/<[^>]*>/g, '').trim().length === 0);

    let msg = '';
    if (links.length === 0) msg = 'Links Audit: No links detected. Consider linking to authoritative sources.';
    else if (emptyLinks.length > 0) msg = `Links Audit: ${links.length} links found (${emptyLinks.length} empty anchor text).`;
    else msg = `Links Audit: ${links.length} links found with valid anchor text.`;

    notify(msg);
    onUpdateSettings({ showSeoPane: true });
  };

  // 4. Images
  const handleSeoImages = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const images = html.match(/<img\b[^>]*>/gi) || [];
    const missingAlt = images.filter((img) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img));

    let msg = '';
    if (images.length === 0) msg = 'Images Audit: No images found. Rich media improves user engagement.';
    else if (missingAlt.length > 0) msg = `Images Audit: ${missingAlt.length} of ${images.length} images are missing ALT text description.`;
    else msg = `Images Audit: All ${images.length} images have ALT descriptions.`;

    notify(msg);
    onUpdateSettings({ showSeoPane: true });
  };

  // 5. Readability
  const handleSeoReadability = () => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) {
      notify('Readability: Document is empty.');
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const syllables = words.reduce((acc, w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, '');
      const count = clean.replace(/(?:[^laeiouy]|ed|es|e)$/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
      return acc + count;
    }, 0);

    const totalWords = Math.max(1, words.length);
    const totalSentences = Math.max(1, sentences.length);
    const flesch = Math.round(206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (syllables / totalWords));
    const score = Math.max(0, Math.min(100, flesch));

    let grade = 'Standard';
    if (score >= 90) grade = 'Very Easy (5th grade)';
    else if (score >= 80) grade = 'Easy (6th grade)';
    else if (score >= 70) grade = 'Fairly Easy (7th grade)';
    else if (score >= 60) grade = 'Standard (8th-9th grade)';
    else if (score >= 50) grade = 'Fairly Difficult (High School)';
    else if (score >= 30) grade = 'Difficult (College)';
    else grade = 'Very Confusing (Professional/Academic)';

    notify(`Readability Score: ${score}/100 — ${grade} (${Math.round(totalWords / totalSentences)} words/sentence)`);
    onUpdateSettings({ showSeoPane: true });
  };

  // 6. Optimize
  const handleSeoOptimize = () => {
    if (!editor) return;
    let modified = false;
    const doc = editor.getJSON();

    const checkH1 = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 1) return true;
        if (node.content && checkH1(node.content)) return true;
      }
      return false;
    };

    const hasH1 = doc.content ? checkH1(doc.content) : false;
    if (!hasH1 && doc.content && doc.content.length > 0) {
      for (let i = 0; i < doc.content.length; i++) {
        if (doc.content[i].type === 'paragraph' && doc.content[i].content) {
          doc.content[i].type = 'heading';
          doc.content[i].attrs = { level: 1 };
          modified = true;
          break;
        }
      }
    }

    if (modified) {
      editor.commands.setContent(doc);
      notify('SEO Auto-Optimize: Promoted first paragraph to H1 heading title.');
    } else {
      notify('SEO Structure: Headings hierarchy is already valid.');
    }
    onUpdateSettings({ showSeoPane: true });
  };

  // 7. Toggle right sidebar
  const handleToggleSeoCheck = () => {
    onUpdateSettings({ showSeoPane: !settings.showSeoPane });
  };

  return (
    <div className="flex items-start space-x-0 w-full select-none pt-0.5 animate-in fade-in duration-150">
      {/* GROUP 1: SEO Tools (Keywords, Headings, Links, Images, Readability, Optimize) */}
      <div className="flex flex-col items-center pr-3">
        <div className="flex items-start space-x-1.5">
          {/* 1. Keywords */}
          <button
            onClick={handleSeoKeywords}
            title="Keywords — Focus keyword density & frequency"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <Target size={20} className="text-[#db2777]" />
          </button>

          {/* 2. Headings */}
          <button
            onClick={handleSeoHeadings}
            title="Headings — Inspect H1, H2, H3 hierarchy"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <Heading size={20} className="text-[#334155]" />
          </button>

          {/* 3. Links */}
          <button
            onClick={handleSeoLinks}
            title="Links — Check anchor text & link health"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <LinkIcon size={20} className="text-[#334155]" />
          </button>

          {/* 4. Images */}
          <button
            onClick={handleSeoImages}
            title="Images — Audit missing ALT text attributes"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <ImageIcon size={20} className="text-[#334155]" />
          </button>

          {/* 5. Readability */}
          <button
            onClick={handleSeoReadability}
            title="Readability — Flesch reading ease & grade score"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <BookOpen size={20} className="text-[#334155]" />
          </button>

          {/* 6. Optimize */}
          <button
            onClick={handleSeoOptimize}
            title="Optimize — Auto-fix heading hierarchy & tags"
            className="p-2 rounded-lg border border-transparent hover:bg-white hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer transition-all flex items-center justify-center min-w-[34px] min-h-[34px]"
          >
            <Zap size={20} className="text-[#f59e0b]" />
          </button>
        </div>

        {/* Centered Footer Label */}
        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          Audit &amp; Optimize
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mr-3 shrink-0 self-start mt-0.5" />

      {/* GROUP 2: Analyze SEO Check Button (Toggles Right Toolbar) */}
      <div className="flex flex-col items-center pr-3">
        <div className="flex items-start space-x-1.5">
          <button
            onClick={handleToggleSeoCheck}
            title="Analyze SEO Check — Open/Close Right Toolbar"
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              settings.showSeoPane
                ? isDarkUi
                  ? 'bg-[#1e3a5f] border-[#0078d4] text-[#60a5fa] shadow-2xs font-semibold'
                  : 'bg-[#e0e7ff] border-[#6366f1] text-[#3730a3] shadow-2xs font-semibold'
                : isDarkUi
                ? 'bg-[#282828] hover:bg-[#333333] border-[#404040] hover:border-neutral-500 text-neutral-200'
                : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <BarChart3
              size={18}
              className={
                settings.showSeoPane
                  ? isDarkUi
                    ? 'text-[#60a5fa]'
                    : 'text-[#4f46e5]'
                  : isDarkUi
                  ? 'text-neutral-300'
                  : 'text-[#185abd]'
              }
            />
            <span className="text-xs font-semibold">Analyze SEO Check</span>
            {settings.showSeoPane && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Centered Footer Label */}
        <span
          className={`text-[11px] text-center font-normal mt-1.5 tracking-normal ${
            isDarkUi ? 'text-neutral-400' : 'text-[#2563eb]'
          }`}
        >
          SEO Check
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mx-3 shrink-0 self-start mt-0.5" />

      {/* Quick Summary Pill */}
      <div className="flex flex-col items-center pr-3">
        <div className="flex items-start space-x-2">
          <div
            className={`px-2.5 py-1 rounded border text-xs ${
              isDarkUi
                ? 'bg-[#282828] border-[#404040] text-neutral-200'
                : 'bg-white border-neutral-300'
            }`}
          >
            <span className="text-[9px] text-neutral-400 uppercase block">Headings</span>
            <span className={`font-bold ${isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]'}`}>
              {editor?.getJSON().content?.filter((n: any) => n.type === 'heading').length || 0} Found
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ showSeoPane: true })}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded border cursor-pointer flex items-center space-x-1 transition-colors ${
              isDarkUi
                ? 'bg-[#1e3a5f] hover:bg-[#2563eb]/40 border-[#0078d4] text-white'
                : 'bg-[#f0f4f9] hover:bg-[#e2ebf6] text-neutral-800 border-neutral-300'
            }`}
          >
            <SearchCheck size={14} className={isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]'} />
            <span>Quick Audit</span>
          </button>
        </div>
        <span className="text-[10px] text-center text-neutral-400 font-normal mt-1.5 tracking-normal">
          Summary
        </span>
      </div>

      {/* SEO Keyword Density Modal */}
      {showKeywordModal && (
        <React.Suspense fallback={null}>
          <KeywordDensityModal
            isOpen={showKeywordModal}
            onClose={() => {
              setShowKeywordModal(false);
              editor?.commands.focus();
            }}
            editor={editor}
            onOpenFullSeo={() => onUpdateSettings({ showSeoPane: true })}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default SeoTab;
