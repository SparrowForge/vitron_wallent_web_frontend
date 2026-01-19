"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cardActivateSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type CardActivateModalProps = {
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

export default function CardActivateModal({
  open,
  cardId,
  maskedNumber,
  onClose,
  onSuccess,
}: CardActivateModalProps) {
  const [activeCode, setActiveCode] = useState("");
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verificationPurpose, setVerificationPurpose] = useState<
    "activate" | "getCode"
  >("activate");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [emailCheck, setEmailCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const canSubmit = useMemo(() => {
    if (!activeCode || !payPassword) {
      return false;
    }
    if (!emailCheck) {
      return true;
    }
    if (verifyType === "email") {
      return Boolean(verifyCode);
    }
    return Boolean(googleCode);
  }, [activeCode, payPassword, emailCheck, verifyType, verifyCode, googleCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveCode("");
    setPayPassword("");
    setVerificationPurpose("activate");
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
        path: `${API_ENDPOINTS.sendVerifyCode}?type=${
          verificationPurpose === "getCode" ? "activeCodeCheck" : "activeCard"
        }`,
        method: "GET",
      });
      setCooldown(60);
      setInfoMessage("Verification code sent to your email.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestActiveCode = async () => {
    if (!payPassword) {
      setErrorMessage("Payment password is required.");
      return;
    }
    if (emailCheck) {
      if (verifyType === "email" && !verifyCode) {
        setErrorMessage("Verification code is required.");
        return;
      }
      if (verifyType === "google" && !googleCode) {
        setErrorMessage("Google code is required.");
        return;
      }
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const payload: Record<string, string> = {
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
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.cardActiveCode,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Activation code sent to your email.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to get activation code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    const validation = cardActivateSchema.safeParse({
      activeCode,
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
        activeCode,
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
        path: API_ENDPOINTS.cardActivate,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Card activated.");
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Activation failed.",
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
      ariaLabel="Activate card"
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
        <div className="text-sm font-semibold text-(--foreground)">
          Activate card
        </div>
        <span className="text-xs text-(--paragraph)">{maskedNumber}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleActivate();
        }}
        className="mt-6 space-y-4"
      >
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Activation code
          {!activeCode && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Enter activation code"
              value={activeCode}
              onChange={(event) => setActiveCode(event.target.value)}
            />
            <Button
              type="button"
              onClick={handleRequestActiveCode}
              className="min-w-[120px]"
              disabled={loading}
            >
              Get code
            </Button>
          </div>
        </label>

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
            onChange={(event) => setPayPassword(event.target.value)}
          />
        </label>

        {emailCheck ? (
          <div className="mt-4 space-y-3">
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Verification purpose
              <div className="flex items-center gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verificationPurpose === "activate"}
                    onChange={() => setVerificationPurpose("activate")}
                  />
                  Activate
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verificationPurpose === "getCode"}
                    onChange={() => setVerificationPurpose("getCode")}
                  />
                  Get code
                </label>
              </div>
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
                    {cooldown > 0 ? `${cooldown}s` : "Send code"}
                  </Button>
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
                  onChange={(event) => setGoogleCode(event.target.value)}
                />
              </label>
            )}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={!canSubmit || loading}
        >
          Activate
        </Button>
        <span className="text-xs text-red-500">* Input Field is required</span>
      </form>
      {null}
    </ModalShell>
  );
}
