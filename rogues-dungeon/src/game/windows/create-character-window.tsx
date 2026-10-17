import { useEffect, useRef, useState } from "react";
import type { Attributes } from "../types.ts";
import { progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";
import { AttributesCard } from "../panels/attribute-panel.tsx";

export function CreateCharacterWindow({ attributes, bounds, onRoll, onConfirm, onClose }: { attributes: Attributes | null; bounds?: DialogBounds | null; onRoll(): void; onConfirm(): void; onClose(): void }) {
  const displayedAttributes = attributes ?? Object.fromEntries(progressionStatNames.map((name) => [name, 0])) as Attributes;
  const idleFramePath = (frame: number) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/frames/idle/down/${String(frame).padStart(2, "0")}.png`;
  const [randomizing, setRandomizing] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (rollTimer.current) clearTimeout(rollTimer.current); }, []);
  const roll = () => { if (randomizing) return; setRandomizing(true); rollTimer.current = setTimeout(() => { onRoll(); setRandomizing(false); rollTimer.current = null; }, 1000); };
  return <Dialog title="Create Character" onClose={onClose} className="create-character-window create-character-window--menu" bounds={bounds} menuMotion><div className="create-character-window__content"><div className="create-character-window__attributes"><AttributesCard attributes={displayedAttributes} panelPopup={randomizing ? { title: "Randomizing ..." } : undefined} /></div><div className="create-character-window__details"><div className="create-character-window__hero" role="img" aria-label="Idle dungeon hero">{[0, 1, 2, 3].map((frame) => <img key={frame} src={idleFramePath(frame)} alt="" />)}</div><p className="body_text">(Re)roll to randomize 30 points across your attributes.</p></div></div><div className="create-character-window__actions"><button type="button" disabled={randomizing} onClick={roll}>Roll</button><button type="button" disabled={!attributes || randomizing} onClick={onConfirm}>Confirm</button></div></Dialog>;
}
