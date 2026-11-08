import React, { useEffect, useRef } from 'react';
import { Unit, Tile, Team, WeatherType, Stance } from './types';
import {
  HexCoord,
  hexToPixel,
  pixelToHex,
  hexDistance,
  hexKey,
  Point,
  HEX_DIRECTIONS,
} from './hex';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface HexCanvasProps {
  tiles: Map<string, Tile>;
  units: Unit[];
  selectedUnit: Unit | null;
  hoveredHex: HexCoord | null;
  validMoveHexes: HexCoord[];
  validAttackHexes: HexCoord[];
  weather: WeatherType;
  playerCommanderAuraRadius: number;
  activeDomainVisual: string | null;
  onHexClick: (hex: HexCoord) => void;
  onHexHover: (hex: HexCoord | null) => void;
}

export const HexCanvas: React.FC<HexCanvasProps> = ({
  tiles,
  units,
  selectedUnit,
  hoveredHex,
  validMoveHexes,
  validAttackHexes,
  weather,
  playerCommanderAuraRadius,
  activeDomainVisual,
  onHexClick,
  onHexHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Animation & Particle state refs (kept outside React reconciliation)
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cameraShakeRef = useRef<number>(0);
  const animTimeRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);

  // Keep latest props in refs for 60fps loop access
  const propsRef = useRef({
    tiles,
    units,
    selectedUnit,
    hoveredHex,
    validMoveHexes,
    validAttackHexes,
    weather,
    playerCommanderAuraRadius,
    activeDomainVisual,
  });

  useEffect(() => {
    propsRef.current = {
      tiles,
      units,
      selectedUnit,
      hoveredHex,
      validMoveHexes,
      validAttackHexes,
      weather,
      playerCommanderAuraRadius,
      activeDomainVisual,
    };
  }, [
    tiles,
    units,
    selectedUnit,
    hoveredHex,
    validMoveHexes,
    validAttackHexes,
    weather,
    playerCommanderAuraRadius,
    activeDomainVisual,
  ]);

  // Method to trigger camera shake and particles from outside
  useEffect(() => {
    const handleCombatHit = (e: CustomEvent) => {
      const { x, y, isHeavy, isFlank, text, color } = e.detail;
      cameraShakeRef.current = isHeavy ? 1.0 : (isFlank ? 0.7 : 0.4);

      // Spawn particles
      const count = isHeavy ? 24 : 12;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 120;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9,
          color: isFlank ? '#f59e0b' : (isHeavy ? '#ef4444' : '#e2e8f0'),
          size: 2 + Math.random() * 4,
        });
      }

      // Add floating text
      if (text) {
        floatingTextsRef.current.push({
          id: Math.random().toString(),
          x,
          y: y - 20,
          text,
          color: color || '#f87171',
          life: 1.2,
          maxLife: 1.2,
          scale: 1.0,
        });
      }
    };

    window.addEventListener('combat-event' as any, handleCombatHit as any);
    return () => {
      window.removeEventListener('combat-event' as any, handleCombatHit as any);
    };
  }, []);

  // Canvas main rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (timestamp: number) => {
      if (!prevTimeRef.current) prevTimeRef.current = timestamp;
      const rawDt = (timestamp - prevTimeRef.current) / 1000;
      prevTimeRef.current = timestamp;
      const dt = Math.min(rawDt, 0.05);
      animTimeRef.current += dt;

      // Handle canvas resize
      const container = containerRef.current;
      if (container) {
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }
        ctx.resetTransform?.();
        ctx.scale(dpr, dpr);
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const origin: Point = { x: width / 2, y: height / 2 };
      const hexRadius = Math.max(34, Math.min(width, height) / 13);

      // Camera shake decay
      let shakeX = 0;
      let shakeY = 0;
      if (cameraShakeRef.current > 0.01) {
        const shakeMag = cameraShakeRef.current * cameraShakeRef.current * 14;
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 2.5);
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 1. Clear background with deep tactical slate
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // 2. Weather background tint & ambient glow
      const state = propsRef.current;
      if (state.activeDomainVisual) {
        ctx.fillStyle = state.activeDomainVisual === 'amber' ? 'rgba(245, 158, 11, 0.06)' :
                        state.activeDomainVisual === 'emerald' ? 'rgba(16, 185, 129, 0.06)' :
                        state.activeDomainVisual === 'sky' ? 'rgba(56, 189, 248, 0.06)' :
                        state.activeDomainVisual === 'crimson' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(168, 85, 247, 0.06)';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw subtle grid starfield / ley runes
      drawGridBackground(ctx, width, height, animTimeRef.current);

      // 3. Draw Hex Tiles
      const validMoveKeys = new Set(state.validMoveHexes.map(hexKey));
      const validAttackKeys = new Set(state.validAttackHexes.map(hexKey));
      const hoveredKey = state.hoveredHex ? hexKey(state.hoveredHex) : null;
      const selectedKey = state.selectedUnit ? hexKey(state.selectedUnit.hex) : null;

      // Draw tiles sorted by elevation so high tiles overlap correctly
      const sortedTiles = Array.from(state.tiles.values()).sort((a, b) => a.elevation - b.elevation);

      for (const tile of sortedTiles) {
        const pt = hexToPixel({ q: tile.q, r: tile.r }, hexRadius, origin);
        const key = hexKey({ q: tile.q, r: tile.r });
        const isHovered = key === hoveredKey;
        const isSelected = key === selectedKey;
        const isValidMove = validMoveKeys.has(key);
        const isValidAttack = validAttackKeys.has(key);

        drawHexTile(
          ctx,
          tile,
          pt,
          hexRadius,
          isHovered,
          isSelected,
          isValidMove,
          isValidAttack,
          animTimeRef.current
        );
      }

      // 4. Draw Commander Aura Rings
      const playerCommander = state.units.find(u => u.isCommander && u.team === 'player' && u.hp > 0);
      if (playerCommander) {
        const cmdPt = hexToPixel(playerCommander.hex, hexRadius, origin);
        const auraPixelRadius = hexRadius * Math.sqrt(3) * state.playerCommanderAuraRadius;
        drawAuraCircle(ctx, cmdPt, auraPixelRadius, '#38bdf8', animTimeRef.current);
      }

      // 5. Draw Units
      for (const unit of state.units) {
        if (unit.hp <= 0) continue;
        const unitPt = hexToPixel(unit.hex, hexRadius, origin);
        const isSelected = state.selectedUnit?.id === unit.id;
        const isEnemy = unit.team === 'enemy';
        drawUnitToken(ctx, unit, unitPt, hexRadius, isSelected, isEnemy, animTimeRef.current);
      }

      // 6. Draw Weather Particles (Rain / Fog / Embers)
      drawWeatherEffects(ctx, width, height, state.weather, animTimeRef.current);

      // 7. Update & Draw Combat Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life -= dt;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 8. Update & Draw Floating Combat Text
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.life -= dt;
        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }
        ft.y -= 30 * dt; // Float up
        const progress = ft.life / ft.maxLife;
        const alpha = Math.min(1.0, progress * 1.5);

        ctx.save();
        ctx.font = 'bold 15px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse & Pointer interactions
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const origin: Point = { x: width / 2, y: height / 2 };
    const hexRadius = Math.max(34, Math.min(width, height) / 13);

    const hex = pixelToHex({ x, y }, hexRadius, origin);
    const tile = propsRef.current.tiles.get(hexKey(hex));
    if (tile) {
      onHexHover(hex);
    } else {
      onHexHover(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const origin: Point = { x: width / 2, y: height / 2 };
    const hexRadius = Math.max(34, Math.min(width, height) / 13);

    const hex = pixelToHex({ x, y }, hexRadius, origin);
    const tile = propsRef.current.tiles.get(hexKey(hex));
    if (tile) {
      onHexClick(hex);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        data-testid="hex-canvas"
        className="w-full h-full block cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => onHexHover(null)}
      />
    </div>
  );
};

/* --- Canvas Procedural Render Functions --- */

function drawGridBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  // Delicate arcane runes / geometric lines in background
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)';
  ctx.lineWidth = 1;

  const step = 60;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawHexTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  pt: Point,
  radius: number,
  isHovered: boolean,
  isSelected: boolean,
  isValidMove: boolean,
  isValidAttack: boolean,
  time: number
) {
  // Pointy-topped hex vertices
  // Elevation visually shifts hex Y upward to create a 3D plateau effect!
  const elevOffsetY = -tile.elevation * 8;
  const cx = pt.x;
  const cy = pt.y + elevOffsetY;

  // 1. Draw 3D Elevation Base / Rim if elevated
  if (tile.elevation > 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const vx = cx + radius * Math.cos(angle);
      const vy = cy + radius * Math.sin(angle) - elevOffsetY;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 2. Draw Hex Face
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const vx = cx + radius * Math.cos(angle);
    const vy = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();

  // Color by terrain
  let fillColor = '#1e293b'; // Default plains
  let strokeColor = '#334155';

  switch (tile.terrain) {
    case 'plains':
      fillColor = tile.elevation === 2 ? '#243427' : (tile.elevation === 1 ? '#1c2e22' : '#14231b');
      strokeColor = '#2d4734';
      break;
    case 'forest':
      fillColor = '#0f291e';
      strokeColor = '#15803d';
      break;
    case 'water':
      fillColor = '#0c2738';
      strokeColor = '#0284c7';
      break;
    case 'mountain':
      fillColor = '#2d2e38';
      strokeColor = '#64748b';
      break;
    case 'leynode':
      const pulse = Math.sin(time * 3) * 0.15 + 0.85;
      fillColor = `rgba(147, 51, 234, ${0.3 * pulse})`;
      strokeColor = '#c084fc';
      break;
  }

  // Elemental States
  if (tile.elementState === 'burning') {
    fillColor = 'rgba(239, 68, 68, 0.4)';
    strokeColor = '#f87171';
  } else if (tile.elementState === 'electrified') {
    fillColor = 'rgba(56, 189, 248, 0.4)';
    strokeColor = '#38bdf8';
  }

  // Action Highlights
  if (isValidAttack) {
    fillColor = 'rgba(220, 38, 38, 0.45)';
    strokeColor = '#ef4444';
  } else if (isValidMove) {
    fillColor = 'rgba(14, 165, 233, 0.35)';
    strokeColor = '#38bdf8';
  } else if (isSelected) {
    fillColor = 'rgba(234, 179, 8, 0.35)';
    strokeColor = '#facc15';
  } else if (isHovered) {
    fillColor = 'rgba(255, 255, 255, 0.12)';
    strokeColor = '#94a3b8';
  }

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.lineWidth = isSelected || isValidAttack || isHovered ? 2.5 : 1.2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  // 3. Terrain Detail Symbols
  if (tile.terrain === 'forest') {
    // Stylized trees
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 3, 5, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 4, 6, 0, Math.PI * 2);
    ctx.arc(cx, cy + 4, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (tile.terrain === 'water') {
    // Wave ripple lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    const waveOff = Math.sin(time * 2 + tile.q) * 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + waveOff);
    ctx.quadraticCurveTo(cx - 5, cy + waveOff - 3, cx, cy + waveOff);
    ctx.quadraticCurveTo(cx + 5, cy + waveOff + 3, cx + 10, cy + waveOff);
    ctx.stroke();
  } else if (tile.terrain === 'mountain') {
    // Peak triangle
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx - 12, cy + 8);
    ctx.lineTo(cx + 12, cy + 8);
    ctx.closePath();
    ctx.fill();
    // Snowcap
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx - 4, cy - 6);
    ctx.lineTo(cx + 4, cy - 6);
    ctx.closePath();
    ctx.fill();
  } else if (tile.terrain === 'leynode') {
    // Glowing Arcane Rune
    const pulse = Math.sin(time * 4) * 3;
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Elevation badge if high ground
  if (tile.elevation > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`▲${tile.elevation}`, cx + radius * 0.7, cy - radius * 0.4);
  }
}

