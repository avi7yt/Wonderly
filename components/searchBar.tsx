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
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-xl md:flex-row md:items-center"
    >
      <label className="flex flex-1 items-center gap-2 px-3 text-slate-700">
        <MapPin className="h-5 w-5 text-sky-600" />
        <input
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="Where to?"
          className="w-full py-2 outline-none"
        />
      </label>
      <label className="flex flex-1 items-center gap-2 px-3 text-slate-700">
        <Calendar className="h-5 w-5 text-sky-600" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full py-2 outline-none"
        />
      </label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-white hover:bg-sky-700">
        <Search className="h-4 w-4" /> Search
      </button>
    </form>
  );
}
