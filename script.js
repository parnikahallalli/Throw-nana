

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


let gameRunning = false;
let gameStarted = false;

let score = 0;
let lives = 3;


const TOTAL_TIME = 120;
let remainingTime = TOTAL_TIME;
let lastTimestamp = null;


let highScore = 0;
const HIGH_SCORE_KEY = "monkeyMayhemHighScore";

const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
if (storedHighScore !== null && !isNaN(parseInt(storedHighScore))) {
  highScore = parseInt(storedHighScore, 10);
}


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


const keys = {
  left: false,
  right: false,
  space: false,
};

let lastThrowTime = 0;
const throwCooldown = 400; 


function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function initActors() {
  visitors = [];
  guards = [];

  
  for (let i = 0; i < 3; i++) {
    visitors.push({
      x: canvas.width + i * 200,
      y: groundY,
      width: 30,
      height: 40,
      speed: 2 + Math.random() * 1.2,
    });
  }

  
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


resetGame();
gameRunning = false;


window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keys.left = true;
  }
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keys.right = true;
  }

  if (e.code === "Space") {
    e.preventDefault();

    
    if (!gameStarted) {
      resetGame();
      return;
    }

   
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


function throwBanana() {
  const now = Date.now();
  if (!gameRunning) return;
  if (now - lastThrowTime < throwCooldown) return;
  lastThrowTime = now;

  

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

 
  if (keys.space) {
    throwBanana();
  }

  
  bananas.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy += gravity;
  });

  bananas = bananas.filter(
    (b) => b.x > 0 && b.x < canvas.width && b.y < canvas.height
  );

  
  visitors.forEach((v) => {
    v.x -= v.speed;
    if (v.x + v.width < -20) {
      v.x = canvas.width + randInt(100, 300);
      v.speed = 2 + Math.random() * 1.5;
    }
  });

  
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

  
  bananas.forEach((b) => {
    if (b.toRemove) return;
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


function updateTimer(dt) {
  if (!gameRunning) return;

  remainingTime -= dt;
  if (remainingTime <= 0) {
    remainingTime = 0;
    gameRunning = false;
    updateHighScoreIfNeeded();
  }
}


function drawBackground() {
 
  ctx.fillStyle = "#c97b4a";
  ctx.fillRect(0, monkey.y + monkey.height, canvas.width, 40);

  
  ctx.fillStyle = "#e0e0e0";
  ctx.fillRect(0, groundY + 30, canvas.width, 80);

  
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
  
  ctx.save();

  
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, 40);

  ctx.font = "16px system-ui";
  ctx.textBaseline = "top";

  
  ctx.textAlign = "left";

  ctx.fillStyle = "#00eaff";
  ctx.fillText(`Score: ${score}`, 10, 6);

  ctx.fillStyle = "#ffea00"; 
  ctx.fillText(`Lives: ${lives}`, 10, 22);

 
  const timeDisplay = Math.max(0, Math.ceil(remainingTime));
  ctx.textAlign = "center";
  ctx.fillStyle = timeDisplay <= 10 ? "#ff5252" : "#00eaff";
  ctx.fillText(`Time: ${timeDisplay}s`, canvas.width / 2, 14);

  
  ctx.textAlign = "right";
  ctx.fillStyle = "#76ff03"; 
  ctx.fillText(`High Score: ${highScore}`, canvas.width - 10, 14);

  ctx.restore();

  
  if (!gameStarted) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00eaff";
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Monkey Mayhem 🐒", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "18px system-ui";
    ctx.fillStyle = "#ffea00";
    ctx.fillText("Press Space to start", canvas.width / 2, canvas.height / 2 + 20);

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    return;
  }

 
  if (!gameRunning && (lives <= 0 || remainingTime <= 0)) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffea00";
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "20px system-ui";
    ctx.fillText(`Your score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(
      "Press Space or click Restart",
      canvas.width / 2,
      canvas.height / 2 + 40
    );

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
}


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
