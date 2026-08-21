// DHØL Arcade — Automatic Game Discovery
// v1.2.0 DHØL build: public GitHub discovery + local fallback.
// Adding a new game requires only one new .js file in /games/.

const OWNER = "DHOL4ND";
const REPO = "4rcade";
const BRANCH = "main";
const GAMES_PATH = "games";

const API_URL =
  `https://api.github.com/repos/${OWNER}/${REPO}/contents/${GAMES_PATH}?ref=${BRANCH}`;

const EXCLUDED = new Set(["_template.js"]);

const LOCAL_FALLBACK_FILES = [
  "bubble.js",
  "color.js",
  "croak.js",
  "forest.js",
  "neon.js",
  "runner.js",
  "sky.js",
  "snake.js",
  "turbo.js"
];

export async function discoverGames() {
  // Production / GitHub Pages: discover whatever files actually exist in
  // the repository. No token is required because the repo is public.
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error(`GitHub API ${response.status}`);

    const files = await response.json();

    const jsFiles = files.filter(file =>
      file.type === "file" &&
      file.name.endsWith(".js") &&
      !EXCLUDED.has(file.name)
    );

    const games = [];

    for (const file of jsFiles) {
      try {
        const module = await import(`./games/${encodeURIComponent(file.name)}`);
        if (module.gameInfo?.id && module.gameInfo?.title) {
          games.push({
            ...module.gameInfo,
            file: file.name,
            module
          });
        }
      } catch (error) {
        console.warn(`DHØL: skipped ${file.name}`, error);
      }
    }

    return games;
  } catch (error) {
    // Local development fallback. This is generated once from the files
    // already present in the package, so the Arcade still works in Live Server.
    console.warn("DHØL: GitHub discovery unavailable; using local fallback.", error);
    return discoverLocalGames();
  }
}

async function discoverLocalGames() {
  const games = [];

  for (const file of LOCAL_FALLBACK_FILES) {
    try {
      const module = await import(`./games/${encodeURIComponent(file)}`);
      if (module.gameInfo?.id && module.gameInfo?.title) {
        games.push({
          ...module.gameInfo,
          file,
          module
        });
      }
    } catch (error) {
      console.warn(`DHØL: local game unavailable: ${file}`, error);
    }
  }

  return games;
}

export async function loadGame(id) {
  const games = await discoverGames();
  return games.find(game => game.id === id) || null;
}

export async function renderLibrary(container, filter = "all") {
  const games = await discoverGames();

  const visible = games.filter(game =>
    filter === "all" || game.category === filter
  );

  container.innerHTML = visible.map(game => `
    <article class="play-card" data-game="${escapeHtml(game.id)}">
      <div class="play-art">
        <span class="mini-score">
          DHØL / ${escapeHtml((game.category || "arcade").toUpperCase())}
        </span>
        <div>
          <h2>${escapeHtml(game.art || game.title)}</h2>
          <div class="game-dots">•••</div>
        </div>
      </div>

      <div class="play-meta">
        <div>
          <h3>${escapeHtml(game.name || game.title)}</h3>
          <p>${escapeHtml((game.category || "arcade").toUpperCase())} · PLAYABLE</p>
        </div>

        <a class="launch"
           href="game.html?game=${encodeURIComponent(game.id)}">
          PLAY →
        </a>
      </div>
    </article>
  `).join("");

  if (!visible.length) {
    container.innerHTML = `<p class="empty-games">NO GAMES FOUND.</p>`;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (document.getElementById("library")) {
  const validFilters = new Set([
    "all", "arcade", "puzzle", "adventure", "racing"
  ]);

  const getFilter = () => {
    const value = location.hash.replace("#", "").toLowerCase();
    return validFilters.has(value) ? value : "all";
  };

  const render = () =>
    renderLibrary(
      document.getElementById("library"),
      getFilter()
    );

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter || "all";

      history.replaceState(
        null,
        "",
        location.pathname +
        location.search +
        (filter === "all" ? "" : "#" + filter)
      );

      document.querySelectorAll(".filter").forEach(item => {
        item.classList.toggle(
          "active",
          item.dataset.filter === filter
        );
      });

      render();
    });
  });

  render();
}
