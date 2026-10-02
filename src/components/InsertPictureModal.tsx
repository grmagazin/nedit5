import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Link as LinkIcon,
  Clipboard,
  Database,
  X,
  Check,
  Trash2,
  Search,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Info,
} from 'lucide-react';

export interface StoredLibraryImage {
  id: string;
  name: string;
  dataUrl: string;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
  timestamp: string;
  alt?: string;
  caption?: string;
}

interface InsertPictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (msg: string) => void;
}

const STORAGE_KEY_IMAGE_LIB = 'wordpad_image_library';

// Curated royalty-free sample illustrations and high quality photos
const SAMPLE_ILLUSTRATIONS: Array<{
  id: string;
  title: string;
  category: 'Business' | 'Tech' | 'Analytics' | 'Design' | 'Nature';
  alt: string;
  caption: string;
  url: string;
}> = [
  {
    id: 'sample-office-workspace',
    title: 'Modern Executive Workspace',
    category: 'Business',
    alt: 'Clean minimalist office workspace with modern laptop, notebook and coffee',
    caption: 'Modern workspace setup for executive documentation',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-analytics-dashboard',
    title: 'Business Growth & Analytics',
    category: 'Analytics',
    alt: 'Financial analytics chart with upward trend curves and growth metrics',
    caption: 'Quarterly performance metrics and business growth indicators',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-code-tech',
    title: 'Software Development & Code',
    category: 'Tech',
    alt: 'Screen displaying clean code syntax and software engineering project',
    caption: 'Architecture blueprint and system implementation code',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-team-meeting',
    title: 'Strategic Collaboration & Teamwork',
    category: 'Business',
    alt: 'Creative team collaborating around a conference table with documents',
    caption: 'Cross-functional team alignment on key deliverables',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-minimal-architecture',
    title: 'Minimalist Architecture',
    category: 'Design',
    alt: 'Abstract geometrical architectural lines with blue sky background',
    caption: 'Architectural perspectives and modern design symmetry',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-nature-mountain',
    title: 'Serene Alpine Landscape',
    category: 'Nature',
    alt: 'Panoramic mountain peaks at golden hour with serene atmosphere',
    caption: 'Natural landscape and environmental harmony',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-creative-design',
    title: 'Creative Typography & Palette',
    category: 'Design',
    alt: 'Graphic designer color swatch books and layout drafts',
    caption: 'Visual branding system and creative typography hierarchy',
    url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sample-cloud-datacenter',
    title: 'Cloud Infrastructure & Servers',
    category: 'Tech',
    alt: 'High-tech server rack lighting in enterprise data center',
    caption: 'Cloud infrastructure hosting high-availability services',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80',
  },
];

