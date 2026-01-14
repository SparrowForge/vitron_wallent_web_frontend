import { z } from "zod";

export const cardApplySchema = z.object({
  cardBinId: z.string().trim().min(1, "Card selection is required."),
  payPassword: z.string().trim().min(1, "Payment password is required."),
  cardType: z.enum(["VIRTUAL_CARD", "PHYSICAL_CARD"]),
  alias: z.string().trim().max(30, "Alias must be 30 characters or less.").optional().or(z.literal("")),
});

export const cardDepositSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  payPassword: z.string().trim().min(1, "Payment password is required."),
});

export const cardFreezeSchema = z.object({
  payPassword: z.string().trim().min(1, "Payment password is required."),
});

export const cardViewSchema = z.object({
  payPassword: z.string().trim().min(1, "Payment password is required."),
});

export const cardActivateSchema = z.object({
  activeCode: z.string().trim().min(1, "Activation code is required."),
  payPassword: z.string().trim().min(1, "Payment password is required."),
});

export const cardPinSchema = z
  .object({
    pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits."),
    confirmPin: z.string().regex(/^\d{6}$/, "Confirm PIN must be 6 digits."),
    payPassword: z.string().trim().min(1, "Payment password is required."),
  })
  .refine((data) => data.pin === data.confirmPin, {
    path: ["confirmPin"],
    message: "PINs do not match.",
  });
