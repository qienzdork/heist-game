// render.js — every pixel of Midnight Vault is drawn in canvas code: the
// rooms, the vision cones, the thief, the loot and every screen. Safe cover
// reads as dark floor and crates, danger as warm cone light, loot as gold.

function drawVisionCone(ctx, x, y, dir, range, halfAngle, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWorld(ctx, state) {
  const grid = state.grid;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const px = tx * TILE;
      const py = ty * TILE;
      const tile = grid[ty][tx];
      if (tile === TILE_WALL) {
        ctx.fillStyle = '#232a3d';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2e3852';
        ctx.fillRect(px, py, TILE, 4);
        ctx.fillStyle = '#161b29';
        ctx.fillRect(px, py + TILE - 3, TILE, 3);
      } else {
        const checker = (tx + ty) % 2 === 0;
        ctx.fillStyle = checker ? '#1a2030' : '#171c2a';
        ctx.fillRect(px, py, TILE, TILE);
        if (tile === TILE_CRATE) {
          ctx.fillStyle = '#7a5a22';
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = '#a67c2e';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE - 4, py + TILE - 4);
          ctx.moveTo(px + TILE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE - 4);
          ctx.strokeStyle = '#5d4418';
          ctx.stroke();
        }
      }
    }
  }

  // Carpet runner down the middle corridor of each room.
  ctx.fillStyle = 'rgba(122, 32, 48, 0.25)';
  ctx.fillRect(0, 9 * TILE + 14, WORLD_W, 12);

  drawLootStashes(ctx, state);
  drawVaultTarget(ctx, state);
  drawExitDoor(ctx, state);
  drawCameraCones(ctx, state);
  drawGuardCones(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawCoinToss(ctx, state);
  drawPlayerThief(ctx, state);
}

function drawLootStashes(ctx, state) {
  state.spawns.loot.forEach((stash) => {
    if (stash.taken) return;
    const bob = Math.sin(state.time * 3 + stash.x) * 3;
    ctx.save();
    ctx.translate(stash.x, stash.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#fff0b3';
    ctx.lineWidth = 2;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 211, 77, 0.25)';
    ctx.beginPath();
    ctx.arc(stash.x, stash.y + bob, 16, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawVaultTarget(ctx, state) {
  const v = state.spawns.vault;
  const cracked = state.vaultCracked;
  const glow = cracked ? 'rgba(120, 255, 170, 0.35)' : 'rgba(255, 211, 77, 0.35)';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(v.x, v.y, 26 + Math.sin(state.time * 2) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cracked ? '#2f7d4f' : '#8a6d1f';
  ctx.fillRect(v.x - 15, v.y - 15, 30, 30);
  ctx.strokeStyle = cracked ? '#7dffab' : '#ffd34d';
  ctx.lineWidth = 3;
  ctx.strokeRect(v.x - 15, v.y - 15, 30, 30);
  ctx.beginPath();
  ctx.arc(v.x, v.y, 7, 0, Math.PI * 2);
  ctx.strokeStyle = cracked ? '#7dffab' : '#ffe9a3';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = cracked ? '#7dffab' : '#ffe9a3';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(cracked ? 'OPEN' : 'VAULT', v.x, v.y - 24);
  if (!cracked && state.vaultProgress > 0) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 20, -Math.PI / 2, -Math.PI / 2 + state.vaultProgress * Math.PI * 2);
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawExitDoor(ctx, state) {
  const e = state.spawns.exit;
  const open = state.exitOpen;
  ctx.fillStyle = open ? 'rgba(60, 220, 130, 0.4)' : 'rgba(90, 90, 90, 0.3)';
  ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
  ctx.strokeStyle = open ? '#3cdc82' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x - 18, e.y - 18, 36, 36);
  ctx.fillStyle = open ? '#3cdc82' : '#aaaaaa';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x, e.y + 4);
  if (open) {
    ctx.fillStyle = 'rgba(60, 220, 130, 0.2)';
    ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
  }
}

function drawCameraCones(ctx, state) {
  state.cameras.forEach((camera) => {
    const blinded = camera.blindTimer > 0;
    drawVisionCone(
      ctx, camera.x, camera.y, camera.dir, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE,
      blinded ? 'rgba(120, 120, 120, 0.05)' : 'rgba(80, 200, 255, 0.10)',
      blinded ? 'rgba(120, 120, 120, 0.15)' : 'rgba(80, 200, 255, 0.35)',
    );
  });
}

function drawGuardCones(ctx, state) {
  state.guards.forEach((guard) => {
    let fill = 'rgba(255, 214, 64, 0.10)';
    let stroke = 'rgba(255, 214, 64, 0.4)';
    if (guard.state === 'investigate') {
      fill = 'rgba(255, 150, 40, 0.14)';
      stroke = 'rgba(255, 150, 40, 0.55)';
    } else if (guard.state === 'chase') {
      fill = 'rgba(255, 60, 60, 0.16)';
      stroke = 'rgba(255, 60, 60, 0.6)';
    }
    drawVisionCone(ctx, guard.x, guard.y, guard.dir, GUARD_SIGHT_RANGE, GUARD_CONE_HALF_ANGLE, fill, stroke);
  });
}

function drawCameras(ctx, state) {
  state.cameras.forEach((camera) => {
    const blinded = camera.blindTimer > 0;
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.rotate(camera.dir);
    ctx.fillStyle = blinded ? '#555555' : '#223344';
    ctx.fillRect(-4, -8, 16, 16);
    ctx.fillStyle = blinded ? '#777777' : '#50c8ff';
    ctx.beginPath();
    ctx.arc(12, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = blinded ? '#888888' : '#50c8ff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(blinded ? 'EMP' : 'CAM', camera.x, camera.y - 14);
  });
}

function drawGuards(ctx, state) {
  state.guards.forEach((guard) => {
    const body = guard.state === 'chase' ? '#e33' : guard.state === 'investigate' ? '#f80' : '#c8a24a';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.dir) * 17, guard.y + Math.sin(guard.dir) * 17);
    ctx.stroke();
    if (guard.suspicion > 0.05) {
      ctx.fillStyle = '#222';
      ctx.fillRect(guard.x - 14, guard.y - 26, 28, 5);
      ctx.fillStyle = guard.suspicion >= 1 ? '#ff4444' : '#ffcc33';
      ctx.fillRect(guard.x - 14, guard.y - 26, 28 * guard.suspicion, 5);
    }
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 30);
    }
  });
}

