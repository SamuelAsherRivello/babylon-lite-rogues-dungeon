import type { Campaign, Direction, Enemy, Position } from "../../game/types.ts";
import { easeOutCubic } from "./tween-animation-system.ts";

export const TURN_PLAYBACK_DURATION_MS = 1000;
export const CHARACTER_MOVEMENT_DURATION_MS = 250;
export const INTERACTIVE_BUMP_DURATION_MS = CHARACTER_MOVEMENT_DURATION_MS / 2;
export const INTERACTIVE_BUMP_APEX_MS = INTERACTIVE_BUMP_DURATION_MS / 2;
export const DAMAGE_REACTION_DURATION_MS = CHARACTER_MOVEMENT_DURATION_MS;
export const SUB_GRID_MOVEMENT = true;

export interface PresentedEnemy { id: string; from: Position; to: Position; rank: number; startAt: number; endAt: number }
export interface TurnPlaybackPlan { duration: number; enemies: PresentedEnemy[] }

interface SubGridMotion { from: Position; to: Position; startAt: number; endAt: number }

function enemies(campaign: Campaign) { return campaign.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy"); }
function barrels(campaign: Campaign) { return (campaign.floor.objectSets ?? []).filter((set) => set.kind === "floor-trigger-door-barrel").map((set) => ({ id: `${set.id}-barrel`, ...set.barrel })); }
function subGridMovers(campaign: Campaign) { return [...enemies(campaign), ...barrels(campaign)]; }
function samePosition(a: Position | undefined, b: Position | undefined) { return a?.x === b?.x && a?.y === b?.y; }
function clonePosition(position: Position): Position { return { x: position.x, y: position.y }; }
const bumpOffsets: Readonly<Record<Direction, Position>> = Object.freeze({ n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 }, e: { x: 1, y: 0 } });
function bumpDirectionFromOffset(offset: Position): Direction { return offset.x < 0 ? "w" : offset.x > 0 ? "e" : offset.y < 0 ? "n" : "s"; }

/**
 * Keeps renderer-only sub-grid playback separate from campaign state.
 *
 * Players, enemies, and pushable barrels move between cells and therefore use
 * this shared presentation path. Doors, triggers, terrain, pickups, and
 * decorations instead change state in place and remain grid-aligned.
 */
export class TurnPresentationSystem {
  private ranks = new Map<string, number>();
  private nextRank = 0;
  private positions = new Map<string, Position>();
  private motions = new Map<string, SubGridMotion>();
  private active: TurnPlaybackPlan | null = null;
  private floorKey: string | null = null;
  private bumps = new Map<string, { origin: Position; direction: Position; startAt: number }>();
  private damageReactions = new Map<string, number>();
  private headings = new Map<string, Direction>();

  constructor(private readonly subGridMovement = SUB_GRID_MOVEMENT) {}

  reset(campaign: Campaign) {
    this.floorKey = `${campaign.floor.seed}:${campaign.floor.level}`;
    this.ranks.clear(); this.nextRank = 0; this.active = null; this.motions.clear(); this.bumps.clear(); this.damageReactions.clear(); this.headings.clear();
    this.positions = new Map(subGridMovers(campaign).map((mover) => [mover.id, clonePosition(mover)]));
    this.positions.set("player", clonePosition(campaign.player));
  }

