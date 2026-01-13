"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/components/ui/Spinner";
import { useEffect, useMemo, useState } from "react";

type WithdrawModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type WithdrawConfigResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    amount?: string | number;
    minWithdraw?: string | number;
    ratio?: string | number;
  };
};

type WithdrawApplyResponse = {
  code?: number | string;
  msg?: string;
};

type VerifyCodeResponse = {
  code?: number | string;
  msg?: string;
};

export default function WithdrawModal({
  open,
  walletName,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [network, setNetwork] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] =
    useState<WithdrawConfigResponse["data"]>(undefined);

  const availableAmount = Number(config?.amount ?? 0);
  const minWithdraw = Number(config?.minWithdraw ?? 0);
  const ratio = Number(config?.ratio ?? 0);
  const amountValue = Number(amount || 0);

  const safeAvailable = Number.isFinite(availableAmount) ? availableAmount : 0;
  const safeMinWithdraw = Number.isFinite(minWithdraw) ? minWithdraw : 0;
  const safeRatio = Number.isFinite(ratio) ? ratio : 0;
  const safeAmount = Number.isFinite(amountValue) ? amountValue : 0;

  const feeValue = safeAmount * (safeRatio / 100);
  const estimateValue = safeAmount - feeValue;

  const canSubmit = useMemo(() => {
    if (!amount || !address || !network || !payPassword) return false;
    if (safeAmount < safeMinWithdraw || safeAmount > safeAvailable)
      return false;
    if (verifyType === "email" && !verifyCode) return false;
    if (verifyType === "google" && !googleCode) return false;
    return true;
  }, [
    amount,
    address,
    network,
    payPassword,
    safeAmount,
    safeMinWithdraw,
    safeAvailable,
    verifyType,
    verifyCode,
    googleCode,
  ]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return;

    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");
      try {
        const response = await apiRequest<WithdrawConfigResponse>({
          path: API_ENDPOINTS.withdrawConfig,
          method: "GET",
        });

        if (Number(response.code) !== 200 || !response.data) {
          setErrorMessage(response.msg || "Unable to load withdraw config.");
          return;
        }

        setConfig(response.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load withdraw config."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [open]);

  // ✅ Put this AFTER hooks
  if (!open) return null;

  const handleMax = () => {
    if (!availableAmount) return;
    setAmount(availableAmount.toFixed(2));
  };

  const resetForm = () => {
    setNetwork("");
    setAddress("");
    setAmount("");
    setPayPassword("");
    setVerifyCode("");
    setGoogleCode("");
    setErrorMessage("");
    setInfoMessage("");
    setCooldown(0);
  };

  const handleWithdraw = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (!canSubmit) {
      setErrorMessage("Please complete all required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        addressChain: network,
        amount,
        address,
        payPassword,
      };
      if (verifyType === "email") payload.code = verifyCode;
      else payload.googleCode = googleCode;

      const response = await apiRequest<WithdrawApplyResponse>({
        path: API_ENDPOINTS.withdrawApply,
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Withdraw request failed.");
        return;
      }

      setInfoMessage("Withdrawal submitted successfully.");
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Withdraw request failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (cooldown > 0) {
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<VerifyCodeResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=withdraw`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Withdrawal"
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
            Withdrawal
          </div>
          <span className="text-xs text-(--paragraph)">{walletName}</span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Currency
            <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              USDT
            </div>
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Network
            <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              <select
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
                className="w-full bg-transparent text-sm text-(--double-foreground) focus:outline-none"
              >
                <option value="">Please choose</option>
                <option value="USDT-ERC20">USDT-ERC20</option>
                <option value="USDT-TRC20">USDT-TRC20</option>
              </select>
              <span className="text-(--placeholder)">▾</span>
            </div>
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment address
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Please input"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Withdrawal amount
            <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm">
              <input
                type="number"
                className="w-full bg-transparent text-(--foreground) placeholder:text-(--placeholder) focus:outline-none"
                placeholder={`Minimum ${safeMinWithdraw || 0}`}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span className="ml-3 text-(--double-foreground)">USD</span>
              <button
                type="button"
                onClick={handleMax}
                className="ml-3 text-(--brand)"
              >
                Max
              </button>
            </div>
            <div className="text-xs text-(--paragraph)">
              Available: {safeAvailable.toFixed(2)} USD
            </div>
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
            <span>Received amount</span>
            <span className="text-(--double-foreground)">
              {estimateValue.toFixed(2)} USDT
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

          {verifyType === "email" ? (
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
          ) : (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Google code
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
                placeholder="Enter Google code"
                value={googleCode}
                onChange={(event) => setGoogleCode(event.target.value)}
              />
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={handleWithdraw}
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
            "Withdrawal"
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
