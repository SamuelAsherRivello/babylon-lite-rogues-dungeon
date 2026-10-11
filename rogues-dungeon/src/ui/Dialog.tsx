import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function Dialog({ title, onClose, children, footer = null, className = "" }: { title: ReactNode; onClose(): void; children?: ReactNode; footer?: ReactNode; className?: string }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); };
  }, []);
  return (
    <div className="dialog_backdrop" role="presentation" onClick={onClose}>
      <section className={`dialog ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="dialog_title" onClick={(event) => event.stopPropagation()}>
        <header className="dialog_header">
          <h2 id="dialog_title">{title}</h2>
          <button tabIndex={-1} className="dialog_close" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <div className="dialog_body">{children}</div>
        {footer && <footer className="dialog_footer">{footer}</footer>}
      </section>
    </div>
  );
}
