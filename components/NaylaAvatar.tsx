import React, { useEffect, useState } from 'react';
import {
  Camera,
  Sparkles,
  Volume2,
  Eye,
  Maximize2,
  Minimize2,
  SunMedium,
} from 'lucide-react';
import {
  AssistantExpression,
  CameraFraming,
  StudioLighting,
} from '../types';
import { ARUNA_3D_ASSETS } from '../constants';

interface NaylaAvatarProps {
  isLive: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  cameraFraming: CameraFraming;
  setCameraFraming: (framing: CameraFraming) => void;
  lighting: StudioLighting;
  setLighting: (lighting: StudioLighting) => void;
  manualExpression: AssistantExpression | 'auto';
  setManualExpression: (expr: AssistantExpression | 'auto') => void;
  isExpandedStage: boolean;
  toggleExpandedStage: () => void;
  onStartLive: () => void;
  onStopLive: () => void;
}

const LIGHTING_CONFIGS: Record<
  StudioLighting,
  {
    label: string;
    overlayGradient: string;
    rimCss: string;
    ambientGlow: string;
  }
> = {
  warm_studio: {
    label: 'Studio Hangat',
    overlayGradient:
      'radial-gradient(circle at 50% 35%, rgba(251, 113, 133, 0.16), rgba(15, 23, 42, 0.88) 75%)',
    rimCss: '0 0 70px -10px rgba(251, 113, 133, 0.35)',
    ambientGlow: 'radial-gradient(circle at 50% 28%, rgba(251, 113, 133, 0.22), transparent 60%)',
  },
  twilight_lounge: {
    label: 'Senja Akademik',
    overlayGradient:
      'radial-gradient(circle at 50% 35%, rgba(245, 158, 11, 0.16), rgba(17, 12, 29, 0.9) 75%)',
    rimCss: '0 0 70px -10px rgba(245, 158, 11, 0.32)',
    ambientGlow: 'radial-gradient(circle at 50% 28%, rgba(251, 191, 36, 0.2), transparent 60%)',
  },
  midnight_focus: {
    label: 'Fokus Malam',
    overlayGradient:
      'radial-gradient(circle at 50% 35%, rgba(56, 189, 248, 0.14), rgba(9, 13, 22, 0.92) 75%)',
    rimCss: '0 0 70px -10px rgba(56, 189, 248, 0.3)',
    ambientGlow: 'radial-gradient(circle at 50% 28%, rgba(56, 189, 248, 0.2), transparent 60%)',
  },
};

