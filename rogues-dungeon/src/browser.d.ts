import "react";
import "csstype";

declare module "react" {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
    "--world-floating-travel"?: string;
  }
}

declare module "csstype" {
  interface Properties<TLength = (string & {}) | 0, TTime = string & {}> {
    "--world-floating-travel"?: string;
  }
}

declare global {
  interface Navigator {
    readonly userAgentData?: { readonly mobile?: boolean };
  }
}
