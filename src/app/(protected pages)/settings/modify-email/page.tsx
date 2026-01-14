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
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const canSubmit = useMemo(() => {
    if (!newEmail || !password || !emailCode) {
      return false;
    }
    if (needsGoogle && !googleCode) {
      return false;
    }
    return true;
  }, [newEmail, password, emailCode, needsGoogle, googleCode]);

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
      emailCode,
      googleCode: needsGoogle ? googleCode : "",
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
        code: emailCode,
        password,
      };
      if (needsGoogle) {
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
            Email code
            <div className="flex items-center gap-3">
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
                placeholder="Enter code"
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
              />
              <button
                type="button"
                onClick={handleSendCode}
                className="h-12 min-w-[120px] rounded-2xl border border-(--stroke) bg-(--background) px-4 text-xs font-semibold text-(--foreground)"
                disabled={cooldown > 0 || loading}
              >
                {cooldown > 0 ? `${cooldown}s` : "Send code"}
              </button>
            </div>
          </label>

          {needsGoogle ? (
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
