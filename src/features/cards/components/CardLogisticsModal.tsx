"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import ModalShell from "@/shared/components/ui/ModalShell";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useState } from "react";

type CardLogisticsModalProps = {
  open: boolean;
  cardId: string;
  maskedNumber: string;
  onClose: () => void;
};

type LogisticsResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    name?: string;
    phone?: string;
    countryName?: string;
    zone?: string;
    city?: string;
    address?: string;
    address2?: string;
    postCode?: string;
    shipNo?: string;
    shipUrl?: string;
    status?: string;
  };
};

export default function CardLogisticsModal({
  open,
  cardId,
  maskedNumber,
  onClose,
}: CardLogisticsModalProps) {
  const [detail, setDetail] = useState<LogisticsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useToastMessages({ errorMessage });

  useEffect(() => {
    if (!open) {
      return;
    }
    setDetail(null);
    setErrorMessage("");
    const loadLogistics = async () => {
      setLoading(true);
      try {
        const response = await apiRequest<LogisticsResponse>({
          path: API_ENDPOINTS.cardShipDetail,
          method: "POST",
          body: JSON.stringify({ cardId }),
        });
        if (response.data?.shipNo || response.data?.address) {
          setDetail(response.data ?? null);
        } else {
          setDetail(null);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load logistics."
        );
      } finally {
        setLoading(false);
      }
    };
    void loadLogistics();
  }, [open, cardId]);

  if (!open) {
    return null;
  }

  const infoRows = [
    { label: "Recipient", value: detail?.name },
    { label: "Phone", value: detail?.phone },
    { label: "Country", value: detail?.countryName },
    { label: "State", value: detail?.zone },
    { label: "City", value: detail?.city },
    { label: "Address", value: detail?.address },
    { label: "Address 2", value: detail?.address2 },
    { label: "Post code", value: detail?.postCode },
    { label: "Tracking no.", value: detail?.shipNo },
    { label: "Tracking url", value: detail?.shipUrl },
  ];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Logistics"
      className="max-w-md"
    >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-(--stroke) bg-(--background) px-3 py-2 text-xs font-semibold text-(--paragraph)"
          >
            Back
          </button>
          <div className="text-sm font-semibold text-(--foreground)">
            Logistics
          </div>
          <span className="text-xs text-(--paragraph)">{maskedNumber}</span>
        </div>

        <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4 text-sm text-(--paragraph)">
          {loading ? (
            <div className="inline-flex w-full items-center justify-center gap-2 text-sm text-(--paragraph)">
              <Spinner size={16} />
              Loading logistics...
            </div>
          ) : detail ? (
            <div className="space-y-3">
              {infoRows.map((row) =>
                row.value ? (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 text-xs"
                  >
                    <span className="text-(--paragraph)">{row.label}</span>
                    {row.label === "Tracking url" ? (
                      <a
                        href={row.value}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-(--brand)"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="text-(--double-foreground)">
                        {row.value}
                      </span>
                    )}
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-(--paragraph)">
              No logistics information available.
            </div>
          )}
        </div>

        {null}
    </ModalShell>
  );
}
