import type { Campaign, Enemy, Position } from "../../game/types.ts";
import { easeOutCubic } from "./tween-animation-system.ts";

export const TURN_PLAYBACK_DURATION_MS = 1000;
export const CHARACTER_MOVEMENT_DURATION_MS = 250;
export const SUB_GRID_MOVEMENT = true;

export interface PresentedEnemy { id: string; from: Position; to: Position; rank: number; startAt: number; endAt: number }
export interface TurnPlaybackPlan { duration: number; enemies: PresentedEnemy[] }

interface CharacterMotion { from: Position; to: Position; startAt: number; endAt: number }

function enemies(campaign: Campaign) { return campaign.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy"); }
function samePosition(a: Position | undefined, b: Position | undefined) { return a?.x === b?.x && a?.y === b?.y; }
function clonePosition(position: Position): Position { return { x: position.x, y: position.y }; }

/** Keeps non-serializable, renderer-facing turn playback separate from campaign state. */
export class TurnPresentationSystem {
  private ranks = new Map<string, number>();
  private nextRank = 0;
  private positions = new Map<string, Position>();
  private motions = new Map<string, CharacterMotion>();
  private active: TurnPlaybackPlan | null = null;
  private floorKey: string | null = null;

  constructor(private readonly subGridMovement = SUB_GRID_MOVEMENT) {}

  reset(campaign: Campaign) {
    this.floorKey = `${campaign.floor.seed}:${campaign.floor.level}`;
    this.ranks.clear(); this.nextRank = 0; this.active = null; this.motions.clear();
    this.positions = new Map(enemies(campaign).map((enemy) => [enemy.id, clonePosition(enemy)]));
    this.positions.set("player", clonePosition(campaign.player));
  }

  begin(previous: Campaign, current: Campaign, visibleEnemyIds: ReadonlySet<string>, now: number): TurnPlaybackPlan {
    const floorKey = `${current.floor.seed}:${current.floor.level}`;
    if (this.floorKey !== floorKey) this.reset(previous);
    this.sample(now);
    const before = new Map(enemies(previous).map((enemy) => [enemy.id, enemy]));
    const liveIds = new Set(enemies(current).map((enemy) => enemy.id));
    for (const id of this.positions.keys()) if (id !== "player" && !liveIds.has(id)) this.positions.delete(id);
    for (const id of this.motions.keys()) if (id !== "player" && !liveIds.has(id)) this.motions.delete(id);
    for (const id of this.ranks.keys()) if (!liveIds.has(id)) this.ranks.delete(id);
    const visible = enemies(current).filter((enemy) => visibleEnemyIds.has(enemy.id));
    for (const enemy of visible) if (!this.ranks.has(enemy.id)) this.ranks.set(enemy.id, this.nextRank++);
    const changed = visible.filter((enemy) => !samePosition(before.get(enemy.id), enemy)).sort((a, b) => this.rankOf(a.id) - this.rankOf(b.id));
    const duration = changed.length ? TURN_PLAYBACK_DURATION_MS : 0;
    const enemiesToPlay = changed.map((enemy, index) => {
      const from = this.positions.get(enemy.id) ?? (before.has(enemy.id) ? clonePosition(before.get(enemy.id)!) : clonePosition(enemy));
      const startAt = now + index * TURN_PLAYBACK_DURATION_MS / changed.length;
      const entry: PresentedEnemy = { id: enemy.id, from: clonePosition(from), to: clonePosition(enemy), rank: this.rankOf(enemy.id), startAt, endAt: startAt + CHARACTER_MOVEMENT_DURATION_MS };
      this.setMotion(enemy.id, entry, now);
      return entry;
    });
    if (!samePosition(previous.player, current.player)) this.setMotion("player", { from: this.positions.get("player") ?? clonePosition(previous.player), to: clonePosition(current.player), startAt: now, endAt: now + CHARACTER_MOVEMENT_DURATION_MS }, now);
    else if (!this.motions.has("player")) this.positions.set("player", clonePosition(current.player));
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
    if (!running) this.active = null;
    return running;
  }

  flush() {
    for (const [id, motion] of this.motions) this.positions.set(id, clonePosition(motion.to));
    this.motions.clear(); this.active = null;
  }

  positionOf(id: string, fallback: Position): Position { return this.positions.get(id) ?? fallback; }
  playerPositionOf(fallback: Position): Position { return this.positionOf("player", fallback); }
  rankOf(id: string) { return this.ranks.get(id) ?? Number.MAX_SAFE_INTEGER; }
  get isActive() { return this.motions.size > 0; }

  private setMotion(id: string, motion: CharacterMotion, now: number) {
    if (!this.subGridMovement) { this.positions.set(id, clonePosition(motion.to)); this.motions.delete(id); return; }
    this.positions.set(id, clonePosition(motion.from)); this.motions.set(id, motion); this.sample(now);
  }
}
