// main.js — Midnight Vault: game loop, state machine, scoring and screens.
// Screens: title → briefing → playing ⇄ paused → busted / levelcomplete →
// briefing … → gamecomplete. The loop runs on requestAnimationFrame with a
// clamped delta so a background tab never teleports the thief.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const PLAYER_SPEED = 132;
const PLAYER_RADIUS = 13;
const VAULT_CRACK_SECONDS = 1.2;
const COIN_COST = 100;
const COIN_HEAR_RANGE = 340;
const EMP_COST = 500;
const EMP_BLIND_SECONDS = 6;
const ALARM_RISE_GUARD = 22;
const ALARM_RISE_CAMERA = 30;
const ALARM_DECAY = 6;

const gameState = {
  screen: 'title',
  levelIndex: 0,
  level: LEVELS[0],
  grid: null,
  spawns: null,
  player: { x: 60, y: 60, dir: 0 },
  guards: [],
  cameras: [],
  alarm: 0,
  peakAlarm: 0,
  haul: 0,
  lootGrabbed: 0,
  toolsSpent: 0,
  vaultProgress: 0,
  vaultCracked: false,
  exitOpen: false,
  timeElapsed: 0,
  coin: null,
  flashMessage: '',
  flashTimer: 0,
  levelStats: null,
  overallRank: '',
  time: 0,
  rng: makeSeededRandom(1337),
  testMode: false,
  stepCount: 0,
};

function loadLevel(index) {
  const level = LEVELS[index];
  const parsed = parseLevelMap(level.map);
  gameState.levelIndex = index;
  gameState.level = level;
  gameState.grid = parsed.grid;
  gameState.spawns = parsed.spawns;
  gameState.player = { x: parsed.spawns.player.x, y: parsed.spawns.player.y, dir: 0 };
  gameState.guards = parsed.spawns.guards.map((spawn, i) =>
    createGuard(spawn, level.patrols[i] || [[1, 1]], gameState.rng),
  );
  gameState.cameras = parsed.spawns.cameras.map((spawn, i) =>
    createCamera(spawn, level.cameras[i] || { dir: 0, sweep: 0.8, period: 5 }, i * 1.7),
  );
  gameState.alarm = 0;
  gameState.peakAlarm = 0;
  gameState.lootGrabbed = 0;
  gameState.vaultProgress = 0;
  gameState.vaultCracked = false;
  gameState.exitOpen = false;
  gameState.timeElapsed = 0;
  gameState.coin = null;
  gameState.flashMessage = '';
  gameState.flashTimer = 0;
  gameState.levelStats = null;
}

function resetRun() {
  gameState.haul = 0;
  gameState.toolsSpent = 0;
  gameState.overallRank = '';
  loadLevel(0);
}

function showFlash(text) {
  gameState.flashMessage = text;
  gameState.flashTimer = 2.5;
}

function computeRank(peakAlarm) {
  if (peakAlarm <= 5) return 'GHOST';
  if (peakAlarm <= 30) return 'CLEAN';
  if (peakAlarm <= 70) return 'PRO';
  return 'LOUD';
}

function updateAlarmLevel(state, dt, anySeen, seenByCamera) {
  if (anySeen) {
    state.alarm += (seenByCamera ? ALARM_RISE_CAMERA : ALARM_RISE_GUARD) * dt;
  } else {
    state.alarm -= ALARM_DECAY * dt;
  }
  state.alarm = clampValue(state.alarm, 0, 100);
  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);
}

function fireEmp() {
  if (gameState.screen !== 'playing') return;
  if (gameState.haul < EMP_COST) {
    showFlash('Need $500 for an EMP — grab more loot first');
    return;
  }
  gameState.haul -= EMP_COST;
  gameState.toolsSpent += EMP_COST;
  blindAllCameras(gameState.cameras, EMP_BLIND_SECONDS);
  playEmpSound();
  showFlash('EMP fired — cameras blind for 6s');
}

function tossCoinAt(x, y) {
  if (gameState.screen !== 'playing') return;
  if (gameState.haul < COIN_COST) {
    showFlash('Need $100 to toss a coin');
    return;
  }
  gameState.haul -= COIN_COST;
  gameState.toolsSpent += COIN_COST;
  gameState.coin = { x, y, ttl: 4 };
  let pulled = 0;
  gameState.guards.forEach((guard) => {
    if (guardHearsCoin(guard, { x, y }, COIN_HEAR_RANGE)) pulled++;
  });
  playCoinSound();
  showFlash(pulled > 0 ? 'Coin tossed — a guard goes to look' : 'Coin tossed — nobody close enough to hear');
}

