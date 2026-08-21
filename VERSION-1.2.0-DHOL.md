# DHØL Arcade v1.2.0 — DHØL Build

Based on the uploaded v1.2.0 project.

Preserved:
- existing v1.2.0 visual design and homepage additions
- all 9 game modules
- existing navigation, filters, and universal player

Changed:
- games.js now discovers public /games/*.js through GitHub Contents API
- local Live Server development falls back to the bundled game files
- adding a game no longer requires editing a central game list
- _template.js and ADD-GAMES.md document the one-file workflow

Goal:
Create/upload one new game .js file in /games/ and have it appear automatically.
