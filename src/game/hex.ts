/**
 * Hex Grid Mathematics (Axial & Cube Coordinates)
 * Pointy-topped hexes:
 * - Axial coordinates: (q, r)
 * - Cube coordinates: (x, y, z) where x = q, z = r, y = -x - z
 */

export interface HexCoord {
  q: number;
  r: number;
}

export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

export function axialToCube(hex: HexCoord): CubeCoord {
  return {
    x: hex.q,
    z: hex.r,
    y: -hex.q - hex.r,
  };
}

export function cubeToAxial(cube: CubeCoord): HexCoord {
  return {
    q: cube.x,
    r: cube.z,
  };
}

export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/** Hex distance in pointy-topped or flat-topped hexes */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y) + Math.abs(ac.z - bc.z)) / 2;
}

/** 6 directional vectors for pointy-topped hexes */
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // 0: East-Southeast
  { q: 1, r: -1 },  // 1: East-Northeast
  { q: 0, r: -1 },  // 2: North
  { q: -1, r: 0 },  // 3: West-Northwest
  { q: -1, r: 1 },  // 4: West-Southwest
  { q: 0, r: 1 },   // 5: South
];

export function getHexNeighbor(hex: HexCoord, directionIndex: number): HexCoord {
  const dir = HEX_DIRECTIONS[(directionIndex % 6 + 6) % 6];
  return { q: hex.q + dir.q, r: hex.r + dir.r };
}

export function getHexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map(dir => ({ q: hex.q + dir.q, r: hex.r + dir.r }));
}

/** Convert hex coordinate to screen pixel coordinates for pointy-topped hex */
export function hexToPixel(hex: HexCoord, radius: number, origin: Point): Point {
  const width = Math.sqrt(3) * radius;
  const height = 2 * radius;
  const x = origin.x + radius * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const y = origin.y + radius * ((3 / 2) * hex.r);
  return { x, y };
}

/** Convert screen pixel coordinate to fractional hex coordinate */
export function pixelToHex(point: Point, radius: number, origin: Point): HexCoord {
  const ptX = (point.x - origin.x) / radius;
  const ptY = (point.y - origin.y) / radius;
  const q = ((Math.sqrt(3) / 3) * ptX - (1 / 3) * ptY);
  const r = ((2 / 3) * ptY);
  return roundHexCube({ x: q, z: r, y: -q - r });
}

function roundHexCube(cube: CubeCoord): HexCoord {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

/**
 * Determine facing direction (0..5) from origin hex toward target hex.
 */
export function getFacingDirection(from: HexCoord, to: HexCoord): number {
  if (hexEquals(from, to)) return 0;
  const ac = axialToCube(from);
  const bc = axialToCube(to);
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  const dz = bc.z - ac.z;

  let bestDir = 0;
  let maxDot = -Infinity;
  for (let i = 0; i < 6; i++) {
    const dir = HEX_DIRECTIONS[i];
    const dc = axialToCube(dir);
    const dot = dx * dc.x + dy * dc.y + dz * dc.z;
    if (dot > maxDot) {
      maxDot = dot;
      bestDir = i;
    }
  }
  return bestDir;
}

/**
 * Determine whether an attack is a flank (side or rear attack).
 * Facing: 0..5 (the direction the defender is facing)
 * Attacker direction relative to defender:
 * - Frontal: same or +/- 1 direction from defender facing opposite?
 * Specifically:
 * Facing direction is where defender is looking.
 * Rear is opposite direction: (facing + 3) % 6.
 * Flank is rear (opposite) or rear-adjacent: (facing + 2, 3, 4) % 6.
 * Front is facing + 0, 1, 5.
 */
export function isFlankAttack(attackerHex: HexCoord, defenderHex: HexCoord, defenderFacing: number): boolean {
  // Direction from defender towards attacker
  const incomingDir = getFacingDirection(defenderHex, attackerHex);
  const diff = (incomingDir - defenderFacing + 6) % 6;
  // diff == 0: attacker is directly in front of defender (Frontal)
  // diff == 1 or 5: front-flank (partial frontal)
  // diff == 2, 3, 4: side or rear attack (Flanking!)
  return diff >= 2 && diff <= 4;
}

/**
 * Line of sight (LoS) check between two hexes using linear interpolation in cube coordinates.
 * Returns true if line of sight is clear.
 */
export function hasLineOfSight(
  from: HexCoord,
  to: HexCoord,
  isObstacle: (hex: HexCoord) => boolean
): boolean {
  const dist = hexDistance(from, to);
  if (dist <= 1) return true;

  const a = axialToCube(from);
  const b = axialToCube(to);

  for (let i = 1; i < dist; i++) {
    const t = i / dist;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const z = a.z + (b.z - a.z) * t;
    const sampleHex = roundHexCube({ x, y, z });

    if (!hexEquals(sampleHex, from) && !hexEquals(sampleHex, to)) {
      if (isObstacle(sampleHex)) {
        return false;
      }
    }
  }
  return true;
}
