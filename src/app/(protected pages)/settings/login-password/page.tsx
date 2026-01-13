"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { passwordSchema } from "@/lib/validation";
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
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const canSubmit = useMemo(() => {
    if (!password || !confirmPassword || !emailCode) {
      return false;
    }
    if (needsGoogle && !googleCode) {
      return false;
    }
    return true;
  }, [password, confirmPassword, emailCode, needsGoogle, googleCode]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const response = await apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (Number(response.code) === 200 && response.data) {
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
    setLoading(true);
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=updatePassword`,
        method: "GET",
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Failed to send code.");
        return;
      }
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
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      setErrorMessage(passwordCheck.error.message);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
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
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Unable to update password.");
        return;
      }
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
          {loading ? "Updating..." : "Update password"}
        </button>
        {errorMessage ? (
          <p className="mt-3 text-xs text-(--paragraph)">{errorMessage}</p>
        ) : null}
        {infoMessage ? (
          <p className="mt-2 text-xs text-(--paragraph)">{infoMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
