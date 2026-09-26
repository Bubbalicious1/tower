export type SkillKind = 'phys' | 'mag' | 'heal';

export interface SkillDef {
  name: string;
  mp: number;
  kind: SkillKind;
  /** Multiplier applied by the damage/heal formula. */
  power: number;
  description: string;
}

export const SKILLS = {
  powerSwing: { name: 'Power Swing', mp: 3, kind: 'phys', power: 1.6, description: 'A heavy cut at one foe.' },
  pickoff: { name: 'Pickoff', mp: 2, kind: 'phys', power: 1.3, description: 'A quick, sneaky throw.' },
  mittSmash: { name: 'Mitt Smash', mp: 2, kind: 'phys', power: 1.4, description: 'Hit them with the glove.' },
  icePack: { name: 'Ice Pack', mp: 4, kind: 'heal', power: 1, description: 'Restore HP to one ally.' },
  fastball: { name: 'Fastball', mp: 4, kind: 'mag', power: 1, description: 'A blazing pitch at one foe.' },
  changeup: { name: 'Changeup', mp: 3, kind: 'mag', power: 0.7, description: 'A deceptive pitch.' },
} satisfies Record<string, SkillDef>;

export type SkillId = keyof typeof SKILLS;
