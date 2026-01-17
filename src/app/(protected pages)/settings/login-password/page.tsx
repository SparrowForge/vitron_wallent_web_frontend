"use client";

import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { loginPasswordSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import PasswordInput from "@/shared/components/ui/PasswordInput";
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
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    emailCode?: string;
    googleCode?: string;
  }>({});

  useToastMessages({ errorMessage, infoMessage });

  const getFirstError = (error: { errors: { message: string }[] }) =>
    error.errors[0]?.message ?? "Please check your entries.";

  const setValidationError = (
    message: string,
    field?: keyof typeof fieldErrors
  ) => {
    if (field) {
      setFieldErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

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
    setFieldErrors({});
    const validation = loginPasswordSchema.safeParse({
      password,
      confirmPassword,
      emailCode: verifyType === "email" ? emailCode : "",
      googleCode: verifyType === "google" ? googleCode : "",
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setValidationError(
        issue?.message ?? getFirstError(validation.error),
        issue?.path?.[0] as keyof typeof fieldErrors
      );
      return;
    }
    if (!canSubmit) {
      setFieldErrors({
        ...(password ? {} : { password: "Password is required." }),
        ...(confirmPassword
          ? {}
          : { confirmPassword: "Confirm password is required." }),
        ...(verifyType === "email" && !emailCode
          ? { emailCode: "Email code is required." }
          : {}),
        ...(verifyType === "google" && !googleCode
          ? { googleCode: "Google code is required." }
          : {}),
      });
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

      <Card variant="glass">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                New password
              </label>
              <PasswordInput
                placeholder="Enter new password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
              />
              {fieldErrors.password ? (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Confirm password
              </label>
              <PasswordInput
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
              />
              {fieldErrors.confirmPassword ? (
                <p className="text-xs text-red-500">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Verification method
              </label>
              <div className="flex items-center gap-4 rounded-xl border border-(--stroke) bg-(--background)/50 px-4 py-3 text-sm text-(--foreground)">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={verifyType === "email"}
                    onChange={() => setVerifyType("email")}
                    className="accent-(--brand)"
                  />
                  Email code
                </label>
                <label className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  !needsGoogle && "opacity-50 cursor-not-allowed"
                )}>
                  <input
                    type="radio"
                    checked={verifyType === "google"}
                    onChange={() => setVerifyType("google")}
                    disabled={!needsGoogle}
                    className="accent-(--brand)"
                  />
                  Google code
                </label>
              </div>
            </div>

            {verifyType === "email" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-(--paragraph)">
                    Email code
                  </label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleSendCode}
                    className="h-auto p-0 text-xs font-semibold text-(--brand)"
                    disabled={cooldown > 0 || loading}
                  >
                    {cooldown > 0 ? `${cooldown}s` : "Send code"}
                  </Button>
                </div>
                <Input
                  placeholder="Enter code"
                  value={emailCode}
                  onChange={(event) => {
                    setEmailCode(event.target.value);
                    if (fieldErrors.emailCode) {
                      setFieldErrors((prev) => ({ ...prev, emailCode: "" }));
                    }
                  }}
                />
                {fieldErrors.emailCode ? (
                  <p className="text-xs text-red-500">{fieldErrors.emailCode}</p>
                ) : null}
              </div>
            ) : null}

            {verifyType === "google" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--paragraph)">
                  Google code
                </label>
                <Input
                  placeholder="Enter Google code"
                  value={googleCode}
                  onChange={(event) => {
                    setGoogleCode(event.target.value);
                    if (fieldErrors.googleCode) {
                      setFieldErrors((prev) => ({ ...prev, googleCode: "" }));
                    }
                  }}
                />
                {fieldErrors.googleCode ? (
                  <p className="text-xs text-red-500">{fieldErrors.googleCode}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={!canSubmit || loading}
            loading={loading}
          >
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
