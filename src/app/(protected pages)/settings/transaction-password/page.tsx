"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { transactionPasswordSchema } from "@/lib/validationSchemas";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    isPayPassword?: string | number | null;
    googleStatus?: string | number | null;
    email?: string | null;
  };
};

type VerifyCodeResponse = {
  code?: number | string;
  msg?: string;
};

type UpdatePasswordResponse = {
  code?: number | string;
  msg?: string;
};

export default function TransactionPasswordPage() {
  const [payPassword, setPayPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });
  const [isPayPasswordSet, setIsPayPasswordSet] = useState(false);
  const [needsGoogle, setNeedsGoogle] = useState(false);

  const payPasswordType = useMemo(
    () => (isPayPasswordSet ? "updatePayPassword" : "createPayPassword"),
    [isPayPasswordSet]
  );

  useEffect(() => {
    const loadInfo = async () => {
      setLoading(true);
      try {
        const response = await apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (response.data) {
          setIsPayPasswordSet(Number(response.data.isPayPassword) === 1);
          setNeedsGoogle(Number(response.data.googleStatus) === 1);
          if (Number(response.data.googleStatus) !== 1) {
            setVerifyType("email");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    void loadInfo();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const validate = () => {
    const validation = transactionPasswordSchema.safeParse({
      payPassword,
      confirmPassword,
      emailCode: verifyType === "email" ? emailCode : "",
      googleCode: verifyType === "google" ? googleCode : "",
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return false;
    }
    return true;
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
        path: `${API_ENDPOINTS.sendVerifyCode}?type=${payPasswordType}`,
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
    setErrorMessage("");
    setInfoMessage("");
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        type: payPasswordType,
        payPassword,
      };
      if (verifyType === "email") {
        payload.code = emailCode;
      } else {
        payload.googleCode = googleCode;
      }
      const response = await apiRequest<UpdatePasswordResponse>({
        path: API_ENDPOINTS.merchantUpdate,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage(
        isPayPasswordSet
          ? "Transaction password updated."
          : "Transaction password created."
      );
      setPayPassword("");
      setConfirmPassword("");
      setEmailCode("");
      setGoogleCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          {isPayPasswordSet ? "Update Transaction Password" : "Set Transaction Password"}
        </h1>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Transaction password (6 digits)
            <PasswordInput
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              className="h-12"
              inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              value={payPassword}
              onChange={(event) => setPayPassword(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Confirm password
            <PasswordInput
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              className="h-12"
              inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Verification method
            <div className="flex items-center gap-4 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--foreground)">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={verifyType === "email"}
                  onChange={() => setVerifyType("email")}
                />
                Email code
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={verifyType === "google"}
                  onChange={() => setVerifyType("google")}
                  disabled={!needsGoogle}
                />
                Google code
              </label>
            </div>
          </label>

          {verifyType === "email" ? (
            <label className="space-y-2 text-sm font-medium text-(--paragraph)">
              <span className="flex items-center justify-between">
                Email code
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={cooldown > 0 || loading}
                  className="text-xs font-semibold text-(--foreground)"
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </button>
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
              />
            </label>
          ) : null}

          {verifyType === "google" ? (
            <label className="space-y-2 text-sm font-medium text-(--paragraph)">
              Google code
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
                value={googleCode}
                onChange={(event) => setGoogleCode(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 h-12 w-full rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        {null}
      </section>
    </div>
  );
}
