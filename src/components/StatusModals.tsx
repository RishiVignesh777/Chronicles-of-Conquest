import React from 'react';
import { CombatLogEntry } from '../game/types';
import { sound } from '../game/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onExitTitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center text-slate-100">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-xl text-amber-400">
          ⏸
        </div>
        <h2 className="text-2xl font-serif font-bold tracking-wide text-white mb-1">
          Tactical Pause
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Order of battle frozen. Review orders or resume engagement.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              sound.playClick();
              onResume();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Resume Battle [Esc]
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            Restart Campaign
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onExitTitle();
            }}
            className="w-full py-2.5 rounded-xl bg-transparent border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
          >
            Return to War Room
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  stats: {
    turns: number;
    enemiesDefeated: number;
    leyNodesCaptured: number;
    legacyGenerated: number;
    commanderName: string;
  };
  onPlayAgain: () => void;
  onExitTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ stats, onPlayAgain, onExitTitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md select-none">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center text-slate-100">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-950/60 border border-amber-400/80 flex items-center justify-center text-3xl text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce">
          🏆
        </div>

        <h2 className="text-3xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500">
          TRIUMPH & CONQUEST
        </h2>
        <p className="text-xs text-amber-300/80 uppercase tracking-widest font-semibold mt-1 mb-6">
          {stats.commanderName} has unified the battlefield!
        </p>

        {/* Mastery Metric Tiles */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Turns to Victory</div>
            <div className="text-xl font-bold font-mono text-white tabular-nums">{stats.turns}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hostiles Defeated</div>
            <div className="text-xl font-bold font-mono text-amber-300 tabular-nums">{stats.enemiesDefeated}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ley-Nodes Secured</div>
            <div className="text-xl font-bold font-mono text-purple-300 tabular-nums">{stats.leyNodesCaptured}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Legacy Echoes Unleashed</div>
            <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">{Math.round(stats.legacyGenerated)}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            data-start="true"
            onClick={() => {
              sound.playClick();
              onPlayAgain();
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            Play Again / Next Battle
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onExitTitle();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            Return to War Room
          </button>
        </div>
      </div>
    </div>
  );
};

interface DefeatModalProps {
  stats: {
    turns: number;
    enemiesDefeated: number;
    legacyGenerated: number;
  };
  onTryAgain: () => void;
  onExitTitle: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({ stats, onTryAgain, onExitTitle }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md select-none">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.25)] text-center text-slate-100">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-950/60 border border-red-400/80 flex items-center justify-center text-3xl text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
          ⚔
        </div>

        <h2 className="text-3xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-red-200 via-red-400 to-red-600">
          ARMY ROUTED
        </h2>
        <p className="text-xs text-red-300/80 uppercase tracking-widest font-semibold mt-1 mb-6">
          Your Commander has fallen in battle.
        </p>

        {/* Progress Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Turns Resisted</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">{stats.turns}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hostiles Slain</div>
            <div className="text-lg font-bold font-mono text-red-400 tabular-nums">{stats.enemiesDefeated}</div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Legacy Echoes</div>
            <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">{Math.round(stats.legacyGenerated)}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            data-start="true"
            onClick={() => {
              sound.playClick();
              onTryAgain();
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            Re-engage Battle
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onExitTitle();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            Return to War Room
          </button>
        </div>
      </div>
    </div>
  );
};

interface CombatLogModalProps {
  logs: CombatLogEntry[];
  onClose: () => void;
}

export const CombatLogModal: React.FC<CombatLogModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[70vh] text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <h3 className="font-serif font-bold text-base text-amber-300 flex items-center gap-2">
            <span>📜</span> Tactical Combat Chronicle
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic text-center py-8">
              No battle events recorded yet.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`p-2 rounded-lg border leading-relaxed ${
                  log.type === 'defeat'
                    ? 'border-red-900/60 bg-red-950/30 text-red-200'
                    : log.type === 'domain'
                    ? 'border-purple-900/60 bg-purple-950/30 text-purple-200 font-bold'
                    : log.type === 'card'
                    ? 'border-cyan-900/60 bg-cyan-950/30 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300'
                }`}
              >
                <span className="text-slate-500 mr-2">[Turn {log.turn}]</span>
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
