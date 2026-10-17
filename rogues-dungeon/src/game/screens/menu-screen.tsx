import { useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

export function MenuScreen({ children }: { children: ReactNode }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const resetLayers = () => setPointer({ x: 0, y: 0 });
  const moveLayers = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 });
  };
  const layerStyle = { "--menu-parallax-x": `${pointer.x * 5}px`, "--menu-parallax-y": `${pointer.y * 5}px` } as CSSProperties;
  return <main className="menu-screen" onPointerDown={(event) => {
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={moveLayers} onPointerUp={resetLayers} onPointerCancel={resetLayers} onPointerLeave={resetLayers} style={layerStyle}>
    <div className="menu-screen__art" aria-hidden="true">
      <img className="menu-screen__layer menu-screen__layer--rear" src={`${import.meta.env.BASE_URL}assets/art/menu/dungeon-hallway-rear.png`} alt="" />
      <img className="menu-screen__layer menu-screen__layer--frame" src={`${import.meta.env.BASE_URL}assets/art/menu/dungeon-environment-frame.png`} alt="" />
      <img className="menu-screen__layer menu-screen__layer--hero" src={`${import.meta.env.BASE_URL}assets/art/menu/dungeon-hero.png`} alt="" />
      <img className="menu-screen__layer menu-screen__layer--rocks" src={`${import.meta.env.BASE_URL}assets/art/menu/dungeon-foreground-rocks.png`} alt="" />
    </div>
    {children}
  </main>;
}
