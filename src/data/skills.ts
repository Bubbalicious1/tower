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
  // Unlocked by rank promotions.
  lineDrive: { name: 'Line Drive', mp: 4, kind: 'phys', power: 1.9, description: 'A hard, flat hit.' },
  grandSlam: { name: 'Grand Slam', mp: 7, kind: 'phys', power: 2.4, description: 'Clear the bases.' },
  walkOff: { name: 'Walk-Off', mp: 10, kind: 'phys', power: 3.0, description: 'Ends the game.' },
  doubleSteal: { name: 'Double Steal', mp: 3, kind: 'phys', power: 1.7, description: 'In and out twice as fast.' },
  squeezePlay: { name: 'Squeeze Play', mp: 5, kind: 'phys', power: 2.1, description: 'A risky, precise strike.' },
  stealHome: { name: 'Steal Home', mp: 8, kind: 'phys', power: 2.7, description: 'The boldest play there is.' },
  tagOut: { name: 'Tag Out', mp: 3, kind: 'phys', power: 1.8, description: 'You\'re out!' },
  blockPlate: { name: 'Block Plate', mp: 5, kind: 'phys', power: 2.2, description: 'Stand your ground and hit back.' },
  ironMitt: { name: 'Iron Mitt', mp: 8, kind: 'phys', power: 2.8, description: 'A glove like a wrecking ball.' },
  stretch: { name: 'Stretch', mp: 6, kind: 'heal', power: 1.6, description: 'Restore more HP to one ally.' },
  rubDirt: { name: 'Rub Dirt', mp: 9, kind: 'heal', power: 2.2, description: '"Walk it off." Big heal.' },
  miracleCure: { name: 'Miracle Cure', mp: 14, kind: 'heal', power: 3.2, description: 'A huge heal.' },
  curveball: { name: 'Curveball', mp: 6, kind: 'mag', power: 1.4, description: 'A pitch that bends.' },
  slider: { name: 'Slider', mp: 9, kind: 'mag', power: 1.9, description: 'A nasty breaking pitch.' },
  heater: { name: 'Heater', mp: 14, kind: 'mag', power: 2.6, description: 'Pure velocity.' },
  knuckleball: { name: 'Knuckleball', mp: 5, kind: 'mag', power: 1.1, description: 'Nobody knows where it goes.' },
} satisfies Record<string, SkillDef>;

export type SkillId = keyof typeof SKILLS;
