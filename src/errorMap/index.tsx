export const errorMessageMap: Record<string, string> = {
  "unknown.error": "Some data failed to load.",
  "token.error": "Session expired. Please sign in again.",
  "member.token.error": "Session expired. Please sign in again.",
  "member.not": "Account not found.",
  "password.set.error": "Password does not meet requirements.",
  "crowd.out": "Session expired. Please sign in again.",
};

export const ignoreMessages: string[] = ["unknown.error"];
