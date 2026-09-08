export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1000;
export const CELL = 10;
export const COLS = MAP_WIDTH / CELL;
export const ROWS = MAP_HEIGHT / CELL;
export const MATERIAL_BUDGET = 1700;
export const MAX_STRUCTURES = 3;
// Saved editor exports are JPEGs. This deliberately clears normal JPEG edge
// noise while preserving the high-contrast marks a player adds to the plan.
const CHANGE_THRESHOLD = 52;

export type PixelFrame = { width: number; height: number; data: Uint8ClampedArray };
export type Point = { x: number; y: number };
export type Gate = { id: string; label: string; top: number; bottom: number; x: number };

export const GATES: Gate[] = [
  { id: 'north', label: 'North gate', top: 145, bottom: 285, x: 455 },
  { id: 'central', label: 'Central gate', top: 430, bottom: 570, x: 455 },
  { id: 'south', label: 'South gate', top: 715, bottom: 855, x: 455 },
];

export const ASSETS = [
  { id: 'clinic', label: 'Tide Clinic', x: 1050, y: 205 },
  { id: 'plant', label: 'Desal Plant', x: 1420, y: 280 },
  { id: 'relay', label: 'Relay 09', x: 1060, y: 500 },
  { id: 'archive', label: 'Civic Archive', x: 1415, y: 580 },
  { id: 'market', label: 'Night Market', x: 1040, y: 920 },
] as const;

export type AssetResult = (typeof ASSETS[number]) & { dry: boolean };
export type FloodReport = {
  modified: boolean;
  barrier: Uint8Array;
  water: Uint8Array;
  distances: Int16Array;
  gates: (Gate & { sealed: boolean })[];
  assets: AssetResult[];
  score: number;
  title: string;
  wallMeters: number;
  collateralMeters: number;
  structures: number;
  valid: boolean;
  changedCells: number;
  maxDistance: number;
};

const indexOf = (x: number, y: number) => y * COLS + x;
const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const cellPoint = (x: number, y: number): Point => ({ x: (x + .5) * CELL, y: (y + .5) * CELL });
const gateCells = (gate: Gate) => ({ top: Math.floor(gate.top / CELL), bottom: Math.ceil(gate.bottom / CELL), x: Math.round(gate.x / CELL) });

function inGate(point: Point, padding = 34) {
  return GATES.some((gate) => point.x >= gate.x - 45 - padding && point.x <= gate.x + 45 + padding && point.y >= gate.top - padding && point.y <= gate.bottom + padding);
}

function makeStaticWorld() {
  const solid = new Uint8Array(COLS * ROWS);
  for (let x = 0; x < COLS; x += 1) { solid[indexOf(x, 0)] = 1; solid[indexOf(x, ROWS - 1)] = 1; }
  for (let y = 1; y < ROWS - 1; y += 1) {
    const yPx = y * CELL;
    const opening = GATES.some((gate) => yPx >= gate.top && yPx <= gate.bottom);
    if (!opening) for (let x = 42; x <= 47; x += 1) solid[indexOf(x, y)] = 1;
  }
  // Raised rail beds partition the three evacuation sectors.
  [35, 36, 37, 63, 64, 65].forEach((y) => {
    for (let x = 48; x < COLS; x += 1) solid[indexOf(x, y)] = 1;
  });
  // Building blocks make the flood animation read as a city rather than a diagram.
  const blocks = [
    [58, 8, 72, 18], [78, 10, 91, 25], [118, 8, 139, 21], [145, 11, 156, 28],
    [56, 43, 70, 55], [78, 42, 94, 51], [118, 43, 135, 59], [143, 42, 156, 56],
    [57, 72, 75, 88], [83, 71, 99, 83], [112, 72, 130, 88], [139, 71, 156, 91],
  ];
  blocks.forEach(([left, top, right, bottom]) => {
    for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) solid[indexOf(x, y)] = 1;
  });
  return solid;
}

const STATIC_WORLD = makeStaticWorld();

function rgbDelta(source: Uint8ClampedArray, edited: Uint8ClampedArray, offset: number) {
  return (Math.abs(source[offset] - edited[offset]) + Math.abs(source[offset + 1] - edited[offset + 1]) + Math.abs(source[offset + 2] - edited[offset + 2])) / 3;
}

function dilate(mask: Uint8Array) {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
    if (!mask[indexOf(x, y)]) continue;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx; const ny = y + dy;
      if (inBounds(nx, ny)) result[indexOf(nx, ny)] = 1;
    }
  }
  return result;
}

function connectedGate(barrier: Uint8Array, gate: Gate) {
  const { top, bottom, x } = gateCells(gate);
  const left = x - 5; const right = x + 5;
  const seen = new Uint8Array(barrier.length);
  const queue: number[] = [];
  for (let y = top - 1; y <= top + 1; y += 1) for (let px = left; px <= right; px += 1) {
    if (!inBounds(px, y) || !barrier[indexOf(px, y)]) continue;
    queue.push(indexOf(px, y)); seen[indexOf(px, y)] = 1;
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]; const cx = current % COLS; const cy = Math.floor(current / COLS);
    if (cy >= bottom - 1) return true;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = cx + dx; const ny = cy + dy;
      if (nx < left || nx > right || ny < top - 1 || ny > bottom + 1 || !inBounds(nx, ny)) continue;
      const next = indexOf(nx, ny);
      if (!barrier[next] || seen[next]) continue;
      seen[next] = 1; queue.push(next);
    }
  }
  return false;
}

