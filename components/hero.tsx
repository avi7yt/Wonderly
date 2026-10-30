"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Mountain } from "lucide-react";
import SearchBar from "./searchBar";
import { SCENE_SCROLL_VH } from "@/lib/sceneConfig";

// Three.js only runs in the browser
const TravelScene = dynamic(() => import("./travelScene"), { ssr: false });

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // intro (headline + search)
  const introOpacity = useTransform(p, [0, 0.12, 0.2], [1, 1, 0]);
  const introY = useTransform(p, [0, 0.2], [0, -70]);
  const introPointer = useTransform(introOpacity, (v) => (v > 0.3 ? "auto" : "none"));
  // scroll hint
  const hintOpacity = useTransform(p, [0, 0.06], [1, 0]);
  // chapter caption
  const chapOpacity = useTransform(p, [0.26, 0.36, 0.52, 0.6], [0, 1, 1, 0]);
  const chapY = useTransform(p, [0.26, 0.36, 0.6], [40, 0, -40]);
  // quote
  const quoteOpacity = useTransform(p, [0.64, 0.74, 0.88, 0.95], [0, 1, 1, 0]);
  const quoteY = useTransform(p, [0.64, 0.74, 0.95], [40, 0, -30]);
  // final call to action
  const ctaOpacity = useTransform(p, [0.9, 0.98], [0, 1]);
  const ctaPointer = useTransform(ctaOpacity, (v) => (v > 0.5 ? "auto" : "none"));
  // altitude HUD
  const altitude = useTransform(p, (v) => `${Math.round(3500 + v * 1859).toLocaleString("en-US")} m`);

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: `${(1 + SCENE_SCROLL_VH) * 100}vh` }}
    >
      <TravelScene />

      <div className="sticky top-0 z-10 h-screen overflow-hidden">
        {/* readability gradients */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(8,10,24,0.38)_100%)]" />

        {/* 1. headline + search */}
        <motion.div
          style={{ opacity: introOpacity, y: introY, pointerEvents: introPointer }}
          className="absolute inset-x-0 top-[14vh] px-4 text-center"
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200 drop-shadow"
          >
            Leh · Ladakh · Beyond
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] sm:text-6xl md:text-7xl"
          >
            Your next adventure <span className="text-amber-300">starts here</span>
          </motion.h1>
        </motion.div>

        {/* search bar sits low so the jeep stays visible above it */}
        <motion.div
          style={{ opacity: introOpacity, y: introY, pointerEvents: introPointer }}
          className="absolute inset-x-0 bottom-[14vh] px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
          >
            <SearchBar />
          </motion.div>
        </motion.div>

        {/* 2. chapter caption */}
        <motion.div
          style={{ opacity: chapOpacity, y: chapY }}
          className="pointer-events-none absolute bottom-[16vh] left-6 max-w-md text-white sm:left-16"
        >
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
            <Mountain className="h-4 w-4" /> Chapter 01
          </p>
          <h2 className="text-3xl font-bold leading-tight drop-shadow-lg sm:text-5xl">
            The road to the roof of the world
          </h2>
          <p className="mt-3 text-white/80">Khardung La, 5,359 m. Thin air, endless sky.</p>
        </motion.div>

        {/* 3. quote */}
        <motion.div
          style={{ opacity: quoteOpacity, y: quoteY }}
          className="pointer-events-none absolute inset-x-0 bottom-[14vh] px-6 text-center text-white"
        >
          <h2 className="mx-auto max-w-3xl text-3xl font-light italic leading-snug drop-shadow-lg sm:text-5xl">
            Some roads are made for two.
          </h2>
        </motion.div>

        {/* 4. call to action */}
        <motion.div
          style={{ opacity: ctaOpacity, pointerEvents: ctaPointer }}
          className="absolute inset-x-0 bottom-[7vh] flex justify-center"
        >
          <a
            href="#destinations"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-3 font-semibold text-slate-900 shadow-xl shadow-orange-900/30 transition hover:scale-105"
          >
            Start exploring <ChevronDown className="h-5 w-5" />
          </a>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-0 text-xs uppercase tracking-[0.3em] text-white/80"
        >
          Scroll to ride
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </motion.div>

        {/* altitude HUD */}
        <div className="pointer-events-none absolute bottom-6 left-6 hidden text-white/80 sm:left-16 sm:block">
          <p className="text-[10px] uppercase tracking-[0.3em]">Altitude</p>
          <motion.p className="text-xl font-semibold tabular-nums">{altitude}</motion.p>
        </div>
      </div>
    </section>
  );
}
