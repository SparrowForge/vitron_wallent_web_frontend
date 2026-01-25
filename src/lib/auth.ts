type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
};

export function persistTokens(tokens?: TokenPayload) {
  // Tokens are now stored in HttpOnly cookies via Server Actions
  // This function is kept for compatibility but no longer stores in localStorage
}

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";

export async function clearAuthTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("CryptoPag_access_token");
    localStorage.removeItem("CryptoPag_refresh_token");
    localStorage.removeItem("CryptoPag_token_type");
  }

  try {
    await apiRequest({
      path: API_ENDPOINTS.logout,
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch (error) {
    console.error("Logout failed", error);
  }
}
