import LandingHeader from "@/features/navigation/components/LandingHeader";
import { Rocket } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.has("vtron_refresh_token");

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader isAuthenticated={isAuthenticated} />
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
            <Rocket className="mr-2 h-4 w-4" />
            Get started
          </Link>
        </div>
      </main>
    </div>
  );
}
