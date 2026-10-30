"use client";
import { useEffect } from "react";
import Lenis from "lenis";

// Mounts Lenis once for the whole site. Renders nothing.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.085, // lower = smoother / slower to catch up
      wheelMultiplier: 0.9,
      smoothWheel: true,
      anchors: true, // <a href="#id"> scrolls smoothly too
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
