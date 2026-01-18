import { z } from "zod";
import {
  emailSchema,
  credentialPasswordSchema as basicPasswordSchema,
  strongPasswordSchema,
} from "./auth";

export const modifyEmailSchema = z.object({
  newEmail: emailSchema,
  password: basicPasswordSchema,
  emailCode: z.string().trim().optional().or(z.literal("")),
  googleCode: z.string().trim().optional().or(z.literal("")),
});

export const loginPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().trim().min(1, "Confirm password is required."),
    emailCode: z.string().trim().min(1, "Email code is required."),
    googleCode: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const transactionPasswordSchema = z
  .object({
    payPassword: z.string().regex(/^\d{6}$/, "Transaction password must be 6 digits."),
    confirmPassword: z
      .string()
      .regex(/^\d{6}$/, "Confirm password must be 6 digits."),
    emailCode: z.string().trim().optional().or(z.literal("")),
    googleCode: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.payPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((data) => data.emailCode || data.googleCode, {
    path: ["emailCode"],
    message: "Provide either an email code or a Google code.",
  });

export const googleAuthSchema = z.object({
  emailCode: z.string().trim().min(1, "Email code is required."),
  googleCode: z.string().trim().min(1, "Google code is required."),
  secret: z.string().trim().optional().or(z.literal("")),
});
