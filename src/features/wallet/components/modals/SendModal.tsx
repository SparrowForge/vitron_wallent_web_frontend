"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { emailSchema, transferSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { Select } from "@/shared/components/ui/Select";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type SendModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type TransferConfigResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    amount?: {
      currency?: string;
      amount?: string;
    }[];
    fee?: string | number;
  };
};

type TransferResponse = {
  code?: number | string;
  msg?: string;
};

export default function SendModal({
  open,
  walletName,
  onClose,
  onSuccess,
}: SendModalProps) {
  type FieldErrorState = {
    amount?: string;
    payPassword?: string;
    verifyCode?: string;
    googleCode?: string;
  };

  const [recipient, setRecipient] = useState("");
  const [emailError, setEmailError] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [feeRate, setFeeRate] = useState(0);
  const [balances, setBalances] = useState<
    { currency: string; amount: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useToastMessages({ errorMessage, infoMessage });
  const [fieldErrors, setFieldErrors] = useState<FieldErrorState>({});

  const formatValue = (val: number) => {
    const str = val.toFixed(6);
    const trimmed = str.replace(/0+$/, "");
    if (trimmed.endsWith(".")) return trimmed + "0";
    return trimmed;
  };

  const balanceForCurrency = useMemo(() => {
    const item = balances.find((entry) => entry.currency === currency);
    const value = Number(item?.amount ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [balances, currency]);

  const amountValue = Number(amount || 0);
  const safeAmount = Number.isFinite(amountValue) ? amountValue : 0;
  const feeValue = safeAmount * (feeRate / 100);
  const totalValue = safeAmount + feeValue;

  const canSubmit = useMemo(() => {
    if (!recipient || !amount || !payPassword) {
      return false;
    }
    if (safeAmount <= 0 || totalValue > balanceForCurrency) {
      return false;
    }
    if (verifyType === "email" && !verifyCode) {
      return false;
    }
    if (verifyType === "google" && !googleCode) {
      return false;
    }
    return true;
  }, [
    recipient,
    amount,
    payPassword,
    safeAmount,
    totalValue,
    balanceForCurrency,
    verifyType,
    verifyCode,
    googleCode,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");
      try {
        const response = await apiRequest<TransferConfigResponse>({
          path: API_ENDPOINTS.transferConfig,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!response.data) {
          setBalances([]);
          setFeeRate(0);
          setErrorMessage(response.msg || "Unable to load transfer config.");
          return;
        }
        const amounts = response.data.amount ?? [];
        setBalances(
          amounts.map((entry) => ({
            currency: entry.currency ?? "USD",
            amount: entry.amount ?? "0",
          })),
        );
        setFeeRate(Number(response.data.fee ?? 0));
        if (amounts[0]?.currency) {
          setCurrency(amounts[0].currency);
        }
      } catch (error) {
        setBalances([]);
        setFeeRate(0);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load transfer config.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [open]);

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
    setErrorMessage("");
    setInfoMessage("");
    if (cooldown > 0) {
      return;
    }
    const validation = emailSchema.safeParse(recipient);
    if (!validation.success) {
      setEmailError(validation.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<TransferResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=walletTransfer`,
        method: "GET",
      });
      setCooldown(60);
      setInfoMessage("Code sent to your email.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecipient("");
    setEmailError("");
    setAmount("");
    setRemark("");
    setPayPassword("");
    setVerifyCode("");
    setGoogleCode("");
    setInfoMessage("");
    setErrorMessage("");
    setCooldown(0);
  };

  const handleTransfer = async () => {
    setErrorMessage("");
    setInfoMessage("");
    const validation = emailSchema.safeParse(recipient);
    if (!validation.success) {
      setEmailError(validation.error?.message ?? "Invalid email.");
      return;
    }
    const formValidation = transferSchema.safeParse({
      email: recipient,
      amount,
      payPassword,
      currency,
      remark,
    });
    if (!formValidation.success) {
      const issue = formValidation.error.issues[0];
      if (issue?.path?.[0] === "email") {
        setEmailError(issue.message);
      }
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
        amount,
        payPassword,
        email: recipient,
        currency,
        remark,
      };
      if (verifyType === "email") {
        payload.code = verifyCode;
      } else {
        payload.googleCode = googleCode;
      }
      const response = await apiRequest<TransferResponse>({
        path: API_ENDPOINTS.transferApply,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Transfer successful.");
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Transfer failed.",
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
      ariaLabel="Send"
      className="max-w-md relative overflow-hidden"
    >
      <LoadingOverlay loading={loading} />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          Back
        </Button>
        <div className="text-sm font-semibold text-(--foreground)">Send</div>
        <span className="text-xs text-(--paragraph)">{walletName}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleTransfer();
        }}
        className="mt-6 space-y-4"
      >
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Receive account
          {!recipient && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <Input
            className={emailError ? "border-red-500 bg-red-500/5" : ""}
            placeholder="Please input email"
            value={recipient}
            onChange={(event) => {
              const value = event.target.value;
              setRecipient(value);
              if (emailError) {
                setEmailError("");
              }
              emailSchema.safeParse(value);
            }}
            onBlur={() => {
              if (!recipient) {
                return;
              }
              const validation = emailSchema.safeParse(recipient);
              setEmailError(
                validation.success
                  ? ""
                  : (validation.error.issues[0]?.message ?? "Invalid email."),
              );
            }}
            error={emailError}
          />
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Currency
          {!currency && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <Select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {balances.map((entry) => (
              <option key={entry.currency} value={entry.currency}>
                {entry.currency}
              </option>
            ))}
          </Select>
          <div className="text-xs text-(--paragraph)">
            Available: {formatValue(balanceForCurrency)} {currency}
          </div>
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Amount
          {!amount && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) => {
              const value = event.target.value;
              setAmount(value);
              const result = transferSchema
                .pick({ amount: true })
                .safeParse({ amount: value });
              setFieldErrors((prev) => ({
                ...prev,
                amount: result.success ? "" : result.error.issues[0]?.message,
              }));
            }}
            error={fieldErrors.amount}
          />
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Remark (optional)
          <div className="relative">
            <Input
              placeholder="Message"
              value={remark}
              maxLength={20}
              onChange={(event) => setRemark(event.target.value)}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-(--placeholder)">
              {remark.length}/20
            </span>
          </div>
        </label>

        <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
          <div className="flex items-center justify-between">
            <span>Fee</span>
            <span className="text-(--double-foreground)">
              {formatValue(feeValue)} {currency}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Total</span>
            <span className="text-(--double-foreground)">
              {formatValue(totalValue)} {currency}
            </span>
          </div>
        </div>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Payment password
          {!payPassword && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <PasswordInput
            className="h-12"
            inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
            placeholder="Enter payment password"
            value={payPassword}
            onChange={(event) => {
              const value = event.target.value;
              setPayPassword(value);
              const result = transferSchema
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
            <p className="text-[11px] text-red-500">
              {fieldErrors.payPassword}
            </p>
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
            {!verifyCode && (
              <span className="text-red-500">
                <sup>*required</sup>
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Enter code"
                  value={verifyCode}
                  onChange={(event) => {
                    setVerifyCode(event.target.value);
                    if (fieldErrors.verifyCode) {
                      setFieldErrors((prev) => ({ ...prev, verifyCode: "" }));
                    }
                  }}
                  error={fieldErrors.verifyCode}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  className="min-w-[120px]"
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </Button>
              </div>
            </div>
          </label>
        ) : (
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Google code
            {!googleCode && (
              <span className="text-red-500">
                <sup>*required</sup>
              </span>
            )}
            <Input
              placeholder="Enter Google code"
              value={googleCode}
              onChange={(event) => {
                setGoogleCode(event.target.value);
                if (fieldErrors.googleCode) {
                  setFieldErrors((prev) => ({ ...prev, googleCode: "" }));
                }
              }}
              error={fieldErrors.googleCode}
            />
          </label>
        )}
        <Button
          type="submit"
          className="w-full mt-4"
          disabled={!canSubmit || loading}
        >
          Transfer
        </Button>
        {/* <span className="text-xs text-red-500">* Input Field is required</span> */}
      </form>
      {null}
    </ModalShell>
  );
}
