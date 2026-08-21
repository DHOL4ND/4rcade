/*
 * DHØL Arcade — ORBIT//CORE
 * One-file game module.
 * Upload this file directly to /games/.
 */

export const gameInfo = {
  id: "orbit-core",
  title: "ORBIT//CORE",
  name: "Orbit//Core",
  description: "Survive the orbit. Protect the core.",
  category: "arcade",
  art: "ORBIT//CORE",
  thumbnail: "",
  version: "1.0.0"
};

export function init() {
  const mount = document.getElementById("mount");
  if (!mount) return;

  mount.innerHTML = `
    <div class="screen">
      <div class="play-ui">
        <div class="hud">
          <span>SCORE <b id="oc-score">0</b></span>
          <span>TIME <b id="oc-time">0.0</b></span>
          <span>CORE <b id="oc-hp">100%</b></span>
        </div>
        <div class="neon-wrap">
          <canvas id="orbit-core-canvas" class="game-canvas" width="720" height="480"></canvas>
          <div class="center-message" id="oc-message">
            <div class="pixel-title">ORBIT<br>//CORE</div>
            <div class="message-sub">SURVIVE THE ORBIT</div>
            <button class="action-btn" id="oc-start">INSERT COIN / START</button>
          </div>
        </div>
        <div class="game-touch">
          <button id="oc-left">←</button>
          <button id="oc-dash">DASH</button>
          <button id="oc-right">→</button>
        </div>
        <div class="game-actions">
          <button class="action-btn small" id="oc-pause">PAUSE</button>
          <button class="action-btn small ghost" id="oc-restart">RESTART</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("orbit-core-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("oc-score");
  const timeEl = document.getElementById("oc-time");
  const hpEl = document.getElementById("oc-hp");
  const message = document.getElementById("oc-message");

  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const keys = {};
  let raf = 0, last = 0, state = "menu";
  let score = 0, survived = 0, coreHp = 100;
  let angle = 0, orbitRadius = 135, dash = 0;
  let hazards = [], particles = [], stars = [];

  function reset() {
    cancelAnimationFrame(raf);
    score = 0;
    survived = 0;
    coreHp = 100;
    angle = 0;
    orbitRadius = 135;
    dash = 0;

    hazards = [];
    particles = [];
    stars = Array.from({length: 100}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: .5 + Math.random() * 1.8,
      a: .2 + Math.random() * .6
    }));

    state = "playing";
    message.classList.add("hidden");
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function spawnHazard() {
    const a = Math.random() * Math.PI * 2;
    const radius = 225 + Math.random() * 55;

    hazards.push({
      a,
      radius,
      speed: 35 + Math.min(130, survived * 2.2) + Math.random() * 35,
      size: 7 + Math.random() * 7,
      damage: 7 + Math.random() * 6,
      spin: (Math.random() - .5) * 3
    });
  }

  function burst(x, y, color, amount = 12) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 170;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: .3 + Math.random() * .5,
        color
      });
    }
  }

  function playerPosition() {
    return {
      x: cx + Math.cos(angle) * orbitRadius,
      y: cy + Math.sin(angle) * orbitRadius
    };
  }

  function start() {
    if (state === "menu" || state === "lost") reset();
  }

  document.getElementById("oc-start").onclick = start;
  document.getElementById("oc-restart").onclick = reset;

  document.getElementById("oc-pause").onclick = () => {
    if (state === "playing") {
      state = "paused";
      message.classList.remove("hidden");
      message.innerHTML =
        `<div class="pixel-title small-title">PAUSED</div>
         <div class="message-sub">PRESS P TO CONTINUE</div>`;
    } else if (state === "paused") {
      state = "playing";
      message.classList.add("hidden");
      last = performance.now();
    }
  };

  document.getElementById("oc-left").onpointerdown = () => keys.left = true;
  document.getElementById("oc-left").onpointerup = () => keys.left = false;
  document.getElementById("oc-right").onpointerdown = () => keys.right = true;
  document.getElementById("oc-right").onpointerup = () => keys.right = false;
  document.getElementById("oc-dash").onclick = () => dash = .65;

  const keyDown = e => {
    const k = e.key.toLowerCase();
    keys[k] = true;

    if (["arrowleft", "arrowright", "a", "d", " ", "p", "enter"].includes(k)) {
      e.preventDefault();
    }

    if (k === "p") {
      document.getElementById("oc-pause").click();
    }

    if (k === " " || k === "enter") {
      if (state === "menu" || state === "lost") start();
      else if (state === "playing") dash = .65;
    }
  };

  const keyUp = e => {
    keys[e.key.toLowerCase()] = false;
  };

  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);

  function update(dt) {
    if (state !== "playing") return;

    survived += dt;
    score += Math.floor(dt * 12);

    const rotationSpeed = 2.15;

    if (keys.arrowleft || keys.a || keys.left) angle -= rotationSpeed * dt;
    if (keys.arrowright || keys.d || keys.right) angle += rotationSpeed * dt;

    if (dash > 0) {
      dash -= dt;
      orbitRadius = 180;
    } else {
      orbitRadius = 135;
    }

    if (Math.random() < Math.min(.045, dt * (.55 + survived / 80))) {
      spawnHazard();
    }

    const p = playerPosition();

    hazards.forEach(h => {
      h.radius -= h.speed * dt;
      h.a += h.spin * dt;

      const hx = cx + Math.cos(h.a) * h.radius;
      const hy = cy + Math.sin(h.a) * h.radius;
      const distance = Math.hypot(hx - p.x, hy - p.y);

      if (distance < h.size + 12) {
        h.radius = -100;
        if (dash <= 0) {
          coreHp -= h.damage;
          burst(p.x, p.y, "#ff218c", 18);
        } else {
          score += 100;
          burst(hx, hy, "#08d9ff", 14);
        }
      }

      // Hazards reaching the core damage it.
      if (h.radius < 28) {
        h.radius = -100;
        coreHp -= h.damage * .7;
        burst(cx, cy, "#ffd11a", 12);
      }
    });

    hazards = hazards.filter(h => h.radius > -80);

    if (coreHp <= 0) {
      coreHp = 0;
      state = "lost";
      message.classList.remove("hidden");
      message.innerHTML = `
        <div class="pixel-title">CORE LOST</div>
        <div class="final-score">${String(score).padStart(6, "0")}</div>
        <div class="message-sub">SURVIVED ${survived.toFixed(1)} SEC</div>
        <button class="action-btn" id="oc-again">TRY AGAIN</button>
      `;
      document.getElementById("oc-again").onclick = reset;
    }

    particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    });

    particles = particles.filter(particle => particle.life > 0);

    scoreEl.textContent = score;
    timeEl.textContent = survived.toFixed(1);
    hpEl.textContent = `${Math.round(coreHp)}%`;
  }

  function draw() {
    ctx.fillStyle = "#05081c";
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    // Orbit rings.
    ctx.save();
    ctx.strokeStyle = "#151a40";
    ctx.lineWidth = 1;

    [70, 135, 180, 225].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.shadowBlur = 25;
    ctx.shadowColor = "#8d35ff";
    ctx.strokeStyle = "#8d35ff";
    ctx.globalAlpha = .65;
    ctx.beginPath();
    ctx.arc(cx, cy, 135, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;

    // Core.
    ctx.save();
    ctx.shadowBlur = 35;
    ctx.shadowColor = "#08d9ff";
    ctx.fillStyle = "#08d9ff";
    ctx.beginPath();
    ctx.arc(cx, cy, 27 + Math.sin(survived * 4) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#05081c";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.restore();

    // Hazards.
    hazards.forEach(h => {
      const x = cx + Math.cos(h.a) * h.radius;
      const y = cy + Math.sin(h.a) * h.radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(h.a * 2);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ff218c";
      ctx.fillStyle = "#ff218c";
      ctx.beginPath();
      ctx.moveTo(0, -h.size);
      ctx.lineTo(h.size, 0);
      ctx.lineTo(0, h.size);
      ctx.lineTo(-h.size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Player.
    const p = playerPosition();
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = dash > 0 ? "#ffd11a" : "#08d9ff";
    ctx.fillStyle = dash > 0 ? "#ffd11a" : "#08d9ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    particles.forEach(particle => {
      ctx.globalAlpha = Math.max(0, particle.life / .8);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 3, 3);
    });
    ctx.globalAlpha = 1;

    // Core health bar.
    const bw = 220, bh = 7, bx = W / 2 - bw / 2, by = H - 25;
    ctx.fillStyle = "#151a40";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = coreHp > 50 ? "#08d9ff" : coreHp > 25 ? "#ffd11a" : "#ff218c";
    ctx.fillRect(bx, by, bw * (coreHp / 100), bh);
  }

  function loop(now) {
    const dt = Math.min(.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  // Initial preview behind the start screen.
  particles = [];
  stars = Array.from({length: 100}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: .5 + Math.random() * 1.8,
    a: .2 + Math.random() * .6
  }));
  paddle = {};
  ball = {};
  draw();

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
