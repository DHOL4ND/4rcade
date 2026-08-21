# CHANGELOG

## v1.2.0 — Three new games & a livelier dashboard
- **Added:** three new fully playable games — Star Runner (endless runner, arcade), Bubble Burst (bubble-shooter puzzle), and Croak Hop (Frogger-style road/river crossing, adventure). All three follow the same drop-a-file convention as existing games (see ADD-GAMES.md) and were simply added to the local discovery list.
- Added the new games to the homepage "Trending Now" cards and the Games library (auto-discovered, no manual wiring needed).
- Added a "Meet the Crew" section on the homepage introducing four small pixel mascot characters (Bit, Glow, Spark, Rex) with idle bounce/blink animations.
- Added an animated mascot buddy with a speech bubble next to the homepage arcade machine, calling out the new releases.
- Added new arcade-cabinet artwork styles (stars / bubbles / swamp) for the new game cards.
- All new animations respect `prefers-reduced-motion`.

## v1.1.0 — Reliability & polish upgrade
- **Fixed:** homepage "Trending Now" game cards linked to `game.html#id`, but the player only read `?game=id`, so every game link on the homepage silently failed to load a game. Cards now link correctly, and the player also accepts a `#id` fallback for old/shared links.
- **Fixed:** `games.js` fetched the game list from a remote GitHub API on every single page load and every game launch — adding network latency, an external point of failure, and breaking the site when offline or rate-limited. It now reads the local `/games` folder directly and caches the result, so the library and player load instantly and work fully offline.
- Added a proper favicon and SEO/Open Graph meta tags (title, description) to all pages — previously missing entirely.
- Added a "loading" state to the game library grid while games are read.
- Filter buttons on the Games page now stay in sync with browser back/forward navigation.

## v1.0.0 — Stable Release
- Redesigned Pixel Snake character art with a distinct pixel head, expressive eyes, tongue, cyan body segments, and animated food.
- Finalized DHØL ARCADE branding.
- Added six playable browser games.
- Added responsive desktop/mobile layouts.
- Added touch controls to mobile-friendly games.
- Added local high-score persistence.
- Added mobile navigation.
- Added safe game-hash fallback.
- Improved Color Swap board generation and dead-board handling.
- Fixed Color Swap end-screen wording.
- Added Escape-to-library behavior on game pages.
- Added release metadata and stable-version documentation.
- Added small mobile/touch interaction polish.
