import HeaderTitle from "@/components/Navigation/HeaderTitle";
import { Bell, Moon } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-(--stroke) px-6">
      <div className="text-base font-semibold text-(--foreground)">
        <HeaderTitle />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-(--stroke) bg-(--basic-cta) px-4 py-2 text-xs font-medium text-(--double-foreground)">
            10.00 USD
          </div>
          <button
            type="button"
            className="rounded-full bg-(--brand) px-4 py-2 text-xs font-semibold text-(--background) transition hover:opacity-90"
          >
            Deposit
          </button>
        </div>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground)"
          aria-label="Toggle dark mode"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground)"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-(--brand) text-sm font-semibold text-(--background)">
          E
        </div>
      </div>
    </header>
  );
}
