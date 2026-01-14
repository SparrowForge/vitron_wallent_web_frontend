"use client";

import LandingHeader from "@/features/navigation/components/LandingHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("vtron_access_token");
    if (token) {
      router.replace("/wallet");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--paragraph)">
          Crypto Wallet Platform
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-(--foreground) sm:text-5xl">
          Control your assets, cards, and on-chain activity in one dashboard.
        </h1>
        <p className="mt-4 max-w-xl text-base text-(--paragraph) sm:text-lg">
          Track balances, manage cards, and review transactions with a single,
          secure wallet workspace.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex h-11 items-center justify-center rounded-full bg-(--brand) px-6 text-sm font-semibold text-(--background)"
          >
            Get started
          </Link>
          <Link
            href="/auth"
            className="inline-flex h-11 items-center justify-center rounded-full border border-(--stroke) px-6 text-sm font-semibold text-(--foreground)"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
