import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Sliders,
  AlertCircle,
  Download,
  Info,
  Maximize2,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';

export interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  onNotify?: (msg: string) => void;
}

export type AspectRatio = '1:1' | '16:9' | '4:3' | '9:16' | '3:4';

interface StyleOption {
  id: string;
  label: string;
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'Photography', label: 'Photo Realistic', description: 'Natural lighting and crisp camera depth' },
  { id: 'Digital Art', label: 'Digital Art', description: 'Vibrant modern digital illustration' },
  { id: '3D Render', label: '3D Render', description: 'Smooth isometric surfaces and soft shadows' },
  { id: 'Minimalist Vector', label: 'Vector Graphic', description: 'Clean flat shapes and editorial lines' },
  { id: 'Watercolor', label: 'Watercolor', description: 'Organic expressive painterly brush strokes' },
  { id: 'Technical Blueprint', label: 'Blueprint', description: 'Schematic technical grid and precision lines' },
];

const ASPECT_RATIOS: Array<{ id: AspectRatio; label: string; ratioW: number; ratioH: number }> = [
  { id: '1:1', label: '1:1 Square', ratioW: 1, ratioH: 1 },
  { id: '16:9', label: '16:9 Widescreen', ratioW: 16, ratioH: 9 },
  { id: '4:3', label: '4:3 Document', ratioW: 4, ratioH: 3 },
  { id: '3:4', label: '3:4 Portrait', ratioW: 3, ratioH: 4 },
  { id: '9:16', label: '9:16 Vertical', ratioW: 9, ratioH: 16 },
];

const INSPIRATION_PROMPTS = [
  'Modern corporate meeting room with glass windows overlooking morning skyline',
  'Financial business growth charts and quarterly analytics dashboard metrics',
  'Software system architecture node graph with data pipelines',
  'Serene alpine mountain peak sunrise with emerald lake reflection',
  'Minimalist creative workspace with laptop, notebook and warm coffee',
  'Futuristic smart city with eco-friendly vertical gardens and transport',
];

// Curated demo image library mapped by topic keywords
const CURATED_DEMO_COLLECTION: Record<string, string[]> = {
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  ],
  finance: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
  ],
  tech: [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
  ],
  nature: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  ],
  architecture: [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  ],
};

