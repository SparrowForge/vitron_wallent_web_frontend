import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";

import { cookies } from "next/headers";

export async function POST(request: Request) {
  let authHeader = request.headers.get("authorization") ?? "";

  if (!authHeader) {
    const cookieStore = await cookies();
    const token = cookieStore.get("CryptoPag_access_token")?.value;
    const type = cookieStore.get("CryptoPag_token_type")?.value ?? "Bearer";
    if (token) {
      authHeader = `${type}${token}`.trim();
    }
  }

  const formData = await request.formData();

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.kycUploadFile}`, {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : undefined,
    body: formData,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return new Response(
    typeof payload === "string" ? payload : JSON.stringify(payload),
    {
      status: response.status,
      headers: {
        "Content-Type": contentType.includes("application/json")
          ? "application/json"
          : "text/plain",
      },
    }
  );
}
