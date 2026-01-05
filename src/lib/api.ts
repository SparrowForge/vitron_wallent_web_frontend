const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type ApiOptions = RequestInit & {
  path: string;
};

export async function apiRequest<T>({ path, ...init }: ApiOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, init?: RequestInit) {
  return apiRequest<T>({ path, method: "GET", ...init });
}
