"use client";

import CardHolderForm from "@/components/Card/CardHolderForm";
import { useSearchParams } from "next/navigation";

export default function CardHolderPage() {
  const searchParams = useSearchParams();
  const cardBin = searchParams.get("bin") ?? "";
  const holderStatus = searchParams.get("status") ?? "";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Card Holder
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          {holderStatus === "INACTIVE" ? "Update holder" : "Create holder"}
        </h1>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        {cardBin ? (
          <CardHolderForm cardBin={cardBin} holderStatus={holderStatus} />
        ) : (
          <p className="text-sm text-(--paragraph)">
            Select a card bin before creating a holder profile.
          </p>
        )}
      </section>
    </div>
  );
}
