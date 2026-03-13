import { env } from "@/lib/env";

export type AuthAttachmentStatus =
  | "already-connected"
  | "device-linked"
  | "merge-completed"
  | "account-only"
  | "profile-created";

export function sanitizeNextPath(value: string | null | undefined, defaultPath = "/today") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return defaultPath;
  }

  return value;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  return /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(origin);
}

export function resolveAppOrigin(fallbackOrigin?: string | null) {
  const configuredOrigin = normalizeOrigin(env.publicAppUrl);
  const runtimeOrigin = normalizeOrigin(fallbackOrigin);

  if (runtimeOrigin && isLocalOrigin(runtimeOrigin)) {
    return runtimeOrigin;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (runtimeOrigin) {
    return runtimeOrigin;
  }

  return "http://localhost:3000";
}

export function createAuthCallbackUrl(nextPath: string, runtimeOrigin?: string | null) {
  const url = new URL("/auth/callback", resolveAppOrigin(runtimeOrigin));
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return url.toString();
}

export function createAuthCompletePath(input: {
  status: "success" | "error";
  nextPath?: string | null;
  mode?: AuthAttachmentStatus | null;
}) {
  const params = new URLSearchParams({
    status: input.status,
    next: sanitizeNextPath(input.nextPath),
  });

  if (input.mode) {
    params.set("mode", input.mode);
  }

  return `/auth/complete?${params.toString()}`;
}
