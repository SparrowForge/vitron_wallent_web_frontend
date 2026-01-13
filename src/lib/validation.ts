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

export const loginVerifySchema = loginCredentialsSchema.extend({
  emailCode: z.string().trim().min(1, "Email code is required."),
  googleCode: z.string().trim().optional().or(z.literal("")),
});

export const registerSchema = loginCredentialsSchema.extend({
  emailCode: z.string().trim().min(1, "Email code is required."),
});

export const sendSchema = z.object({
  recipient: emailSchema,
});

export const withdrawSchema = z.object({
  address: z.string().trim().min(6, "Payment address is required."),
  amount: z.coerce
    .number()
    .min(10, "Minimum withdrawal is 10.00.")
    .positive("Withdrawal amount must be greater than zero."),
});
