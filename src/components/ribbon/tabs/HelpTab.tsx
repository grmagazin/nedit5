import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Keyboard,
  BookOpen,
  Info,
  Volume2,
  Play,
  Pause,
  Square,
  Gauge,
  Languages,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { DocumentSettings } from '../../../types';

const AboutSuiteModal = React.lazy(() => import('../../AboutSuiteModal'));
const KeyboardShortcutsModal = React.lazy(() => import('../../modals/KeyboardShortcutsModal'));
const QuickGuideModal = React.lazy(() => import('../../modals/QuickGuideModal'));

export interface HelpTabProps {
  editor: Editor | null;
  settings: DocumentSettings;
  onUpdateSettings: (newSettings: Partial<DocumentSettings>) => void;
  isDarkUi?: boolean;
  onNotify?: (msg: string) => void;
}

export const HelpTab: React.FC<HelpTabProps> = ({
  editor,
  settings,
  onUpdateSettings,
  isDarkUi = false,
  onNotify,
}) => {
  // Modal states
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQuickGuideModal, setShowQuickGuideModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Document Read / Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [selectedSpeechVoice, setSelectedSpeechVoice] = useState<string>('');
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentSpeechSentence, setCurrentSpeechSentence] = useState<string>('');
  const speechChunksRef = useRef<string[]>([]);
  const currentSpeechIndexRef = useRef<number>(0);

  const notify = (msg: string) => {
    if (onNotify) {
      onNotify(msg);
    }
  };

  // Populate system and browser speech voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setSpeechVoices(available);
          const defaultVoice = available.find((v) => v.default) || available[0];
          if (defaultVoice && !selectedSpeechVoice) {
            setSelectedSpeechVoice(defaultVoice.name);
          }
        }
      } catch (err) {
        console.warn('Could not load speech voices:', err);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSpeechChunk = useCallback(
    (index: number) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        index >= speechChunksRef.current.length
      ) {
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        setCurrentSpeechSentence('');
        return;
      }

      currentSpeechIndexRef.current = index;
      const chunk = speechChunksRef.current[index];
      setCurrentSpeechSentence(chunk);

      const utterance = new SpeechSynthesisUtterance(chunk);
      if (selectedSpeechVoice && speechVoices.length > 0) {
        const voiceObj = speechVoices.find((v) => v.name === selectedSpeechVoice);
        if (voiceObj) utterance.voice = voiceObj;
      }
      utterance.rate = speechRate;

      utterance.onend = () => {
        if (currentSpeechIndexRef.current + 1 < speechChunksRef.current.length) {
          speakSpeechChunk(currentSpeechIndexRef.current + 1);
        } else {
          setIsSpeaking(false);
          setIsSpeechPaused(false);
          setCurrentSpeechSentence('');
          speechChunksRef.current = [];
          currentSpeechIndexRef.current = 0;
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech error:', e.error);
        }
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        setCurrentSpeechSentence('');
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechVoices, selectedSpeechVoice, speechRate]
  );

  const startDocumentReading = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      notify('Text-to-Speech is not supported in this browser.');
      return;
    }

    if (isSpeaking && isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    let textToRead = '';
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        textToRead = editor.state.doc.textBetween(from, to, ' ');
      }
      if (!textToRead.trim()) {
        textToRead = editor.getText();
      }
    }

    const clean = textToRead.trim();
    if (!clean) {
      notify('Read Aloud: No text found to read.');
      return;
    }

    // Split text into coherent chunks for natural pauses
    const rawChunks = clean.match(/[^.!?\n]+[.!?\n]+/g) || [clean];
    const validChunks = rawChunks.map((s) => s.trim()).filter((s) => s.length > 0);

    speechChunksRef.current = validChunks.length > 0 ? validChunks : [clean];
    currentSpeechIndexRef.current = 0;

    setIsSpeaking(true);
    setIsSpeechPaused(false);
    speakSpeechChunk(0);
  }, [editor, isSpeaking, isSpeechPaused, speakSpeechChunk]);

  const pauseDocumentReading = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      if (isSpeechPaused) {
        window.speechSynthesis.resume();
        setIsSpeechPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsSpeechPaused(true);
      }
    }
  }, [isSpeaking, isSpeechPaused]);

  const stopDocumentReading = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    setCurrentSpeechSentence('');
    speechChunksRef.current = [];
    currentSpeechIndexRef.current = 0;
  }, []);

  return (
    <div className="flex items-center space-x-1.5 px-3 py-1 select-none animate-in fade-in duration-150">
      {/* GROUP 1: Help & Guides */}
      <div className="flex flex-col items-center pr-2">
        <div className="flex items-center space-x-1.5">
          {/* Button 1: Keyboard Shortcuts */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            title="View Keyboard Shortcuts (Ctrl+B, Ctrl+I, Ctrl+Z, etc.)"
            className="flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
          >
            <Keyboard size={22} className="text-[#185abd] mb-1" />
            <span className="text-[11px] leading-tight text-center text-neutral-800">
              Keyboard<br />Shortcuts
            </span>
          </button>

          {/* Button 2: Quick Guide */}
          <button
            onClick={() => setShowQuickGuideModal(true)}
            title="Open Nedit Quick Guide"
            className="flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
          >
            <BookOpen size={22} className="text-[#185abd] mb-1" />
            <span className="text-[11px] leading-tight text-center text-neutral-800">
              Quick<br />Guide
            </span>
          </button>

          {/* Button 3: About */}
          <button
            onClick={() => setShowAboutModal(true)}
            title="About Nedit v5.2 & Version Information"
            className="flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
          >
            <Info size={22} className="text-[#185abd] mb-1" />
            <span className="text-[11px] leading-tight text-center text-neutral-800">
              About<br />Nedit5.2
            </span>
          </button>
        </div>
        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          Help &amp; Guides
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mx-2 shrink-0 self-start mt-0.5" />

      {/* GROUP 2: DOCUMENT READ (Text-to-Speech System & Browser Voices) */}
      <div className="flex flex-col items-center px-2">
        <div className="flex items-center space-x-2">
          {/* Big Read Aloud Play Button */}
          <button
            onClick={startDocumentReading}
            title="Read Aloud — Read selected text or entire document using system and browser voices"
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition-all cursor-pointer border ${
              isSpeaking && !isSpeechPaused
                ? isDarkUi
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-2xs font-medium'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs font-medium'
                : isSpeechPaused
                ? isDarkUi
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-medium'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
                : isDarkUi
                ? 'bg-[#282828] hover:bg-[#333333] border-[#404040] hover:border-neutral-500 text-neutral-200'
                : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
            }`}
          >
            {isSpeaking && !isSpeechPaused ? (
              <Volume2 size={22} className="text-emerald-500 animate-pulse mb-1" />
            ) : (
              <Play
                size={22}
                className={`${
                  isDarkUi ? 'text-[#60a5fa] fill-[#60a5fa]' : 'text-[#185abd] fill-[#185abd]'
                } mb-1`}
              />
            )}
            <span
              className={`text-[11px] leading-tight text-center font-medium ${
                isDarkUi ? 'text-neutral-200' : ''
              }`}
            >
              {isSpeaking && !isSpeechPaused
                ? 'Reading...'
                : isSpeechPaused
                ? 'Resume'
                : 'Read Aloud'}
            </span>
          </button>

          {/* Middle Control Cluster: Pause, Stop, Speed, Voices */}
          <div className="flex flex-col space-y-1.5">
            {/* Top Row: Pause, Stop, Speed Rate */}
            <div className="flex items-center space-x-2">
              {/* Pause / Resume Button */}
              <button
                onClick={pauseDocumentReading}
                disabled={!isSpeaking}
                title={isSpeechPaused ? 'Resume reading' : 'Pause reading'}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs border transition-colors cursor-pointer ${
                  isSpeechPaused
                    ? isDarkUi
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                    : isDarkUi
                    ? 'bg-[#282828] border-[#404040] hover:bg-[#333333] text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'bg-white border-neutral-300 hover:bg-neutral-100 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Pause
                  size={13}
                  className={
                    isSpeechPaused
                      ? 'text-amber-500'
                      : isDarkUi
                      ? 'text-neutral-300'
                      : 'text-neutral-600'
                  }
                />
                <span>{isSpeechPaused ? 'Resume' : 'Pause'}</span>
              </button>

              {/* Stop Button */}
              <button
                onClick={stopDocumentReading}
                disabled={!isSpeaking}
                title="Stop reading aloud"
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs border transition-colors cursor-pointer ${
                  isDarkUi
                    ? 'bg-[#282828] border-[#404040] hover:bg-rose-950/40 text-neutral-200 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'bg-white border-neutral-300 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <Square size={11} className="fill-rose-600 text-rose-600" />
                <span>Stop</span>
              </button>

              {/* Speed Dropdown */}
              <div className="flex items-center space-x-1 pl-1">
                <Gauge
                  size={13}
                  className={`shrink-0 ${isDarkUi ? 'text-neutral-400' : 'text-neutral-500'}`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    isDarkUi ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  Speed:
                </span>
                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className={`text-[11px] h-[23px] px-1.5 py-0.5 rounded font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 border ${
                    isDarkUi
                      ? 'bg-[#282828] border-[#404040] text-neutral-200'
                      : 'bg-white border-neutral-300 text-neutral-700'
                  }`}
                  title="Reading speed multiplier"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x (Normal)</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={1.75}>1.75x</option>
                  <option value={2.0}>2.0x</option>
                </select>
              </div>
            </div>

            {/* Bottom Row: System and Browser Voices Dropdown */}
            <div className="flex items-center space-x-1.5">
              <Languages
                size={14}
                className={`${isDarkUi ? 'text-[#60a5fa]' : 'text-[#185abd]'} shrink-0`}
              />
              <span
                className={`text-[11px] font-medium shrink-0 ${
                  isDarkUi ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                Voice:
              </span>
              <select
                value={selectedSpeechVoice}
                onChange={(e) => setSelectedSpeechVoice(e.target.value)}
                className={`w-[230px] text-[11px] h-[23px] px-1.5 py-0 rounded font-medium truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 border ${
                  isDarkUi
                    ? 'bg-[#282828] border-[#404040] text-neutral-200'
                    : 'bg-white border-neutral-300 text-neutral-800'
                }`}
                title="Available system and browser voices"
              >
                {speechVoices.length === 0 ? (
                  <option value="">System Default Voice</option>
                ) : (
                  speechVoices.map((voice, idx) => (
                    <option key={voice.name + idx} value={voice.name}>
                      {voice.name} ({voice.lang})
                      {voice.default ? ' — [Default]' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Status & Feedback Indicator */}
          <div
            className={`flex flex-col justify-center px-2.5 py-1 rounded min-w-[130px] max-w-[170px] h-[52px] border ${
              isDarkUi
                ? 'bg-[#282828] border-[#404040]'
                : 'bg-white border-neutral-200'
            }`}
          >
            {isSpeaking ? (
              <div className="flex items-center space-x-1.5 text-emerald-500">
                <Volume2 size={13} className="animate-bounce shrink-0 text-emerald-500" />
                <span className="text-[10px] font-semibold truncate">
                  {isSpeechPaused ? 'Paused' : 'Reading aloud...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-neutral-400">
                <Headphones size={13} className="shrink-0" />
                <span className="text-[10px] font-medium">Speech Ready</span>
              </div>
            )}
            <span
              className={`text-[9px] truncate mt-0.5 ${
                isDarkUi ? 'text-neutral-400' : 'text-neutral-500'
              }`}
              title={currentSpeechSentence || 'Reads selected text or document'}
            >
              {currentSpeechSentence || (isSpeaking ? 'Reading...' : 'Select text or reads all')}
            </span>
          </div>
        </div>

        <span className="text-[11px] text-center text-[#2563eb] font-normal mt-1.5 tracking-normal">
          Document Read
        </span>
      </div>

      {/* DIVIDER */}
      <div className="h-12 w-px bg-[#dad9d8] mx-2 shrink-0 self-start mt-0.5" />

      {/* GROUP 3: AI Assistant */}
      <div className="flex flex-col items-center pl-1">
        <button
          onClick={() =>
            onUpdateSettings({
              showAiAssistantPane: !settings.showAiAssistantPane,
            })
          }
          title="AI Writing Assistant — Open / Close Right Toolbar"
          className={`flex flex-col items-center justify-center px-3.5 py-1 rounded transition-all cursor-pointer ${
            settings.showAiAssistantPane
              ? 'bg-purple-100/90 text-[#6d28d9] font-semibold border border-purple-300 shadow-2xs'
              : 'hover:bg-purple-50/70 text-[#6d28d9]'
          }`}
        >
          <Sparkles size={22} className="text-[#7c3aed] fill-purple-100 mb-1" />
          <span className="text-[11px] leading-tight text-center font-semibold text-[#6d28d9]">
            AI<br />Assistant
          </span>
        </button>
        <span className="text-[11px] text-center text-purple-600 font-normal mt-1.5 tracking-normal">
          AI Writing
        </span>
      </div>

      {/* Modals Co-located with HelpTab */}
      {showShortcutsModal && (
        <React.Suspense fallback={null}>
          <KeyboardShortcutsModal
            isOpen={showShortcutsModal}
            onClose={() => {
              setShowShortcutsModal(false);
              editor?.commands.focus();
            }}
          />
        </React.Suspense>
      )}

      {showQuickGuideModal && (
        <React.Suspense fallback={null}>
          <QuickGuideModal
            isOpen={showQuickGuideModal}
            onClose={() => {
              setShowQuickGuideModal(false);
              editor?.commands.focus();
            }}
          />
        </React.Suspense>
      )}

      {showAboutModal && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-2xl flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#0062ff] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Loading Nedit v5.2 Suite Information...
                </span>
              </div>
            </div>
          }
        >
          <AboutSuiteModal
            isOpen={showAboutModal}
            onClose={() => {
              setShowAboutModal(false);
              editor?.commands.focus();
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default HelpTab;
