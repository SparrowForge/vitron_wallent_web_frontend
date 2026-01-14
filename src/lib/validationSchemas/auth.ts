import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/\d/, "Password must include a number.");

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
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
  emailCode: z.string().trim().min(1, "Email code is required."),
});
