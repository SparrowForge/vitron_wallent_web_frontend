"use client";

import CardActivateModal from "@/features/cards/components/CardActivateModal";
import CardLogisticsModal from "@/features/cards/components/CardLogisticsModal";
import CardPinModal from "@/features/cards/components/CardPinModal";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CardItem = {
  cardId: string;
  cardNo?: string;
  cardType?: string;
  type?: number | string;
  status?: string;
  isShip?: number;
};

type CardListResponse = {
  code?: number | string;
  msg?: string;
  data?: CardItem[];
};

export default function CardSettingsPage() {
  const searchParams = useSearchParams();
  const cardId = searchParams.get("card") ?? "";
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeModal, setActiveModal] = useState<
    "pin" | "activate" | "logistics" | null
  >(null);

  useToastMessages({ errorMessage });

  const selectedCard = useMemo(() => {
    if (!cardId) {
      return cards[0];
    }
    return cards.find((card) => card.cardId === cardId) ?? cards[0];
  }, [cards, cardId]);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest<CardListResponse>({
          path: API_ENDPOINTS.cardList,
          method: "POST",
          body: JSON.stringify({}),
        });
        setCards(response.data ?? []);
      } catch (error) {
        setCards([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load card list."
        );
      } finally {
        setLoading(false);
      }
    };
    void loadCards();
  }, []);

  const maskedNumber = selectedCard?.cardNo ?? "•••• •••• ••••";
  const cardLabel = selectedCard?.cardType ?? "Card";
  const isPhysical = Number(selectedCard?.type) === 2;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Card Settings
        </h1>
      </header>

      <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-(--background) text-(--foreground)">
            {cardLabel.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-(--foreground)">
              {cardLabel}
            </div>
            <div className="text-xs text-(--paragraph)">{maskedNumber}</div>
            {selectedCard?.status ? (
              <div className="mt-1 text-[11px] text-(--paragraph)">
                Status: {selectedCard.status}
              </div>
            ) : null}
          </div>
        </div>
        {loading ? (
          <p className="mt-4 text-xs text-(--paragraph)">
            <span className="inline-flex items-center gap-2">
              <Spinner size={14} />
              Loading card details...
            </span>
          </p>
        ) : null}
        {null}
        {selectedCard && !isPhysical ? (
          <p className="mt-4 text-xs text-(--paragraph)">
            Card settings are available only for physical cards.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setActiveModal("pin")}
          className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-5 py-4 text-left"
          disabled={!selectedCard || !isPhysical}
        >
          <div>
            <div className="text-sm font-semibold text-(--double-foreground)">
              Set PIN
            </div>
            <div className="mt-1 text-xs text-(--paragraph)">
              Create or update your card PIN.
            </div>
          </div>
          <span className="text-(--paragraph)">›</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal("activate")}
          className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-5 py-4 text-left"
          disabled={!selectedCard || !isPhysical}
        >
          <div>
            <div className="text-sm font-semibold text-(--double-foreground)">
              Activate card
            </div>
            <div className="mt-1 text-xs text-(--paragraph)">
              Enter activation code to enable the physical card.
            </div>
          </div>
          <span className="text-(--paragraph)">›</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModal("logistics")}
          className="flex w-full items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-5 py-4 text-left"
          disabled={!selectedCard || !isPhysical}
        >
          <div>
            <div className="text-sm font-semibold text-(--double-foreground)">
              Logistics
            </div>
            <div className="mt-1 text-xs text-(--paragraph)">
              Shipping and delivery status.
            </div>
          </div>
          <span className="text-(--paragraph)">›</span>
        </button>
      </section>

      {selectedCard && isPhysical ? (
        <>
          <CardPinModal
            open={activeModal === "pin"}
            cardId={selectedCard.cardId}
            maskedNumber={maskedNumber}
            onClose={() => setActiveModal(null)}
            onSuccess={() => setActiveModal(null)}
          />
          <CardActivateModal
            open={activeModal === "activate"}
            cardId={selectedCard.cardId}
            maskedNumber={maskedNumber}
            onClose={() => setActiveModal(null)}
            onSuccess={() => setActiveModal(null)}
          />
          <CardLogisticsModal
            open={activeModal === "logistics"}
            cardId={selectedCard.cardId}
            maskedNumber={maskedNumber}
            onClose={() => setActiveModal(null)}
          />
        </>
      ) : null}
    </div>
  );
}
