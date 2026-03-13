"use client";

import { Cloud, LogOut, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { Button, buttonStyles } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const inputClassName =
  "h-11 w-full rounded-2xl border border-white/12 bg-white/[0.08] px-4 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300/40";

export function AccountPanel() {
  const pathname = usePathname();
  const [supabase] = useState(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let active = true;

    async function loadUser() {
      const { data } = await client.auth.getUser();

      if (!active) {
        return;
      }

      setUser(data.user ?? null);
    }

    void loadUser();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("auth") !== "error") {
      return;
    }

    setMessage("The sign-in link could not be completed. Request a fresh link and try again.");
  }, []);

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Account sync is unavailable until Supabase public keys are configured.");
      return;
    }

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage("Enter an email address to receive a magic link.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      const nextPath = pathname || "/today";
      redirectUrl.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        throw error;
      }

      setMessage(
        "Magic link sent. Open it on any device and this account will start syncing there.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send a sign-in link right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setIsSigningOut(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign out right now.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <section className="surface-panel-soft rounded-[1.75rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
            Account sync
          </p>
          <h3 className="mt-3 text-lg tracking-tight text-stone-50">
            {user ? "Synced across devices" : "Sign in to sync"}
          </h3>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-amber-100">
          {user ? <Cloud className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
      </div>

      {user ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-[1.35rem] border border-emerald-300/16 bg-emerald-300/10 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/80">
              Connected
            </p>
            <p className="mt-2 text-sm font-medium text-stone-50">
              {user.email ?? "Signed in"}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              This account now follows your data across devices wherever you use the same email link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleMagicLink}>
          <p className="text-sm leading-6 text-stone-300">
            Use a magic link so the same Proof data is available on other devices. Existing device data will attach to this account after sign-in.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.24em] text-stone-500">
              Email
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
          <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
            <Mail className="mr-2 h-4 w-4" />
            {isSubmitting ? "Sending link..." : "Email me a magic link"}
          </Button>
        </form>
      )}

      {message ? (
        <p className="mt-4 text-sm leading-6 text-stone-300">{message}</p>
      ) : null}
    </section>
  );
}