const NaylaAvatar: React.FC<NaylaAvatarProps> = ({
  isLive,
  isSpeaking,
  isLoading,
  cameraFraming,
  setCameraFraming,
  lighting,
  setLighting,
  manualExpression,
  setManualExpression,
  isExpandedStage,
  toggleExpandedStage,
  onStartLive,
  onStopLive,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [audioBars, setAudioBars] = useState<number[]>([
    0.2, 0.35, 0.5, 0.3, 0.6, 0.8, 0.5, 0.4, 0.65, 0.45, 0.25, 0.18,
  ]);

  // Resolve current expression
  const activeExpression: AssistantExpression =
    manualExpression !== 'auto'
      ? manualExpression
      : isSpeaking
      ? 'talking'
      : isLive
      ? 'listening'
      : isLoading
      ? 'thinking'
      : 'neutral';

  // Audio bar animation when speaking or live
  useEffect(() => {
    if (!isSpeaking && !isLive) {
      setAudioBars([0.15, 0.2, 0.25, 0.18, 0.22, 0.28, 0.24, 0.18, 0.2, 0.16, 0.14, 0.12]);
      return;
    }
    const interval = window.setInterval(() => {
      setAudioBars((prev) =>
        prev.map((_, idx) => {
          const base = isSpeaking ? 0.35 : 0.18;
          const variance = isSpeaking ? 0.6 : 0.25;
          const wave = Math.sin(Date.now() * 0.012 + idx * 0.7) * 0.5 + 0.5;
          return Math.min(1, Math.max(0.12, base + wave * variance * Math.random()));
        })
      );
    }, 90);
    return () => clearInterval(interval);
  }, [isSpeaking, isLive]);

  // Track pointer for 3D perspective head/body parallax
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
  };

  const handlePointerLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Determine framing scale & vertical offset for 3D Digital Human rig
  const metaFramingTransform =
    cameraFraming === 'closeup'
      ? 'scale(1.22) translateY(7%)'
      : cameraFraming === 'waist'
      ? 'scale(1.03) translateY(2%)'
      : 'scale(0.88) translateY(-2%)';

  const currentLightingCfg = LIGHTING_CONFIGS[lighting];

  const expressionStatusLabel =
    activeExpression === 'talking'
      ? 'Sedang Menjelaskan'
      : activeExpression === 'listening'
      ? 'Mendengarkan dengan Empati'
      : activeExpression === 'thinking'
      ? 'Menyusun Pemikiran'
      : 'Siap Membantu';

  const portraitList: { key: AssistantExpression; src: string; alt: string }[] = [
    {
      key: 'neutral',
      src: ARUNA_3D_ASSETS.neutral,
      alt: 'Aruna 3D Digital Human Assistant - Pose Ramah',
    },
    {
      key: 'talking',
      src: ARUNA_3D_ASSETS.talking,
      alt: 'Aruna 3D Digital Human Assistant - Pose Berbicara',
    },
    {
      key: 'listening',
      src: ARUNA_3D_ASSETS.listening,
      alt: 'Aruna 3D Digital Human Assistant - Pose Mendengarkan',
    },
  ];

  // Map 'thinking' to listening portrait with thoughtful tilt
  const displayedPortraitKey: AssistantExpression =
    activeExpression === 'thinking' ? 'listening' : activeExpression;

  return (
    <section
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center bg-[#0c101a]"
      style={{
        background: currentLightingCfg.overlayGradient,
      }}
    >
      {/* Architectural 3D Studio Backdrop Layer with Parallax */}
      {!imgErrors.studioBg && (
        <img
          src={ARUNA_3D_ASSETS.studioBg}
          alt="Ruang Studio 3D Aruna"
          referrerPolicy="no-referrer"
          onError={() => setImgErrors((prev) => ({ ...prev, studioBg: true }))}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-200 ease-out"
          style={{
            opacity: lighting === 'midnight_focus' ? 0.24 : 0.4,
            transform: `scale(1.08) translate3d(${mousePos.x * -14}px, ${mousePos.y * -10}px, 0)`,
          }}
        />
      )}

      {/* Ambient Studio Key & Rim Lighting Glows */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: currentLightingCfg.ambientGlow,
        }}
      />

      {/* High-Resolution 3D Digital Human Rig (MetaHuman Render + 3D Parallax Tilt) */}
      <div
        className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none px-4 pt-12 pb-24"
        style={{
          perspective: '1200px',
        }}
      >
        <div
          className="relative w-full max-w-[340px] sm:max-w-[390px] lg:max-w-[440px] aspect-[3/4] rounded-3xl overflow-hidden transition-transform duration-150 ease-out"
          style={{
            transform: `${metaFramingTransform} rotateX(${mousePos.y * -7}deg) rotateY(${
              mousePos.x * 9
            }deg)`,
            boxShadow: currentLightingCfg.rimCss,
          }}
        >
          {/* Crossfading 3D Digital Human Poses */}
          {portraitList.map((item) => {
            const isVisible = displayedPortraitKey === item.key;
            const hasFailed = imgErrors[item.key];
            return (
              <div
                key={item.key}
                className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {!hasFailed ? (
                  <img
                    src={item.src}
                    alt={item.alt}
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((prev) => ({ ...prev, [item.key]: true }))}
                    className={`w-full h-full object-cover object-top transition-transform duration-700 ${
                      isSpeaking
                        ? 'scale-[1.03] animate-breath'
                        : 'scale-100 animate-breath'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <Sparkles className="w-10 h-10 text-rose-400 mb-3" />
                    <p className="font-display text-lg text-white">Aruna 3D Digital Human</p>
                    <p className="text-xs text-slate-400 mt-1">Asisten Virtual Pak Guru Luky</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* 3D Specular Rim & Bottom Scrim for Contrast */}
          <div className="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-3xl pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

          {/* Live Lip-Sync / Voice Activity Spatial Indicator on Character Frame */}
          <div className="absolute bottom-4 inset-x-5 flex items-center justify-between text-white/90">
            <div>
              <p className="font-display text-base font-medium tracking-tight text-white">
                Aruna
              </p>
              <p className="text-xs text-slate-300">
                Asisten Pak Guru Luky · {expressionStatusLabel}
              </p>
            </div>

            {/* Dynamic Voice Visualizer Bars */}
            <div
              className="flex items-end gap-1 h-6 px-2.5 py-1 rounded-lg bg-black/45 backdrop-blur-sm border border-white/10"
              aria-label="Indikator gelombang suara Aruna"
            >
              {audioBars.slice(0, 7).map((val, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full transition-transform duration-100 ${
                    isSpeaking
                      ? 'bg-rose-400'
                      : isLive
                      ? 'bg-emerald-400'
                      : 'bg-slate-400/60'
                  }`}
                  style={{
                    height: '16px',
                    transform: `scaleY(${val})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- FLOATING TOP-LEFT HUD: Clean Unboxed Metadata --- */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between pointer-events-none">
        <div className="px-4 py-2.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/10 text-white pointer-events-auto">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-rose-400 animate-ping'
                  : isLive
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="font-semibold text-white">Aruna 3D</span>
            <span aria-hidden="true">·</span>
            <span>{expressionStatusLabel}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline text-slate-300">{currentLightingCfg.label}</span>
          </div>
        </div>

        {/* Top-Right Expand Stage Control */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={toggleExpandedStage}
            title={isExpandedStage ? 'Kembalikan Panel Diskusi' : 'Perluas Panggung 3D'}
            className="h-9 w-9 rounded-xl bg-black/45 backdrop-blur-md border border-white/10 text-slate-200 hover:text-white hover:bg-black/65 transition-colors flex items-center justify-center"
          >
            {isExpandedStage ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* --- FLOATING BOTTOM STUDIO DIRECTOR HUD --- */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col items-center gap-2.5 pointer-events-none">
        <div className="max-w-full overflow-x-auto no-scrollbar pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-2xl">
          {/* 1. Camera Framing Presets */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl shrink-0">
            <Camera className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:block" />
            {(
              [
                { id: 'closeup', label: 'Wajah' },
                { id: 'waist', label: 'Potret' },
                { id: 'wide', label: 'Studio' },
              ] as { id: CameraFraming; label: string }[]
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => setCameraFraming(cam.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  cameraFraming === cam.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-white/10 shrink-0 hidden sm:block" />

          {/* 2. Expression / Pose Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 p-1 rounded-xl shrink-0">
            <Eye className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {(
              [
                { id: 'auto', label: 'Otomatis' },
                { id: 'neutral', label: 'Ramah' },
                { id: 'talking', label: 'Bicara' },
                { id: 'listening', label: 'Simpati' },
              ] as { id: AssistantExpression | 'auto'; label: string }[]
            ).map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => setManualExpression(exp.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  manualExpression === exp.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-white/10 shrink-0 hidden md:block" />

          {/* 3. Studio Lighting Preset Selector */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl shrink-0">
            <SunMedium className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {(
              [
                { id: 'warm_studio', label: 'Hangat' },
                { id: 'twilight_lounge', label: 'Senja' },
                { id: 'midnight_focus', label: 'Malam' },
              ] as { id: StudioLighting; label: string }[]
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLighting(l.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  lighting === l.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-white/10 shrink-0" />

          {/* 4. Quick Voice Interaction Trigger on Stage */}
          <button
            type="button"
            onClick={isLive ? onStopLive : onStartLive}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              isLive
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isLive ? 'Matikan Suara' : 'Mode Suara'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default NaylaAvatar;
