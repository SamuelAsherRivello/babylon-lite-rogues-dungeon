import type { Campaign, Enemy, Position } from "../../game/types.ts";

export const TURN_PLAYBACK_DURATION_MS = 1000;

export interface PresentedEnemy { id: string; from: Position; to: Position; rank: number; startAt: number; endAt: number }

export interface TurnPlaybackPlan { duration: number; enemies: PresentedEnemy[] }

function enemies(campaign: Campaign) { return campaign.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy"); }
function samePosition(a: Position | undefined, b: Position | undefined) { return a?.x === b?.x && a?.y === b?.y; }

/** Keeps non-serializable, renderer-facing turn playback separate from campaign state. */
export class TurnPresentationSystem {
  private ranks = new Map<string, number>();
  private nextRank = 0;
  private positions = new Map<string, Position>();
  private active: TurnPlaybackPlan | null = null;
  private floorKey: string | null = null;

  reset(campaign: Campaign) {
    this.floorKey = `${campaign.floor.seed}:${campaign.floor.level}`;
    this.ranks.clear(); this.nextRank = 0; this.active = null;
    this.positions = new Map(enemies(campaign).map((enemy) => [enemy.id, { x: enemy.x, y: enemy.y }]));
  }

  begin(previous: Campaign, current: Campaign, visibleEnemyIds: ReadonlySet<string>, now: number): TurnPlaybackPlan {
    const floorKey = `${current.floor.seed}:${current.floor.level}`;
    if (this.floorKey !== floorKey) this.reset(current);
    this.flush();
    const before = new Map(enemies(previous).map((enemy) => [enemy.id, enemy]));
    const liveIds = new Set(enemies(current).map((enemy) => enemy.id));
    for (const id of this.positions.keys()) if (!liveIds.has(id)) this.positions.delete(id);
    for (const id of this.ranks.keys()) if (!liveIds.has(id)) this.ranks.delete(id);
    const visible = enemies(current).filter((enemy) => visibleEnemyIds.has(enemy.id));
    for (const enemy of visible) if (!this.ranks.has(enemy.id)) this.ranks.set(enemy.id, this.nextRank++);
    const changed = visible.filter((enemy) => !samePosition(before.get(enemy.id), enemy)).sort((a, b) => this.rankOf(a.id) - this.rankOf(b.id));
    const duration = changed.length ? TURN_PLAYBACK_DURATION_MS : 0;
    const enemiesToPlay = changed.map((enemy, index) => {
      const from = before.get(enemy.id)!;
      const slice = TURN_PLAYBACK_DURATION_MS / changed.length;
      const entry: PresentedEnemy = { id: enemy.id, from: { x: from.x, y: from.y }, to: { x: enemy.x, y: enemy.y }, rank: this.rankOf(enemy.id), startAt: now + index * slice, endAt: now + (index + 1) * slice };
      this.positions.set(enemy.id, entry.from);
      return entry;
    });
    for (const enemy of enemies(current)) if (!visibleEnemyIds.has(enemy.id) || !changed.some((entry) => entry.id === enemy.id)) this.positions.set(enemy.id, { x: enemy.x, y: enemy.y });
    this.active = { duration, enemies: enemiesToPlay };
    return this.active;
  }

  sample(now: number) {
    if (!this.active) return false;
    let running = false;
    for (const enemy of this.active.enemies) {
      this.positions.set(enemy.id, now >= enemy.startAt ? enemy.to : enemy.from);
      running ||= now < enemy.endAt;
    }
    if (!running) this.active = null;
    return running;
  }

  flush() {
    if (!this.active) return;
    for (const enemy of this.active.enemies) this.positions.set(enemy.id, enemy.to);
    this.active = null;
  }

  positionOf(id: string, fallback: Position): Position { return this.positions.get(id) ?? fallback; }
  rankOf(id: string) { return this.ranks.get(id) ?? Number.MAX_SAFE_INTEGER; }
  get isActive() { return this.active !== null; }
}
