"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent } from "@/shared/components/ui/Card";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import { Input } from "@/shared/components/ui/Input";
import Spinner from "@/shared/components/ui/Spinner";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
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

  useToastMessages({ errorMessage, infoMessage });
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
        if (response.data) {
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
      if (!startResponse.data) {
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
        rp: {
          name: options.rp?.name ?? "",
          id: options.rp?.id,
        },
        user: {
          id: base64UrlToBuffer(options.user.id),
          name: options.user.name ?? "",
          displayName: options.user.displayName ?? options.user.name ?? "",
        },
        pubKeyCredParams:
          options.pubKeyCredParams?.map((param) => ({
            type: "public-key",
            alg: param.alg,
          })) ?? [{ type: "public-key", alg: -7 }],
        timeout: options.timeout,
        excludeCredentials: options.excludeCredentials?.map((credential) => ({
          type: "public-key",
          id: base64UrlToBuffer(credential.id),
        })),
        authenticatorSelection: options.authenticatorSelection
          ? {
            authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as
              | AuthenticatorAttachment
              | undefined,
            residentKey: options.authenticatorSelection.residentKey as
              | ResidentKeyRequirement
              | undefined,
            userVerification: options.authenticatorSelection.userVerification as
              | UserVerificationRequirement
              | undefined,
          }
          : undefined,
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

      <Card variant="glass">
    </div>
              </div >
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRenameOpen(true)}
      >
        Rename
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 shadow-none border border-red-500/30"
      >
        Delete
      </Button>
    </div>
            </div >
          ) : (
    <div className="space-y-4">
      <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--paragraph)">
        No passkey yet. Add one to secure your account.
      </div>
      <Button
        onClick={handleAddPasskey}
        className="w-full"
        disabled={loading}

      >
        Add passkey
      </Button>
    </div>
  )
}

<div className="mt-6 space-y-4">
  {needsGoogle ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-(--paragraph)">
        Verification method
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={verifyType === "email"}
            onChange={() => setVerifyType("email")}
            className="accent-(--brand)"
          />
          Email
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={verifyType === "google"}
            onChange={() => setVerifyType("google")}
            className="accent-(--brand)"
          />
          Google
        </label>
      </div>
    </div>
  ) : null}

  {verifyType === "email" ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-(--paragraph)">
        Email code
      </label>
      <div className="flex items-center gap-3">
        <Input
          placeholder="Enter code"
          value={emailCode}
          onChange={(event) => setEmailCode(event.target.value)}
        />
        <Button
          variant="outline"
          onClick={() =>
            handleSendCode(passkey ? "deletePasskey" : "addPasskey")
          }
          className="min-w-[120px]"
          disabled={cooldown > 0 || loading}
        >
          {cooldown > 0 ? `${cooldown}s` : "Send code"}
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      <label className="text-sm font-medium text-(--paragraph)">
        Google code
      </label>
      <Input
        placeholder="Enter Google code"
        value={googleCode}
        onChange={(event) => setGoogleCode(event.target.value)}
      />
    </div>
  )}
</div>

{
  passkey && deleteOpen ? (
    <Button
      variant="destructive"
      onClick={handleDelete}
      className="mt-6 w-full"
      disabled={loading}

    >
      Confirm delete
    </Button>
  ) : null
}

{
  renameOpen ? (
    <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-(--paragraph)">
          Display name
        </label>
        <Input
          placeholder="Enter name"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
        />
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          onClick={handleRename}
          className="flex-1"
          disabled={loading}

        >
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => setRenameOpen(false)}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  ) : null
}
        </CardContent >
      </Card >
    </div >
  );
}
