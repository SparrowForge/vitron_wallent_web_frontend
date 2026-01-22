export const errorMessageMap: Record<string, string> = {
  "unknown.error": "Failed to load data.",
  "token.error": "Session expired. Please sign in again.",
  "member.token.error": "Session expired. Please sign in again.",
  "member.not": "Username not registered.",
  "password.set.error": "Password does not meet requirements.",
  "crowd.out": "Invalid Login. Please sign in again.",
  "google.check.error": "Google authentication failed.",
  "code.invalid": "Invalid Login credentials.",
};

export const ignoreMessages: string[] = ["unknown.error"];
