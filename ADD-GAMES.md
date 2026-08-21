# DHØL Arcade — Add a Game

## The only file you need to add

1. Copy `games/_template.js`.
2. Rename it, for example:
   `games/my-game.js`
3. Change the `gameInfo` values.
4. Build your game in that file.
5. Upload that single `.js` file into the repository's `/games/` folder.

That's it.

### You do NOT need to edit

- `games.js`
- `game.js`
- `games.html`
- `game.html`
- `index.html`
- CSS files

### How discovery works

On GitHub Pages, `games.js` asks the public GitHub Contents API for the
current contents of `/games/`. Every `.js` file found there is loaded and
its `gameInfo` is used to create the game card.

When developing locally with VS Code Live Server, the Arcade falls back
to the game files already included in the project.

### GitHub requirements

- Repository: `DHOL4ND/4rcade`
- Repository: Public
- Branch: `main`
- GitHub Pages: enabled
- No API key/token is required.

### Important

Do not upload `_template.js` as a playable game. It is intentionally ignored
by the discovery system.
