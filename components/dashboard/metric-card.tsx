type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
        {value}
      </p>
      {detail ? <p className="mt-3 text-sm leading-6 text-stone-400">{detail}</p> : null}
    </div>
  );
}
