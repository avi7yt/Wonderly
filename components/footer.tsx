export default function Footer() {
  return (
    <footer id="contact" className="relative z-10 bg-slate-900 py-12 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-lg font-semibold text-white">Wanderly</p>
        <p className="mt-2 text-sm">Discover places. Make memories.</p>
        <p className="mt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} Wanderly. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
