import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Image as ImageIcon,
  X,
  Link as LinkIcon,
  Upload,
  Wand2,
  ImagePlus,
  RotateCcw,
  Trash2,
  Check,
  Camera,
  Download,
} from 'lucide-react';
import { ScreenCaptureTool } from './ScreenCaptureTool';
import { snapshotStore } from '../utils/snapshotStore';
import { captureDocumentScreenSnapshot } from '../utils/screenSnapshot';

interface ImageWizardSidebarProps {
  editor: Editor | null;
  onClose: () => void;
}

// High-fidelity SVG sample diagram matching HVAC Error Codes reference
const DEFAULT_HVAC_SAMPLE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" width="1536" height="1024" style="background:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Header Bar -->
  <rect x="0" y="0" width="1536" height="140" fill="#ffffff"/>
  <circle cx="90" cy="70" r="35" fill="none" stroke="#ea580c" stroke-width="12" stroke-dasharray="140 30"/>
  <circle cx="90" cy="70" r="22" fill="none" stroke="#0284c7" stroke-width="10" stroke-dasharray="80 20"/>
  <text x="145" y="65" font-size="32" font-weight="900" fill="#0f172a" letter-spacing="1">YOUR COMPANY</text>
  <text x="147" y="90" font-size="16" font-weight="600" fill="#64748b" letter-spacing="2">HEATING • COOLING • COMFORT</text>
  
  <text x="540" y="65" font-size="44" font-weight="900" fill="#0f2b5c" letter-spacing="1">HVAC ERROR CODES</text>
  <text x="540" y="95" font-size="18" font-weight="500" fill="#475569">Quick reference guide to commonly reported error codes.</text>
  
  <rect x="1170" y="25" width="310" height="90" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="1225" y="60" font-size="18" font-weight="800" fill="#0f2b5c">NEED SERVICE?</text>
  <text x="1225" y="85" font-size="14" font-weight="500" fill="#64748b">Contact our team for fast, reliable service.</text>
  
  <!-- Table Header -->
  <rect x="50" y="150" width="1436" height="50" fill="#0f2b5c"/>
  <text x="80" y="182" font-size="16" font-weight="800" fill="#ffffff">ERROR CODE</text>
  <text x="260" y="182" font-size="16" font-weight="800" fill="#ffffff">SYSTEM / COMPONENT</text>
  <text x="520" y="182" font-size="16" font-weight="800" fill="#ffffff">DESCRIPTION</text>
  <text x="850" y="182" font-size="16" font-weight="800" fill="#ffffff">POSSIBLE CAUSES</text>
  <text x="1190" y="182" font-size="16" font-weight="800" fill="#ffffff">RECOMMENDED ACTION</text>
  
  <!-- Rows -->
  <!-- E1 -->
  <rect x="50" y="200" width="1436" height="75" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="70" y="215" width="65" height="45" rx="6" fill="#ef4444"/>
  <text x="88" y="246" font-size="22" font-weight="900" fill="#ffffff">E1</text>
  <text x="260" y="245" font-size="16" font-weight="700" fill="#1e293b">Thermostat Communication</text>
  <text x="520" y="245" font-size="15" fill="#334155">Loss of communication between thermostat and indoor unit.</text>
  <text x="850" y="235" font-size="14" fill="#475569">• Loose wiring</text>
  <text x="850" y="258" font-size="14" fill="#475569">• Power loss</text>
  <text x="1190" y="235" font-size="14" fill="#475569">• Check wiring connections</text>
  <text x="1190" y="258" font-size="14" fill="#475569">• Verify power to thermostat</text>
  
  <!-- E2 -->
  <rect x="50" y="275" width="1436" height="75" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="70" y="290" width="65" height="45" rx="6" fill="#f97316"/>
  <text x="88" y="321" font-size="22" font-weight="900" fill="#ffffff">E2</text>
  <text x="260" y="320" font-size="16" font-weight="700" fill="#1e293b">Indoor Air Sensor</text>
  <text x="520" y="320" font-size="15" fill="#334155">Indoor temperature sensor malfunction.</text>
  <text x="850" y="310" font-size="14" fill="#475569">• Sensor disconnected</text>
  <text x="850" y="333" font-size="14" fill="#475569">• Sensor failure</text>
  <text x="1190" y="310" font-size="14" fill="#475569">• Check sensor connection</text>
  <text x="1190" y="333" font-size="14" fill="#475569">• Replace sensor if defective</text>
  
  <!-- E3 -->
  <rect x="50" y="350" width="1436" height="75" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="70" y="365" width="65" height="45" rx="6" fill="#eab308"/>
  <text x="88" y="396" font-size="22" font-weight="900" fill="#ffffff">E3</text>
  <text x="260" y="395" font-size="16" font-weight="700" fill="#1e293b">Outdoor Unit Communication</text>
  <text x="520" y="395" font-size="15" fill="#334155">Loss of communication between indoor and outdoor coils.</text>
  <text x="850" y="385" font-size="14" fill="#475569">• Wiring issue</text>
  <text x="850" y="408" font-size="14" fill="#475569">• Inverter board fault</text>
  <text x="1190" y="385" font-size="14" fill="#475569">• Inspect wiring</text>
  <text x="1190" y="408" font-size="14" fill="#475569">• Reset system</text>
  
  <!-- E4 -->
  <rect x="50" y="425" width="1436" height="75" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="70" y="440" width="65" height="45" rx="6" fill="#84cc16"/>
  <text x="88" y="471" font-size="22" font-weight="900" fill="#ffffff">E4</text>
  <text x="260" y="470" font-size="16" font-weight="700" fill="#1e293b">High Pressure Lockout</text>
  <text x="520" y="470" font-size="15" fill="#334155">System pressure is too high.</text>
  <text x="850" y="460" font-size="14" fill="#475569">• Dirty condenser coil</text>
  <text x="850" y="483" font-size="14" fill="#475569">• Blocked airflow</text>
  <text x="1190" y="460" font-size="14" fill="#475569">• Clean condenser coil</text>
  <text x="1190" y="483" font-size="14" fill="#475569">• Check airflow around unit</text>
  
  <!-- E5 -->
  <rect x="50" y="500" width="1436" height="75" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="70" y="515" width="65" height="45" rx="6" fill="#06b6d4"/>
  <text x="88" y="546" font-size="22" font-weight="900" fill="#ffffff">E5</text>
  <text x="260" y="545" font-size="16" font-weight="700" fill="#1e293b">Low Pressure Lockout</text>
  <text x="520" y="545" font-size="15" fill="#334155">System pressure is too low.</text>
  <text x="850" y="535" font-size="14" fill="#475569">• Refrigerant leak</text>
  <text x="850" y="558" font-size="14" fill="#475569">• Expansion valve issue</text>
  <text x="1190" y="535" font-size="14" fill="#475569">• Check for leaks</text>
  <text x="1190" y="558" font-size="14" fill="#475569">• Test expansion valve</text>
  
  <!-- E6 -->
  <rect x="50" y="575" width="1436" height="75" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="70" y="590" width="65" height="45" rx="6" fill="#8b5cf6"/>
  <text x="88" y="621" font-size="22" font-weight="900" fill="#ffffff">E6</text>
  <text x="260" y="620" font-size="16" font-weight="700" fill="#1e293b">Compressor Overload</text>
  <text x="520" y="620" font-size="15" fill="#334155">Compressor is drawing excessive current.</text>
  <text x="850" y="610" font-size="14" fill="#475569">• Dirty coil</text>
  <text x="850" y="633" font-size="14" fill="#475569">• Faulty compressor</text>
  <text x="1190" y="610" font-size="14" fill="#475569">• Clean coil</text>
  <text x="1190" y="633" font-size="14" fill="#475569">• Replace compressor if needed</text>
  
  <!-- E7 -->
  <rect x="50" y="650" width="1436" height="75" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="70" y="665" width="65" height="45" rx="6" fill="#0d9488"/>
  <text x="88" y="696" font-size="22" font-weight="900" fill="#ffffff">E7</text>
  <text x="260" y="695" font-size="16" font-weight="700" fill="#1e293b">Condensate Overflow</text>
  <text x="520" y="695" font-size="15" fill="#334155">Condensate drain pan is full or sensor tripped.</text>
  <text x="850" y="685" font-size="14" fill="#475569">• Clogged drain line</text>
  <text x="850" y="708" font-size="14" fill="#475569">• Drain pan float switch trip</text>
  <text x="1190" y="685" font-size="14" fill="#475569">• Clear drain line</text>
  <text x="1190" y="708" font-size="14" fill="#475569">• Check float switch</text>
  
  <!-- E8 -->
  <rect x="50" y="725" width="1436" height="75" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="70" y="740" width="65" height="45" rx="6" fill="#1e3a8a"/>
  <text x="88" y="771" font-size="22" font-weight="900" fill="#ffffff">E8</text>
  <text x="260" y="770" font-size="16" font-weight="700" fill="#1e293b">System Freeze Protection</text>
  <text x="520" y="770" font-size="15" fill="#334155">Evaporator coil temperature is frozen.</text>
  <text x="850" y="760" font-size="14" fill="#475569">• Low refrigerant</text>
  <text x="850" y="783" font-size="14" fill="#475569">• Restricted airflow</text>
  <text x="1190" y="760" font-size="14" fill="#475569">• Check airflow and filters</text>
  <text x="1190" y="783" font-size="14" fill="#475569">• Inspect sensor if needed</text>
  
  <!-- Footer Bar -->
  <rect x="0" y="884" width="1536" height="140" fill="#0f2b5c"/>
  <text x="100" y="960" font-size="20" font-weight="500" fill="#e2e8f0">Your comfort is our top priority. We're here to help!</text>
  <text x="650" y="960" font-size="22" font-weight="800" fill="#38bdf8">📞 (123) 456-7890</text>
  <text x="1100" y="960" font-size="20" font-weight="500" fill="#e2e8f0">🌐 www.yourcompany.com</text>
