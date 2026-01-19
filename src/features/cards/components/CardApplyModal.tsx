"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cn } from "@/lib/utils";
import { cardApplySchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MerchantInfo = {
  kycStatus?: number | string;
  isPayPassword?: number | string | null;
  emailCheck?: boolean;
};

type BinModel = {
  ID?: string;
  id?: string;
  bin?: string;
  cardType?: string;
  type?: string;
  baseCardFee?: number;
  applyCard?: number;
  basePhysicalCardFee?: number;
  applyCardMinAmount?: number;
  applyCardMaxAmount?: number;
  supportPhysicalCard?: string;
  cardHolderType?: string;
  cardHolderStatus?: string;
  currency?: string;
};

type ApplyBinsResponse = {
  code?: number | string;
  msg?: string;
  data?: { bin?: BinModel[] } | BinModel[];
};

type PendingCountResponse = {
  code?: number | string;
  msg?: string;
  data?: number | string;
};

type ApplyResponse = {
  code?: number | string;
  msg?: string;
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: MerchantInfo | null;
};

type CardApplyModalProps = {
  open: boolean;
  onClose: () => void;
};

const getBinId = (bin: BinModel) => String(bin.ID ?? bin.id ?? "");
const getBinValue = (bin: BinModel) => String(bin.bin ?? "");

const getCardFee = (
  bin: BinModel,
  cardType: "VIRTUAL_CARD" | "PHYSICAL_CARD",
) =>
  cardType === "PHYSICAL_CARD"
    ? Number(bin.basePhysicalCardFee ?? 0) + Number(bin.applyCard ?? 0)
    : Number(bin.baseCardFee ?? 0) + Number(bin.applyCard ?? 0);

const getKycStatusLabel = (status?: number | string) => {
  switch (Number(status)) {
    case 0:
      return "In review";
    case 1:
      return "Review completed";
    case 2:
      return "Face verification required";
    case 3:
      return "Awaiting review";
    case 4:
      return "Rejected";
    case 5:
      return "Verified";
    case 7:
      return "Not submitted";
    default:
      return "Unverified";
  }
};

const getHolderStatusLabel = (status?: string) => {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "PENDING":
      return "Pending";
    case "INACTIVE":
      return "Inactive";
    case "REJECTED":
      return "Rejected";
    case "FROZEN":
      return "Frozen";
    default:
      return "Not Created";
  }
};

