"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import Spinner from "@/shared/components/ui/Spinner";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const securityItems = [
    {
      title: "Modify email",
      action: "Edit",
      href: "/settings/modify-email",
    },
    {
      title: "Passkey",
      action: "Manage",
      href: "/settings/passkey",
      hidden: true,
    },
    {
      title: "Google authentication",
      action: "Open",
      accent: true,
      href: "/settings/google-auth",
    },
    {
      title: "Transaction password",
      action: "Edit",
      href: "/settings/transaction-password",
    },
    {
      title: "Login password",
      action: "Edit",
      href: "/settings/login-password",
      hidden: true,
    },
    {
      title: "Network diagnostics",
      action: "Run",
      href: "/settings/network-diagnostics",
    },
  ];

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await apiRequest({
        path: API_ENDPOINTS.logout,
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore logout API failure; we'll clear local state below.
    } finally {
      clearAuthTokens();
      router.replace("/auth");
      setLoggingOut(false);
    }
  };

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
          {securityItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const content = (
                <>
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
                </>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4 text-left transition hover:border-(--stroke-high)"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.title}
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4 text-left transition hover:border-(--stroke-high)"
                >
                  {content}
                </button>
              );
            })}
        </div>
      </section>

      <div className="mt-8 flex flex-col justify-center items-center gap-3 sm:flex-row">
        <div
          onClick={handleLogout}
          className=" cursor-pointer inline-flex justify-center gap-2 w-2/3 h-11 items-center rounded-full bg-(--brand) px-6 text-sm font-semibold text-(--background)"
        >
          {loggingOut ? (
            <>
              <Spinner size={16} />
              Logging out...
            </>
          ) : (
            <>
              {" "}
              <LogOut />
              Logout
            </>
          )}
        </div>
      </div>
    </div>
  );
}
