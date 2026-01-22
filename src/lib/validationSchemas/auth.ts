import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");

export const credentialPasswordSchema = z
  .string()
  .min(1, "Password is required");

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[^\w\s]/, "Password must include a special character.");

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: credentialPasswordSchema,
});

export const loginVerifySchema = loginCredentialsSchema
  .extend({
    emailCode: z.string().trim().optional().or(z.literal("")),
    googleCode: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => data.emailCode || data.googleCode, {
    message: "Provide either an email code or a Google code.",
    path: ["emailCode"],
  });

export const registerSchema = loginCredentialsSchema.extend({
  password: strongPasswordSchema,
  emailCode: z.string().trim().min(1, "Email code is required."),
  agentInviteCode: z.string().trim().min(1, "Company Code is required."),
});

export const forgotPasswordSchema = loginCredentialsSchema.extend({
  password: strongPasswordSchema,
  emailCode: z.string().trim().min(1, "Email code is required."),
});
