// Monkey Mayhem – Simple version: 3 lives, 2-minute timer, High Score

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ------------ GAME STATE ------------
let gameRunning = false;
let gameStarted = false;

let score = 0;
let lives = 3;

// 2-minute timer (120 seconds)
const TOTAL_TIME = 120;
let remainingTime = TOTAL_TIME;
let lastTimestamp = null;

// High score (saved in localStorage)
let highScore = 0;
const HIGH_SCORE_KEY = "monkeyMayhemHighScore";

const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
if (storedHighScore !== null && !isNaN(parseInt(storedHighScore))) {
  highScore = parseInt(storedHighScore, 10);
}

// ------------ ENTITIES ------------
const monkey = {
  x: canvas.width / 2,
  y: 160, // wall height
  width: 40,
  height: 40,
  speed: 5,
};

let bananas = [];
let visitors = [];
let guards = [];

const groundY = 380;
const gravity = 0.35;

// Input
const keys = {
  left: false,
  right: false,
  space: false,
};

let lastThrowTime = 0;
const throwCooldown = 400; // ms

// ------------ UTIL ------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ------------ INIT ------------
function initActors() {
  visitors = [];
  guards = [];

  // visitors
  for (let i = 0; i < 3; i++) {
    visitors.push({
      x: canvas.width + i * 200,
      y: groundY,
      width: 30,
      height: 40,
      speed: 2 + Math.random() * 1.2,
    });
  }

  // guards
  for (let i = 0; i < 2; i++) {
    guards.push({
      x: canvas.width + i * 350,
      y: groundY,
      width: 30,
      height: 45,
      speed: 2.3 + Math.random() * 1.5,
    });
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  bananas = [];
  initActors();

  remainingTime = TOTAL_TIME;
  lastTimestamp = null;

  gameRunning = true;
  gameStarted = true;
}

// Start in "press space to start" mode
resetGame();
gameRunning = false;

// ------------ INPUT ------------
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keys.left = true;
  }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keys.right = true;
  }

  if (e.code === "Space") {
    e.preventDefault();

    // First time starting
    if (!gameStarted) {
      resetGame();
      return;
    }

    // After game over (by time OR by lives)
    if (!gameRunning && (lives <= 0 || remainingTime <= 0)) {
      resetGame();
      return;
    }

    keys.space = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keys.left = false;
  }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keys.right = false;
  }
  if (e.code === "Space") {
    keys.space = false;
  }
});

document.getElementById("restartBtn").addEventListener("click", () => {
  resetGame();
});

// ------------ CORE GAMEPLAY ------------
function throwBanana() {
  const now = Date.now();
  if (!gameRunning) return;
  if (now - lastThrowTime < throwCooldown) return;
  lastThrowTime = now;

  // 🔁 FIX: no more losing life just for throwing near a guard.
  // Now we ONLY lose life if the banana actually hits a guard.

  bananas.push({
    x: monkey.x + monkey.width / 2,
    y: monkey.y,
    vx: 7 * (Math.random() * 0.4 + 0.8),
    vy: -8 - Math.random() * 3,
    radius: 8,
  });
}

function updateGameLogic() {
  if (!gameRunning) return;

  // Move monkey
  if (keys.left) {
    monkey.x -= monkey.speed;
  }
  if (keys.right) {
    monkey.x += monkey.speed;
  }
  monkey.x = Math.max(40, Math.min(canvas.width - 40, monkey.x));

  // Throw
  if (keys.space) {
    throwBanana();
  }

  // Bananas
  bananas.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy += gravity;
  });

  bananas = bananas.filter(
    (b) => b.x > 0 && b.x < canvas.width && b.y < canvas.height
  );

  // Visitors
  visitors.forEach((v) => {
    v.x -= v.speed;
    if (v.x + v.width < -20) {
      v.x = canvas.width + randInt(100, 300);
      v.speed = 2 + Math.random() * 1.5;
    }
  });

  // Guards
  guards.forEach((g) => {
    g.x -= g.speed;
    if (g.x + g.width < -20) {
      g.x = canvas.width + randInt(250, 450);
      g.speed = 2.3 + Math.random() * 1.5;
    }
  });

  handleCollisions();
}

