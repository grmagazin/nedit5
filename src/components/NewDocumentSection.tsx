import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { DocumentSettings } from '../types';
import {
  DocumentTemplate,
  PREMADE_TEMPLATES,
  loadCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  exportTemplateAsHtml,
  importTemplateFromHtml,
  STORAGE_KEY_CONTENT,
  STORAGE_KEY_SETTINGS,
} from '../utils/documentTemplates';
import {
  FilePlus,
  Download,
  Upload,
  BookmarkPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  FileCode,
  X,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';

interface NewDocumentSectionProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<DocumentSettings>) => void;
  onSaveToLocalStorage: () => void;
}

export const NewDocumentSection: React.FC<NewDocumentSectionProps> = ({
  editor,
  settings,
  onClose,
  onUpdateSettings,
  onSaveToLocalStorage,
}) => {
  const [customTemplates, setCustomTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal for "Save Current Document as Template"
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>(
    settings.title || 'Custom Template'
  );
  const [newTemplateCategory, setNewTemplateCategory] = useState<
    'PERSONAL' | 'BUSINESS' | 'REPORTS' | 'THEMES' | 'CUSTOM'
  >('CUSTOM');
  const [newTemplateDescription, setNewTemplateDescription] = useState<string>(
    'Custom template created from active document.'
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom templates on mount
  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Combine built-in templates with custom templates
  const allTemplates: DocumentTemplate[] = [...PREMADE_TEMPLATES, ...customTemplates];

  // Filter templates
  const filteredTemplates = allTemplates.filter((t) => {
    const matchesCategory =
      selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'MY_TEMPLATES'
        ? t.isCustom
        : t.category === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Handle using a template
  const handleSelectTemplate = (template: DocumentTemplate) => {
    if (!editor) return;

    if (template.id === 'blank') {
      editor.commands.setContent('<p></p>');
      const updatedSettings: Partial<DocumentSettings> = {
        title: 'Untitled Document',
        pageColor: settings.isDarkMode ? '#282828' : '#ffffff',
        isDarkMode: settings.isDarkMode,
        themeMode: settings.isDarkMode ? (settings.themeMode || 'fullDark') : 'light',
        margins: 'normal',
        orientation: 'portrait',
      };
      onUpdateSettings(updatedSettings);

      // Persist directly to local storage
      try {
        localStorage.setItem(STORAGE_KEY_CONTENT, '<p></p>');
        localStorage.setItem(
          STORAGE_KEY_SETTINGS,
          JSON.stringify({ ...settings, ...updatedSettings })
        );
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      onSaveToLocalStorage();
      notify('Created blank document and synced with Local Storage!');
      onClose();
      return;
    }

    // Load template content
    editor.commands.setContent(template.content);

    // Apply template settings while maintaining user's active theme (Light, Dark, Sepia)
    // No pageColor or dark/light overrides — 100% compatible like Executive Proposal, Resume, Meeting Minutes
    const updatedSettings: Partial<DocumentSettings> = {
      title: template.settings?.title || template.title,
      margins: template.settings?.margins || 'normal',
      orientation: template.settings?.orientation || 'portrait',
      ...(template.settings?.author ? { author: template.settings.author } : {}),
    };
    onUpdateSettings(updatedSettings);

    // Persist to local storage
    try {
      localStorage.setItem(STORAGE_KEY_CONTENT, template.content);
      localStorage.setItem(
        STORAGE_KEY_SETTINGS,
        JSON.stringify({ ...settings, ...updatedSettings })
      );
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
    onSaveToLocalStorage();
    notify(`Loaded template "${template.title}"!`);
    onClose();
  };

  // Save current document as template
  const handleSaveCurrentAsTemplate = () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content || content.trim() === '') {
      notifyError('Cannot create template from an empty document.');
      return;
    }

    const created = saveCustomTemplate({
      title: newTemplateTitle.trim() || 'Untitled Template',
      description: newTemplateDescription.trim() || 'Custom user template',
      category: newTemplateCategory,
      content,
      settings: {
        title: newTemplateTitle.trim() || 'Untitled Template',
        pageColor: settings.pageColor,
        isDarkMode: settings.isDarkMode,
        margins: settings.margins,
        orientation: settings.orientation,
        author: settings.author,
      },
    });

    setCustomTemplates(loadCustomTemplates());
    setShowSaveModal(false);
    notify(`Saved "${created.title}" as local template!`);
  };

  // Delete a custom template
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this custom template?')) {
      deleteCustomTemplate(id);
      setCustomTemplates(loadCustomTemplates());
      notify('Custom template removed from local storage.');
    }
  };

  // Export template as simple HTML
  const handleExportTemplate = (template: DocumentTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      exportTemplateAsHtml(template);
      notify(`Exported "${template.title}.html" successfully!`);
    } catch (err: any) {
      notifyError('Failed to export template: ' + (err?.message || ''));
    }
  };

  // Import template from HTML file
  const handleImportHtmlFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importTemplateFromHtml(file);
      setCustomTemplates(loadCustomTemplates());
      notify(`Imported template "${imported.title}" into local storage!`);
    } catch (err: any) {
      console.error('Import template error:', err);
      notifyError('Failed to import template HTML: ' + (err?.message || ''));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Render thumbnail visuals corresponding to the user screenshot
  const renderThumbnail = (template: DocumentTemplate) => {
    switch (template.thumbnailType) {
      case 'blank':
        return (
          <div className="w-full h-full bg-white flex items-center justify-center p-4">
            <div className="w-16 h-20 rounded-md border-2 border-dashed border-neutral-300 flex items-center justify-center shadow-2xs group-hover:border-[#185abd] transition-colors">
              <div className="relative">
                <FileText size={24} className="text-neutral-400 group-hover:text-[#185abd] transition-colors" />
                <span className="absolute -bottom-1 -right-1 bg-white text-[#185abd] font-bold text-xs leading-none">
                  +
                </span>
              </div>
            </div>
          </div>
        );

      case 'proposal':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="text-[10px] font-bold text-neutral-900 leading-tight truncate">
              Strategic Digital Transformation Proposal
            </div>
            <div className="text-[7.5px] text-neutral-400 font-mono mt-0.5 truncate">
              Prepared for: Global Enterprise Solutions | Date: October 2025 | Version 2.4
            </div>
            <div className="text-[8.5px] font-bold text-[#185abd] mt-1.5">
              1. Executive Summary
            </div>
            <div className="text-[7.5px] text-neutral-600 leading-tight mt-0.5 line-clamp-2">
              The objective of this initiative is to modernize enterprise workflow pipelines, accelerate cloud adoption, and integrate AI-assisted automation to drive operational efficiency by 32% within the first three quarters.
            </div>
            <div className="text-[8.5px] font-bold text-[#185abd] mt-1 truncate">
              2. Key Objectives &amp; Deliverables
            </div>
          </div>
        );

      case 'resume':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="text-[11px] font-black text-neutral-900 tracking-wider uppercase truncate">
              ALEXANDER MORGAN
            </div>
            <div className="text-[8px] font-bold text-neutral-700 truncate">
              Principal Software Architect &amp; Full-Stack Engineer
            </div>
            <div className="text-[7px] text-neutral-400 mt-0.5 truncate">
              San Francisco, CA | +1 (555) 019-2834 | alex.morgan@domain.com
            </div>
            <div className="text-[8px] font-bold text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mt-1.5">
              Professional Summary
            </div>
            <div className="text-[7px] text-neutral-600 leading-tight mt-0.5 line-clamp-2">
              Results-driven Software Architect with 9+ years of experience engineering high-throughput distributed systems, modern web platforms, and rich real-time collaborative applications.
            </div>
            <div className="text-[8px] font-bold text-neutral-900 uppercase border-b border-neutral-300 pb-0.5 mt-1">
              Core Competencies
            </div>
          </div>
        );

      case 'minutes':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="text-[10px] font-bold text-neutral-900 truncate">
              Executive Leadership Team &mdash; Weekly Sync
            </div>
            <div className="text-[7px] text-neutral-400 mt-0.5 truncate">
              Date: October 24, 2025 | Time: 10:00 AM - 11:30 AM | Location: Boardroom A
            </div>
            <div className="text-[8.5px] font-bold text-[#0f766e] uppercase mt-1">
              Attendees
            </div>
            <div className="text-[7.5px] text-neutral-700 mt-0.5 truncate">
              <strong>Present:</strong> Sarah Jenkins (CEO), David Chen (CTO), Maya Patel (VP Product)
            </div>
            <div className="text-[8.5px] font-bold text-[#0f766e] uppercase mt-1">
              Agenda Overview
            </div>
            <div className="text-[7px] text-neutral-600 space-y-0.5 mt-0.5">
              <div>1. Q3 Financial Performance Review</div>
              <div>2. Product v3.0 Release Roadmap</div>
            </div>
          </div>
        );

      case 'midnight':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#0284c7] truncate">
              Midnight Brief
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              A sleek modern brief for bold communication. Ideal for product launches and design proposals.
            </div>
            <div className="text-[8.5px] font-semibold text-[#0284c7] mt-1.5">
              Overview
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-1">
              Present ideas with clean visual contrast that makes key insights and imagery pop.
            </div>
            <div className="text-[8.5px] font-semibold text-[#0284c7] mt-1">
              Highlights
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-0.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#0284c7]" />
                <span className="truncate">High-clarity layout</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#0284c7]" />
                <span className="truncate">Electric-blue accents</span>
              </div>
            </div>
          </div>
        );

      case 'charcoal':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#9333ea] truncate">
              Charcoal Notes
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              A refined purple-accented layout for creative briefs and editorial content.
            </div>
            <div className="text-[8.5px] font-semibold text-[#9333ea] mt-1.5">
              Concept
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-1">
              Soft purple accents set a sophisticated, focused tone for creative sprints.
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#9333ea]" />
                <span className="truncate">Elegant purple accents</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#9333ea]" />
                <span className="truncate">Editorial spacing</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#9333ea]" />
                <span className="truncate">Universal light/dark harmony</span>
              </div>
            </div>
          </div>
        );

      case 'obsidian':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#d97706] truncate">
              Obsidian Report
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              A premium theme with warm amber accents for executive summaries and highlights.
            </div>
            <div className="text-[8.5px] font-semibold text-[#d97706] mt-1.5">
              Key Points
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-1">
              Warm amber accents guide the eye across a balanced, prestige executive canvas.
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#d97706]" />
                <span className="truncate">Warm amber highlights</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#d97706]" />
                <span className="truncate">Executive layout</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#d97706]" />
                <span className="truncate">High readability</span>
              </div>
            </div>
          </div>
        );

      case 'snow':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#2563eb] truncate">
              Snow Whitepaper
            </div>
            <div className="text-[7.5px] text-neutral-400 mt-0.5 line-clamp-1">
              A crisp, clean light theme with confident blue accents &mdash; perfect for whitepapers and formal reports.
            </div>
            <div className="text-[8.5px] font-semibold text-[#2563eb] mt-1.5">
              Summary
            </div>
            <div className="text-[7.5px] text-neutral-600 mt-0.5 line-clamp-1">
              Maximize clarity with generous whitespace and a classic blue heading palette.
            </div>
            <div className="text-[7px] text-neutral-500 space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#2563eb]" />
                <span className="truncate">Pure white surface</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#2563eb]" />
                <span className="truncate">Classic blue accents</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#2563eb]" />
                <span className="truncate">Print-ready contrast</span>
              </div>
            </div>
          </div>
        );

      case 'sand':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#b45309] truncate">
              Sand Journal
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              A warm, paper-inspired theme with amber-brown accents for journals.
            </div>
            <div className="text-[8.5px] font-semibold text-[#b45309] mt-1.5">
              Reflections
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-1">
              Comfortable formatting reduces eye strain during extended reading sessions.
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#b45309]" />
                <span className="truncate">Clean reading surface</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#b45309]" />
                <span className="truncate">Earthy amber accents</span>
              </div>
            </div>
          </div>
        );

      case 'mint':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#059669] truncate">
              Mint Memo
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              Fresh emerald and mint-accented layout for clean team updates.
            </div>
            <div className="text-[8.5px] font-semibold text-[#059669] mt-1.5">
              Announcement
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-1">
              Keep team communications vibrant, organized, and delightful to read.
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#059669]" />
                <span className="truncate">Fresh mint accents</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#059669]" />
                <span className="truncate">Clean action items</span>
              </div>
            </div>
          </div>
        );

      case 'nordic':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-[#0284c7] truncate">
              Nordic Slate Spec
            </div>
            <div className="text-[7.5px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              Minimalist cool-slate engineering layout with crisp table specs.
            </div>
            <div className="text-[8.5px] font-semibold text-[#0369a1] mt-1.5">
              Architecture Spec
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 space-y-0.5 mt-1">
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#0284c7]" />
                <span className="truncate">Client-side OpenXML pipeline</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-[#0284c7]" />
                <span className="truncate">&lt; 16ms frame budget</span>
              </div>
            </div>
          </div>
        );

      case 'crimson':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start">
            <div className="text-[7px] font-bold text-[#be123c] tracking-widest uppercase">
              PRESS RELEASE
            </div>
            <div className="text-[10px] font-bold text-[#be123c] mt-0.5 line-clamp-2 leading-tight">
              Universal Multi-Format Suite Launches
            </div>
            <div className="text-[7.5px] text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2 italic border-l-2 border-[#be123c] pl-1.5">
              "Instantaneous client-side processing with zero upload friction."
            </div>
          </div>
        );

      case 'terminal':
        return (
          <div className="w-full h-full bg-white dark:bg-[#202020] p-3 text-left overflow-hidden border-b border-neutral-100 dark:border-neutral-800 flex flex-col justify-start font-mono">
            <div className="text-[10px] font-bold text-[#10b981] truncate">
              $ ./deploy-v3.0.0
            </div>
            <div className="text-[7px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              BUILD: PASS &bull; COVERAGE: 99.4%
            </div>
            <div className="text-[8px] font-bold text-[#10b981] mt-1.5">
              [+] Release Highlights
            </div>
            <div className="text-[7px] text-neutral-600 dark:text-neutral-300 space-y-0.5 mt-0.5">
              <div>&bull; Client-side ZIP streaming</div>
              <div>&bull; Safe lazy load Backstage</div>
            </div>
          </div>
        );

      case 'project_status':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#1e3a8a] truncate">Project Alpha</span>
              <span className="text-[7px] bg-blue-100 text-blue-800 font-bold px-1 rounded">ON TRACK</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1.5 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded p-0.5">
                <div className="text-[6px] text-slate-500 uppercase">Progress</div>
                <div className="text-[9px] font-bold text-[#1e3a8a]">94%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-0.5">
                <div className="text-[6px] text-slate-500 uppercase">Budget</div>
                <div className="text-[9px] font-bold text-[#0284c7]">82%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-0.5">
                <div className="text-[6px] text-slate-500 uppercase">Velocity</div>
                <div className="text-[9px] font-bold text-[#059669]">48pt</div>
              </div>
            </div>
            <div className="text-[7.5px] text-slate-600 mt-1 line-clamp-1">
              Zero-latency smart template catalog finalized.
            </div>
          </div>
        );

      case 'invoice':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">INVOICE</span>
                <span className="text-[7px] text-[#64748b]">#INV-2025-084</span>
              </div>
              <div className="text-[7.5px] text-[#185abd] font-bold mt-0.5">Apex Digital Studio</div>
              <div className="border-t border-b border-slate-200 my-1 py-1 text-[7px] text-slate-600 flex justify-between">
                <span>Executive Engineering (32h)</span>
                <span className="font-semibold">$4,800.00</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-[8px] font-bold text-[#0f172a] pt-0.5">
              <span>Total Due:</span>
              <span className="text-[#185abd] text-[9.5px]">$7,200.00</span>
            </div>
          </div>
        );

      case 'planner':
        return (
          <div className="w-full h-full bg-[#faf5ff] p-3 text-left overflow-hidden border-b border-[#e9d5ff] flex flex-col justify-start text-[#581c87]">
            <div className="text-[10.5px] font-bold text-[#6d28d9] truncate">
              Weekly Focus Matrix
            </div>
            <div className="text-[7.5px] text-[#8b5cf6] mt-0.5 truncate">
              Top 3 Intentional Sprint Outcomes
            </div>
            <div className="text-[7px] text-[#6d28d9] space-y-0.5 mt-1.5">
              <div className="flex items-center space-x-1">
                <span className="text-emerald-600 font-bold">&#10003;</span>
                <span className="truncate line-through text-slate-400">Deliver modular components</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">&#9633;</span>
                <span className="truncate">Complete documentation review</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">&#9633;</span>
                <span className="truncate">Reflect on deep work blocks</span>
              </div>
            </div>
          </div>
        );

      case 'standup':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#0284c7] truncate">Weekly Standup Sync</span>
              <span className="text-[6.5px] bg-sky-100 text-sky-800 font-bold px-1 rounded">WEEKLY</span>
            </div>
            <div className="text-[7.5px] font-bold text-slate-700 uppercase mt-1">1. Accomplishments</div>
            <div className="text-[7px] text-slate-600 space-y-0.5 mt-0.5">
              <div className="flex items-center space-x-1">
                <span className="text-emerald-600 font-bold text-[8px]">&#10003;</span>
                <span className="truncate">Universal dark/light templates</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-emerald-600 font-bold text-[8px]">&#10003;</span>
                <span className="truncate">Client-side OpenXML fidelity</span>
              </div>
            </div>
            <div className="text-[7.5px] font-bold text-slate-700 uppercase mt-1">2. Top Priorities</div>
            <div className="text-[7px] text-slate-500 truncate">Sub-16ms interactive typing</div>
          </div>
        );

      case 'memo':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest border-b border-slate-900 pb-0.5">
              MEMORANDUM
            </div>
            <div className="text-[6.5px] text-slate-500 font-mono mt-0.5">CONFIDENTIAL &bull; INTERNAL</div>
            <div className="text-[7px] text-slate-700 space-y-0.5 mt-1 border-b border-slate-200 pb-1">
              <div><strong>TO:</strong> Department Leads</div>
              <div><strong>FROM:</strong> Office of CTO</div>
              <div><strong>RE:</strong> Client-Side Architecture</div>
            </div>
            <div className="text-[7px] text-slate-600 line-clamp-2 mt-1">
              Mandatory guidelines prioritizing client-side data isolation.
            </div>
          </div>
        );

      case 'adr':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#4338ca] truncate">ADR-014: Modular Engine</span>
              <span className="text-[6.5px] bg-indigo-100 text-indigo-800 font-bold px-1 rounded">ACCEPTED</span>
            </div>
            <div className="text-[7.5px] font-semibold text-[#4338ca] mt-1">1. Context &amp; Problem</div>
            <div className="text-[7px] text-slate-600 line-clamp-1 mt-0.5">
              Code-splitting without sacrificing offline reliability.
            </div>
            <div className="border border-indigo-100 rounded bg-indigo-50/50 p-1 mt-1 text-[7px] text-slate-700">
              <div className="font-bold text-[#4338ca]">Decision: React.lazy</div>
              <div className="text-[6.5px] text-slate-500">58% bundle reduction, chunk caching</div>
            </div>
          </div>
        );

      case 'postmortem':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-start">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#b91c1c] truncate">Incident: INC-402</span>
              <span className="text-[6.5px] bg-red-100 text-red-800 font-bold px-1 rounded">SEV-2</span>
            </div>
            <div className="flex justify-between items-center text-[7px] bg-red-50/70 border border-red-200 rounded px-1.5 py-0.5 mt-1 text-slate-700">
              <span>Duration: <strong>42m</strong></span>
              <span>Impact: <strong>3.1%</strong></span>
            </div>
            <div className="text-[7.5px] font-semibold text-[#b91c1c] mt-1">Root Cause (5 Whys)</div>
            <div className="text-[7px] text-slate-600 line-clamp-2 mt-0.5">
              Heavy inline base64 image strings caused DOM layout spikes.
            </div>
          </div>
        );

      case 'agreement':
        return (
          <div className="w-full h-full bg-white p-3 text-left overflow-hidden border-b border-neutral-100 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] font-black text-center text-[#0f172a] uppercase tracking-wider border-b border-slate-300 pb-0.5">
                MUTUAL NDA
              </div>
              <div className="text-[6.5px] text-center text-slate-400 mt-0.5">Standard Confidentiality</div>
              <div className="text-[7px] text-slate-600 line-clamp-2 mt-1">
                Agreement between Party A and Party B for safeguarding confidential information.
              </div>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-[6.5px] text-slate-500">
              <span>Party A: _______</span>
              <span>Party B: _______</span>
            </div>
          </div>
        );

      default:
        // Custom template thumbnail
        return (
          <div className="w-full h-full bg-neutral-50 p-3 text-left overflow-hidden border-b border-neutral-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-400">Custom Template</span>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                  Local Storage
                </span>
              </div>
              <div className="text-[11px] font-bold text-neutral-800 mt-1 truncate">
                {template.title}
              </div>
              <div className="text-[8px] text-neutral-500 mt-0.5 line-clamp-3">
                {template.description || 'Custom HTML document template saved on this device.'}
              </div>
            </div>
            <div className="text-[8px] text-neutral-400 flex items-center justify-between border-t border-neutral-200 pt-1">
              <span>{template.createdAt || 'Saved Locally'}</span>
              <span>HTML Format</span>
            </div>
          </div>
        );
    }
  };

  // Helper for category badge styling matching user screenshot
  const renderCategoryBadge = (category: string) => {
    switch (category) {
      case 'PERSONAL':
        return (
          <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase inline-block">
            PERSONAL
          </span>
        );
      case 'BUSINESS':
        return (
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase inline-block">
            BUSINESS
          </span>
        );
      case 'REPORTS':
        return (
          <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase inline-block">
            REPORTS
          </span>
        );
      case 'THEMES':
        return (
          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase inline-block">
            THEMES
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase inline-block">
            CUSTOM
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6 pb-12">
      {/* Toast notifications */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center space-x-2 animate-fadeIn">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Header matching the user screenshot + action bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 leading-tight">New Document</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Choose a template to get started or start with a blank page.
          </p>
        </div>

        {/* Global Template Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Save Current as Template button */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            title="Save your current document as a new template in local storage"
          >
            <BookmarkPlus size={14} />
            <span>Save Current as Template</span>
          </button>

          {/* Import Template (.html) */}
          <label className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 rounded text-xs font-medium flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer">
            <Upload size={13} className="text-[#185abd]" />
            <span>Import Template (.html)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleImportHtmlFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {[
            { id: 'ALL', label: `All (${allTemplates.length})` },
            { id: 'PERSONAL', label: 'Personal' },
            { id: 'BUSINESS', label: 'Business' },
            { id: 'REPORTS', label: 'Reports' },
            { id: 'THEMES', label: 'Themes' },
            { id: 'MY_TEMPLATES', label: `My Saved (${customTemplates.length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-[#185abd]/30 focus:border-[#185abd]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Grid of Templates matching user screenshot (3 columns on md/lg) */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-neutral-100 text-neutral-400 rounded-xl flex items-center justify-center mx-auto">
            <Search size={24} />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">No matching templates found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Try adjusting your search query or select "All" to browse all available document presets.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Document Thumbnail Preview (Fixed height ~160px) */}
              <div
                onClick={() => handleSelectTemplate(template)}
                className="h-44 w-full bg-neutral-50 border-b border-neutral-100 cursor-pointer overflow-hidden relative select-none"
                title={`Click to use template: ${template.title}`}
              >
                {renderThumbnail(template)}
              </div>

              {/* Card Meta & Actions */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
                <div>
                  <div className="flex items-center justify-between">
                    {renderCategoryBadge(template.category)}
                    {template.isCustom && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        User Template
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => handleSelectTemplate(template)}
                    className="text-sm font-bold text-neutral-800 mt-2 hover:text-[#185abd] cursor-pointer transition-colors"
                  >
                    {template.title}
                  </h3>

                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed min-h-[34px]">
                    {template.description}
                  </p>
                </div>

                {/* Card Action Buttons Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className="px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0c3773] text-white rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Use Template
                  </button>

                  <div className="flex items-center space-x-1.5">
                    {/* Export Template as HTML */}
                    <button
                      onClick={(e) => handleExportTemplate(template, e)}
                      className="p-1.5 text-neutral-500 hover:text-[#185abd] hover:bg-neutral-100 rounded cursor-pointer transition-colors"
                      title="Export template as simple HTML file"
                    >
                      <Download size={15} />
                    </button>

                    {/* Delete Custom Template */}
                    {template.isCustom && (
                      <button
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                        title="Delete this template from local storage"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Save Current Document as Template */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center space-x-2 text-[#185abd]">
                <BookmarkPlus size={20} />
                <h3 className="font-bold text-neutral-900 text-sm">Save Current Document as Template</h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Template Title</label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="e.g. Quarterly Executive Summary"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#185abd]/30 focus:border-[#185abd]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Category</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#185abd]/30 focus:border-[#185abd]"
                >
                  <option value="CUSTOM">CUSTOM (Personal Saved)</option>
                  <option value="PERSONAL">PERSONAL</option>
                  <option value="BUSINESS">BUSINESS</option>
                  <option value="REPORTS">REPORTS</option>
                  <option value="THEMES">THEMES</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Brief summary of this template..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#185abd]/30 focus:border-[#185abd]"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg text-neutral-600 text-[11px] leading-relaxed">
                This template will be saved locally on your machine in browser <strong>LocalStorage</strong> and can be exported as a standalone <strong>.html</strong> file anytime.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsTemplate}
                className="px-4 py-1.5 bg-[#185abd] hover:bg-[#114b9c] text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewDocumentSection;

