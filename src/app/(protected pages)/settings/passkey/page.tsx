"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { useEffect, useMemo, useState } from "react";

type PasskeyListResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    displayName?: string;
    bindTime?: string;
  } | null;
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    googleStatus?: string | number | null;
    email?: string | null;
  };
};

type PasskeyStartResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    registrationId?: string;
    publicKeyCredentialCreationOptions?: {
      challenge?: string;
      rp?: { name?: string; id?: string };
      user?: { id?: string; name?: string; displayName?: string };
      pubKeyCredParams?: { alg: number; type: string }[];
      timeout?: number;
      excludeCredentials?: { id: string; type: string }[];
      authenticatorSelection?: {
        authenticatorAttachment?: string;
        residentKey?: string;
        userVerification?: string;
      };
      attestation?: string;
    };
  };
};

type ApiResponse = {
  code?: number | string;
  msg?: string;
};

const base64UrlToBuffer = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  const padded = padding ? base64.padEnd(base64.length + (4 - padding), "=") : base64;
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
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }
  return value.split(" ")[0];
};

export default function PasskeyPage() {
  const [passkey, setPasskey] = useState<PasskeyListResponse["data"] | null>(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const [verifyType, setVerifyType] = useState<"email" | "google">("email");
  const [emailCode, setEmailCode] = useState("");
  const [googleCode, setGoogleCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canVerify = useMemo(() => {
    if (verifyType === "email") {
      return Boolean(emailCode);
    }
    return Boolean(googleCode);
  }, [verifyType, emailCode, googleCode]);

  const loadPasskey = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest<PasskeyListResponse>({
        path: API_ENDPOINTS.passkeyList,
        method: "POST",
        body: JSON.stringify({}),
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Unable to load passkey.");
        return;
      }
      setPasskey(response.data ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load passkey."
      );
    } finally {
      setLoading(false);
    }
  };

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
    void loadPasskey();
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

  const handleSendCode = async (type: "addPasskey" | "deletePasskey") => {
    setErrorMessage("");
    setInfoMessage("");
    if (cooldown > 0) {
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<ApiResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=${type}`,
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

  const handleAddPasskey = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (!canVerify) {
      setErrorMessage("Please enter the verification code.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (verifyType === "email") {
        payload.code = emailCode;
      } else {
        payload.googleCode = googleCode;
      }
      const startResponse = await apiRequest<PasskeyStartResponse>({
        path: API_ENDPOINTS.passkeyRegisterStart,
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (Number(startResponse.code) !== 200 || !startResponse.data) {
        setErrorMessage(startResponse.msg || "Unable to start passkey registration.");
        return;
      }
      const options = startResponse.data.publicKeyCredentialCreationOptions;
      const registrationId = startResponse.data.registrationId;
      if (!options || !options.challenge || !options.user?.id || !registrationId) {
        setErrorMessage("Invalid passkey registration response.");
        return;
      }

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: base64UrlToBuffer(options.challenge),
        rp: options.rp,
        user: {
          id: base64UrlToBuffer(options.user.id),
          name: options.user.name ?? "",
          displayName: options.user.displayName ?? options.user.name ?? "",
        },
        pubKeyCredParams:
          options.pubKeyCredParams?.map((param) => ({
            type: param.type,
            alg: param.alg,
          })) ?? [{ type: "public-key", alg: -7 }],
        timeout: options.timeout,
        excludeCredentials: options.excludeCredentials?.map((credential) => ({
          type: credential.type,
          id: base64UrlToBuffer(credential.id),
        })),
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation as AttestationConveyancePreference | undefined,
      };

      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!credential) {
        setErrorMessage("Passkey creation cancelled.");
        return;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const finishPayload = {
        registrationId,
        credential: {
          type: credential.type,
          id: bufferToBase64Url(credential.rawId),
          rawId: bufferToBase64Url(credential.rawId),
          response: {
            clientDataJSON: bufferToBase64Url(response.clientDataJSON),
            attestationObject: bufferToBase64Url(response.attestationObject),
          },
          clientExtensionResults: credential.getClientExtensionResults(),
        },
      };

      const finishResponse = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.passkeyRegisterFinish,
        method: "POST",
        body: JSON.stringify(finishPayload),
      });
      if (Number(finishResponse.code) !== 200) {
        setErrorMessage(finishResponse.msg || "Unable to finish registration.");
        return;
      }
      setInfoMessage("Passkey added.");
      setEmailCode("");
      setGoogleCode("");
      await loadPasskey();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add passkey."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameValue) {
      setErrorMessage("Enter a display name.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.passkeyRename,
        method: "POST",
        body: JSON.stringify({ displayName: renameValue }),
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Rename failed.");
        return;
      }
      setInfoMessage("Passkey renamed.");
      setRenameOpen(false);
      setRenameValue("");
      await loadPasskey();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Rename failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canVerify) {
      setErrorMessage("Enter the verification code.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const payload: Record<string, string> = {};
      if (verifyType === "email") {
        payload.code = emailCode;
      } else {
        payload.googleCode = googleCode;
      }
      const response = await apiRequest<ApiResponse>({
        path: API_ENDPOINTS.passkeyDelete,
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (Number(response.code) !== 200) {
        setErrorMessage(response.msg || "Delete failed.");
        return;
      }
      setInfoMessage("Passkey deleted.");
      setDeleteOpen(false);
      setEmailCode("");
      setGoogleCode("");
      await loadPasskey();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Delete failed."
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
        <h1 className="text-3xl font-semibold text-(--foreground)">Passkey</h1>
        <p className="text-sm text-(--paragraph)">
          Use a passkey instead of passwords.
        </p>
      </header>

      <section className="rounded-3xl border border-(--stroke) bg-(--basic-cta) p-6">
        {passkey ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3">
              <div className="text-sm font-semibold text-(--double-foreground)">
                {passkey.displayName || "Passkey"}
              </div>
              <div className="mt-1 text-xs text-(--paragraph)">
                Added {formatDate(passkey.bindTime)}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full border border-(--stroke) bg-(--background) px-4 py-2 text-xs font-semibold text-(--paragraph)"
                onClick={() => setRenameOpen(true)}
              >
                Rename
              </button>
              <button
                type="button"
                className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--paragraph)">
              No passkey yet. Add one to secure your account.
            </div>
            <button
              type="button"
              onClick={handleAddPasskey}
              className="h-12 w-full rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add passkey"}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {needsGoogle ? (
            <label className="space-y-2 text-sm font-medium text-(--paragraph)">
              Verification method
              <div className="flex items-center gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verifyType === "email"}
                    onChange={() => setVerifyType("email")}
                  />
                  Email
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={verifyType === "google"}
                    onChange={() => setVerifyType("google")}
                  />
                  Google
                </label>
              </div>
            </label>
          ) : null}

          {verifyType === "email" ? (
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
                  onClick={() =>
                    handleSendCode(passkey ? "deletePasskey" : "addPasskey")
                  }
                  className="h-12 min-w-[120px] rounded-2xl border border-(--stroke) bg-(--background) px-4 text-xs font-semibold text-(--foreground)"
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </button>
              </div>
            </label>
          ) : (
            <label className="space-y-2 text-sm font-medium text-(--paragraph)">
              Google code
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground)"
                placeholder="Enter Google code"
                value={googleCode}
                onChange={(event) => setGoogleCode(event.target.value)}
              />
            </label>
          )}
        </div>

        {passkey && deleteOpen ? (
          <button
            type="button"
            onClick={handleDelete}
            className="mt-6 h-12 w-full rounded-2xl bg-red-500/90 text-sm font-semibold text-white"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Confirm delete"}
          </button>
        ) : null}

        {renameOpen ? (
          <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4">
            <label className="space-y-2 text-sm font-medium text-(--paragraph)">
              Display name
              <input
                className="h-12 w-full rounded-2xl border border-(--stroke) bg-(--basic-cta) px-4 text-sm text-(--foreground)"
                placeholder="Enter name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
              />
            </label>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleRename}
                className="h-10 flex-1 rounded-2xl bg-(--brand) text-sm font-semibold text-(--background)"
                disabled={loading}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                className="h-10 flex-1 rounded-2xl border border-(--stroke) text-sm font-semibold text-(--paragraph)"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 text-xs text-(--paragraph)">{errorMessage}</p>
        ) : null}
        {infoMessage ? (
          <p className="mt-2 text-xs text-(--paragraph)">{infoMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
