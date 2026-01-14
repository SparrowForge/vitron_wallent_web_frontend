"use client";

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
          className="rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          Dashboard
        </Link>
      ) : (
        <Link
          href="/auth"
          className="rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          Login
        </Link>
      )}
    </header>
  );
}
