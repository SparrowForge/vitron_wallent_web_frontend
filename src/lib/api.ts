import { API_BASE_URL } from "@/lib/apiEndpoints";

type ApiOptions = RequestInit & {
  path: string;
  retryCount?: number;
};

// Mutex for refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

function processQueue(error: Error | null, result: any = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(result);
    }
  });

  failedQueue = [];
}

export async function apiRequest<T>({ path, ...init }: ApiOptions): Promise<T> {
  const isLocalApi = path.startsWith("/api/");
  // If we are calling a local API (like /api/proxy or /api/auth/refresh),
  // we do NOT attach headers manually (browser does it).
  // If we are calling external API (via server component directly), we need to handle that separately
  // but this function seems designed for Client -> Proxy interaction primarily.

  const targetUrl = isLocalApi ? path : `${API_BASE_URL}${path}`;
  console.log("apiRequestssss", targetUrl);
  let response: Response;

  const performRequest = async () => {
    if (isLocalApi) {
      return fetch(targetUrl, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
    } else {
      // Proxy logic remains
      let proxyData: unknown = undefined;
      if (init.body) {
        try {
          proxyData = JSON.parse(init.body as string);
        } catch {
          proxyData = init.body;
        }
      }
      console.log("proxyData", init.body);
      return fetch(`${process.env.NEXT_PUBLIC_CLIENT_BASE_URL}/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          method: init.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
          },
          data: proxyData,
        }),
      });
    }
  };

  response = await performRequest();

  let payload: {
    code?: number | string;
    msg?: string;
    data?: unknown;
  };

  // Clone to read text if json fails
  const responseClone = response.clone();
  try {
    payload = (await response.json()) as any;
  } catch {
    const text = await responseClone.text();
    payload = {
      code: response.ok ? 200 : response.status,
      msg: text || response.statusText,
      data: null,
    };
  }

  // Auth Error Checking
  if (payload && typeof payload === "object" && "code" in payload) {
    const codeValue = Number(payload.code);
    const isAuthError =
      !Number.isNaN(codeValue) &&
      (codeValue === 401 || codeValue === 20008 || codeValue === 20009);

    if (isAuthError && !path.includes("/refresh")) {
      // Avoid infinite loops if refresh fails
      console.log("[api.ts] Auth error detected", codeValue);
      if (isRefreshing) {
        console.log("[api.ts] Already refreshing, queuing request");
        // Add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry original request
          console.log("[api.ts] Queue resolved, retrying");
          return apiRequest<T>({ path, ...init });
        });
      }

      isRefreshing = true;

      try {
        console.log("[api.ts] Starting refresh token flow");
        const refreshed = await refreshToken();
        console.log("[api.ts] Refresh result:", refreshed);
        if (refreshed) {
          processQueue(null, true);
          return apiRequest<T>({ path, ...init });
        } else {
          processQueue(new Error("Refresh failed"));
          // Force logout / redirect?
          if (typeof window !== "undefined") {
            // window.location.href = "/auth"; // Optional: Force redirect
          }
        }
      } catch (err) {
        processQueue(err instanceof Error ? err : new Error("Refresh error"));
      } finally {
        isRefreshing = false;
      }
    }

    if (!Number.isNaN(codeValue) && codeValue !== 200) {
      const error = new Error(
        `[api] ${payload.msg || `Request failed with code ${payload.code}`}`,
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

export async function refreshToken() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
    });
    const data = await response.json();
    if (data.code === 200) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Deprecated or Empty Helper (for compatibility if used elsewhere)
function getAuthHeader() {
  return "";
}