export default function CardApplyModal({ open, onClose }: CardApplyModalProps) {
  const [bins, setBins] = useState<BinModel[]>([]);
  const [selectedBinId, setSelectedBinId] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [cardType, setCardType] = useState<"VIRTUAL_CARD" | "PHYSICAL_CARD">(
    "VIRTUAL_CARD",
  );
  const [alias, setAlias] = useState("");
  const [payPassword, setPayPassword] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [verifyCode, setVerifyCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const selectedBin = useMemo(
    () => bins.find((bin) => getBinId(bin) === selectedBinId) ?? null,
    [bins, selectedBinId],
  );

  const supportsPhysical = Number(selectedBin?.supportPhysicalCard ?? 0) === 1;
  const requiresHolder = Boolean(selectedBin?.cardHolderType);
  const holderStatus = selectedBin?.cardHolderStatus ?? "";

  const kycOk = Number(merchantInfo?.kycStatus) === 5;
  const payPasswordOk = Number(merchantInfo?.isPayPassword) === 1;
  const emailCheck = merchantInfo?.emailCheck ?? true;

  const canSubmit =
    Boolean(selectedBin) &&
    kycOk &&
    payPasswordOk &&
    (!requiresHolder || holderStatus === "ACTIVE") &&
    payPassword &&
    (!emailCheck || (verifyType === "email" ? verifyCode : googleCode));

  useEffect(() => {
    if (!open) {
      return;
    }
    let mounted = true;
    const loadApplyData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [binsRes, pendingRes, merchantRes] = await Promise.allSettled([
          apiRequest<ApplyBinsResponse>({
            path: API_ENDPOINTS.cardApplyBins,
            method: "POST",
            body: JSON.stringify({}),
          }),
          apiRequest<PendingCountResponse>({
            path: API_ENDPOINTS.cardPendingCount,
            method: "POST",
            body: JSON.stringify({}),
          }),
          apiRequest<MerchantInfoResponse>({
            path: API_ENDPOINTS.merchantInfo,
            method: "POST",
            body: JSON.stringify({}),
          }),
        ]);

        if (!mounted) return;

        // --- Pending (optional)
        if (pendingRes.status === "fulfilled") {
          const pendingResponse = pendingRes.value;
          if (Number(pendingResponse.code) === 200) {
            setPendingCount(Number(pendingResponse.data ?? 0));
          }
        }

        // --- Merchant (optional)
        if (merchantRes.status === "fulfilled") {
          const merchantResponse = merchantRes.value;
          if (Number(merchantResponse.code) === 200) {
            setMerchantInfo(merchantResponse.data ?? null);
          }
        }

        // --- Bins (required)
        if (binsRes.status !== "fulfilled") {
          throw binsRes.reason instanceof Error
            ? binsRes.reason
            : new Error("Unable to load card bins.");
        }

        const binsResponse = binsRes.value;
        if (Number(binsResponse.code) !== 200) {
          throw new Error(binsResponse.msg || "Unable to load card bins.");
        }

        const binsData = Array.isArray(binsResponse.data)
          ? binsResponse.data
          : (binsResponse.data?.bin ?? []);

        setBins(binsData);
        const firstBinId = binsData.length > 0 ? getBinId(binsData[0]) : "";
        setSelectedBinId((current) => current || firstBinId);

        // Optional: if other calls failed, still show a soft message
        const anyFailed =
          pendingRes.status === "rejected" || merchantRes.status === "rejected";
        if (anyFailed) {
          setErrorMessage(
            "Some data couldn't be loaded, but bins are available.",
          );
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load card apply data.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const needsRefresh =
      typeof window !== "undefined" &&
      localStorage.getItem("vtron_refresh_card_bins") === "1";
    if (needsRefresh) {
      localStorage.removeItem("vtron_refresh_card_bins");
    }
    loadApplyData();
    return () => {
      mounted = false;
    };
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

  useEffect(() => {
    if (!selectedBin) {
      return;
    }
    if (!supportsPhysical) {
      setCardType("VIRTUAL_CARD");
    }
  }, [selectedBin, supportsPhysical]);

  const handleSendCode = async () => {
    if (cooldown > 0 || !emailCheck) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await apiRequest<ApplyResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=applyCard`,
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

  const handleApply = async () => {
    if (!selectedBin) {
      setErrorMessage("Please select a card.");
      return;
    }
    const formValidation = cardApplySchema.safeParse({
      cardBinId: getBinId(selectedBin),
      payPassword,
      cardType,
      alias,
    });
    if (!formValidation.success) {
      const issue = formValidation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete all required fields.");
      return;
    }
    if (!kycOk) {
      setErrorMessage("Complete KYC to apply for a card.");
      return;
    }
    if (!payPasswordOk) {
      setErrorMessage("Set your transaction password to continue.");
      return;
    }
    if (requiresHolder && holderStatus !== "ACTIVE") {
      setErrorMessage("Card holder information is required.");
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
        cardBinId: getBinId(selectedBin),
        amount: "0",
        payPassword,
        alias,
        cardType,
      };
      if (emailCheck) {
        if (verifyType === "email") {
          payload.code = verifyCode;
        } else {
          payload.googleCode = googleCode;
        }
      }
      const response = await apiRequest<ApplyResponse>({
        path: API_ENDPOINTS.cardApply,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Card application submitted.");
      onClose();
      setAlias("");
      setPayPassword("");
      setVerifyCode("");
      setGoogleCode("");
      setCooldown(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Apply failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  const fee = selectedBin ? getCardFee(selectedBin, cardType) : 0;
  const minAmount = selectedBin?.applyCardMinAmount ?? 0;
  const maxAmount = selectedBin?.applyCardMaxAmount ?? 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Apply card"
      className="max-w-3xl relative overflow-hidden"
    >
      <LoadingOverlay loading={loading} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-(--paragraph)">
            Apply Card
          </div>
          <h2 className="text-2xl font-semibold text-(--foreground)">
            Choose your card
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          Close
        </Button>
      </div>

      {pendingCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-2 text-xs text-(--paragraph)">
          {pendingCount} card application{pendingCount === 1 ? "" : "s"} in
          review
        </div>
      ) : null}

      {null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-4">
          <Card className="p-0 overflow-hidden bg-(--background)">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-(--foreground)">
                Available card bins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {bins.length === 0 ? (
                  <div className="text-sm text-(--paragraph)">
                    No card bins available yet.
                  </div>
                ) : (
                  bins.map((bin) => {
                    const id = getBinId(bin);
                    const active = id === selectedBinId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedBinId(id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                          active
                            ? "border-(--brand) bg-(--basic-cta) shadow-[0_0_20px_-5px_rgba(var(--brand-rgb),0.3)]"
                            : "border-(--stroke) bg-(--basic-cta) hover:border-(--brand)/50 hover:bg-(--basic-cta)/80"
                        }`}
                      >
                        <div className="text-sm font-semibold text-(--foreground)">
                          {bin.cardType ?? "Card"}
                        </div>
                        <div className="mt-1 text-xs text-(--paragraph)">
                          {bin.currency ?? "USD"}
                        </div>
                        <div className="mt-3 text-xs text-(--paragraph)">
                          {Number(bin.applyCardMinAmount ?? 0)}-
                          {Number(bin.applyCardMaxAmount ?? 0)} USD
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0 overflow-hidden bg-(--background)">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-(--foreground)">
                <span>Card type</span>
                <span className="text-xs text-(--paragraph)">
                  {supportsPhysical ? "Virtual / Physical" : "Virtual only"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={cardType === "VIRTUAL_CARD" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCardType("VIRTUAL_CARD")}
                  className="flex-1"
                >
                  Virtual
                </Button>
                <Button
                  variant={cardType === "PHYSICAL_CARD" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCardType("PHYSICAL_CARD")}
                  disabled={!supportsPhysical}
                  className="flex-1"
                >
                  Physical
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="p-0 overflow-hidden bg-(--background)">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-(--foreground)">
                Application details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center justify-between text-xs text-(--paragraph)">
                <span>Apply fee</span>
                <span className="text-(--foreground)">
                  {fee.toFixed(2)} USD
                </span>
              </div>
              <div className="mt-2 text-xs text-(--paragraph)">
                Top up range {Number(minAmount).toFixed(2)} -{" "}
                {Number(maxAmount).toFixed(2)} USD
              </div>
              <Input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Card alias (optional)"
                className="mt-4"
              />
            </CardContent>
          </Card>

          <Card className="p-0 overflow-hidden bg-(--background)">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-(--foreground)">
                Security verification
                {!payPassword && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {/* Authentication Status Box */}
              <div className="mb-3 rounded-xl border border-(--stroke) bg-(--basic-cta)/50 px-3 py-2.5 text-xs">
                <div className="mb-2 text-(--paragraph)">
                  {kycOk
                    ? "Your identity verification is complete."
                    : "Complete KYC in the Authentication page before applying."}
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href="/authentication"
                    className="font-medium text-(--brand) hover:underline"
                    onClick={onClose}
                  >
                    {kycOk ? "View Authentication" : "Go to Authentication"}
                  </Link>
                  <span
                    className={cn(
                      "font-medium",
                      kycOk ? "text-green-500" : "text-amber-500",
                    )}
                  >
                    {getKycStatusLabel(merchantInfo?.kycStatus)}
                  </span>
                </div>
              </div>

              {kycOk && !payPasswordOk ? (
                <div className="mb-3 rounded-xl border border-(--stroke) bg-(--basic-cta) px-3 py-2 text-xs text-(--paragraph)">
                  Set your transaction password in Settings.
                  <div className="mt-2">
                    <Link
                      href="/settings/transaction-password"
                      className="text-xs font-semibold text-(--brand)"
                      onClick={onClose}
                    >
                      Set transaction password
                    </Link>
                  </div>
                </div>
              ) : null}

              {/* Holder Status Box */}
              {requiresHolder && (
                <div className="mb-4 rounded-xl border border-(--stroke) bg-(--basic-cta)/50 px-3 py-2.5 text-xs">
                  <div className="mb-2 text-(--paragraph)">
                    {holderStatus === "ACTIVE"
                      ? "Card holder information is active."
                      : holderStatus === "PENDING"
                        ? "Card holder information is under review."
                        : "Card holder information is required before you can apply."}
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/cards/holder?bin=${encodeURIComponent(
                        getBinValue(selectedBin ?? {}),
                      )}&status=${encodeURIComponent(holderStatus)}`}
                      className="font-medium text-(--brand) hover:underline"
                      onClick={onClose}
                    >
                      {holderStatus === "ACTIVE" || holderStatus === "PENDING"
                        ? "View Holder Info"
                        : holderStatus === "INACTIVE"
                          ? "Update Holder Info"
                          : "Create Holder Info"}
                    </Link>
                    <span
                      className={cn(
                        "font-medium",
                        holderStatus === "ACTIVE"
                          ? "text-green-500"
                          : "text-amber-500",
                      )}
                    >
                      {getHolderStatusLabel(holderStatus)}
                    </span>
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApply();
                }}
                className="space-y-3"
              >
                <PasswordInput
                  value={payPassword}
                  onChange={(event) => setPayPassword(event.target.value)}
                  placeholder="Transaction password"
                  disabled={!kycOk || !payPasswordOk}
                />
                {emailCheck ? (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setVerifyType(
                            verifyType === "email" ? "google" : "email",
                          )
                        }
                        className="h-auto p-0 text-xs font-semibold text-(--brand)"
                      >
                        Switch to {verifyType === "email" ? "Google" : "Email"}
                      </Button>
                      {verifyType === "email" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSendCode}
                          className="text-xs font-semibold"
                          disabled={cooldown > 0 || loading}
                        >
                          {cooldown > 0 ? `${cooldown}s` : "Send code"}
                        </Button>
                      ) : null}
                    </div>
                    {verifyType === "email" ? (
                      <Input
                        value={verifyCode}
                        onChange={(event) => setVerifyCode(event.target.value)}
                        placeholder="Email code"
                        className="mt-3"
                        disabled={!kycOk || !payPasswordOk}
                      />
                    ) : (
                      <Input
                        value={googleCode}
                        onChange={(event) => setGoogleCode(event.target.value)}
                        placeholder="Google code"
                        className="mt-3"
                        disabled={!kycOk || !payPasswordOk}
                      />
                    )}
                  </>
                ) : null}
                <Button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="mt-4 w-full"
                >
                  Apply card
                </Button>
                {/* <span className="text-xs text-red-500">
                  * Input Field is required
                </span> */}
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </ModalShell>
  );
}
