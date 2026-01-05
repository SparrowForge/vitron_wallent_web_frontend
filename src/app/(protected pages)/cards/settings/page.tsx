export default function CardSettingsPage() {
  const sections = [
    { title: "Set PIN", description: "Create or update your card PIN." },
    { title: "Active card", description: "Activated" },
    { title: "Logistics", description: "Shipping and delivery status." },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Card Settings
        </h1>
      </header>

      <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-(--background) text-(--foreground)">
            VC
          </div>
          <div>
            <div className="text-sm font-semibold text-(--foreground)">
              Vtron Visa
            </div>
            <div className="text-xs text-(--paragraph)">•••• 3909</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {sections.map((section) => (
          <button
            key={section.title}
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-5 py-4 text-left"
          >
            <div>
              <div className="text-sm font-semibold text-(--double-foreground)">
                {section.title}
              </div>
              <div className="mt-1 text-xs text-(--paragraph)">
                {section.description}
              </div>
            </div>
            <span className="text-(--paragraph)">›</span>
          </button>
        ))}
      </section>
    </div>
  );
}