function drawAuraCircle(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  color: string,
  time: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -time * 15;
  ctx.stroke();

  ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.fill();
  ctx.restore();
}

function drawUnitToken(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  pt: Point,
  hexRadius: number,
  isSelected: boolean,
  isEnemy: boolean,
  time: number
) {
  const tokenRadius = hexRadius * 0.58;
  const cx = pt.x;
  const cy = pt.y - 4; // Slight elevation offset

  // 1. Facing Direction Arrow
  const dir = HEX_DIRECTIONS[unit.facing];
  const facingAngle = (Math.PI / 180) * (60 * unit.facing - 30);
  const arrowDist = tokenRadius + 6;
  const tipX = cx + arrowDist * Math.cos(facingAngle);
  const tipY = cy + arrowDist * Math.sin(facingAngle);

  ctx.fillStyle = isEnemy ? '#f87171' : '#38bdf8';
  ctx.beginPath();
  ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Token Outer Rim & Glow
  ctx.beginPath();
  ctx.arc(cx, cy, tokenRadius, 0, Math.PI * 2);

  // Background gradient
  const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, tokenRadius);
  if (isEnemy) {
    grad.addColorStop(0, '#7f1d1d');
    grad.addColorStop(1, '#450a0a');
  } else {
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(1, '#082f49');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = isSelected ? 3 : (unit.isCommander ? 2.5 : 1.5);
  ctx.strokeStyle = isSelected ? '#facc15' : (unit.isCommander ? '#fbbf24' : (isEnemy ? '#ef4444' : '#38bdf8'));
  ctx.stroke();

  // 3. Archetype Icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let archetypeIcon = '⚔';
  if (unit.isCommander) archetypeIcon = '👑';
  else if (unit.archetype === 'Archer') archetypeIcon = '🏹';
  else if (unit.archetype === 'Cavalry') archetypeIcon = '🐎';
  else if (unit.archetype === 'SiegeEngine') archetypeIcon = '🎯';

  ctx.fillText(archetypeIcon, cx, cy - 2);

  // 4. Stance indicator pip
  let stanceColor = '#3b82f6';
  let stanceSymbol = 'T';
  if (unit.stance === 'aggressive') {
    stanceColor = '#ef4444';
    stanceSymbol = 'A';
  } else if (unit.stance === 'defensive') {
    stanceColor = '#10b981';
    stanceSymbol = 'D';
  }

  ctx.fillStyle = stanceColor;
  ctx.beginPath();
  ctx.arc(cx + tokenRadius * 0.7, cy - tokenRadius * 0.7, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 7px Inter, sans-serif';
  ctx.fillText(stanceSymbol, cx + tokenRadius * 0.7, cy - tokenRadius * 0.7);

  // 5. Health Bar
  const barWidth = tokenRadius * 1.6;
  const barHeight = 4;
  const barX = cx - barWidth / 2;
  const barY = cy + tokenRadius + 4;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

  const hpPct = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
  const hpColor = hpPct > 0.5 ? '#22c55e' : (hpPct > 0.25 ? '#eab308' : '#ef4444');
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);

  // Shield bar overlay if any
  if (unit.shieldedHp > 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX, barY, Math.min(barWidth, barWidth * (unit.shieldedHp / unit.maxHp)), barHeight);
  }
}

function drawWeatherEffects(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  weather: WeatherType,
  time: number
) {
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    const rainCount = 45;
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.sin(i * 99 + time * 12) * 0.5 + 0.5) * width;
      const ry = ((i * 73 + time * 800) % height);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 12);
      ctx.stroke();
    }
  } else if (weather === 'fog') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    const fogY = (Math.sin(time * 0.4) * 0.1 + 0.5) * height;
    ctx.fillRect(0, fogY - 120, width, 240);
  }
}
