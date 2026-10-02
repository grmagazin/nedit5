import React, { useState } from 'react';
import {
  Info,
  X,
  Zap,
  Keyboard,
  Cpu,
  Terminal,
  BookOpen,
  Sparkles,
  Ruler,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  Search,
} from 'lucide-react';

export type AboutTab =
  | 'futures'
  | 'sortcuts'
  | 'tecnologies'
  | 'tec info'
  | 'starting gide'
  | 'smart training'
  | 'ruler tutorrial';

interface AboutSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AboutTab;
}

interface TabConfig {
  id: AboutTab;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'futures',
    label: 'Features',
    badge: 'v5.1',
    icon: Zap,
    description: 'Complete breakdown of Nedit v5.1 capabilities & ecosystem',
  },
  {
    id: 'sortcuts',
    label: 'Shortcuts',
    badge: 'Cheat Sheet',
    icon: Keyboard,
    description: 'Comprehensive keyboard & mouse shortcuts for rapid workflow',
  },
  {
    id: 'tecnologies',
    label: 'Technologies',
    badge: 'Stack',
    icon: Cpu,
    description: 'OpenXML, ProseMirror, TipTap, and modern web engines',
  },
  {
    id: 'tec info',
    label: 'Tech Info',
    badge: 'Architecture',
    icon: Terminal,
    description: '100% client-side sandbox, memory, and performance specs',
  },
  {
    id: 'starting gide',
    label: 'Starting Guide',
    badge: 'Onboarding',
    icon: BookOpen,
    description: '5-step quickstart workflow from blank page to finished export',
  },
  {
    id: 'smart training',
    label: 'Smart Training',
    badge: 'Pro Tips',
    icon: Sparkles,
    description: 'Format painter, table manipulation, and power-user mastery',
  },
  {
    id: 'ruler tutorrial',
    label: 'Ruler Tutorial',
    badge: 'Memo Lines',
    icon: Ruler,
    description: 'Interactive ruler, margin handles, indents, and memo guides',
  },
];

