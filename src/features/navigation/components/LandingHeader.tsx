"use client";

import { HomeIcon, LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingHeader() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("vtron_refresh_token");
    setHasToken(Boolean(token));
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-(--stroke) bg-(--background) px-6">
      <div className="text-lg font-semibold text-(--foreground)">
        Vtron Wallet
      </div>

      {hasToken ? (
        <Link
          href="/wallet"
          className="flex justify-center items-center gap-2 cursor-pointer rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          <HomeIcon
            className={`border border-(--stroke) ${"bg-(--brand-10) text-(--brand)"}`}
          />
          Dashboard
        </Link>
      ) : (
        <Link
          href="/auth"
          className="flex justify-center items-center gap-2 rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          <LogIn
            className={`border border-(--stroke) ${"bg-(--brand-10) text-(--brand)"}`}
          />
          Login
        </Link>
      )}
    </header>
  );
}
