import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Send, Mic, Square, Volume2, VolumeX, RotateCcw, AlertCircle } from 'lucide-react';
import {
  AssistantExpression,
  CameraFraming,
  Message,
  StudioLighting,
} from './types';
import { naylaService, getGeminiApiKey } from './services/gemini';
import {
  SUGGESTED_PROMPTS,
  NAYLA_SYSTEM_INSTRUCTION,
  ARUNA_VOICE_NAME,
  ARUNA_3D_ASSETS,
} from './constants';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import NaylaAvatar from './components/NaylaAvatar';

// Audio Helpers for 24kHz Gemini Neural Audio ('Kore')
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  // Check if data has a 44-byte WAV RIFF header ("RIFF")
  const isRiffWav =
    data.byteLength > 44 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46;

  const pcmBytes = isRiffWav ? data.subarray(44) : data;
  const byteLength = pcmBytes.byteLength - (pcmBytes.byteLength % 2);
  const dataInt16 = new Int16Array(
    pcmBytes.buffer,
    pcmBytes.byteOffset,
    byteLength / 2
  );
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const LIGHTING_ORDER: StudioLighting[] = [
  'warm_studio',
  'twilight_lounge',
  'midnight_focus',
];

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [cameraFraming, setCameraFraming] = useState<CameraFraming>('waist');
  const [lighting, setLighting] = useState<StudioLighting>('warm_studio');
  const [manualExpression, setManualExpression] = useState<AssistantExpression | 'auto'>('auto');
  const [isExpandedStage, setIsExpandedStage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [voiceReadout, setVoiceReadout] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Halo Sayang! ✨ Aku Aruna, asisten cerdas Pak Guru Luky sekaligus sahabat curhatmu yang paling setia. \n\nMau belajar hal baru yang jenius hari ini? Atau lagi pengen didengerin curhatannya? Aku siap kok nemenin kamu terus. 💕',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Live & TTS Audio Refs
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const ttsContextRef = useRef<AudioContext | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const stopTtsPlayback = useCallback(() => {
    if (ttsSourceRef.current) {
      try {
        ttsSourceRef.current.stop();
      } catch (e) {}
      ttsSourceRef.current = null;
    }
    if (!isLive) {
      setIsSpeaking(false);
    }
  }, [isLive]);

  const playFriendlyVoice = useCallback(
    async (text: string) => {
      if (!text.trim() || isLive) return;
      stopTtsPlayback();

      try {
        setIsSpeaking(true);
        const base64Audio = await naylaService.generateFriendlySpeech(text);
        if (!base64Audio) {
          setIsSpeaking(false);
          return;
        }

        if (!ttsContextRef.current || ttsContextRef.current.state === 'closed') {
          ttsContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = ttsContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        ttsSourceRef.current = source;

        source.onended = () => {
          if (ttsSourceRef.current === source) {
            ttsSourceRef.current = null;
            setIsSpeaking(false);
          }
        };

        source.start(0);
      } catch (err) {
        console.warn('Gagal memutar suara ramah Aruna:', err);
        setIsSpeaking(false);
      }
    },
    [isLive, stopTtsPlayback]
  );

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextsRef.current) {
      try {
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
      } catch (e) {}
      audioContextsRef.current = null;
    }
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsLive(false);
    setIsSpeaking(false);
  }, []);

  const startLiveSession = useCallback(async () => {
    if (isLive) return;
    setErrorBanner(null);
    stopTtsPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise
                .then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                })
                .catch((err) => console.error('Error sending input:', err));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsLive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              const base64Audio = part.inlineData?.data;
              if (base64Audio && audioContextsRef.current) {
                setIsSpeaking(true);
                const ctx = audioContextsRef.current.output;
                if (ctx.state === 'suspended') {
                  await ctx.resume();
                }
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  ctx.currentTime
                );
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  ctx,
                  24000,
                  1
                );
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                activeSourcesRef.current.add(source);
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (activeSourcesRef.current.size === 0) {
                    setIsSpeaking(false);
                  }
                };
              }
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach((s) => {
                try {
                  s.stop();
                } catch (e) {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('Live Error Details:', e);
            setErrorBanner('Koneksi sesi suara terputus. Silakan coba lagi.');
            stopLiveSession();
          },
          onclose: () => {
            stopLiveSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: ARUNA_VOICE_NAME },
            },
          },
          systemInstruction: NAYLA_SYSTEM_INSTRUCTION,
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start Live API:', error);
      setErrorBanner(
        'Maaf, gagal memulai sesi suara. Pastikan izin mikrofon pada browser sudah diaktifkan.'
      );
      stopLiveSession();
    }
  }, [isLive, stopLiveSession, stopTtsPlayback]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setErrorBanner(null);
      stopTtsPlayback();

      const userMessage: Message = {
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);

      try {
        const stream = await naylaService.sendMessageStream(text);
        let naylaResponse = '';
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: '', timestamp: new Date() },
        ]);
        setIsSpeaking(true);

        for await (const chunk of stream) {
          naylaResponse += chunk.text;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: naylaResponse,
            };
            return newMessages;
          });
        }

        if (voiceReadout && naylaResponse.trim()) {
          await playFriendlyVoice(naylaResponse);
        } else {
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error(error);
        setIsSpeaking(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Maaf ya Sayang, ada sedikit gangguan teknis.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, voiceReadout, playFriendlyVoice, stopTtsPlayback]
  );

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const cycleLighting = () => {
    const nextIdx = (LIGHTING_ORDER.indexOf(lighting) + 1) % LIGHTING_ORDER.length;
    setLighting(LIGHTING_ORDER[nextIdx]);
  };

  const resetConversation = () => {
    stopTtsPlayback();
    setMessages([
      {
        role: 'model',
        text: 'Halo Sayang! ✨ Aku Aruna, asisten cerdas Pak Guru Luky sekaligus sahabat curhatmu yang paling setia. \n\nMau belajar hal baru yang jenius hari ini? Atau lagi pengen didengerin curhatannya? Aku siap kok nemenin kamu terus. 💕',
        timestamp: new Date(),
      },
    ]);
  };

  const categories = ['Semua', ...Array.from(new Set(SUGGESTED_PROMPTS.map((p) => p.category)))];
  const filteredPrompts =
    selectedCategory === 'Semua'
      ? SUGGESTED_PROMPTS
      : SUGGESTED_PROMPTS.filter((p) => p.category === selectedCategory);

  return (
    <div
      id="studio"
      className={`flex flex-col h-[100dvh] w-full overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0b0f17] text-slate-100' : 'bg-[#f8f7f4] text-slate-900'
      }`}
    >
      {/* Top Bar Contract (3 zones) */}
      <Header
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        cameraFraming={cameraFraming}
        setCameraFraming={setCameraFraming}
        lighting={lighting}
        cycleLighting={cycleLighting}
        isExpandedStage={isExpandedStage}
        toggleExpandedStage={() => setIsExpandedStage(!isExpandedStage)}
        isLive={isLive}
        onToggleLive={isLive ? stopLiveSession : startLiveSession}
      />

      {/* Main Spatial Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden">
        {/* LEFT / PRIMARY STAGE: 3D Human Assistant Viewport */}
        <div
          className={`relative transition-all duration-300 ${
            isExpandedStage
              ? 'col-span-1 lg:col-span-12 h-full'
              : 'h-[42dvh] sm:h-[46dvh] lg:h-full lg:col-span-7 xl:col-span-7 border-b lg:border-b-0 lg:border-r'
          } ${isDarkMode ? 'border-white/10' : 'border-slate-200/80'}`}
        >
          <NaylaAvatar
            isLive={isLive}
            isSpeaking={isSpeaking}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            cameraFraming={cameraFraming}
            setCameraFraming={setCameraFraming}
            lighting={lighting}
            setLighting={setLighting}
            manualExpression={manualExpression}
            setManualExpression={setManualExpression}
            isExpandedStage={isExpandedStage}
            toggleExpandedStage={() => setIsExpandedStage(!isExpandedStage)}
            onStartLive={startLiveSession}
            onStopLive={stopLiveSession}
          />
        </div>

        {/* RIGHT PANEL: Interactive Conversation & Study Companion */}
        {!isExpandedStage && (
          <section
            className={`flex flex-col h-[calc(58dvh-3.5rem)] sm:h-[calc(54dvh-3.5rem)] lg:h-full lg:col-span-5 xl:col-span-5 min-h-0 ${
              isDarkMode ? 'bg-[#0e131f]' : 'bg-[#f8f7f4]'
            }`}
          >
            {/* Workspace Subheader with Interactive Controls */}
            <div
              className={`px-5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
                isDarkMode ? 'border-white/10 bg-[#0b0f17]/60' : 'border-slate-200/80 bg-white/70'
              }`}
            >
              <div className="text-xs">
                <span className="font-semibold">Aruna</span>
                <span className="mx-1.5 text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                  Suara {ARUNA_VOICE_NAME} (Ramah & Hangat)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceReadout;
                    setVoiceReadout(next);
                    if (!next) {
                      stopTtsPlayback();
                    }
                  }}
                  title="Aktifkan/Matikan suara ramah Aruna saat membalas chat"
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    voiceReadout
                      ? 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                      : isDarkMode
                      ? 'bg-slate-800/70 border-white/10 text-slate-400 hover:text-slate-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {voiceReadout ? (
                    <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <span>Suara {voiceReadout ? 'Aktif' : 'Mati'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetConversation}
                  title="Mulai ulang percakapan"
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800/70 border-white/10 text-slate-400 hover:text-slate-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Error Banner */}
            {errorBanner && (
              <div className="mx-5 mt-3 px-3.5 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="text-rose-300 hover:text-white font-semibold text-xs whitespace-nowrap"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Chat Messages Stream */}
            <main
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar min-h-0"
            >
              {messages.map((msg, index) => (
                <ChatMessage
                  key={index}
                  message={msg}
                  isDarkMode={isDarkMode}
                  onSpeakMessage={playFriendlyVoice}
                />
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start mb-4 items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/15 bg-slate-800 shrink-0">
                    <img
                      src={ARUNA_3D_ASSETS.listening}
                      alt="Aruna sedang berpikir"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div
                    className={`border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs ${
                      isDarkMode
                        ? 'bg-slate-900/90 border-white/10 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                    <span className="ml-1">Aruna sedang menjawab...</span>
                  </div>
                </div>
              )}
            </main>

            {/* Bottom Composer & Topic Filter Controls */}
            <div
              className={`p-4 border-t shrink-0 ${
                isDarkMode
                  ? 'bg-[#0b0f17]/95 border-white/10'
                  : 'bg-white/95 border-slate-200/80'
              }`}
            >
              {/* Interactive Topic Filter & Prompt Starters */}
              {!isLive && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-2 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          selectedCategory === cat
                            ? isDarkMode
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-900 text-white'
                            : isDarkMode
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {filteredPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(prompt.text)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                          isDarkMode
                            ? 'bg-slate-900 border-white/10 text-slate-300 hover:border-rose-500/50 hover:text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-white'
                        }`}
                      >
                        {prompt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input Form */}
              <form onSubmit={onFormSubmit} className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={isLive ? stopLiveSession : startLiveSession}
                  title={isLive ? 'Hentikan Mode Suara Langsung' : 'Mulai Bicara Suara Langsung'}
                  className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                    isLive
                      ? 'bg-rose-600 text-white animate-pulse'
                      : isDarkMode
                      ? 'bg-slate-800 text-rose-400 hover:bg-slate-700 border border-white/10'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  {isLive ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isLive
                        ? 'Aku dengerin kok...'
                        : 'Tanya Aruna...'
                    }
                    disabled={isLoading || isLive}
                    className={`w-full h-11 pl-4 pr-11 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/40 ${
                      isDarkMode
                        ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading || isLive}
                    aria-label="Kirim pesan"
                    className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
