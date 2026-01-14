"use client";

import { usePathname } from "next/navigation";

const titleMap: Record<string, string> = {
  // "/dashboard": "Dashboard",
  "/wallet": "Wallet",
  // "/transactions": "Transaction History",
  "/cards": "My Cards",
  // "/cards/shop": "Card Shop",
  "/cards/settings": "Card Settings",
  "/authentication": "Authentication",
  "/notice": "Notice",
  // "/payments": "Payment",
  // "/contact": "Contact",
  "/settings": "Settings",
  "/settings/modify-email": "Modify Email",
  "/settings/google-auth": "Google Auth",
  "/settings/transaction-password": "Transaction Password",
  "/settings/login-password": "Login Password",
  "/settings/network-diagnostics": "Network Diagnostics",
  "/settings/passkey": "Passkey",
};

export default function HeaderTitle() {
  const pathname = usePathname();
  return titleMap[pathname] ?? "Dashboard";
}
