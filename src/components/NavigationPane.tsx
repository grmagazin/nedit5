import React, { useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { X, Search, FileText, List, Layers, ChevronRight } from 'lucide-react';

interface NavigationPaneProps {
  editor: Editor | null;
  onClose: () => void;
  wordCount?: number;
}

export const NavigationPane: React.FC<NavigationPaneProps> = ({
  editor,
  onClose,
  wordCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'headings' | 'pages' | 'search'>('headings');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract headings from editor content
  const headings = useMemo(() => {
    if (!editor) return [];
    const doc = editor.getJSON();
    const items: { text: string; level: number; pos: number }[] = [];

    let currentPos = 0;
    const traverse = (node: any) => {
      if (node.type === 'heading' && node.content) {
        const text = node.content.map((c: any) => c.text || '').join('');
        if (text.trim()) {
          items.push({
            text: text.trim(),
            level: node.attrs?.level || 1,
            pos: currentPos,
          });
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
    return items;
  }, [editor?.state.doc]);

  // Search results
  const searchResults = useMemo(() => {
    if (!editor || !searchQuery.trim()) return [];
    const fullText = editor.getText();
    const query = searchQuery.toLowerCase();
    const results: { snippet: string; index: number }[] = [];
    
    let startIndex = 0;
    while (startIndex < fullText.length) {
      const matchIndex = fullText.toLowerCase().indexOf(query, startIndex);
      if (matchIndex === -1) break;

      const snippetStart = Math.max(0, matchIndex - 20);
      const snippetEnd = Math.min(fullText.length, matchIndex + query.length + 30);
      const snippet = (snippetStart > 0 ? '...' : '') + 
        fullText.substring(snippetStart, snippetEnd) + 
        (snippetEnd < fullText.length ? '...' : '');

      results.push({ snippet, index: matchIndex });
      startIndex = matchIndex + Math.max(1, query.length);
      if (results.length >= 25) break; // limit
    }
    return results;
  }, [editor?.state.doc, searchQuery]);

  const handleHeadingClick = (headingText: string) => {
    if (!editor) return;
    const doc = editor.state.doc;
    let foundPos = -1;
    doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && node.textContent.includes(headingText)) {
        foundPos = pos;
        return false;
      }
    });

    if (foundPos !== -1) {
      editor.commands.setTextSelection(foundPos + 1);
      // scroll into view
      const domNode = editor.view.nodeDOM(foundPos);
      if (domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <aside
      id="word-navigation-pane"
      className="w-72 bg-white border-r border-neutral-200 flex flex-col h-full shadow-xs z-20 shrink-0 select-none animate-in slide-in-from-left-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 border-b border-neutral-200">
        <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">Navigation</span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700 p-1 rounded hover:bg-neutral-200 cursor-pointer transition-colors"
          title="Close Navigation Pane"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-100/60 text-xs">
        <button
          onClick={() => setActiveTab('headings')}
          className={`flex-1 py-2 text-center font-medium transition-colors cursor-pointer border-b-2 ${
            activeTab === 'headings'
              ? 'border-[#185abd] text-[#185abd] bg-white font-semibold'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Headings
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 py-2 text-center font-medium transition-colors cursor-pointer border-b-2 ${
            activeTab === 'pages'
              ? 'border-[#185abd] text-[#185abd] bg-white font-semibold'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Pages
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-center font-medium transition-colors cursor-pointer border-b-2 ${
            activeTab === 'search'
              ? 'border-[#185abd] text-[#185abd] bg-white font-semibold'
              : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Results
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'headings' && (
          <div className="space-y-1">
            {headings.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                <List size={28} className="mx-auto mb-2 text-neutral-300" />
                <p className="font-medium text-neutral-500">No Headings in Document</p>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Add Headings (Heading 1, 2, 3) to create a structured outline.
                </p>
              </div>
            ) : (
              headings.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleHeadingClick(h.text)}
                  className={`w-full text-left py-1 px-2 rounded text-xs transition-colors cursor-pointer flex items-center group hover:bg-blue-50 text-neutral-700 hover:text-[#185abd] ${
                    h.level === 1 ? 'font-bold' : h.level === 2 ? 'pl-4 font-medium' : 'pl-7 text-neutral-500'
                  }`}
                >
                  <ChevronRight size={12} className="mr-1 text-neutral-400 group-hover:text-[#185abd] shrink-0" />
                  <span className="truncate">{h.text}</span>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="p-2 space-y-3">
            <div className="border border-neutral-200 rounded p-3 bg-neutral-50 flex items-center space-x-3 shadow-2xs">
              <div className="w-12 h-16 bg-white border border-neutral-300 rounded shadow-xs flex flex-col items-center justify-center p-1 text-[8px] text-neutral-400 font-mono">
                <div className="w-full h-1.5 bg-neutral-200 mb-1 rounded-xs" />
                <div className="w-full h-1 bg-neutral-100 mb-0.5" />
                <div className="w-full h-1 bg-neutral-100 mb-0.5" />
                <div className="w-3/4 h-1 bg-neutral-100 self-start" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-neutral-800">Page 1</div>
                <div className="text-[11px] text-neutral-500">{wordCount} words active</div>
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5">● Current Page</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in document..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#185abd]"
                autoFocus
              />
            </div>

            {searchQuery.trim() && (
              <div className="text-[11px] text-neutral-500 font-medium px-1">
                {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} found
              </div>
            )}

            <div className="space-y-1.5">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (editor) {
                      editor.commands.setTextSelection({ from: res.index + 1, to: res.index + searchQuery.length + 1 });
                    }
                  }}
                  className="w-full text-left p-2 rounded border border-neutral-200 hover:border-[#185abd] hover:bg-blue-50/50 transition-colors text-xs text-neutral-700 cursor-pointer"
                >
                  <p className="line-clamp-2 leading-tight">{res.snippet}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
