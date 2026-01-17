"use client";

import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  "/wallet": "Wallet",
  "/cards": "My Cards",
  "/cards/settings": "Card Settings",
  "/authentication": "Authentication",
  "/notice": "Notice",
  "/settings": "Settings",
  "/settings/modify-email": "Modify Email",
  "/settings/google-auth": "Google Auth",
  "/settings/transaction-password": "Transaction Password",
  "/settings/login-password": "Login Password",
  "/settings/network-diagnostics": "Network Diagnostics",
};

export default function HeaderTitle() {
  const pathname = usePathname();
  return titleMap[pathname] ?? "Dashboard";
}
