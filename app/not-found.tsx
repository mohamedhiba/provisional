import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-black/20 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Not found</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-50">
          This route does not exist.
        </h1>
        <p className="mt-4 text-base leading-8 text-stone-300">
          Go back to today and return to the execution loop.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/today"
            className="inline-flex h-12 items-center justify-center rounded-full bg-stone-100 px-6 text-sm font-medium text-stone-950 transition hover:bg-stone-200"
          >
            Back to today
          </Link>
        </div>
      </div>
    </div>
  );
}
