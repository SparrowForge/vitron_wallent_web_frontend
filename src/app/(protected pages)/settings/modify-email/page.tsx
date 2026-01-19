"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { emailSchema, modifyEmailSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import PasswordInput from "@/shared/components/ui/PasswordInput";
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
  const [fieldErrors, setFieldErrors] = useState<{
    newEmail?: string;
    password?: string;
    emailCode?: string;
    googleCode?: string;
  }>({});

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
      setFieldErrors((prev) => ({
        ...prev,
        newEmail: emailCheck.error.issues[0]?.message ?? "Invalid email",
      }));
      setErrorMessage(emailCheck.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendCheckEmail}?email=${encodeURIComponent(
          newEmail,
        )}&type=changeEmail`,
        method: "POST",
        body: JSON.stringify({ email: newEmail, type: "changeEmail" }),
      });
      setCooldown(60);
      setInfoMessage("Code sent to your new email.");
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
    const validation = modifyEmailSchema.safeParse({
      newEmail,
      password,
      emailCode: verifyType === "email" ? emailCode : "",
      googleCode: verifyType === "google" ? googleCode : "",
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const fieldName = issue?.path?.[0] as keyof typeof fieldErrors;
      if (fieldName) {
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: issue.message,
        }));
      }
      setErrorMessage(issue?.message ?? "Please complete the required fields.");
      return;
    }
    const emailCheck = emailSchema.safeParse(newEmail);
    if (!emailCheck.success) {
      setFieldErrors((prev) => ({
        ...prev,
        newEmail: emailCheck.error.issues[0]?.message ?? "Invalid email",
      }));
      setErrorMessage(emailCheck.error.issues[0]?.message ?? "Invalid email");
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
        error instanceof Error ? error.message : "Unable to update email.",
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

      <Card variant="glass">
        <CardContent className="space-y-6 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                New email
                {!newEmail && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </label>
              <Input
                type="email"
                placeholder="Enter new email"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  if (fieldErrors.newEmail) {
                    setFieldErrors((prev) => ({ ...prev, newEmail: "" }));
                  }
                }}
                onBlur={() => {
                  if (!newEmail) return;
                  const validation = emailSchema.safeParse(newEmail);
                  if (!validation.success) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      newEmail:
                        validation.error.issues[0]?.message ?? "Invalid email",
                    }));
                  }
                }}
                error={fieldErrors.newEmail}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Login password
                {!password && (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                )}
              </label>
              <PasswordInput
                placeholder="Enter login password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                error={fieldErrors.password}
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
                    placeholder="Enter code"
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
                  placeholder="Enter Google code"
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

            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || loading}
              loading={loading}
            >
              Update email
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
