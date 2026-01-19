"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cn } from "@/lib/utils";
import { transactionPasswordSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
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
  const [fieldErrors, setFieldErrors] = useState<{
    payPassword?: string;
    confirmPassword?: string;
    emailCode?: string;
    googleCode?: string;
  }>({});

  useToastMessages({ errorMessage, infoMessage });
  const [isPayPasswordSet, setIsPayPasswordSet] = useState(false);
  const [needsGoogle, setNeedsGoogle] = useState(false);

  const payPasswordType = useMemo(
    () => (isPayPasswordSet ? "updatePayPassword" : "createPayPassword"),
    [isPayPasswordSet],
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
      const fieldName = issue.path[0] as keyof typeof fieldErrors;
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: issue.message,
      }));
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return false;
    }
    setFieldErrors({});
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
        error instanceof Error ? error.message : "Failed to send code.",
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
          : "Transaction password created.",
      );
      setPayPassword("");
      setConfirmPassword("");
      setEmailCode("");
      setGoogleCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password.",
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
          {isPayPasswordSet
            ? "Update Transaction Password"
            : "Set Transaction Password"}
        </h1>
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
                Transaction password (6 digits)
                {!payPassword && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </label>
              <PasswordInput
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={payPassword}
                onChange={(event) => {
                  setPayPassword(event.target.value);
                  if (fieldErrors.payPassword) {
                    setFieldErrors((prev) => ({ ...prev, payPassword: "" }));
                  }
                }}
                placeholder="6-digit password"
                error={fieldErrors.payPassword}
              />
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
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
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
                placeholder="Confirm password"
                error={fieldErrors.confirmPassword}
              />
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
                <label
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    !needsGoogle && "opacity-50 cursor-not-allowed",
                  )}
                >
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
                    value={emailCode}
                    onChange={(event) => {
                      setEmailCode(event.target.value);
                      if (fieldErrors.emailCode) {
                        setFieldErrors((prev) => ({ ...prev, emailCode: "" }));
                      }
                    }}
                    error={fieldErrors.emailCode}
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
              </div>
            ) : null}

            {verifyType === "google" ? (
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
                  value={googleCode}
                  onChange={(event) => {
                    setGoogleCode(event.target.value);
                    if (fieldErrors.googleCode) {
                      setFieldErrors((prev) => ({ ...prev, googleCode: "" }));
                    }
                  }}
                  error={fieldErrors.googleCode}
                />
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              Update transaction password
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
