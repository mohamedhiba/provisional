import { cn } from "@/lib/utils";

type ProofMarkProps = {
  className?: string;
};

export function ProofMark({ className }: ProofMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("text-[#f1dfb7]", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="proof-mark-stroke" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.92" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <path
        d="M24 10.5C17.1 12 11.8 16.6 9.2 22.8C6.5 29 7.1 36.4 10.8 42.1C13.7 46.8 18.2 50.2 23.3 51.5"
        stroke="url(#proof-mark-stroke)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M40 10.5C46.9 12 52.2 16.6 54.8 22.8C57.5 29 56.9 36.4 53.2 42.1C50.3 46.8 45.8 50.2 40.7 51.5"
        stroke="url(#proof-mark-stroke)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M24 19.5C19.8 20.7 16.4 23.7 14.5 27.7C12.6 31.8 12.7 36.6 14.7 40.5C16.6 44.4 20 47.3 24 48.5"
        stroke="url(#proof-mark-stroke)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M40 19.5C44.2 20.7 47.6 23.7 49.5 27.7C51.4 31.8 51.3 36.6 49.3 40.5C47.4 44.4 44 47.3 40 48.5"
        stroke="url(#proof-mark-stroke)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="32" cy="11.5" r="2.7" fill="currentColor" />
      <rect x="29.3" y="19.6" width="5.4" height="29.1" rx="1.4" fill="currentColor" />
    </svg>
  );
}
