"use client";
import { useState } from "react";
import { MapPin, Calendar, Search } from "lucide-react";

export default function SearchBar() {
  const [where, setWhere] = useState("");
  const [date, setDate] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        console.log({ where, date });
      }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-white/30 bg-white/90 p-3 text-left shadow-2xl shadow-black/30 backdrop-blur-xl md:flex-row md:items-center"
    >
      <label className="flex flex-1 items-center gap-2 px-3 text-slate-700">
        <MapPin className="h-5 w-5 text-orange-500" />
        <input
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="Where to?"
          className="w-full bg-transparent py-2 outline-none placeholder:text-slate-400"
        />
      </label>
      <label className="flex flex-1 items-center gap-2 px-3 text-slate-700">
        <Calendar className="h-5 w-5 text-orange-500" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent py-2 outline-none"
        />
      </label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-semibold text-slate-900 transition hover:brightness-110">
        <Search className="h-4 w-4" /> Search
      </button>
    </form>
  );
}
