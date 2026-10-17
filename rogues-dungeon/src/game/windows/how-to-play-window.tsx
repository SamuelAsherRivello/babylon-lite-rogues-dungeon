import { useState } from "react";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";

const topics = [
  ["The Basics", "Move one tile at a time with WASD or the arrow keys. Walk into objects to interact with them or begin combat. Legal moves advance time, then enemies can act. Diagonal movement is allowed, but walls and blocked corners stop you.\n\nLeft-click to walk or attack. Right-click to run or attack."],
  ["Movement", "Click a reachable tile to take one step toward it. Hold the left mouse button to keep walking the route. Right-click for one running step, or hold the right mouse button to keep running. A blocked or sealed destination will not move you, and diagonal movement cannot cut through blocked corners."],
  ["Combat", "Walk into an enemy, or click it after moving beside it, to attack. Your equipped hands strike together. Watch Health and Stamina closely: low Stamina weakens combat, and reaching zero Health ends the current run."],
  ["Exploration", "Search each dungeon floor for stairs, containers, hazards, and useful routes. Step onto stairs to descend. Lower levels bring stronger enemies, better loot, and new hazards, so clear safe paths before you move deeper."],
  ["Quests", "The Quest panel tracks your current objective and updates from actions you complete in the dungeon. Follow its active step for an introduction to stairs, potions, and coins, then keep exploring to advance your run."],
  ["Items", "Pick up weapons, armor, potions, keys, and gold. Equip gear in its matching slot to improve your character. If a slot is occupied, choose whether to replace the equipped item or leave the new item behind."],
  ["Leveling Up", "Attacks, defeats, discoveries, containers, and new dungeon levels grant experience. Each new level grants Attribute Points. Open Progression from Attributes when you are ready to spend them; your level and attributes persist after a run ends."],
  ["Saving Your Game", "The game autosaves after turns in the selected save slot. Settings controls audio and returning to the main menu. Use the title-bar controls for fullscreen, camera mode, and world zoom whenever you need them."],
] as const;

export function HowToPlayWindow({ onClose, origin, bounds }: { onClose(): void; origin: "menu" | "game"; bounds?: DialogBounds | null }) {
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [title, content] = topics[selectedTopic];
  return <Dialog title="How To Play" onClose={onClose} className={`how-to-play-window how-to-play-window--${origin}`} bounds={bounds} menuMotion><label className="how-to-play-window__topics">Topic<select tabIndex={-1} value={selectedTopic} onChange={(event) => setSelectedTopic(Number(event.target.value))}>{topics.map(([topic], index) => <option key={topic} value={index}>{index + 1}. {topic}</option>)}</select></label><section id="how-to-play-topic" className="how-to-play-window__topic" aria-label={title}><h3>{title}</h3>{content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section></Dialog>;
}
