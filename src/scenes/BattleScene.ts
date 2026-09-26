import Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import { ENEMIES, scaledStats, type EnemyDef } from '../data/enemies';
import { SKILLS, type SkillKind } from '../data/skills';
import {
  applyDamage,
  applyHeal,
  fleeChance,
  healAmount,
  isAlive,
  magDamage,
  physDamage,
  resolveTarget,
  turnOrder,
  type Fighter,
  type Hit,
} from '../game/combat';
import { gainXp, type Member } from '../game/party';
import { getState } from '../game/state';
import { controls } from '../input/Controls';
import { mulberry32, newSeed, pick, type Rng } from '../rng';
import { drawWindow, GRAY, GREEN, makeText, Menu, RED, WHITE, YELLOW, type MenuItem, type Widget } from '../ui/widgets';

export interface BattleStart {
  group: string[];
  depth: number;
  /** Who gets a free first round: set by how the field encounter began. */
  first: 'party' | 'enemy' | 'normal';
  /** Index of the field enemy that started this battle, or -1 for a random encounter. */
  fieldEnemy: number;
}

export interface BattleResult {
  outcome: 'victory' | 'defeat' | 'fled';
  fieldEnemy: number;
}

interface PartyFighter extends Fighter {
  side: 'party';
  member: Member;
}

interface EnemyFighter extends Fighter {
  side: 'enemy';
  enemy: EnemyDef;
  sprite: Phaser.GameObjects.Image;
}

type BF = PartyFighter | EnemyFighter;

type BattleAction =
  | { kind: 'attack'; actor: BF; target: BF }
  | { kind: 'skill'; actor: BF; name: string; skillKind: SkillKind; power: number; mp: number; target: BF }
  | { kind: 'item'; actor: BF; target: BF }
  | { kind: 'defend'; actor: BF }
  | { kind: 'flee'; actor: BF };

const DRINK_HEAL = 40;
const BOTTOM_Y = 186;
const CMD_W = 114;
const STATUS_X = 122;
const ENEMY_Y = 140;
const statusY = (i: number) => BOTTOM_Y + 8 + i * 16;

export class BattleScene extends Phaser.Scene {
  private setup!: BattleStart;
  private party: PartyFighter[] = [];
  private foes: EnemyFighter[] = [];
  private rng: Rng = Math.random;
  private speed = 1;
  private widget: Widget | null = null;
  private tapTarget: ((f: BF) => void) | null = null;
  private activeKey: string | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private frames!: Phaser.GameObjects.Graphics;
  private message!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private orderIcons: { key: string; icon: Phaser.GameObjects.Image }[] = [];
  private rows: { name: Phaser.GameObjects.Text; hp: Phaser.GameObjects.Text; mp: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Battle');
  }

  init(data: BattleStart): void {
    this.setup = data;
  }

  create(): void {
    controls.touchMode = 'menu';
    this.rng = mulberry32(newSeed());
    this.widget = null;
    this.tapTarget = null;
    this.activeKey = null;
    this.orderIcons = [];
    this.rows = [];

    this.bg = this.add.graphics().setDepth(-10);
    this.frames = this.add.graphics().setDepth(-5);

    const s = getState();
    this.party = s.party.map((m, i) => ({
      key: `p${i}`,
      name: m.name,
      side: 'party',
      hp: m.hp,
      maxHp: m.stats.maxHp,
      mp: m.mp,
      maxMp: m.stats.maxMp,
      atk: m.stats.atk,
      def: m.stats.def,
      mag: m.stats.mag,
      spd: m.stats.spd,
      defending: false,
      member: m,
    }));

    const counts = new Map<string, number>();
    this.setup.group.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    const seen = new Map<string, number>();
    this.foes = this.setup.group.map((id, i) => {
      const enemy = ENEMIES[id];
      const st = scaledStats(enemy, this.setup.depth);
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      const suffix = (counts.get(id) ?? 0) > 1 ? ` ${String.fromCharCode(65 + n)}` : '';
      const sprite = this.add.image(0, ENEMY_Y, `enemy-${id}`).setScale(3).setInteractive();
      const f: EnemyFighter = {
        key: `e${i}`,
        name: enemy.name + suffix,
        side: 'enemy',
        hp: st.maxHp,
        maxHp: st.maxHp,
        mp: 0,
        maxMp: 0,
        atk: st.atk,
        def: st.def,
        mag: st.mag,
        spd: st.spd,
        defending: false,
        enemy,
        sprite,
      };
      sprite.on('pointerdown', () => this.tapTarget?.(f));
      return f;
    });

    this.message = makeText(this, 12, 33, '').setLineSpacing(4);
    makeText(this, 12, 11, 'ORDER', GRAY);
    this.speedText = makeText(this, 0, 11, `x${this.speed}`, YELLOW).setOrigin(1, 0).setInteractive();
    this.speedText.on('pointerdown', () => this.toggleSpeed());

    this.party.forEach((p, i) => {
      const y = statusY(i);
      this.rows.push({
        name: makeText(this, STATUS_X + 12, y, p.name),
        hp: makeText(this, STATUS_X + 64, y, ''),
        mp: makeText(this, STATUS_X + 148, y, ''),
      });
      const zone = this.add.zone(STATUS_X, y - 4, 200, 16).setOrigin(0).setInteractive();
      zone.on('pointerdown', () => this.tapTarget?.(p));
    });

    this.layout();
    this.refreshStatus();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.cameras.main.fadeIn(250);
    this.run().catch((err) => console.error(err));
  }

