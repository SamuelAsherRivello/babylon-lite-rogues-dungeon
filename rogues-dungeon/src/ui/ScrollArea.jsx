import { useLayoutEffect, useRef } from "react";

/** Opt-in auto scroll follows new content until the reader scrolls away from the bottom. */
export function ScrollArea({ autoScroll = false, children, onScroll, ...props }) {
  const elementRef = useRef(null);
  const following = useRef(true);

  useLayoutEffect(() => {
    if (!autoScroll) return;
    const element = elementRef.current;
    const follow = () => {
      if (following.current) element.scrollTop = element.scrollHeight;
    };
    follow();
    // Also follow layout changes, including a hidden panel becoming visible.
    const observer = new ResizeObserver(follow);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [autoScroll, children]);

  return <div {...props} ref={elementRef} onScroll={(event) => {
    const element = event.currentTarget;
    if (autoScroll && element.clientHeight > 0) {
      // scrollTop can be fractional, while the other dimensions are rounded.
      following.current = element.scrollHeight - element.clientHeight - element.scrollTop <= 1;
    }
    onScroll?.(event);
  }}>{children}</div>;
}
