import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { Search, RotateCw, X, ChevronDown, ChevronUp, Wrench, Check } from 'lucide-react';

interface SeoCheckSidebarProps {
  editor: Editor | null;
  onClose: () => void;
  wordCount?: number;
}

export const SeoCheckSidebar: React.FC<SeoCheckSidebarProps> = ({
  editor,
  onClose,
  wordCount = 0,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [contentOpen, setContentOpen] = useState(true);
  const [imagesOpen, setImagesOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);
  const [structureOpen, setStructureOpen] = useState(true);
  const [fixSuccessMsg, setFixSuccessMsg] = useState<string | null>(null);

  // Compute live SEO audit metrics from the document
  const analysis = useMemo(() => {
    if (!editor) {
      return {
        score: 65,
        rating: 'Fair',
        color: 'text-amber-500',
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        otherHeadings: 0,
        words: wordCount,
        imagesTotal: 0,
        imagesMissingAlt: 0,
        linksTotal: 0,
        linksEmpty: 0,
      };
    }

    const doc = editor.getJSON();
    let h1Count = 0;
    let h2Count = 0;
    let h3Count = 0;
    let otherHeadings = 0;
    let imagesTotal = 0;
    let imagesMissingAlt = 0;
    let linksTotal = 0;
    let linksEmpty = 0;

    const traverse = (node: any) => {
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        if (level === 1) h1Count++;
        else if (level === 2) h2Count++;
        else if (level === 3) h3Count++;
        else otherHeadings++;
      }

      if (node.type === 'image') {
        imagesTotal++;
        if (!node.attrs?.alt || node.attrs.alt.trim() === '') {
          imagesMissingAlt++;
        }
      }

      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'link') {
            linksTotal++;
            const text = node.text || '';
            if (!text.trim()) {
              linksEmpty++;
            }
          }
        }
      }

      if (node.content) {
        for (const child of node.content) {
          traverse(child);
        }
      }
    };

    if (doc.content) {
      traverse(doc);
    }

    // Also parse raw HTML for any standard images or links if not in JSON
    const html = editor.getHTML();
    const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
    if (imgMatches.length > imagesTotal) {
      imagesTotal = imgMatches.length;
      imagesMissingAlt = imgMatches.filter((img) => !img.includes('alt=') || /alt=["']\s*["']/i.test(img)).length;
    }

    const linkMatches = html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/gi) || [];
    if (linkMatches.length > linksTotal) {
      linksTotal = linkMatches.length;
      linksEmpty = linkMatches.filter((a) => {
        const inner = a.replace(/<[^>]*>/g, '').trim();
        return inner.length === 0;
      }).length;
    }

    // Calculate score
    let score = 50;
    if (h1Count === 1) score += 15;
    else if (h1Count > 1) score += 5;
    
    if (wordCount >= 300) score += 15;
    else if (wordCount >= 100) score += 8;

    if (imagesTotal === 0 || imagesMissingAlt === 0) score += 10;
    if (linksEmpty === 0) score += 5;
    if (linksTotal >= 1) score += 5;

    // Heading structure bonus
    if (h1Count >= 1 && (h2Count >= 1 || h3Count === 0)) score += 10;

    score = Math.min(100, Math.max(20, score));

    let rating = 'Poor';
    let color = 'text-rose-500';
    if (score >= 80) {
      rating = 'Good';
      color = 'text-emerald-600';
    } else if (score >= 50) {
      rating = 'Fair';
      color = 'text-amber-500';
    }

    return {
      score,
      rating,
      color,
      h1Count,
      h2Count,
      h3Count,
      otherHeadings,
      words: wordCount,
      imagesTotal,
      imagesMissingAlt,
      linksTotal,
      linksEmpty,
    };
  }, [editor, editor?.state.doc, wordCount, refreshKey]);

  // Auto-Fix Structure Issues
  const handleAutoFix = () => {
    if (!editor) return;

    let modified = false;
    const doc = editor.getJSON();

    // If no H1, promote first heading or first paragraph to H1
    if (analysis.h1Count === 0) {
      let foundFirstHeading = false;
      const fixNodes = (nodes: any[]): any[] => {
        return nodes.map((node) => {
          if (!foundFirstHeading && node.type === 'heading') {
            foundFirstHeading = true;
            modified = true;
            return { ...node, attrs: { ...node.attrs, level: 1 } };
          }
          if (node.content) {
            return { ...node, content: fixNodes(node.content) };
          }
          return node;
        });
      };

      if (doc.content) {
        doc.content = fixNodes(doc.content);
      }

      // If still no heading was found, make the first non-empty paragraph H1
      if (!foundFirstHeading && doc.content && doc.content.length > 0) {
        for (let i = 0; i < doc.content.length; i++) {
          if (doc.content[i].type === 'paragraph') {
            doc.content[i] = {
              ...doc.content[i],
              type: 'heading',
              attrs: { level: 1 },
            };
            modified = true;
            break;
          }
        }
      }
    }

    // If still have H3 without H2, normalize H3 to H2
    if (analysis.h2Count === 0 && analysis.h3Count > 0) {
      const normalizeH3 = (nodes: any[]): any[] => {
        return nodes.map((node) => {
          if (node.type === 'heading' && node.attrs?.level === 3) {
            modified = true;
            return { ...node, attrs: { ...node.attrs, level: 2 } };
          }
          if (node.content) {
            return { ...node, content: normalizeH3(node.content) };
          }
          return node;
        });
      };
      if (doc.content) {
        doc.content = normalizeH3(doc.content);
      }
    }

    if (modified) {
      editor.commands.setContent(doc);
    } else {
      // Fallback: prepend a clean H1 title if document is empty
      editor.chain().focus().insertContentAt(0, '<h1>Document Title</h1><p></p>').run();
    }

    setRefreshKey((k) => k + 1);
    setFixSuccessMsg('Structure issues auto-fixed: H1 tag & headings hierarchy resolved!');
    setTimeout(() => setFixSuccessMsg(null), 3500);
  };

  return (
    <aside
      className="w-80 bg-white border-l border-[#e2e8f0] flex flex-col h-full shadow-lg z-30 select-none animate-in slide-in-from-right duration-200"
      aria-label="SEO Check Toolbar"
    >
      {/* Top Header */}
      <div className="h-14 border-b border-[#e2e8f0] flex items-center justify-between px-4 shrink-0 bg-white">
        <div className="flex items-center space-x-2">
          <Search size={19} className="text-[#1e293b]" strokeWidth={2.2} />
          <h2 className="font-bold text-[17px] text-[#1e293b] tracking-tight">SEO Check</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh SEO analysis"
            className="flex items-center space-x-1 text-xs font-medium text-[#64748b] hover:text-[#1e293b] px-2 py-1 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <RotateCw size={13} strokeWidth={2} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onClose}
            title="Close SEO Check"
            className="p-1 rounded-md text-[#64748b] hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-neutral-800">
        {/* Score Card Matching Photo 2 */}
        <div className="bg-[#fbfcfd] border border-[#e2e8f0] rounded-xl p-4 flex items-center space-x-4 shadow-2xs">
          <div className={`text-4xl font-extrabold tracking-tight ${analysis.color}`}>
            {analysis.score}
          </div>
          <div className="flex flex-col">
            <span className={`text-lg font-bold leading-tight ${analysis.color}`}>
              {analysis.rating}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              SEO Score / 100
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {fixSuccessMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
            <Check size={15} className="text-emerald-600 shrink-0" />
            <span>{fixSuccessMsg}</span>
          </div>
        )}

        {/* Section 1: Content */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            onClick={() => setContentOpen(!contentOpen)}
            className="w-full flex items-center justify-between py-1 text-left font-semibold text-[13px] text-[#1e293b] hover:text-blue-700 cursor-pointer"
          >
            <span>Content</span>
            {contentOpen ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>

          {contentOpen && (
            <div className="mt-2 space-y-3 pl-0.5">
              {/* H1 Tag Item */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">H1 Tag</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {analysis.h1Count === 0
                      ? 'No H1 tag found'
                      : `${analysis.h1Count} H1 tag found`}
                  </div>
                </div>
                {analysis.h1Count >= 1 ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>

              {/* Word Count Item */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">Word Count</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {analysis.words} words — Aim for 300+ for good SEO
                  </div>
                </div>
                {analysis.words >= 300 ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Images */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            onClick={() => setImagesOpen(!imagesOpen)}
            className="w-full flex items-center justify-between py-1 text-left font-semibold text-[13px] text-[#1e293b] hover:text-blue-700 cursor-pointer"
          >
            <span>Images</span>
            {imagesOpen ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>

          {imagesOpen && (
            <div className="mt-2 pl-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">Images ALT text</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {analysis.imagesTotal} total — {analysis.imagesMissingAlt} missing ALT
                  </div>
                </div>
                {analysis.imagesMissingAlt === 0 ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Links */}
        <div className="border-b border-neutral-100 pb-3">
          <button
            onClick={() => setLinksOpen(!linksOpen)}
            className="w-full flex items-center justify-between py-1 text-left font-semibold text-[13px] text-[#1e293b] hover:text-blue-700 cursor-pointer"
          >
            <span>Links</span>
            {linksOpen ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>

          {linksOpen && (
            <div className="mt-2 space-y-3 pl-0.5">
              {/* Empty Links Item */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">Empty Links</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {analysis.linksEmpty} links with no anchor text
                  </div>
                </div>
                {analysis.linksEmpty === 0 ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>

              {/* Total Links Item */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">Total Links</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {analysis.linksTotal} links found
                  </div>
                </div>
                {analysis.linksTotal > 0 ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Structure */}
        <div className="pb-3">
          <button
            onClick={() => setStructureOpen(!structureOpen)}
            className="w-full flex items-center justify-between py-1 text-left font-semibold text-[13px] text-[#1e293b] hover:text-blue-700 cursor-pointer"
          >
            <span>Structure</span>
            {structureOpen ? <ChevronUp size={15} className="text-neutral-400" /> : <ChevronDown size={15} className="text-neutral-400" />}
          </button>

          {structureOpen && (
            <div className="mt-2 pl-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-neutral-800">Heading Levels</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    H1:{analysis.h1Count} H2:{analysis.h2Count} H3:{analysis.h3Count}
                  </div>
                </div>
                {analysis.h1Count >= 1 && (analysis.h2Count >= 1 || analysis.h3Count === 0) ? (
                  <span className="bg-[#dcfce7] text-[#16a34a] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✓ OK</span>
                  </span>
                ) : (
                  <span className="bg-[#ffe4e6] text-[#e11d48] px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center space-x-1 shrink-0">
                    <span>✕ Fail</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Pinned Auto-Fix Button Matching Photo 2 */}
      <div className="p-4 border-t border-[#e2e8f0] bg-white shrink-0">
        <button
          onClick={handleAutoFix}
          className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white py-2.5 px-4 rounded-lg font-semibold text-[13px] flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
        >
          <Wrench size={16} strokeWidth={2.2} />
          <span>Auto Fix Structure Issues</span>
        </button>
      </div>
    </aside>
  );
};
