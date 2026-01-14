import AuthenticationForm from "@/features/kyc/components/AuthenticationForm";

export default function AuthenticationPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Verification
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Authentication
        </h1>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <AuthenticationForm />
      </section>
    </div>
  );
}
