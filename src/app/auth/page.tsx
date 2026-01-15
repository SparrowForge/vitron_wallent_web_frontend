"use client";

import {
  loginWithPasswordAndCodeAction,
  registerWithPasswordAction,
  resetPasswordAction,
  sendForgotCodeAction,
  sendLoginCodeAction,
  sendRegisterCodeAction,
} from "@/app/auth/actions";
import LandingHeader from "@/features/navigation/components/LandingHeader";
import { persistTokens } from "@/lib/auth";
import {
  emailSchema,
  forgotPasswordSchema,
  loginCredentialsSchema,
  registerSchema,
} from "@/lib/validationSchemas";
import Spinner from "@/shared/components/ui/Spinner";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    emailCode?: string;
    googleCode?: string;
  }>({});

  useToastMessages({ errorMessage, infoMessage });

  const getFirstError = (error: { errors: { message: string }[] }) =>
    error.errors[0]?.message ?? "Please check your entries.";

  const setValidationErrors = (message: string, field?: keyof typeof fieldErrors) => {
    if (field) {
      setFieldErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setFieldErrors({});
    try {
      if (mode === "login") {
        if (step === "credentials") {
          const result = loginCredentialsSchema.safeParse({ email, password });
          if (!result.success) {
            const issue = result.error.issues[0];
            setValidationErrors(issue?.message ?? getFirstError(result.error), issue?.path?.[0] as keyof typeof fieldErrors);
            setStatus("idle");
            return;
          }
          setStep("verify");
          setStatus("idle");
          return;
        }
        const baseCheck = loginCredentialsSchema.safeParse({ email, password });
        if (!baseCheck.success) {
          const issue = baseCheck.error.issues[0];
          setValidationErrors(
            issue?.message ?? getFirstError(baseCheck.error),
            issue?.path?.[0] as keyof typeof fieldErrors
          );
          setStatus("idle");
          return;
        }
        if (verifyType === "email" && !emailCode) {
          setValidationErrors("Email code is required.", "emailCode");
          setStatus("idle");
          return;
        }
        if (verifyType === "google" && !googleCode) {
          setValidationErrors("Google code is required.", "googleCode");
          setStatus("idle");
          return;
        }
        const loginResponse = await loginWithPasswordAndCodeAction({
          username: email,
          password,
          code: verifyType === "email" ? emailCode : undefined,
          googleCode: verifyType === "google" ? googleCode : undefined,
        });
        persistTokens(loginResponse.data);
        router.push("/wallet");
      } else if (mode === "register") {
        const result = registerSchema.safeParse({
          email,
          password,
          emailCode,
        });
        if (!result.success) {
          const issue = result.error.issues[0];
          setValidationErrors(issue?.message ?? getFirstError(result.error), issue?.path?.[0] as keyof typeof fieldErrors);
          setStatus("idle");
          return;
        }
        const registerResponse = await registerWithPasswordAction({
          username: email,
          password,
          code: emailCode,
        });
        persistTokens(registerResponse.data);
        router.push("/wallet");
      } else {
        const result = forgotPasswordSchema.safeParse({
          email,
          password,
          emailCode,
        });
        if (!result.success) {
          const issue = result.error.issues[0];
          setValidationErrors(
            issue?.message ?? getFirstError(result.error),
            issue?.path?.[0] as keyof typeof fieldErrors
          );
          setStatus("idle");
          return;
        }
        await resetPasswordAction({
          username: email,
          password,
          code: emailCode,
        });
        setInfoMessage("Password reset successful. Please log in.");
        setMode("login");
        setStep("credentials");
        setEmailCode("");
        setPassword("");
        setStatus("idle");
        return;
      }
    } catch (error) {
      setStatus("error");
      setInfoMessage("");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  };

  const handleSendCode = async () => {
    setStatus("loading");
    setErrorMessage("");
    setInfoMessage("");
    try {
      const result =
        mode === "login"
          ? loginCredentialsSchema.safeParse({ email, password })
          : emailSchema.safeParse(email);
      if (!result.success) {
        const issue = result.error?.issues[0];
        setValidationErrors(issue?.message ?? getFirstError(result.error), "email");
        setStatus("idle");
        return;
      }
      if (mode === "login") {
        await sendLoginCodeAction(email, "login");
      } else if (mode === "register") {
        await sendRegisterCodeAction(email);
      } else {
        await sendForgotCodeAction(email);
      }
      setCooldown(60);
      setInfoMessage("Verification code sent to your email.");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setInfoMessage("");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  };

  const handleToggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setStep("credentials");
    setEmailCode("");
    setGoogleCode("");
    setVerifyType("email");
    setErrorMessage("");
    setInfoMessage("");
    setFieldErrors({});
    setStatus("idle");
    setCooldown(0);
  };

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <section className="w-full max-w-md rounded-2xl border border-(--stroke) bg-(--basic-cta) p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-(--foreground)">
              {mode === "login"
                ? "Welcome back"
                : mode === "register"
                  ? "Create your account"
                  : "Reset password"}
            </h1>
            <button
              type="button"
              className="text-sm font-medium text-(--paragraph)"
              onClick={handleToggleMode}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </div>

          <p className="mt-2 text-sm text-(--paragraph)">
            {mode === "login"
              ? "Sign in to access your dashboard."
              : mode === "register"
                ? "Spin up a new wallet in a few minutes."
                : "Use your email and code to reset your password."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              Email
              <input
                type="email"
                placeholder="you@wallet.com"
                className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }
                }}
              />
              {fieldErrors.email ? (
                <span className="text-xs text-red-500">{fieldErrors.email}</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              {mode === "forgot" ? "New Password" : "Password"}
              <PasswordInput
                placeholder="••••••••"
                className="h-11"
                inputClassName="h-11 w-full rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
              />
              {fieldErrors.password ? (
                <span className="text-xs text-red-500">{fieldErrors.password}</span>
              ) : null}
            </label>

            {(mode === "register" || mode === "forgot" || step === "verify") && (
              <>
                {mode === "login" ? (
                  <>
                    <div className="flex items-center gap-4 text-sm font-medium text-(--foreground)">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={verifyType === "email"}
                          onChange={() => {
                            setVerifyType("email");
                            setFieldErrors((prev) => ({
                              ...prev,
                              emailCode: "",
                              googleCode: "",
                            }));
                          }}
                        />
                        Email code
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={verifyType === "google"}
                          onChange={() => {
                            setVerifyType("google");
                            setFieldErrors((prev) => ({
                              ...prev,
                              emailCode: "",
                              googleCode: "",
                            }));
                          }}
                        />
                        Google code
                      </label>
                    </div>
                    {verifyType === "email" ? (
                      <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                        <span className="flex items-center justify-between">
                          Email code
                          <button
                            type="button"
                            className="text-xs font-semibold text-(--foreground)"
                            disabled={
                              status === "loading" || cooldown > 0 || !email
                            }
                            onClick={handleSendCode}
                          >
                            {cooldown > 0
                              ? `Resend in ${cooldown}s`
                              : "Send code"}
                          </button>
                        </span>
                        <input
                          type="text"
                          placeholder="Enter the code"
                          className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                          value={emailCode}
                          onChange={(event) => {
                            setEmailCode(event.target.value);
                            if (fieldErrors.emailCode) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                emailCode: "",
                              }));
                            }
                          }}
                        />
                        {fieldErrors.emailCode ? (
                          <span className="text-xs text-red-500">
                            {fieldErrors.emailCode}
                          </span>
                        ) : null}
                      </label>
                    ) : null}
                    {verifyType === "google" ? (
                      <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                        Google code
                        <input
                          type="text"
                          placeholder="Enter Google code"
                          className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                          value={googleCode}
                          onChange={(event) => {
                            setGoogleCode(event.target.value);
                            if (fieldErrors.googleCode) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                googleCode: "",
                              }));
                            }
                          }}
                        />
                        {fieldErrors.googleCode ? (
                          <span className="text-xs text-red-500">
                            {fieldErrors.googleCode}
                          </span>
                        ) : null}
                      </label>
                    ) : null}
                  </>
                ) : null}
                {mode === "register" || mode === "forgot" ? (
                  <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                    <span className="flex items-center justify-between">
                      {mode === "forgot" ? "Email code" : "Email code"}
                      <button
                        type="button"
                        className="text-xs font-semibold text-(--foreground)"
                        disabled={
                          status === "loading" || cooldown > 0 || !email
                        }
                        onClick={handleSendCode}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Send code"}
                      </button>
                    </span>
                    <input
                      type="text"
                      placeholder="Enter the code"
                      className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                      value={emailCode}
                      onChange={(event) => {
                        setEmailCode(event.target.value);
                        if (fieldErrors.emailCode) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            emailCode: "",
                          }));
                        }
                      }}
                    />
                    {fieldErrors.emailCode ? (
                      <span className="text-xs text-red-500">
                        {fieldErrors.emailCode}
                      </span>
                    ) : null}
                  </label>
                ) : null}
              </>
            )}

            <button
              type="submit"
              className="h-11 w-full rounded-lg bg-(--brand) text-sm font-semibold text-(--background)"
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner size={16} className="border-(--background)" />
                  Please wait...
                </span>
              ) : mode === "login" ? (
                step === "credentials" ? (
                  "Continue"
                ) : (
                  "Login"
                )
              ) : mode === "register" ? (
                "Create account"
              ) : (
                "Reset password"
              )}
            </button>
          </form>
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setStep("credentials");
                setEmailCode("");
                setGoogleCode("");
                setVerifyType("email");
                setFieldErrors({});
                setStatus("idle");
              }}
              className="mt-3 text-sm font-medium text-(--paragraph)"
            >
              Forgot password?
            </button>
          ) : null}

          <div className="mt-6 text-center text-sm text-(--paragraph)">
            <span>
              {mode === "login"
                ? "New to Vtron?"
                : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                if (mode === "forgot") {
                  setMode("login");
                } else {
                  handleToggleMode();
                }
                setStep("credentials");
                setEmailCode("");
                setGoogleCode("");
                setVerifyType("email");
                setFieldErrors({});
                setStatus("idle");
              }}
              className="font-semibold text-(--foreground)"
            >
              {mode === "login" ? "Create one" : "Login"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
