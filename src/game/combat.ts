import {
  Unit,
  Tile,
  General,
  CombatForecast,
  Stance,
  LegacyDomain,
  Team,
} from './types';
import { hexDistance, isFlankAttack, HexCoord } from './hex';

/**
 * Returns whether unit A is within the Commander Aura radius of the army's general.
 */
export function isWithinAura(unit: Unit, commander: Unit | undefined, auraRadius: number): boolean {
  if (!commander || commander.hp <= 0) return false;
  return hexDistance(unit.hex, commander.hex) <= auraRadius;
}

/**
 * Deterministic Combat Forecast calculation.
 * Zero-RNG, strictly positional and mathematical.
 */
export function calculateCombatForecast(
  attacker: Unit,
  defender: Unit,
  attackerTile: Tile,
  defenderTile: Tile,
  attackerCommander?: Unit,
  defenderCommander?: Unit,
  attackerGeneral?: General,
  defenderGeneral?: General,
  activeDomain?: { team: Team; effect: LegacyDomain['effect'] } | null
): CombatForecast {
  // 1. Stance modifiers
  let attackerStanceMod = 1.0;
  let defenderStanceMod = 1.0;

  if (attacker.stance === 'aggressive') {
    attackerStanceMod = 1.25;
  } else if (attacker.stance === 'defensive') {
    attackerStanceMod = 0.85;
  } else if (attacker.stance === 'tactical') {
    attackerStanceMod = 0.50; // Tactical units focus on maneuvering
  }

  if (defender.stance === 'aggressive') {
    defenderStanceMod = 0.80; // Takes more damage
  } else if (defender.stance === 'defensive') {
    defenderStanceMod = 1.30; // Braced for impact
  } else if (defender.stance === 'tactical') {
    defenderStanceMod = 1.10;
  }

  // 2. Commander Aura modifiers
  let auraAtkMod = 1.0;
  if (attackerGeneral && isWithinAura(attacker, attackerCommander, attackerGeneral.aura.radius)) {
    auraAtkMod += attackerGeneral.aura.atkBonus;
  }

  let auraDefMod = 1.0;
  if (defenderGeneral && isWithinAura(defender, defenderCommander, defenderGeneral.aura.radius)) {
    auraDefMod += defenderGeneral.aura.defBonus;
  }

  // 3. Elevation Modifiers (+15% downhill, -15% uphill)
  let elevationMod = 1.0;
  if (attackerTile.elevation > defenderTile.elevation) {
    elevationMod = 1.15;
    if (attackerGeneral?.id === 'napoleon') {
      elevationMod = 1.30; // Artillery Architect downhill mastery
    }
  } else if (attackerTile.elevation < defenderTile.elevation) {
    elevationMod = 0.85;
  }

  // 4. Terrain Defense modifier
  let terrainDefMod = 1.0;
  if (defenderTile.terrain === 'forest') {
    terrainDefMod = 1.25; // 25% defense bonus from cover
  } else if (defenderTile.terrain === 'mountain') {
    terrainDefMod = 1.35; // Fortified high ground
  } else if (defenderTile.terrain === 'water') {
    terrainDefMod = 0.85; // Disadvantage in water
  } else if (defenderTile.terrain === 'leynode') {
    terrainDefMod = 1.15; // Ley barrier
  }

  // Napoleon / Artillery Architect ignores 50% of terrain defense bonus
  if (attackerGeneral?.id === 'napoleon' && terrainDefMod > 1.0) {
    terrainDefMod = 1.0 + (terrainDefMod - 1.0) * 0.5;
  }

  // 5. Flanking Calculation
  const isFlank = isFlankAttack(attacker.hex, defender.hex, defender.facing);
  let flankMod = 1.0;
  if (isFlank) {
    flankMod = 1.50; // Base flank multiplier
    // Sun Tzu / Grand Mastermind passive bonus:
    if (attackerGeneral?.id === 'suntzu') {
      flankMod = 2.0;
    }
    // Active Legacy Domain bonuses:
    if (activeDomain && activeDomain.team === attacker.team && activeDomain.effect.bonusFlankMultiplier) {
      flankMod += activeDomain.effect.bonusFlankMultiplier;
    }
  }

  // Frontal attack passive for Alexander
  let passiveAtkMod = 1.0;
  if (attackerGeneral?.id === 'alexander' && !isFlank) {
    passiveAtkMod += 0.20; // Phalanx frontal charge bonus
  }
  // Genghis Khan plains bonus
  if (attackerGeneral?.id === 'genghis' && attackerTile.terrain === 'plains') {
    passiveAtkMod += 0.25;
  }

  // Active Domain global attack multiplier
  let domainAtkMultiplier = 1.0;
  if (activeDomain && activeDomain.team === attacker.team) {
    domainAtkMultiplier = activeDomain.effect.atkMultiplier;
  }

  // Active unit temporary buffs
  let unitBuffAtk = 0;
  if (attacker.buffTurns?.atkBuff) {
    unitBuffAtk += attacker.buffTurns.atkBuff;
  }

  // Base Damage computation
  const effectiveAtk = attacker.baseAtk * (attackerStanceMod + unitBuffAtk) * auraAtkMod * passiveAtkMod * domainAtkMultiplier;
  const effectiveDef = defender.baseDef * defenderStanceMod * auraDefMod * terrainDefMod;

  // Formula: (Atk - Def * 0.45) * elevationMod * flankMod
  const rawDmg = Math.max(4, effectiveAtk - effectiveDef * 0.45);
  const finalDamage = Math.max(1, Math.round(rawDmg * elevationMod * flankMod));

  // Check if defender would be destroyed
  const defenderDies = defender.hp + (defender.shieldedHp || 0) <= finalDamage;

  // 6. Counter-Attack Computation
  const dist = hexDistance(attacker.hex, defender.hex);
  const canCounter = dist >= defender.minRange && dist <= defender.maxRange;
  let counterDamage = 0;
  let counterFirst = false;

  if (canCounter) {
    // If defender is in Defensive stance, they brace and counter-attack FIRST!
    if (defender.stance === 'defensive') {
      counterFirst = true;
    }

    let defCounterAtk = defender.baseAtk * (defender.stance === 'defensive' ? 1.15 : 0.85);
    let attCounterDef = attacker.baseDef * (attacker.stance === 'defensive' ? 1.25 : 0.9);
    const counterRaw = Math.max(3, defCounterAtk - attCounterDef * 0.45);
    // Elevation for counter: reverse
    const counterElevMod = defenderTile.elevation > attackerTile.elevation ? 1.15 : (defenderTile.elevation < attackerTile.elevation ? 0.85 : 1.0);
    counterDamage = Math.max(1, Math.round(counterRaw * counterElevMod));
  }

  const attackerDiesFromCounter = counterFirst && (attacker.hp + (attacker.shieldedHp || 0) <= counterDamage);

  return {
    attacker,
    defender,
    baseDamage: attacker.baseAtk,
    attackerStanceMod,
    defenderStanceMod,
    elevationMod,
    isFlank,
    flankMod,
    auraMod: auraAtkMod,
    terrainDefMod,
    finalDamage,
    defenderDies,
    canCounter,
    counterDamage,
    attackerDiesFromCounter,
    counterFirst,
  };
}

