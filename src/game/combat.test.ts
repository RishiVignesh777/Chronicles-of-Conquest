import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hexDistance,
  axialToCube,
  cubeToAxial,
  isFlankAttack,
  getFacingDirection,
  HEX_DIRECTIONS,
} from './hex';
import {
  calculateCombatForecast,
  resolveCombat,
  isWithinAura,
} from './combat';
import { Unit, Tile, General } from './types';
import { HISTORICAL_GENERALS } from './generals';

test('Hex math: axial to cube and distance', () => {
  const origin = { q: 0, r: 0 };
  const target = { q: 2, r: -1 };
  const cube = axialToCube(target);
  assert.equal(cube.x + cube.y + cube.z, 0, 'Cube coordinates must sum to 0');
  assert.deepEqual(cubeToAxial(cube), target, 'Round-trip conversion matches');

  const dist = hexDistance(origin, target);
  assert.equal(dist, 2, 'Hex distance calculation is correct');
});

test('Flanking logic: detects rear and side attacks deterministically', () => {
  const defenderHex = { q: 0, r: 0 };
  // Defender facing 0 (East)
  const defenderFacing = 0;

  // Attacker at direction 0 (Frontal) -> not a flank
  const frontAttackerHex = { q: 1, r: 0 };
  assert.equal(isFlankAttack(frontAttackerHex, defenderHex, defenderFacing), false, 'Frontal attack is not a flank');

  // Attacker at direction 3 (Rear / West) -> IS a flank
  const rearAttackerHex = { q: -1, r: 0 };
  assert.equal(isFlankAttack(rearAttackerHex, defenderHex, defenderFacing), true, 'Rear attack is a flank');

  // Attacker at direction 2 (Side / North) -> IS a flank
  const sideAttackerHex = { q: 0, r: -1 };
  assert.equal(isFlankAttack(sideAttackerHex, defenderHex, defenderFacing), true, 'Side attack is a flank');
});

test('Combat Forecast: Elevation modifiers and Stance calculations', () => {
  const dummyTileLow: Tile = {
    q: 0,
    r: 0,
    terrain: 'plains',
    elevation: 0,
    elementState: 'normal',
    elementTurns: 0,
    controller: 'neutral',
  };

  const dummyTileHigh: Tile = {
    q: 1,
    r: 0,
    terrain: 'plains',
    elevation: 1,
    elementState: 'normal',
    elementTurns: 0,
    controller: 'neutral',
  };

  const attacker: Unit = {
    id: 'att_1',
    team: 'player',
    name: 'Vanguard Infantry',
    archetype: 'Infantry',
    isCommander: false,
    hex: { q: 1, r: 0 },
    facing: 3, // Facing West toward defender
    moveRange: 3,
    hasMoved: false,
    hasAttacked: false,
    maxHp: 40,
    hp: 40,
    baseAtk: 25,
    baseDef: 10,
    minRange: 1,
    maxRange: 1,
    stance: 'aggressive',
    burningTurns: 0,
    electrifiedTurns: 0,
    shieldedHp: 0,
    buffTurns: null,
  };

  const defender: Unit = {
    id: 'def_1',
    team: 'enemy',
    name: 'Enemy Legionary',
    archetype: 'Infantry',
    isCommander: false,
    hex: { q: 0, r: 0 },
    facing: 3, // Facing West, so attacker at East (q:1, r:0) hits from rear!
    moveRange: 3,
    hasMoved: false,
    hasAttacked: false,
    maxHp: 40,
    hp: 40,
    baseAtk: 20,
    baseDef: 10,
    minRange: 1,
    maxRange: 1,
    stance: 'defensive',
    burningTurns: 0,
    electrifiedTurns: 0,
    shieldedHp: 0,
    buffTurns: null,
  };

  const alexander = HISTORICAL_GENERALS[0];

  // Downhill attack (attacker elevation 1 vs defender elevation 0)
  const forecast = calculateCombatForecast(
    attacker,
    defender,
    dummyTileHigh,
    dummyTileLow,
    undefined,
    undefined,
    alexander,
    undefined
  );

  assert.equal(forecast.elevationMod, 1.15, 'Downhill attack provides +15% elevation modifier');
  assert.equal(forecast.isFlank, true, 'Attacking from rear provides flank flag');
  assert.equal(forecast.attackerStanceMod, 1.25, 'Aggressive stance provides 1.25x attack modifier');
  assert.equal(forecast.defenderStanceMod, 1.30, 'Defensive stance provides 1.30x defense modifier');
  assert.ok(forecast.finalDamage > 0, 'Final damage must be positive integer');
  assert.equal(forecast.counterFirst, true, 'Defensive stance defender counters first');
});

test('Combat Resolution: Defensive stance preemptive counter and elimination', () => {
  const dummyTile: Tile = {
    q: 0,
    r: 0,
    terrain: 'plains',
    elevation: 0,
    elementState: 'normal',
    elementTurns: 0,
    controller: 'neutral',
  };

  const fragileAttacker: Unit = {
    id: 'att_fragile',
    team: 'player',
    name: 'Skirmisher',
    archetype: 'Infantry',
    isCommander: false,
    hex: { q: 1, r: 0 },
    facing: 3,
    moveRange: 3,
    hasMoved: false,
    hasAttacked: false,
    maxHp: 10,
    hp: 3, // Low HP
    baseAtk: 20,
    baseDef: 5,
    minRange: 1,
    maxRange: 1,
    stance: 'aggressive',
    burningTurns: 0,
    electrifiedTurns: 0,
    shieldedHp: 0,
    buffTurns: null,
  };

  const bracedDefender: Unit = {
    id: 'def_braced',
    team: 'enemy',
    name: 'Braced Sentinel',
    archetype: 'Infantry',
    isCommander: false,
    hex: { q: 0, r: 0 },
    facing: 0,
    moveRange: 2,
    hasMoved: false,
    hasAttacked: false,
    maxHp: 50,
    hp: 50,
    baseAtk: 25,
    baseDef: 15,
    minRange: 1,
    maxRange: 1,
    stance: 'defensive',
    burningTurns: 0,
    electrifiedTurns: 0,
    shieldedHp: 0,
    buffTurns: null,
  };

  const forecast = calculateCombatForecast(
    fragileAttacker,
    bracedDefender,
    dummyTile,
    dummyTile
  );

  assert.equal(forecast.counterFirst, true, 'Defender counters first in defensive stance');
  assert.equal(forecast.attackerDiesFromCounter, true, 'Fragile attacker dies from defensive brace');

  const result = resolveCombat(forecast);
  assert.equal(result.attackerDead, true, 'Attacker was eliminated by preemptive brace');
  assert.equal(result.defenderDead, false, 'Defender took 0 damage because attacker was struck down first');
});
