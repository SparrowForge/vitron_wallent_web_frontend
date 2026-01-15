import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { cardFreezeSchema } from "@/lib/validationSchemas";
import ModalShell from "@/shared/components/ui/ModalShell";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type CardFreezeModalProps = {
  open: boolean;
  cardId: string;
  cardLabel: string;
  status: string;
  frozenFeat?: number | string;
  onClose: () => void;
  onSuccess?: () => void;
};

type CardModifyResponse = {
  code?: number | string;
  msg?: string;
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: { emailCheck?: boolean };
};

export default function CardFreezeModal({
  open,
  cardId,
  cardLabel,
  status,
  frozenFeat,
  onClose,
  onSuccess,
}: CardFreezeModalProps) {
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

  const isFrozen = status === "04";
  const canToggle = Number(frozenFeat ?? 1) === 1;

  const canSubmit = useMemo(() => {
    if (!payPassword || !canToggle) {
      return false;
    }
    if (!emailCheck) {
      return true;
    }
    if (verifyType === "email") {
      return Boolean(verifyCode);
    }
    return Boolean(googleCode);
  }, [payPassword, canToggle, emailCheck, verifyType, verifyCode, googleCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPayPassword("");
    setVerifyCode("");
    setGoogleCode("");
    setInfoMessage("");
    setErrorMessage("");
    const loadMerchantInfo = async () => {
      try {
        const response = await apiRequest<MerchantInfoResponse>({
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
      const response = await apiRequest<CardModifyResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=${
          isFrozen ? "unfrozenCard" : "frozenCard"
        }`,
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

  const handleToggle = async () => {
    const validation = cardFreezeSchema.safeParse({ payPassword });
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
        cardId,
        status: isFrozen ? "1" : "0",
        payPassword,
      };
      if (emailCheck) {
        if (verifyType === "email") {
          payload.code = verifyCode;
        } else {
          payload.googleCode = googleCode;
        }
      }
      const response = await apiRequest<CardModifyResponse>({
        path: API_ENDPOINTS.cardModify,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage(isFrozen ? "Card unfrozen." : "Card frozen.");
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Card update failed."
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
      ariaLabel="Freeze card"
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
            {isFrozen ? "Unfreeze" : "Freeze"}
          </div>
          <span className="text-xs text-(--paragraph)">{cardLabel}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) p-6">
          <p className="text-sm text-(--double-foreground)">
            {isFrozen
              ? "Unfreeze this card to allow transactions again."
              : "Freeze this card to prevent new transactions."}
          </p>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--basic-cta) px-4 py-3 text-sm">
            <span className="text-(--paragraph)">Card status</span>
            <span className="text-(--brand)">
              {isFrozen ? "Frozen" : "Active"}
            </span>
          </div>
        </div>

        {!canToggle ? (
          <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-2 text-xs text-(--paragraph)">
            This card does not support freeze/unfreeze.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment password
            <PasswordInput
              className="h-12"
              inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
              placeholder="Enter payment password"
              value={payPassword}
              onChange={(event) => setPayPassword(event.target.value)}
              disabled={!canToggle}
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
                  disabled={!canToggle}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="h-12 min-w-[120px] rounded-2xl border border-(--stroke) bg-(--background) px-4 text-xs font-semibold text-(--foreground)"
                  disabled={cooldown > 0 || loading || !canToggle}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
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
                disabled={!canToggle}
              />
            </label>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleToggle}
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
          ) : isFrozen ? (
            "Unfreeze"
          ) : (
            "Freeze"
          )}
        </button>
        {null}
    </ModalShell>
  );
}
