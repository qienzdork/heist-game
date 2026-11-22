// world.js — the tile grid: parsing, collision and raycast line of sight.
// Tile codes in a level map string:
//   '#' wall   'C' crate (solid, blocks sight)   '.' open floor
//   'P' player start   'G' guard spawn   'K' camera mount
//   'V' vault target   'E' exit door   'L' loot stash
// Walls and crates are the only solid tiles. Sight is a sampled ray: if any
// sample lands inside a solid tile the ray is blocked, so a crate or a wall
// genuinely hides the thief.

const TILE = 40;
const COLS = 32;
const ROWS = 20;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;

const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_CRATE = 2;

function parseLevelMap(rows) {
  const grid = [];
  const spawns = { player: null, guards: [], cameras: [], vault: null, exit: null, loot: [] };
  for (let y = 0; y < ROWS; y++) {
    const row = rows[y];
    const grow = [];
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      if (ch === '#') grow.push(TILE_WALL);
      else if (ch === 'C') grow.push(TILE_CRATE);
      else grow.push(TILE_FLOOR);
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      if (ch === 'P') spawns.player = { x: cx, y: cy };
      else if (ch === 'G') spawns.guards.push({ x: cx, y: cy });
      else if (ch === 'K') spawns.cameras.push({ x: cx, y: cy });
      else if (ch === 'V') spawns.vault = { x: cx, y: cy };
      else if (ch === 'E') spawns.exit = { x: cx, y: cy };
      else if (ch === 'L') spawns.loot.push({ x: cx, y: cy, taken: false });
    }
    grid.push(grow);
  }
  return { grid, spawns };
}

function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return TILE_WALL;
  return grid[ty][tx];
}

function isSolidTile(grid, tx, ty) {
  return tileAt(grid, tx, ty) !== TILE_FLOOR;
}

function isSolidPixel(grid, px, py) {
  return isSolidTile(grid, Math.floor(px / TILE), Math.floor(py / TILE));
}

// Axis-separated circle-vs-tile collision. Returns the corrected position so
// the thief and the guards slide along walls instead of sticking to them.
function moveWithCollision(grid, pos, dx, dy, radius) {
  let nx = pos.x + dx;
  if (!circleHitsSolid(grid, nx, pos.y, radius)) pos.x = nx;
  let ny = pos.y + dy;
  if (!circleHitsSolid(grid, pos.x, ny, radius)) pos.y = ny;
  return pos;
}

function circleHitsSolid(grid, px, py, radius) {
  const x0 = Math.floor((px - radius) / TILE);
  const x1 = Math.floor((px + radius) / TILE);
  const y0 = Math.floor((py - radius) / TILE);
  const y1 = Math.floor((py + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolidTile(grid, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
      const ddx = px - nearestX;
      const ddy = py - nearestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// Sampled raycast: true when nothing solid stands between the two points.
function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidPixel(grid, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clampValue(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
