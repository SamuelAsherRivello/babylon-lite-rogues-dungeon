import type { AttributeName, Campaign } from "../types.ts";
import { attributeLabels } from "../../systems/procedural/world-procedural-system.ts";

export function LevelUpWindow({ campaign, chooseUpgrade, describeAttribute }: { campaign: Campaign; chooseUpgrade(stat: AttributeName): void; describeAttribute(stat: AttributeName): string }) {
  const pending = campaign.progression.pendingUpgrades?.[0];
  if (!pending) return null;
  return <div className="level-up-window__backdrop" role="presentation"><section className="level-up-window" role="dialog" aria-modal="true" aria-labelledby="level-up-window__title"><h2 id="level-up-window__title">Level {pending.level}: Choose a Stat</h2><p>Your next action waits until you choose.</p><div className="level-up-window__options">{pending.options.map((stat) => <button tabIndex={-1} key={stat} onClick={() => chooseUpgrade(stat)}><strong>{attributeLabels[stat]}</strong><span>{describeAttribute(stat)}</span></button>)}</div></section></div>;
}
