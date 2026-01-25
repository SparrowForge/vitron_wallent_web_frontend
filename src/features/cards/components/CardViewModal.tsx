import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cardViewSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type CardViewModalProps = {
  open: boolean;
  cardId: string;
  cardLabel: string;
  maskedNumber: string;
  onClose: () => void;
};

type CardDetailResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    cardNumber?: string;
    expireDate?: string;
    cvv?: string;
    cardType?: string;
  };
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: { emailCheck?: boolean };
};

const splitCardNumber = (cardNumber: string) => {
  const sanitized = cardNumber.replace(/\s+/g, "");
  if (sanitized.length < 16) {
    return [cardNumber];
  }
  return [
    sanitized.slice(0, 4),
    sanitized.slice(4, 8),
    sanitized.slice(8, 12),
    sanitized.slice(12, 16),
  ];
};

export default function CardViewModal({
  open,
  cardId,
  cardLabel,
  maskedNumber,
  onClose,
}: CardViewModalProps) {
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [emailCheck, setEmailCheck] = useState(true);
  const [detail, setDetail] = useState<CardDetailResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const canSubmit = useMemo(() => {
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
  }, [payPassword, emailCheck, verifyType, verifyCode, googleCode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDetail(null);
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
      const response = await apiRequest<CardDetailResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=cardDetail`,
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

  const handleReveal = async () => {
    const validation = cardViewSchema.safeParse({ payPassword });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete the verification.");
      return;
    }
    if (!canSubmit) {
      setErrorMessage("Please complete the verification.");
      return;
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
      const response = await apiRequest<CardDetailResponse>({
        path: API_ENDPOINTS.cardDetail,
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.data) {
        setErrorMessage(response.msg || "Unable to load card details.");
        return;
      }
      setDetail(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load card details.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  const cardNumber = detail?.cardNumber ?? maskedNumber;
  const cardParts = splitCardNumber(cardNumber);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Card view"
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
        <div className="text-sm font-semibold text-(--foreground)">View</div>
        <span className="text-xs text-(--paragraph)">{cardLabel}</span>
      </div>

      <div className="mt-6 rounded-3xl border border-(--stroke) bg-(--background) p-6">
        <div className="text-sm uppercase tracking-[0.3em] text-(--paragraph)">
          CryptoPag
        </div>
        <div className="mt-8 grid grid-cols-4 gap-2 text-lg font-semibold text-(--foreground)">
          {cardParts.map((part, index) => (
            <span key={`card-part-${index}`}>{part}</span>
          ))}
        </div>
        <div className="mt-4 text-xs text-(--paragraph)">VALID THRU</div>
        <div className="text-sm text-(--double-foreground)">
          {detail?.expireDate ?? "--/--"}
        </div>
        <div className="mt-4 text-xs text-(--paragraph)">CVV</div>
        <div className="text-sm text-(--double-foreground)">
          {detail?.cvv ?? "•••"}
        </div>
        <div className="mt-6 text-right text-sm font-semibold text-(--double-foreground)">
          {(detail?.cardType ?? "VISA").toUpperCase()}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleReveal();
        }}
        className="mt-6 space-y-3"
      >
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
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendCode}
                className="text-xs font-semibold"
                disabled={cooldown > 0 || loading}
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
            />
          </label>
        ) : null}

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={!canSubmit || loading}
        >
          Reveal card
        </Button>
        {/* <span className="text-xs text-red-500">* Input Field is required</span> */}
      </form>
      {null}
    </ModalShell>
  );
}
