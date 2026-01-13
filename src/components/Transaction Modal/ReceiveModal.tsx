"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { useEffect, useMemo, useState } from "react";

type ReceiveModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    id?: number | string;
    realName?: string;
    email?: string;
    headUrl?: string;
  };
};

type WalletCollectionResponse = {
  code?: number | string;
  msg?: string;
  data?: string;
};

export default function ReceiveModal({
  open,
  walletName,
  onClose,
}: ReceiveModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [merchantInfo, setMerchantInfo] =
    useState<MerchantInfoResponse["data"]>(undefined);
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadData = async () => {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");
      try {
        const [infoResponse, qrResponse] = await Promise.all([
          apiRequest<MerchantInfoResponse>({
            path: API_ENDPOINTS.merchantInfo,
            method: "POST",
            body: JSON.stringify({}),
          }),
          apiRequest<WalletCollectionResponse>({
            path: API_ENDPOINTS.walletCollection,
            method: "POST",
            body: JSON.stringify({}),
          }),
        ]);
        if (Number(infoResponse.code) === 200 && infoResponse.data) {
          setMerchantInfo(infoResponse.data);
        }
        if (Number(qrResponse.code) === 200 && qrResponse.data) {
          setQrValue(qrResponse.data);
        }
        if (
          Number(infoResponse.code) !== 200 &&
          Number(qrResponse.code) !== 200
        ) {
          setErrorMessage("Unable to load receive details.");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load receive data."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [open]);

  const qrImageUrl = useMemo(() => {
    if (!qrValue) {
      return "";
    }
    const encoded = encodeURIComponent(qrValue);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
  }, [qrValue]);

  const handleSave = () => {
    if (!qrImageUrl) {
      return;
    }
    const link = document.createElement("a");
    link.href = qrImageUrl;
    link.download = "vtron-receive-qr.png";
    link.click();
  };

  const handleCopy = async () => {
    if (!qrValue) {
      return;
    }
    try {
      await navigator.clipboard.writeText(qrValue);
      setInfoMessage("QR string copied.");
    } catch {
      setErrorMessage("Unable to copy QR string.");
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Receive"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
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
            Receive
          </div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-(--basic-cta) text-(--foreground)">
            {merchantInfo?.headUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={merchantInfo.headUrl}
                alt="User avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold">
                {(merchantInfo?.email ?? "E")[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-4 text-lg font-semibold text-(--foreground)">
            {merchantInfo?.id ?? "—"} (ID)
          </div>
          <div className="mt-1 text-xs text-(--paragraph)">
            {merchantInfo?.email ?? "Loading..."}
          </div>

          <div className="mt-6 grid place-items-center">
            <div className="grid h-44 w-44 place-items-center rounded-2xl border border-(--stroke) bg-(--basic-cta)">
              {qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageUrl}
                  alt="Receive QR"
                  className="h-40 w-40 object-contain"
                />
              ) : (
                <span className="text-xs text-(--paragraph)">
                  {loading ? "Loading QR..." : "QR unavailable"}
                </span>
              )}
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-center text-xs text-(--paragraph)">
            {errorMessage}
          </p>
        ) : null}
        {infoMessage ? (
          <p className="mt-2 text-center text-xs text-(--paragraph)">
            {infoMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-(--paragraph)">
          Scan the QR code above to receive payment.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleCopy}
            className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) text-sm font-semibold text-(--foreground)"
            disabled={!qrValue}
          >
            Copy QR string
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-12 w-full rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
            disabled={!qrImageUrl}
          >
            Save picture
          </button>
        </div>
      </div>
    </div>
  );
}
