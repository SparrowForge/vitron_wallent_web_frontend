"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import ModalShell from "@/shared/components/ui/ModalShell";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type DepositModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
};

type Coin = {
  ID?: string;
  id?: number;
  chainId?: string;
  name?: string;
  address?: string;
  currency?: string;
  convertFeeRate?: string;
};

type DepositConfigResponse = {
  code?: number | string;
  msg?: string;
  data?: Coin[];
};

type AddressResponse = {
  code?: number | string;
  msg?: string;
  data?: { address?: string } | string;
};

export default function DepositModal({
  open,
  walletName,
  onClose,
}: DepositModalProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [qrSourceIndex, setQrSourceIndex] = useState(0);
  const [qrLoadError, setQrLoadError] = useState(false);

  useToastMessages({ errorMessage, infoMessage });

  const selectedCoin = useMemo(
    () =>
      coins.find((coin) => (coin.ID ?? String(coin.id)) === selectedId) ??
      coins[0],
    [coins, selectedId]
  );

  const symbol = useMemo(() => {
    const name = selectedCoin?.name ?? selectedCoin?.currency ?? "";
    if (!name) {
      return "USDT";
    }
    return name.split("-")[0] ?? name;
  }, [selectedCoin]);

  const formatRate = () => `1 ${symbol} = 1 ${selectedCoin?.currency ?? "USD"}`;

  const updateCoinAddress = (address?: string) => {
    if (!address || !selectedCoin) {
      return;
    }
    setCoins((prev) =>
      prev.map((coin) =>
        (coin.ID ?? String(coin.id)) ===
        (selectedCoin.ID ?? String(selectedCoin.id))
          ? { ...coin, address }
          : coin
      )
    );
  };

  const fetchAddressForCoin = async (chainId?: string) => {
    if (!chainId) {
      return;
    }
    const response = await apiRequest<AddressResponse>({
      path: `${API_ENDPOINTS.depositGetAddress}?chainId=${encodeURIComponent(
        chainId
      )}`,
      method: "GET",
    });
    const address =
      typeof response.data === "string"
        ? response.data
        : response.data?.address;
    if (address) {
      updateCoinAddress(address);
    }
  };

  const refreshAddress = async () => {
    if (!selectedCoin) {
      return;
    }
    const coinId = selectedCoin.ID ?? String(selectedCoin.id ?? "");
    if (!coinId) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await apiRequest<AddressResponse>({
        path: `${API_ENDPOINTS.depositResetAddress}/${coinId}`,
        method: "GET",
      });
      const address =
        typeof response.data === "string"
          ? response.data
          : response.data?.address;
      if (address) {
        updateCoinAddress(address);
        setInfoMessage("Address refreshed.");
      } else {
        setErrorMessage(response.msg || "Unable to refresh address.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to refresh address."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedCoin?.address) {
      return;
    }
    try {
      await navigator.clipboard.writeText(selectedCoin.address);
      setInfoMessage("Address copied.");
    } catch {
      setErrorMessage("Unable to copy address.");
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");
      try {
        const response = await apiRequest<DepositConfigResponse>({
          path: API_ENDPOINTS.depositConfig,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!response.data?.length) {
          setCoins([]);
          setErrorMessage(response.msg || "Unable to load deposit options.");
          return;
        }
        const data = response.data;
        setCoins(data);
        const defaultCoin =
          data.find((coin) => coin.name === "USDT-TRC20") ?? data[0];
        setSelectedId(defaultCoin?.ID ?? String(defaultCoin?.id ?? ""));
        if (defaultCoin?.chainId) {
          await fetchAddressForCoin(defaultCoin.chainId);
        }
      } catch (error) {
        setCoins([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load deposit data."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [open]);

  useEffect(() => {
    if (!open || !selectedCoin?.chainId) {
      return;
    }
    void fetchAddressForCoin(selectedCoin.chainId);
  }, [open, selectedCoin?.chainId]);

  const qrValue = selectedCoin?.address ?? "";
  const qrImageSources = useMemo(() => {
    if (!qrValue) {
      return [];
    }
    const encoded = encodeURIComponent(qrValue);
    return [
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`,
      `https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encoded}`,
    ];
  }, [qrValue]);
  const qrImageUrl = qrImageSources[qrSourceIndex] ?? "";

  useEffect(() => {
    setQrSourceIndex(0);
    setQrLoadError(false);
  }, [qrValue]);
  if (!open) {
    return null;
  }
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Deposit crypto"
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
        <div className="text-sm font-semibold text-(--foreground)">Top up</div>
        <span className="text-xs text-(--paragraph)">{walletName}</span>
      </div>

      <div className="mt-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-(--stroke) bg-(--background) px-4 py-2 text-sm text-(--double-foreground)">
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="bg-(--background) text-sm text-(--foreground) focus:outline-none"
          >
            {coins.map((coin) => {
              const id = coin.ID ?? String(coin.id ?? "");
              return (
                <option key={id + Math.random()} value={id}>
                  {coin.name ?? coin.currency ?? "Select"}
                </option>
              );
            })}
          </select>
          <span className="text-(--placeholder)">▾</span>
        </div>
      </div>

      <div className="mt-6 grid place-items-center">
        <div className="grid h-48 w-48 place-items-center rounded-2xl border border-(--stroke) bg-(--background)">
          {qrImageUrl && !qrLoadError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrImageUrl}
              alt="Deposit QR"
              className="h-44 w-44 object-contain"
              onError={() => {
                if (qrSourceIndex < qrImageSources.length - 1) {
                  setQrSourceIndex((prev) => prev + 1);
                } else {
                  setQrLoadError(true);
                }
              }}
            />
          ) : (
            <span className="inline-flex items-center gap-2 text-xs text-(--paragraph)">
              {loading ? (
                <>
                  <Spinner size={14} />
                  Loading...
                </>
              ) : (
                "No address"
              )}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--double-foreground)">
        <span className="truncate">{qrValue || "Address unavailable"}</span>
        <button
          type="button"
          className="text-(--brand)"
          onClick={handleCopy}
          disabled={!qrValue}
        >
          Copy
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-(--paragraph)">
        <button
          type="button"
          onClick={refreshAddress}
          className="rounded-full border border-(--stroke) bg-(--background) px-3 py-1 text-xs text-(--double-foreground)"
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={12} />
              Refreshing...
            </span>
          ) : (
            "Refresh address"
          )}
        </button>
        {null}
      </div>

      <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
        <div className="flex items-center justify-between">
          <span>Ratio</span>
          <span className="text-(--double-foreground)">{formatRate()}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Top up rates</span>
          <span className="text-(--double-foreground)">
            {selectedCoin?.convertFeeRate
              ? `${selectedCoin.convertFeeRate}%`
              : "--"}
          </span>
        </div>
      </div>

      {null}

      <ul className="mt-4 space-y-2 text-xs text-(--paragraph)">
        <li>
          This address only accepts USDT recharges from the corresponding
          network.
        </li>
        <li>Please don’t recharge any assets other than USDT.</li>
      </ul>
    </ModalShell>
  );
}
