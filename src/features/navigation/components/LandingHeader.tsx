"use client";

import { HomeIcon, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {


  return (
    <header className="flex h-25 items-center justify-between border-b border-(--stroke) bg-(--background) px-6">
      <Link href={"/"} className="w-[136px] h-[80px] text-lg font-semibold text-(--foreground)">
        {/* CryptoPag Wallet */}
        <Image

          src="/CryptoPag.png"
          alt="CryptoPag Logo"
          width={4096}
          height={2388}
          className="w-full object-contain"
          priority
        />
      </Link>

      {isAuthenticated ? (
        <Link
          href="/wallet"
          className="flex justify-center items-center gap-2 cursor-pointer rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          <HomeIcon
            className="text-(--brand)"
          />
          Dashboard
        </Link>
      ) : (
        <Link
          href="/auth"
          className="flex justify-center items-center gap-2 rounded-md bg-(--primary) px-4 py-2 text-(--button-foreground) hover:bg-(--primary-hover)"
        >
          <LogIn
            className="text-(--brand)"
          />
          Login
        </Link>
      )}
    </header>
  );
}
