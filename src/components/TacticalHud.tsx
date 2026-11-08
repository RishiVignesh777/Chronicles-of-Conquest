import React from 'react';
import {
  Unit,
  General,
  TacticalCard,
  CombatForecast,
  Stance,
  WeatherType,
  Team,
  LegacyDomain,
} from '../game/types';
import { sound } from '../game/audio';

interface TacticalHudProps {
  turn: number;
  phase: 'player_turn' | 'enemy_turn';
  weather: WeatherType;
  playerGeneral: General;
  enemyGeneral: General;
  playerAp: number;
  playerMaxAp: number;
  legacyGauge: number; // 0..100
  enemyLegacyGauge: number;
  activeDomain: { team: Team; effect: LegacyDomain['effect']; turnsRemaining: number } | null;
  selectedUnit: Unit | null;
  combatForecast: CombatForecast | null;
  hand: TacticalCard[];
  selectedCard: TacticalCard | null;
  isMuted: boolean;
  leyNodeStats: { player: number; enemy: number; neutral: number };
  onSelectCard: (card: TacticalCard | null) => void;
  onSetStance: (unitId: string, stance: Stance) => void;
  onActivateDomain: () => void;
  onEndTurn: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onToggleLog: () => void;
}

export const TacticalHud: React.FC<TacticalHudProps> = ({
  turn,
  phase,
  weather,
  playerGeneral,
  enemyGeneral,
  playerAp,
  playerMaxAp,
  legacyGauge,
  enemyLegacyGauge,
  activeDomain,
  selectedUnit,
  combatForecast,
  hand,
  selectedCard,
  isMuted,
  leyNodeStats,
  onSelectCard,
  onSetStance,
  onActivateDomain,
  onEndTurn,
  onToggleMute,
  onPause,
  onToggleLog,
}) => {
  const isPlayerTurn = phase === 'player_turn';
  const canActivateDomain = isPlayerTurn && legacyGauge >= 100 && (!activeDomain || activeDomain.team !== 'player');

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none text-slate-100 font-sans z-20">
      {/* TOP PERIMETER CLUSTER */}
      <div className="w-full flex items-start justify-between gap-4">
        {/* Left: General & Power Gauges (AP + Legacy Echoes) */}
        <div className="flex items-center gap-3">
          {/* General Crest & Name */}
          <div className="pointer-events-auto bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-serif font-black text-slate-950 text-sm shadow-md"
              style={{ backgroundColor: playerGeneral.themeColor }}
            >
              👑
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">{playerGeneral.name}</div>
              <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                {playerGeneral.tacticalClass}
              </div>
            </div>
          </div>

          {/* Anima Points (AP) Counter */}
          <div className="pointer-events-auto bg-slate-900/90 border border-cyan-500/40 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-2.5">
            <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">AP</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: playerMaxAp }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-4 rounded-sm transform rotate-12 transition-all duration-200 border ${
                    i < playerAp
                      ? 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                      : 'bg-slate-800 border-slate-700 opacity-40'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums ml-1">
              {playerAp}/{playerMaxAp}
            </span>
          </div>

          {/* Legacy Echoes Gauge & Domain Unleash CTA */}
          <div className="pointer-events-auto bg-slate-900/90 border border-purple-500/40 rounded-xl px-3 py-1.5 shadow-lg flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="13" stroke="#334155" strokeWidth="3" fill="none" />
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  stroke={legacyGauge >= 100 ? '#c084fc' : '#a855f7'}
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="81.68"
                  strokeDashoffset={81.68 - (81.68 * Math.min(100, legacyGauge)) / 100}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute text-[9px] font-mono font-bold text-purple-200 tabular-nums">
                {Math.round(legacyGauge)}%
              </span>
            </div>

            {canActivateDomain ? (
              <button
                onClick={() => {
                  sound.playLegacyDomain();
                  onActivateDomain();
                }}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.7)] hover:scale-105 active:scale-95 transition-all animate-pulse cursor-pointer border border-purple-300"
              >
                Domain Ready [L]
              </button>
            ) : (
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {activeDomain?.team === 'player' ? (
                  <span className="text-purple-300">Domain Active ({activeDomain.turnsRemaining}T)</span>
                ) : (
                  <span>Legacy Echoes</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Turn & Phase Banner */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 shadow-lg flex items-center gap-3 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Turn {turn} &bull; {weather.toUpperCase()}
            </div>
            <div
              className={`text-sm font-extrabold uppercase tracking-wider font-serif ${
                isPlayerTurn ? 'text-amber-300' : 'text-red-400 animate-pulse'
              }`}
            >
              {isPlayerTurn ? 'Allied Tactical Phase' : 'Enemy Assault Phase'}
            </div>
          </div>
          {/* Ley-Nodes Ownership */}
          <div className="border-l border-slate-800 pl-3 flex items-center gap-1.5 text-xs font-mono">
            <span className="text-purple-400 font-bold">Ley:</span>
            <span className="text-cyan-400">{leyNodeStats.player}P</span>
            <span className="text-slate-500">/</span>
            <span className="text-red-400">{leyNodeStats.enemy}E</span>
          </div>
        </div>

        {/* Right: Controls & End Turn */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio Mute [M] */}
          <button
            onClick={onToggleMute}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Mute / Unmute [M]"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Combat Log Drawer */}
          <button
            onClick={onToggleLog}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer font-serif text-sm font-bold"
            title="Tactical Log [Z]"
          >
            📜
          </button>

          {/* Pause [Esc] */}
          <button
            onClick={onPause}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer font-mono text-xs font-bold"
            title="Pause [Esc]"
          >
            ⏸
          </button>

          {/* End Turn Button [Space] */}
          <button
            disabled={!isPlayerTurn}
            onClick={() => {
              sound.playClick();
              onEndTurn();
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
              isPlayerTurn
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <span>End Turn</span>
            <span className="font-mono text-[10px] bg-slate-950/20 px-1 py-0.5 rounded">Space</span>
          </button>
        </div>
      </div>

      {/* BOTTOM PERIMETER DOCK */}
      <div className="w-full flex items-end justify-between gap-4">
        {/* Left: Selected Unit Dossier */}
        <div className="w-72 pointer-events-auto">
          {selectedUnit ? (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    {selectedUnit.team === 'player' ? 'Allied Unit' : 'Hostile Unit'}
                  </div>
                  <div className="text-base font-bold text-white font-serif">{selectedUnit.name}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {selectedUnit.archetype}
                </span>
              </div>

              {/* Health Bar with Ghost / Current */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>HP</span>
                  <span className="tabular-nums font-bold">
                    {selectedUnit.hp} / {selectedUnit.maxHp}
                    {selectedUnit.shieldedHp > 0 && ` (+${selectedUnit.shieldedHp})`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedUnit.hp / selectedUnit.maxHp > 0.5
                        ? 'bg-emerald-500'
                        : selectedUnit.hp / selectedUnit.maxHp > 0.25
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${(selectedUnit.hp / selectedUnit.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs mb-3">
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ATK</div>
                  <div className="font-bold text-amber-300 tabular-nums">{selectedUnit.baseAtk}</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">DEF</div>
                  <div className="font-bold text-sky-300 tabular-nums">{selectedUnit.baseDef}</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">RNG</div>
                  <div className="font-bold text-slate-200 tabular-nums">{selectedUnit.minRange}-{selectedUnit.maxRange}</div>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">MOV</div>
                  <div className="font-bold text-slate-200 tabular-nums">{selectedUnit.moveRange}</div>
                </div>
              </div>

              {/* Stance Toggles (if player unit) */}
              {selectedUnit.team === 'player' && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                    Tactical Stance:
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['aggressive', 'defensive', 'tactical'] as Stance[]).map(st => {
                      const isActive = selectedUnit.stance === st;
                      return (
                        <button
                          key={st}
                          onClick={() => {
                            sound.playStanceChange();
                            onSetStance(selectedUnit.id, st);
                          }}
                          className={`py-1 text-[11px] font-bold uppercase rounded-md border transition-all cursor-pointer ${
                            isActive
                              ? st === 'aggressive'
                                ? 'bg-red-950/60 border-red-500 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                : st === 'defensive'
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : 'bg-sky-950/60 border-sky-500 text-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st === 'aggressive' ? '⚔ Atk' : st === 'defensive' ? '🛡 Def' : '⚡ Tac'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 italic">
              Click any allied or enemy unit on the hex grid to inspect stats, aura buffs, and combat forecast.
            </div>
          )}
        </div>

        {/* Center: Tactical Cards Hand */}
        <div className="flex-1 max-w-2xl pointer-events-auto flex justify-center">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2 overflow-x-auto">
            {hand.length === 0 ? (
              <div className="text-xs text-slate-400 px-6 py-2 italic">
                Tactical hand depleted. Draw more cards at start of turn.
              </div>
            ) : (
              hand.map(card => {
                const isSelected = selectedCard?.id === card.id;
                const canAfford = playerAp >= card.apCost;
                return (
                  <button
                    key={card.id}
                    disabled={!canAfford || !isPlayerTurn}
                    onClick={() => {
                      sound.playClick();
                      onSelectCard(isSelected ? null : card);
                    }}
                    className={`relative w-36 sm:w-40 p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-28 cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(34,211,238,0.4)] -translate-y-2'
                        : canAfford && isPlayerTurn
                        ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:-translate-y-1'
                        : 'border-slate-900 bg-slate-950/40 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider truncate">
                          {card.name}
                        </span>
                        <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center">
                          {card.apCost}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">
                        {card.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-mono mt-1">
                      <span>{card.targetType}</span>
                      <span className="text-cyan-400 font-bold">{isSelected ? 'ACTIVE' : 'READY'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Combat Forecast Inspection */}
        <div className="w-72 pointer-events-auto">
          {combatForecast ? (
            <div className="bg-slate-900/95 border border-red-500/50 rounded-2xl p-3.5 shadow-2xl">
              <div className="flex items-center justify-between mb-1 text-xs font-bold uppercase tracking-wider text-red-400">
                <span>⚔ Attack Forecast</span>
                {combatForecast.isFlank && (
                  <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/40">
                    FLANK 1.5x
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 mb-2 font-mono">
                {combatForecast.attacker.name} &rarr; {combatForecast.defender.name}
              </div>

              {/* Exact Deterministic Math Breakdown */}
              <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 text-xs font-mono space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dealt Damage:</span>
                  <span className="font-bold text-red-400 tabular-nums">
                    -{combatForecast.finalDamage} HP
                    {combatForecast.defenderDies && ' (KO)'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Elevation Mod:</span>
                  <span className="text-slate-300 font-bold">
                    {combatForecast.elevationMod > 1 ? '+15% High Ground' : (combatForecast.elevationMod < 1 ? '-15% Uphill' : '1.0x Flat')}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Counter Attack:</span>
                  <span className={`font-bold ${combatForecast.canCounter ? 'text-amber-400' : 'text-slate-500'}`}>
                    {combatForecast.canCounter
                      ? `${combatForecast.counterFirst ? '[PREEMPTIVE] ' : ''}-${combatForecast.counterDamage} HP`
                      : 'None (Out of range)'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-400 italic">
                Click highlighted target to execute strike
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400">
              <div className="font-bold text-slate-300 mb-1">Tactical Tip:</div>
              Flanking deals 1.5x damage from the defender's rear or flank. High ground grants +15% damage bonus and extended reach.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
