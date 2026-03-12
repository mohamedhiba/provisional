type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="surface-panel-soft ambient-ring rounded-[1.75rem] p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
        {label}
      </p>
      <p className="font-display mt-3 text-3xl tracking-tight text-stone-50 sm:text-[2.15rem]">
        {value}
      </p>
      {detail ? <p className="mt-3 text-sm leading-6 text-stone-400">{detail}</p> : null}
    </div>
  );
}
