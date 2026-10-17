import { useEffect, useRef, useState } from "react";
import type { Attributes } from "../types.ts";
import { progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Dialog, type DialogBounds } from "../../ui/Dialog.tsx";
import { AttributesCard } from "../panels/attribute-panel.tsx";
import { ImageTextRow } from "./image-text-row.tsx";

export function CreateCharacterWindow({ attributes, bounds, onRoll, onConfirm, onClose }: { attributes: Attributes | null; bounds?: DialogBounds | null; onRoll(): void; onConfirm(): void; onClose(): void }) {
  const displayedAttributes = attributes ?? Object.fromEntries(progressionStatNames.map((name) => [name, 0])) as Attributes;
  const idleFramePath = (frame: number) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/frames/idle/down/${String(frame).padStart(2, "0")}.png`;
  const [randomizing, setRandomizing] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (rollTimer.current) clearTimeout(rollTimer.current); }, []);
  const roll = () => { if (randomizing) return; setRandomizing(true); rollTimer.current = setTimeout(() => { onRoll(); setRandomizing(false); rollTimer.current = null; }, 1000); };
  const asset = (path: string) => `${import.meta.env.BASE_URL}assets/art/${path}`;
  return <Dialog title="Create Character" onClose={onClose} className="create-character-window create-character-window--menu" bounds={bounds} menuMotion><div className="create-character-window__content"><div className="create-character-window__attributes"><AttributesCard attributes={displayedAttributes} panelPopup={randomizing ? { title: "Randomizing ..." } : undefined} /></div><ImageTextRow className="create-character-window__details" image={<div className="create-character-window__hero" role="img" aria-label="Idle dungeon hero">{[0, 1, 2, 3].map((frame) => <img key={frame} src={idleFramePath(frame)} alt="" />)}</div>}><p className="body_text">(Re)roll to randomize 30 points across your attributes.</p></ImageTextRow><ImageTextRow className="create-character-window__details" imagePosition="right" image={<img className="create-character-window__illustration" src={asset("vendors/dungeons-and-pixels-v1.4/enemies/slime/frames/idle/00.png")} alt="Idle slime enemy" />}><p className="body_text">Earn experience through actions and combat.</p></ImageTextRow><ImageTextRow className="create-character-window__details" image={<img className="create-character-window__illustration" src={asset("custom/particles/smoke-poff/smoke-poff-5.png")} alt="Level-up sparkle" />}><p className="body_text">Level up to spend Attribute Points.</p></ImageTextRow></div><div className="create-character-window__actions"><button type="button" disabled={randomizing} onClick={roll}>Roll</button><button type="button" disabled={!attributes || randomizing} onClick={onConfirm}>Confirm</button></div></Dialog>;
}