function rectCircleColliding(circle, rect) {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);

  if (distX > rect.width / 2 + circle.radius) return false;
  if (distY > rect.height / 2 + circle.radius) return false;

  if (distX <= rect.width / 2) return true;
  if (distY <= rect.height / 2) return true;

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function handleCollisions() {
  if (!gameRunning) return;

  // Bananas vs visitors
  bananas.forEach((b) => {
    visitors.forEach((v) => {
      if (rectCircleColliding(b, v)) {
        score += 10;
        v.x = canvas.width + randInt(100, 300);
        v.speed = 2 + Math.random() * 1.5;
        b.toRemove = true;
      }
    });
  });

  // Bananas vs guards
  bananas.forEach((b) => {
    if (b.toRemove) return; // don't process already-hit bananas again
    guards.forEach((g) => {
      if (rectCircleColliding(b, g)) {
        loseLife();
        b.toRemove = true;
        g.x = canvas.width + randInt(200, 400);
      }
    });
  });

  bananas = bananas.filter((b) => !b.toRemove);
}

function updateHighScoreIfNeeded() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function loseLife() {
  if (!gameRunning) return;
  if (lives <= 0) return;

  lives -= 1;

  if (lives <= 0) {
    lives = 0;
    gameRunning = false;
    updateHighScoreIfNeeded();
  }
}

// ------------ TIMER ------------
function updateTimer(dt) {
  if (!gameRunning) return;

  remainingTime -= dt;
  if (remainingTime <= 0) {
    remainingTime = 0;
    gameRunning = false;
    updateHighScoreIfNeeded();
  }
}

// ------------ DRAWING ------------
function drawBackground() {
  // Wall
  ctx.fillStyle = "#c97b4a";
  ctx.fillRect(0, monkey.y + monkey.height, canvas.width, 40);

  // Path
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, groundY + 30, canvas.width, 80);

  // Tree
  ctx.fillStyle = "#4caf50";
  ctx.beginPath();
  ctx.arc(80, 120, 50, 0, Math.PI * 2);
  ctx.fill();
}

function drawMonkey() {
  ctx.fillStyle = "#795548";
  ctx.fillRect(monkey.x, monkey.y, monkey.width, monkey.height);

  ctx.fillStyle = "#ffcc80";
  ctx.fillRect(monkey.x + 8, monkey.y + 8, 24, 20);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(monkey.x + 16, monkey.y + 16, 2, 0, Math.PI * 2);
  ctx.arc(monkey.x + 24, monkey.y + 16, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBananas() {
  ctx.fillStyle = "#ffeb3b";
  bananas.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawVisitors() {
  visitors.forEach((v) => {
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(v.x, v.y - v.height, v.width, v.height);
    ctx.fillStyle = "#ffecb3";
    ctx.fillRect(v.x, v.y - v.height - 12, v.width, 12);
  });
}

function drawGuards() {
  guards.forEach((g) => {
    ctx.fillStyle = "#e53935";
    ctx.fillRect(g.x, g.y - g.height, g.width, g.height);
    ctx.fillStyle = "#212121";
    ctx.fillRect(g.x, g.y - g.height - 12, g.width, 12);
  });
}

function drawHUD() {
  ctx.fillStyle = "#000";
  ctx.font = "18px system-ui";

  // Left side
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Lives: ${lives}`, 20, 55);

  // Right side (high score)
  ctx.textAlign = "right";
  ctx.fillText(`High Score: ${highScore}`, canvas.width - 20, 30);

  // Center top: timer
  const timeDisplay = Math.max(0, Math.ceil(remainingTime));
  ctx.textAlign = "center";
  ctx.fillText(`Time: ${timeDisplay}s`, canvas.width / 2, 30);

  // Overlays
  if (!gameStarted) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.font = "32px system-ui";
    ctx.fillText("Monkey Mayhem 🐒", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "18px system-ui";
    ctx.fillText("Press Space to start", canvas.width / 2, canvas.height / 2 + 15);
    ctx.textAlign = "left";
    return;
  }

  if (!gameRunning && (lives <= 0 || remainingTime <= 0)) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.font = "32px system-ui";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "20px system-ui";
    ctx.fillText(
      `Your score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 + 15
    );
    ctx.fillText(
      "Press Space or click Restart",
      canvas.width / 2,
      canvas.height / 2 + 45
    );

    ctx.textAlign = "left";
  } else {
    ctx.textAlign = "left";
  }
}

// ------------ MAIN LOOP ------------
function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (gameRunning) {
    updateGameLogic();
    updateTimer(dt);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawMonkey();
  drawBananas();
  drawVisitors();
  drawGuards();
  drawHUD();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
