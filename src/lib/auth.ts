type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
};

export function persistTokens(tokens?: TokenPayload) {
  // Tokens are now stored in HttpOnly cookies via Server Actions
  // This function is kept for compatibility but no longer stores in localStorage
}

import { logoutAction } from "@/app/auth/actions";

export async function clearAuthTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vtron_access_token");
    localStorage.removeItem("vtron_refresh_token");
    localStorage.removeItem("vtron_token_type");
  }
  await logoutAction();
}
