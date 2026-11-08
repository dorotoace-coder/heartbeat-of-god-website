"use client";

import { useEffect, useRef } from "react";

/**
 * HeroEmbers — a few drifting gold light motes on a single canvas.
 * Decorative only (aria-hidden). Starts after the page is idle so it never
 * competes with LCP, caps device pixel ratio, pauses off screen / in hidden
 * tabs, and is not drawn at all when the visitor prefers reduced motion.
 */
type Mote = { x: number; y: number; r: number; vx: number; vy: number; a: number; phase: number; speed: number };

export default function HeroEmbers({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let raf = 0;
    let visible = true;
    let last = 0;
    let started = false;

    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(0.12 + Math.random() * 0.35),
      a: 0.25 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.4,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 768 ? 16 : 32;
      motes = Array.from({ length: count }, () => spawn(true));
    };

    const draw = (t: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? Math.min(48, t - last) / 16.67 : 1;
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += (m.vx + Math.sin(t * 0.0006 + m.phase) * 0.15) * dt;
        m.y += m.vy * dt;
        if (m.y < -10 || m.x < -10 || m.x > w + 10) motes[i] = spawn(false);
        const flicker = 0.65 + 0.35 * Math.sin(t * 0.002 * m.speed + m.phase);
        const alpha = m.a * flicker;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
        g.addColorStop(0, `rgba(255, 236, 180, ${alpha})`);
        g.addColorStop(0.35, `rgba(217, 180, 90, ${alpha * 0.45})`);
        g.addColorStop(1, "rgba(217, 180, 90, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    const start = () => {
      if (started && !raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };

    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    const onVis = () => start();

    const boot = () => {
      started = true;
      resize();
      ro.observe(canvas);
      io.observe(canvas);
      document.addEventListener("visibilitychange", onVis);
      canvas.dataset.ready = "true";
      start();
    };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(boot, { timeout: 2000 })
      : window.setTimeout(boot, 800);

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
      else window.clearTimeout(idle as number);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
