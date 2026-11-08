import { Unit, Tile, General, LegacyDomain } from './types';
import {
  HexCoord,
  hexDistance,
  getFacingDirection,
  hexEquals,
  hexKey,
} from './hex';
import {
  calculateCombatForecast,
  isHexInEnemyZoC,
} from './combat';

export type AIAction =
  | { type: 'domain' }
  | { type: 'stance'; unitId: string; stance: 'aggressive' | 'defensive' | 'tactical' }
  | { type: 'move'; unitId: string; toHex: HexCoord; facing: number }
  | { type: 'attack'; attackerId: string; targetId: string };

/**
 * Deterministic tactical AI turn planner.
 */
export function planAITurn(
  units: Unit[],
  tiles: Map<string, Tile>,
  enemyGeneral: General,
  playerGeneral: General,
  enemyLegacyGauge: number,
  activeDomain: { team: 'player' | 'enemy'; effect: LegacyDomain['effect'] } | null
): AIAction[] {
  const actions: AIAction[] = [];
  const enemyUnits = units.filter(u => u.team === 'enemy' && u.hp > 0);
  const playerUnits = units.filter(u => u.team === 'player' && u.hp > 0);

  if (enemyUnits.length === 0 || playerUnits.length === 0) return actions;

  // 1. Trigger Legacy Domain if gauge is 100% and not already active
  if (enemyLegacyGauge >= 100 && (!activeDomain || activeDomain.team !== 'enemy')) {
    actions.push({ type: 'domain' });
  }

  const enemyCommander = enemyUnits.find(u => u.isCommander);
  const playerCommander = playerUnits.find(u => u.isCommander);

  // Track occupied hexes during planning
  const occupiedHexes = new Map<string, string>();
  units.forEach(u => {
    if (u.hp > 0) occupiedHexes.set(hexKey(u.hex), u.id);
  });

  // Evaluate each enemy unit
  for (const enemy of enemyUnits) {
    const isWounded = enemy.hp < enemy.maxHp * 0.4;

    // Check if defensive stance is optimal when heavily wounded
    if (isWounded && enemy.stance !== 'defensive') {
      actions.push({ type: 'stance', unitId: enemy.id, stance: 'defensive' });
    }

    // Find all reachable hexes for movement
    const reachableHexes = getReachableHexes(enemy, tiles, units, occupiedHexes);

    // Evaluate best movement & attack option
    let bestScore = -Infinity;
    let bestHex: HexCoord = enemy.hex;
    let bestTarget: Unit | null = null;
    let bestFacing = enemy.facing;

    for (const testHex of reachableHexes) {
      const tile = tiles.get(hexKey(testHex));
      if (!tile) continue;

      let baseScore = 0;

      // Advantage of holding a Ley-Node
      if (tile.terrain === 'leynode') {
        baseScore += 35;
      }
      // High ground bonus
      baseScore += tile.elevation * 15;

      // Commander aura clustering bonus
      if (enemyCommander && hexDistance(testHex, enemyCommander.hex) <= enemyGeneral.aura.radius) {
        baseScore += 18;
      }

      // Check attacks from this position
      let foundAttack = false;
      for (const target of playerUnits) {
        const dist = hexDistance(testHex, target.hex);
        if (dist >= enemy.minRange && dist <= enemy.maxRange) {
          foundAttack = true;
          const targetTile = tiles.get(hexKey(target.hex)) || tile;
          const dummyAttacker: Unit = { ...enemy, hex: testHex };
          const forecast = calculateCombatForecast(
            dummyAttacker,
            target,
            tile,
            targetTile,
            enemyCommander,
            playerCommander,
            enemyGeneral,
            playerGeneral,
            activeDomain
          );

          let attackScore = baseScore + forecast.finalDamage * 2;
          if (forecast.defenderDies) attackScore += 120; // High priority kill
          if (forecast.isFlank) attackScore += 45; // Exploit flank
          if (target.isCommander) attackScore += 50; // Threaten commander

          // Penalty if counter damages enemy heavily
          if (forecast.canCounter) {
            attackScore -= forecast.counterDamage;
            if (forecast.attackerDiesFromCounter) attackScore -= 200; // Avoid suicide
          }

          if (attackScore > bestScore) {
            bestScore = attackScore;
            bestHex = testHex;
            bestTarget = target;
            bestFacing = getFacingDirection(testHex, target.hex);
          }
        }
      }

      // If no attack from here, evaluate advance toward closest player unit
      if (!foundAttack) {
        let minDist = Infinity;
        let closestTarget = playerUnits[0];
        for (const p of playerUnits) {
          const d = hexDistance(testHex, p.hex);
          if (d < minDist) {
            minDist = d;
            closestTarget = p;
          }
        }
        const advanceScore = baseScore + (15 - minDist * 4);
        if (advanceScore > bestScore) {
          bestScore = advanceScore;
          bestHex = testHex;
          bestTarget = null;
          bestFacing = getFacingDirection(testHex, closestTarget.hex);
        }
      }
    }

    // Register movement if moving to a different hex
    if (!hexEquals(bestHex, enemy.hex)) {
      actions.push({
        type: 'move',
        unitId: enemy.id,
        toHex: bestHex,
        facing: bestFacing,
      });
      occupiedHexes.delete(hexKey(enemy.hex));
      occupiedHexes.set(hexKey(bestHex), enemy.id);
    }

    // Register attack if target found
    if (bestTarget) {
      actions.push({
        type: 'attack',
        attackerId: enemy.id,
        targetId: bestTarget.id,
      });
    }
  }

  return actions;
}

function getReachableHexes(
  unit: Unit,
  tiles: Map<string, Tile>,
  units: Unit[],
  occupiedHexes: Map<string, string>
): HexCoord[] {
  const results: HexCoord[] = [unit.hex];
  const queue: { hex: HexCoord; cost: number }[] = [{ hex: unit.hex, cost: 0 }];
  const visited = new Set<string>([hexKey(unit.hex)]);

  const maxMove = unit.moveRange + (unit.stance === 'tactical' ? 1 : 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.cost >= maxMove) continue;

    // Check 6 neighbors
    const neighbors = [
      { q: current.hex.q + 1, r: current.hex.r },
      { q: current.hex.q + 1, r: current.hex.r - 1 },
      { q: current.hex.q, r: current.hex.r - 1 },
      { q: current.hex.q - 1, r: current.hex.r },
      { q: current.hex.q - 1, r: current.hex.r + 1 },
      { q: current.hex.q, r: current.hex.r + 1 },
    ];

    for (const next of neighbors) {
      const key = hexKey(next);
      if (visited.has(key)) continue;

      const tile = tiles.get(key);
      if (!tile || tile.terrain === 'mountain') continue; // Impassable

      const occupantId = occupiedHexes.get(key);
      if (occupantId && occupantId !== unit.id) continue; // Occupied

      // Terrain cost
      let moveCost = 1;
      if (tile.terrain === 'forest' || tile.terrain === 'water') {
        moveCost = 2;
      }

      // Check Zone of Control: passing adjacent to player units
      const inZoC = isHexInEnemyZoC(next, 'player', units);
      if (inZoC) {
        moveCost += 1;
      }

      const totalCost = current.cost + moveCost;
      if (totalCost <= maxMove) {
        visited.add(key);
        results.push(next);
        queue.push({ hex: next, cost: totalCost });
      }
    }
  }

  return results;
}
