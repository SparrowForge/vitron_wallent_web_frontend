"use server";

import { NextResponse } from "next/server";

type ProxyPayload = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
};

const DISALLOWED_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "transfer-encoding",
]);

function sanitizeHeaders(headers: Record<string, string>) {
  const sanitized: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (!DISALLOWED_HEADERS.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  });
  return sanitized;
}

function parseCookies(cookieHeader: string) {
  const list: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    const value = decodeURI(parts.join("="));
    if (name) {
      list[name] = value;
    }
  });
  return list;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProxyPayload;
  console.log("API Request", payload);
  if (!payload?.url) {
    return NextResponse.json(
      { msg: "Missing url in payload.", code: 400 },
      { status: 400 }
    );
  }

  const method = (payload.method ?? "POST").toUpperCase();
  const headers = sanitizeHeaders(payload.headers ?? {});
  if (!headers["Content-Type"] && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  // Inject Authorization header from cookies if not present
  if (!headers["Authorization"]) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["vtron_access_token"];
    const tokenType = cookies["vtron_token_type"] || "Bearer";

    if (token) {
      headers["Authorization"] = `${tokenType}${token}`;
    }
  }

  const response = await fetch(payload.url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(payload.data ?? {}),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await response.json();
    return NextResponse.json(json, { status: response.status });
  }

  const text = await response.text();
  return NextResponse.json(
    { msg: "Non-JSON response", data: text, status: response.status },
    { status: response.status }
  );
}
