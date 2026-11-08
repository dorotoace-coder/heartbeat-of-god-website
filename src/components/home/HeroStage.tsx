"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * HeroStage — the 3D shell around the home hero.
 *
 * It renders the <section> and drives two sets of CSS custom properties on it:
 *   --tx / --ty   tilt input in [-1, 1]; every .hero3d-layer reads them and
 *                 moves by its own depth (--d), giving layered parallax.
 *   --sx / --sy   where the sun sits on screen in the cover-fitted dawn scene,
 *                 so the CSS god rays radiate from it at every viewport size.
 *
 * Input: pointer on desktop, device orientation on phones that allow it without
 * a permission prompt, otherwise a slow ambient drift. All smoothing runs in one
 * requestAnimationFrame loop with lerp, writes only CSS variables (no React
 * state, no re-render, no layout), pauses when the hero is off screen or the tab
 * is hidden, and never starts when the visitor prefers reduced motion.
 */

// Scene geometry (public/hero-dawn.webp, 2048×1143) and where the sun is in it.
const IMG_W = 2048;
const IMG_H = 1143;
const SUN_X = 0.755; // fraction of image width
const SUN_Y = 0.37; // fraction of image height
const POS_X = 0.7; // matches object-position 70% on the scene <Image>

type Props = {
  children: ReactNode;
  className?: string;
  labelledBy: string;
};

export default function HeroStage({ children, className, labelledBy }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ── Sun placement: mirror object-cover + object-position, in layer-local coords ──
    const place = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const scale = Math.max(w / IMG_W, h / IMG_H);
      const iw = IMG_W * scale;
      const ih = IMG_H * scale;
      const x = (w - iw) * POS_X + iw * SUN_X;
      const y = (h - ih) * 0.5 + ih * SUN_Y;
      // Rays live inside the scene layer, so layer-local (pre-transform) coords are right.
      el.style.setProperty("--sx", `${x.toFixed(1)}px`);
      el.style.setProperty("--sy", `${y.toFixed(1)}px`);
      el.dataset.sunReady = "true";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      return () => ro.disconnect();
    }

    // ── Tilt input ──
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let mode: "pointer" | "orientation" | "ambient" = "ambient";
    let raf = 0;
    let visible = true;
    let lastOrientation = 0;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      targetY = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      mode = "orientation";
      lastOrientation = performance.now();
      // gamma: left/right tilt (-90..90); beta: front/back (-180..180), phones are held ~45°.
      targetX = Math.max(-1, Math.min(1, e.gamma / 25));
      targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    };

    type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    const DOEvent = (typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined) as DOE | undefined;
    const orientationNeedsPermission = !!DOEvent && typeof DOEvent.requestPermission === "function";

    if (finePointer) {
      mode = "pointer";
      el.addEventListener("pointermove", onPointer, { passive: true });
      el.addEventListener("pointerleave", onPointerLeave, { passive: true });
    } else if (DOEvent && !orientationNeedsPermission) {
      // Some browsers expose the event but never fire it; ambient drift until data arrives.
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    }

    const tick = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;

      if (mode === "orientation" && t - lastOrientation > 2000) mode = "ambient";
      if (mode === "ambient") {
        targetX = Math.sin(t * 0.00021) * 0.55;
        targetY = Math.cos(t * 0.00016) * 0.4;
      }

      const k = mode === "pointer" ? 0.075 : 0.05; // lerp factor
      curX += (targetX - curX) * k;
      curY += (targetY - curY) * k;
      el.style.setProperty("--tx", curX.toFixed(4));
      el.style.setProperty("--ty", curY.toFixed(4));

      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(el);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    el.dataset.motion = "on";
    start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  return (
    <section ref={ref} aria-labelledby={labelledBy} className={`hero3d ${className ?? ""}`}>
      {children}
    </section>
  );
}