function finishLevel() {
  const level = gameState.level;
  const timeBonus = Math.max(0, Math.round((level.parSeconds - gameState.timeElapsed) * 10));
  const alarmPenalty = Math.round(gameState.peakAlarm * 5);
  const total = gameState.lootGrabbed + timeBonus - alarmPenalty - gameState.toolsSpent;
  const rank = computeRank(gameState.peakAlarm);
  gameState.levelStats = {
    loot: gameState.lootGrabbed,
    timeBonus,
    alarmPenalty,
    toolsSpent: gameState.toolsSpent,
    total,
    rank,
  };
  gameState.haul += total;
  gameState.toolsSpent = 0;
  playWinSound();
  if (gameState.levelIndex >= LEVELS.length - 1) {
    gameState.overallRank = computeRank(gameState.peakAlarm);
    gameState.screen = 'gamecomplete';
  } else {
    gameState.screen = 'levelcomplete';
  }
}

function bustPlayer(reason) {
  if (gameState.screen !== 'playing') return;
  gameState.screen = 'busted';
  playBustedSound();
  stopAlarmDrone();
  showFlash(reason || 'Busted!');
}

function updatePlaying(dt) {
  const state = gameState;
  state.timeElapsed += dt;

  const mv = movementVector();
  if (mv.x !== 0 || mv.y !== 0) {
    state.player.dir = Math.atan2(mv.y, mv.x);
    moveWithCollision(state.grid, state.player, mv.x * PLAYER_SPEED * dt, mv.y * PLAYER_SPEED * dt, PLAYER_RADIUS);
    state.stepCount++;
    if (state.stepCount % 24 === 0) playStepSound();
  }

  let anySeen = false;
  let seenByCamera = false;
  state.guards.forEach((guard) => {
    if (!state.testMode && guardCanSee(state.grid, guard, state.player)) {
      anySeen = true;
    }
  });
  state.cameras.forEach((camera) => {
    updateCamera(camera, state.time);
    if (!state.testMode && cameraCanSee(state.grid, camera, state.player)) {
      anySeen = true;
      seenByCamera = true;
    }
  });
  if (!state.testMode) updateAlarmLevel(state, dt, anySeen, seenByCamera);
  updateAlarmDrone(state.alarm);

  let busted = false;
  state.guards.forEach((guard) => {
    if (state.testMode) return;
    const caught = updateGuard(state.grid, guard, state.player, dt,
      () => { playSpottedSound(); showFlash('SPOTTED — break line of sight!'); },
      () => { busted = true; });
    if (caught) busted = true;
  });
  if (busted) {
    bustPlayer('A guard laid hands on you.');
    return;
  }
  if (state.alarm >= 100) {
    bustPlayer('The alarm hit 100% — the building locked down.');
    return;
  }

  if (state.coin) {
    state.coin.ttl -= dt;
    if (state.coin.ttl <= 0) state.coin = null;
  }

  state.spawns.loot.forEach((stash) => {
    if (!stash.taken && distanceBetween(state.player, stash) < 26) {
      stash.taken = true;
      state.lootGrabbed += state.level.lootValue;
      state.haul += state.level.lootValue;
      playLootSound();
      showFlash('Loot +$' + state.level.lootValue);
    }
  });

  const vault = state.spawns.vault;
  const nearVault = distanceBetween(state.player, vault) < 72;
  if (!state.vaultCracked && nearVault && inputState.actionHeld) {
    state.vaultProgress += dt / VAULT_CRACK_SECONDS;
    if (state.vaultProgress >= 1) {
      state.vaultProgress = 1;
      state.vaultCracked = true;
      state.exitOpen = true;
      state.alarm = clampValue(state.alarm + 15, 0, 100);
      state.peakAlarm = Math.max(state.peakAlarm, state.alarm);
      playCrackSound();
      showFlash('VAULT CRACKED — alarm +15 — get to the EXIT');
    }
  } else if (!state.vaultCracked) {
    state.vaultProgress = Math.max(0, state.vaultProgress - dt * 1.5);
  }

  if (state.exitOpen && distanceBetween(state.player, state.spawns.exit) < 28) {
    finishLevel();
  }
}

function renderFrame() {
  const state = gameState;
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  if (state.screen === 'title') drawTitleScreen(ctx, state);
  else if (state.screen === 'briefing') drawBriefingScreen(ctx, state);
  else if (state.screen === 'paused') drawPauseScreen(ctx, state);
  else if (state.screen === 'busted') drawBustedScreen(ctx, state);
  else if (state.screen === 'levelcomplete') drawLevelCompleteScreen(ctx, state);
  else if (state.screen === 'gamecomplete') drawGameCompleteScreen(ctx, state);
  else {
    drawWorld(ctx, state);
    drawHud(ctx, state);
  }
}

