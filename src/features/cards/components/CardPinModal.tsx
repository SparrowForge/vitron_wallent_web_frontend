"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import Spinner from "@/shared/components/ui/Spinner";
import { cardPinSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type CardPinModalProps = {
  open: boolean;
  cardId: string;
  maskedNumber: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type ApiResponse = {
  code?: number | string;
  msg?: string;
  data?: { emailCheck?: boolean };
};

const isSixDigitPin = (value: string) => /^\d{6}$/.test(value);

export default function CardPinModal({
  open,
  cardId,
  maskedNumber,
  onClose,
  onSuccess,
}: CardPinModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
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

  const canSubmit = useMemo(() => {
    if (!isSixDigitPin(pin) || pin !== confirmPin) {
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
  }, [pin, confirmPin, payPassword, emailCheck, verifyType, verifyCode, googleCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPin("");
    setConfirmPin("");
    setPayPassword("");
    setVerifyCode("");
    setGoogleCode("");
    setErrorMessage("");
    setInfoMessage("");
    const loadMerchantInfo = async () => {
      try {
        const response = await apiRequest<ApiResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        setEmailCheck(response.data?.emailCheck ?? true);
      } catch {
        setEmailCheck(true);
      }
    };
    void loadMerchantInfo();
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
    if (cooldown > 0 || !emailCheck) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=setPin`,
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

  const handleSubmit = async () => {
    const validation = cardPinSchema.safeParse({
      pin,
      confirmPin,
      payPassword,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return;
    }
    if (!canSubmit) {
      setErrorMessage("Please complete the required fields.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const payload: Record<string, string> = {
        cardId,
        pin,
        payPassword,
      };
      if (emailCheck) {
        if (verifyType === "email") {
          payload.code = verifyCode;
        } else {
          payload.googleCode = googleCode;
        }
      }
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.cardUpdatePin,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("PIN updated.");
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update PIN."
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
      ariaLabel="Set PIN"
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
        <div className="text-sm font-semibold text-(--foreground)">Set PIN</div>
        <span className="text-xs text-(--paragraph)">{maskedNumber}</span>
      </div>

      <div className="mt-6 space-y-4">
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          New PIN
          <PasswordInput
            inputMode="numeric"
            maxLength={6}
            className="h-12"
            inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
            placeholder="6-digit PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Confirm PIN
          <PasswordInput
            inputMode="numeric"
            maxLength={6}
            className="h-12"
            inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value)}
          />
        </label>
        {pin && confirmPin && pin !== confirmPin ? (
          <p className="text-xs text-red-500">PINs do not match.</p>
        ) : null}
        {pin && !isSixDigitPin(pin) ? (
          <p className="text-xs text-red-500">PIN must be 6 digits.</p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
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
          <>
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
                  <Input
                    placeholder="Enter code"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                  />
                  <Button
                    type="button"
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
            ) : (
              <label className="space-y-2 text-xs font-medium text-(--paragraph)">
                Google code
                <Input
                  placeholder="Enter Google code"
                  value={googleCode}
                  onChange={(event) => setGoogleCode(event.target.value)}
                />
              </label>
            )}
          </>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        className="mt-6 w-full"
        disabled={!canSubmit || loading}
        loading={loading}
      >
        Save PIN
      </Button>
      {null}
    </ModalShell>
  );
}
