import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Unit,
  Tile,
  General,
  TacticalCard,
  CombatForecast,
  Stance,
  WeatherType,
  LegacyDomain,
  CombatLogEntry,
} from './game/types';
import { HISTORICAL_GENERALS } from './game/generals';
import { SCENARIOS, ScenarioMap, createInitialUnits } from './game/maps';
import { ALL_TACTICAL_CARDS, COMMON_CARDS } from './game/cards';
import {
  HexCoord,
  hexKey,
  hexDistance,
  getFacingDirection,
  hexEquals,
} from './game/hex';
import {
  calculateCombatForecast,
  resolveCombat,
} from './game/combat';
import { planAITurn } from './game/ai';
import { sound } from './game/audio';
import { HexCanvas } from './game/HexCanvas';
import { TitleScreen } from './components/TitleScreen';
import { TacticalHud } from './components/TacticalHud';
import {
  PauseModal,
  VictoryModal,
  DefeatModal,
  CombatLogModal,
} from './components/StatusModals';

export default function App() {
  // Game State Machine: 'title' | 'playing' | 'paused' | 'victory' | 'defeat'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'victory' | 'defeat'>('title');

  // Scenario & Generals setup
  const [selectedGeneral, setSelectedGeneral] = useState<General>(HISTORICAL_GENERALS[0]);
  const [enemyGeneral, setEnemyGeneral] = useState<General>(HISTORICAL_GENERALS[1]);
  const [activeScenario, setActiveScenario] = useState<ScenarioMap>(SCENARIOS[0]);

  // Turn & Economy
  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<'player_turn' | 'enemy_turn'>('player_turn');
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [playerAp, setPlayerAp] = useState<number>(4);
  const [playerMaxAp, setPlayerMaxAp] = useState<number>(6);
  const [legacyGauge, setLegacyGauge] = useState<number>(20);
  const [enemyLegacyGauge, setEnemyLegacyGauge] = useState<number>(15);
  const [activeDomain, setActiveDomain] = useState<{
    team: 'player' | 'enemy';
    effect: LegacyDomain['effect'];
    turnsRemaining: number;
  } | null>(null);

  // Entities
  const [tiles, setTiles] = useState<Map<string, Tile>>(new Map());
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

  // Cards & Deck
  const [hand, setHand] = useState<TacticalCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<TacticalCard | null>(null);

  // UI Modals & Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);

  // Statistics for Victory/Defeat screen
  const [endGameStats, setEndGameStats] = useState({
    turns: 1,
    enemiesDefeated: 0,
    leyNodesCaptured: 0,
    legacyGenerated: 20,
    commanderName: '',
  });

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    let bodyState = 'title';
    if (gameState === 'playing') bodyState = 'playing';
    else if (gameState === 'paused') bodyState = 'paused';
    else if (gameState === 'victory' || gameState === 'defeat') bodyState = 'gameover';
    document.body.dataset.state = bodyState;
  }, [gameState]);

  // Check URL query parameters for ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      initGame(HISTORICAL_GENERALS[0], SCENARIOS[0]);
    }
  }, []);

  // Initialize new game session
  const initGame = useCallback((general: General, scenario: ScenarioMap) => {
    setSelectedGeneral(general);
    // Pick different enemy general
    const enemyGen = HISTORICAL_GENERALS.find(g => g.id !== general.id) || HISTORICAL_GENERALS[1];
    setEnemyGeneral(enemyGen);
    setActiveScenario(scenario);
    setWeather(scenario.weather);

    // Tiles map
    const tileMap = new Map<string, Tile>();
    scenario.tiles.forEach(t => tileMap.set(hexKey({ q: t.q, r: t.r }), { ...t }));
    setTiles(tileMap);

    // Units
    const initUnits = createInitialUnits(scenario, general.id, enemyGen.id);
    setUnits(initUnits);

    // Reset economy
    setTurn(1);
    setPhase('player_turn');
    setPlayerAp(4);
    setPlayerMaxAp(6);
    setLegacyGauge(20);
    setEnemyLegacyGauge(15);
    setActiveDomain(null);
    setSelectedUnitId(null);
    setSelectedCard(null);

    // Initialize Deck & Hand
    const starterCards: TacticalCard[] = [
      ...general.signatureCardIds.map(id => ALL_TACTICAL_CARDS[id] || COMMON_CARDS[0]),
      COMMON_CARDS[0],
      COMMON_CARDS[1],
      COMMON_CARDS[2],
      COMMON_CARDS[3],
    ];
    setHand(starterCards.slice(0, 4));

    setCombatLogs([
      {
        id: Math.random().toString(),
        turn: 1,
        text: `Campaign initiated at ${scenario.name}. Commander ${general.name} faces ${enemyGen.name}.`,
        type: 'domain',
      },
    ]);

    setGameState('playing');
  }, []);

  // Selected Unit reference
  const selectedUnit = units.find(u => u.id === selectedUnitId) || null;
  const playerCommander = units.find(u => u.isCommander && u.team === 'player');
  const enemyCommander = units.find(u => u.isCommander && u.team === 'enemy');

  // Compute valid move hexes for selected unit
  const validMoveHexes: HexCoord[] = React.useMemo(() => {
    if (!selectedUnit || selectedUnit.team !== 'player' || selectedUnit.hasMoved || phase !== 'player_turn') {
      return [];
    }

    const occupied = new Set(units.filter(u => u.hp > 0).map(u => hexKey(u.hex)));
    const results: HexCoord[] = [];
    const queue: { hex: HexCoord; cost: number }[] = [{ hex: selectedUnit.hex, cost: 0 }];
    const visited = new Set<string>([hexKey(selectedUnit.hex)]);

    const maxMove = selectedUnit.moveRange + (selectedUnit.stance === 'tactical' ? 1 : 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.cost >= maxMove) continue;

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
        if (!tile || tile.terrain === 'mountain') continue;

        const isOccupied = occupied.has(key);
        let moveCost = tile.terrain === 'forest' || tile.terrain === 'water' ? 2 : 1;

        const totalCost = current.cost + moveCost;
        if (totalCost <= maxMove) {
          visited.add(key);
          if (!isOccupied) results.push(next);
          queue.push({ hex: next, cost: totalCost });
        }
      }
    }

    return results;
  }, [selectedUnit, phase, tiles, units]);

  // Compute valid attack target hexes for selected unit
  const validAttackHexes: HexCoord[] = React.useMemo(() => {
    if (!selectedUnit || selectedUnit.team !== 'player' || selectedUnit.hasAttacked || phase !== 'player_turn') {
      return [];
    }

    return units
      .filter(u => {
        if (u.team !== 'enemy' || u.hp <= 0) return false;
        const dist = hexDistance(selectedUnit.hex, u.hex);
        return dist >= selectedUnit.minRange && dist <= selectedUnit.maxRange;
      })
      .map(u => u.hex);
  }, [selectedUnit, phase, units]);

  // Hovered Combat Forecast
  const combatForecast: CombatForecast | null = React.useMemo(() => {
    if (!selectedUnit || selectedUnit.team !== 'player' || selectedUnit.hasAttacked || !hoveredHex) {
      return null;
    }

    const targetEnemy = units.find(
      u => u.team === 'enemy' && u.hp > 0 && hexEquals(u.hex, hoveredHex)
    );
    if (!targetEnemy) return null;

    const dist = hexDistance(selectedUnit.hex, targetEnemy.hex);
    if (dist < selectedUnit.minRange || dist > selectedUnit.maxRange) return null;

    const attackerTile = tiles.get(hexKey(selectedUnit.hex));
    const defenderTile = tiles.get(hexKey(targetEnemy.hex));
    if (!attackerTile || defenderTile === undefined) return null;

    return calculateCombatForecast(
      selectedUnit,
      targetEnemy,
      attackerTile,
      defenderTile,
      playerCommander,
      enemyCommander,
      selectedGeneral,
      enemyGeneral,
      activeDomain
    );
  }, [selectedUnit, hoveredHex, units, tiles, playerCommander, enemyCommander, selectedGeneral, enemyGeneral, activeDomain]);

  // Ley-Node Statistics
  const leyNodeStats = React.useMemo(() => {
    let p = 0;
    let e = 0;
    let n = 0;
    tiles.forEach(t => {
      if (t.terrain === 'leynode') {
        if (t.controller === 'player') p++;
        else if (t.controller === 'enemy') e++;
        else n++;
      }
    });
    return { player: p, enemy: e, neutral: n };
  }, [tiles]);

  // Handle Hex Clicks (Move, Attack, Card Cast, or Select)
  const handleHexClick = (hex: HexCoord) => {
    if (phase !== 'player_turn') return;

    const clickedUnit = units.find(u => u.hp > 0 && hexEquals(u.hex, hex));

    // 1. If playing a Tactical Card
    if (selectedCard) {
      handleCardTarget(selectedCard, hex, clickedUnit);
      return;
    }

    // 2. If executing an attack with selected unit
    if (selectedUnit && selectedUnit.team === 'player' && !selectedUnit.hasAttacked && clickedUnit && clickedUnit.team === 'enemy') {
      const isAttackTarget = validAttackHexes.some(h => hexEquals(h, hex));
      if (isAttackTarget && combatForecast) {
        executePlayerAttack(combatForecast);
        return;
      }
    }

    // 3. If moving selected unit
    if (selectedUnit && selectedUnit.team === 'player' && !selectedUnit.hasMoved && !clickedUnit) {
      const isMoveTarget = validMoveHexes.some(h => hexEquals(h, hex));
      if (isMoveTarget) {
        executePlayerMove(selectedUnit, hex);
        return;
      }
    }

    // 4. Otherwise, select unit or deselect
    if (clickedUnit) {
      sound.playClick();
      setSelectedUnitId(clickedUnit.id);
    } else {
      setSelectedUnitId(null);
    }
  };

  // Execute Player Unit Movement
  const executePlayerMove = (unit: Unit, toHex: HexCoord) => {
    sound.playMove();
    const facing = getFacingDirection(unit.hex, toHex);

    // Update Ley-Node capture if stepping on Ley-Node
    const targetTile = tiles.get(hexKey(toHex));
    if (targetTile && targetTile.terrain === 'leynode' && targetTile.controller !== 'player') {
      targetTile.controller = 'player';
      setTiles(new Map(tiles));
      setLegacyGauge(prev => Math.min(100, prev + 10));
      setCombatLogs(prev => [
        {
          id: Math.random().toString(),
          turn,
          text: `${unit.name} captured an ancient Ley-Node! (+10 Legacy)`,
          type: 'capture',
        },
        ...prev,
      ]);
    }

    setUnits(prev =>
      prev.map(u => (u.id === unit.id ? { ...u, hex: toHex, facing, hasMoved: true } : u))
    );
  };

  // Execute Player Unit Attack
  const executePlayerAttack = (forecast: CombatForecast) => {
    sound.playSwordClash(forecast.isFlank);

    // Dispatch canvas impact event
    window.dispatchEvent(
      new CustomEvent('combat-event', {
        detail: {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          isHeavy: forecast.finalDamage > 25,
          isFlank: forecast.isFlank,
          text: `-${forecast.finalDamage}${forecast.isFlank ? ' FLANK!' : ''}`,
          color: forecast.isFlank ? '#f59e0b' : '#ef4444',
        },
      })
    );

    const result = resolveCombat(forecast);

    setUnits(prev =>
      prev
        .map(u => {
          if (u.id === result.updatedAttacker.id) return result.updatedAttacker;
          if (u.id === result.updatedDefender.id) return result.updatedDefender;
          return u;
        })
        .filter(u => u.hp > 0)
    );

    if (result.apGained > 0) {
      setPlayerAp(prev => Math.min(playerMaxAp, prev + result.apGained));
    }
    if (result.legacyGainedAttacker > 0) {
      setLegacyGauge(prev => Math.min(100, prev + result.legacyGainedAttacker));
    }

    setCombatLogs(prev => [
      {
        id: Math.random().toString(),
        turn,
        text: result.logText,
        type: result.defenderDead ? 'defeat' : 'attack',
      },
      ...prev,
    ]);

    // Check Victory Condition (Enemy Commander defeated)
    if (result.defenderDead && forecast.defender.isCommander) {
      triggerVictory();
    } else if (result.attackerDead && forecast.attacker.isCommander) {
      triggerDefeat();
    }
  };

  // Handle Card Play on Hex or Unit
  const handleCardTarget = (card: TacticalCard, hex: HexCoord, targetUnit?: Unit) => {
    if (playerAp < card.apCost) return;

    let success = false;
    let logMsg = '';

    if (card.targetType === 'unit_ally' && targetUnit && targetUnit.team === 'player') {
      sound.playCardCast();
      if (card.effect.kind === 'heal') {
        const healed = Math.min(targetUnit.maxHp, targetUnit.hp + card.effect.value);
        setUnits(prev => prev.map(u => (u.id === targetUnit.id ? { ...u, hp: healed } : u)));
        logMsg = `${card.name} healed ${targetUnit.name} for ${card.effect.value} HP.`;
      } else if (card.effect.kind === 'force_march') {
        setUnits(prev =>
          prev.map(u =>
            u.id === targetUnit.id
              ? { ...u, moveRange: u.moveRange + card.effect.value, hasMoved: false }
              : u
          )
        );
        logMsg = `${card.name} restored movement and added +${card.effect.value} mobility to ${targetUnit.name}.`;
      } else if (card.effect.kind === 'buff_atk') {
        setUnits(prev =>
          prev.map(u =>
            u.id === targetUnit.id
              ? { ...u, buffTurns: { atkBuff: card.effect.value, turns: 2 } }
              : u
          )
        );
        logMsg = `${card.name} empowered ${targetUnit.name} with +${Math.round(card.effect.value * 100)}% ATK.`;
      } else if (card.effect.kind === 'aegis_shield') {
        setUnits(prev =>
          prev.map(u => (u.id === targetUnit.id ? { ...u, shieldedHp: (u.shieldedHp || 0) + card.effect.value } : u))
        );
        logMsg = `${card.name} fortified ${targetUnit.name} with ${card.effect.value} Shield.`;
      }
      success = true;
    } else if (card.targetType === 'unit_enemy' && targetUnit && targetUnit.team === 'enemy') {
      sound.playCardCast();
      if (card.effect.kind === 'fire_strike') {
        const dmg = card.effect.value;
        const newHp = Math.max(0, targetUnit.hp - dmg);
        setUnits(prev =>
          prev
            .map(u => (u.id === targetUnit.id ? { ...u, hp: newHp } : u))
            .filter(u => u.hp > 0)
        );
        logMsg = `${card.name} struck ${targetUnit.name} for ${dmg} holy/fire damage!`;
        if (newHp <= 0 && targetUnit.isCommander) {
          triggerVictory();
        }
      }
      success = true;
    } else if (card.targetType === 'hex') {
      sound.playCardCast();
      const tile = tiles.get(hexKey(hex));
      if (tile) {
        tile.elementState = 'burning';
        tile.elementTurns = 2;
        setTiles(new Map(tiles));
        logMsg = `${card.name} ignited hex [${hex.q}, ${hex.r}] into a raging blaze!`;
        success = true;
      }
    } else if (card.targetType === 'global') {
      sound.playCardCast();
      if (card.effect.kind === 'aegis_shield') {
        setUnits(prev =>
          prev.map(u =>
            u.team === 'player'
              ? { ...u, shieldedHp: (u.shieldedHp || 0) + card.effect.value }
              : u
          )
        );
        logMsg = `${card.name} enveloped the entire allied army in radiant shields!`;
      }
      success = true;
    }

    if (success) {
      setPlayerAp(prev => prev - card.apCost);
      setHand(prev => prev.filter(c => c.id !== card.id));
      setSelectedCard(null);
      setCombatLogs(prev => [
        {
          id: Math.random().toString(),
          turn,
          text: logMsg,
          type: 'card',
        },
        ...prev,
      ]);
    }
  };

  // Toggle Stance
  const handleSetStance = (unitId: string, stance: Stance) => {
    setUnits(prev =>
      prev.map(u => (u.id === unitId ? { ...u, stance } : u))
    );
  };

  // Unleash Legacy Domain
  const handleActivateDomain = () => {
    if (legacyGauge < 100) return;
    sound.playLegacyDomain();
    setLegacyGauge(0);
    setActiveDomain({
      team: 'player',
      effect: selectedGeneral.legacyDomain.effect,
      turnsRemaining: selectedGeneral.legacyDomain.durationTurns,
    });

    setCombatLogs(prev => [
      {
        id: Math.random().toString(),
        turn,
        text: `COMMANDER DOMAIN UNLEASHED: ${selectedGeneral.legacyDomain.name}! Rules of war rewritten for 3 turns!`,
        type: 'domain',
      },
      ...prev,
    ]);
  };

  // End Turn & Initiate AI Turn
  const handleEndTurn = () => {
    if (phase !== 'player_turn') return;
    setPhase('enemy_turn');
    setSelectedUnitId(null);
    setSelectedCard(null);

    // AI Turn Execution with readable pacing
    setTimeout(() => {
      executeAITurn();
    }, 600);
  };

  // Execute AI Turn
  const executeAITurn = () => {
    const aiActions = planAITurn(
      units,
      tiles,
      enemyGeneral,
      selectedGeneral,
      enemyLegacyGauge,
      activeDomain
    );

    let currentUnits = [...units];
    let currentLogs = [...combatLogs];
    let delay = 0;

    aiActions.forEach((act, idx) => {
      setTimeout(() => {
        if (act.type === 'domain') {
          sound.playLegacyDomain();
          setEnemyLegacyGauge(0);
          setActiveDomain({
            team: 'enemy',
            effect: enemyGeneral.legacyDomain.effect,
            turnsRemaining: enemyGeneral.legacyDomain.durationTurns,
          });
          currentLogs = [
            {
              id: Math.random().toString(),
              turn,
              text: `ENEMY DOMAIN UNLEASHED: ${enemyGeneral.legacyDomain.name}!`,
              type: 'domain',
            },
            ...currentLogs,
          ];
          setCombatLogs(currentLogs);
        } else if (act.type === 'stance') {
          currentUnits = currentUnits.map(u => (u.id === act.unitId ? { ...u, stance: act.stance } : u));
          setUnits(currentUnits);
        } else if (act.type === 'move') {
          sound.playMove();
          currentUnits = currentUnits.map(u =>
            u.id === act.unitId ? { ...u, hex: act.toHex, facing: act.facing, hasMoved: true } : u
          );
          setUnits(currentUnits);
        } else if (act.type === 'attack') {
          const attacker = currentUnits.find(u => u.id === act.attackerId);
          const target = currentUnits.find(u => u.id === act.targetId);
          if (attacker && target && attacker.hp > 0 && target.hp > 0) {
            const attTile = tiles.get(hexKey(attacker.hex));
            const defTile = tiles.get(hexKey(target.hex));
            if (attTile && defTile) {
              const forecast = calculateCombatForecast(
                attacker,
                target,
                attTile,
                defTile,
                enemyCommander,
                playerCommander,
                enemyGeneral,
                selectedGeneral,
                activeDomain
              );
              sound.playSwordClash(forecast.isFlank);
              const result = resolveCombat(forecast);
              currentUnits = currentUnits
                .map(u => {
                  if (u.id === result.updatedAttacker.id) return result.updatedAttacker;
                  if (u.id === result.updatedDefender.id) return result.updatedDefender;
                  return u;
                })
                .filter(u => u.hp > 0);
              setUnits(currentUnits);

              currentLogs = [
                {
                  id: Math.random().toString(),
                  turn,
                  text: result.logText,
                  type: result.defenderDead ? 'defeat' : 'attack',
                },
                ...currentLogs,
              ];
              setCombatLogs(currentLogs);

              if (result.defenderDead && target.isCommander) {
                triggerDefeat();
              }
            }
          }
        }
      }, delay);
      delay += 400;
    });

    // Conclude Enemy Turn & Start Next Allied Round
    setTimeout(() => {
      startNewAlliedTurn();
    }, delay + 400);
  };

  // Start New Round (Turn + 1, AP refresh, Ley-Nodes income, Deck draw)
  const startNewAlliedTurn = () => {
    setTurn(prevTurn => {
      const nextTurn = prevTurn + 1;

      // Decrement domain duration
      if (activeDomain) {
        if (activeDomain.turnsRemaining <= 1) {
          setActiveDomain(null);
        } else {
          setActiveDomain({ ...activeDomain, turnsRemaining: activeDomain.turnsRemaining - 1 });
        }
      }

      // Reset unit action flags
      setUnits(prev =>
        prev.map(u => ({
          ...u,
          hasMoved: false,
          hasAttacked: false,
          shieldedHp: Math.max(0, (u.shieldedHp || 0) - 5), // Decay shields
        }))
      );

      // Ley-Nodes resource tick
      let leyIncomeAp = 0;
      let leyIncomeLegacy = 0;
      tiles.forEach(t => {
        if (t.terrain === 'leynode' && t.controller === 'player') {
          leyIncomeAp += 1;
          leyIncomeLegacy += 10;
        }
      });

      setPlayerAp(Math.min(playerMaxAp, 4 + leyIncomeAp));
      setLegacyGauge(prev => Math.min(100, prev + 5 + leyIncomeLegacy));
      setEnemyLegacyGauge(prev => Math.min(100, prev + 8));

      // Draw 1 card from common pool if hand has space
      setHand(prevHand => {
        if (prevHand.length < 5) {
          const randomCard = COMMON_CARDS[Math.floor(Math.random() * COMMON_CARDS.length)];
          return [...prevHand, randomCard];
        }
        return prevHand;
      });

      setPhase('player_turn');
      return nextTurn;
    });
  };

  // Victory Handler
  const triggerVictory = () => {
    sound.playVictory();
    setEndGameStats({
      turns: turn,
      enemiesDefeated: 5,
      leyNodesCaptured: leyNodeStats.player,
      legacyGenerated: legacyGauge,
      commanderName: selectedGeneral.name,
    });
    setGameState('victory');
  };

  // Defeat Handler
  const triggerDefeat = () => {
    sound.playDefeat();
    setEndGameStats({
      turns: turn,
      enemiesDefeated: 2,
      leyNodesCaptured: leyNodeStats.player,
      legacyGenerated: legacyGauge,
      commanderName: selectedGeneral.name,
    });
    setGameState('defeat');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'title') {
          e.preventDefault();
          initGame(selectedGeneral, activeScenario);
        } else if (gameState === 'playing' && phase === 'player_turn') {
          e.preventDefault();
          handleEndTurn();
        }
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      } else if (e.key === 'm' || e.key === 'M') {
        const muted = sound.toggleMute();
        setIsMuted(muted);
      } else if (e.key === 'l' || e.key === 'L') {
        if (gameState === 'playing' && legacyGauge >= 100) {
          handleActivateDomain();
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        setShowLogModal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, phase, selectedGeneral, activeScenario, legacyGauge]);

  return (
    <div
      className={`relative w-screen h-screen bg-slate-950 font-sans ${
        gameState === 'title' ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      {/* 1. TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreen onStartGame={initGame} />
      )}

      {/* 2. PLAYING CANVAS & WORLD VIEWPORT */}
      {gameState !== 'title' && (
        <>
          <HexCanvas
            tiles={tiles}
            units={units}
            selectedUnit={selectedUnit}
            hoveredHex={hoveredHex}
            validMoveHexes={validMoveHexes}
            validAttackHexes={validAttackHexes}
            weather={weather}
            playerCommanderAuraRadius={selectedGeneral.aura.radius}
            activeDomainVisual={activeDomain ? selectedGeneral.legacyDomain.visualTag : null}
            onHexClick={handleHexClick}
            onHexHover={setHoveredHex}
          />

          {/* Tactical HUD Overlay */}
          <TacticalHud
            turn={turn}
            phase={phase}
            weather={weather}
            playerGeneral={selectedGeneral}
            enemyGeneral={enemyGeneral}
            playerAp={playerAp}
            playerMaxAp={playerMaxAp}
            legacyGauge={legacyGauge}
            enemyLegacyGauge={enemyLegacyGauge}
            activeDomain={activeDomain}
            selectedUnit={selectedUnit}
            combatForecast={combatForecast}
            hand={hand}
            selectedCard={selectedCard}
            isMuted={isMuted}
            leyNodeStats={leyNodeStats}
            onSelectCard={setSelectedCard}
            onSetStance={handleSetStance}
            onActivateDomain={handleActivateDomain}
            onEndTurn={handleEndTurn}
            onToggleMute={() => setIsMuted(sound.toggleMute())}
            onPause={() => setGameState('paused')}
            onToggleLog={() => setShowLogModal(true)}
          />
        </>
      )}

      {/* 3. STATUS MODALS */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={() => initGame(selectedGeneral, activeScenario)}
          onExitTitle={() => setGameState('title')}
        />
      )}

      {gameState === 'victory' && (
        <VictoryModal
          stats={endGameStats}
          onPlayAgain={() => initGame(selectedGeneral, activeScenario)}
          onExitTitle={() => setGameState('title')}
        />
      )}

      {gameState === 'defeat' && (
        <DefeatModal
          stats={endGameStats}
          onTryAgain={() => initGame(selectedGeneral, activeScenario)}
          onExitTitle={() => setGameState('title')}
        />
      )}

      {/* 4. TACTICAL COMBAT CHRONICLE MODAL */}
      {showLogModal && (
        <CombatLogModal
          logs={combatLogs}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  );
}