export const AboutSuiteModal: React.FC<AboutSuiteModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'futures',
}) => {
  const [activeTab, setActiveTab] = useState<AboutTab>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-5 select-none no-print animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#1a1a1a] text-slate-800 dark:text-neutral-100 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-[92vw] max-w-[1440px] h-[88vh] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* HEADER BAR                                                */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 dark:from-[#202020] dark:via-[#1a1a1a] dark:to-[#222222]">
          {/* Left: App Brand & Version info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0062ff] to-[#4f46e5] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Nedit v5.1 Document Suite
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-[#0062ff] dark:text-blue-400 border border-blue-200 dark:border-blue-800 tracking-wide uppercase">
                  Enterprise
                </span>
                <span className="hidden sm:inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} className="mr-1" />
                  100% Client-Side
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Universal Word (.docx), ODF, PDF &amp; Markdown Browser-Native Engineering Workstation
              </p>
            </div>
          </div>

          {/* Right: Architecture link & Close button */}
          <div className="flex items-center space-x-2.5">
            <a
              href="https://grmagazin.blogspot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0062ff] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors border border-blue-200 dark:border-blue-800"
            >
              <span>GR Magazin Architecture</span>
              <ExternalLink size={13} />
            </a>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB NAVIGATION BAR (7 Tabs)                               */}
        {/* ========================================================= */}
        <div className="flex items-center px-4 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#161616] overflow-x-auto no-scrollbar">
          <div className="flex space-x-1 sm:space-x-2 py-2">
            {TAB_CONFIGS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#252525] text-[#0062ff] dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-[#0062ff] dark:text-blue-400' : 'text-neutral-400'} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-[#0062ff] dark:text-blue-300'
                          : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CONTENT AREA (90% Screen Height Viewport)                 */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 bg-slate-50/60 dark:bg-[#141414] text-slate-800 dark:text-neutral-200">
          {/* TAB 1: FEATURES */}
          {activeTab === 'futures' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <Zap size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Nedit v5.1 Features &amp; Capability Matrix
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Engineered for zero-latency, cloud-free local document creation and formatting.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {/* Card 1 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0062ff]">FORMAT ENGINES</span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                        Full Roundtrip
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      6 Native Export Workstations
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-neutral-300 space-y-1.5 pt-1">
                      <li>&bull; <strong>Microsoft Word (.docx):</strong> Styles, numbering &amp; tables</li>
                      <li>&bull; <strong>OpenDocument (.odt):</strong> Open standards format</li>
                      <li>&bull; <strong>Vector PDF:</strong> Print layout with headers/footers</li>
                      <li>&bull; <strong>HTML+Images (ZIP):</strong> Offline web package</li>
                      <li>&bull; <strong>Markdown (.md):</strong> GitHub-flavored format</li>
                      <li>&bull; <strong>JSON Snapshot:</strong> Atomic instant restoration</li>
                    </ul>
                  </div>

                  {/* Card 2 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-600">SMART TEMPLATES</span>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                        20+ Ready
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      100% Dark/Light Adaptive
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-neutral-300 space-y-1.5 pt-1">
                      <li>&bull; <strong>Executive Memos:</strong> Formal corporate letterhead</li>
                      <li>&bull; <strong>Weekly Standups:</strong> Interactive task checklists</li>
                      <li>&bull; <strong>Architecture ADRs:</strong> Context &amp; trade-off tables</li>
                      <li>&bull; <strong>Incident Post-Mortems:</strong> 5-Whys RCA &amp; mitigations</li>
                      <li>&bull; <strong>Confidentiality NDAs:</strong> Mutual signature blocks</li>
                      <li>&bull; <strong>Custom Templates:</strong> Save locally with 1 click</li>
                    </ul>
                  </div>

                  {/* Card 3 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600">INTERACTIVE TOOLS</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                        High Precision
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Ruler &amp; Format Painter
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-neutral-300 space-y-1.5 pt-1">
                      <li>&bull; <strong>Interactive Ruler:</strong> 1/8" snapping &amp; micro-inch shift</li>
                      <li>&bull; <strong>Temporary Memo Lines:</strong> Remembers last indent positions</li>
                      <li>&bull; <strong>Format Painter:</strong> Single and persistent paint modes</li>
                      <li>&bull; <strong>Equation Wizard:</strong> LaTeX KaTeX math formulas</li>
                      <li>&bull; <strong>TTS Speech Audio:</strong> Natural browser voice narration</li>
                      <li>&bull; <strong>Context Menus:</strong> Fast inline Word &amp; Nedit tools</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHORTCUTS CHEATSHEET */}
          {activeTab === 'sortcuts' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                      <Keyboard size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Keyboard &amp; Mouse Shortcuts Cheat Sheet
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Accelerate your editing and word processing workflow.
                      </p>
                    </div>
                  </div>

                  <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search shortcut (e.g. Save, Bold)..."
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#0062ff]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Category 1: Document & File */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <FileText size={14} />
                      <span>Document &amp; File Management</span>
                    </h4>
                    <div className="bg-slate-50 dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                      {[
                        { key: 'Ctrl + S', desc: 'Sync document state to local storage' },
                        { key: 'Ctrl + P', desc: 'Launch print workstation & PDF vector export' },
                        { key: 'Ctrl + O', desc: 'Open 3x3 format hub (DOCX, ODF, HTML, MD, JSON)' },
                        { key: 'Ctrl + N', desc: 'Launch New Document template catalog' },
                        { key: 'Ctrl + F', desc: 'Open find & replace toolbar with regex support' },
                        { key: 'Ctrl + Z', desc: 'Undo last editing step or formatting mark' },
                        { key: 'Ctrl + Y', desc: 'Redo undone action' },
                      ]
                        .filter((s) => s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) || s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()))
                        .map((s, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="text-slate-700 dark:text-neutral-300">{s.desc}</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold text-[11px] text-slate-800 dark:text-white shadow-2xs">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 2: Formatting */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles size={14} />
                      <span>Typography &amp; Character Styles</span>
                    </h4>
                    <div className="bg-slate-50 dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                      {[
                        { key: 'Ctrl + B', desc: 'Bold weight toggle' },
                        { key: 'Ctrl + I', desc: 'Italic slope toggle' },
                        { key: 'Ctrl + U', desc: 'Underline character toggle' },
                        { key: 'Ctrl + Shift + X', desc: 'Strikethrough line' },
                        { key: 'Ctrl + Shift + =', desc: 'Superscript exponent' },
                        { key: 'Ctrl + =', desc: 'Subscript chemical index' },
                        { key: 'Ctrl + \\', desc: 'Clear all formatting from selection' },
                      ]
                        .filter((s) => s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) || s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()))
                        .map((s, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="text-slate-700 dark:text-neutral-300">{s.desc}</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold text-[11px] text-slate-800 dark:text-white shadow-2xs">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 3: Paragraph & Alignment */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers size={14} />
                      <span>Paragraph &amp; Alignment</span>
                    </h4>
                    <div className="bg-slate-50 dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                      {[
                        { key: 'Ctrl + L', desc: 'Left alignment' },
                        { key: 'Ctrl + E', desc: 'Center alignment' },
                        { key: 'Ctrl + R', desc: 'Right alignment' },
                        { key: 'Ctrl + J', desc: 'Justify margins' },
                        { key: 'Tab', desc: 'Indent paragraph or next table cell' },
                        { key: 'Shift + Tab', desc: 'Outdent paragraph or previous table cell' },
                      ]
                        .filter((s) => s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) || s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()))
                        .map((s, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="text-slate-700 dark:text-neutral-300">{s.desc}</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold text-[11px] text-slate-800 dark:text-white shadow-2xs">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 4: Mouse & Ruler */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Ruler size={14} />
                      <span>Mouse &amp; Ruler Precision Gestures</span>
                    </h4>
                    <div className="bg-slate-50 dark:bg-[#202020] rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                      {[
                        { key: 'Shift + Drag Ruler', desc: 'Disable 1/8" snap for micro-inch precision' },
                        { key: 'Right Click Canvas', desc: 'Open 2-Column Word/Nedit Context Menu' },
                        { key: 'Double-Click Word', desc: 'Select entire word' },
                        { key: 'Triple-Click Line', desc: 'Select full paragraph block' },
                        { key: 'Click Purple Bar (L)', desc: 'Toggle Left Document Outline Navigator' },
                        { key: 'Click Purple Bar (R)', desc: 'Toggle Right Ultimate Formatter Drawer' },
                      ]
                        .filter((s) => s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) || s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()))
                        .map((s, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between">
                            <span className="text-slate-700 dark:text-neutral-300">{s.desc}</span>
                            <kbd className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold text-[11px] text-slate-800 dark:text-white shadow-2xs">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNOLOGIES & STACK */}
          {activeTab === 'tecnologies' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Architecture &amp; Core Technology Stack
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Deep engineering built on world-standard protocols and client-side web APIs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/30 dark:bg-[#1f2430] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0062ff]" />
                      <span>TipTap 2.x &amp; ProseMirror Core</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Schema-driven document model with transactional undo/redo history. Guarantees zero DOM state corruption, supporting custom nodes for equations, images, callout boxes, and collapsible drawers.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/30 dark:bg-[#251f30] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span>ECMA-376 OpenXML Word Processing Pipeline</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Custom browser-native ZIP extraction and generation compliant with Microsoft Office 2016-2024 specifications, building valid XML packages without server dependencies.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-[#1a2b22] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>JSZip &amp; Streaming Blob Ingestion</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      In-memory binary packet creation and streaming decompressor. Allows instant packaging of multi-megabyte documents and image media libraries.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-[#2e261a] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      <span>KaTeX Math Engine &amp; Web Speech API</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Ultra-fast mathematical expression parsing rendering at 60 frames per second, paired with the browser SpeechSynthesis API for real-time document voice reading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL INFO & SPECIFICATIONS */}
          {activeTab === 'tec info' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <Terminal size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Enterprise Technical Specifications
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Security boundaries, performance budgets, and memory architecture.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-4 bg-slate-50 dark:bg-[#222] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-[#0062ff] uppercase">Data Isolation</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">Zero Cloud Upload</div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      All document parsing, formatting, and file exports execute 100% inside your local browser memory sandbox. No telemetry or server telemetry logs.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#222] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase">Interactive Budget</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">&lt; 16ms Latency</div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      Strict frame budget ensures instantaneous typing and cursor movement, accompanied by asynchronous chunk caching for all backstage panels.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#222] rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-600 uppercase">Standards Compliance</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">ISO 32000 &amp; ECMA</div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      Supports standardized CSS Paged Media `@page` layout, vector PDF printing, and native Microsoft Word `.docx` package architectures.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#202020] text-xs text-neutral-600 dark:text-neutral-300">
                  <div className="font-bold text-neutral-800 dark:text-white mb-1">
                    System Requirements &amp; Runtime Compatibility:
                  </div>
                  Google Chrome 118+, Microsoft Edge 118+, Mozilla Firefox 120+, Apple Safari 17+, Chromium WebKit. Works seamlessly offline and as an installed Progressive Web App (PWA).
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STARTING GUIDE */}
          {activeTab === 'starting gide' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Quickstart Workflow Guide (5 Simple Steps)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Learn how to create, format, and publish documents in seconds.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      step: '01',
                      title: 'Start Blank or Choose a Smart Template',
                      desc: 'Open File -> New to pick from over 20+ specialized templates (Memos, Status Briefs, Invoices, Press Releases) that dynamically harmonize with Dark, Light, and Sepia modes.',
                    },
                    {
                      step: '02',
                      title: 'Author with the Office Ribbon & Interactive Ruler',
                      desc: 'Format text with bold, font size, and color scales from the Home ribbon. Set first-line and hanging paragraph indents directly on the Interactive Ruler.',
                    },
                    {
                      step: '03',
                      title: 'Insert Media, Equations & Smart Tables',
                      desc: 'Use the Insert ribbon to add KaTeX math formulas, local images with floating alignment bars, callout boxes, and collapsible sections.',
                    },
                    {
                      step: '04',
                      title: 'Page Setup, Margins & 2-Page Spreads',
                      desc: 'Adjust margins (1", 0.5", 0.75", or custom), switch between Portrait and Landscape, or activate Two-Page View for facing page layout review.',
                    },
                    {
                      step: '05',
                      title: 'Export in Any Industry Format with Zero Delay',
                      desc: 'Click File -> Save As or Backstage to generate authentic Microsoft Word (.docx), OpenDocument (.odt), vector PDF, or zipped HTML bundles.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start space-x-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020]"
                    >
                      <span className="text-xl font-black text-[#0062ff] dark:text-blue-400 font-mono">
                        {item.step}
                      </span>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SMART TRAINING */}
          {activeTab === 'smart training' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Power-User Smart Training &amp; Pro Workflows
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Master advanced editing tools and time-saving techniques.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        TIP 1
                      </span>
                      <span>Persistent Multi-Use Format Painter</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Select formatted text, then <strong>double-click</strong> the Format Painter icon in the Home ribbon to lock it in persistent mode. You can now click across multiple headings and paragraphs in sequence without re-copying the format. Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[10px]">Esc</kbd> when finished.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        TIP 2
                      </span>
                      <span>Real-Time Draggable Table Resizing</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Hover over any table column border to reveal the vertical resize cursor. Click and drag horizontally to customize cell proportions with instant visual layout feedback.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                        TIP 3
                      </span>
                      <span>Distraction-Free Focus Mode</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Click the Focus Mode button on the View tab or bottom Status Bar. The entire ribbon, toolbars, and background panes fade away, leaving only your document canvas for deep work sessions.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        TIP 4
                      </span>
                      <span>Quick Command Search (Ctrl + /)</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[10px]">Ctrl + /</kbd> to open the Command Palette. Type any action (e.g. &ldquo;Word Count&rdquo;, &ldquo;Add Table&rdquo;, &ldquo;Dark Mode&rdquo;) to trigger it instantly without hunting through ribbons.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: RULER TUTORIAL & MEMO LINES */}
          {activeTab === 'ruler tutorrial' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-100">
              <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062ff]">
                    <Ruler size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Interactive Ruler Tutorial &amp; Memo Lines
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Understand margin drag boundaries, paragraph indents, and the new ruler memo guides.
                    </p>
                  </div>
                </div>

                {/* Ruler Component Diagram */}
                <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-[#1c2230] space-y-3">
                  <div className="text-xs font-bold text-[#0062ff] uppercase tracking-wider">
                    Interactive Ruler Architecture Overview
                  </div>
                  <div className="bg-white dark:bg-[#262626] border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 flex items-center justify-between text-xs font-mono shadow-xs overflow-x-auto">
                    <span className="text-neutral-500">[Left Margin 1.0"]</span>
                    <span className="text-blue-600 font-bold">|-- 0" -- 1" -- 2" -- 3" -- 4" -- 5" -- 6.5" --|</span>
                    <span className="text-neutral-500">[Right Margin 1.0"]</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                    The top ruler displays exact inch numbering with 1/8&Prime; (0.125&Prime; = 12px) ticks, dynamically synchronized with your current page zoom level.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Item 1 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#185abd]" />
                      <span>Left &amp; Right Paragraph Indent Markers</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      &bull; <strong>Left Indent Marker:</strong> Double triangle marker on the left margin. Dragging sets the paragraph left margin offset.<br />
                      &bull; <strong>Right Indent Marker:</strong> Blue triangle on the right margin. Dragging constrains the paragraph right boundary.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span>Temporary Ruler Memo Lines (New!)</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      &bull; <strong>What it is:</strong> A subtle optical dashed guide line marking the <em>last left and right indent position</em>.<br />
                      &bull; <strong>Activation:</strong> Automatically updates on <strong>Mouse Up</strong> after moving an indent.<br />
                      &bull; <strong>Behavior:</strong> Memorizes the last position so you can align other paragraphs. Disappears on page reload without polluting files.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span>Side Purple Action Lines</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      &bull; <strong>Left Purple 1px Line:</strong> Click to toggle the Left Document Outline &amp; Navigation Sidebar.<br />
                      &bull; <strong>Right Purple 1px Line:</strong> Click to toggle the Right Ultimate Formatter Drawer.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#202020] space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>Micro-Inch Precision (Shift Key)</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                      By default, dragging any ruler marker snaps to 1/8&Prime; (0.125&Prime;) increments. Hold <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border text-[10px]">Shift</kbd> while dragging to bypass snapping for smooth sub-millimeter precision.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* FOOTER BAR                                                */}
        {/* ========================================================= */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#1a1a1a]">
          <div className="hidden sm:flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span>&bull; Nedit v5.1.0 Enterprise</span>
            <span>&bull; 100% Client-Side Sandbox</span>
            <span>&bull; ECMA-376 Standard</span>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => {
                const order: AboutTab[] = [
                  'futures',
                  'sortcuts',
                  'tecnologies',
                  'tec info',
                  'starting gide',
                  'smart training',
                  'ruler tutorrial',
                ];
                const nextIdx = (order.indexOf(activeTab) + 1) % order.length;
                setActiveTab(order[nextIdx]);
              }}
              className="px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg font-medium cursor-pointer transition-colors"
            >
              Next Tab &rarr;
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 text-xs bg-[#0062ff] hover:bg-[#0052d6] text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSuiteModal;
