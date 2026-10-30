"use client";
import { motion } from "framer-motion";
import SearchBar from "./searchBar";

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-sky-100 to-white px-4 py-24 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold text-slate-900 md:text-6xl"
      >
        Your next adventure <span className="text-sky-600">starts here</span>
      </motion.h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        Explore handpicked destinations and book your dream trip in minutes.
      </p>
      <div className="mt-10">
        <SearchBar />
      </div>
    </section>
  );
}
