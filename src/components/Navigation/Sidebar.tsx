import {
  CreditCard,
  History,
  LayoutGrid,
  Mail,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, active: true },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/cards", label: "My Cards", icon: CreditCard },
  { href: "/cards/shop", label: "Card Shop", icon: ShoppingBag },
  { href: "/payments", label: "Payment", icon: Receipt },
  { href: "/contact", label: "Contact", icon: Mail },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col bg-(--background) text-(--foreground) lg:flex">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-(--brand-10) text-(--brand)">
          <span className="text-lg font-semibold">V</span>
        </div>
        <div className="text-base font-semibold tracking-tight">
          Vtron <span className="text-(--paragraph)">Card</span>
        </div>
      </div>
      <div className="px-6 pb-4">
        <div className="flex items-center gap-2 rounded-lg border border-(--stroke) bg-(--basic-cta) px-3 py-2 text-sm text-(--paragraph)">
          <Search className="h-4 w-4 text-(--icon-color)" />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-sm text-(--foreground) placeholder:text-(--placeholder) focus:outline-none"
          />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                item.active
                  ? "bg-(--basic-cta) text-(--foreground)"
                  : "text-(--paragraph) hover:bg-(--stroke-high) hover:text-(--foreground)"
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg border border-(--stroke) ${
                  item.active
                    ? "bg-(--brand-10) text-(--brand)"
                    : "bg-(--basic-cta) text-(--icon-color) group-hover:text-(--double-foreground)"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 pb-6">
        <div className="mb-3 h-px bg-(--stroke)" />
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-(--paragraph) transition hover:bg-(--stroke-high) hover:text-(--foreground)"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-(--stroke) bg-(--basic-cta) text-(--icon-color)">
            <Settings className="h-4 w-4" />
          </span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
