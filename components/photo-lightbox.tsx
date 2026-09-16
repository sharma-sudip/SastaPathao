"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Instagram-style photo viewer, opened by clicking an <Avatar> that has a
 * real photo: double-click/double-tap to zoom, pinch (touch) or scroll
 * wheel (desktop) to zoom further, drag to pan while zoomed. Tapping the
 * background (not the image itself) while at 1x closes it.
 */
export function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  // Only for the transition style below (snap back when released, no
  // transition while actively dragging/pinching) -- everything that affects
  // gesture math itself stays in refs, read only from event handlers, never
  // during render.
  const [isGesturing, setIsGesturing] = useState(false);
  const draggingRef = useRef(false);
  // Active touch/mouse pointers, keyed by pointerId -- two at once means a
  // pinch gesture; one (while already zoomed) means a pan/drag.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; translate: { x: number; y: number } } | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    // Don't let the page behind the overlay scroll while it's open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function resetZoom() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function toggleZoom() {
    if (scale > 1) resetZoom();
    else setScale(DOUBLE_TAP_SCALE);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsGesturing(true);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: distance(a, b), scale };
    } else if (pointers.current.size === 1 && scale > 1) {
      draggingRef.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, translate };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const next = (distance(a, b) / pinchStart.current.distance) * pinchStart.current.scale;
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
    } else if (draggingRef.current && dragStart.current) {
      setTranslate({
        x: dragStart.current.translate.x + (e.clientX - dragStart.current.x),
        y: dragStart.current.translate.y + (e.clientY - dragStart.current.y),
      });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLImageElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      draggingRef.current = false;
      dragStart.current = null;
      setIsGesturing(false);
      if (scale <= MIN_SCALE) resetZoom();
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLImageElement>) {
    e.preventDefault();
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * 0.01)));
  }

  // Portaled straight to <body> -- rendered inline, `fixed` here would
  // position relative to the nearest ancestor with a `filter`/
  // `backdrop-filter`/`transform` (the nav's own blurred header has one)
  // instead of the viewport, which is what made this render clipped to a
  // sliver of the screen when opened from an avatar inside that header.
  return createPortal(
    <div
      // z-[1200]: has to clear <Nav>'s sticky header (z-[1100]) -- z-50 lost
      // to it once this was portaled to document.body, a plain sibling of
      // the header in the stacking order rather than something rendered
      // after it in the same DOM subtree.
      className="fixed inset-0 z-[1200] flex touch-none items-center justify-center bg-black/90"
      onClick={() => scale === 1 && onClose()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
      >
        <X className="h-5 w-5" strokeWidth={2.5} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- see components/avatar.tsx's comment on why user photos use plain <img> */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={toggleZoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        draggable={false}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isGesturing ? "none" : "transform 150ms ease-out",
          cursor: scale > 1 ? "grab" : "zoom-in",
        }}
        className="max-h-[85vh] max-w-[90vw] touch-none select-none rounded-lg object-contain"
      />
    </div>,
    document.body
  );
}
