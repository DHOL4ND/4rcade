# Adding a DHØL Arcade Game

Create a new `.js` file in this folder using `_template.js`.

Example:

    games/
    ├── snake.js
    ├── neon.js
    └── my-new-game.js

After uploading `my-new-game.js` to the public GitHub repository, the Arcade library
will discover it automatically. You do not need to edit `games.js`, `game.js`,
`games.html`, or any other central file.

The module must export `gameInfo` plus the lifecycle functions used by the player.
