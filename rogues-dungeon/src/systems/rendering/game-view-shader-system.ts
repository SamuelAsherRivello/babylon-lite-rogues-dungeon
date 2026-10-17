export interface GameViewShaderLayer {
  readonly id: string;
  readonly color: string;
  readonly opacity: number;
  readonly blendMode: "screen" | "normal";
}

/**
 * Owns composited effects for the playable world view. Layers sit over the
 * rendered canvas only, so the HUD, tooltips, and menus keep their true color.
 */
export class GameViewShaderSystem {
  private readonly permanentLayers: readonly GameViewShaderLayer[] = [
    { id: "green-tint", color: "rgb(54 220 112)", opacity: 0.1, blendMode: "screen" },
  ];

  layersFor({ minimap }: { minimap: boolean }) {
    return minimap ? [] : this.permanentLayers;
  }
}

export const gameViewShaderSystem = new GameViewShaderSystem();
