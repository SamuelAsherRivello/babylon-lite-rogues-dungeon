import type { Attributes } from "../types.ts";
import { attributeLabels, progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Dialog } from "../../ui/Dialog.tsx";

export function CreateCharacterWindow({ attributes, onRoll, onConfirm, onClose }: { attributes: Attributes | null; onRoll(): void; onConfirm(): void; onClose(): void }) {
  return <Dialog title="Create Character" onClose={onClose} className="create-character-window"><div className="create-character-window__profile"><img src={`${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/frames/idle/down/00.png`} alt="Idle dungeon hero" /><p>Roll a balanced starting character. Every sheet has 30 total attribute points.</p></div>{attributes && <div className="create-character-window__attributes">{progressionStatNames.map((name) => <span key={name}>{attributeLabels[name]} <b>{attributes[name]}</b></span>)}</div>}<div className="create-character-window__actions"><button type="button" onClick={onRoll}>Roll</button><button type="button" disabled={!attributes} onClick={onConfirm}>Confirm</button></div></Dialog>;
}
