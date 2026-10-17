import type { Campaign } from "./types.ts";

const RUN_ARGUMENTS = ["world", "level", "slot", "run", "seed"] as const;

export function runUrlForCampaign(href: string, enabled: boolean, campaign: Campaign | null, slot: string | null) {
  const url = new URL(href);
  if (!enabled || !campaign || !slot) {
    RUN_ARGUMENTS.forEach((name) => url.searchParams.delete(name));
    return url.toString();
  }
  url.searchParams.set("world", campaign.world === "One" ? "1" : campaign.world);
  url.searchParams.set("level", String(campaign.floor.level ?? campaign.floor.depth ?? 1));
  url.searchParams.set("slot", slot);
  url.searchParams.set("run", String(campaign.run ?? 1));
  url.searchParams.set("seed", String(campaign.worldSeed ?? campaign.floor.seed));
  return url.toString();
}
