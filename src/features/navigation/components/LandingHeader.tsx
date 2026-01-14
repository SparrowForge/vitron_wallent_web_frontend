import Link from "next/link";

export default function LandingHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-(--stroke) bg-(--background) px-6">
      <div className="text-lg font-semibold text-(--foreground)">
        Vtron Wallet
      </div>
      <Link
        href="/auth"
        className="inline-flex items-center justify-center rounded-full border border-(--stroke) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--basic-cta)"
      >
        Login
      </Link>
    </header>
  );
}