  begin(previous: Campaign, current: Campaign, visibleEnemyIds: ReadonlySet<string>, now: number): TurnPlaybackPlan {
    const floorKey = `${current.floor.seed}:${current.floor.level}`;
    if (this.floorKey !== floorKey) this.reset(previous);
    this.sample(now);
    const before = new Map(subGridMovers(previous).map((mover) => [mover.id, mover]));
    const beforeEnemies = new Map(enemies(previous).map((enemy) => [enemy.id, enemy]));
    const movers = subGridMovers(current);
    const liveIds = new Set(movers.map((mover) => mover.id));
    for (const id of this.positions.keys()) if (id !== "player" && !liveIds.has(id)) this.positions.delete(id);
    for (const id of this.motions.keys()) if (id !== "player" && !liveIds.has(id)) this.motions.delete(id);
    for (const id of this.ranks.keys()) if (!liveIds.has(id)) this.ranks.delete(id);
    const visible = enemies(current).filter((enemy) => visibleEnemyIds.has(enemy.id));
    for (const enemy of visible) if (!this.ranks.has(enemy.id)) this.ranks.set(enemy.id, this.nextRank++);
    const changed = visible.filter((enemy) => !samePosition(before.get(enemy.id), enemy)).sort((a, b) => this.rankOf(a.id) - this.rankOf(b.id));
    for (const enemy of enemies(current)) if ((beforeEnemies.get(enemy.id)?.hp ?? enemy.hp) > enemy.hp) this.beginDamageReaction(enemy.id, now);
    if (previous.player.resources.health.current > current.player.resources.health.current) this.beginDamageReaction("player", now);
    if (previous.player.resources.health.current > current.player.resources.health.current) {
      const attacker = enemies(current).find((enemy) => beforeEnemies.get(enemy.id)?.nextActionAt !== enemy.nextActionAt && Math.max(Math.abs(current.player.x - enemy.x), Math.abs(current.player.y - enemy.y)) <= 1);
      if (attacker) this.beginBump(attacker.id, attacker, bumpDirectionFromOffset({ x: Math.sign(current.player.x - attacker.x), y: Math.sign(current.player.y - attacker.y) }), now);
    }
    const duration = changed.length ? TURN_PLAYBACK_DURATION_MS : 0;
    const enemiesToPlay = changed.map((enemy, index) => {
      const from = this.positions.get(enemy.id) ?? (before.has(enemy.id) ? clonePosition(before.get(enemy.id)!) : clonePosition(enemy));
      const startAt = now + index * TURN_PLAYBACK_DURATION_MS / changed.length;
      const entry: PresentedEnemy = { id: enemy.id, from: clonePosition(from), to: clonePosition(enemy), rank: this.rankOf(enemy.id), startAt, endAt: startAt + CHARACTER_MOVEMENT_DURATION_MS };
      this.setMotion(enemy.id, entry, now);
      return entry;
    });
    if (current.player.heading) this.headings.set("player", current.player.heading);
    if (!samePosition(previous.player, current.player)) this.setMotion("player", { from: this.positions.get("player") ?? clonePosition(previous.player), to: clonePosition(current.player), startAt: now, endAt: now + CHARACTER_MOVEMENT_DURATION_MS }, now);
    else if (!this.motions.has("player")) this.positions.set("player", clonePosition(current.player));
    for (const barrel of barrels(current)) {
      if (!samePosition(before.get(barrel.id), barrel)) this.setMotion(barrel.id, { from: this.positions.get(barrel.id) ?? clonePosition(before.get(barrel.id) ?? barrel), to: clonePosition(barrel), startAt: now, endAt: now + CHARACTER_MOVEMENT_DURATION_MS }, now);
      else if (!this.motions.has(barrel.id)) this.positions.set(barrel.id, clonePosition(barrel));
    }
    for (const enemy of enemies(current)) if ((!visibleEnemyIds.has(enemy.id) || !changed.some((entry) => entry.id === enemy.id)) && !this.motions.has(enemy.id)) this.positions.set(enemy.id, clonePosition(enemy));
    this.active = { duration, enemies: enemiesToPlay };
    return this.active;
  }

