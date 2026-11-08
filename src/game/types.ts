import { HexCoord } from './hex';

export type Team = 'player' | 'enemy';

export type TacticalClassType =
  | 'Vanguard Strategist'
  | 'Grand Mastermind'
  | 'Holy Paragon'
  | 'Mounted Marauder'
  | 'Artillery Architect';

export type UnitArchetype =
  | 'Commander'
  | 'Infantry'
  | 'Archer'
  | 'Cavalry'
  | 'SiegeEngine'
  | 'Mage';

export type Stance = 'aggressive' | 'defensive' | 'tactical';

export type TerrainType = 'plains' | 'forest' | 'water' | 'mountain' | 'leynode';

export type ElementalState = 'normal' | 'burning' | 'electrified' | 'frozen';

export type WeatherType = 'clear' | 'rain' | 'fog' | 'sandstorm';

export interface CommanderAura {
  radius: number; // Hex radius (e.g., 2)
  name: string;
  description: string;
  atkBonus: number; // e.g. 0.15 (+15%)
  defBonus: number; // e.g. 0.15 (+15%)
  moveBonus: number; // e.g. +1
  specialEffect?: string;
}

export interface LegacyDomain {
  name: string;
  durationTurns: number; // e.g. 3 turns
  description: string;
  visualTag: string; // theme color or aura styling
  effect: {
    type: 'conquest_phalanx' | 'formless_stratagem' | 'sanctified_consecration' | 'steppe_wind' | 'grand_battery';
    atkMultiplier: number;
    ignoreZoC?: boolean;
    bonusFlankMultiplier?: number;
    terrainShift?: 'burn_forests' | 'sanctify_nodes' | 'electrify_waters';
    healPerTurn?: number;
    rangeBonus?: number;
  };
}

export interface General {
  id: string;
  name: string;
  title: string;
  era: string;
  tacticalClass: TacticalClassType;
  portraitSvg: string; // Custom bespoke vector identifier/color
  themeColor: string; // Tailwind/hex accent
  badgeColor: string;
  
  // Passive Class Trait
  passiveTrait: {
    name: string;
    description: string;
    rule: string;
    bonusAtk?: number;
    bonusMove?: number;
    flankReduction?: number;
    apOnKillBonus?: number;
  };
  
  // Commander Aura
  aura: CommanderAura;
  
  // Legacy Domain (Triggered at 100% Legacy Gauge)
  legacyDomain: LegacyDomain;
  
  // Starter Deck signature cards
  signatureCardIds: string[];
}

export interface Unit {
  id: string;
  team: Team;
  name: string;
  archetype: UnitArchetype;
  generalId?: string; // If this unit is the Commander
  isCommander: boolean;

  // Spatial & Movement
  hex: HexCoord;
  facing: number; // 0..5
  moveRange: number;
  hasMoved: boolean;
  hasAttacked: boolean;

  // Combat Stats
  maxHp: number;
  hp: number;
  baseAtk: number;
  baseDef: number;
  minRange: number;
  maxRange: number;
  stance: Stance;

  // Active status conditions
  burningTurns: number;
  electrifiedTurns: number;
  shieldedHp: number;
  buffTurns: {
    atkBuff?: number;
    moveBuff?: number;
    turns: number;
  } | null;
}

export interface Tile {
  q: number;
  r: number;
  terrain: TerrainType;
  elevation: number; // 0, 1, or 2
  elementState: ElementalState;
  elementTurns: number;
  controller: Team | 'neutral'; // For Ley-Nodes
}

export type CardTargetType = 'unit_ally' | 'unit_enemy' | 'hex' | 'global';

export interface TacticalCard {
  id: string;
  name: string;
  apCost: number;
  targetType: CardTargetType;
  description: string;
  lore: string;
  icon: string;
  rarity: 'common' | 'tactical' | 'legendary';
  effect: {
    kind: 
      | 'heal'
      | 'buff_atk'
      | 'force_march'
      | 'fire_strike'
      | 'lightning_jolt'
      | 'aegis_shield'
      | 'rally_inspiration'
      | 'smoke_screen';
    value: number;
    radius?: number;
  };
}

export interface CombatForecast {
  attacker: Unit;
  defender: Unit;
  baseDamage: number;
  attackerStanceMod: number;
  defenderStanceMod: number;
  elevationMod: number;
  isFlank: boolean;
  flankMod: number;
  auraMod: number;
  terrainDefMod: number;
  finalDamage: number;
  defenderDies: boolean;

  // Counter-attack
  canCounter: boolean;
  counterDamage: number;
  attackerDiesFromCounter: boolean;
  counterFirst: boolean; // True if defender in defensive stance
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  text: string;
  type: 'attack' | 'card' | 'domain' | 'capture' | 'defeat' | 'stance';
}
