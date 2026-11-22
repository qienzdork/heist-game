// selftest.js — in-page assertions for Midnight Vault, run with ?selftest=1.
// Each test exercises the real code paths (raycast, alarm, EMP, coin, vault,
// the full level-1 playthrough) and reports PASS/FAIL into the page so a
// headless browser run can read the verdict from the DOM.

function selfTestResult(name, pass, detail) {
  return { name, pass: !!pass, detail: detail || '' };
}

function runSelfTests() {
  const results = [];
  gameState.testMode = true;

  // 1. Every level map is structurally sound.
  try {
    const all = LEVELS.map(validateLevel);
    const bad = all.map((p, i) => (p.length ? 'L' + (i + 1) + ':' + p.join(',') : '')).filter(Boolean);
    results.push(selfTestResult('level maps validate (32x20, P/V/E, guards, cameras, loot)', bad.length === 0, bad.join(' | ')));
  } catch (e) {
    results.push(selfTestResult('level maps validate', false, String(e)));
  }

  // 2. A wall blocks line of sight; open floor does not.
  try {
    const rows = [];
    for (let y = 0; y < ROWS; y++) rows.push('.'.repeat(16) + '#' + '.'.repeat(15));
    const grid = parseLevelMap(rows).grid;
    const blocked = hasLineOfSight(grid, 100, 400, 1200, 400);
    const open = hasLineOfSight(grid, 100, 100, 500, 100);
    results.push(selfTestResult('LOS blocked by wall, open across floor', blocked === false && open === true, 'blocked=' + blocked + ' open=' + open));
  } catch (e) {
    results.push(selfTestResult('LOS blocked by wall, open across floor', false, String(e)));
  }

  // 3. The alarm decays when hidden and rises when seen.
  try {
    const s = { alarm: 60, peakAlarm: 60 };
    updateAlarmLevel(s, 2, false, false);
    const decayed = s.alarm;
    updateAlarmLevel(s, 1, true, false);
    const risen = s.alarm;
    results.push(selfTestResult('alarm decays hidden, rises when seen', decayed < 60 && risen > decayed, '60 -> ' + decayed.toFixed(1) + ' -> ' + risen.toFixed(1)));
  } catch (e) {
    results.push(selfTestResult('alarm decays hidden, rises when seen', false, String(e)));
  }

  // 4. EMP blinds cameras: a camera that sees the thief sees nothing blind.
  try {
    const rows = [];
    for (let y = 0; y < ROWS; y++) rows.push('.'.repeat(32));
    const grid = parseLevelMap(rows).grid;
    const camera = createCamera({ x: 400, y: 400 }, { dir: 0, sweep: 0.5, period: 5 }, 0);
    updateCamera(camera, 0);
    const before = cameraCanSee(grid, camera, { x: 500, y: 400 });
    blindAllCameras([camera], 6);
    const after = cameraCanSee(grid, camera, { x: 500, y: 400 });
    results.push(selfTestResult('EMP blinds cameras', before === true && after === false, 'before=' + before + ' after=' + after));
  } catch (e) {
    results.push(selfTestResult('EMP blinds cameras', false, String(e)));
  }

  // 5. A coin toss pulls a guard off patrol to investigate the noise.
  try {
    const rng = makeSeededRandom(7);
    const guard = createGuard({ x: 100, y: 100 }, [[2, 2], [5, 5]], rng);
    const heard = guardHearsCoin(guard, { x: 120, y: 120 }, 340);
    const ok = heard && guard.state === 'investigate' && guard.investigateTarget && guard.investigateTarget.x === 120;
    results.push(selfTestResult('coin pulls a guard to investigate', ok, 'state=' + guard.state));
  } catch (e) {
    results.push(selfTestResult('coin pulls a guard to investigate', false, String(e)));
  }

  // 6. Holding E at the vault cracks it and opens the exit.
  try {
    loadLevel(0);
    gameState.testMode = true;
    gameState.player.x = gameState.spawns.vault.x - 55;
    gameState.player.y = gameState.spawns.vault.y + 10;
    inputState.actionHeld = true;
    for (let i = 0; i < 15; i++) updatePlaying(0.1);
    inputState.actionHeld = false;
    const ok = gameState.vaultCracked === true && gameState.exitOpen === true;
    results.push(selfTestResult('vault channel (hold E 1.2s) opens the exit', ok, 'cracked=' + gameState.vaultCracked + ' exitOpen=' + gameState.exitOpen));
  } catch (e) {
    inputState.actionHeld = false;
    results.push(selfTestResult('vault channel (hold E 1.2s) opens the exit', false, String(e)));
  }

  // 7. A wall stops the thief: movement into solid tile is refused.
  try {
    loadLevel(0);
    gameState.testMode = true;
    gameState.player.x = 60;
    gameState.player.y = 60;
    moveWithCollision(gameState.grid, gameState.player, -100, 0, PLAYER_RADIUS);
    results.push(selfTestResult('walls block movement', gameState.player.x === 60, 'x=' + gameState.player.x));
  } catch (e) {
    results.push(selfTestResult('walls block movement', false, String(e)));
  }

  // 8. A camera that sees the thief feeds the alarm.
  try {
    loadLevel(0);
    gameState.testMode = false;
    gameState.screen = 'playing';
    gameState.player.x = 950;
    gameState.player.y = 140;
    gameState.player.dir = Math.PI;
    const before = gameState.alarm;
    updatePlaying(0.5);
    const ok = gameState.alarm > before && gameState.screen === 'playing';
    gameState.testMode = true;
    results.push(selfTestResult('camera sight raises the alarm', ok, 'alarm ' + before.toFixed(1) + ' -> ' + gameState.alarm.toFixed(1)));
  } catch (e) {
    gameState.testMode = true;
    results.push(selfTestResult('camera sight raises the alarm', false, String(e)));
  }

  // 9. Touching a guard is a bust.
  try {
    loadLevel(0);
    gameState.testMode = false;
    gameState.screen = 'playing';
    const guard = gameState.guards[0];
    gameState.player.x = guard.x;
    gameState.player.y = guard.y;
    updatePlaying(0.05);
    const ok = gameState.screen === 'busted';
    gameState.testMode = true;
    results.push(selfTestResult('guard touch busts the player', ok, 'screen=' + gameState.screen));
  } catch (e) {
    gameState.testMode = true;
    results.push(selfTestResult('guard touch busts the player', false, String(e)));
  }

  // 10. Full level-1 playthrough: loot, crack, exit, level complete.
  try {
    loadLevel(0);
    gameState.testMode = true;
    gameState.screen = 'playing';
    gameState.spawns.loot.forEach((stash) => {
      gameState.player.x = stash.x;
      gameState.player.y = stash.y;
      updatePlaying(0.05);
    });
    const lootOk = gameState.lootGrabbed > 0;
    gameState.player.x = gameState.spawns.vault.x - 55;
    gameState.player.y = gameState.spawns.vault.y + 10;
    inputState.actionHeld = true;
    for (let i = 0; i < 15; i++) updatePlaying(0.1);
    inputState.actionHeld = false;
    const crackOk = gameState.vaultCracked && gameState.exitOpen;
    gameState.player.x = gameState.spawns.exit.x;
    gameState.player.y = gameState.spawns.exit.y;
    updatePlaying(0.05);
    const doneOk = gameState.screen === 'levelcomplete';
    const statsOk = gameState.levelStats && gameState.levelStats.total > 0;
    results.push(selfTestResult(
      'full level-1 playthrough (loot, crack, exit)',
      lootOk && crackOk && doneOk && statsOk,
      'loot=$' + gameState.lootGrabbed + ' cracked=' + crackOk + ' screen=' + gameState.screen + ' total=$' + (gameState.levelStats ? gameState.levelStats.total : 'n/a'),
    ));
  } catch (e) {
    inputState.actionHeld = false;
    results.push(selfTestResult('full level-1 playthrough (loot, crack, exit)', false, String(e)));
  }

  loadLevel(0);
  gameState.screen = 'title';
  return results;
}
