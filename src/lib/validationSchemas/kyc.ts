import { z } from "zod";

const baseKycSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    lastName: z.string().trim().min(1, "Last name is required."),
    firstName: z.string().trim().min(1, "First name is required."),
    gender: z.string().trim().min(1, "Gender is required."),
    occupation: z.string().trim().min(1, "Occupation is required."),
    annualSalary: z.string().trim().min(1, "Annual salary is required."),
    accountPurpose: z.string().trim().min(1, "Account purpose is required."),
    expectedMonthlyVolume: z
      .string()
      .trim()
      .min(1, "Monthly volume is required."),
    countryId: z.string().trim().min(1, "Country is required."),
    state: z.string().trim().min(1, "State is required."),
    city: z.string().trim().min(1, "City is required."),
    address: z.string().trim().min(1, "Address is required."),
    postCode: z.string().trim().min(1, "Post code is required."),
    areaCode: z.string().trim().min(1, "Area code is required."),
    phone: z.string().trim().min(1, "Phone is required."),
    idType: z.string().trim().min(1, "ID type is required."),
    idNumber: z.string().trim().min(1, "ID number is required."),
    birthday: z.string().trim().min(1, "Birthday is required."),
    startTime: z.string().trim().min(1, "Issuing date is required."),
    endTime: z.string().trim().min(1, "Expiry date is required."),
    idFrontId: z.string().trim().min(1, "ID front image is required."),
    idBackId: z.string().trim().optional().or(z.literal("")),
    idHoldId: z.string().trim().min(1, "Holding ID image is required."),
    idFrontUrl: z.string().optional().or(z.literal("")),
    idBackUrl: z.string().optional().or(z.literal("")),
    idHoldUrl: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => data.idType === "PASSPORT" || Boolean(data.idBackId),
    {
      path: ["idBackId"],
      message: "ID back image is required.",
    }
  );

export const authenticationSchema = baseKycSchema;
export const cardHolderSchema = baseKycSchema;
