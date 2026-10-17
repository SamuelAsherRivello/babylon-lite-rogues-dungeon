import { useState } from "react";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";

const topics = [
  ["Basics", "Move one tile at a time with WASD or the arrow keys. Walk into objects to interact with them or begin combat. Legal moves advance time, then enemies can act. Diagonal movement is allowed, but walls and blocked corners stop you.\n\nLeft-click to walk or attack. Right-click to run or attack."],
  ["Combat", "Walk into an enemy to attack it. Your equipped hands strike together. Health reaching zero ends the current run, but your character progress remains for the next descent."],
  ["Exploration", "Search every dungeon floor for stairs. Step onto stairs to descend. Lower levels bring stronger enemies, better loot, and new hazards. Take time to clear safe routes before moving deeper."],
  ["Items and gear", "Pick up weapons, armor, and supplies. Equip gear in its matching slot. If the slot is occupied, choose whether to replace the equipped item or leave the new item behind."],
  ["Abilities and stamina", "Use numbered abilities for special actions. Stamina affects damage and defensive options. Waiting or repositioning can be safer than rushing into a group when your resources are low."],
  ["Progression", "Successful attacks, defeats, discoveries, containers, and new dungeon levels grant experience. Each level grants three Attribute Points. Open Progression from Attributes when you are ready to spend them. Your level and attributes persist after a run ends."],
  ["Saving and controls", "The game autosaves after turns in the selected save slot. Settings controls audio and returning to the main menu. Use the title-bar controls for fullscreen, camera mode, and world zoom."],
] as const;

export function HowToPlayWindow({ onClose, origin, bounds }: { onClose(): void; origin: "menu" | "game"; bounds?: DialogBounds | null }) {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [title, content] = topics[selectedTopic];
  return <Dialog title="How To Play" onClose={onClose} className={`how-to-play-window how-to-play-window--${origin}`} bounds={bounds} menuMotion><div className="how-to-play-window__topics" role="tablist" aria-label="How To Play topics">{topics.map(([topic], index) => <button tabIndex={-1} type="button" key={topic} role="tab" aria-selected={selectedTopic === index} aria-controls="how-to-play-topic" onClick={() => setSelectedTopic(index)}>{topic}</button>)}</div><section id="how-to-play-topic" className="how-to-play-window__topic" role="tabpanel" aria-label={title}><h3>{title}</h3>{content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section></Dialog>;
}
