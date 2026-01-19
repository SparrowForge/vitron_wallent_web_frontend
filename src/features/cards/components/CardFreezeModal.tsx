import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cardFreezeSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
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
        error instanceof Error ? error.message : "Failed to send code.",
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
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Card update failed.",
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
          {isFrozen ? "Unfreeze" : "Freeze"}
        </div>
        <span className="text-xs text-(--paragraph)">{cardLabel}</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleToggle();
        }}
        className="space-y-4"
      >
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
          <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-2 text-xs text-(--paragraph)">
            This card does not support freeze/unfreeze.
          </div>
        ) : null}

        <div className="space-y-3">
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
                  disabled={!canToggle}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  className="min-w-[120px]"
                  disabled={cooldown > 0 || loading || !canToggle}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </Button>
              </div>
            </label>
          ) : null}

          {emailCheck && verifyType === "google" ? (
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
                disabled={!canToggle}
              />
            </label>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit || loading}
        >
          {isFrozen ? "Unfreeze card" : "Freeze card"}
        </Button>
        {/* <span className="text-xs text-red-500">* Input Field is required</span> */}
      </form>
      {null}
    </ModalShell>
  );
}
