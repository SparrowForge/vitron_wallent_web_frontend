"use client";

import LandingHeader from "@/components/Navigation/LandingHeader";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <section className="w-full max-w-md rounded-2xl border border-(--stroke) bg-(--basic-cta) p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-(--foreground)">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <button
              type="button"
              className="text-sm font-medium text-(--paragraph)"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </div>

          <p className="mt-2 text-sm text-(--paragraph)">
            {mode === "login"
              ? "Sign in to access your dashboard."
              : "Spin up a new wallet in a few minutes."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              Email
              <input
                type="email"
                placeholder="you@wallet.com"
                className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              Password
              <input
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
              />
            </label>
            {mode === "register" ? (
              <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                Confirm password
                <input
                  type="password"
                  placeholder="••••••••"
                  className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                />
              </label>
            ) : null}

            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-(--brand) text-sm font-semibold text-(--background)"
            >
              {mode === "login" ? "Login" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-(--paragraph)">
            <span>
              {mode === "login" ? "New to Vtron?" : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-(--foreground)"
            >
              {mode === "login" ? "Create one" : "Login"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
