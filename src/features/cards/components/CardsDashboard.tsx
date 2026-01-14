"use client";

import CardApplyModal from "@/features/cards/components/CardApplyModal";
import CardDepositModal from "@/features/cards/components/CardDepositModal";
import CardFreezeModal from "@/features/cards/components/CardFreezeModal";
import CardViewModal from "@/features/cards/components/CardViewModal";
import {
  depositSvg,
  freezeSvg,
  settingSvg,
  viewSvg,
} from "@/shared/components/Svgs/Svg";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const baseActions = [
  { key: "view", label: "View", icon: viewSvg },
  { key: "deposit", label: "Deposit", icon: depositSvg },
];

const virtualActions = (isFrozen: boolean) => [
  ...baseActions,
  { key: "freeze", label: isFrozen ? "Unfreeze" : "Freeze", icon: freezeSvg },
];

const physicalActions = [
  ...baseActions,
  { key: "settings", label: "Settings", icon: settingSvg },
];

type ApiCard = {
  id?: string | number;
  cardId?: string | number;
  cardNo?: string;
  alias?: string;
  cardType?: string;
  type?: number | string;
  status?: string;
  frozenFeat?: number | string;
};

type CardListResponse = {
  code?: number | string;
  msg?: string;
  data?: ApiCard[];
};

type CardBalanceResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    balance?: string | number;
    currency?: string;
  };
};

const getCardId = (card: ApiCard) =>
  String(card.cardId ?? card.id ?? card.cardNo ?? "");

const getLast4 = (card: ApiCard) => {
  const source = String(card.cardNo ?? card.cardId ?? card.id ?? "");
  return source.length >= 4 ? source.slice(-4) : source || "----";
};

export default function CardsDashboard() {
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cardBalances, setCardBalances] = useState<
    Record<string, { balance: string; currency: string }>
  >({});

  useToastMessages({ errorMessage });

  const selectedCard = useMemo(
    () =>
      cards.find((card) => getCardId(card) === selectedId) ?? cards[0] ?? null,
    [cards, selectedId]
  );

  const refreshBalances = async (cardList: ApiCard[]) => {
    const balanceEntries = await Promise.all(
      cardList.map(async (card) => {
        const cardKey = getCardId(card);
        if (!cardKey) {
          return [cardKey, null] as const;
        }
        try {
          const balanceResponse = await apiRequest<CardBalanceResponse>({
            path: `${API_ENDPOINTS.cardHide}?cardId=${encodeURIComponent(
              cardKey
            )}`,
            method: "GET",
          });
          if (!balanceResponse.data) {
            return [cardKey, null] as const;
          }
          const balanceValue =
            balanceResponse.data.balance !== undefined
              ? String(balanceResponse.data.balance)
              : "0.00";
          return [
            cardKey,
            {
              balance: balanceValue,
              currency: balanceResponse.data.currency ?? "USD",
            },
          ] as const;
        } catch {
          return [cardKey, null] as const;
        }
      })
    );
    setCardBalances(
      balanceEntries.reduce((acc, [key, value]) => {
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, { balance: string; currency: string }>)
    );
  };

  const refreshCards = async () => {
    setErrorMessage("");
    try {
      const response = await apiRequest<CardListResponse>({
        path: API_ENDPOINTS.cardList,
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!Array.isArray(response.data)) {
        throw new Error(response.msg || "Unable to load cards.");
      }
      setCards(response.data);
      const nextSelected =
        response.data.find((card) => getCardId(card) === selectedId) ??
        response.data[0] ??
        null;
      setSelectedId(nextSelected ? getCardId(nextSelected) : "");
      await refreshBalances(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load cards."
      );
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadCards = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest<CardListResponse>({
          path: API_ENDPOINTS.cardList,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!Array.isArray(response.data)) {
          throw new Error(response.msg || "Unable to load cards.");
        }
        if (!mounted) {
          return;
        }
        setCards(response.data);
        const firstId =
          response.data.length > 0 ? getCardId(response.data[0]) : "";
        setSelectedId((current) => current || firstId);
        refreshBalances(response.data);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setCards([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load cards."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCards();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-(--paragraph)">
          <Spinner size={16} />
          Loading cards...
        </div>
        <div className="h-16 rounded-2xl border border-(--stroke) bg-(--basic-cta)" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`card-skeleton-${index}`}
              className="h-56 rounded-2xl border border-(--stroke) bg-(--basic-cta)"
            />
          ))}
        </div>
      </div>
    );
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
          {null}
        </div>
        <button
          type="button"
          onClick={() => setApplyOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-(--brand) px-5 py-2 text-sm font-semibold text-(--background)"
        >
          Apply for Card
        </button>
      </header>

      {cards.length === 0 ? (
        <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta) px-6 py-10 text-center text-sm text-(--paragraph)">
          No cards yet. Apply for a card to get started.
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const cardId = getCardId(card);
            const last4 = getLast4(card);
            const balance = cardBalances[cardId];
            const isPhysical = Number(card.type) === 2;
            const isFrozen = card.status === "04";
            const actions = isPhysical
              ? physicalActions
              : virtualActions(isFrozen);
            return (
              <div
                key={cardId}
                className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-5"
              >
                <div className="relative overflow-hidden rounded-2xl bg-(--background) p-5">
                  <div className="text-sm uppercase tracking-[0.3em] text-(--paragraph)">
                    {card.cardType ?? "Vtron"}
                  </div>
                  <div className="mt-10 text-lg font-semibold text-(--foreground)">
                    •••• {last4}
                  </div>
                  <div className="absolute bottom-4 right-5 text-sm font-semibold text-(--double-foreground)">
                    VISA
                  </div>
                  <div className="absolute inset-0 border border-(--stroke) opacity-40" />
                </div>
                <div className="mt-3 text-sm font-semibold text-(--foreground)">
                  {card.alias ?? "Vtron Card"}
                </div>
                <div className="mt-1 text-xs text-(--paragraph)">
                  Balance:{" "}
                  <span className="text-(--double-foreground)">
                    {balance ? balance.balance : "--"}{" "}
                    {balance ? balance.currency : ""}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-(--paragraph)">
                  {actions.map((action) =>
                    action.key === "settings" ? (
                      <Link
                        key={action.key}
                        href={`/cards/settings?card=${cardId}`}
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
                        data-card={cardId}
                        onClick={() => handleAction(action.key, cardId)}
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
            );
          })}
        </section>
      )}

      <CardViewModal
        open={viewOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        maskedNumber={
          selectedCard?.cardNo ?? `•••• ${getLast4(selectedCard ?? {})}`
        }
        onClose={() => setViewOpen(false)}
      />
      <CardDepositModal
        open={depositOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        maskedNumber={
          selectedCard?.cardNo ?? `•••• ${getLast4(selectedCard ?? {})}`
        }
        onClose={() => setDepositOpen(false)}
        onSuccess={() => refreshBalances(cards)}
      />
      <CardFreezeModal
        open={freezeOpen}
        cardId={selectedCard?.cardId ? String(selectedCard.cardId) : ""}
        cardLabel={selectedCard?.alias ?? "Vtron Card"}
        status={selectedCard?.status ?? ""}
        frozenFeat={selectedCard?.frozenFeat}
        onClose={() => setFreezeOpen(false)}
        onSuccess={refreshCards}
      />
      <CardApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
