import {
  CreditCard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNav = [
  // { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  // { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/cards", label: "My Cards", icon: CreditCard },
  // { href: "/cards/shop", label: "Card Shop", icon: ShoppingBag },
  // { href: "/payments", label: "Payment", icon: Receipt },
  { href: "/authentication", label: "Authentication", icon: ShieldCheck },
  { href: "/notice", label: "Notice", icon: Megaphone },
  // { href: "/contact", label: "Contact", icon: Mail },
];

type SidebarProps = {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
};

export default function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 transition lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Close sidebar overlay"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-(--background) text-(--foreground) transition-transform lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-6 lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-(--brand-10) text-(--brand)">
              <span className="text-lg font-semibold">V</span>
            </div>
            <div
              className={`text-base font-semibold tracking-tight ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            >
              Vtron <span className="text-(--paragraph)">Card</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`px-6 pb-4 ${isCollapsed ? "lg:px-3" : ""}`}>
          <div className="flex items-center gap-2 rounded-lg border border-(--stroke) bg-(--basic-cta) px-3 py-2 text-sm text-(--paragraph)">
            <Search className="h-4 w-4 text-(--icon-color)" />
            <input
              placeholder="Search"
              className={`w-full bg-transparent text-sm text-(--foreground) placeholder:text-(--placeholder) focus:outline-none ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-(--basic-cta) text-(--foreground)"
                    : "text-(--paragraph) hover:bg-(--stroke-high) hover:text-(--foreground)"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg border border-(--stroke) ${
                    active
                      ? "bg-(--brand-10) text-(--brand)"
                      : "bg-(--basic-cta) text-(--icon-color) group-hover:text-(--double-foreground)"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={isCollapsed ? "lg:hidden" : ""}>
                  {item.label}
                </span>
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
            <span className={isCollapsed ? "lg:hidden" : ""}>Settings</span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-4 hidden w-full items-center justify-center gap-2 rounded-lg border border-(--stroke) bg-(--basic-cta) px-3 py-2 text-xs font-medium text-(--paragraph) transition hover:text-(--foreground) lg:flex"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            <span className={isCollapsed ? "lg:hidden" : ""}>
              {isCollapsed ? "Expand" : "Collapse"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
