import ComingSoonBanner from "@/shared/components/ComingSoonBanner";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <ComingSoonBanner />
      <div className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--paragraph)">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-(--foreground)">
          Page not found.
        </h1>
        <p className="mt-3 text-sm text-(--paragraph)">
          This route isn’t live yet. Head back to the dashboard to continue.
        </p>
      </div>
    </div>
  );
}
