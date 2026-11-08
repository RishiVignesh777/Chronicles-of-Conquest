import React, { useState } from 'react';
import { General } from '../game/types';
import { HISTORICAL_GENERALS } from '../game/generals';
import { SCENARIOS, ScenarioMap } from '../game/maps';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStartGame: (general: General, scenario: ScenarioMap) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [selectedGeneralIndex, setSelectedGeneralIndex] = useState<number>(0);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);

  const general = HISTORICAL_GENERALS[selectedGeneralIndex];
  const scenario = SCENARIOS[selectedScenarioIndex];

  const handleStart = () => {
    sound.playClick();
    onStartGame(general, scenario);
  };

  return (
    <div
      className="relative w-full min-h-screen overflow-y-auto flex flex-col justify-between bg-slate-950 text-slate-100 font-sans select-none py-3 sm:py-5 px-3 sm:px-6"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, #172554 0%, #090d16 75%)',
      }}
    >
      {/* Subtle animated hex background grid overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* TOP HEADER: BESPOKE INLINE SVG TITLE LOCKUP */}
      <header className="relative z-10 pt-2 sm:pt-4 pb-2 flex flex-col items-center text-center px-2">
        {/* Custom Crest Emblem */}
        <div className="w-10 h-10 sm:w-14 sm:h-14 mb-1.5 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            {/* Hexagonal Shield */}
            <polygon
              points="50,5 90,28 90,72 50,95 10,72 10,28"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="#0f172a"
              fillOpacity="0.8"
            />
            <polygon
              points="50,14 82,32 82,68 50,86 18,68 18,32"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Crossed Blades */}
            <path
              d="M28 28 L72 72 M34 26 L26 34 M66 74 L74 66"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M72 28 L28 72 M66 26 L74 34 M34 74 L26 66"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Center Laurel & Star */}
            <circle cx="50" cy="50" r="12" stroke="#f59e0b" strokeWidth="1.5" />
            <polygon
              points="50,42 53,47 58,48 54,52 55,58 50,55 45,58 46,52 42,48 47,47"
              fill="#f59e0b"
            />
          </svg>
        </div>

        {/* Display Typography */}
        <h1
          className="text-2xl sm:text-4xl md:text-5xl tracking-wider font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          CHRONICLES OF CONQUEST
        </h1>
        <p className="mt-1 text-[11px] sm:text-xs tracking-[0.3em] uppercase text-cyan-400 font-semibold drop-shadow">
          Echoes of Eternity · Hex-Grid Tactical Engine
        </p>
      </header>

      {/* CENTER STAGE: COMMANDER SELECTION & SCENARIO INTEL */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto flex flex-col justify-center items-center py-2">
        {/* Commander Selector Tabs - Clean wrap / scrollable row */}
        <div className="w-full flex justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 flex-wrap max-w-4xl">
          {HISTORICAL_GENERALS.map((gen, idx) => {
            const isSelected = idx === selectedGeneralIndex;
            return (
              <button
                key={gen.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedGeneralIndex(idx);
                }}
                className={`relative px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${gen.badgeColor} shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105 border-current`
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: gen.themeColor }} />
                <span className="truncate">{gen.name}</span>
              </button>
            );
          })}
        </div>

        {/* Commander Tactical Dossier Card */}
        <div className="w-full bg-slate-900/85 border border-slate-800/90 rounded-xl p-4 sm:p-6 shadow-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Left Column: General Persona */}
          <div className="md:col-span-5 flex flex-col border-b md:border-b-0 md:border-r border-slate-800/80 pb-3 md:pb-0 md:pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border"
                style={{
                  borderColor: `${general.themeColor}88`,
                  color: general.themeColor,
                  backgroundColor: `${general.themeColor}15`,
                }}
              >
                {general.tacticalClass}
              </span>
              <span className="text-[10px] text-slate-400 truncate">{general.era}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-serif">
              {general.name}
            </h2>
            <p className="text-xs text-slate-400 italic mt-0.5 mb-2.5">
              {general.title}
            </p>

            {/* Passive Trait */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 mb-2">
              <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                <span>🛡 Trait:</span>
                <span className="text-white font-normal truncate">{general.passiveTrait.name}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {general.passiveTrait.rule}
              </p>
            </div>

            {/* Commander Aura */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-sky-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                <span>✨ Aura (R={general.aura.radius}):</span>
                <span className="text-white font-normal truncate">{general.aura.name}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {general.aura.specialEffect}
              </p>
            </div>
          </div>

          {/* Right Column: Legacy Domain & Battle Map Config */}
          <div className="md:col-span-7 flex flex-col justify-between h-full gap-3">
            {/* Legacy Domain Showcase */}
            <div className="p-3 sm:p-3.5 rounded-lg border border-purple-500/40 bg-purple-950/20 shadow-[inset_0_0_15px_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  Legacy Domain (100% Echoes · 3 Turns)
                </span>
                <span className="text-[10px] font-mono text-purple-400 font-bold">WARP TERRAIN</span>
              </div>
              <h3 className="text-base font-bold text-white font-serif tracking-wide">
                {general.legacyDomain.name}
              </h3>
              <p className="text-[11px] text-purple-200/90 leading-relaxed mt-0.5">
                {general.legacyDomain.description}
              </p>
            </div>

            {/* Scenario Map Selector - 4 columns on desktop */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Select Battle Scenario:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {SCENARIOS.map((scen, idx) => {
                  const isScenSelected = idx === selectedScenarioIndex;
                  return (
                    <button
                      key={scen.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedScenarioIndex(idx);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isScenSelected
                          ? 'border-amber-400/80 bg-amber-950/30 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{scen.name}</div>
                      <div className="text-[9px] text-slate-400 uppercase mt-0.5">
                        {scen.weather.toUpperCase()} · R{scen.radius}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                Opponent: <span className="text-red-400 font-semibold">{HISTORICAL_GENERALS[(selectedGeneralIndex + 1) % HISTORICAL_GENERALS.length].name}</span>
              </div>
              <button
                data-start="true"
                onClick={handleStart}
                className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Deploy Army</span>
                <span className="text-base">⚔</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER: FLAT NON-INTERACTIVE CONTROL HINT LINE */}
      <footer className="relative z-10 pt-2 pb-1 text-center text-[11px] tracking-wider text-slate-400 select-none">
        <span className="font-mono text-slate-300">Space / Enter</span> Deploy Army &bull;{' '}
        <span className="font-mono text-slate-300">Click</span> Move & Attack &bull;{' '}
        <span className="font-mono text-slate-300">L</span> Legacy Domain &bull;{' '}
        <span className="font-mono text-slate-300">Esc</span> Pause
      </footer>
    </div>
  );
};
