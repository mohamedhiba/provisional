type PillarProgressProps = {
  name: string;
  progress: number;
  valueLabel: string;
  detail: string;
};

export function PillarProgress({ name, progress, valueLabel, detail }: PillarProgressProps) {
  const width = `${Math.round(progress * 100)}%`;

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-100">{name}</p>
        <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{valueLabel}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-400">{detail}</p>
      <div className="mt-4 h-2 rounded-full bg-white/8">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,_rgba(245,158,11,0.95),_rgba(239,68,68,0.9))]"
          style={{ width }}
        />
      </div>
    </div>
  );
}
