/*
 * DHØL Arcade — BREAK//VOID
 * One-file game module.
 * Upload this file to /games/ — do not edit games.js.
 */

export const gameInfo = {
  id: "break-void",
  title: "BREAK//VOID",
  name: "Break//Void",
  description: "Break the grid. Control the void.",
  category: "arcade",
  art: "BREAK//VOID",
  thumbnail: "",
  version: "1.0.0"
};

export function init(runtime = {}) {
  const mount = document.getElementById("mount");
  if (!mount) return;

  mount.innerHTML = `
    <div class="screen">
      <div class="play-ui breakvoid-ui">
        <div class="hud">
          <span>SCORE <b id="bv-score">0</b></span>
          <span>LEVEL <b id="bv-level">1</b></span>
          <span>COMBO <b id="bv-combo">x1</b></span>
        </div>
        <div class="neon-wrap">
          <canvas id="breakvoid-canvas" class="game-canvas" width="720" height="480"></canvas>
          <div class="center-message" id="bv-message">
            <div class="pixel-title">BREAK<br>//VOID</div>
            <div class="message-sub">BREAK THE GRID</div>
            <button class="action-btn" id="bv-start">INSERT COIN / START</button>
          </div>
        </div>
        <div class="game-touch">
          <button id="bv-left">←</button>
          <button id="bv-fire">LAUNCH</button>
          <button id="bv-right">→</button>
        </div>
        <div class="game-actions">
          <button class="action-btn small" id="bv-pause">PAUSE</button>
          <button class="action-btn small ghost" id="bv-restart">RESTART</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("breakvoid-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("bv-score");
  const levelEl = document.getElementById("bv-level");
  const comboEl = document.getElementById("bv-combo");
  const message = document.getElementById("bv-message");

  const W = canvas.width, H = canvas.height;
  const keys = {};
  let paddle, ball, blocks, particles, stars;
  let score = 0, level = 1, combo = 1, state = "menu";
  let raf = 0, last = 0, levelTimer = 0;

  const palettes = [
    ["#08d9ff", "#8d35ff", "#ff218c"],
    ["#ffd11a", "#08d9ff", "#ff218c"],
    ["#8d35ff", "#08d9ff", "#ffffff"]
  ];

  function makeLevel() {
    blocks = [];
    const rows = Math.min(4 + Math.floor((level - 1) / 3), 7);
    const cols = 10;
    const gap = 5;
    const bw = 60, bh = 20;
    const startX = (W - (cols * bw + (cols - 1) * gap)) / 2;
    const startY = 55;
    const colors = palettes[(level - 1) % palettes.length];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Different layouts per level.
        const skip =
          level % 4 === 0 ? (r === 1 && c > 1 && c < 8) :
          level % 4 === 1 ? ((r + c) % 5 === 0) :
          level % 4 === 2 ? (c === 4 || c === 5) :
          false;

        if (skip) continue;

        const specialRoll = (r * 7 + c * 11 + level) % 17;
        let type = "normal";
        let hp = 1;

        if (specialRoll === 0 && level >= 3) {
          type = "shield";
          hp = 2 + Math.floor(level / 8);
        } else if (specialRoll === 1 && level >= 5) {
          type = "energy";
        } else if (specialRoll === 2 && level >= 8) {
          type = "void";
        }

        blocks.push({
          x: startX + c * (bw + gap),
          y: startY + r * (bh + gap),
          w: bw,
          h: bh,
          hp,
          maxHp: hp,
          type,
          color: colors[(r + c) % colors.length],
          alive: true
        });
      }
    }
  }

  function resetBall() {
    paddle = { x: W / 2 - 55, y: H - 32, w: 110, h: 12, speed: 460 };
    ball = {
      x: W / 2, y: H - 55,
      r: 7,
      vx: (Math.random() > .5 ? 1 : -1) * 220,
      vy: -300
    };
  }

  function reset() {
    cancelAnimationFrame(raf);
    score = 0;
    level = 1;
    combo = 1;
    particles = [];
    stars = Array.from({length: 70}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: .5 + Math.random() * 1.5,
      v: 10 + Math.random() * 25
    }));
    resetBall();
    makeLevel();
    updateHud();
    state = "playing";
    message.classList.add("hidden");
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function nextLevel() {
    if (level >= 20) {
      state = "victory";
      message.classList.remove("hidden");
      message.innerHTML = `
        <div class="pixel-title">VOID<br>BREACHED</div>
        <div class="message-sub">20 LEVELS CLEARED</div>
        <div class="final-score">${String(score).padStart(6, "0")}</div>
        <button class="action-btn" id="bv-again">PLAY AGAIN</button>
      `;
      document.getElementById("bv-again").onclick = reset;
      return;
    }

    level++;
    score += 100 * level;
    combo = 1;
    makeLevel();
    resetBall();
    levelTimer = 1.5;
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    comboEl.textContent = `x${combo}`;
  }

  function burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 50 + Math.random() * 160;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: .35 + Math.random() * .35,
        color
      });
    }
  }

  function launch() {
    if (state === "menu") reset();
    else if (state === "lost") reset();
  }

  document.getElementById("bv-start").onclick = launch;
  document.getElementById("bv-restart").onclick = reset;

  document.getElementById("bv-pause").onclick = () => {
    if (state === "playing") {
      state = "paused";
      message.classList.remove("hidden");
      message.innerHTML = `<div class="pixel-title small-title">PAUSED</div><div class="message-sub">PRESS P TO CONTINUE</div>`;
    } else if (state === "paused") {
      state = "playing";
      message.classList.add("hidden");
      last = performance.now();
    }
  };

  function setKey(k, value) {
    keys[k] = value;
  }

  document.getElementById("bv-left").onpointerdown = () => setKey("left", true);
  document.getElementById("bv-left").onpointerup = () => setKey("left", false);
  document.getElementById("bv-right").onpointerdown = () => setKey("right", true);
  document.getElementById("bv-right").onpointerup = () => setKey("right", false);
  document.getElementById("bv-fire").onclick = () => {
    if (state === "menu") launch();
  };

  const keyDown = e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowleft", "arrowright", "a", "d", " ", "p", "enter"].includes(k)) {
      e.preventDefault();
    }
    if (k === "p") {
      document.getElementById("bv-pause").click();
    }
    if (k === "enter" && (state === "menu" || state === "lost" || state === "victory")) {
      reset();
    }
  };
  const keyUp = e => { keys[e.key.toLowerCase()] = false; };

  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);

  function update(dt) {
    if (state !== "playing") return;

    levelTimer = Math.max(0, levelTimer - dt);
    stars.forEach(s => {
      s.y += s.v * dt;
      if (s.y > H) s.y = -2;
    });

    if (keys.arrowleft || keys.a || keys.left) paddle.x -= paddle.speed * dt;
    if (keys.arrowright || keys.d || keys.right) paddle.x += paddle.speed * dt;
    paddle.x = Math.max(8, Math.min(W - paddle.w - 8, paddle.x));

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x < ball.r) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > W - ball.r) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < ball.r) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle collision.
    if (
      ball.vy > 0 &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.r > paddle.y &&
      ball.y < paddle.y + paddle.h + 8
    ) {
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * 420;
      ball.vy = -Math.abs(ball.vy);
      ball.y = paddle.y - ball.r;
    }

    // Ball lost.
    if (ball.y > H + 20) {
      combo = 1;
      state = "lost";
      message.classList.remove("hidden");
      message.innerHTML = `
        <div class="pixel-title">VOID GOT YOU</div>
        <div class="final-score">${String(score).padStart(6, "0")}</div>
        <button class="action-btn" id="bv-again">TRY AGAIN</button>
      `;
      document.getElementById("bv-again").onclick = reset;
      return;
    }

    // Block collision.
    for (const b of blocks) {
      if (!b.alive) continue;

      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        const prevX = ball.x - ball.vx * dt;
        const prevY = ball.y - ball.vy * dt;

        if (prevY + ball.r <= b.y || prevY - ball.r >= b.y + b.h) {
          ball.vy *= -1;
        } else {
          ball.vx *= -1;
        }

        if (b.type === "void") {
          ball.vx += (Math.random() - .5) * 180;
          ball.vy += (Math.random() - .5) * 80;
        }

        b.hp--;
        burst(ball.x, ball.y, b.color, b.hp <= 0 ? 16 : 6);

        if (b.hp <= 0) {
          b.alive = false;
          combo = Math.min(99, combo + 1);
          score += (b.type === "energy" ? 75 : b.type === "void" ? 100 : 25) * combo;

          if (b.type === "energy") {
            paddle.w = Math.min(180, paddle.w + 18);
          }

          if (b.type === "void") {
            ball.vx *= 1.08;
            ball.vy *= 1.08;
          }
        } else {
          combo = 1;
        }

        updateHud();
        break;
      }
    }

    if (blocks.every(b => !b.alive)) nextLevel();

    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    particles = particles.filter(p => p.life > 0);
    updateHud();
  }

  function draw() {
    ctx.fillStyle = "#05081c";
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      ctx.globalAlpha = .2 + s.s / 3;
      ctx.fillStyle = s.s > 1.3 ? "#08d9ff" : "#ffffff";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    // Grid.
    ctx.strokeStyle = "#151a40";
    for (let y = H - 100; y < H; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    blocks.forEach(b => {
      if (!b.alive) return;
      let color = b.color;
      if (b.type === "void") color = "#8d35ff";
      if (b.type === "energy") color = "#ffd11a";
      if (b.type === "shield" && b.hp < b.maxHp) color = "#ffffff";

      ctx.save();
      ctx.shadowBlur = 13;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#05081c";
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);

      ctx.fillStyle = color;
      if (b.type === "void") {
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === "energy") {
        ctx.fillRect(b.x + b.w / 2 - 2, b.y + 4, 4, b.h - 8);
      } else {
        ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 3);
      }
      ctx.restore();
    });

    // Paddle.
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#08d9ff";
    ctx.fillStyle = "#08d9ff";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(paddle.x + 8, paddle.y + 3, paddle.w - 16, 3);
    ctx.restore();

    // Ball.
    ctx.save();
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ff218c";
    ctx.fillStyle = "#ff218c";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / .7);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    if (levelTimer > 0 && state === "playing") {
      ctx.textAlign = "center";
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = "#ffd11a";
      ctx.fillText(`LEVEL ${level}`, W / 2, 38);
    }
  }

  function loop(now) {
    const dt = Math.min(.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  // Start on menu; this makes the card playable while preserving the Arcade shell.
  reset();
  state = "menu";
  message.classList.remove("hidden");
  message.innerHTML = `
    <div class="pixel-title">BREAK<br>//VOID</div>
    <div class="message-sub">BREAK THE GRID</div>
    <button class="action-btn" id="bv-start-2">INSERT COIN / START</button>
  `;
  document.getElementById("bv-start-2").onclick = reset;

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
  };
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}
