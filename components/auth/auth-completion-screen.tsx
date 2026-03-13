"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Cloud, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { useAuthSession } from "@/components/providers/auth-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { sanitizeNextPath, type AuthAttachmentStatus } from "@/lib/auth-flow";

function getStatusCopy(
  mode: AuthAttachmentStatus | null,
  email: string | null,
) {
  switch (mode) {
    case "already-connected":
      return {
        eyebrow: "Sync confirmed",
        title: "This device is already connected.",
        body: email
          ? `Proof is synced on ${email}. Your current device can keep using the same account without losing its local setup.`
          : "Proof is already synced on this device. Your current setup stays intact.",
      };
    case "device-linked":
      return {
        eyebrow: "Device linked",
        title: "Your current device is now the account source of truth.",
        body: "The setup you built on this device is now attached to your account, so signing in elsewhere will pull from this version first.",
      };
    case "merge-completed":
      return {
        eyebrow: "Merge completed",
        title: "This device won the merge.",
        body: "Proof kept the current device as canonical, then pulled in any account-only records that were missing. Overlapping data stayed with this device’s version.",
      };
    case "account-only":
      return {
        eyebrow: "Account ready",
        title: "Your synced account is active here now.",
        body: email
          ? `Proof is connected on ${email}. Existing account data is available on this device now.`
          : "Existing account data is available on this device now.",
      };
    case "profile-created":
      return {
        eyebrow: "Account created",
        title: "Sync is ready.",
        body: email
          ? `Proof created a synced account for ${email}.`
          : "Proof created a synced account for this email.",
      };
    default:
      return {
        eyebrow: "Signed in",
        title: "Your account is connected.",
        body: email
          ? `Proof is now connected on ${email}.`
          : "Proof is now connected.",
      };
  }
}

type AuthCompletionScreenProps = {
  status: string | null;
  nextPath: string | null;
  mode: AuthAttachmentStatus | null;
};

export function AuthCompletionScreen({
  status,
  nextPath,
  mode,
}: AuthCompletionScreenProps) {
  const router = useRouter();
  const { hasLoaded, statusLabel, user } = useAuthSession();

  const safeNextPath = sanitizeNextPath(nextPath);
  const isSuccess = status === "success";
  const copy = getStatusCopy(mode, user?.email ?? null);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(safeNextPath);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSuccess, router, safeNextPath]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12 sm:px-10">
      <section className="surface-panel w-full rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-stone-500">
              {isSuccess ? copy.eyebrow : "Sign-in failed"}
            </p>
            <h1 className="mt-4 text-4xl tracking-tight text-stone-50">
              {isSuccess ? copy.title : "The sign-in link did not complete."}
            </h1>
          </div>
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${
              isSuccess
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                : "border-amber-300/20 bg-amber-300/10 text-amber-100"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <TriangleAlert className="h-5 w-5" />
            )}
          </span>
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
          <p className="text-sm leading-7 text-stone-300">
            {isSuccess
              ? copy.body
              : "Request a fresh magic link from Proof and open the newest email. Old links or mismatched callback settings can bounce you to the wrong place."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-400">
            <span className="rounded-full border border-white/10 px-3 py-2">
              {hasLoaded
                ? statusLabel === "connected"
                  ? `Connected${user?.email ? ` on ${user.email}` : ""}`
                  : statusLabel === "device-only"
                    ? "Device-only mode"
                    : "Sync unavailable"
                : "Checking session..."}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              Next stop: {safeNextPath}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSuccess ? (
            <>
              <Button onClick={() => router.replace(safeNextPath)} size="lg">
                <Cloud className="mr-2 h-4 w-4" />
                Continue now
              </Button>
              <p className="text-sm leading-6 text-stone-500">
                Redirecting automatically in a moment.
              </p>
            </>
          ) : (
            <>
              <Link
                href={safeNextPath}
                className={buttonStyles({ variant: "primary", size: "lg" })}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Return to Proof
              </Link>
              <Link
                href="/onboarding"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                Restart onboarding
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
