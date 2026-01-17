"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import Spinner from "@/shared/components/ui/Spinner";
import { cardDepositSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
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

  useToastMessages({ errorMessage, infoMessage });

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
        if (!configResponse.data) {
          setErrorMessage(
            configResponse.msg || "Unable to load recharge config."
          );
        }
        setConfig(configResponse.data ?? null);
        setEmailCheck(merchantInfo.data?.emailCheck ?? true);
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
    const validation = cardDepositSchema.safeParse({
      amount,
      payPassword,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete all required fields.");
      return;
    }
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
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Card deposit"
      className="max-w-md"
    >
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          Back
        </Button>
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
          <Input
            type="number"
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRecharge();
        }}
        className="mt-4 space-y-3"
      >
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Payment password
          <PasswordInput
            className="h-12"
            inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
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
              <Input
                placeholder="Enter code"
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendCode}
                className="min-w-[120px]"
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
              </Button>
            </div>
          </label>
        ) : null}

        {emailCheck && verifyType === "google" ? (
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Google code
            <Input
              placeholder="Enter Google code"
              value={googleCode}
              onChange={(event) => setGoogleCode(event.target.value)}
            />
          </label>
        ) : null}

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={!canSubmit || loading}
          loading={loading}
        >
          Recharge
        </Button>
      </form>
      {null}
    </ModalShell>
  );
}
