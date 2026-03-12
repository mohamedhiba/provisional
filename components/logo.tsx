export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(243,208,118,0.3),_transparent_55%),linear-gradient(135deg,_rgba(237,89,58,0.22),_rgba(10,12,16,0.8))] text-sm font-semibold tracking-[0.3em] text-stone-100">
        P
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Proof</p>
        <p className="text-sm text-stone-300">Execution accountability system</p>
      </div>
    </div>
  );
}
