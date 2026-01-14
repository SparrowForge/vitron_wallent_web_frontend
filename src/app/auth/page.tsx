"use client";

import {
  loginWithPasswordAndCodeAction,
  registerWithPasswordAction,
  sendLoginCodeAction,
  sendRegisterCodeAction,
} from "@/app/auth/actions";
import LandingHeader from "@/features/navigation/components/LandingHeader";
import Spinner from "@/shared/components/ui/Spinner";
import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { persistTokens } from "@/lib/auth";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import {
  loginCredentialsSchema,
  loginVerifySchema,
  registerSchema,
} from "@/lib/validationSchemas";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useToastMessages({ errorMessage, infoMessage });

  const base64UrlToBuffer = (value: string) => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    const padded = padding
      ? base64.padEnd(base64.length + (4 - padding), "=")
      : base64;
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const bufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const normalizeUserHandle = (handle?: string | null) => {
    if (!handle) {
      return undefined;
    }
    return handle.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      setErrorMessage("Enter your email to use passkey login.");
      return;
    }
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setErrorMessage("Passkey login is not supported on this device.");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    setInfoMessage("");
    try {
      const checkResponse = await apiRequest<{
        code?: number | string;
        msg?: string;
        data?: number | string;
      }>({
        path: API_ENDPOINTS.passkeyCheck,
        method: "POST",
        body: JSON.stringify({ username: email }),
      });
      if (Number(checkResponse.code) !== 200) {
        throw new Error(checkResponse.msg || "Unable to check passkey.");
      }
      if (Number(checkResponse.data) !== 1) {
        throw new Error("Passkey is not enabled for this account.");
      }

      const startResponse = await apiRequest<{
        code?: number | string;
        msg?: string;
        data?: {
          assertionId?: string;
          credentialId?: string;
          publicKeyCredentialRequestOptions?: {
            challenge?: string;
          };
          assertionRequest?: {
            userHandle?: string;
          };
        };
      }>({
        path: API_ENDPOINTS.passkeyLoginStart,
        method: "POST",
        body: JSON.stringify({ username: email }),
      });
      if (Number(startResponse.code) !== 200 || !startResponse.data) {
        throw new Error(startResponse.msg || "Unable to start passkey login.");
      }
      const challenge =
        startResponse.data.publicKeyCredentialRequestOptions?.challenge;
      const credentialId = startResponse.data.credentialId;
      const assertionId = startResponse.data.assertionId;
      if (!challenge || !credentialId || !assertionId) {
        throw new Error("Invalid passkey login response.");
      }

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToBuffer(challenge),
        allowCredentials: [
          {
            type: "public-key",
            id: base64UrlToBuffer(credentialId),
          },
        ],
      };

      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!credential) {
        throw new Error("Passkey login cancelled.");
      }
      const response = credential.response as AuthenticatorAssertionResponse;
      const userHandle =
        response.userHandle instanceof ArrayBuffer
          ? bufferToBase64Url(response.userHandle)
          : undefined;

      const loginPayload = {
        authType: "passkey",
        assertionId,
        credential: {
          type: credential.type,
          id: bufferToBase64Url(credential.rawId),
          rawId: bufferToBase64Url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64Url(response.clientDataJSON),
            authenticatorData: bufferToBase64Url(response.authenticatorData),
            signature: bufferToBase64Url(response.signature),
            userHandle:
              normalizeUserHandle(
                startResponse.data.assertionRequest?.userHandle
              ) ?? userHandle,
          },
          clientExtensionResults: credential.getClientExtensionResults(),
        },
      };

      const loginResponse = await apiRequest<{
        code?: number | string;
        msg?: string;
        data?: {
          access_token?: string;
          refresh_token?: string;
          token_type?: string;
        };
      }>({
        path: API_ENDPOINTS.login,
        method: "POST",
        body: JSON.stringify(loginPayload),
      });
      if (Number(loginResponse.code) !== 200) {
        throw new Error(loginResponse.msg || "Passkey login failed.");
      }
      persistTokens(loginResponse.data);
      router.push("/wallet");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Passkey login failed."
      );
    } finally {
      setStatus("idle");
    }
  };

  const getFirstError = (error: { errors: { message: string }[] }) =>
    error.errors[0]?.message ?? "Please check your entries.";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      if (mode === "login") {
        if (step === "credentials") {
          const result = loginCredentialsSchema.safeParse({ email, password });
          if (!result.success) {
            throw new Error(getFirstError(result.error));
          }
          setStep("verify");
          await sendLoginCodeAction(email, "login");
          setCooldown(60);
          setInfoMessage("Verification code sent to your email.");
          setStatus("idle");
          return;
        }
        const result = loginVerifySchema.safeParse({
          email,
          password,
          emailCode,
          googleCode,
        });
        if (!result.success) {
          throw new Error(getFirstError(result.error));
        }
        const loginResponse = await loginWithPasswordAndCodeAction({
          username: email,
          password,
          code: emailCode,
          googleCode: googleCode || undefined,
        });
        persistTokens(loginResponse.data);
        router.push("/wallet");
      } else {
        const result = registerSchema.safeParse({
          email,
          password,
          emailCode,
        });
        if (!result.success) {
          throw new Error(getFirstError(result.error));
        }
        const registerResponse = await registerWithPasswordAction({
          username: email,
          password,
          code: emailCode,
        });
        persistTokens(registerResponse.data);
        router.push("/wallet");
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
      const result = loginCredentialsSchema.safeParse({ email, password });
      if (!result.success) {
        throw new Error(getFirstError(result.error));
      }
      if (mode === "login") {
        await sendLoginCodeAction(email, "login");
      } else {
        await sendRegisterCodeAction(email);
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
    setErrorMessage("");
    setInfoMessage("");
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
              {mode === "login" ? "Welcome back" : "Create your account"}
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
              : "Spin up a new wallet in a few minutes."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              Email
              <input
                type="email"
                placeholder="you@wallet.com"
                className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
              Password
              <input
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {(mode === "register" || step === "verify") && (
              <>
                <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                  Email code
                  <input
                    type="text"
                    placeholder="Enter the code"
                    className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value)}
                  />
                </label>
                {mode === "login" ? (
                  <label className="flex flex-col gap-2 text-sm font-medium text-(--foreground)">
                    Google code (if enabled)
                    <input
                      type="text"
                      placeholder="Optional"
                      className="h-11 rounded-lg border border-(--stroke) bg-(--background) px-3 text-sm"
                      value={googleCode}
                      onChange={(event) => setGoogleCode(event.target.value)}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="h-11 w-full rounded-lg border border-(--stroke) bg-(--background) text-sm font-semibold text-(--foreground)"
                  disabled={status === "loading" || cooldown > 0}
                  onClick={handleSendCode}
                >
                  {status === "loading" && cooldown === 0 ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Spinner size={16} />
                      Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    "Send code"
                  )}
                </button>
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
              ) : (
                "Create account"
              )}
            </button>
          </form>
          {mode === "login" ? (
            <button
              type="button"
              onClick={handlePasskeyLogin}
              className="mt-3 h-11 w-full rounded-lg border border-(--stroke) bg-(--background) text-sm font-semibold text-(--foreground)"
              disabled={status === "loading"}
            >
              Use passkey
            </button>
          ) : null}

          {null}

          <div className="mt-6 text-center text-sm text-(--paragraph)">
            <span>
              {mode === "login" ? "New to Vtron?" : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={handleToggleMode}
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
