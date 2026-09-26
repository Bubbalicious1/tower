# Design Doc — FF1-Style Mobile RPG (working title TBD)

A modernized, Final Fantasy 1–inspired turn-based RPG with procedurally generated
dungeons, playable in the browser and on phones. Hobby project for now.

## Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Platform | **Both** — installable web app (PWA) + App Store / Google Play via Capacitor |
| 2 | Orientation | **Landscape** |
| 3 | Faithfulness | **Modernized FF1** (keep the feel, drop the frustrations) |
| 4 | Combat | **Turn-based, speed-based turn order** |
| 5 | World | **Procedurally generated dungeons** |
| 6 | Encounters | **Visible enemies**, plus **limited** random encounters |
| 7 | Controls | **Virtual D-pad** on touch + **gamepad** + keyboard |
| 8 | Saving | **Auto-save** |
| 9 | Art | **SNES-style** pixel art |
| 10 | Business | **Hobby** (no monetization yet) |

## Tech stack

- **TypeScript + Phaser 3 + Vite** — one codebase, runs in any browser.
- **PWA** (manifest + service worker) for home-screen install and offline play.
- **Capacitor** to wrap the same build as native iOS/Android apps later.
- Desktop/Steam stays possible later via Electron or Tauri.

## Display

- Internal resolution **480×270** (16:9), pixel-art mode, integer scaling.
- Wider phones (19.5:9 etc.) extend the visible play area horizontally instead
  of letterboxing; UI anchors to screen edges and respects safe-area insets (notches).
- **16×16 tiles**, characters roughly 16×24 — SNES proportions.

## Controls

- **Touch:** virtual D-pad bottom-left, A/B buttons bottom-right, sized for thumbs.
  Menus are also directly tappable.
- **Gamepad:** Browser Gamepad API (Phaser's gamepad plugin) — Xbox, PlayStation,
  Switch Pro and most Bluetooth controllers work on desktop, Android and iOS.
  On-screen controls auto-hide when a controller is used.
- **Keyboard:** arrows/WASD, Z/Enter = confirm, X/Esc = cancel.
- All input maps to one abstract action layer (`up/down/left/right/confirm/cancel/menu`),
  so game code never checks a specific device.

## Modernizations over FF1

- Auto-retarget when the chosen enemy is already dead (no "Ineffective" whiffs).
- MP pool instead of per-level spell charges.
- Visible turn-order bar during combat.
- Auto-save + suspend anywhere; no save points required.
- Battle speed toggle (1× / 2× / 4×) and an optional auto-battle for trash fights.
- Clear stat/equipment comparisons in shops and menus.

## Combat

- Party of 4, chosen from classes at the start (FF1 style).
- Each round: turn order sorted by Speed (with small random variance), shown on screen.
- Commands: Attack, Magic/Skill, Item, Defend, Flee.
- Front-view enemies, party shown as a row of sprites/portraits.

## Dungeons

- Procedurally generated floors (rooms + corridors), seeded so a floor can be regenerated.
- Stairs down to the next floor; boss floor every N floors; town/hub between runs.
- Treasure chests, visible enemy groups that patrol/chase.

## Encounters

- **Visible enemies:** touching one starts a battle; approaching from behind
  gives the party a first-strike bonus, getting caught from behind gives enemies one.
- **Limited random encounters:** a hidden step meter that only fills in certain
  zones (e.g. dark corridors), with a hard cap per floor, so they add tension
  without becoming a grind.

## Saving

- Auto-save to local storage on floor change, after battle and when the app goes to
  the background. Cloud save is out of scope for now.

## MVP (first playable)

1. Title screen → party creation (4 classes).
2. A small town hub with a shop and an inn.
3. A procedurally generated dungeon, 3 floors + boss.
4. Visible enemies, turn-based combat, leveling, a few spells and items.
5. Touch D-pad, gamepad and keyboard input.
6. Auto-save.
7. Placeholder SNES-style art from a free asset pack.

## Open questions

- Class list (FF1's six: Warrior, Thief, Monk, Red/White/Black Mage — or our own?)
- Class upgrades mid-game?
- Permadeath / roguelike runs, or persistent progress through dungeon depths?
- Story/setting and working title.