  update(): void {
    if (controls.justPressed('menu')) this.toggleSpeed();
    this.widget?.update(controls);
  }

  // ---------------------------------------------------------------- flow

  private async run(): Promise<void> {
    const { first } = this.setup;
    if (first === 'party') await this.say('You caught them off guard!');
    else if (first === 'enemy') await this.say('Ambush! They strike first!');
    else {
      const n = this.foes.length;
      await this.say(n === 1 ? `${this.foes[0].name} steps up to the plate!` : `${n} foes step up to the plate!`);
    }

    for (let round = 1; ; round++) {
      this.party.forEach((p) => (p.defending = false));
      const actions: BattleAction[] = [];
      if (!(round === 1 && first === 'enemy')) actions.push(...(await this.collectCommands()));
      if (!(round === 1 && first === 'party')) {
        for (const f of this.foes) if (isAlive(f)) actions.push(this.enemyAction(f));
      }
      // Defending takes effect for the whole round, no matter when the defender acts.
      for (const a of actions) if (a.kind === 'defend') a.actor.defending = true;

      const byActor = new Map(actions.map((a) => [a.actor.key, a]));
      const order = turnOrder(
        actions.map((a) => a.actor),
        this.rng,
      );
      this.showOrder(order);
      for (const actor of order) {
        if (!isAlive(actor)) continue;
        this.highlight(actor.key);
        const outcome = await this.execute(byActor.get(actor.key)!);
        this.refreshStatus();
        if (outcome === 'fled') return this.finish('fled');
        if (this.foes.every((f) => !isAlive(f))) return this.victory();
        if (this.party.every((p) => !isAlive(p))) return this.defeat();
      }
      this.highlight(null);
    }
  }

  private async collectCommands(): Promise<BattleAction[]> {
    const actors = this.party.filter(isAlive);
    const chosen: BattleAction[] = [];
    let i = 0;
    while (i < actors.length) {
      this.highlight(actors[i].key);
      const action = await this.chooseAction(actors[i], chosen, i > 0);
      if (action === 'back') {
        chosen.pop();
        i--;
      } else if (action) {
        chosen.push(action);
        i++;
      }
    }
    this.highlight(null);
    return chosen;
  }

  /** One party member's command. Returns 'back' to redo the previous member, null to re-ask. */
  private async chooseAction(actor: PartyFighter, chosen: BattleAction[], canGoBack: boolean): Promise<BattleAction | 'back' | null> {
    this.setMessage(`${actor.name}'s turn`);
    const drinks = getState().items.drink - chosen.filter((a) => a.kind === 'item').length;
    const choice = await this.menu(
      8,
      BOTTOM_Y + 8,
      CMD_W - 8,
      [{ label: 'Attack' }, { label: 'Skill' }, { label: 'Item', right: String(drinks), enabled: drinks > 0 }, { label: 'Defend' }, { label: 'Flee' }],
      canGoBack,
    );
    switch (choice) {
      case -1:
        return 'back';
      case 0: {
        const target = await this.pickTarget('enemy');
        return target && { kind: 'attack', actor, target };
      }
      case 1: {
        const skills = CLASSES[actor.member.classId].skills.map((id) => SKILLS[id]);
        const si = await this.menu(
          8,
          BOTTOM_Y + 8,
          156,
          skills.map((sk) => ({ label: sk.name, right: `${sk.mp}MP`, enabled: actor.mp >= sk.mp })),
          true,
          { x: 4, y: BOTTOM_Y, w: 172, h: 78 },
        );
        if (si < 0) return null;
        const sk = skills[si];
        const target = await this.pickTarget(sk.kind === 'heal' ? 'ally' : 'enemy');
        return target && { kind: 'skill', actor, name: sk.name, skillKind: sk.kind, power: sk.power, mp: sk.mp, target };
      }
      case 2: {
        const target = await this.pickTarget('ally');
        return target && { kind: 'item', actor, target };
      }
      case 3:
        return { kind: 'defend', actor };
      default:
        return { kind: 'flee', actor };
    }
  }

