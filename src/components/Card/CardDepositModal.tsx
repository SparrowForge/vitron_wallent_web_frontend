"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/components/ui/Spinner";
import { useEffect, useMemo, useState } from "react";

type CardDepositModalProps = {
  open: boolean;
  cardId: string;
  cardLabel: string;
  maskedNumber: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type CardRechargeConfigResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    baseRechargeFeeWay?: number;
    baseRechargeFee?: number;
    baseRechargeFeeRate?: number;
    inCardFeeWay?: number;
    inCardFee?: number;
    inCardFeeRate?: number;
  };
};

type CardRechargeResponse = {
  code?: number | string;
  msg?: string;
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: { emailCheck?: boolean };
};

const calculateFee = (
  amount: number,
  baseWay: number,
  baseFee: number,
  baseRate: number,
  inWay: number,
  inFee: number,
  inRate: number
) => {
  const calcCharge = (way: number, fee: number, rate: number) => {
    if (!amount) {
      return 0;
    }
    if (way === 1) {
      return fee;
    }
    if (way === 2) {
      return (rate * amount) / 100;
    }
    return fee + (rate * amount) / 100;
  };
  return (
    calcCharge(baseWay, baseFee, baseRate) +
    calcCharge(inWay, inFee, inRate)
  );
};

export default function CardDepositModal({
  open,
  cardId,
  cardLabel,
  maskedNumber,
  onClose,
  onSuccess,
}: CardDepositModalProps) {
  const [amount, setAmount] = useState("");
  const [config, setConfig] = useState<CardRechargeConfigResponse["data"] | null>(
    null
  );
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [emailCheck, setEmailCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const amountValue = Number(amount || 0);
  const safeAmount = Number.isFinite(amountValue) ? amountValue : 0;

  const feeValue = useMemo(() => {
    if (!config) {
      return 0;
    }
    return calculateFee(
      safeAmount,
      Number(config.baseRechargeFeeWay ?? 0),
      Number(config.baseRechargeFee ?? 0),
      Number(config.baseRechargeFeeRate ?? 0),
      Number(config.inCardFeeWay ?? 0),
      Number(config.inCardFee ?? 0),
      Number(config.inCardFeeRate ?? 0)
    );
  }, [config, safeAmount]);

  const totalValue = safeAmount + feeValue;

  const canSubmit = useMemo(() => {
    if (!safeAmount || safeAmount <= 0) {
      return false;
    }
    if (!payPassword) {
      return false;
    }
    if (!emailCheck) {
      return true;
    }
    if (verifyType === "email") {
      return Boolean(verifyCode);
    }
    return Boolean(googleCode);
  }, [safeAmount, payPassword, emailCheck, verifyType, verifyCode, googleCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setAmount("");
    setPayPassword("");
    setVerifyCode("");
    setGoogleCode("");
    setInfoMessage("");
    setErrorMessage("");
    const loadConfig = async () => {
      setLoading(true);
      try {
        const [configResponse, merchantInfo] = await Promise.all([
          apiRequest<CardRechargeConfigResponse>({
            path: API_ENDPOINTS.cardRechargeConfig,
            method: "POST",
            body: JSON.stringify({ cardId }),
          }),
          apiRequest<MerchantInfoResponse>({
            path: API_ENDPOINTS.merchantInfo,
            method: "POST",
            body: JSON.stringify({}),
          }),
        ]);
        if (Number(configResponse.code) !== 200) {
          setErrorMessage(
            configResponse.msg || "Unable to load recharge config."
          );
        } else {
          setConfig(configResponse.data ?? null);
        }
        if (Number(merchantInfo.code) === 200) {
          setEmailCheck(merchantInfo.data?.emailCheck ?? true);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load recharge config."
        );
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, [open, cardId]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    if (cooldown > 0 || !emailCheck) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await apiRequest<CardRechargeResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=depositCard`,
        method: "GET",
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Failed to send code.");
        return;
      }
      setCooldown(60);
      setInfoMessage("Code sent to your email.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!canSubmit) {
      setErrorMessage("Please complete all required fields.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const payload: Record<string, string> = {
        amount: amount,
        cardId,
        payPassword,
      };
      if (emailCheck) {
        if (verifyType === "email") {
          payload.code = verifyCode;
        } else {
          payload.googleCode = googleCode;
        }
      }
      const response = await apiRequest<CardRechargeResponse>({
        path: API_ENDPOINTS.cardRechargeApply,
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Recharge failed.");
        return;
      }
      setInfoMessage("Recharge successful.");
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recharge failed."
      );
    } finally {
      setLoading(false);
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
      aria-label="Card deposit"
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
            Card deposit
          </div>
          <span className="text-xs text-(--paragraph)">{cardLabel}</span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Card number
            <div className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              {maskedNumber}
            </div>
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Amount
            <input
              type="number"
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Enter amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
          <div className="flex items-center justify-between">
            <span>Fee</span>
            <span className="text-(--double-foreground)">
              {feeValue.toFixed(2)} USD
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Total</span>
            <span className="text-(--double-foreground)">
              {totalValue.toFixed(2)} USD
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment password
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Enter payment password"
              value={payPassword}
              onChange={(event) => setPayPassword(event.target.value)}
            />
          </label>

          {emailCheck ? (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Verification method
              <div className="flex items-center gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verifyType === "email"}
                    onChange={() => setVerifyType("email")}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verifyType === "google"}
                    onChange={() => setVerifyType("google")}
                  />
                  Google
                </label>
              </div>
            </label>
          ) : null}

          {emailCheck && verifyType === "email" ? (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Email code
              <div className="flex items-center gap-3">
                <input
                  className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
                  placeholder="Enter code"
                  value={verifyCode}
                  onChange={(event) => setVerifyCode(event.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="h-12 min-w-[120px] rounded-2xl border border-(--stroke) bg-(--background) px-4 text-xs font-semibold text-(--foreground)"
                  disabled={cooldown > 0 || loading}
                >
                  {loading && cooldown === 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size={14} />
                      Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `${cooldown}s`
                  ) : (
                    "Send code"
                  )}
                </button>
              </div>
            </label>
          ) : null}

          {emailCheck && verifyType === "google" ? (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Google code
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
                placeholder="Enter Google code"
                value={googleCode}
                onChange={(event) => setGoogleCode(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleRecharge}
          className={`mt-6 h-12 w-full rounded-2xl text-sm font-semibold ${
            canSubmit
              ? "bg-(--brand) text-(--background)"
              : "bg-(--stroke) text-(--placeholder)"
          }`}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={16} className="border-(--background)" />
              Submitting...
            </span>
          ) : (
            "Recharge"
          )}
        </button>
        {errorMessage ? (
          <p className="mt-3 text-xs text-(--paragraph)">{errorMessage}</p>
        ) : null}
        {infoMessage ? (
          <p className="mt-2 text-xs text-(--paragraph)">{infoMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
