// DHØL Arcade — Universal Game Player
import { loadGame } from "./games.js";

const params = new URLSearchParams(window.location.search);
// Accept both ?game=id (canonical) and a bare #id (older/shared links).
const requestedId = params.get("game") || window.location.hash.replace("#", "") || null;

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function getHighScore(id) {
  try {
    return Number(localStorage.getItem(`dhol_${id}`)) || 0;
  } catch {
    return 0;
  }
}

async function boot() {
  const game = await loadGame(requestedId);

  if (!game) {
    setText("#title", "NO GAME");
    setText("#desc", requestedId
      ? `Game "${requestedId}" was not found.`
      : "Choose a game from the Arcade.");
    return;
  }

  setText("#title", game.title);
  setText("#desc", game.description || "");
  setText("#high", getHighScore(game.id));

  const runtime = {
    game,
    canvas: document.querySelector("canvas"),
    ctx: document.querySelector("canvas")?.getContext("2d"),
    score: 0
  };

  if (typeof game.module.init === "function") {
    await game.module.init(runtime);
  }

  const keyHandler = event => {
    game.module.input?.(event, runtime);
  };
  const pointerHandler = event => {
    game.module.input?.(event, runtime);
  };

  window.addEventListener("keydown", keyHandler);
  window.addEventListener("pointerdown", pointerHandler);

  let last = performance.now();
  let frameId;

  const loop = now => {
    const delta = (now - last) / 1000;
    last = now;

    game.module.update?.(runtime, delta);
    game.module.draw?.(runtime);

    frameId = requestAnimationFrame(loop);
  };

  frameId = requestAnimationFrame(loop);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("keydown", keyHandler);
    window.removeEventListener("pointerdown", pointerHandler);
    game.module.destroy?.(runtime);
  }, { once: true });
}

boot().catch(error => {
  console.error(error);
  setText("#title", "LOAD ERROR");
  setText("#desc", "The game could not be loaded.");
});
