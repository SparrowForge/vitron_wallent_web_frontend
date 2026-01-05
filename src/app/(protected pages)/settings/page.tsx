export default function SettingsPage() {
  const securityItems = [
    { title: "Modify email", action: "Edit" },
    { title: "Google authentication", action: "Open", accent: true },
    { title: "Transaction password", action: "Edit" },
    { title: "Login password", action: "Edit" },
    { title: "Network diagnostics", action: "Run" },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Account Security
        </h1>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="space-y-4">
          {securityItems.map((item) => (
            <button
              key={item.title}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4 text-left transition hover:border-(--stroke-high)"
            >
              <div>
                <div className="text-sm font-semibold text-(--double-foreground)">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-(--paragraph)">
                  Tap to manage
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={
                    item.accent ? "text-(--brand)" : "text-(--paragraph)"
                  }
                >
                  {item.action}
                </span>
                <span className="text-(--paragraph)">›</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
