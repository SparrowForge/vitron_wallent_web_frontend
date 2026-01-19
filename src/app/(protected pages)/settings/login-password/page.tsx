"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { loginPasswordSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
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
    field?: keyof typeof fieldErrors,
  ) => {
    if (field) {
      setFieldErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  const canSubmit = useMemo(() => {
    if (!password || !confirmPassword) {
      return false;
    }
    if (!emailCode) {
      return false;
    }
    if (needsGoogle && !googleCode) {
      return false;
    }
    return true;
  }, [password, confirmPassword, emailCode, googleCode, needsGoogle]);

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
        error instanceof Error ? error.message : "Failed to send code.",
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
      emailCode,
      googleCode: needsGoogle ? googleCode : undefined,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setValidationError(
        issue?.message ?? getFirstError(validation.error),
        issue?.path?.[0] as keyof typeof fieldErrors,
      );
      return;
    }
    if (!canSubmit) {
      setFieldErrors({
        ...(password ? {} : { password: "Password is required." }),
        ...(confirmPassword
          ? {}
          : { confirmPassword: "Confirm password is required." }),
        ...(!emailCode ? { emailCode: "Email code is required." } : {}),
        ...(needsGoogle && !googleCode
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
        code: emailCode,
      };
      if (needsGoogle && googleCode) {
        payload.googleCode = googleCode;
      }
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.merchantUpdate,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInfoMessage("Login password updated.");
      router.replace("/settings");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password.",
      );
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
        <CardContent className="space-y-6 p-6 relative overflow-hidden">
          <LoadingOverlay loading={loading} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                New password
                {!password && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
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
                {!confirmPassword && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </label>
              <PasswordInput
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      confirmPassword: "",
                    }));
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
                Email code
                {!emailCode && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Enter code"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  className="min-w-[120px]"
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </Button>
              </div>
              {fieldErrors.emailCode ? (
                <p className="text-xs text-red-500">{fieldErrors.emailCode}</p>
              ) : null}
            </div>

            {needsGoogle && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--paragraph)">
                  Google code
                  {!googleCode && (
                    <span className="text-red-500">
                      <sup>*required</sup>
                    </span>
                  )}
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
                  <p className="text-xs text-red-500">
                    {fieldErrors.googleCode}
                  </p>
                ) : null}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || loading}
            >
              Update password
            </Button>
            {/* <span className="text-xs text-red-500">
              * Input Field is required
            </span> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
