/** Consumables usable in battle. */
export type ItemTarget = 'ally' | 'down' | 'party';

export type ItemEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'mp'; amount: number }
  | { kind: 'revive'; pct: number }
  | { kind: 'healAll'; amount: number }
  | { kind: 'atkUp'; mult: number };

export interface ConsumableDef {
  name: string;
  price: number;
  target: ItemTarget;
  effect: ItemEffect;
  /** First town (index) whose shop sells it. */
  minTown: number;
  description: string;
}

export const CONSUMABLES = {
  drink: { name: 'Sports Drink', price: 15, target: 'ally', effect: { kind: 'heal', amount: 40 }, minTown: 0, description: 'Restores 40 HP.' },
  seeds: { name: 'Sunflower Seeds', price: 25, target: 'ally', effect: { kind: 'mp', amount: 15 }, minTown: 0, description: 'Restores 15 MP.' },
  pineTar: { name: 'Pine Tar', price: 40, target: 'ally', effect: { kind: 'atkUp', mult: 1.5 }, minTown: 1, description: 'ATK x1.5 for this battle.' },
  salts: { name: 'Smelling Salts', price: 60, target: 'down', effect: { kind: 'revive', pct: 0.25 }, minTown: 1, description: 'Revives with 25% HP.' },
  cooler: { name: 'Water Cooler', price: 90, target: 'party', effect: { kind: 'healAll', amount: 30 }, minTown: 2, description: 'Restores 30 HP to all.' },
} satisfies Record<string, ConsumableDef>;

export type ConsumableId = keyof typeof CONSUMABLES;
export const CONSUMABLE_IDS = Object.keys(CONSUMABLES) as ConsumableId[];
