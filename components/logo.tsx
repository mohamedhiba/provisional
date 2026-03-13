export function Logo() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,_rgba(244,222,166,0.55),_transparent_35%),linear-gradient(145deg,_rgba(215,168,91,0.34),_rgba(130,180,172,0.16)_45%,_rgba(8,10,13,0.9))] text-sm font-semibold tracking-[0.32em] text-stone-100 shadow-[0_16px_32px_rgba(0,0,0,0.22)]">
        P
      </div>
      <div className="min-w-0">
        <p className="font-display text-[2rem] leading-none tracking-tight text-stone-50">
          Proof
        </p>
        <p className="mt-1 max-w-[14rem] text-[11px] uppercase tracking-[0.28em] text-stone-500">
          Execution accountability
        </p>
      </div>
    </div>
  );
}
