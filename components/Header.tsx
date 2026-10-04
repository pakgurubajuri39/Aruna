import React from 'react';
import { Sun, Moon, Mic, PhoneOff } from 'lucide-react';
import { CameraFraming, StudioLighting } from '../types';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  cameraFraming: CameraFraming;
  setCameraFraming: (framing: CameraFraming) => void;
  lighting: StudioLighting;
  cycleLighting: () => void;
  isExpandedStage: boolean;
  toggleExpandedStage: () => void;
  isLive: boolean;
  onToggleLive: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  toggleTheme,
  cameraFraming,
  setCameraFraming,
  lighting,
  cycleLighting,
  isExpandedStage,
  toggleExpandedStage,
  isLive,
  onToggleLive,
}) => {
  const lightingLabel =
    lighting === 'warm_studio'
      ? 'Studio Hangat'
      : lighting === 'twilight_lounge'
      ? 'Senja Akademik'
      : 'Fokus Malam';

  return (
    <header
      className={`h-14 shrink-0 px-6 border-b flex items-center justify-between transition-colors duration-200 z-30 ${
        isDarkMode
          ? 'bg-[#0b0f17]/90 border-white/10 text-slate-100 backdrop-blur-md'
          : 'bg-[#f8f7f4]/90 border-slate-200/80 text-slate-900 backdrop-blur-md'
      }`}
    >
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          if (isExpandedStage) toggleExpandedStage();
        }}
        className="font-display text-xl font-semibold tracking-tight whitespace-nowrap shrink-0"
      >
        Aruna Studio 3D
      </a>

      {/* Zone 2: 4 clean text navigation links with subtle hover underlines */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setCameraFraming('closeup')}
          className={`whitespace-nowrap shrink-0 transition-colors underline-offset-8 hover:underline ${
            cameraFraming === 'closeup'
              ? isDarkMode
                ? 'text-white underline decoration-rose-500 decoration-2'
                : 'text-slate-900 underline decoration-rose-600 decoration-2'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kamera Wajah
        </button>
        <button
          type="button"
          onClick={() => setCameraFraming('waist')}
          className={`whitespace-nowrap shrink-0 transition-colors underline-offset-8 hover:underline ${
            cameraFraming === 'waist'
              ? isDarkMode
                ? 'text-white underline decoration-rose-500 decoration-2'
                : 'text-slate-900 underline decoration-rose-600 decoration-2'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kamera Potret
        </button>
        <button
          type="button"
          onClick={cycleLighting}
          className={`whitespace-nowrap shrink-0 transition-colors underline-offset-8 hover:underline ${
            isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cahaya: {lightingLabel}
        </button>
        <button
          type="button"
          onClick={toggleExpandedStage}
          className={`whitespace-nowrap shrink-0 transition-colors underline-offset-8 hover:underline ${
            isExpandedStage
              ? isDarkMode
                ? 'text-white underline decoration-rose-500 decoration-2'
                : 'text-slate-900 underline decoration-rose-600 decoration-2'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isExpandedStage ? 'Tampilan Split' : 'Panggung Penuh'}
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDarkMode ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${
            isDarkMode
              ? 'bg-slate-800/80 border-white/10 text-amber-300 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleLive}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            isLive
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : isDarkMode
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isLive ? (
            <>
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Akhiri Suara</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Bicara Langsung</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