export const InsertPictureModal: React.FC<InsertPictureModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
}) => {
  // Tabs matching photo: From This Device, Sample Illustrations, Image Web URL, From Clipboard + Saved Library
  const [activeTab, setActiveTab] = useState<'device' | 'samples' | 'url' | 'clipboard' | 'library'>('device');

  // Image source state
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>('image');
  const [originalSizeBytes, setOriginalSizeBytes] = useState<number>(0);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Optimization & Resize controls (matching photo)
  const [targetWidth, setTargetWidth] = useState<number | 'original'>(800);
  const [format, setFormat] = useState<'WebP' | 'JPG' | 'PNG'>('WebP');
  const [compressionPercent, setCompressionPercent] = useState<number>(80);
  const [altText, setAltText] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [saveToLibrary, setSaveToLibrary] = useState<boolean>(true);

  // Processed result
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [processedSizeBytes, setProcessedSizeBytes] = useState<number>(0);
  const [processedDimensions, setProcessedDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab-specific states
  const [urlInput, setUrlInput] = useState<string>('');
  const [sampleSearch, setSampleSearch] = useState<string>('');
  const [sampleCategory, setSampleCategory] = useState<string>('All');
  const [clipboardStatus, setClipboardStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [libraryImages, setLibraryImages] = useState<StoredLibraryImage[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropzoneRef = useRef<HTMLDivElement | null>(null);

  // Load saved images from local storage
  const loadLibrary = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IMAGE_LIB);
      if (raw) {
        setLibraryImages(JSON.parse(raw));
      } else {
        setLibraryImages([]);
      }
    } catch (e) {
      console.warn('Failed to load image library from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
    }
  }, [isOpen, loadLibrary]);

  // Client-side canvas resize and compression
  const processImage = useCallback(
    async (
      sourceDataUrl: string,
      reqWidth: number | 'original',
      reqFormat: 'WebP' | 'JPG' | 'PNG',
      qualityPct: number
    ) => {
      setIsProcessing(true);
      setErrorMessage(null);

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });

            let finalW = img.naturalWidth;
            let finalH = img.naturalHeight;

            if (reqWidth !== 'original' && img.naturalWidth > reqWidth) {
              const ratio = reqWidth / img.naturalWidth;
              finalW = reqWidth;
              finalH = Math.round(img.naturalHeight * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = finalW;
            canvas.height = finalH;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              setProcessedDataUrl(sourceDataUrl);
              setIsProcessing(false);
              resolve();
              return;
            }

            // High quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Background for JPG (transparent PNG/WebP convert)
            if (reqFormat === 'JPG') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, finalW, finalH);
            }

            ctx.drawImage(img, 0, 0, finalW, finalH);

            let mime = 'image/webp';
            if (reqFormat === 'JPG') mime = 'image/jpeg';
            if (reqFormat === 'PNG') mime = 'image/png';

            const quality = Math.max(0.1, Math.min(1.0, qualityPct / 100));
            const outputDataUrl = canvas.toDataURL(mime, quality);

            // Calculate approximate bytes
            const base64Content = outputDataUrl.split(',')[1] || '';
            const sizeBytes = Math.round((base64Content.length * 3) / 4);

            setProcessedDataUrl(outputDataUrl);
            setProcessedSizeBytes(sizeBytes);
            setProcessedDimensions({ width: finalW, height: finalH });
          } catch (err: any) {
            console.error('Canvas processing error:', err);
            // Fallback to original
            setProcessedDataUrl(sourceDataUrl);
          } finally {
            setIsProcessing(false);
            resolve();
          }
        };

        img.onerror = () => {
          setErrorMessage('Could not load image file. It may be corrupted or blocked by CORS.');
          setIsProcessing(false);
          resolve();
        };

        img.src = sourceDataUrl;
      });
    },
    []
  );

  // Trigger re-processing when optimization parameters change
  useEffect(() => {
    if (selectedImageSrc) {
      processImage(selectedImageSrc, targetWidth, format, compressionPercent);
    }
  }, [selectedImageSrc, targetWidth, format, compressionPercent, processImage]);

  // Load a local file
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP, GIF, or SVG).');
      return;
    }

    setOriginalName(file.name.replace(/\.[^.]+$/, ''));
    setOriginalSizeBytes(file.size);
    if (!altText) {
      setAltText(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImageSrc(result);
    };
    reader.onerror = () => setErrorMessage('Error reading file from disk.');
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Clipboard paste listener
  const handlePasteEvent = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelect(file);
          setActiveTab('device');
          setClipboardStatus('Pasted image from clipboard!');
          setTimeout(() => setClipboardStatus(null), 3000);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onWindowPaste = (e: ClipboardEvent) => handlePasteEvent(e);
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [isOpen, handlePasteEvent]);

  // Read clipboard via navigator API
  const handleReadClipboard = async () => {
    try {
      setClipboardStatus('Reading clipboard contents...');
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setClipboardStatus('Clipboard API not supported in this browser. Please press Ctrl+V directly.');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-image.png', { type });
            handleFileSelect(file);
            setActiveTab('device');
            setClipboardStatus('Successfully imported image from clipboard!');
            setTimeout(() => setClipboardStatus(null), 3000);
            return;
          }
        }
      }
      setClipboardStatus('No image found in clipboard. Please copy an image first, or press Ctrl+V.');
    } catch (err: any) {
      setClipboardStatus('Clipboard access denied or empty. You can press Ctrl+V to paste directly.');
    }
  };

  // Fetch URL and convert to Base64
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(urlInput.trim(), { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImageSrc(dataUrl);
        setOriginalName('web-image');
        setOriginalSizeBytes(blob.size);
        if (!altText) setAltText('Web imported picture');
        setActiveTab('device');
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      // CORS fallback: load directly via Image object
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setSelectedImageSrc(dataUrl);
            setOriginalName('web-image');
            setOriginalSizeBytes(Math.round((dataUrl.length * 3) / 4));
            if (!altText) setAltText('Web imported picture');
            setActiveTab('device');
          }
        } catch {
          // If tainted by CORS, use raw URL directly
          setSelectedImageSrc(urlInput.trim());
          setProcessedDataUrl(urlInput.trim());
          setOriginalName('web-image');
          if (!altText) setAltText('Web linked picture');
          setActiveTab('device');
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setErrorMessage('Could not load image from this URL. Check URL or try another link.');
        setIsProcessing(false);
      };
      img.src = urlInput.trim();
    }
  };

  // Select a sample illustration
  const handleSelectSample = (sample: (typeof SAMPLE_ILLUSTRATIONS)[0]) => {
    setSelectedImageSrc(sample.url);
    setOriginalName(sample.id);
    setAltText(sample.alt);
    setCaption(sample.caption);
    setActiveTab('device');
  };

  // Insert image into TipTap editor & optionally save to library
  const handleInsertIntoDocument = () => {
    const finalSrc = processedDataUrl || selectedImageSrc;
    if (!finalSrc || !editor) return;

    const safeAlt = altText.trim() || originalName || 'Document picture';
    const safeCaption = caption.trim();

    if (safeCaption) {
      // Rich container with picture and caption
      editor
        .chain()
        .focus()
        .insertContent(
          `<div class="word-image-container" style="text-align: center; margin: 18px 0; display: block;">` +
            `<img src="${finalSrc}" alt="${safeAlt}" style="max-width: 100%; height: auto; border-radius: 4px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.06);" />` +
            `<p class="word-image-caption" style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 6px; text-align: center;">${safeCaption}</p>` +
          `</div><p></p>`
        )
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setImage({
          src: finalSrc,
          alt: safeAlt,
        })
        .run();
    }

    // Save to local storage library if checked
    if (saveToLibrary && finalSrc.startsWith('data:')) {
      try {
        const currentLib: StoredLibraryImage[] = JSON.parse(
          localStorage.getItem(STORAGE_KEY_IMAGE_LIB) || '[]'
        );
        const newEntry: StoredLibraryImage = {
          id: `img-${Date.now()}`,
          name: originalName || 'Saved Image',
          dataUrl: finalSrc,
          format,
          width: processedDimensions.width || 800,
          height: processedDimensions.height || 600,
          sizeBytes: processedSizeBytes || Math.round((finalSrc.length * 3) / 4),
          timestamp: new Date().toLocaleDateString(),
          alt: safeAlt,
          caption: safeCaption,
        };

        // Limit library to latest 20 items to respect localStorage limits (~5MB)
        const updatedLib = [newEntry, ...currentLib.filter((x) => x.id !== newEntry.id)].slice(0, 20);
        localStorage.setItem(STORAGE_KEY_IMAGE_LIB, JSON.stringify(updatedLib));
        setLibraryImages(updatedLib);
      } catch (e) {
        console.warn('LocalStorage limit reached for image library:', e);
      }
    }

    if (onNotify) {
      onNotify(`Picture inserted successfully (${(processedSizeBytes / 1024).toFixed(1)} KB ${format})`);
    }

    onClose();
  };

  // Delete an image from local storage library
  const handleDeleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = libraryImages.filter((item) => item.id !== id);
      setLibraryImages(updated);
      localStorage.setItem(STORAGE_KEY_IMAGE_LIB, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update library:', err);
    }
  };

  if (!isOpen) return null;

  const filteredSamples = SAMPLE_ILLUSTRATIONS.filter((s) => {
    const matchesCat = sampleCategory === 'All' || s.category === sampleCategory;
    const matchesQuery =
      s.title.toLowerCase().includes(sampleSearch.toLowerCase()) ||
      s.alt.toLowerCase().includes(sampleSearch.toLowerCase()) ||
      s.caption.toLowerCase().includes(sampleSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar matching Photo (Solid Blue with Title and Close X) */}
        <div className="bg-[#185abd] text-white px-5 py-3.5 flex items-center justify-between select-none shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <ImageIcon size={20} className="text-white" />
            <h2 className="text-base font-bold tracking-tight">Insert Picture</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Row matching Photo */}
        <div className="flex items-center space-x-1 px-4 pt-2 border-b border-neutral-200 bg-neutral-50/70 select-none shrink-0 text-xs font-semibold overflow-x-auto">
          {/* Tab 1: From This Device */}
          <button
            onClick={() => setActiveTab('device')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'device'
                ? 'border-[#185abd] text-[#185abd] font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Upload size={14} className={activeTab === 'device' ? 'text-[#185abd]' : 'text-neutral-400'} />
            <span>From This Device</span>
          </button>

          {/* Tab 2: Sample Illustrations */}
          <button
            onClick={() => setActiveTab('samples')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'samples'
                ? 'border-[#185abd] text-[#185abd] font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Sample Illustrations</span>
          </button>

          {/* Tab 3: Image Web URL */}
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#185abd] text-[#185abd] font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <LinkIcon size={14} className={activeTab === 'url' ? 'text-[#185abd]' : 'text-neutral-400'} />
            <span>Image Web URL</span>
          </button>

          {/* Tab 4: From Clipboard */}
          <button
            onClick={() => setActiveTab('clipboard')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'clipboard'
                ? 'border-[#185abd] text-[#185abd] font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Clipboard size={14} className={activeTab === 'clipboard' ? 'text-[#185abd]' : 'text-neutral-400'} />
            <span>From Clipboard</span>
          </button>

          {/* Tab 5: Local Storage Library */}
          <button
            onClick={() => setActiveTab('library')}
            className={`pb-2.5 px-3 flex items-center space-x-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'library'
                ? 'border-[#185abd] text-[#185abd] font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Database size={14} className={activeTab === 'library' ? 'text-[#185abd]' : 'text-neutral-400'} />
            <span>Saved Library ({libraryImages.length})</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-700 flex items-center justify-between shrink-0">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold">
              &times;
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: FROM THIS DEVICE / ACTIVE SELECTION */}
          {activeTab === 'device' && (
            <div className="space-y-4">
              {/* Dropzone Container matching Photo */}
              {!selectedImageSrc ? (
                <div
                  ref={dropzoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragOver
                      ? 'border-[#185abd] bg-blue-50/50 scale-[0.99]'
                      : 'border-sky-300 bg-sky-50/20 hover:border-sky-400 hover:bg-sky-50/40'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-[#185abd] shadow-2xs">
                      <Upload size={26} />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-800 text-sm">Select an image from your computer</h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        PNG, JPEG, WebP, GIF, SVG (Inlined as Base64 Data URL)
                      </p>
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0d3f85] text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-xs hover:shadow-md"
                    >
                      <Upload size={14} />
                      <span>Choose Local Image File</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected Image Preview Box */
                <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
                  <div className="relative w-48 h-36 bg-white border border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1">
                    <img
                      src={processedDataUrl || selectedImageSrc}
                      alt={altText || 'Preview'}
                      className="max-h-full max-w-full object-contain"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/75 backdrop-blur-2xs flex items-center justify-center text-xs font-semibold text-[#185abd]">
                        <RefreshCw size={18} className="animate-spin mr-1.5" />
                        <span>Optimizing...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 text-sm truncate max-w-[260px]">
                        {originalName}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedImageSrc(null);
                          setProcessedDataUrl(null);
                        }}
                        className="text-neutral-400 hover:text-red-600 transition-colors cursor-pointer text-xs flex items-center space-x-1"
                        title="Remove selected image"
                      >
                        <X size={14} />
                        <span>Change</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                      <div>
                        <span className="text-neutral-400 block">Original Dimensions:</span>
                        <span className="font-semibold text-neutral-800">
                          {originalDimensions.width} &times; {originalDimensions.height} px
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Processed Dimensions:</span>
                        <span className="font-semibold text-indigo-700">
                          {processedDimensions.width || originalDimensions.width} &times;{' '}
                          {processedDimensions.height || originalDimensions.height} px
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Original Size:</span>
                        <span className="font-semibold text-neutral-800">
                          {originalSizeBytes > 0 ? `${(originalSizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">Target Size ({format}):</span>
                        <span className="font-semibold text-emerald-600">
                          {(processedSizeBytes / 1024).toFixed(1)} KB
                          {originalSizeBytes > 0 && processedSizeBytes < originalSizeBytes && (
                            <span className="ml-1 text-[10px] text-emerald-700 font-bold">
                              (-{Math.round(((originalSizeBytes - processedSizeBytes) / originalSizeBytes) * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFileSelect(files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Bottom Optimization Controls matching User Photo Exactly */}
              <div className="pt-2 border-t border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                {/* LEFT COLUMN: RESIZE & WEB OPTIMIZATION */}
                <div className="space-y-4">
                  {/* Resize (Re-encode) — Height Auto */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 tracking-wider uppercase mb-1.5">
                      Resize (Re-Encode) &mdash; Height Auto
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { label: 'Orig', val: 'original' as const },
                        { label: '600', val: 600 },
                        { label: '800', val: 800 },
                        { label: '1200', val: 1200 },
                        { label: '1600', val: 1600 },
                      ].map((item) => (
                        <button
                          key={String(item.val)}
                          type="button"
                          onClick={() => setTargetWidth(item.val)}
                          className={`py-1.5 px-2 rounded text-xs font-semibold text-center border transition-all cursor-pointer ${
                            targetWidth === item.val
                              ? 'bg-[#185abd] text-white border-[#185abd] shadow-2xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Web Optimization Format */}
                  <div>
                    <span className="block text-[11px] font-bold text-neutral-600 tracking-wider uppercase mb-1.5">
                      Web Optimization
                    </span>
                    <span className="block text-xs text-neutral-500 mb-1">Format</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['WebP', 'JPG', 'PNG'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setFormat(fmt)}
                          className={`py-1.5 rounded text-xs font-bold text-center border transition-all cursor-pointer ${
                            format === fmt
                              ? 'bg-[#185abd] text-white border-[#185abd] shadow-2xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: COMPRESS, ALT TEXT, CAPTION */}
                <div className="space-y-3">
                  {/* Compress for Web */}
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1.5">Compress for Web</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[60, 70, 80, 90, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCompressionPercent(pct)}
                          className={`py-1.5 rounded text-xs font-bold text-center border transition-all cursor-pointer ${
                            compressionPercent === pct
                              ? 'bg-[#185abd] text-white border-[#185abd] shadow-2xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alt Text (SEO) */}
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Alt Text (SEO)</label>
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Describe the image..."
                      className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd] bg-white placeholder-neutral-400"
                    />
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Caption</label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Caption shown below image"
                      className="w-full text-xs px-3 py-1.5 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd] bg-white placeholder-neutral-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SAMPLE ILLUSTRATIONS & PHOTOS */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              {/* Category Filter and Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto text-xs">
                  {['All', 'Business', 'Tech', 'Analytics', 'Design', 'Nature'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSampleCategory(cat)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        sampleCategory === cat
                          ? 'bg-[#185abd] text-white shadow-2xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
                  <input
                    type="text"
                    value={sampleSearch}
                    onChange={(e) => setSampleSearch(e.target.value)}
                    placeholder="Search illustrations..."
                    className="w-full pl-8 pr-3 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
                  />
                </div>
              </div>

              {/* Sample Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {filteredSamples.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="group border border-neutral-200 hover:border-[#185abd] rounded-lg overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="h-28 bg-neutral-100 overflow-hidden relative">
                      <img
                        src={sample.url}
                        alt={sample.alt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                        {sample.category}
                      </span>
                    </div>

                    <div className="p-2.5">
                      <div className="font-semibold text-xs text-neutral-800 truncate" title={sample.title}>
                        {sample.title}
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">{sample.alt}</p>
                      <button className="mt-2 w-full py-1 bg-blue-50 group-hover:bg-[#185abd] text-[#185abd] group-hover:text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1">
                        <span>Select Sample</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: IMAGE WEB URL */}
          {activeTab === 'url' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">Enter Image URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 text-xs px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#185abd]"
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={!urlInput.trim() || isProcessing}
                    className="px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <ArrowRight size={14} />
                    <span>Load Image</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Direct image links (HTTPS) will be fetched and converted into self-contained Base64 for offline portability.
                </p>
              </div>

              {/* Quick URL presets */}
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-600 block">Quick Preset URLs:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: 'Office Desk', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80' },
                    { label: 'Analytics Chart', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
                    { label: 'Technology', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setUrlInput(p.url);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-neutral-200 rounded text-neutral-700 hover:text-[#185abd] transition-colors cursor-pointer text-[11px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FROM CLIPBOARD */}
          {activeTab === 'clipboard' && (
            <div className="space-y-4 py-3 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-[#185abd] flex items-center justify-center mx-auto shadow-2xs">
                  <Clipboard size={30} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800 text-sm">Paste From System Clipboard</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Take a screenshot (e.g. Snipping Tool / Win+Shift+S / Command+Shift+4) or copy any image from another tab, then paste it here directly.
                  </p>
                </div>

                <div className="p-4 border-2 border-dashed border-[#185abd] bg-blue-50/30 rounded-xl space-y-2">
                  <button
                    onClick={handleReadClipboard}
                    className="px-4 py-2 bg-[#185abd] hover:bg-[#114b9c] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 mx-auto cursor-pointer shadow-xs"
                  >
                    <Clipboard size={14} />
                    <span>Read Image from Clipboard</span>
                  </button>
                  <p className="text-[11px] text-neutral-400">or simply press <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded font-mono text-[10px] text-neutral-700">Ctrl + V</kbd> anywhere</p>
                </div>

                {clipboardStatus && (
                  <div className="text-xs text-indigo-700 font-medium animate-fadeIn">
                    {clipboardStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: LOCAL STORAGE SAVED LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">
                  {libraryImages.length} images stored locally in your browser
                </span>
                {libraryImages.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all stored images from your browser storage?')) {
                        localStorage.removeItem(STORAGE_KEY_IMAGE_LIB);
                        setLibraryImages([]);
                      }
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold cursor-pointer flex items-center space-x-1"
                  >
                    <Trash2 size={13} />
                    <span>Clear Library</span>
                  </button>
                )}
              </div>

              {libraryImages.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-neutral-400 text-xs">
                  <Database size={32} className="mx-auto text-neutral-300" />
                  <p className="font-semibold text-neutral-600">Your Local Image Library is Empty</p>
                  <p className="max-w-xs mx-auto text-neutral-400">
                    Whenever you insert pictures with "Save copy to Local Storage Library" checked, they are remembered here for fast reuse.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {libraryImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => {
                        setSelectedImageSrc(img.dataUrl);
                        setOriginalName(img.name);
                        setAltText(img.alt || img.name);
                        setCaption(img.caption || '');
                        setActiveTab('device');
                      }}
                      className="group border border-neutral-200 hover:border-[#185abd] rounded-lg overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="h-28 bg-neutral-100 flex items-center justify-center p-1 relative overflow-hidden">
                        <img
                          src={img.dataUrl}
                          alt={img.alt || img.name}
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          onClick={(e) => handleDeleteFromLibrary(img.id, e)}
                          className="absolute top-1.5 right-1.5 p-1 bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-full transition-colors shadow-2xs cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Delete from local storage"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="p-2 text-xs">
                        <div className="font-bold text-neutral-800 truncate" title={img.name}>
                          {img.name}
                        </div>
                        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                          <span>{img.format || 'WebP'}</span>
                          <span>{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer matching Office Dialogs */}
        <div className="bg-neutral-50 px-5 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none">
          {/* Left: Save to Local Storage Library Checkbox */}
          <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              className="rounded border-neutral-300 text-[#185abd] focus:ring-[#185abd]"
            />
            <span>Save copy to Local Storage Library</span>
          </label>

          {/* Right: Cancel & Insert Button */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleInsertIntoDocument}
              disabled={!selectedImageSrc || isProcessing}
              className="px-5 py-1.5 text-xs bg-[#185abd] hover:bg-[#114b9c] active:bg-[#0d3f85] disabled:opacity-50 text-white rounded font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Check size={14} />
              <span>
                {processedSizeBytes > 0
                  ? `Insert Picture (${(processedSizeBytes / 1024).toFixed(1)} KB)`
                  : 'Insert Picture'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsertPictureModal;
