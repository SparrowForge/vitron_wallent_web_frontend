type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
};

export function persistTokens(tokens?: TokenPayload) {
  if (!tokens) {
    return;
  }

  const tokenType = (tokens.token_type ?? "").trim();
  const accessToken = (tokens.access_token ?? "").trim();
  const refreshToken = (tokens.refresh_token ?? "").trim();

  if (accessToken) {
    localStorage.setItem("vtron_access_token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("vtron_refresh_token", refreshToken);
  }

  if (tokenType) {
    localStorage.setItem("vtron_token_type", tokenType);
  }
}

export function clearAuthTokens() {
  localStorage.removeItem("vtron_access_token");
  localStorage.removeItem("vtron_refresh_token");
  localStorage.removeItem("vtron_token_type");
}
