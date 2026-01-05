"use client";

import CardDepositModal from "@/components/Card/CardDepositModal";
import CardFreezeModal from "@/components/Card/CardFreezeModal";
import CardViewModal from "@/components/Card/CardViewModal";
import {
  depositSvg,
  freezeSvg,
  settingSvg,
  viewSvg,
} from "@/components/Svgs/Svg";
import Link from "next/link";
import { useMemo, useState } from "react";

const cards = [
  { id: "card-1", name: "Vtron Visa", last4: "3909" },
  { id: "card-2", name: "Vtron Visa", last4: "8421" },
  { id: "card-3", name: "Vtron Visa", last4: "1128" },
];

const cardActions = [
  { key: "view", label: "View", icon: viewSvg },
  { key: "deposit", label: "Deposit", icon: depositSvg },
  { key: "freeze", label: "Freeze", icon: freezeSvg },
  { key: "settings", label: "Settings", icon: settingSvg },
];

export default function CardsDashboard() {
  const [selectedId, setSelectedId] = useState(cards[0]?.id ?? "");
  const [viewOpen, setViewOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedId) ?? cards[0],
    [selectedId]
  );

  if (!selectedCard) {
    return null;
  }

  const handleAction = (action: string, cardId: string) => {
    setSelectedId(cardId);
    if (action === "view") {
      setViewOpen(true);
    }
    if (action === "deposit") {
      setDepositOpen(true);
    }
    if (action === "freeze") {
      setFreezeOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
            Cards
          </p>
          <h1 className="text-3xl font-semibold text-(--foreground)">
            Manage your linked cards.
          </h1>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-(--brand) px-5 py-2 text-sm font-semibold text-(--background)"
        >
          Apply for Card
        </button>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-5"
          >
            <div className="relative overflow-hidden rounded-2xl bg-(--background) p-5">
              <div className="text-sm uppercase tracking-[0.3em] text-(--paragraph)">
                Vtron
              </div>
              <div className="mt-10 text-lg font-semibold text-(--foreground)">
                •••• {card.last4}
              </div>
              <div className="absolute bottom-4 right-5 text-sm font-semibold text-(--double-foreground)">
                VISA
              </div>
              <div className="absolute inset-0 border border-(--stroke) opacity-40" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-(--paragraph)">
              {cardActions.map((action) =>
                action.key === "settings" ? (
                  <Link
                    key={action.key}
                    href={`/cards/settings?card=${card.id}`}
                    className="flex flex-col items-center gap-2 rounded-xl border border-(--stroke) bg-(--background) px-2 py-3 text-[11px] font-medium transition hover:text-(--foreground)"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--brand)">
                      {action.icon ? (
                        <span className="scale-[0.7]">{action.icon}</span>
                      ) : (
                        action.label[0]
                      )}
                    </span>
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.key}
                    type="button"
                    data-action={action.key}
                    data-card={card.id}
                    onClick={() => handleAction(action.key, card.id)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-(--stroke) bg-(--background) px-2 py-3 text-[11px] font-medium transition hover:text-(--foreground)"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta) text-(--brand)">
                      {action.icon ? (
                        <span className="scale-[0.7]">{action.icon}</span>
                      ) : (
                        action.label[0]
                      )}
                    </span>
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </section>

      <CardViewModal
        open={viewOpen}
        cardLabel={selectedCard.name}
        last4={selectedCard.last4}
        onClose={() => setViewOpen(false)}
      />
      <CardDepositModal
        open={depositOpen}
        cardLabel={selectedCard.name}
        onClose={() => setDepositOpen(false)}
      />
      <CardFreezeModal
        open={freezeOpen}
        cardLabel={selectedCard.name}
        onClose={() => setFreezeOpen(false)}
      />
    </div>
  );
}