  sample(now: number) {
    let running = false;
    for (const [id, motion] of this.motions) {
      if (!this.subGridMovement || now >= motion.endAt) {
        this.positions.set(id, clonePosition(motion.to)); this.motions.delete(id); continue;
      }
      const progress = now <= motion.startAt ? 0 : Math.max(0, Math.min(1, (now - motion.startAt) / (motion.endAt - motion.startAt)));
      const eased = easeOutCubic(progress);
      this.positions.set(id, { x: motion.from.x + (motion.to.x - motion.from.x) * eased, y: motion.from.y + (motion.to.y - motion.from.y) * eased });
      running = true;
    }
    for (const [id, bump] of this.bumps) {
      const elapsed = now - bump.startAt;
      if (elapsed >= INTERACTIVE_BUMP_DURATION_MS) { this.positions.set(id, clonePosition(bump.origin)); this.bumps.delete(id); continue; }
      const progress = Math.max(0, elapsed / INTERACTIVE_BUMP_DURATION_MS);
      const distance = progress <= .5 ? progress : 1 - progress;
      this.positions.set(id, { x: bump.origin.x + bump.direction.x * distance, y: bump.origin.y + bump.direction.y * distance });
      running = true;
    }
    for (const [id, startedAt] of this.damageReactions) if (now - startedAt >= DAMAGE_REACTION_DURATION_MS) this.damageReactions.delete(id); else running = true;
    if (!running) this.active = null;
    return running;
  }

  flush() {
    for (const [id, motion] of this.motions) this.positions.set(id, clonePosition(motion.to));
    this.motions.clear(); this.active = null;
  }

  positionOf(id: string, fallback: Position): Position { return this.positions.get(id) ?? fallback; }
  /** Start a cardinal bump and face its direction for the entire gesture. */
  beginBump(id: string, origin: Position, direction: Direction | Position, now: number) { const heading = typeof direction === "string" ? direction : bumpDirectionFromOffset(direction); const offset = bumpOffsets[heading]; this.positions.set(id, clonePosition(origin)); this.headings.set(id, heading); this.bumps.set(id, { origin: clonePosition(origin), direction: clonePosition(offset), startAt: now }); }
  isBumping(id: string, now: number) { const bump = this.bumps.get(id); return Boolean(bump && now - bump.startAt < INTERACTIVE_BUMP_DURATION_MS); }
  bumpDepthTieBreakOf(id: string, now: number) { const bump = this.bumps.get(id); return bump && bump.direction.x !== 0 && now - bump.startAt < INTERACTIVE_BUMP_DURATION_MS ? 1 : 0; }
  bumpApexAt(id: string) { const bump = this.bumps.get(id); return bump ? bump.startAt + INTERACTIVE_BUMP_APEX_MS : null; }
  beginDamageReaction(id: string, now: number) { this.damageReactions.set(id, now); }
  damageScaleOf(id: string, now: number) { const start = this.damageReactions.get(id); if (start === undefined) return 1; const progress = Math.max(0, Math.min(1, (now - start) / DAMAGE_REACTION_DURATION_MS)); return 1 - .1 * Math.sin(Math.PI * progress); }
  headingOf(id: string, fallback: Direction): Direction { return this.headings.get(id) ?? fallback; }
  playerPositionOf(fallback: Position): Position { return this.positionOf("player", fallback); }
  /**
   * The player keeps the origin tile's depth while rising, then takes the
   * destination tile's depth at the movement apex. The sprite position itself
   * remains continuously interpolated by playerPositionOf().
   */
  playerDepthPositionOf(fallback: Position, now: number): Position {
    const motion = this.motions.get("player");
    if (!motion || !this.subGridMovement || now < motion.startAt + (motion.endAt - motion.startAt) / 2) return this.playerPositionOf(fallback);
    return motion.to;
  }
  /**
   * Returns a renderer-only 0..1 movement pulse. It shares the exact motion
   * interval with the positional tween, so a visual pulse cannot outlive or
   * delay the committed movement.
   */
  movementPulseOf(id: string, now: number) {
    const motion = this.motions.get(id);
    if (!motion || !this.subGridMovement || now <= motion.startAt || now >= motion.endAt) return 0;
    const progress = (now - motion.startAt) / (motion.endAt - motion.startAt);
    return Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));
  }
  rankOf(id: string) { return this.ranks.get(id) ?? Number.MAX_SAFE_INTEGER; }
  get isActive() { return this.motions.size > 0; }

  private setMotion(id: string, motion: SubGridMotion, now: number) {
    if (!this.subGridMovement) { this.positions.set(id, clonePosition(motion.to)); this.motions.delete(id); return; }
    this.positions.set(id, clonePosition(motion.from)); this.motions.set(id, motion); this.sample(now);
  }
}
