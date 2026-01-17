"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import Spinner from "@/shared/components/ui/Spinner";
import { LogOut, ChevronRight } from "lucide-react";
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

      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-(--stroke)">
            {securityItems
              .filter((item) => !item.hidden)
              .map((item) => {
                const content = (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-(--background) text-(--foreground)/80 ring-1 ring-(--stroke)">
                        {item.title[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-(--foreground)">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-(--paragraph)">
                          Tap to manage
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium ${item.accent
                          ? "rounded-full bg-(--brand)/10 px-2 py-1 text-(--brand)"
                          : "text-(--paragraph)"
                          }`}
                      >
                        {item.action}
                      </span>
                      <ChevronRight className="h-4 w-4 text-(--paragraph) opacity-50" />
                    </div>
                  </>
                );

                const className =
                  "flex w-full items-center justify-between bg-transparent px-6 py-5 transition-colors hover:bg-(--stroke)/10 text-left";

                if (item.href) {
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.title}
                    type="button"
                    className={className}
                  >
                    {content}
                  </button>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleLogout}
          variant="default"
          size="lg"
          className="w-full sm:w-2/3"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Spinner size={16} />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