  private enemyAction(f: EnemyFighter): BattleAction {
    const target = pick(this.rng, this.party.filter(isAlive));
    const sk = f.enemy.skill;
    if (sk && this.rng() < sk.chance) {
      return { kind: 'skill', actor: f, name: sk.name, skillKind: sk.kind, power: sk.power, mp: 0, target };
    }
    return { kind: 'attack', actor: f, target };
  }

  private async execute(a: BattleAction): Promise<'fled' | void> {
    const actor = a.actor;
    switch (a.kind) {
      case 'defend':
        await this.say(`${actor.name} digs in.`);
        return;
      case 'flee':
        if (this.rng() < fleeChance(this.party, this.foes)) {
          await this.say('The team slipped away!');
          return 'fled';
        }
        await this.say(`${actor.name} couldn't get away!`);
        return;
      case 'item': {
        const s = getState();
        const target = isAlive(a.target) ? a.target : this.lowestAlly();
        if (s.items.drink <= 0 || !target) {
          await this.say('Out of Sports Drinks!');
          return;
        }
        s.items.drink--;
        const healed = applyHeal(target, DRINK_HEAL);
        this.popAt(target, `+${healed}`, GREEN);
        await this.say(`${actor.name} tosses ${target.name} a Sports Drink. +${healed} HP`);
        return;
      }
      case 'attack': {
        const target = this.resolve(a.target);
        if (!target) return;
        const verb = actor.side === 'party' ? 'swings' : 'attacks';
        await this.strike(target, physDamage(actor, target, 1, this.rng), `${actor.name} ${verb}!`);
        return;
      }
      case 'skill': {
        if (actor.mp < a.mp) {
          await this.say(`${actor.name} is out of MP!`);
          return;
        }
        actor.mp -= a.mp;
        if (a.skillKind === 'heal') {
          const target = isAlive(a.target) ? a.target : this.lowestAlly();
          if (!target) return;
          const healed = applyHeal(target, healAmount(actor, a.power, this.rng));
          this.popAt(target, `+${healed}`, GREEN);
          await this.say(`${actor.name} uses ${a.name}! ${target.name} +${healed} HP`);
          return;
        }
        const target = this.resolve(a.target);
        if (!target) return;
        const hit =
          a.skillKind === 'phys' ? physDamage(actor, target, a.power, this.rng) : magDamage(actor, target, a.power, this.rng);
        await this.strike(target, hit, `${actor.name} uses ${a.name}!`);
      }
    }
  }

  private resolve(target: BF): BF | undefined {
    const pool: readonly BF[] = target.side === 'enemy' ? this.foes : this.party;
    return resolveTarget(target, pool);
  }

