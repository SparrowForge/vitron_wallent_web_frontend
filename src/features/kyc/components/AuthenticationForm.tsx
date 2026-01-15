"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { authenticationSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";

type Country = {
  id?: string | number;
  ID?: string | number;
  usName?: string;
  cnName?: string;
  code?: string;
};

type Occupation = {
  label?: string;
  value?: string;
};

type UploadResponse = {
  code?: number | string;
  msg?: string;
  data?: { id?: string | number; fileUrl?: string };
};

type MerchantKycDetail = {
  country?: Country;
  city?: string;
  kyc?: Record<string, unknown>;
};

type KycDetailResponse = {
  code?: number | string;
  msg?: string;
  data?: MerchantKycDetail;
};

type ListResponse<T> = {
  code?: number | string;
  msg?: string;
  data?: T[];
};

type MerchantInfoResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    kycStatus?: number | string;
    kycRemark?: string | null;
  } | null;
};

const getAuthHeader = () => {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("vtron_access_token") ?? "";
  const tokenType = (localStorage.getItem("vtron_token_type") ?? "").trim();
  if (!token) return "";
  // Ensure a space between token type and token (e.g., "Bearer <token>")
  return tokenType ? `${tokenType}${token}` : token;
};

const toDateTime = (value: string) => {
  if (!value) return "";
  return value.includes(" ") ? value : `${value} 00:00:00`;
};

const toDateInputValue = (value: string) => {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  if (value.includes(" ")) return value.split(" ")[0];
  return value;
};

const resolveId = (item?: Country) => String(item?.id ?? item?.ID ?? "");
const resolveCountryLabel = (item?: Country) =>
  item?.usName ?? item?.cnName ?? "";

const getIdTypeOptions = (countryId: string) => {
  if (countryId === "181") {
    return [
      { label: "Passport", value: "PASSPORT" },
      { label: "ID Card", value: "CN-RIC" },
    ];
  }
  if (countryId === "177") {
    return [
      { label: "Passport", value: "PASSPORT" },
      { label: "HK ID Card", value: "HK-HKID" },
    ];
  }
  return [
    { label: "Passport", value: "PASSPORT" },
    { label: "ID Card", value: "Government-Issued ID Card" },
  ];
};

const getKycStatusLabel = (status?: number | string) => {
  switch (Number(status)) {
    case 0:
      return "In review";
    case 1:
      return "Review completed";
    case 2:
      return "Face verification required";
    case 3:
      return "Awaiting review";
    case 4:
      return "Rejected";
    case 5:
      return "Approved";
    case 7:
      return "Not submitted";
    default:
      return "Unknown";
  }
};

type AuthFormValues = z.infer<typeof authenticationSchema>;

