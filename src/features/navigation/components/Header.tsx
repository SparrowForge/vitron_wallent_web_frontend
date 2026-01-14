"use client";

import HeaderTitle from "@/features/navigation/components/HeaderTitle";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import {
  Bell,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currency, setCurrency] = useState("USD");

  const totalAmount = useMemo(() => {
    if (wallets.length === 0) {
      return 0;
    }
    return wallets.reduce((sum, wallet) => {
      const value = Number(wallet.amount);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  }, [wallets]);

  useEffect(() => {
    const loadWallets = async () => {
      try {
        const payload = await apiRequest<WalletListResponse>({
          path: API_ENDPOINTS.walletList,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (Number(payload.code) !== 200 || !payload.data) {
          setWallets([]);
          return;
        }
        setWallets(payload.data);
        if (payload.data[0]?.currency) {
          setCurrency(payload.data[0].currency);
        }
      } catch {
        setWallets([]);
      }
    };

    void loadWallets();
  }, []);

  const handleLogout = () => {
    clearAuthTokens();
    router.replace("/");
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--stroke) px-3 py-3 sm:h-16 sm:flex-nowrap sm:px-6">
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
      <div className="flex flex-1 items-center justify-end gap-3">
        {/* <div className="hidden items-center gap-3 sm:flex">
          <div className="rounded-full border border-(--stroke) bg-(--basic-cta) px-4 py-2 text-xs font-medium text-(--double-foreground)">
            {totalAmount.toFixed(2)} {currency}
          </div>
          <button
            type="button"
            className="rounded-full bg-(--brand) px-4 py-2 text-xs font-semibold text-(--background) transition hover:opacity-90"
          >
            Deposit
          </button>
        </div> */}
        {/* <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--icon-color) transition hover:text-(--double-foreground)"
          aria-label="Toggle dark mode"
        >
          <Moon className="h-4 w-4" />
        </button> */}
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
      </div>
    </header>
  );
}
