import "react";

declare module "react" {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
  }
}

declare global {
  interface Navigator {
    readonly userAgentData?: { readonly mobile?: boolean };
  }
}