function drawCoinToss(ctx, state) {
  if (!state.coin) return;
  const c = state.coin;
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8a24a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 233, 163, 0.7)';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 12 + Math.sin(state.time * 6) * 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayerThief(ctx, state) {
  const p = state.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12141f';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#35e0ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = '#35e0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.dir) * 16, p.y + Math.sin(p.dir) * 16);
  ctx.stroke();
  ctx.fillStyle = '#35e0ff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 6, p.y + Math.sin(p.dir) * 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ---- HUD -----------------------------------------------------------------

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.92)';
  ctx.fillRect(0, 0, WORLD_W, 52);
  ctx.fillStyle = '#35e0ff';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(state.level.shortName.toUpperCase(), 14, 21);
  ctx.fillStyle = '#9aa4c0';
  ctx.font = '12px monospace';
  const objective = state.vaultCracked ? 'Vault open — reach the green EXIT' : 'Crack the VAULT (hold E) — then exit';
  ctx.fillText(objective, 14, 40);

  const alarmX = 470;
  ctx.fillStyle = '#9aa4c0';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('ALARM', alarmX, 21);
  const barW = 220;
  const barH = 12;
  ctx.fillStyle = '#222838';
  ctx.fillRect(alarmX, 28, barW, barH);
  const alarmColor = state.alarm > 70 ? '#ff4444' : state.alarm > 35 ? '#ff9933' : '#35e0ff';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(alarmX, 28, barW * (state.alarm / 100), barH);
  ctx.strokeStyle = '#4a5470';
  ctx.lineWidth = 1;
  ctx.strokeRect(alarmX, 28, barW, barH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(Math.round(state.alarm) + '%', alarmX + barW + 8, 39);

  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('HAUL $' + state.haul.toLocaleString('en-US'), WORLD_W - 14, 21);
  ctx.fillStyle = '#9aa4c0';
  ctx.font = '12px monospace';
  const mm = Math.floor(state.timeElapsed / 60);
  const ss = Math.floor(state.timeElapsed % 60);
  const clock = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  ctx.fillText(clock + '   EMP [Q] $500   COIN [click] $100', WORLD_W - 14, 40);
  ctx.textAlign = 'left';

  if (state.flashMessage) {
    ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
    const w = ctx.measureText(state.flashMessage).width + 28;
    ctx.fillRect((WORLD_W - w) / 2, 60, w, 26);
    ctx.fillStyle = '#ffe9a3';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.flashMessage, WORLD_W / 2, 78);
    ctx.textAlign = 'left';
  }
}

