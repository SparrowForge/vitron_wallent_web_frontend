"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import { withdrawSchema } from "@/lib/validationSchemas";
import ModalShell from "@/shared/components/ui/ModalShell";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
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
  type FieldErrorState = {
    network?: string;
    address?: string;
    amount?: string;
    payPassword?: string;
    verifyCode?: string;
    googleCode?: string;
  };

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrorState>({});

  useToastMessages({ errorMessage, infoMessage });

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

        if (!response.data) {
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
    setFieldErrors((prev) => ({ ...prev, verifyCode: "", googleCode: "" }));
    const validation = withdrawSchema.safeParse({
      network,
      address,
      amount,
      payPassword,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      if (issue?.path?.[0]) {
        setFieldErrors((prev) => ({
          ...prev,
          [issue.path[0] as keyof FieldErrorState]: issue.message,
        }));
      }
      setErrorMessage(issue?.message ?? "Please complete all required fields.");
      return;
    }
    if (verifyType === "email" && !verifyCode) {
      setFieldErrors((prev) => ({
        ...prev,
        verifyCode: "Email code is required.",
      }));
      setErrorMessage("Email code is required.");
      return;
    }
    if (verifyType === "google" && !googleCode) {
      setFieldErrors((prev) => ({
        ...prev,
        googleCode: "Google code is required.",
      }));
      setErrorMessage("Google code is required.");
      return;
    }
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
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Withdrawal"
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
                onChange={(event) => {
                  const value = event.target.value;
                  setNetwork(value);
                  const result = withdrawSchema.pick({ network: true }).safeParse({
                    network: value,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    network: result.success ? "" : result.error.issues[0]?.message,
                  }));
                }}
                className="w-full bg-transparent text-sm text-(--double-foreground) focus:outline-none"
              >
                <option value="">Please choose</option>
                <option value="USDT-ERC20">USDT-ERC20</option>
                <option value="USDT-TRC20">USDT-TRC20</option>
              </select>
              <span className="text-(--placeholder)">▾</span>
            </div>
            {fieldErrors.network ? (
              <p className="text-[11px] text-red-500">{fieldErrors.network}</p>
            ) : null}
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment address
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Please input"
              value={address}
              onChange={(event) => {
                const value = event.target.value;
                setAddress(value);
                const result = withdrawSchema
                  .pick({ address: true })
                  .safeParse({ address: value });
                setFieldErrors((prev) => ({
                  ...prev,
                  address: result.success ? "" : result.error.issues[0]?.message,
                }));
              }}
            />
            {fieldErrors.address ? (
              <p className="text-[11px] text-red-500">{fieldErrors.address}</p>
            ) : null}
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Withdrawal amount
            <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm">
              <input
                type="number"
                className="w-full bg-transparent text-(--foreground) placeholder:text-(--placeholder) focus:outline-none"
                placeholder={`Minimum ${safeMinWithdraw || 0}`}
                value={amount}
                onChange={(event) => {
                  const value = event.target.value;
                  setAmount(value);
                  const result = withdrawSchema
                    .pick({ amount: true })
                    .safeParse({ amount: value });
                  setFieldErrors((prev) => ({
                    ...prev,
                    amount: result.success ? "" : result.error.issues[0]?.message,
                  }));
                }}
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
            {fieldErrors.amount ? (
              <p className="text-[11px] text-red-500">{fieldErrors.amount}</p>
            ) : null}
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
              onChange={(event) => {
                const value = event.target.value;
                setPayPassword(value);
                const result = withdrawSchema
                  .pick({ payPassword: true })
                  .safeParse({ payPassword: value });
                setFieldErrors((prev) => ({
                  ...prev,
                  payPassword: result.success
                    ? ""
                    : result.error.issues[0]?.message,
                }));
              }}
            />
            {fieldErrors.payPassword ? (
              <p className="text-[11px] text-red-500">{fieldErrors.payPassword}</p>
            ) : null}
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
                  onChange={(event) => {
                    setVerifyCode(event.target.value);
                    if (fieldErrors.verifyCode) {
                      setFieldErrors((prev) => ({ ...prev, verifyCode: "" }));
                    }
                  }}
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
                onChange={(event) => {
                  setGoogleCode(event.target.value);
                  if (fieldErrors.googleCode) {
                    setFieldErrors((prev) => ({ ...prev, googleCode: "" }));
                  }
                }}
              />
              {fieldErrors.googleCode ? (
                <p className="text-[11px] text-red-500">
                  {fieldErrors.googleCode}
                </p>
              ) : null}
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
        {null}
    </ModalShell>
  );
}
