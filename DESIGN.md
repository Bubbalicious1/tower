# Design Doc — Cosmic Baseball (working title)

A modernized, Final Fantasy 1–inspired turn-based RPG with procedurally generated
dungeons, playable in the browser and on phones. Hobby project for now.

## Story

**The pitch:** Centuries ago, the ancient civilization of Cooperstown created the
Cosmic Baseball, an artifact capable of bending probability itself to guarantee
victory. To prevent misuse, it was split into four bases and sealed away. Now, an
evil corporate team owner is hunting down the bases to build an unstoppable team
that will conquer all rivals.

**The party:** A band of outcast semi-pros from a small town who uncover one of the
bases hidden inside their local field's equipment closet — left by their former
manager, the Riddler.

**The quest:** Race across the state, building up party members, and rebuild the
ancient artifact in an effort to take down the evil corporate All-Stars.

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

## Classes

FF1's six archetypes, re-themed as ball players (names are placeholders):

| Class | FF1 archetype | Role | Starting skill |
|-------|---------------|------|----------------|
| Slugger | Warrior | Heavy hitter, tank | Power Swing |
| Base Stealer | Thief | Fastest, acts first | Pickoff |
| Catcher | Monk | Toughest defense | Mitt Smash |
| Trainer | White Mage | Healer | Ice Pack |
| Pitcher | Black Mage | Offensive "magic" (pitches) | Fastball |
| Utility | Red Mage | Jack of all trades | Changeup, Ice Pack |

## Ranks (class upgrades)

An **Old-Timer** in every town promotes the team, available at any time, once the
party has won enough games (battles). His advice is always "keep practicing."

| Rank | Wins needed | Stat bonus | Unlocks |
|------|-------------|------------|---------|
| Recreation | — | — | Starting skills |
| Amateur | 10 | +10% | 1 new skill per class |
| Semi-Pro | 25 | +20% | 1 new skill per class |
| Professional | 50 | +35% | 1 new skill per class |

The whole team is promoted together. Win counts and bonuses are first-pass numbers.

## Combat

- Party of 4, chosen from classes at the start (FF1 style).
- Each round: turn order sorted by Speed (with small random variance), shown on screen.
- Commands: Attack, Magic/Skill, Item, Defend, Flee.
- Front-view enemies, party shown as a row of sprites/portraits.

## World structure

Four towns (working names), each with a dungeon hiding one base of the Cosmic Baseball:

| # | Town | Dungeon | Boss |
|---|------|---------|------|
| 1 | Hometown | Equipment Closet | Tarp Monster |
| 2 | Riverbend | Flooded Park | Groundskeeper |
| 3 | Ironworks | Foundry Field | Iron Mascot |
| 4 | Capital City | Corporate Tower | Corp Enforcer |

- A town is **locked** until the base from the previous town's dungeon is recovered.
- The **world map** fast-travels to any unlocked town at any time.
- Towns are menu-driven hubs: dungeon entrance, Inn, Shop, Old-Timer, World Map.
- After all four bases: the corporate All-Stars finale (not built yet).

## Dungeons

- 3 procedurally generated floors per town (rooms + corridors), seeded so a floor
  can be regenerated. Difficulty continues from the previous town's dungeon.
- The boss waits on the last floor, guarding the base. Boss fights can't be fled.
- Cleared dungeons can be re-entered for grinding.
- The field menu (Menu button) can leave the dungeon at any time.
- Treasure chests, visible enemy groups that patrol/chase.

## Encounters

- **Visible enemies:** touching one starts a battle; approaching from behind
  gives the party a first-strike bonus, getting caught from behind gives enemies one.
- **Limited random encounters:** a hidden step meter that only fills in certain
  zones (e.g. dark corridors), with a hard cap per floor, so they add tension
  without becoming a grind.

## Progression

- **Progress persists.** Levels, gold and dungeon depth carry across sessions.
- Losing a battle sends the team back to the start of the current floor with full
  HP, at the cost of half their gold. No run resets.
- Party members knocked out in a won battle get back up with 1 HP.

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

## Built so far

- Title screen with story intro, New Game / Continue.
- Four towns with Inn, Shop, Old-Timer; world map with locks and fast travel.
- Rank promotions by win count, with new skills per rank.
- 3-floor procedurally generated dungeons per town (rooms, corridors, stairs,
  chests) with a boss guarding each base.
- Visible enemies that wander and chase; first-strike / ambush from behind.
- Capped random encounters in dark corridors (2 per floor).
- Full turn-based battle loop: Attack / Skill / Item / Defend / Flee,
  speed-based order bar, auto-retarget, XP/levels, gold, 1×/2×/4× speed.
- Touch D-pad + A/B, keyboard and gamepad input.
- Auto-save to localStorage.
- Placeholder art generated in code (no image files yet).

Not yet: party creation screen, walkable towns, equipment, the All-Stars finale,
sound, real art, balance tuning, PWA offline caching, Capacitor builds.

## Open questions

- Real class, town and party member names (working names for now).
- What the All-Stars finale looks like.
- Equipment: shop gear, dungeon loot, or both?
- Final title.
