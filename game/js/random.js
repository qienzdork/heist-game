// random.js — deterministic seeded RNG for Midnight Vault.
// Every run that matters (screenshots, self-test) seeds from a fixed number so
// patrol jitter and loot sparkle are reproducible frame to frame.

function makeSeededRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function nextRandom() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