</svg>
`)}`;

export const ImageWizardSidebar: React.FC<ImageWizardSidebarProps> = ({ editor, onClose }) => {
  // Current active image source (prioritizes pending snapshot delivered to this lazy component)
  const [imageSrc, setImageSrc] = useState<string>(() => {
    const pending = snapshotStore.consumePendingForWizard();
    if (pending && pending.length > 50) return pending;
    const latest = snapshotStore.getLatestSnapshot();
    if (latest && latest.length > 50) return latest;
    return DEFAULT_HVAC_SAMPLE;
  });
  const [urlInput, setUrlInput] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showScreenCaptureTool, setShowScreenCaptureTool] = useState(false);
  const [screenCaptureBaseImage, setScreenCaptureBaseImage] = useState<string | null>(null);
  
  // Dimensions & sizes
  const [naturalWidth, setNaturalWidth] = useState<number>(1536);
  const [naturalHeight, setNaturalHeight] = useState<number>(1024);
  const [displayWidth, setDisplayWidth] = useState<number>(1536);
  const [displayHeight, setDisplayHeight] = useState<number>(1024);
  const [sizeKb, setSizeKb] = useState<number>(140);

  // Resize settings
  const [targetWidth, setTargetWidth] = useState<number | null>(null);

  // Web Optimization options
  const [format, setFormat] = useState<'WebP' | 'JPG' | 'PNG'>('WebP');
  const [qualityPercent, setQualityPercent] = useState<number>(80);
  const [altText, setAltText] = useState<string>('');
  const [caption, setCaption] = useState<string>('');

  // Status message
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Hook into snapshotStore and CustomEvent to receive snapshots across lazy-loading boundaries
  useEffect(() => {
    // 1. Mark that wizard is now mounted and ready
    snapshotStore.markWizardReady();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('word_image_wizard_ready'));
    }

    // 2. Check for any pending snapshot that arrived during lazy load chunk fetch
    const pending = snapshotStore.consumePendingForWizard();
    if (pending && pending.length > 50) {
      setImageSrc(pending);
      setTargetWidth(null);
      setAppliedMessage('📸 Loaded snapshot! Ready to resize & paste.');
      setTimeout(() => setAppliedMessage(null), 3500);
    }

    // 3. Subscribe to reactive snapshotStore
    const unsubscribe = snapshotStore.subscribe((newSrc: string) => {
      if (newSrc && newSrc.length > 50) {
        setImageSrc(newSrc);
        setTargetWidth(null);
        setAppliedMessage('📸 Loaded snapshot! Ready to resize & paste.');
        setTimeout(() => setAppliedMessage(null), 3500);
      }
    });

    // 4. Also listen for custom event as backup
    const handleWizardLoad = (e: Event) => {
      const customEvent = e as CustomEvent<{ src: string }>;
      if (customEvent.detail?.src) {
        setImageSrc(customEvent.detail.src);
        setTargetWidth(null);
        setAppliedMessage('📸 Loaded snapshot! Ready to resize & paste.');
        setTimeout(() => setAppliedMessage(null), 3500);
      }
    };
    window.addEventListener('word_image_wizard_load', handleWizardLoad);

    return () => {
      unsubscribe();
      window.removeEventListener('word_image_wizard_load', handleWizardLoad);
    };
  }, []);

  // Screen capture tool function directly available in Image Wizard
  const handleCaptureScreenSnapshot = async () => {
    setIsCapturing(true);
    setAppliedMessage('📸 Capturing document screen...');
    try {
      const result = await captureDocumentScreenSnapshot({ pixelRatio: 1.5 });
      if (!result.success || !result.dataUrl) {
        throw new Error(result.error || 'Failed to generate document screenshot');
      }

      setScreenCaptureBaseImage(result.dataUrl);
      setShowScreenCaptureTool(true);
      setAppliedMessage('✂️ Screen Capture Tool ready! Drag to select an area.');
      setTimeout(() => setAppliedMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to capture snapshot in Image Wizard:', err);
      const failMsg = err?.message || 'Screen capture failed. Check document visibility.';
      setAppliedMessage(`❌ ${failMsg}`);
      setTimeout(() => setAppliedMessage(null), 4500);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmAreaCapture = (capturedAreaUrl: string) => {
    setShowScreenCaptureTool(false);
    setImageSrc(capturedAreaUrl);
    setTargetWidth(null);
    snapshotStore.setLatestSnapshot(capturedAreaUrl, 'snip');
    setAppliedMessage('📸 Snipped area loaded into Image Wizard!');
    setTimeout(() => setAppliedMessage(null), 3000);
  };

  // Check if an image is currently selected in the editor
  useEffect(() => {
    if (!editor) return;

    const checkActiveImage = () => {
      if (editor.isActive('image')) {
        const attrs = editor.getAttributes('image');
        if (attrs.src && attrs.src !== imageSrc) {
          setImageSrc(attrs.src);
          if (attrs.alt) setAltText(attrs.alt);
          if (attrs.title) setCaption(attrs.title);
        }
      }
    };

    checkActiveImage();
    editor.on('selectionUpdate', checkActiveImage);
    return () => {
      editor.off('selectionUpdate', checkActiveImage);
    };
  }, [editor]);

  // Load natural dimensions whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nw = img.naturalWidth || 1536;
      const nh = img.naturalHeight || 1024;
      setNaturalWidth(nw);
      setNaturalHeight(nh);

      // If user selected a target width, calculate proportional display height
      if (targetWidth) {
        setDisplayWidth(targetWidth);
        setDisplayHeight(Math.round((nh / nw) * targetWidth));
      } else {
        setDisplayWidth(nw);
        setDisplayHeight(nh);
      }

      // Estimate size if data URL or approximate
      if (imageSrc.startsWith('data:')) {
        const approxBytes = Math.round(imageSrc.length * 0.75);
        setSizeKb(Math.max(1, Math.round(approxBytes / 1024)));
      } else {
        setSizeKb(140);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, targetWidth]);

  // Handle Target Width Selection (600, 800, 1200, 1600)
  const handleSelectWidth = (w: number) => {
    if (targetWidth === w) {
      setTargetWidth(null);
      setDisplayWidth(naturalWidth);
      setDisplayHeight(naturalHeight);
    } else {
      setTargetWidth(w);
      setDisplayWidth(w);
      if (naturalWidth > 0) {
        setDisplayHeight(Math.round((naturalHeight / naturalWidth) * w));
      }
    }
  };

  // Handle Load from Web URL
  const handleLoadUrl = () => {
    if (!urlInput.trim()) return;
    setImageSrc(urlInput.trim());
    setTargetWidth(null);
    setUrlInput('');
  };

  // Handle Local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setImageSrc(event.target.result);
          setTargetWidth(null);
          setSizeKb(Math.round(file.size / 1024));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Paste support: user can paste image anywhere while sidebar is open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              if (typeof evt.target?.result === 'string') {
                setImageSrc(evt.target.result);
                setTargetWidth(null);
                setSizeKb(Math.round(file.size / 1024));
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Primary Action: Apply Optimization
  const handleApplyOptimization = () => {
    if (!imageSrc || !editor) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const outWidth = targetWidth || img.naturalWidth || 800;
        const outHeight = Math.round((img.naturalHeight / img.naturalWidth) * outWidth);

        canvas.width = outWidth;
        canvas.height = outHeight;

        if (ctx) {
          ctx.drawImage(img, 0, 0, outWidth, outHeight);

          // Determine mime type
          let mime = 'image/webp';
          if (format === 'JPG') mime = 'image/jpeg';
          else if (format === 'PNG') mime = 'image/png';

          const quality = qualityPercent / 100;
          let finalDataUrl = imageSrc;

          try {
            finalDataUrl = canvas.toDataURL(mime, quality);
          } catch {
            // If cross-origin prevented toDataURL, fallback to imageSrc
            finalDataUrl = imageSrc;
          }

          // Insert or update in TipTap
          editor
            .chain()
            .focus()
            .setImage({
              src: finalDataUrl,
              alt: altText || undefined,
              title: caption || undefined,
            })
            .run();

          // Show applied confirmation
          setAppliedMessage(`Optimized (${format} ${qualityPercent}%, ${outWidth}px)`);
          setTimeout(() => setAppliedMessage(null), 3000);
        }
      };

      img.onerror = () => {
        // Direct insertion fallback
        editor
          .chain()
          .focus()
          .setImage({
            src: imageSrc,
            alt: altText || undefined,
            title: caption || undefined,
          })
          .run();
        setAppliedMessage('Inserted image into document');
        setTimeout(() => setAppliedMessage(null), 3000);
      };

      img.src = imageSrc;
    } catch {
      editor
        .chain()
        .focus()
        .setImage({
          src: imageSrc,
          alt: altText || undefined,
          title: caption || undefined,
        })
        .run();
    }
  };

  // Reset to original HVAC sample or clear options
  const handleReset = () => {
    setImageSrc(DEFAULT_HVAC_SAMPLE);
    setTargetWidth(null);
    setFormat('WebP');
    setQualityPercent(80);
    setAltText('');
    setCaption('');
  };

  // Delete image from document
  const handleDelete = () => {
    if (editor) {
      if (editor.isActive('image')) {
        editor.chain().focus().deleteSelection().run();
      }
    }
    setImageSrc('');
    setNaturalWidth(0);
    setNaturalHeight(0);
    setDisplayWidth(0);
    setDisplayHeight(0);
    setSizeKb(0);
    setAppliedMessage('Image removed');
    setTimeout(() => setAppliedMessage(null), 2500);
  };

  return (
    <aside
      id="image-wizard-sidebar"
      className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full z-20 select-none shadow-xl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-base">
          <ImageIcon size={18} className="text-slate-700" />
          <span>Image Wizard</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
          title="Close Image Wizard"
        >
          <X size={14} />
          <span>Exit</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-slate-700">
        {/* Toast confirmation */}
        {appliedMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-lg flex items-center space-x-2 text-xs font-medium animate-in fade-in">
            <Check size={14} className="text-emerald-600" />
            <span>{appliedMessage}</span>
          </div>
        )}

        {/* IMAGE SOURCE SECTION */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            IMAGE SOURCE
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
              From Web (URL)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#253468]"
              />
              <button
                onClick={handleLoadUrl}
                title="Load image from URL"
                className="p-2.5 bg-[#253468] hover:bg-[#1a254c] text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                <LinkIcon size={16} />
              </button>
            </div>
          </div>

          {/* Upload Local Image Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#253468] hover:bg-[#1a254c] text-white font-medium py-2 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 text-xs cursor-pointer shadow-xs transition-colors"
            >
              <Upload size={14} />
              <span>Upload Image</span>
            </button>
            <button
              onClick={handleCaptureScreenSnapshot}
              disabled={isCapturing}
              className="w-full bg-[#059669] hover:bg-[#047857] text-white font-medium py-2 px-2.5 rounded-lg flex items-center justify-center space-x-1.5 text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
              title="Capture screen snapshot of the document"
            >
              <Camera size={14} className={isCapturing ? 'animate-pulse' : ''} />
              <span>{isCapturing ? 'Capturing...' : 'Screen Snapshot'}</span>
            </button>
          </div>

          {/* Helper tip */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
            <span className="flex items-center space-x-1">
              <span>💡</span>
              <span>Paste with Ctrl+V or capture snapshot</span>
            </span>
          </div>
        </div>

        {/* IMAGE PREVIEW CARD */}
        {imageSrc ? (
          <div className="space-y-1.5">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex flex-col items-center justify-center shadow-xs">
              <img
                src={imageSrc}
                alt={altText || 'Preview'}
                className="w-full max-h-44 object-contain rounded-lg border border-slate-200 bg-white"
              />
            </div>
            {/* Image Details matching screenshot */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5 pt-1">
              <div>
                <div>Natural: {naturalWidth} × {naturalHeight}</div>
                <div>Original size: ≈ {sizeKb} KB</div>
              </div>
              <div className="text-right">
                <div>Display: {displayWidth} × {displayHeight} px</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
            <ImageIcon size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs">No image loaded</p>
            <button
              onClick={() => setImageSrc(DEFAULT_HVAC_SAMPLE)}
              className="mt-2 text-xs text-[#253468] underline font-medium cursor-pointer"
            >
              Load Sample Diagram
            </button>
          </div>
        )}

        {/* RESIZE (RE-ENCODE) — HEIGHT AUTO SECTION */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            RESIZE (RE-ENCODE) — HEIGHT AUTO
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[600, 800, 1200, 1600].map((w) => {
              const isSelected = targetWidth === w;
              return (
                <button
                  key={w}
                  onClick={() => handleSelectWidth(w)}
                  className={`py-2 px-3 rounded-lg border text-center font-medium text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#253468] text-white border-[#253468] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>

        {/* WEB OPTIMIZATION SECTION */}
        <div className="space-y-3.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            WEB OPTIMIZATION
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['WebP', 'JPG', 'PNG'] as const).map((fmt) => {
                const isSelected = format === fmt;
                return (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`py-2 px-3 rounded-lg border text-center font-medium text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#253468] text-white border-[#253468] font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compress for Web */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
              Compress for Web
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[60, 70, 80, 90, 100].map((pct) => {
                const isSelected = qualityPercent === pct;
                return (
                  <button
                    key={pct}
                    onClick={() => setQualityPercent(pct)}
                    className={`py-2 px-1.5 rounded-lg border text-center font-medium text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#253468] text-white border-[#253468] font-semibold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alt Text (SEO) */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
              Alt Text (SEO)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#253468]"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">
              Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption shown below image"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#253468]"
            />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2">
        {/* Primary Paste to Document Button */}
        <button
          onClick={handleApplyOptimization}
          className="w-full bg-[#185abd] hover:bg-[#134896] text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm shadow-sm cursor-pointer transition-colors"
          title="Resize, optimize and paste/insert this image into the document at cursor position"
        >
          <Check size={16} />
          <span>Paste / Insert to Document</span>
        </button>

        {/* Secondary Apply Optimization Button */}
        <button
          onClick={handleApplyOptimization}
          className="w-full bg-[#253468] hover:bg-[#1a254c] text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 text-xs shadow-xs cursor-pointer transition-colors"
        >
          <Wand2 size={14} />
          <span>Apply Optimization ({format} {qualityPercent}%)</span>
        </button>

        {/* Secondary Actions: Replace, Reset, Delete */}
        <div className="grid grid-cols-3 gap-2">
          {/* Replace */}
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="py-2 px-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-1 font-medium text-xs cursor-pointer transition-colors"
            title="Replace with new local image"
          >
            <ImagePlus size={14} />
            <span>Replace</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="py-2 px-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-1 font-medium text-xs cursor-pointer transition-colors"
            title="Reset settings to defaults"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="py-2 px-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg flex items-center justify-center space-x-1 font-medium text-xs cursor-pointer transition-colors shadow-xs"
            title="Delete active image"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Lightweight Interactive Screen Capture Tool */}
      {showScreenCaptureTool && screenCaptureBaseImage && (
        <ScreenCaptureTool
          isOpen={showScreenCaptureTool}
          baseImageUrl={screenCaptureBaseImage}
          onClose={() => setShowScreenCaptureTool(false)}
          onConfirmCapture={handleConfirmAreaCapture}
        />
      )}
    </aside>
  );
};
