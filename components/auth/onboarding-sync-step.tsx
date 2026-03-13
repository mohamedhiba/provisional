"use client";

import { Cloud, Mail, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-stone-100 outline-none transition focus:border-amber-300/40";

type OnboardingSyncStepProps = {
  nextPath?: string;
};

export function OnboardingSyncStep({
  nextPath = "/today",
}: OnboardingSyncStepProps) {
  const { canSync, requestMagicLink, statusLabel, user } = useAuthSession();
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const isConnected = statusLabel === "connected";

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const result = await requestMagicLink({
      email,
      nextPath,
    });

    setMessage(result.message);
    setIsSubmitting(false);
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Cross-device sync
            </p>
            <h3 className="mt-3 font-sans text-[1.8rem] font-semibold tracking-[-0.03em] text-stone-50">
              {isConnected
                ? `Connected on ${user?.email ?? "your account"}`
                : canSync
                  ? "Optional now. Useful later."
                  : "Device-only for now"}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300">
              {isConnected
                ? "This device is already attached to your account. You can go straight into Proof."
                : canSync
                  ? "Send yourself a magic link if you want this system to follow you to other devices. If you skip, Proof still works fully on this device."
                  : "Supabase auth is not available in this environment, so Proof will stay device-only until sync is configured."}
            </p>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-amber-100">
            {isConnected ? <Cloud className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
          </span>
        </div>
      </div>

      {isConnected || !canSync ? null : (
        <form
          className="rounded-[1.6rem] border border-white/8 bg-black/20 p-5 sm:p-6"
          onSubmit={handleMagicLink}
        >
          <label className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Email
          </label>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <input
              className={inputClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full justify-center md:w-auto"
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "Sending link..." : "Send magic link"}
            </Button>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            The link will come back through Proof and keep this device as the canonical source if there is overlapping data.
          </p>
        </form>
      )}

      {message ? (
        <div className="rounded-[1.4rem] border border-emerald-300/15 bg-emerald-300/10 px-4 py-4 text-sm leading-6 text-stone-200">
          {message}
        </div>
      ) : null}
    </div>
  );
}
