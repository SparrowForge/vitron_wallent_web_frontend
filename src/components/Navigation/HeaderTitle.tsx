"use client";

import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/wallet": "Wallet",
  "/transactions": "Transaction History",
  "/cards": "My Cards",
  "/cards/shop": "Card Shop",
  "/payments": "Payment",
  "/contact": "Contact",
  "/settings": "Settings",
};

export default function HeaderTitle() {
  const pathname = usePathname();
  return titleMap[pathname] ?? "Dashboard";
}
