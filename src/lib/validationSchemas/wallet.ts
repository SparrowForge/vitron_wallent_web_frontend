import { z } from "zod";
import { emailSchema } from "./auth";

export const transferSchema = z.object({
  email: emailSchema,
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  payPassword: z.string().trim().min(1, "Payment password is required."),
  currency: z.string().trim().min(1, "Currency is required."),
  remark: z.string().trim().max(20, "Remark must be 20 characters or less.").optional().or(z.literal("")),
});

export const withdrawSchema = z.object({
  network: z.string().trim().min(1, "Network is required."),
  address: z.string().trim().min(6, "Payment address is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  payPassword: z.string().trim().min(1, "Payment password is required."),
});
