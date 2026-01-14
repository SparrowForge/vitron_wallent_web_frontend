"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import { cardActivateSchema } from "@/lib/validationSchemas";
import ModalShell from "@/shared/components/ui/ModalShell";
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
        error instanceof Error ? error.message : "Failed to send code."
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
        error instanceof Error ? error.message : "Failed to get activation code."
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
        error instanceof Error ? error.message : "Activation failed."
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
            Activate card
          </div>
          <span className="text-xs text-(--paragraph)">{maskedNumber}</span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Activation code
            <div className="flex items-center gap-3">
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
                placeholder="Enter activation code"
                value={activeCode}
                onChange={(event) => setActiveCode(event.target.value)}
              />
              <button
                type="button"
                onClick={handleRequestActiveCode}
                className="h-12 min-w-[120px] rounded-2xl border border-(--stroke) bg-(--background) px-4 text-xs font-semibold text-(--foreground)"
                disabled={loading}
              >
                Get code
              </button>
            </div>
          </label>

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
        </div>

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
        ) : null}

        <button
          type="button"
          onClick={handleActivate}
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
              Activating...
            </span>
          ) : (
            "Activate"
          )}
        </button>
        {null}
    </ModalShell>
  );
}
