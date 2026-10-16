import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface ScrollMetrics { clientHeight: number; scrollHeight: number; scrollTop: number }

/** A scroll region with a permanent, draggable in-game scrollbar. */
export function ScrollArea({ autoScroll = false, children, className = "", onScroll, ...props }: HTMLAttributes<HTMLDivElement> & { autoScroll?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const dragRef = useRef<{ startY: number; startScrollTop: number; trackHeight: number } | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>({ clientHeight: 0, scrollHeight: 0, scrollTop: 0 });
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = { clientHeight: viewport.clientHeight, scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop };
    setMetrics((current) => current.clientHeight === next.clientHeight && current.scrollHeight === next.scrollHeight && current.scrollTop === next.scrollTop ? current : next);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current!;
    const follow = () => {
      if (autoScroll && following.current) viewport.scrollTop = viewport.scrollHeight;
      measure();
    };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(viewport);
    for (const child of viewport.children) observer.observe(child);
    return () => observer.disconnect();
  }, [autoScroll, children, measure]);

  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  const thumbHeight = metrics.clientHeight ? Math.max(12, metrics.clientHeight * metrics.clientHeight / Math.max(metrics.scrollHeight, 1)) : 0;
  const thumbTravel = Math.max(0, metrics.clientHeight - thumbHeight);
  const thumbTop = maxScroll ? metrics.scrollTop / maxScroll * thumbTravel : 0;
  const moveToTrackPosition = (clientY: number, trackTop: number, trackHeight: number) => {
    const viewport = viewportRef.current;
    if (!viewport || !maxScroll || !thumbTravel) return;
    viewport.scrollTop = Math.max(0, Math.min(maxScroll, (clientY - trackTop - thumbHeight / 2) / thumbTravel * maxScroll));
    measure();
  };
  const startThumbDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = event.currentTarget.parentElement!;
    dragRef.current = { startY: event.clientY, startScrollTop: metrics.scrollTop, trackHeight: track.getBoundingClientRect().height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };
  const dragThumb = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const drag = dragRef.current;
    if (!viewport || !drag || !maxScroll || !thumbTravel) return;
    viewport.scrollTop = Math.max(0, Math.min(maxScroll, drag.startScrollTop + (event.clientY - drag.startY) / Math.max(1, drag.trackHeight - thumbHeight) * maxScroll));
    measure();
  };

  return <div {...props} className={`scroll-area ${className}`}>
    <div ref={viewportRef} className="scroll-area__viewport" onWheel={(event) => {
      const viewport = event.currentTarget;
      if (!viewport.scrollHeight || viewport.scrollHeight <= viewport.clientHeight) return;
      viewport.scrollTop += event.deltaY;
      event.preventDefault();
      measure();
    }} onScroll={(event) => {
      const viewport = event.currentTarget;
      if (autoScroll && viewport.clientHeight > 0) following.current = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 1;
      measure();
      onScroll?.(event);
    }}>{children}</div>
    <div className="scroll-area__track" aria-hidden="true" onPointerDown={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      moveToTrackPosition(event.clientY, rect.top, rect.height);
    }} onPointerMove={dragThumb} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}><div className="scroll-area__thumb" style={{ height: `${thumbHeight}px`, transform: `translateY(${thumbTop}px)` }} onPointerDown={startThumbDrag} /></div>
  </div>;
}
