import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Hero } from "@/components/marketing/hero";
import { env } from "@/lib/env";
import { onboardingDeviceCookieKey } from "@/lib/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const hasSeenApp = Boolean(cookieStore.get(onboardingDeviceCookieKey)?.value);
  let hasAuthenticatedSession = false;

  if (env.hasSupabaseClientEnv) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasAuthenticatedSession = Boolean(user);
    } catch {
      hasAuthenticatedSession = false;
    }
  }

  if (hasSeenApp || hasAuthenticatedSession) {
    redirect("/today");
  }

  return <Hero />;
}
