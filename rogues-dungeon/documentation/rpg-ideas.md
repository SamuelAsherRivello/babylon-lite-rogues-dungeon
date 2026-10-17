# RPG ideas

## Ideas from this chat

### Hell gate

- Add a gate to Hell with a devil guarding the door.
- Bumping into the devil starts an interaction.
- The devil asks, "Enter the Gate to Hell?"
- Bump again to accept. Walk away to decline.
- Enter a red-tinted version of the current level. Reuse its art and layout, but raise combat difficulty roughly tenfold through enemy statistics and encounter tuning.

### Weapons, combat, and inventory

- Dragging equipment onto an occupied slot swaps the items.
- Show a comparison when the player considers a swap. Compare offense, defense, durability, and perks.
- Do not add weapon durability. This keeps the asset and economy systems simpler.
- Add three variants for each equipment type with rock-paper-scissors-style tradeoffs.
- Give weapons chance-to-hit, miss chance, and critical-hit chance as combat properties.
- Two-handed swords deal the most damage, rarely miss, and automatically parry.
- Swords deal medium damage and miss often. Give them a distinct compensating advantage, such as a higher critical-hit chance.
- Daggers deal little damage and rarely miss.
- When the player exceeds carrying capacity, require two movement inputs to move one tile.
- Make damage feedback distinct for attacks received from north, south, east, and west.
- Add a ranged enemy that fires projectiles at the player.

### Progression

- Award experience points.
- Let the player spend level-ups on character statistics.
- Allow upgrades for existing weapons.
- Allow crafting for weapons.
- For level-ups, send sparkles inward from all directions, merge them on the character, then play a chime.

### World interactions

- Add campfires.
- Bumping into a campfire shows "Rest? (20 gold)."
- Bump again to rest. Walking away declines.
- Resting costs 20 gold, restores health, and updates the checkpoint.
- Bumping into an NPC offers an interaction. Bump again to accept; walking away declines.

### Interface, animation, and mobile

- Animate the rat prompt when it appears. Slide it in from the left, stop 30 pixels before the final position, fade it in, then snap it into place.
- Restore mobile mode, including touch controls and responsive layout.
- Update the main menu. Make the background rise upward while it fades in from black.

## Ideas from recent Dot/Codex history

These are kept separate because they came from project chats in the last five days, not this conversation.

### Linked dungeon puzzles

- Add reusable linked object sets to procedural levels.
- Start with one Floor Trigger Door Barrel Set near the level-one entrance.
- The player can push a barrel one tile by walking into it.
- A floor trigger opens a visibly linked door when the player or barrel stands on it.
- Keep each barrel, trigger, and door close enough to read as one puzzle.

### Movement and combat feedback

- Tween player, enemy, and future NPC movement between tile centers over about 0.25 seconds.
- Use one shared easing rule for all characters. The preferred option starts fast and slows at the destination.
- Add a red edge-inward damage flash for player hits. This can support the separate direction-specific damage feedback idea above.
- Trigger the existing hero run, attack, and death frame sequences in gameplay.
- Add hit particles and a brief camera shake on attacks.

### Audio candidates

- Add sound cues for player death, experience gain, level-up availability, and stat upgrades.
- Add sound cues for doors, pressure triggers, and breaking barrels.
- Add sound cues for invalid movement and equipment changes.
- Keep repeated cues selective to avoid noisy play.

### Dungeon content and technical work

- Use the larger dedicated bronze-chest art instead of the small atlas frame.
- Keep a test-mode chest beside the level-one entrance for quick pickup and chest testing.
- Add level editor support for tile-theme selection and editable procedural maps.
- Batch static tiles to reduce renderer RAM, CPU, and GPU work.
