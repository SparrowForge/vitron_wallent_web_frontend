"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import { emailSchema } from "@/lib/validationSchemas";
import { modifyEmailSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    email?: string | null;
    googleStatus?: string | number | null;
  };
};

type ApiResponse = {
  code?: number | string;
  msg?: string;
};

export default function ModifyEmailPage() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const canSubmit = useMemo(() => {
    if (!newEmail || !password) {
      return false;
    }
    if (verifyType === "email" && !emailCode) {
      return false;
    }
    if (verifyType === "google" && !googleCode) {
      return false;
    }
    return true;
  }, [newEmail, password, emailCode, googleCode, verifyType]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const response = await apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (response.data) {
          setCurrentEmail(response.data.email ?? "");
          setNeedsGoogle(Number(response.data.googleStatus) === 1);
          if (Number(response.data.googleStatus) !== 1) {
            setVerifyType("email");
          }
        }
      } catch {
        return;
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

  const handleSendCode = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (cooldown > 0) {
      return;
    }
    const emailCheck = emailSchema.safeParse(newEmail);
    if (!emailCheck.success) {
      setErrorMessage(emailCheck.error.message);
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendCheckEmail}?email=${encodeURIComponent(
          newEmail
        )}&type=changeEmail`,
        method: "POST",
        body: JSON.stringify({ email: newEmail, type: "changeEmail" }),
      });
      setCooldown(60);
      setInfoMessage("Code sent to your new email.");
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
    const validation = modifyEmailSchema.safeParse({
      newEmail,
      password,
      emailCode: verifyType === "email" ? emailCode : "",
      googleCode: verifyType === "google" ? googleCode : "",
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return;
    }
    const emailCheck = emailSchema.safeParse(newEmail);
    if (!emailCheck.success) {
      setErrorMessage(emailCheck.error.message);
      return;
    }
    if (!canSubmit) {
      setErrorMessage("Please complete the required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        email: newEmail,
        type: "changeEmail",
        password,
      };
      if (verifyType === "email") {
        payload.code = emailCode;
      } else {
        payload.googleCode = googleCode;
      }
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.merchantUpdate,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Email updated. Please log in again.");
      clearAuthTokens();
      router.replace("/auth");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update email."
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
          Modify Email
        </h1>
        <p className="text-sm text-(--paragraph)">
          Current email: {currentEmail || "—"}
        </p>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            New email
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              placeholder="Enter new email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Login password
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              placeholder="Enter login password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
                  className="text-xs font-semibold text-(--foreground)"
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </button>
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
                placeholder="Enter code"
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
                placeholder="Enter Google code"
                value={googleCode}
                onChange={(event) => setGoogleCode(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className={`mt-6 h-12 w-full rounded-2xl text-sm font-semibold ${
            canSubmit
              ? "bg-(--brand) text-(--background)"
              : "bg-(--stroke) text-(--placeholder)"
          }`}
          disabled={!canSubmit || loading}
        >
          {loading ? "Updating..." : "Update email"}
        </button>
        {null}
      </section>
    </div>
  );
}