/**
 * Applies combat resolution and returns delta changes:
 * - Damaged defender / attacker
 * - Casualties
 * - Anima Points generated
 * - Legacy Echoes generated
 */
export function resolveCombat(forecast: CombatForecast): {
  updatedAttacker: Unit;
  updatedDefender: Unit;
  attackerDead: boolean;
  defenderDead: boolean;
  apGained: number;
  legacyGainedAttacker: number;
  legacyGainedDefender: number;
  logText: string;
} {
  const { attacker, defender, finalDamage, counterDamage, canCounter, counterFirst } = forecast;

  let attackerHp = attacker.hp;
  let attackerShield = attacker.shieldedHp || 0;
  let defenderHp = defender.hp;
  let defenderShield = defender.shieldedHp || 0;

  let apGained = 0;
  let legacyGainedAttacker = 0;
  let legacyGainedDefender = 0;

  // If counterFirst and attacker dies, attacker cannot deal damage
  if (counterFirst && forecast.attackerDiesFromCounter) {
    attackerHp = 0;
    legacyGainedDefender += 20;
    return {
      updatedAttacker: { ...attacker, hp: 0, shieldedHp: 0, hasAttacked: true },
      updatedDefender: { ...defender, hasAttacked: true },
      attackerDead: true,
      defenderDead: false,
      apGained: 0,
      legacyGainedAttacker: 5, // Even in sacrifice, legacy echoes
      legacyGainedDefender,
      logText: `${defender.name} braced in Defensive Stance and executed a preemptive counter-thrust, defeating ${attacker.name}!`,
    };
  }

  // 1. Attacker strikes Defender
  let remainingDmg = finalDamage;
  if (defenderShield > 0) {
    if (defenderShield >= remainingDmg) {
      defenderShield -= remainingDmg;
      remainingDmg = 0;
    } else {
      remainingDmg -= defenderShield;
      defenderShield = 0;
    }
  }
  defenderHp = Math.max(0, defenderHp - remainingDmg);

  if (forecast.isFlank) {
    legacyGainedAttacker += 8; // Flanking mastery rewards legacy
    apGained += 1;
  }

  // 2. Check if defender survives and can counter
  const defenderDead = defenderHp <= 0;
  if (defenderDead) {
    legacyGainedAttacker += 20;
    legacyGainedDefender += 5;
    apGained += 1; // Reward for elimination
  } else if (canCounter) {
    let remainingCounter = counterDamage;
    if (attackerShield > 0) {
      if (attackerShield >= remainingCounter) {
        attackerShield -= remainingCounter;
        remainingCounter = 0;
      } else {
        remainingCounter -= attackerShield;
        attackerShield = 0;
      }
    }
    attackerHp = Math.max(0, attackerHp - remainingCounter);
  }

  const attackerDead = attackerHp <= 0;
  if (attackerDead) {
    legacyGainedDefender += 20;
  }

  const flankTag = forecast.isFlank ? ' [FLANK 1.5x]' : '';
  const elevationTag = forecast.elevationMod > 1.0 ? ' [HIGH GROUND]' : (forecast.elevationMod < 1.0 ? ' [UPHILL]' : '');
  const logText = `${attacker.name} attacked ${defender.name}${flankTag}${elevationTag} for ${finalDamage} damage.${
    defenderDead
      ? ` ${defender.name} was eliminated!`
      : canCounter
      ? ` ${defender.name} counter-attacked for ${counterDamage} damage.`
      : ''
  }`;

  return {
    updatedAttacker: {
      ...attacker,
      hp: attackerHp,
      shieldedHp: attackerShield,
      hasAttacked: true,
      facing: forecast.isFlank ? attacker.facing : attacker.facing, // Retain facing
    },
    updatedDefender: {
      ...defender,
      hp: defenderHp,
      shieldedHp: defenderShield,
      // If survived a flank attack, face toward the attacker
      facing: defenderDead ? defender.facing : (forecast.isFlank ? (attacker.facing + 3) % 6 : defender.facing),
    },
    attackerDead,
    defenderDead,
    apGained,
    legacyGainedAttacker,
    legacyGainedDefender,
    logText,
  };
}

/**
 * Computes Zone of Control (ZoC).
 * An enemy exerts ZoC on all 6 adjacent walkable hexes.
 * Entering a ZoC tile stops movement or costs full movement.
 */
export function isHexInEnemyZoC(hex: HexCoord, enemyTeam: Team, livingUnits: Unit[]): boolean {
  return livingUnits.some(
    u => u.team === enemyTeam && u.hp > 0 && hexDistance(hex, u.hex) === 1
  );
}
