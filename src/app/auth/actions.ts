"use server";

import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";
import { headers } from "next/headers";

type RegisterParams = {
  username: string;
  password: string;
  code: string;
};

type LoginVerifyParams = {
  username: string;
  password: string;
  code?: string;
  googleCode?: string;
};

type LoginResponse = {
  data?: {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
  };
  msg?: string;
  code?: number | string;
};

async function requestJson<T>(path: string, init: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
  let response: Response;
  try {
    const proxyBody: {
      url: string;
      method: string;
      headers: Record<string, string>;
      data?: unknown;
    } = {
      url,
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json" },
    };
    // Normalize init.headers (HeadersInit) into a plain Record<string, string>
    if (init.headers) {
      const target = proxyBody.headers;
      const h = init.headers as HeadersInit;
      if (h instanceof Headers) {
        h.forEach((value, key) => {
          target[key] = value;
        });
      } else if (Array.isArray(h)) {
        h.forEach(([key, value]) => {
          target[key] = String(value);
        });
      } else {
        const obj = h as Record<string, string>;
        Object.keys(obj).forEach((key) => {
          target[key] = obj[key];
        });
      }
    }
    if (init.body) {
      try {
        proxyBody.data = JSON.parse(init.body as string);
      } catch {
        proxyBody.data = init.body;
      }
    }
    response = await fetch(`${baseUrl}/api/proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proxyBody),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("API Request Error:", {
        url,
        method: init.method,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      msg: "Request failed. Please try again.",
      code: 0,
    } as unknown as T;
  }

  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? "";
    const text = await response.text();
    const isHtml =
      contentType.includes("text/html") || text.trim().startsWith("<!DOCTYPE");
    const message = isHtml
      ? "Request failed. Please try again."
      : text || `Request failed with ${response.status}`;
    if (process.env.NODE_ENV !== "production") {
      console.error("API Request Error:", {
        url,
        method: init.method,
        status: response.status,
        statusText: response.statusText,
        headers: sanitizeHeaders(response.headers),
        body: isHtml ? "<html response>" : text.slice(0, 2000),
      });
    }
    const error = new Error(
      message || `Request failed with ${response.status}`
    ) as Error & {
      code?: number | string;
      data?: unknown;
    };
    error.code = response.status;
    throw error;
  }

  const payload = (await response.json()) as {
    code?: number | string;
    msg?: string;
    data?: unknown;
  };
  if (process.env.NODE_ENV !== "production") {
    console.log("API Response:", payload);
  }
  if (payload && typeof payload === "object" && "code" in payload) {
    const codeValue = Number(payload.code);
    if (!Number.isNaN(codeValue) && codeValue !== 200) {
      const error = new Error(
        payload.msg || `Request failed with code ${payload.code}`
      ) as Error & { code?: number | string; data?: unknown };
      error.code = payload.code;
      error.data = payload.data;
      throw error;
    }
  }
  return payload as T;
}

function sanitizeHeaders(headers: Headers) {
  const entries: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      entries[key] = "<redacted>";
      return;
    }
    entries[key] = value;
  });
  return entries;
}

export async function sendLoginCodeAction(email: string, type = "login") {
  const response = await requestJson<LoginResponse>(
    `${API_ENDPOINTS.registerSendCode}?email=${encodeURIComponent(
      email
    )}&type=${encodeURIComponent(type)}`,
    {
      method: "GET",
    }
  );
  return response;
}

export async function loginWithPasswordAndCodeAction(
  params: LoginVerifyParams
) {
  const response = await requestJson<LoginResponse>(API_ENDPOINTS.login, {
    method: "POST",
    body: JSON.stringify({
      ...params,
      authType: "password",
    }),
  });
  return response;
}

export async function sendRegisterCodeAction(email: string) {
  const response = await requestJson<LoginResponse>(
    `${API_ENDPOINTS.registerSendCode}?email=${encodeURIComponent(
      email
    )}&type=register`,
    {
      method: "GET",
    }
  );
  return response;
}

export async function registerWithPasswordAction(params: RegisterParams) {
  const response = await requestJson<LoginResponse>(API_ENDPOINTS.register, {
    method: "POST",
    body: JSON.stringify({
      ...params,
      registerType: "app",
    }),
  });
  return response;
}
