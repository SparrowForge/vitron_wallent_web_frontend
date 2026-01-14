"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { loginPasswordSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useEffect, useMemo, useState } from "react";

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    googleStatus?: string | number | null;
  };
};

type ApiResponse = {
  code?: number | string;
  msg?: string;
};

export default function LoginPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!password || !confirmPassword) {
      return false;
    }
    if (verifyType === "email" && !emailCode) {
      return false;
    }
    if (verifyType === "google" && !googleCode) {
      return false;
    }
    return true;
  }, [password, confirmPassword, emailCode, googleCode, verifyType]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const response = await apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (response.data) {
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
    setLoading(true);
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=updatePassword`,
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
    const validation = loginPasswordSchema.safeParse({
      password,
      confirmPassword,
      emailCode: verifyType === "email" ? emailCode : "",
      googleCode: verifyType === "google" ? googleCode : "",
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
    try {
      const payload: Record<string, string> = {
        type: "updatePassword",
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
      setInfoMessage("Login password updated.");
      setPassword("");
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
          Login Password
        </h1>
        <p className="text-sm text-(--paragraph)">
          Update your login password.
        </p>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            New password
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              placeholder="Enter new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Confirm password
            <input
              type="password"
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              placeholder="Confirm new password"
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
          {loading ? "Updating..." : "Update password"}
        </button>
        {null}
      </section>
    </div>
  );
}
