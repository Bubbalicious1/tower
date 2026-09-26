/** Working names. Each town's dungeon hides one base of the Cosmic Baseball. */
export interface TownDef {
  name: string;
  dungeon: string;
  /** Enemy id of the boss guarding this town's base. */
  boss: string;
  innCost: number;
  /** Position on the world map, as fractions of the map area. */
  mapX: number;
  mapY: number;
}

export const TOWNS: TownDef[] = [
  { name: 'Hometown', dungeon: 'Equipment Closet', boss: 'tarp', innCost: 10, mapX: 0.1, mapY: 0.75 },
  { name: 'Riverbend', dungeon: 'Flooded Park', boss: 'keeper', innCost: 20, mapX: 0.38, mapY: 0.3 },
  { name: 'Ironworks', dungeon: 'Foundry Field', boss: 'ironMascot', innCost: 35, mapX: 0.62, mapY: 0.7 },
  { name: 'Capital City', dungeon: 'Corporate Tower', boss: 'enforcer', innCost: 50, mapX: 0.84, mapY: 0.25 },
];

export const FLOORS_PER_DUNGEON = 3;
export const DRINK_PRICE = 15;

/**
 * Team ranks, granted by the Old-Timer once the party has won enough games.
 * `bonus` is the percentage added to every stat.
 */
export const RANKS = [
  { name: 'Recreation', wins: 0, bonus: 0 },
  { name: 'Amateur', wins: 10, bonus: 0.1 },
  { name: 'Semi-Pro', wins: 25, bonus: 0.2 },
  { name: 'Professional', wins: 50, bonus: 0.35 },
] as const;
