// UI Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const continueButton = document.getElementById('continueButton');
const exitButton = document.getElementById('exitButton');
const durationSelect = document.getElementById('durationSelect');
const timerDiv = document.getElementById('timer');
const scoreDiv = document.getElementById('score');
const finalScoreDiv = document.getElementById('finalScore');
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game settings
let duration = 10 * 60; // in seconds
let timer = duration;
let timerInterval;
let hits = 0;
let running = false;
let lastFrame;

// Paddle and ball settings
const paddleW = 12, paddleH = 95, paddleMargin = 24;
const ballR = 14;
const player = { x: paddleMargin, y: canvas.height / 2 - paddleH / 2, vy: 0 };
const ai = { x: canvas.width - paddleMargin - paddleW, y: canvas.height / 2 - paddleH / 2, vy: 0, swing: 0, swingDir: 1 };
const ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 6, vy: 3, speed: 7 };

// Utility
function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Screen logic
function showScreen(screen) {
    startScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    endScreen.style.display = 'none';
    screen.style.display = 'flex';
}

// Start game
startButton.onclick = () => {
    duration = parseInt(durationSelect.value) * 60;
    startGame();
};

continueButton.onclick = () => {
    showScreen(startScreen);
};

exitButton.onclick = () => {
    showScreen(startScreen);
};

// Mouse control for player paddle
canvas.onmousemove = e => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    player.y = Math.max(0, Math.min(canvas.height - paddleH, mouseY - paddleH / 2));
};

// Game initialization
function startGame() {
    hits = 0;
    timer = duration;
    running = true;
    resetPositions();
    scoreDiv.textContent = `Hits: ${hits}`;
    timerDiv.textContent = `Time Left: ${formatTime(timer)}`;
    showScreen(gameScreen);
    lastFrame = performance.now();
    timerInterval = setInterval(() => {
        if (running) {
            timer--;
            timerDiv.textContent = `Time Left: ${formatTime(timer)}`;
            if (timer <= 0) endGame();
        }
    }, 1000);
    requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    running = false;
    clearInterval(timerInterval);
    finalScoreDiv.textContent = `Final Hits: ${hits}`;
    showScreen(endScreen);
}

// Reset paddle/ball
function resetPositions() {
    player.y = canvas.height / 2 - paddleH / 2;
    ai.y = canvas.height / 2 - paddleH / 2;
    ai.swing = 0;
    ai.swingDir = 1;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = Math.random() > 0.5 ? ball.speed : -ball.speed;
    ball.vy = (Math.random() - 0.5) * ball.speed;
}

// Main game loop
function gameLoop(now) {
    if (!running) return;
    let delta = (now - lastFrame) / 16.67; // ~60fps
    lastFrame = now;
    update(delta);
    draw();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(delta) {
    // Ball physics
    ball.x += ball.vx * delta * 0.8;
    ball.y += ball.vy * delta * 0.8;

    // Wall collision
    if (ball.y < ballR || ball.y > canvas.height - ballR) ball.vy *= -1;

    // Player collision
    if (ball.x - ballR < player.x + paddleW &&
        ball.y > player.y && ball.y < player.y + paddleH &&
        ball.vx < 0) {
        ball.x = player.x + paddleW + ballR;
        ball.vx *= -1.05;
        ball.vy += player.vy * 0.2;
        hits++;
        scoreDiv.textContent = `Hits: ${hits}`;
    }

    // AI collision (forehand/backhand drive)
    if (ball.x + ballR > ai.x &&
        ball.y > ai.y && ball.y < ai.y + paddleH &&
        ball.vx > 0) {
        ball.x = ai.x - ballR;
        ball.vx *= -1.05;
        // AI "swing" effect
        ball.vy += ai.swingDir * 2 + (ai.swing / 8);
    }

    // Out of bounds (reset ball)
    if (ball.x < 0 || ball.x > canvas.width) resetPositions();

    // AI motion: "anticipatory lateral moves" + swinging paddle
    let targetY = ball.y - paddleH / 2;
    // Add forehand dive/backhand drive pattern
    if (ball.vx > 0) {
        // Forehand: smooth, faster swing toward ball
        ai.swing += ai.swingDir * 2.2 * delta;
        if (Math.abs(ai.swing) > 18) ai.swingDir *= -1;
        ai.y += ((targetY + ai.swing) - ai.y) * 0.09 * delta;
    } else {
        // Backhand: slower, controlled, more lateral
        ai.swing += ai.swingDir * 1.2 * delta;
        if (Math.abs(ai.swing) > 10) ai.swingDir *= -1;
        ai.y += ((targetY + ai.swing) - ai.y) * 0.05 * delta;
    }
    ai.y = Math.max(0, Math.min(canvas.height - paddleH, ai.y));
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Table
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
    ctx.restore();

    // Player paddle
    ctx.save();
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#29b6f6";
    ctx.fillRect(player.x, player.y, paddleW, paddleH);
    ctx.restore();

    // AI paddle (with swing transform)
    ctx.save();
    ctx.translate(ai.x + paddleW / 2, ai.y + paddleH / 2);
    ctx.rotate(ai.swing * Math.PI / 180 / 3);
    ctx.fillStyle = "#fbc02d";
    ctx.shadowColor = "#fbc02d";
    ctx.shadowBlur = 16;
    ctx.fillRect(-paddleW / 2, -paddleH / 2, paddleW, paddleH);
    ctx.restore();

    // Ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballR, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.closePath();
    ctx.restore();

    // Net dots
    for (let i = 0; i < canvas.height / 48; ++i) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, i * 48 + 24, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff7";
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}