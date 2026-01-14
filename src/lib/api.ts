import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens, persistTokens } from "@/lib/auth";

type ApiOptions = RequestInit & {
  path: string;
};

export async function apiRequest<T>({ path, ...init }: ApiOptions): Promise<T> {
  const authHeader =
    init.headers && "Authorization" in init.headers
      ? undefined
      : getAuthHeader();
  const headers = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(init.headers ?? {}),
  };
  const targetUrl = path.startsWith("/api/") ? path : `${API_BASE_URL}${path}`;
  let proxyData: unknown = undefined;
  if (init.body) {
    try {
      proxyData = JSON.parse(init.body as string);
    } catch {
      proxyData = init.body;
    }
  }
  const response = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: targetUrl,
      method: init.method ?? "GET",
      headers,
      data: proxyData,
    }),
  });

  if (response.status === 401 && !path.startsWith(API_ENDPOINTS.refreshToken)) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiRequest<T>({ path, ...init });
    }
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    code?: number | string;
    msg?: string;
    data?: unknown;
  };

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

export function apiGet<T>(path: string, init?: RequestInit) {
  return apiRequest<T>({ path, method: "GET", ...init });
}

async function refreshToken() {
  if (typeof window === "undefined") {
    return false;
  }

  const refreshTokenValue = localStorage.getItem("vtron_refresh_token") ?? "";
  if (!refreshTokenValue) {
    return false;
  }

  const response = await fetch("/api/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${API_BASE_URL}${API_ENDPOINTS.refreshToken}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        authType: "refreshToken",
        refreshToken: refreshTokenValue,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
    }
    return false;
  }

  const data = (await response.json()) as {
    code?: number | string;
    data?: { token_type?: string; access_token?: string; refresh_token?: string };
  };

  if (
    data.code !== undefined &&
    data.code !== null &&
    Number(data.code) !== 200
  ) {
    if (Number(data.code) === 401) {
      clearAuthTokens();
    }
    return false;
  }

  if (!data.data) {
    return false;
  }

  persistTokens(data.data);
  return true;
}

function getAuthHeader() {
  if (typeof window === "undefined") {
    return "";
  }
  const token = localStorage.getItem("vtron_access_token") ?? "";
  const tokenType = localStorage.getItem("vtron_token_type") ?? "";
  if (!token) {
    return "";
  }
  return `${tokenType}${token}`;
}
