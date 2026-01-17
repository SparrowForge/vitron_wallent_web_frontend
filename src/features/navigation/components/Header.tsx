"use client";

import HeaderTitle from "@/features/navigation/components/HeaderTitle";
import { clearAuthTokens } from "@/lib/auth";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRouter } from "next/navigation";

type HeaderProps = {
  onToggleSidebar: () => void;
  onToggleCollapse: () => void;
  isSidebarCollapsed?: boolean;
};

type Wallet = {
  id: number;
  amount: string;
  currency: string;
};

type WalletListResponse = {
  code?: number | string;
  msg?: string;
  data?: Wallet[];
};

export default function Header({
  onToggleSidebar,
  onToggleCollapse,
  isSidebarCollapsed = false,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearAuthTokens();
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-(--white)/5 glass px-4 py-3 sm:h-18 sm:flex-nowrap sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground) lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground) lg:grid"
          aria-label="Toggle sidebar collapse"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <div className="text-base font-semibold text-(--foreground)">
          <HeaderTitle />
        </div>
      </div>
      {/* <div className="flex flex-1 items-center justify-end gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground)"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground)"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-(--brand) text-sm font-semibold text-(--background)">
          E
        </div>
      </div> */}
    </header>
  );
}