function handleKeyPress(key) {
  ensureAudio();
  const state = gameState;
  if (key === 'm') {
    const muted = toggleMute();
    showFlash(muted ? 'Sound off' : 'Sound on');
    return;
  }
  if (state.screen === 'title') {
    if (key === 'enter') {
      resetRun();
      state.screen = 'briefing';
    }
    return;
  }
  if (state.screen === 'briefing') {
    if (key === 'enter') state.screen = 'playing';
    return;
  }
  if (state.screen === 'playing') {
    if (key === 'p' || key === 'escape') state.screen = 'paused';
    else if (key === 'q') fireEmp();
    return;
  }
  if (state.screen === 'paused') {
    if (key === 'p' || key === 'escape') state.screen = 'playing';
    else if (key === 'r') { loadLevel(state.levelIndex); state.screen = 'playing'; }
    return;
  }
  if (state.screen === 'busted') {
    if (key === 'enter') { loadLevel(state.levelIndex); state.screen = 'playing'; }
    return;
  }
  if (state.screen === 'levelcomplete') {
    if (key === 'enter') {
      loadLevel(state.levelIndex + 1);
      state.screen = 'briefing';
    }
    return;
  }
  if (state.screen === 'gamecomplete') {
    if (key === 'enter') {
      resetRun();
      state.screen = 'title';
    }
  }
}

// ---- Screenshot staging ----------------------------------------------------
// ?shot=cover|play|vault|win&seed=N renders one fixed, busy frame so the
// screenshots show the game at its best: cones, cameras, vault, alarm.

function stageShot(shot) {
  const state = gameState;
  if (shot === 'cover') {
    loadLevel(0);
    state.screen = 'playing';
    state.player.x = 17 * TILE + 20;
    state.player.y = 11 * TILE + 20;
    state.player.dir = -Math.PI / 2;
    state.guards[0].x = 21 * TILE + 20;
    state.guards[0].y = 9 * TILE + 20;
    state.guards[0].dir = Math.PI * 0.75;
    state.guards[1].x = 10 * TILE + 20;
    state.guards[1].y = 10 * TILE + 20;
    state.guards[1].dir = 0;
    state.alarm = 34;
    state.peakAlarm = 34;
    state.haul = 850;
    state.lootGrabbed = 500;
    state.timeElapsed = 42;
  } else if (shot === 'play') {
    loadLevel(1);
    state.screen = 'playing';
    state.player.x = 6 * TILE + 20;
    state.player.y = 16 * TILE + 20;
    state.player.dir = Math.PI / 4;
    state.alarm = 12;
    state.peakAlarm = 12;
    state.haul = 1450;
    state.lootGrabbed = 800;
    state.timeElapsed = 61;
  } else if (shot === 'vault') {
    loadLevel(0);
    state.screen = 'playing';
    state.player.x = state.spawns.vault.x - 55;
    state.player.y = state.spawns.vault.y + 10;
    state.player.dir = 0;
    state.vaultProgress = 0.7;
    state.alarm = 58;
    state.peakAlarm = 58;
    state.haul = 1100;
    state.lootGrabbed = 750;
    state.timeElapsed = 73;
  } else if (shot === 'win') {
    loadLevel(0);
    state.haul = 1780;
    state.levelStats = { loot: 750, timeBonus: 320, alarmPenalty: 190, toolsSpent: 100, total: 1780, rank: 'PRO' };
    state.screen = 'levelcomplete';
  }
  renderFrame();
}

// ---- Boot ------------------------------------------------------------------

function gameLoop(timestamp) {
  const dt = Math.min(0.05, (timestamp - (gameLoop.last || timestamp)) / 1000 || 0.016);
  gameLoop.last = timestamp;
  const state = gameState;
  state.time += dt;
  if (state.flashTimer > 0) {
    state.flashTimer -= dt;
    if (state.flashTimer <= 0) state.flashMessage = '';
  }
  if (state.screen === 'playing') updatePlaying(dt);
  renderFrame();
  requestAnimationFrame(gameLoop);
}

function bootGame() {
  const params = new URLSearchParams(window.location.search);
  const seed = parseInt(params.get('seed') || '1337', 10);
  gameState.rng = makeSeededRandom(Number.isFinite(seed) ? seed : 1337);
  loadLevel(0);
  setupInput(canvas, {
    onKeyPress: handleKeyPress,
    onClick: (x, y) => tossCoinAt(x, y),
  });
  const shot = params.get('shot');
  if (params.get('selftest') === '1') {
    gameState.testMode = true;
    const results = runSelfTests();
    const pre = document.getElementById('selftest');
    const passed = results.filter((r) => r.pass).length;
    const text = results.map((r) => (r.pass ? 'PASS' : 'FAIL') + ' — ' + r.name + (r.detail ? ' (' + r.detail + ')' : '')).join('\n');
    pre.textContent = 'SELFTEST ' + passed + '/' + results.length + '\n' + text;
    document.title = 'SELFTEST ' + passed + '/' + results.length;
    renderFrame();
    return;
  }
  if (shot) {
    stageShot(shot);
  } else {
    gameState.screen = 'title';
  }
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', bootGame);
