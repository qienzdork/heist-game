// guards.js — guard AI: patrol / investigate / chase with a raycast vision
// cone. A guard only sees the thief when the thief is inside the cone's
// range and angle AND the sampled ray between them crosses no wall or crate.
// Being seen fills a per-guard suspicion meter; a full meter flips the
// guard into chase, and touching the thief is a bust.

const GUARD_PATROL_SPEED = 62;
const GUARD_INVESTIGATE_SPEED = 88;
const GUARD_CHASE_SPEED = 118;
const GUARD_SIGHT_RANGE = 210;
const GUARD_CONE_HALF_ANGLE = 0.62;
const GUARD_SUSPICION_RATE = 1.6;
const GUARD_SUSPICION_DECAY = 0.8;
const GUARD_TOUCH_RADIUS = 20;

function createGuard(spawn, waypoints, rng) {
  return {
    x: spawn.x,
    y: spawn.y,
    dir: randomRange(rng, 0, Math.PI * 2),
    state: 'patrol',
    waypointIndex: 0,
    waypoints: waypoints.map((w) => ({ x: (w[0] + 0.5) * TILE, y: (w[1] + 0.5) * TILE })),
    suspicion: 0,
    investigateTarget: null,
    investigateTimer: 0,
    lookTimer: 0,
    lastSeen: null,
    stuckTimer: 0,
  };
}

// True when the guard can currently see the player: range, cone angle and a
// clear raycast. Chase-state guards see a little further — they already
// know where you are.
function guardCanSee(grid, guard, player) {
  const range = guard.state === 'chase' ? GUARD_SIGHT_RANGE * 1.15 : GUARD_SIGHT_RANGE;
  const d = distanceBetween(guard, player);
  if (d > range) return false;
  const toPlayer = angleTo(guard, player);
  if (Math.abs(angleDifference(toPlayer, guard.dir)) > GUARD_CONE_HALF_ANGLE) return false;
  return hasLineOfSight(grid, guard.x, guard.y, player.x, player.y);
}

function moveGuardToward(grid, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const stepX = (dx / d) * speed * dt;
  const stepY = (dy / d) * speed * dt;
  const beforeX = guard.x;
  const beforeY = guard.y;
  moveWithCollision(grid, guard, stepX, stepY, 14);
  guard.dir = Math.atan2(dy, dx);
  if (Math.hypot(guard.x - beforeX, guard.y - beforeY) < speed * dt * 0.25) {
    guard.stuckTimer += dt;
  } else {
    guard.stuckTimer = 0;
  }
  return d < 6;
}

function updateGuard(grid, guard, player, dt, onSpotted, onBusted) {
  const sees = guardCanSee(grid, guard, player);
  if (sees) {
    guard.suspicion = Math.min(1, guard.suspicion + GUARD_SUSPICION_RATE * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= 1 && guard.state !== 'chase') {
      guard.state = 'chase';
      if (onSpotted) onSpotted(guard);
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_DECAY * dt);
    if (guard.state === 'chase' && guard.suspicion <= 0) {
      guard.state = 'investigate';
      guard.investigateTarget = guard.lastSeen || { x: guard.x, y: guard.y };
      guard.investigateTimer = 2.5;
    }
  }

  if (guard.state === 'patrol') {
    const target = guard.waypoints[guard.waypointIndex];
    if (moveGuardToward(grid, guard, target.x, target.y, GUARD_PATROL_SPEED, dt) || guard.stuckTimer > 1.2) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.stuckTimer = 0;
      guard.lookTimer = 0.6;
    }
    if (guard.lookTimer > 0) {
      guard.lookTimer -= dt;
      guard.dir += Math.sin(guard.lookTimer * 9) * 0.02;
    }
  } else if (guard.state === 'investigate') {
    if (guard.investigateTarget) {
      const arrived = moveGuardToward(grid, guard, guard.investigateTarget.x, guard.investigateTarget.y, GUARD_INVESTIGATE_SPEED, dt);
      if (arrived || guard.stuckTimer > 1.2) {
        guard.stuckTimer = 0;
        guard.investigateTimer -= dt;
        guard.dir += dt * 1.8;
        if (guard.investigateTimer <= 0) {
          guard.state = 'patrol';
          guard.investigateTarget = null;
        }
      }
    } else {
      guard.state = 'patrol';
    }
  } else if (guard.state === 'chase') {
    moveGuardToward(grid, guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
    if (guard.stuckTimer > 1.5) {
      guard.state = 'investigate';
      guard.investigateTarget = guard.lastSeen || { x: player.x, y: player.y };
      guard.investigateTimer = 2;
      guard.stuckTimer = 0;
    }
  }

  if (distanceBetween(guard, player) < GUARD_TOUCH_RADIUS) {
    if (onBusted) onBusted(guard);
    return true;
  }
  return false;
}

// A coin toss pulls the nearest guard off its patrol toward the noise.
function guardHearsCoin(guard, coinPos, maxRange) {
  if (guard.state === 'chase') return false;
  if (distanceBetween(guard, coinPos) > maxRange) return false;
  guard.state = 'investigate';
  guard.investigateTarget = { x: coinPos.x, y: coinPos.y };
  guard.investigateTimer = 3.5;
  guard.suspicion = Math.max(guard.suspicion, 0.4);
  return true;
}
