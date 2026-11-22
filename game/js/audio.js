// audio.js — WebAudio synthesised sounds. No audio files: every blip,
// sting and alarm is an oscillator shaped in code, so the game stays
// fully offline and the dossier holds no assets.

let audioContext = null;
let audioMuted = false;
let alarmOscillator = null;
let alarmGain = null;

function ensureAudio() {
  if (!audioContext) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContext = new AC();
    } catch (e) {
      audioContext = null;
    }
  }
  if (audioContext && audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playTone(freq, duration, type, volume, slideTo) {
  if (audioMuted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function playCoinSound() {
  playTone(1320, 0.09, 'triangle', 0.1);
  setTimeout(() => playTone(1760, 0.12, 'triangle', 0.1), 70);
}

function playLootSound() {
  playTone(880, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(1174, 0.14, 'sine', 0.12), 80);
}

function playCrackSound() {
  playTone(180, 0.25, 'square', 0.1, 60);
  setTimeout(() => playTone(520, 0.12, 'triangle', 0.12), 220);
  setTimeout(() => playTone(780, 0.2, 'triangle', 0.12), 320);
}

function playBustedSound() {
  playTone(320, 0.5, 'sawtooth', 0.14, 70);
  setTimeout(() => playTone(160, 0.6, 'sawtooth', 0.12, 50), 200);
}

function playSpottedSound() {
  playTone(980, 0.12, 'square', 0.08, 620);
}

function playEmpSound() {
  playTone(1400, 0.3, 'sine', 0.12, 120);
}

function playWinSound() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.22, 'triangle', 0.12), i * 110));
}

function playStepSound() {
  playTone(140, 0.05, 'sine', 0.03);
}

// A low pulsing alarm drone while the meter runs hot. It fades out on its own.
function updateAlarmDrone(alarm) {
  if (audioMuted || alarm < 45) {
    stopAlarmDrone();
    return;
  }
  const ctx = ensureAudio();
  if (!ctx) return;
  if (!alarmOscillator) {
    alarmOscillator = ctx.createOscillator();
    alarmGain = ctx.createGain();
    alarmOscillator.type = 'sawtooth';
    alarmOscillator.frequency.value = 110;
    alarmGain.gain.value = 0.0;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 3;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(alarmOscillator.frequency);
    alarmOscillator.connect(alarmGain);
    alarmGain.connect(ctx.destination);
    alarmOscillator.start();
    lfo.start();
  }
  alarmGain.gain.setTargetAtTime(0.02 + (alarm / 100) * 0.05, ctx.currentTime, 0.2);
}

function stopAlarmDrone() {
  if (alarmOscillator) {
    try { alarmOscillator.stop(); } catch (e) { /* already stopped */ }
    alarmOscillator = null;
    alarmGain = null;
  }
}

function toggleMute() {
  audioMuted = !audioMuted;
  if (audioMuted) stopAlarmDrone();
  return audioMuted;
}