export default function AuthenticationForm() {
  const frontId = useId();
  const backId = useId();
  const holdId = useId();

  const [pageLoading, setPageLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useToastMessages({ errorMessage, successMessage });

  const [countries, setCountries] = useState<Country[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [phoneCodes, setPhoneCodes] = useState<Country[]>([]);
  const [kycStatus, setKycStatus] = useState<number | string>();
  const [kycRemark, setKycRemark] = useState<string | null>(null);

  const [uploading, setUploading] = useState({
    idFrontId: false,
    idBackId: false,
    idHoldId: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authenticationSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      gender: "",
      occupation: "",
      annualSalary: "",
      accountPurpose: "",
      expectedMonthlyVolume: "",
      countryId: "",
      state: "",
      city: "",
      address: "",
      postCode: "",
      areaCode: "",
      phone: "",
      idType: "",
      idNumber: "",
      birthday: "",
      startTime: "",
      endTime: "",
      idFrontId: "",
      idBackId: "",
      idHoldId: "",
      idFrontUrl: "",
      idBackUrl: "",
      idHoldUrl: "",
    },
    mode: "onSubmit",
  });

  const countryId = watch("countryId");
  const idType = watch("idType");
  const idFrontUrl = watch("idFrontUrl");
  const idBackUrl = watch("idBackUrl");
  const idHoldUrl = watch("idHoldUrl");

  const idTypeOptions = useMemo(
    () => getIdTypeOptions(countryId ?? ""),
    [countryId]
  );

  useEffect(() => {
    if (countryId === undefined) return;
    const hasMatch = idTypeOptions.some((option) => option.value === idType);
    if (!hasMatch) {
      setValue("idType", idTypeOptions[0]?.value ?? "PASSPORT", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [countryId, idType, idTypeOptions, setValue]);

  useEffect(() => {
    let mounted = true;

    const loadLists = async () => {
      setPageLoading(true);
      setErrorMessage("");

      const results = await Promise.allSettled([
        apiRequest<ListResponse<Country>>({
          path: API_ENDPOINTS.kycCountryList,
          method: "POST",
          body: JSON.stringify({}),
        }),
        apiRequest<ListResponse<Occupation>>({
          path: API_ENDPOINTS.kycOccupationList,
          method: "POST",
          body: JSON.stringify({}),
        }),
        apiRequest<ListResponse<Country>>({
          path: API_ENDPOINTS.kycPhoneList,
          method: "POST",
          body: JSON.stringify({}),
        }),
        apiRequest<KycDetailResponse>({
          path: API_ENDPOINTS.kycDetail,
          method: "POST",
          body: JSON.stringify({}),
        }),
        apiRequest<MerchantInfoResponse>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        }),
      ]);

      if (!mounted) return;

      const [countryRes, occupationRes, phoneRes, detailRes, merchantRes] =
        results;

      // helper
      const valueOrNull = <T,>(r: PromiseSettledResult<T>) =>
        r.status === "fulfilled" ? r.value : null;

      const countryResponse = valueOrNull(countryRes);
      const occupationResponse = valueOrNull(occupationRes);
      const phoneResponse = valueOrNull(phoneRes);
      const detail = valueOrNull(detailRes);
      const merchantInfo = valueOrNull(merchantRes);

      // set dropdown data even if others failed
      if (countryResponse && Number(countryResponse.code) === 200)
        setCountries(countryResponse.data ?? []);
      if (occupationResponse && Number(occupationResponse.code) === 200)
        setOccupations(occupationResponse.data ?? []);
      if (phoneResponse && Number(phoneResponse.code) === 200)
        setPhoneCodes(phoneResponse.data ?? []);

      // merchant info (optional)
      if (merchantInfo && Number(merchantInfo.code) === 200) {
        setKycStatus(merchantInfo.data?.kycStatus);
        setKycRemark(merchantInfo.data?.kycRemark ?? null);
      }

      // detail (optional)
      if (detail && Number(detail.code) === 200 && detail.data?.kyc) {
        const kyc = detail.data.kyc as Record<string, any>;
        reset((prev) => ({
          ...prev,
          ...kyc,
          countryId: String(detail.data?.country?.id ?? kyc.countryId ?? ""),
          city: String(detail.data?.city ?? kyc.city ?? ""),
          areaCode: String(kyc.areaCode ?? prev.areaCode ?? ""),
          occupation: String(kyc.occupationValue ?? kyc.occupation ?? ""),
          birthday: toDateInputValue(String(kyc.birthday ?? "")),
          startTime: toDateInputValue(String(kyc.startTime ?? "")),
          endTime: toDateInputValue(String(kyc.endTime ?? "")),
        }));
      }

      // collect errors but don't block successful data
      const failed = results.filter(
        (r) => r.status === "rejected"
      ) as PromiseRejectedResult[];
      if (failed.length) {
        setErrorMessage(
          failed[0].reason instanceof Error
            ? failed[0].reason.message
            : "Some KYC data failed to load."
        );
      }

      setPageLoading(false);
    };

    void loadLists();
    return () => {
      mounted = false;
    };
  }, [reset]);

  const handleUpload = async (
    file: File,
    target: "idFrontId" | "idBackId" | "idHoldId"
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setUploading((prev) => ({ ...prev, [target]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: getAuthHeader() },
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse;
      if (Number(payload.code) !== 200 || !payload.data) {
        throw new Error(payload.msg || "Upload failed.");
      }

      const newId = String(payload.data.id ?? "");
      const newUrl = payload.data.fileUrl ?? "";

      setValue(target, newId, { shouldValidate: true, shouldDirty: true });
      const urlKey = target.replace("Id", "Url") as
        | "idFrontUrl"
        | "idBackUrl"
        | "idHoldUrl";
      setValue(urlKey, newUrl, { shouldDirty: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setUploading((prev) => ({ ...prev, [target]: false }));
    }
  };

  const onSubmit = async (values: AuthFormValues) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitLoading(true);

    try {
      const payload = {
        ...values,
        birthday: toDateTime(values.birthday),
        startTime: toDateTime(values.startTime),
        endTime: toDateTime(values.endTime),
        idBackId:
          values.idType === "PASSPORT" ? values.idFrontId : values.idBackId,
      };

      const response = await apiRequest<{
        code?: number | string;
        msg?: string;
      }>({
        path: API_ENDPOINTS.kycSubmit,
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (Number(response.code) !== 200) {
        throw new Error(response.msg || "KYC submit failed.");
      }

      setSuccessMessage("KYC submitted successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "KYC submit failed."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderFieldError = (fieldMessage?: unknown) =>
    fieldMessage ? (
      <p className="text-xs text-red-500">{String(fieldMessage)}</p>
    ) : null;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-xl border border-(--stroke) bg-(--background) px-4 py-2 text-sm text-(--paragraph)">
        KYC status: {getKycStatusLabel(kycStatus)}
        {kycRemark ? (
          <span className="block text-xs text-(--placeholder)">
            {kycRemark}
          </span>
        ) : null}
        {pageLoading ? (
          <span className="ml-2 text-xs text-(--placeholder)">
            (loading...)
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Last name
          </label>
          <input
            {...register("lastName")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.lastName?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            First name
          </label>
          <input
            {...register("firstName")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.firstName?.message)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Gender
          </label>
          <select
            {...register("gender")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            <option value="">Please choose</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {renderFieldError(errors.gender?.message)}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Occupation
          </label>
          <select
            {...register("occupation")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            <option value="">Please choose</option>
            {occupations.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {renderFieldError(errors.occupation?.message)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Annual salary
          </label>
          <input
            {...register("annualSalary")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.annualSalary?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Account purpose
          </label>
          <input
            {...register("accountPurpose")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.accountPurpose?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Monthly volume
          </label>
          <input
            {...register("expectedMonthlyVolume")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.expectedMonthlyVolume?.message)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Country / Region
          </label>
          <select
            {...register("countryId")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            onChange={(e) => {
              const value = e.target.value;
              setValue("countryId", value, {
                shouldValidate: true,
                shouldDirty: true,
              });
              setValue("idType", "PASSPORT", {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          >
            <option value="">Please choose</option>
            {countries.map((c) => (
              <option key={resolveId(c)} value={resolveId(c)}>
                {resolveCountryLabel(c)}
              </option>
            ))}
          </select>
          {renderFieldError(errors.countryId?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            State / Province
          </label>
          <input
            {...register("state")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.state?.message)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">City</label>
          <input
            {...register("city")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.city?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Address
          </label>
          <input
            {...register("address")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.address?.message)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Post code
          </label>
          <input
            {...register("postCode")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.postCode?.message)}
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-(--paragraph)">
              Code
            </label>
            <select
              {...register("areaCode")}
              className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            >
              <option value="">Code</option>
              {phoneCodes.map((c) => (
                <option key={resolveId(c)} value={c.code ?? ""}>
                  +{c.code}
                </option>
              ))}
            </select>
            {renderFieldError(errors.areaCode?.message)}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--paragraph)">
              Phone
            </label>
            <input
              {...register("phone")}
              className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            />
            {renderFieldError(errors.phone?.message)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            ID type
          </label>
          <select
            {...register("idType")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            {idTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {renderFieldError(errors.idType?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            ID number
          </label>
          <input
            {...register("idNumber")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.idNumber?.message)}
        </div>
      </div>

      {/* Uploads */}
      <div className="grid gap-4 sm:grid-cols-3">
        <label
          htmlFor={frontId}
          className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph)"
        >
          {idFrontUrl ? (
            <img
              src={idFrontUrl}
              alt="ID front preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke)">
                +
              </span>
              <span>Upload ID front</span>
            </>
          )}

          {idFrontUrl ? (
            <span className="absolute bottom-2 right-2 rounded-full border border-(--stroke) bg-(--background) px-3 py-1 text-[10px] font-semibold text-(--foreground)">
              Change
            </span>
          ) : null}

          {uploading.idFrontId ? (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-(--foreground)">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-(--stroke) border-t-transparent" />
            </span>
          ) : null}

          <input
            id={frontId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "idFrontId");
            }}
          />

          {errors.idFrontId?.message ? (
            <span className="absolute bottom-2 left-2 text-[10px] text-red-200">
              {String(errors.idFrontId.message)}
            </span>
          ) : null}
        </label>

        <label
          htmlFor={backId}
          className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph) ${
            idType === "PASSPORT" ? "opacity-60" : ""
          }`}
        >
          {idBackUrl && idType !== "PASSPORT" ? (
            <img
              src={idBackUrl}
              alt="ID back preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke)">
                +
              </span>
              <span>Upload ID back</span>
            </>
          )}

          {idType !== "PASSPORT" && idBackUrl ? (
            <span className="absolute bottom-2 right-2 rounded-full border border-(--stroke) bg-(--background) px-3 py-1 text-[10px] font-semibold text-(--foreground)">
              Change
            </span>
          ) : null}

          {uploading.idBackId ? (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-(--foreground)">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-(--stroke) border-t-transparent" />
            </span>
          ) : null}

          <input
            id={backId}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={idType === "PASSPORT"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "idBackId");
            }}
          />

          {errors.idBackId?.message ? (
            <span className="absolute bottom-2 left-2 text-[10px] text-red-200">
              {String(errors.idBackId.message)}
            </span>
          ) : null}
        </label>

        <label
          htmlFor={holdId}
          className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph)"
        >
          {idHoldUrl ? (
            <img
              src={idHoldUrl}
              alt="Holding ID preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke)">
                +
              </span>
              <span>Upload holding ID</span>
            </>
          )}

          {idHoldUrl ? (
            <span className="absolute bottom-2 right-2 rounded-full border border-(--stroke) bg-(--background) px-3 py-1 text-[10px] font-semibold text-(--foreground)">
              Change
            </span>
          ) : null}

          {uploading.idHoldId ? (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-(--foreground)">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-(--stroke) border-t-transparent" />
            </span>
          ) : null}

          <input
            id={holdId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "idHoldId");
            }}
          />

          {errors.idHoldId?.message ? (
            <span className="absolute bottom-2 left-2 text-[10px] text-red-200">
              {String(errors.idHoldId.message)}
            </span>
          ) : null}
        </label>
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Date of birth
          </label>
          <input
            type="date"
            value={toDateInputValue(watch("birthday") ?? "")}
            onChange={(e) =>
              setValue("birthday", e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.birthday?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Issuing date
          </label>
          <input
            type="date"
            value={toDateInputValue(watch("startTime") ?? "")}
            onChange={(e) =>
              setValue("startTime", e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.startTime?.message)}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Expiry date
          </label>
          <input
            type="date"
            value={toDateInputValue(watch("endTime") ?? "")}
            onChange={(e) =>
              setValue("endTime", e.target.value, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {renderFieldError(errors.endTime?.message)}
        </div>
      </div>

      <button
        type="submit"
        disabled={pageLoading || submitLoading}
        className={`h-11 w-full rounded-xl text-sm font-semibold ${
          pageLoading || submitLoading
            ? "bg-(--stroke) text-(--placeholder)"
            : "bg-(--brand) text-(--background)"
        }`}
      >
        {submitLoading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
