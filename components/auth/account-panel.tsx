"use client";

import { Cloud, Link2, LogOut, Mail, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthSession } from "@/components/providers/auth-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-11 w-full rounded-2xl border border-white/14 bg-white/[0.08] px-4 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300/40";

export function AccountPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { canSync, hasLoaded, requestMagicLink, signOut, statusLabel, user } = useAuthSession();
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  const isConnected = statusLabel === "connected";

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const result = await requestMagicLink({
      email,
      nextPath: pathname || "/today",
    });

    setMessage(result.message);
    setIsSubmitting(false);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setMessage("");

    const result = await signOut();

    if (result.ok) {
      router.refresh();
      window.location.reload();
      return;
    }

    setMessage(result.message);
    setIsSigningOut(false);
  }

  return (
    <section className="surface-panel-soft rounded-[1.75rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
            Sync status
          </p>
          <h3 className="mt-3 text-lg tracking-tight text-stone-50">
            {isConnected
              ? "Connected across devices"
              : canSync
                ? "Sync is available"
                : "Device-only mode"}
          </h3>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-amber-100">
          {isConnected ? <Cloud className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
          {hasLoaded
            ? isConnected
              ? "Connected"
              : canSync
                ? "Sync available"
                : "Sync unavailable"
            : "Checking"}
        </p>
        <p className="mt-2 text-sm font-medium text-stone-50">
          {hasLoaded
            ? isConnected
              ? `Connected on ${user?.email ?? "your account"}`
              : canSync
                ? "This device is still local-first."
                : "Supabase public auth keys are missing."
            : "Checking current session..."}
        </p>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          {isConnected
            ? "Use this panel later for account management. Your current device stays canonical when there is overlap."
            : canSync
              ? "Finish the app in device-only mode or send yourself a magic link whenever you want your setup available on other devices."
              : "Device-only mode still works, but cross-device sync is unavailable until auth is configured."}
        </p>
      </div>

      {isConnected ? (
        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
          <p className="text-xs leading-6 text-stone-500">
            Sign-out keeps this device usable. If you come back later, you can reconnect with a fresh link.
          </p>
        </div>
      ) : canSync ? (
        <form className="mt-4 space-y-4" onSubmit={handleMagicLink}>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
              Sync email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClassName}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "Sending link..." : "Send magic link"}
            </Button>
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em]",
                "text-stone-400",
              )}
            >
              <Link2 className="mr-2 h-3.5 w-3.5" />
              Device-only until you connect
            </span>
          </div>
        </form>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm leading-6 text-stone-300">{message}</p>
      ) : null}
    </section>
  );
}
