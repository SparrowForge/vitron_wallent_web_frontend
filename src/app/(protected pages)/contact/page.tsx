import EmptyState from "@/shared/components/ui/EmptyState";

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Support
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Contact Us
        </h1>
      </header>

      <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 p-10 backdrop-blur-sm">
        <EmptyState message="Support requests and contact options will appear here." />
      </section>
    </div>
  );
}
