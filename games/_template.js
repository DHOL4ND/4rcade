/*
 * DHØL Arcade — New Game Template
 *
 * Copy this file, rename it, and change gameInfo.
 * Then upload ONLY the new .js file to /games/.
 *
 * You do NOT need to edit games.js or game.js.
 */

export const gameInfo = {
  id: "my-game",
  title: "MY GAME",
  name: "My Game",
  description: "Short description of the game.",
  category: "arcade",
  art: "MY GAME",
  thumbnail: "",
  version: "1.0.0"
};

export function init(runtime) {
  // Start/reset your game.
}

export function update(runtime, deltaTime) {
  // Update gameplay.
}

export function draw(runtime) {
  // Draw gameplay.
}

export function input(event, runtime) {
  // Handle keyboard / mouse / touch.
}

export function destroy(runtime) {
  // Clean up listeners, timers, animation frames, etc.
}
