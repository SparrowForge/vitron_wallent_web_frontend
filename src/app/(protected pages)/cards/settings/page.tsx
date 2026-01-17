"use client";

import CardActivateModal from "@/features/cards/components/CardActivateModal";
import CardLogisticsModal from "@/features/cards/components/CardLogisticsModal";
import CardPinModal from "@/features/cards/components/CardPinModal";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/Card";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { ChevronRight, CreditCard, Box, KeyRound, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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

export function CardSettingsPage() {
  const searchParamsHook = useSearchParams();
  const cardId = searchParamsHook.get("card") || "";
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

      <Card variant="glass">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="relative grid h-20 w-32 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-(--foreground) to-gray-600 shadow-lg">
            <div className="text-xl font-bold italic text-(--background) opacity-80">
              VISA
            </div>
            {/* Shine effect */}
            <div className="absolute -inset-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-(--foreground)">
              {cardLabel}
            </h2>
            <div className="font-mono text-sm tracking-widest text-(--paragraph)">
              {maskedNumber}
            </div>
            {selectedCard?.status && (
              <span className="inline-flex items-center rounded-full bg-(--brand)/10 px-2.5 py-0.5 text-xs font-medium text-(--brand)">
                {selectedCard.status}
              </span>
            )}
          </div>
        </CardContent>
        {loading && (
          <div className="border-t border-(--stroke) p-3 text-center text-xs text-(--paragraph)">
            <Spinner size={14} className="inline mr-2" />
            Loading card details...
          </div>
        )}
        {selectedCard && !isPhysical && (
          <div className="border-t border-(--stroke) bg-yellow-500/10 p-3 text-center text-xs text-yellow-500">
            Card settings are available only for physical cards.
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {[
          {
            key: "pin",
            title: "Set PIN",
            description: "Create or update your card PIN.",
            icon: <KeyRound className="h-5 w-5" />,
          },
          {
            key: "activate",
            title: "Activate card",
            description: "Enter activation code to enable the physical card.",
            icon: <ShieldCheck className="h-5 w-5" />,
          },
          {
            key: "logistics",
            title: "Logistics",
            description: "Shipping and delivery status.",
            icon: <Box className="h-5 w-5" />,
          },
        ].map((item) => (
          <Card
            key={item.key}
            variant="glass"
            className={`transition-all duration-200 ${!selectedCard || !isPhysical
                ? "opacity-50"
                : "hover:bg-(--stroke)/10 cursor-pointer"
              }`}
            onClick={() =>
              isPhysical &&
              setActiveModal(item.key as "pin" | "activate" | "logistics")
            }
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-(--background) text-(--foreground) ring-1 ring-(--stroke)">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--foreground)">
                    {item.title}
                  </div>
                  <div className="text-xs text-(--paragraph)">
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-(--paragraph) opacity-50" />
            </CardContent>
          </Card>
        ))}
      </div>

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

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <CardSettingsPage />
    </Suspense>
  );
}