  private lowestAlly(): PartyFighter | undefined {
    return this.party.filter(isAlive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  }

  private async strike(target: BF, hit: Hit, text: string): Promise<void> {
    applyDamage(target, hit.amount);
    this.setMessage(`${text}\n${hit.crit ? 'Critical hit! ' : ''}${target.name} takes ${hit.amount}.`);
    this.popAt(target, String(hit.amount), hit.crit ? YELLOW : WHITE);
    if (target.side === 'enemy') {
      this.tweens.add({ targets: target.sprite, alpha: 0.2, duration: 60 / this.speed, yoyo: true, repeat: 1 });
    } else {
      this.cameras.main.shake(120, 0.006);
    }
    this.refreshStatus();
    await this.wait(750);
    if (!isAlive(target)) {
      if (target.side === 'enemy') {
        target.sprite.disableInteractive();
        this.tweens.add({ targets: target.sprite, alpha: 0, duration: 300 / this.speed });
        await this.say(`${target.name} is out!`);
      } else {
        await this.say(`${target.name} is down!`);
      }
    }
  }

  private async victory(): Promise<void> {
    const s = getState();
    const xp = this.foes.reduce((t, f) => t + Math.round(f.enemy.xp * (1 + 0.1 * (this.setup.depth - f.enemy.minDepth))), 0);
    const gold = this.foes.reduce((t, f) => t + f.enemy.gold, 0);
    const standing = this.party.filter(isAlive);
    this.highlight(null);
    this.writeBack();
    s.gold += gold;
    await this.say(`Victory! ${xp} XP and ${gold} G.`);
    // FF1-style: XP is split among the members still standing.
    const share = Math.ceil(xp / Math.max(1, standing.length));
    for (const p of standing) {
      if (gainXp(p.member, share) > 0) await this.say(`${p.name} reached level ${p.member.level}!`);
    }
    this.syncFromMembers();
    await this.waitConfirm();
    this.finish('victory', false);
  }

  private async defeat(): Promise<void> {
    this.highlight(null);
    await this.say('The team got shut out...');
    await this.waitConfirm();
    this.finish('defeat');
  }

  /** Copy battle HP/MP back to the saved party. KO'd members get back up with 1 HP (modernized). */
  private writeBack(): void {
    for (const p of this.party) {
      p.member.hp = Math.max(1, p.hp);
      p.member.mp = p.mp;
    }
  }

  private syncFromMembers(): void {
    for (const p of this.party) {
      p.hp = p.member.hp;
      p.maxHp = p.member.stats.maxHp;
      p.mp = p.member.mp;
      p.maxMp = p.member.stats.maxMp;
    }
    this.refreshStatus();
  }

  private finish(outcome: BattleResult['outcome'], writeBack = true): void {
    if (writeBack) this.writeBack();
    this.widget = null;
    const result: BattleResult = { outcome, fieldEnemy: this.setup.fieldEnemy };
    this.cameras.main.fadeOut(200);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.wake('Dungeon', result);
      this.scene.stop();
    });
  }

  // ---------------------------------------------------------------- input helpers

  private menu(
    x: number,
    y: number,
    width: number,
    items: MenuItem[],
    cancellable: boolean,
    frame?: { x: number; y: number; w: number; h: number },
  ): Promise<number> {
    return new Promise((resolve) => {
      const win = frame ? this.add.graphics() : null;
      if (win && frame) drawWindow(win, frame.x, frame.y, frame.w, frame.h);
      const done = (i: number) => {
        menu.destroy();
        win?.destroy();
        this.widget = null;
        resolve(i);
      };
      const menu = new Menu(this, x, y, items, {
        width,
        rowH: 13,
        onSelect: done,
        onCancel: cancellable ? () => done(-1) : undefined,
      });
      this.widget = menu;
    });
  }

  private pickTarget(side: 'enemy' | 'ally'): Promise<BF | null> {
    return new Promise((resolve) => {
      const pool: readonly BF[] = side === 'enemy' ? this.foes : this.party;
      const alive = () => pool.filter(isAlive);
      let idx = side === 'ally' ? Math.max(0, alive().indexOf(this.lowestAlly()!)) : 0;
      const cursor = this.add.image(0, 0, 'cursor').setOrigin(0, 0.5).setDepth(20);
      const place = () => {
        const list = alive();
        idx = (idx + list.length) % list.length;
        const f = list[idx];
        if (f.side === 'enemy') cursor.setPosition(f.sprite.x - 36, f.sprite.y);
        else cursor.setPosition(STATUS_X + 2, statusY(this.party.indexOf(f)) + 4);
        this.setMessage(`Target: ${f.name}`);
      };
      const finish = (f: BF | null) => {
        cursor.destroy();
        this.widget = null;
        this.tapTarget = null;
        resolve(f);
      };
      this.widget = {
        update: (c) => {
          if (c.repeat('left') || c.repeat('up')) {
            idx--;
            place();
          } else if (c.repeat('right') || c.repeat('down')) {
            idx++;
            place();
          }
          if (c.justPressed('confirm')) {
            c.consume();
            finish(alive()[idx]);
          } else if (c.justPressed('cancel')) {
            c.consume();
            finish(null);
          }
        },
      };
      this.tapTarget = (f) => {
        if (pool.includes(f) && isAlive(f)) finish(f);
      };
      place();
    });
  }

  private waitConfirm(): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        this.widget = null;
        this.input.off('pointerdown', done);
        controls.consume();
        resolve();
      };
      this.widget = { update: (c) => c.justPressed('confirm') && done() };
      this.input.on('pointerdown', done);
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms / this.speed, resolve));
  }

  private async say(text: string): Promise<void> {
    this.setMessage(text);
    await this.wait(800);
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
    this.speedText.setText(`x${this.speed}`);
  }

  // ---------------------------------------------------------------- drawing

  private setMessage(text: string): void {
    this.message.setText(text);
  }

  private showOrder(order: BF[]): void {
    this.orderIcons.forEach((o) => o.icon.destroy());
    this.orderIcons = order.map((f, i) => ({
      key: f.key,
      icon: this.add
        .image(58 + i * 18, 7, f.side === 'party' ? `hero-${f.member.classId}` : `enemy-${f.enemy.id}`)
        .setOrigin(0, 0),
    }));
  }

  private highlight(key: string | null): void {
    this.activeKey = key;
    for (const o of this.orderIcons) o.icon.setAlpha(key === null || o.key === key ? 1 : 0.4);
    this.refreshStatus();
  }

  private refreshStatus(): void {
    this.party.forEach((p, i) => {
      const row = this.rows[i];
      const down = !isAlive(p);
      row.name.setColor(down ? RED : p.key === this.activeKey ? YELLOW : WHITE);
      row.hp.setText(`${p.hp}/${p.maxHp}`).setColor(down || p.hp / p.maxHp < 0.25 ? RED : WHITE);
      row.mp.setText(`MP ${p.mp}`);
    });
  }

  private popAt(f: BF, text: string, color: string): void {
    const x = f.side === 'enemy' ? f.sprite.x : STATUS_X + 100;
    const y = f.side === 'enemy' ? f.sprite.y - 30 : statusY(this.party.indexOf(f)) - 2;
    const t = makeText(this, x, y, text, color).setOrigin(0.5, 0).setDepth(30);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, delay: 250 / this.speed, duration: 600 / this.speed, onComplete: () => t.destroy() });
  }

  private layout(): void {
    const W = this.scale.width;
    const g = this.bg;
    g.clear();
    // Night game at the ballpark.
    for (let y = 0; y < 136; y += 2) {
      const t = y / 136;
      g.fillStyle((Math.round(0x08 + 0x28 * t) << 16) | (Math.round(0x08 + 0x18 * t) << 8) | Math.round(0x20 + 0x40 * t));
      g.fillRect(0, y, W, 2);
    }
    const rnd = mulberry32(99);
    for (let i = 0; i < 50; i++) {
      g.fillStyle(0xffffff, 0.3 + rnd() * 0.7);
      g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 110), 1, 1);
    }
    for (const x of [28, W - 28]) {
      g.fillStyle(0x505868);
      g.fillRect(x - 1, 70, 2, 60);
      g.fillStyle(0xfff4c0, 0.2);
      g.fillRect(x - 12, 60, 24, 14);
      g.fillStyle(0xfff4c0);
      g.fillRect(x - 8, 64, 16, 6);
    }
    g.fillStyle(0x1c4a2a);
    g.fillRect(0, 128, W, 8);
    g.fillStyle(0xf0d040);
    g.fillRect(0, 128, W, 1);
    for (let y = 136, i = 0; y < BOTTOM_Y; y += 8, i++) {
      g.fillStyle(i % 2 ? 0x2f7a38 : 0x2a6c32);
      g.fillRect(0, y, W, 8);
    }

    const f = this.frames;
    f.clear();
    drawWindow(f, 4, 4, W - 8, 22);
    drawWindow(f, 4, 28, W - 8, 30);
    drawWindow(f, 4, BOTTOM_Y, CMD_W, 78);
    drawWindow(f, STATUS_X, BOTTOM_Y, W - STATUS_X - 4, 78);

    this.message.setWordWrapWidth(W - 24);
    this.speedText.setPosition(W - 12, 11);
    const n = this.foes.length;
    const spacing = Math.min(96, (W - 80) / Math.max(1, n));
    this.foes.forEach((foe, i) => foe.sprite.setPosition(Math.round(W / 2 + (i - (n - 1) / 2) * spacing), ENEMY_Y));
  }
}
