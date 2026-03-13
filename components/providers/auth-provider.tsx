"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createAuthCallbackUrl, sanitizeNextPath } from "@/lib/auth-flow";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthActionResult = {
  ok: boolean;
  message: string;
};

type AuthContextValue = {
  user: User | null;
  hasLoaded: boolean;
  canSync: boolean;
  statusLabel: "connected" | "device-only" | "sync-unavailable";
  requestMagicLink: (input: { email: string; nextPath?: string }) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!client) {
      setHasLoaded(true);
      return;
    }

    const authClient = client;
    let active = true;

    async function loadUser() {
      const { data } = await authClient.auth.getUser();

      if (!active) {
        return;
      }

      setUser(data.user ?? null);
      setHasLoaded(true);
    }

    void loadUser();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUser(session?.user ?? null);
      setHasLoaded(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  async function requestMagicLink(input: { email: string; nextPath?: string }) {
    if (!client) {
      return {
        ok: false,
        message: "Account sync is unavailable until Supabase public keys are configured.",
      } satisfies AuthActionResult;
    }

    const normalizedEmail = input.email.trim();

    if (!normalizedEmail) {
      return {
        ok: false,
        message: "Enter an email address to receive a magic link.",
      } satisfies AuthActionResult;
    }

    try {
      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: createAuthCallbackUrl(
            sanitizeNextPath(input.nextPath),
            typeof window === "undefined" ? null : window.location.origin,
          ),
        },
      });

      if (error) {
        throw error;
      }

      return {
        ok: true,
        message:
          "Magic link sent. Open it on any device and Proof will connect there.",
      } satisfies AuthActionResult;
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to send a sign-in link right now.",
      } satisfies AuthActionResult;
    }
  }

  async function signOut() {
    if (!client) {
      return {
        ok: false,
        message: "Account sync is unavailable right now.",
      } satisfies AuthActionResult;
    }

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      return {
        ok: true,
        message: "Signed out.",
      } satisfies AuthActionResult;
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to sign out right now.",
      } satisfies AuthActionResult;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hasLoaded,
        canSync: Boolean(client),
        statusLabel: client ? (user ? "connected" : "device-only") : "sync-unavailable",
        requestMagicLink,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthSession must be used inside AuthProvider.");
  }

  return context;
}