function flood(barrier: Uint8Array) {
  const water = new Uint8Array(COLS * ROWS);
  const distances = new Int16Array(COLS * ROWS).fill(-1);
  const queue: number[] = [];
  for (let y = 1; y < ROWS - 1; y += 1) for (let x = 0; x < 42; x += 1) {
    const at = indexOf(x, y);
    if (STATIC_WORLD[at] || barrier[at]) continue;
    water[at] = 1; distances[at] = 0; queue.push(at);
  }
  let maxDistance = 0;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]; const x = current % COLS; const y = Math.floor(current / COLS); const distance = distances[current];
    maxDistance = Math.max(maxDistance, distance);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx; const ny = y + dy;
      if (!inBounds(nx, ny)) return;
      const next = indexOf(nx, ny);
      if (water[next] || STATIC_WORLD[next] || barrier[next]) return;
      water[next] = 1; distances[next] = distance + 1; queue.push(next);
    });
  }
  return { water, distances, maxDistance };
}

/**
 * A gate is one construction zone. A free-floating mark is its own structure.
 * This prevents anti-aliased export edges from turning one continuous gate
 * wall into multiple artificial structures, while still penalising unrelated
 * edits elsewhere on the sheet.
 */
function countStructures(mask: Uint8Array) {
  const seen = new Uint8Array(mask.length);
  const gateStructures = new Set<string>();
  let freeStructures = 0;
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
    const first = indexOf(x, y);
    if (!mask[first] || seen[first]) continue;
    const touchedGates = new Set<string>();
    seen[first] = 1;
    const queue = [first];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]; const cx = current % COLS; const cy = Math.floor(current / COLS);
      const point = cellPoint(cx, cy);
      GATES.forEach((gate) => { if (point.x >= gate.x - 79 && point.x <= gate.x + 79 && point.y >= gate.top - 34 && point.y <= gate.bottom + 34) touchedGates.add(gate.id); });
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = cx + dx; const ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const next = indexOf(nx, ny);
        if (!mask[next] || seen[next]) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    if (touchedGates.size) touchedGates.forEach((gate) => gateStructures.add(gate));
    else freeStructures += 1;
  }
  return gateStructures.size + freeStructures;
}

function blankReport(): FloodReport {
  return {
    modified: false, barrier: new Uint8Array(COLS * ROWS), water: new Uint8Array(COLS * ROWS), distances: new Int16Array(COLS * ROWS).fill(-1),
    gates: GATES.map((gate) => ({ ...gate, sealed: false })), assets: ASSETS.map((asset) => ({ ...asset, dry: false })),
    score: 0, title: 'NO HOLD.', wallMeters: 0, collateralMeters: 0, structures: 0, valid: false, changedCells: 0, maxDistance: 0,
  };
}

/**
 * Converts saved editor pixels into a barrier grid. It intentionally knows
 * nothing about draw order or semantic intent: only visible changed pixels
 * can stop the simulated tide.
 */
export function analyzeFlood(original: PixelFrame, edited: PixelFrame): FloodReport {
  if (original.width !== MAP_WIDTH || original.height !== MAP_HEIGHT || edited.width !== MAP_WIDTH || edited.height !== MAP_HEIGHT) throw new Error('Floodline needs equally sized 1600 × 1000 map frames.');
  const counts = new Uint16Array(COLS * ROWS);
  for (let y = 0; y < MAP_HEIGHT; y += 1) for (let x = 0; x < MAP_WIDTH; x += 1) {
    const offset = (y * MAP_WIDTH + x) * 4;
    if (rgbDelta(original.data, edited.data, offset) >= CHANGE_THRESHOLD) counts[indexOf(Math.floor(x / CELL), Math.floor(y / CELL))] += 1;
  }
  const raw = new Uint8Array(counts.length);
  counts.forEach((count, index) => { if (count >= 4) raw[index] = 1; });
  const changedCells = raw.reduce((sum, cell) => sum + cell, 0);
  if (changedCells < 8) return blankReport();

  const barrier = dilate(raw);
  const structures = countStructures(barrier);
  const gates = GATES.map((gate) => ({ ...gate, sealed: connectedGate(barrier, gate) }));
  const { water, distances, maxDistance } = flood(barrier);
  const assets = ASSETS.map((asset) => {
    const x = Math.floor(asset.x / CELL); const y = Math.floor(asset.y / CELL);
    return { ...asset, dry: !water[indexOf(x, y)] };
  });
  let collateral = 0;
  raw.forEach((value, index) => {
    if (!value) return;
    const x = index % COLS; const y = Math.floor(index / COLS);
    if (!inGate(cellPoint(x, y))) collateral += 1;
  });
  const wallMeters = changedCells * CELL;
  const collateralMeters = collateral * CELL;
  const dry = assets.filter((asset) => asset.dry).length;
  const sealed = gates.filter((gate) => gate.sealed).length;
  const economy = Math.max(0, 10 - Math.round(Math.max(0, wallMeters - 620) / 55));
  const discipline = Math.max(0, 10 - Math.round(collateralMeters / 24));
  const valid = wallMeters <= MATERIAL_BUDGET && structures <= MAX_STRUCTURES;
  const score = Math.min(100, dry * 12 + sealed * 8 + economy + discipline);
  const title = dry === 3 && sealed === 3 && collateralMeters <= 40 ? 'SECOND SHORELINE.' : dry >= 2 ? 'HOLDING LINE.' : dry >= 1 ? 'WATER ON THE BLOCK.' : 'TIDE INSIDE.';
  const finalTitle = dry === 5 && sealed === 3 && collateralMeters <= 40 ? 'SECOND SHORELINE.' : title;
  return { modified: true, barrier, water, distances, gates, assets, score, title: finalTitle, wallMeters, collateralMeters, structures, valid, changedCells, maxDistance };
}
