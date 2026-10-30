"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X, Compass, Plane } from "lucide-react";
import { SCENE_SCROLL_VH } from "@/lib/sceneConfig";

const links = [
  { href: "/", label: "Home" },
  { href: "/#destinations", label: "Destinations" },
  { href: "/packages", label: "Packages" },
  { href: "/#contact", label: "Contact" },
];

type Mode = "top" | "hero" | "page";

const modeClass: Record<Mode, string> = {
  top: "border-white/10 bg-white/5 text-white backdrop-blur-sm",
  hero: "border-white/15 bg-black/30 text-white shadow-lg shadow-black/20 backdrop-blur-xl",
  page: "border-slate-200/70 bg-white/80 text-slate-800 shadow-lg shadow-slate-900/5 backdrop-blur-xl",
};

export default function Navbar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("top");
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      setMode(y < 30 ? "top" : y < vh * (SCENE_SCROLL_VH + 0.9) ? "hero" : "page");
      // after the cinematic intro: hide when scrolling down, show when scrolling up
      if (y > vh * (SCENE_SCROLL_VH + 0.9)) {
        if (y > last + 6) setHidden(true);
        else if (y < last - 6) setHidden(false);
      } else setHidden(false);
      last = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const light = mode !== "page" && !open;

  return (
    <>
      <motion.header
        animate={{ y: hidden && !open ? -110 : 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
      >
        <nav
          className={`relative mx-auto flex max-w-6xl items-center justify-between rounded-full border px-3 py-2 transition-all duration-500 sm:px-4 ${
            open ? modeClass.hero : modeClass[mode]
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 pl-1 text-lg font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-slate-900">
              <Plane />
            </span>
            Wanderly
          </Link>

          <ul
            className="hidden items-center md:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {links.map((l) => {
              const active = l.href === pathname;
              return (
                <li key={l.href} className="relative">
                  <Link
                    href={l.href}
                    onMouseEnter={() => setHovered(l.href)}
                    className="relative z-10 block px-4 py-2 text-sm font-medium"
                  >
                    {l.label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-1 w-1 rounded-full bg-amber-400" />
                    )}
                  </Link>
                  {hovered === l.href && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                      className={`absolute inset-0 rounded-full ${light ? "bg-white/15" : "bg-slate-900/5"}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href="/booking"
              className="hidden rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-orange-900/20 transition hover:scale-105 sm:block"
            >
              Book Now
            </Link>
            <button
              className="grid h-9 w-9 place-items-center rounded-full md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* scroll progress */}
          <motion.div
            style={{ scaleX: progress }}
            className="absolute -bottom-px left-8 right-8 h-[2px] origin-left rounded-full bg-gradient-to-r from-amber-300 to-orange-500"
          />
        </nav>
      </motion.header>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col justify-center gap-2 bg-slate-950/90 px-8 backdrop-blur-2xl md:hidden"
          >
            {links.map((l, i) => (
              <motion.div
                key={l.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i + 0.1 }}
              >
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-4xl font-bold text-white"
                >
                  {l.label}
                </Link>
              </motion.div>
            ))}
            <Link
              href="/booking"
              onClick={() => setOpen(false)}
              className="mt-6 w-fit rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-7 py-3 font-semibold text-slate-900"
            >
              Book Now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
