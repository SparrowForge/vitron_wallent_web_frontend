"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { googleAuthSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
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
  data?: {
    secret?: string;
    url?: string;
  };
};

const statusLabel = (status: number) => {
  if (status === 1) return "Enabled";
  if (status === 0) return "Disabled";
  return "Not bound";
};

export default function GoogleAuthPage() {
  const [googleStatus, setGoogleStatus] = useState(2);
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [mode, setMode] = useState<"bind" | "reset" | "open" | "close">("bind");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useToastMessages({ errorMessage, infoMessage });

  const needsQr = mode === "bind" || mode === "reset";
  const sendType = useMemo(() => {
    if (mode === "bind") return "bindGoogle";
    if (mode === "reset") return "resetGoogle";
    if (mode === "open") return "openGoogle";
    return "closeGoogle";
  }, [mode]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const response = await apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (response.data) {
          const statusValue = Number(response.data.googleStatus ?? 2);
          setGoogleStatus(statusValue);
          setEmail(response.data.email ?? "");
          if (statusValue === 2) {
            setMode("bind");
          } else if (statusValue === 0) {
            setMode("open");
          } else {
            setMode("close");
          }
        }
      } catch {
        return;
      }
    };

    void loadInfo();
  }, []);

  useEffect(() => {
    if (!needsQr) {
      setSecret("");
      setQrUrl("");
      return;
    }
    const loadQr = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.googleQrCode,
        method: "GET",
      });
        if (!response.data) {
          setErrorMessage(response.msg || "Unable to load QR code.");
          return;
        }
        setSecret(response.data.secret ?? "");
        setQrUrl(response.data.url ?? "");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load QR code."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadQr();
  }, [needsQr]);

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
        path: `${API_ENDPOINTS.sendVerifyCode}?type=${sendType}`,
        method: "GET",
      });
      setCooldown(60);
      setInfoMessage(`Code sent to ${email || "your email"}.`);
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
    const validation = googleAuthSchema.safeParse({
      emailCode,
      googleCode,
      secret,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return;
    }
    if (needsQr && !secret) {
      setErrorMessage("QR code is required.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        type: "2",
        emailCode,
        googleCode,
      };
      if (mode === "open") {
        payload.googleStatus = "1";
      } else if (mode === "close") {
        payload.googleStatus = "0";
      } else if (mode === "bind") {
        payload.googleStatus = "3";
        payload.googleSecretKey = secret;
      } else {
        payload.googleStatus = "2";
        payload.googleSecretKey = secret;
      }
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.googleVerifySave,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Google Authenticator updated.");
      const nextStatus =
        mode === "close" ? 0 : 1;
      setGoogleStatus(nextStatus);
      if (nextStatus === 0) {
        setMode("open");
      } else {
        setMode("close");
      }
      setEmailCode("");
      setGoogleCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update Google Auth."
      );
    } finally {
      setLoading(false);
    }
  };

  const qrImage = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        qrUrl
      )}`
    : "";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Settings
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Google Authentication
        </h1>
        <p className="text-sm text-(--paragraph)">
          Status: {statusLabel(googleStatus)}
        </p>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        <div className="flex flex-wrap gap-3">
          {googleStatus === 2 ? (
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === "bind"
                  ? "bg-(--brand) text-(--background)"
                  : "border border-(--stroke) bg-(--background) text-(--paragraph)"
              }`}
              onClick={() => setMode("bind")}
            >
              Bind
            </button>
          ) : null}
          {googleStatus === 1 ? (
            <>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  mode === "close"
                    ? "bg-(--brand) text-(--background)"
                    : "border border-(--stroke) bg-(--background) text-(--paragraph)"
                }`}
                onClick={() => setMode("close")}
              >
                Disable
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  mode === "reset"
                    ? "bg-(--brand) text-(--background)"
                    : "border border-(--stroke) bg-(--background) text-(--paragraph)"
                }`}
                onClick={() => setMode("reset")}
              >
                Reset
              </button>
            </>
          ) : null}
          {googleStatus === 0 ? (
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === "open"
                  ? "bg-(--brand) text-(--background)"
                  : "border border-(--stroke) bg-(--background) text-(--paragraph)"
              }`}
              onClick={() => setMode("open")}
            >
              Enable
            </button>
          ) : null}
        </div>

        {needsQr ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="flex items-center justify-center rounded-2xl border border-(--stroke) bg-(--background) p-4">
              {qrImage ? (
                <img src={qrImage} alt="Google Auth QR code" />
              ) : (
                <span className="text-xs text-(--paragraph)">QR not ready</span>
              )}
            </div>
            <div className="space-y-2 text-sm text-(--paragraph)">
              <div className="text-sm font-semibold text-(--double-foreground)">
                Secret key
              </div>
              <div className="rounded-xl border border-(--stroke) bg-(--background) px-3 py-2 text-xs text-(--foreground)">
                {secret || "—"}
              </div>
              <p className="text-xs text-(--paragraph)">
                Scan the QR in Google Authenticator or copy the secret.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
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

          <label className="space-y-2 text-sm font-medium text-(--paragraph)">
            Google code
            <input
              className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
              placeholder="Enter Google code"
              value={googleCode}
              onChange={(event) => setGoogleCode(event.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className={`mt-6 h-12 w-full rounded-2xl text-sm font-semibold ${
            emailCode && googleCode
              ? "bg-(--brand) text-(--background)"
              : "bg-(--stroke) text-(--placeholder)"
          }`}
          disabled={!emailCode || !googleCode || loading}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
        {null}
      </section>
    </div>
  );
}
