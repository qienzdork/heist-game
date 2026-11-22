// cameras.js — wall-mounted security cameras. Each camera sweeps its cone
// back and forth on a fixed period; a thief caught inside the cone with a
// clear line of sight feeds the alarm fast. An EMP blindfolds every camera
// for a few seconds: the cone goes grey and the camera sees nothing.

const CAMERA_RANGE = 230;
const CAMERA_CONE_HALF_ANGLE = 0.5;

function createCamera(spawn, spec, timeOffset) {
  return {
    x: spawn.x,
    y: spawn.y,
    baseDir: spec.dir,
    sweep: spec.sweep,
    period: spec.period,
    phase: timeOffset,
    blindTimer: 0,
    dir: spec.dir,
  };
}

function updateCamera(camera, time) {
  camera.dir = camera.baseDir + Math.sin(((time + camera.phase) / camera.period) * Math.PI * 2) * camera.sweep;
  if (camera.blindTimer > 0) camera.blindTimer -= 1 / 60;
}

// True when this camera currently spots the player.
function cameraCanSee(grid, camera, player) {
  if (camera.blindTimer > 0) return false;
  const d = distanceBetween(camera, player);
  if (d > CAMERA_RANGE) return false;
  const toPlayer = angleTo(camera, player);
  if (Math.abs(angleDifference(toPlayer, camera.dir)) > CAMERA_CONE_HALF_ANGLE) return false;
  return hasLineOfSight(grid, camera.x, camera.y, player.x, player.y);
}

function blindAllCameras(cameras, seconds) {
  cameras.forEach((camera) => {
    camera.blindTimer = seconds;
  });
}

function anyCameraBlinded(cameras) {
  return cameras.some((camera) => camera.blindTimer > 0);
}
