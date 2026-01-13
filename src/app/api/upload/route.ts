import { API_BASE_URL, API_ENDPOINTS } from "@/lib/apiEndpoints";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
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
