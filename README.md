# Cosmic Baseball (working title)

A modernized Final Fantasy 1–style turn-based RPG with procedurally generated
dungeons, built for the browser and phones. See [DESIGN.md](DESIGN.md) for the
full design.

Built with TypeScript, [Phaser 4](https://phaser.io) and [Vite](https://vite.dev).

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. To play on your phone, connect it to the same Wi-Fi and open
the "Network" URL Vite prints (e.g. `http://192.168.1.20:5173`). Turn the phone
sideways.

## Controls

| Action  | Keyboard            | Gamepad        | Touch            |
|---------|---------------------|----------------|------------------|
| Move    | Arrows / WASD       | D-pad / stick  | On-screen D-pad  |
| Confirm | Z / Enter / Space   | A (Cross)      | A button / tap   |
| Cancel  | X / Esc / Backspace | B (Circle)     | B button         |
| Speed   | C / Tab (in battle) | Start / Y      | Tap the `x1`     |

## Scripts

- `npm run dev` — dev server with hot reload
- `npm test` — unit tests (dungeon generation, combat, levelling)
- `npm run typecheck` — TypeScript check
- `npm run build` — production build into `dist/`

## Code map

- `src/scenes/` — Title, Dungeon (field), Battle, Touch overlay
- `src/dungeon/generate.ts` — seeded floor generator
- `src/game/` — combat math, party/levelling, save state
- `src/data/` — classes, skills, enemies
- `src/input/Controls.ts` — keyboard/gamepad/touch → abstract actions
- `src/art-data.ts` — placeholder pixel art as text maps
