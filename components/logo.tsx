import { ProofMark } from "@/components/proof-mark";

export function Logo() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_32%_22%,rgba(244,222,166,0.26),transparent_30%),linear-gradient(145deg,rgba(22,28,38,0.98),rgba(8,11,16,0.96))] shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,244,214,0.08),transparent_22%),radial-gradient(circle_at_50%_90%,rgba(53,73,122,0.18),transparent_42%)]" />
        <ProofMark className="relative h-10 w-10 drop-shadow-[0_0_14px_rgba(241,223,183,0.18)]" />
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
