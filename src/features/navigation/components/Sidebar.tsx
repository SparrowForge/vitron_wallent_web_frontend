import { clearAuthTokens } from "@/lib/auth";
import {
  CreditCard,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Wallet,
  X,
  User,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const primaryNav = [
  // { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  // { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/cards", label: "My Cards", icon: CreditCard },
  // { href: "/cards/shop", label: "Card Shop", icon: ShoppingBag },
  // { href: "/payments", label: "Payment", icon: Receipt },
  { href: "/authentication", label: "Authentication", icon: ShieldCheck },
  { href: "/notice", label: "Notice", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/my-account", label: "My Account", icon: User },
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
  const router = useRouter();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const handleLogout = async () => {
    await clearAuthTokens();
    router.replace("/");
  };

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 transition lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        aria-label="Close sidebar overlay"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col glass border-r border-(--white)/5 transition-transform duration-300 lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-20 items-center m-auto justify-between gap-3 px-6 lg:justify-start">
          <div className="flex items-center gap-3 mt-6">
            <Link href={"/"} className="relative h-[80px] w-[136px] flex-shrink-0">
              <Image
                src="/CryptoPag.png"
                alt="CryptoPag Logo"
                width={4096}
                height={2388}
                className="w-full object-contain"
                priority
              />
            </Link>

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
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-6 mt-10">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 hover:pl-4 ${active
                  ? "text-(--foreground)"
                  : "text-(--paragraph) hover:text-(--foreground)"
                  }`}
              >
                {active && (
                  <div className="absolute inset-0 rounded-xl bg-(--brand)/5" />
                )}
                {active && (
                  <div className="absolute left-0 h-8 w-1 rounded-r-full bg-(--brand) shadow-[0_0_12px_var(--brand)]" />
                )}
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg transition-all duration-300 ${active
                    ? "bg-(--brand)/20 text-(--brand)"
                    : "bg-(--white)/5 text-(--icon-color) group-hover:bg-(--white)/10 group-hover:text-(--foreground)"
                    }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className={isCollapsed ? "lg:hidden" : ""}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <div
            onClick={handleLogout}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${"text-(--paragraph) hover:bg-(--stroke-high) hover:text-(--foreground)"} cursor-pointer`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg border border-(--stroke) ${"bg-(--brand-10) text-(--brand)"}`}
            >
              <LogOut className="h-4 w-4" />
            </span>
            <span className={isCollapsed ? "lg:hidden" : ""}>Logout</span>
          </div>
          <div className="mt-2">
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
        </nav>

      </aside>
    </>
  );
}
