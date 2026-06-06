import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Always-visible content below the grab bar (e.g. the report bar). Not draggable. */
  peek: ReactNode;
  /** Scrollable body revealed when expanded. */
  children: ReactNode;
};

/**
 * Mobile bottom sheet with two snap points. The grab bar + `peek` stay visible
 * when collapsed (sized to their content); dragging the grab bar up reveals the
 * scrollable body. Non-modal: the map stays visible/interactive behind it.
 */
export default function BottomSheet({ open, onOpenChange, peek, children }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null); // grab bar + peek (the visible-when-collapsed region)
  const [peekPx, setPeekPx] = useState(150);
  const [containerPx, setContainerPx] = useState(0);
  const drag = useRef({ startY: 0, base: 0, active: false });

  // Measure the visible peek region and the sheet height.
  useLayoutEffect(() => {
    const measure = () => {
      if (topRef.current) setPeekPx(topRef.current.offsetHeight);
      if (elRef.current) setContainerPx(elRef.current.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (topRef.current) ro.observe(topRef.current);
    if (elRef.current) ro.observe(elRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const collapsed = containerPx > 0 ? Math.max(containerPx - peekPx, 0) : null;
  const restingPx = open ? 0 : collapsed;
  const resting =
    restingPx != null ? `translateY(${restingPx}px)` : `translateY(calc(100% - ${peekPx}px))`;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el || collapsed == null) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startY: e.clientY, base: open ? 0 : collapsed, active: true };
    el.style.transition = 'none';
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el || !drag.current.active || collapsed == null) return;
    const dy = e.clientY - drag.current.startY;
    const ty = Math.min(Math.max(drag.current.base + dy, 0), collapsed);
    el.style.transform = `translateY(${ty}px)`;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el || !drag.current.active || collapsed == null) return;
    drag.current.active = false;
    const dy = e.clientY - drag.current.startY;
    let next = open;
    if (dy < -40) next = true;
    else if (dy > 40) next = false;
    el.style.transition = '';
    el.style.transform = next ? 'translateY(0)' : `translateY(${collapsed}px)`;
    if (next !== open) onOpenChange(next);
  };

  return (
    <div
      ref={elRef}
      className="fixed inset-x-0 bottom-0 z-[1500] flex h-[86dvh] flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        transform: resting,
        background: 'var(--glass-surface)',
        borderTop: '1px solid var(--line-1)',
        borderTopLeftRadius: 'var(--radius-xl)',
        borderTopRightRadius: 'var(--radius-xl)',
        boxShadow: 'var(--inset-top), var(--shadow-sheet)',
        backdropFilter: 'blur(var(--blur-sheet))',
        WebkitBackdropFilter: 'blur(var(--blur-sheet))',
      }}
    >
      {/* Visible-when-collapsed region */}
      <div ref={topRef} className="shrink-0">
        {/* Grab bar — the only draggable element */}
        <div
          className="no-tap cursor-grab active:cursor-grabbing pt-2.5 pb-1.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => onOpenChange(!open)}
        >
          <div className="mx-auto h-[5px] w-[38px] rounded-full" style={{ background: 'var(--ink-400)' }} />
        </div>
        <div className="px-3 pb-2">{peek}</div>
      </div>

      {/* Scrollable body */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] ${
          open ? '' : 'pointer-events-none'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
