import EmptyState from "@/shared/components/ui/EmptyState";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Payments
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Schedule & Manage
        </h1>
      </header>

      <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 p-10 backdrop-blur-sm">
        <EmptyState message="Payment scheduling and vendor management will appear here." />
      </section>
    </div>
  );
}
