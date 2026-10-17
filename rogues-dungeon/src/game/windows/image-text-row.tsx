import type { ReactNode } from "react";

export function ImageTextRow({ image, children, className = "", imagePosition = "left" }: { image: ReactNode; children: ReactNode; className?: string; imagePosition?: "left" | "right" }) {
  return <div className={["image-text-row", imagePosition === "right" && "image-text-row--image-right", className].filter(Boolean).join(" ")}><div className="image-text-row__image">{image}</div><div className="image-text-row__text">{children}</div></div>;
}
