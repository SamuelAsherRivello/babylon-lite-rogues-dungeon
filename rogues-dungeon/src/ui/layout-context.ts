import type { Dispatch, SetStateAction } from "react";
import type { Orientation } from "./layout.ts";
import { createContext } from "react";

export const LayoutContext = createContext<{ platform: string; orientation: Orientation; canOverride: boolean; setDeveloperAspect: Dispatch<SetStateAction<Orientation | null>> }>({ platform: "pc", orientation: "landscape", canOverride: false, setDeveloperAspect() {} });
