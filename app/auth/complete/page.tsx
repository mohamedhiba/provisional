import { AuthCompletionScreen } from "@/components/auth/auth-completion-screen";
import type { AuthAttachmentStatus } from "@/lib/auth-flow";

type AuthCompletePageProps = {
  searchParams: Promise<{
    status?: string;
    next?: string;
    mode?: string;
  }>;
};

export default async function AuthCompletePage({
  searchParams,
}: AuthCompletePageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_22%),linear-gradient(180deg,_#08090c,_#0d1016_48%,_#090b0f)] text-stone-100">
      <AuthCompletionScreen
        status={resolvedSearchParams.status ?? null}
        nextPath={resolvedSearchParams.next ?? null}
        mode={(resolvedSearchParams.mode as AuthAttachmentStatus | undefined) ?? null}
      />
    </div>
  );
}
