import { Tile, TerrainType, Unit, Team, WeatherType } from './types';
import { HexCoord } from './hex';

export interface ScenarioMap {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  weather: WeatherType;
  radius: number; // Hex radius from center
  tiles: Tile[];
  playerSpawnHexes: { archetype: Unit['archetype']; name: string; hex: HexCoord; facing: number }[];
  enemySpawnHexes: { archetype: Unit['archetype']; name: string; hex: HexCoord; facing: number }[];
  leyNodes: HexCoord[];
}

/**
 * Generates a symmetric, balanced tactical hex grid
 */
function createHexGrid(
  radius: number,
  terrainGen: (q: number, r: number) => { terrain: TerrainType; elevation: number }
): Tile[] {
  const tiles: Tile[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const { terrain, elevation } = terrainGen(q, r);
      tiles.push({
        q,
        r,
        terrain,
        elevation,
        elementState: 'normal',
        elementTurns: 0,
        controller: terrain === 'leynode' ? 'neutral' : 'neutral',
      });
    }
  }
  return tiles;
}

export const SCENARIOS: ScenarioMap[] = [
  {
    id: 'gaugamela',
    name: 'Plains of Gaugamela',
    subtitle: 'Rolling Hills & Ley Fountains',
    description: 'A vast expanse ideal for cavalry sweeps, anchored by two contested ancient Ley-Nodes and elevated ridges.',
    weather: 'clear',
    radius: 4,
    tiles: createHexGrid(4, (q, r) => {
      // Contested Ley-Nodes
      if ((q === 0 && r === -2) || (q === 0 && r === 2)) {
        return { terrain: 'leynode', elevation: 1 };
      }
      // Central high ridge
      if (q === 0 && r === 0) {
        return { terrain: 'plains', elevation: 2 };
      }
      // Forests flanking
      if ((q === -2 && r === 1) || (q === -3 && r === 2) || (q === 2 && r === -1) || (q === 3 && r === -2)) {
        return { terrain: 'forest', elevation: 0 };
      }
      // Rocky bluffs
      if ((q === -1 && r === -2) || (q === 1 && r === 2)) {
        return { terrain: 'mountain', elevation: 2 };
      }
      // Water stream on side
      if (q === -4 && r >= 0) {
        return { terrain: 'water', elevation: 0 };
      }
      return { terrain: 'plains', elevation: Math.abs(q) <= 1 && Math.abs(r) <= 1 ? 1 : 0 };
    }),
    playerSpawnHexes: [
      { archetype: 'Commander', name: 'General', hex: { q: -3, r: 0 }, facing: 0 },
      { archetype: 'Infantry', name: 'Phalanx Guard', hex: { q: -2, r: 0 }, facing: 0 },
      { archetype: 'Cavalry', name: 'Companion Cavalry', hex: { q: -3, r: -1 }, facing: 0 },
      { archetype: 'Archer', name: 'Cretan Bowmen', hex: { q: -3, r: 1 }, facing: 0 },
      { archetype: 'Infantry', name: 'Royal Hypaspists', hex: { q: -2, r: -1 }, facing: 0 },
    ],
    enemySpawnHexes: [
      { archetype: 'Commander', name: 'Enemy Commander', hex: { q: 3, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Immortal Vanguard', hex: { q: 2, r: 0 }, facing: 3 },
      { archetype: 'Cavalry', name: 'Heavy Cataphract', hex: { q: 3, r: 1 }, facing: 3 },
      { archetype: 'Archer', name: 'Persian Longbows', hex: { q: 3, r: -1 }, facing: 3 },
      { archetype: 'Infantry', name: 'Shield Cohort', hex: { q: 2, r: 1 }, facing: 3 },
    ],
    leyNodes: [{ q: 0, r: -2 }, { q: 0, r: 2 }],
  },
  {
    id: 'thermopylae',
    name: 'Pass of the Hot Gates',
    subtitle: 'Choke Point Defile & Mountain Peaks',
    description: 'Impassable jagged mountains flank a narrow passage. Controlling the central high ground guarantees tactical supremacy.',
    weather: 'rain',
    radius: 4,
    tiles: createHexGrid(4, (q, r) => {
      // Central Ley-Node
      if (q === 0 && r === 0) {
        return { terrain: 'leynode', elevation: 1 };
      }
      // Mountain barriers top and bottom
      if (r === -3 || r === 3 || (Math.abs(q) === 2 && Math.abs(r) === 2)) {
        return { terrain: 'mountain', elevation: 2 };
      }
      // Water shore
      if (r === -2 && q >= 0) {
        return { terrain: 'water', elevation: 0 };
      }
      // Forest ambushes
      if ((q === -1 && r === 1) || (q === 1 && r === -1)) {
        return { terrain: 'forest', elevation: 1 };
      }
      return { terrain: 'plains', elevation: Math.abs(q) <= 1 ? 1 : 0 };
    }),
    playerSpawnHexes: [
      { archetype: 'Commander', name: 'General', hex: { q: -3, r: 0 }, facing: 0 },
      { archetype: 'Infantry', name: 'Spartan Hoplites', hex: { q: -2, r: 0 }, facing: 0 },
      { archetype: 'Infantry', name: 'Theban Phalanx', hex: { q: -2, r: 1 }, facing: 0 },
      { archetype: 'Archer', name: 'Athenian Skirmishers', hex: { q: -3, r: 1 }, facing: 0 },
    ],
    enemySpawnHexes: [
      { archetype: 'Commander', name: 'Enemy Overlord', hex: { q: 3, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Iron Guard', hex: { q: 2, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Frontline Cohort', hex: { q: 2, r: -1 }, facing: 3 },
      { archetype: 'Archer', name: 'Shadow Marksmen', hex: { q: 3, r: -1 }, facing: 3 },
    ],
    leyNodes: [{ q: 0, r: 0 }],
  },
  {
    id: 'austerlitz',
    name: 'Pratzen Heights',
    subtitle: 'Fog of War & Artillery Redoubts',
    description: 'Dense morning fog obscures line of sight until units advance onto the central plateau.',
    weather: 'fog',
    radius: 4,
    tiles: createHexGrid(4, (q, r) => {
      // Plateau
      if (Math.abs(q) <= 1 && Math.abs(r) <= 1) {
        if (q === 0 && r === 0) return { terrain: 'leynode', elevation: 2 };
        return { terrain: 'plains', elevation: 2 };
      }
      // Forest valleys
      if (r === 2 || r === -2) {
        return { terrain: 'forest', elevation: 0 };
      }
      // Ponds and swamps
      if ((q === -2 && r === 3) || (q === 2 && r === -3)) {
        return { terrain: 'water', elevation: 0 };
      }
      return { terrain: 'plains', elevation: 0 };
    }),
    playerSpawnHexes: [
      { archetype: 'Commander', name: 'General', hex: { q: -3, r: 0 }, facing: 0 },
      { archetype: 'Infantry', name: 'Old Guard Grenadiers', hex: { q: -2, r: 0 }, facing: 0 },
      { archetype: 'Archer', name: 'Horse Artillery', hex: { q: -3, r: -1 }, facing: 0 },
      { archetype: 'Cavalry', name: 'Chasseurs à Cheval', hex: { q: -3, r: 1 }, facing: 0 },
    ],
    enemySpawnHexes: [
      { archetype: 'Commander', name: 'Enemy Marshal', hex: { q: 3, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Imperial Grenadiers', hex: { q: 2, r: 0 }, facing: 3 },
      { archetype: 'Archer', name: 'Heavy Battery', hex: { q: 3, r: 1 }, facing: 3 },
      { archetype: 'Cavalry', name: 'Cossack Lancers', hex: { q: 3, r: -1 }, facing: 3 },
    ],
    leyNodes: [{ q: 0, r: 0 }],
  },
  {
    id: 'cannae',
    name: 'The Battle of Cannae',
    subtitle: 'Double Envelopment & Crescent Inversion',
    description: 'Hannibal Barca faces the massive consular legions of Gaius Terentius Varro alongside the River Aufidus.',
    weather: 'clear',
    radius: 4,
    tiles: createHexGrid(4, (q, r) => {
      // River Aufidus on one flank
      if (r === -4 || (r === -3 && q >= 0)) {
        return { terrain: 'water', elevation: 0 };
      }
      // Ancient Hill of Cannae & Roman granary ruins
      if (q === 0 && r === 2) {
        return { terrain: 'leynode', elevation: 2 };
      }
      // Southern ridge
      if (r === 3 && Math.abs(q) <= 2) {
        return { terrain: 'mountain', elevation: 2 };
      }
      // Olive groves / scrub forests
      if ((q === -2 && r === 1) || (q === 2 && r === -1)) {
        return { terrain: 'forest', elevation: 1 };
      }
      return { terrain: 'plains', elevation: Math.abs(q) <= 1 ? 1 : 0 };
    }),
    playerSpawnHexes: [
      { archetype: 'Commander', name: 'Hannibal Barca', hex: { q: -2, r: 0 }, facing: 0 },
      { archetype: 'Infantry', name: 'Iberian Veterans', hex: { q: -1, r: -1 }, facing: 0 },
      { archetype: 'Infantry', name: 'Celtic Vanguard', hex: { q: -1, r: 1 }, facing: 0 },
      { archetype: 'Cavalry', name: 'Numidian Light Cavalry', hex: { q: -3, r: 2 }, facing: 0 },
      { archetype: 'Cavalry', name: 'Hasdrubal Heavy Cavalry', hex: { q: -3, r: -2 }, facing: 0 },
      { archetype: 'Archer', name: 'Balearic Slingers', hex: { q: -3, r: 0 }, facing: 0 },
    ],
    enemySpawnHexes: [
      { archetype: 'Commander', name: 'Consul Varro', hex: { q: 3, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Consular Legion I', hex: { q: 1, r: -1 }, facing: 3 },
      { archetype: 'Infantry', name: 'Consular Legion II', hex: { q: 1, r: 0 }, facing: 3 },
      { archetype: 'Infantry', name: 'Consular Legion III', hex: { q: 1, r: 1 }, facing: 3 },
      { archetype: 'Cavalry', name: 'Roman Equites', hex: { q: 2, r: -2 }, facing: 3 },
      { archetype: 'Archer', name: 'Velites Skirmishers', hex: { q: 2, r: 1 }, facing: 3 },
    ],
    leyNodes: [{ q: 0, r: 2 }],
  },
];

export function createInitialUnits(
  scenario: ScenarioMap,
  playerGeneralId: string,
  enemyGeneralId: string
): Unit[] {
  const units: Unit[] = [];

  // Player units
  scenario.playerSpawnHexes.forEach((spawn, idx) => {
    const isCommander = spawn.archetype === 'Commander';
    units.push({
      id: `p_${idx}`,
      team: 'player',
      name: isCommander ? 'Player Commander' : spawn.name,
      archetype: spawn.archetype,
      generalId: isCommander ? playerGeneralId : undefined,
      isCommander,
      hex: { ...spawn.hex },
      facing: spawn.facing,
      moveRange: spawn.archetype === 'Cavalry' ? 4 : (spawn.archetype === 'Archer' ? 2 : 3),
      hasMoved: false,
      hasAttacked: false,
      maxHp: isCommander ? 65 : (spawn.archetype === 'Infantry' ? 45 : (spawn.archetype === 'Cavalry' ? 38 : 30)),
      hp: isCommander ? 65 : (spawn.archetype === 'Infantry' ? 45 : (spawn.archetype === 'Cavalry' ? 38 : 30)),
      baseAtk: isCommander ? 26 : (spawn.archetype === 'Infantry' ? 22 : (spawn.archetype === 'Cavalry' ? 24 : 20)),
      baseDef: isCommander ? 14 : (spawn.archetype === 'Infantry' ? 14 : (spawn.archetype === 'Cavalry' ? 10 : 8)),
      minRange: spawn.archetype === 'Archer' ? 2 : 1,
      maxRange: spawn.archetype === 'Archer' ? 3 : 1,
      stance: 'aggressive',
      burningTurns: 0,
      electrifiedTurns: 0,
      shieldedHp: 0,
      buffTurns: null,
    });
  });

  // Enemy units
  scenario.enemySpawnHexes.forEach((spawn, idx) => {
    const isCommander = spawn.archetype === 'Commander';
    units.push({
      id: `e_${idx}`,
      team: 'enemy',
      name: isCommander ? 'Enemy Commander' : spawn.name,
      archetype: spawn.archetype,
      generalId: isCommander ? enemyGeneralId : undefined,
      isCommander,
      hex: { ...spawn.hex },
      facing: spawn.facing,
      moveRange: spawn.archetype === 'Cavalry' ? 4 : (spawn.archetype === 'Archer' ? 2 : 3),
      hasMoved: false,
      hasAttacked: false,
      maxHp: isCommander ? 65 : (spawn.archetype === 'Infantry' ? 45 : (spawn.archetype === 'Cavalry' ? 38 : 30)),
      hp: isCommander ? 65 : (spawn.archetype === 'Infantry' ? 45 : (spawn.archetype === 'Cavalry' ? 38 : 30)),
      baseAtk: isCommander ? 26 : (spawn.archetype === 'Infantry' ? 22 : (spawn.archetype === 'Cavalry' ? 24 : 20)),
      baseDef: isCommander ? 14 : (spawn.archetype === 'Infantry' ? 14 : (spawn.archetype === 'Cavalry' ? 10 : 8)),
      minRange: spawn.archetype === 'Archer' ? 2 : 1,
      maxRange: spawn.archetype === 'Archer' ? 3 : 1,
      stance: 'aggressive',
      burningTurns: 0,
      electrifiedTurns: 0,
      shieldedHp: 0,
      buffTurns: null,
    });
  });

  return units;
}
