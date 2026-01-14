import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens, persistTokens } from "@/lib/auth";

type ApiOptions = RequestInit & {
  path: string;
  retryCount?: number;
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
  const isLocalApi = path.startsWith("/api/");
  const targetUrl = isLocalApi ? path : `${API_BASE_URL}${path}`;
  let response: Response;

  if (isLocalApi) {
    response = await fetch(targetUrl, {
      ...init,
      headers,
    });
  } else {
    let proxyData: unknown = undefined;
    if (init.body) {
      try {
        proxyData = JSON.parse(init.body as string);
      } catch {
        proxyData = init.body;
      }
    }
    response = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetUrl,
        method: init.method ?? "GET",
        headers,
        data: proxyData,
      }),
    });
  }

  let payload: {
    code?: number | string;
    msg?: string;
    data?: unknown;
  };
  const responseClone = response.clone();
  try {
    payload = (await response.json()) as {
      code?: number | string;
      msg?: string;
      data?: unknown;
    };
  } catch {
    const text = await responseClone.text();
    payload = {
      code: response.ok ? 200 : response.status,
      msg: text || response.statusText,
      data: null,
    };
  }

  if (payload && typeof payload === "object" && "code" in payload) {
    const codeValue = Number(payload.code);
    const isAuthError =
      !Number.isNaN(codeValue) &&
      (codeValue === 401 || codeValue === 20008 || codeValue === 20009);
    if (isAuthError && !path.startsWith(API_ENDPOINTS.refreshToken)) {
      const retryCount = init.retryCount ?? 0;
      if (retryCount < 2 && (await refreshToken())) {
        return apiRequest<T>({ path, ...init, retryCount: retryCount + 1 });
      }
    }
    if (!Number.isNaN(codeValue) && codeValue !== 200) {
      const error = new Error(
        payload.msg || `Request failed with code ${payload.code}`
      ) as Error & { code?: number | string; data?: unknown };
      error.code = payload.code;
      error.data = payload.data;
      throw error;
    }
  }

  if (!response.ok) {
    throw new Error(payload.msg || `Request failed with ${response.status}`);
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

  const data = (await response.json()) as {
    code?: number | string;
    data?: {
      token_type?: string;
      access_token?: string;
      refresh_token?: string;
    };
  };

  if (
    data.code !== undefined &&
    data.code !== null &&
    Number(data.code) !== 200
  ) {
    clearAuthTokens();
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
