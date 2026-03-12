import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_22%),linear-gradient(180deg,_#08090c,_#0d1016_48%,_#090b0f)] px-6 py-12 text-stone-100 sm:px-10 lg:px-16">
      <OnboardingFlow />
    </div>
  );
}
