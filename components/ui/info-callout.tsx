import Link from "next/link";

type InfoCalloutProps = {
  eyebrow: string;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
};

export function InfoCallout({
  eyebrow,
  title,
  body,
  actionHref,
  actionLabel,
}: InfoCalloutProps) {
  return (
    <section className="surface-panel-soft rounded-[1.75rem] p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl tracking-tight text-stone-50">{title}</h3>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">{body}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-stone-100 transition hover:bg-white/[0.1]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}