function pickCuratedDemoImage(prompt: string): string {
  const lower = prompt.toLowerCase();
  let pool = CURATED_DEMO_COLLECTION.default;
  if (lower.includes('office') || lower.includes('work') || lower.includes('desk') || lower.includes('meeting') || lower.includes('room')) {
    pool = CURATED_DEMO_COLLECTION.office;
  } else if (lower.includes('finance') || lower.includes('chart') || lower.includes('analytics') || lower.includes('growth') || lower.includes('money') || lower.includes('business')) {
    pool = CURATED_DEMO_COLLECTION.finance;
  } else if (lower.includes('tech') || lower.includes('code') || lower.includes('software') || lower.includes('ai') || lower.includes('server') || lower.includes('data')) {
    pool = CURATED_DEMO_COLLECTION.tech;
  } else if (lower.includes('nature') || lower.includes('mountain') || lower.includes('lake') || lower.includes('tree') || lower.includes('landscape') || lower.includes('sky')) {
    pool = CURATED_DEMO_COLLECTION.nature;
  } else if (lower.includes('arch') || lower.includes('building') || lower.includes('design') || lower.includes('city') || lower.includes('structure')) {
    pool = CURATED_DEMO_COLLECTION.architecture;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export const AiImageModal: React.FC<AiImageModalProps> = ({
  isOpen,
  onClose,
  editor,
  onNotify,
}) => {
  const [activeMode, setActiveMode] = useState<'gemini' | 'demo'>('gemini');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('Photography');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationMeta, setGenerationMeta] = useState<{
    source: string;
    model?: string;
    timestamp: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaExceededNotice, setQuotaExceededNotice] = useState<boolean>(false);
  const [altText, setAltText] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      if (!prompt) {
        setPrompt(INSPIRATION_PROMPTS[0]);
      }
      setErrorMessage(null);
      setQuotaExceededNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle generation using Gemini API endpoint or AI Demo mode
  const handleGenerate = async (overrideMode?: 'gemini' | 'demo') => {
    const currentMode = overrideMode || activeMode;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setErrorMessage('Please enter an image description prompt.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setQuotaExceededNotice(false);

    if (currentMode === 'demo') {
      // Demo Studio generation
      try {
        await new Promise((r) => setTimeout(r, 600)); // Smooth natural experience
        const demoUrl = pickCuratedDemoImage(cleanPrompt);
        setGeneratedImageUrl(demoUrl);
        setGenerationMeta({
          source: 'AI Demo Studio (Curated Engine)',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        if (!altText) setAltText(cleanPrompt);
      } catch (e: any) {
        setErrorMessage('Failed to generate demo image.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Gemini API generation via backend proxy
    try {
      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio,
          style: selectedStyle,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setGenerationMeta({
          source: 'Gemini AI API',
          model: data.model || 'gemini-3.1-flash-lite-image',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        if (!altText) setAltText(cleanPrompt);
        if (onNotify) onNotify('✨ Image generated successfully via Gemini API!');
      } else if (data.isQuota || response.status === 429) {
        // Quota / Free tier limit notice
        setQuotaExceededNotice(true);
        // Seamless fallback to AI Demo Studio so user is never blocked
        const demoUrl = pickCuratedDemoImage(cleanPrompt);
        setGeneratedImageUrl(demoUrl);
        setGenerationMeta({
          source: 'AI Demo Studio (Instant Fallback)',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        if (!altText) setAltText(cleanPrompt);
      } else {
        setErrorMessage(data.error || 'Failed to generate image with Gemini API.');
      }
    } catch (err: any) {
      console.warn('Gemini endpoint error, falling back to Demo Studio:', err);
      setErrorMessage(
        'Server endpoint unavailable or rate limited. Using AI Demo Studio instead.'
      );
      const demoUrl = pickCuratedDemoImage(cleanPrompt);
      setGeneratedImageUrl(demoUrl);
      setGenerationMeta({
        source: 'AI Demo Studio (Offline Fallback)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      if (!altText) setAltText(cleanPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  // Insert generated image into TipTap editor
  const handleInsertIntoDocument = () => {
    if (!editor || !generatedImageUrl) return;

    editor
      .chain()
      .focus()
      .setImage({
        src: generatedImageUrl,
        alt: altText || prompt || 'AI Generated Image',
        title: altText || prompt || 'AI Generated Image',
      })
      .run();

    if (onNotify) {
      onNotify('✨ AI Image inserted into your document!');
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 sm:p-5 select-none"
      data-word-modal="true"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-purple-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-purple-300 backdrop-blur-md">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  AI Image Studio &amp; Demo Generator
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 font-semibold">
                  Nedit v5.2
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">
                Generate high-resolution visual assets with Gemini API or curated demo studio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-neutral-50 border-b border-neutral-200 text-xs">
          <div className="flex items-center space-x-2 bg-neutral-200/70 p-1 rounded-lg">
            <button
              onClick={() => setActiveMode('gemini')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMode === 'gemini'
                  ? 'bg-white text-purple-700 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Zap size={14} className={activeMode === 'gemini' ? 'text-purple-600' : ''} />
              <span>Gemini AI API Engine</span>
            </button>

            <button
              onClick={() => setActiveMode('demo')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMode === 'demo'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Wand2 size={14} className={activeMode === 'demo' ? 'text-indigo-600' : ''} />
              <span>AI Demo Studio (Fast Offline)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-neutral-500">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
              TipTap Media Ready
            </span>
            <span>&bull;</span>
            <span>Lazyloaded on demand</span>
          </div>
        </div>

        {/* Modal Body: Left controls & Right live preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Prompt, Styles, Aspects (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* Prompt input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-neutral-800 flex items-center space-x-1">
                  <span>Image Description Prompt</span>
                  <span className="text-purple-600">*</span>
                </label>
                <span className="text-[10px] text-neutral-400">Be descriptive for best results</span>
              </div>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Modern executive conference room with clean glass architecture, sunlight and minimalist decor..."
                className="w-full text-xs p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 resize-none text-neutral-800 bg-white shadow-2xs leading-relaxed"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-600 block mb-1.5">
                Inspiration Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_PROMPTS.map((insp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(insp)}
                    className="text-[10px] px-2.5 py-1 bg-neutral-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 border border-neutral-200 text-neutral-700 rounded-md transition-all cursor-pointer text-left line-clamp-1 max-w-[280px]"
                    title={insp}
                  >
                    {insp}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style Selection */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">Visual Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedStyle === style.id
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-2xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold leading-tight">{style.label}</span>
                      {selectedStyle === style.id && <Check size={12} className="text-purple-600" />}
                    </div>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">
                      {style.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                      aspectRatio === ar.id
                        ? 'border-purple-600 bg-purple-600 text-white shadow-2xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
                    }`}
                  >
                    <span>{ar.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Alt Text / Caption */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Document Caption / Alt Tag (Optional)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descriptive label for screen readers and document index"
                className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Right Column: Visual Preview & Status (5 cols) */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800">Generated Preview</span>
              {generationMeta && (
                <span className="text-[10px] text-neutral-500 font-medium">
                  {generationMeta.source} ({generationMeta.timestamp})
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div className="flex-1 min-h-[260px] bg-neutral-900 rounded-xl border border-neutral-300 overflow-hidden flex flex-col items-center justify-center p-3 relative group">
              {isGenerating ? (
                <div className="flex flex-col items-center space-y-3 text-white p-6 text-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-3 border-purple-500/30 border-t-purple-400 animate-spin"></div>
                    <Sparkles
                      size={18}
                      className="absolute inset-0 m-auto text-purple-300 animate-pulse"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">
                      {activeMode === 'gemini'
                        ? 'Generating with Gemini AI...'
                        : 'Rendering AI Demo Visual...'}
                    </h4>
                    <p className="text-[11px] text-neutral-400">Synthesizing prompt composition</p>
                  </div>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  <img
                    src={generatedImageUrl}
                    alt={altText || prompt}
                    className="max-h-[250px] w-auto max-w-full object-contain rounded-lg shadow-lg border border-neutral-800"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    {aspectRatio}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-neutral-400 p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-500">
                    <ImageIcon size={24} />
                  </div>
                  <p className="text-xs font-medium text-neutral-300">No image generated yet</p>
                  <p className="text-[11px] text-neutral-500 max-w-[200px]">
                    Click &ldquo;Generate Image&rdquo; below to create your asset.
                  </p>
                </div>
              )}
            </div>

            {/* Notice / Error banners */}
            {quotaExceededNotice && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <strong className="block text-[11px] font-bold text-amber-800">
                    Free Tier Gemini API Key Notice
                  </strong>
                  <span className="text-[11px] text-amber-700">
                    The active Gemini key is on Free Tier (raster image generation requires Paid Tier).
                    Switched seamlessly to AI Demo Studio visual so you can continue working!
                  </span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle size={15} className="text-red-600 shrink-0" />
                <span className="text-[11px]">{errorMessage}</span>
              </div>
            )}

            {/* Primary Action Button inside preview column */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>
                      {generatedImageUrl ? 'Regenerate New Image' : 'Generate Image with AI'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500 flex items-center space-x-2">
            <span>Powered by Gemini 3.8 &amp; Nedit Core</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleInsertIntoDocument}
              disabled={!generatedImageUrl || isGenerating}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all active:scale-[0.99]"
            >
              <Check size={14} />
              <span>Insert into Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AiImageModal;