// ---- Screens ---------------------------------------------------------------

function drawCenteredPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 14, 0.82)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(WORLD_W / 2 - 360, 150, 720, 500);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.95)';
  ctx.fillRect(WORLD_W / 2 - 360, 150, 720, 500);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, WORLD_W / 2, 215);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = '16px monospace';
  lines.forEach((line, i) => {
    ctx.fillText(line, WORLD_W / 2, 265 + i * 30);
  });
  ctx.textAlign = 'left';
}

function drawTitleScreen(ctx, state) {
  drawWorld(ctx, state);
  ctx.fillStyle = 'rgba(5, 7, 14, 0.78)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = '#35e0ff';
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT VAULT', WORLD_W / 2, 220);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('— THE MERIDIAN JOB —', WORLD_W / 2, 260);
  ctx.fillStyle = '#dfe6ff';
  ctx.font = '17px monospace';
  ctx.fillText('You are Vex, thief-for-hire. Three rooms. Three vaults. One night.', WORLD_W / 2, 320);
  ctx.fillText('Read the patrols. Break the sightlines. Get out rich.', WORLD_W / 2, 348);
  ctx.fillStyle = '#9aa4c0';
  ctx.font = '15px monospace';
  ctx.fillText('WASD / arrows — move      E (hold) — crack vault      Q — EMP $500', WORLD_W / 2, 420);
  ctx.fillText('Click — toss a coin $100      P — pause      M — mute', WORLD_W / 2, 446);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(state.time % 1 < 0.6 ? 'PRESS ENTER TO START THE JOB' : '', WORLD_W / 2, 520);
  ctx.fillStyle = '#5a6482';
  ctx.textAlign = 'left';
}

function drawBriefingScreen(ctx, state) {
  drawWorld(ctx, state);
  const lines = state.level.briefing.concat(['', 'TIP: ' + state.level.tip, '', 'Press ENTER to go in.']);
  drawCenteredPanel(ctx, state.level.name, lines, '#35e0ff');
}

function drawPauseScreen(ctx, state) {
  drawWorld(ctx, state);
  drawCenteredPanel(ctx, 'PAUSED', ['The job waits for no one — except now.', '', 'Press P or ESC to resume.', 'Press R to restart this act.'], '#9aa4c0');
}

function drawBustedScreen(ctx, state) {
  drawWorld(ctx, state);
  drawCenteredPanel(ctx, 'BUSTED', ['The guards got you. The vault keeps its gold.', '', 'Haul kept so far: $' + state.haul.toLocaleString('en-US'), '', 'Press ENTER to retry this act.'], '#ff4444');
}

function drawLevelCompleteScreen(ctx, state) {
  const s = state.levelStats;
  const lines = [
    state.level.shortName + ' — cleared.',
    '',
    'Loot grabbed ......... $' + s.loot,
    'Time bonus ........... $' + s.timeBonus,
    'Alarm penalty ........ -$' + s.alarmPenalty,
    'Tools spent .......... -$' + s.toolsSpent,
    '',
    'ACT TOTAL ............ $' + s.total,
    'RANK ................. ' + s.rank,
    '',
    'Press ENTER for the next act.',
  ];
  drawCenteredPanel(ctx, 'CLEAN GETAWAY', lines, '#3cdc82');
}

function drawGameCompleteScreen(ctx, state) {
  const lines = [
    'All three vaults cracked. Vex vanishes into the night.',
    '',
    'TOTAL HAUL ........... $' + state.haul.toLocaleString('en-US'),
    'OVERALL RANK ......... ' + state.overallRank,
    '',
    'Thanks for playing Midnight Vault.',
    'Press ENTER to run the job again.',
  ];
  drawCenteredPanel(ctx, 'THE MERIDIAN JOB — DONE', lines, '#ffd34d');
}
