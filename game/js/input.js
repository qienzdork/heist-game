// input.js — keyboard and mouse state for Midnight Vault.
// WASD / arrows move, E (hold) cracks the vault, Q fires the EMP,
// click tosses a coin, P or Escape pauses, Enter advances screens, M mutes.

const inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  actionHeld: false,
  mouseX: 0,
  mouseY: 0,
  mouseClicked: false,
  clickX: 0,
  clickY: 0,
};

const pressedKeys = {};

function setupInput(canvas, callbacks) {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (!pressedKeys[key]) {
      if (callbacks.onKeyPress) callbacks.onKeyPress(key, event);
    }
    pressedKeys[key] = true;
    refreshMovementKeys();
  });
  window.addEventListener('keyup', (event) => {
    pressedKeys[event.key.toLowerCase()] = false;
    refreshMovementKeys();
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    inputState.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    inputState.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    inputState.clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    inputState.clickY = (event.clientY - rect.top) * (canvas.height / rect.height);
    inputState.mouseClicked = true;
    if (callbacks.onClick) callbacks.onClick(inputState.clickX, inputState.clickY);
  });
  window.addEventListener('blur', () => {
    Object.keys(pressedKeys).forEach((k) => { pressedKeys[k] = false; });
    refreshMovementKeys();
  });
}

function refreshMovementKeys() {
  inputState.up = !!(pressedKeys['w'] || pressedKeys['arrowup']);
  inputState.down = !!(pressedKeys['s'] || pressedKeys['arrowdown']);
  inputState.left = !!(pressedKeys['a'] || pressedKeys['arrowleft']);
  inputState.right = !!(pressedKeys['d'] || pressedKeys['arrowright']);
  inputState.actionHeld = !!pressedKeys['e'];
}

function movementVector() {
  let x = 0;
  let y = 0;
  if (inputState.left) x -= 1;
  if (inputState.right) x += 1;
  if (inputState.up) y -= 1;
  if (inputState.down) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

function consumeClick() {
  const clicked = inputState.mouseClicked;
  inputState.mouseClicked = false;
  return clicked;
}
