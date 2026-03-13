import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

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
          className={`mt-5 ${buttonStyles({ variant: "secondary", size: "md" })}`}
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
