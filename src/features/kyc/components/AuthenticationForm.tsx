"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { authenticationSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import { Select } from "@/shared/components/ui/Select";
import Spinner from "@/shared/components/ui/Spinner";
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
  const watchedValues = watch();

  const shouldShowAsterisk = (value?: string) =>
    String(value ?? "").trim().length === 0;

  const idTypeOptions = useMemo(
    () => getIdTypeOptions(countryId ?? ""),
    [countryId],
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
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult[];
      if (failed.length) {
        setErrorMessage(
          failed[0].reason instanceof Error
            ? failed[0].reason.message
            : "Some KYC data failed to load.",
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
    target: "idFrontId" | "idBackId" | "idHoldId",
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setUploading((prev) => ({ ...prev, [target]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {},
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
        error instanceof Error ? error.message : "Upload failed.",
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
        error instanceof Error ? error.message : "KYC submit failed.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-(--paragraph)">
          <Spinner size={16} />
          Loading Authentication Details...
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6 relative" onSubmit={handleSubmit(onSubmit)}>
      <LoadingOverlay loading={submitLoading} />
      <div className="rounded-xl border border-(--brand)/20 bg-(--brand)/5 px-4 py-3 text-sm font-medium text-(--brand)">
        KYC status: {getKycStatusLabel(kycStatus)}
        {kycRemark ? (
          <span className="block mt-1 text-xs text-(--brand)/80">
            {kycRemark}
          </span>
        ) : null}
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                First name{" "}
                {shouldShowAsterisk(watchedValues.firstName) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("firstName")}
                error={errors.firstName?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Last name{" "}
                {shouldShowAsterisk(watchedValues.lastName) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("lastName")}
                error={errors.lastName?.message}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Gender{" "}
                {shouldShowAsterisk(watchedValues.gender) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Select {...register("gender")} error={errors.gender?.message}>
                <option value="">Please choose</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Occupation{" "}
                {shouldShowAsterisk(watchedValues.occupation) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Select
                {...register("occupation")}
                error={errors.occupation?.message}
              >
                <option value="">Please choose</option>
                {occupations.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Annual salary{" "}
                {shouldShowAsterisk(watchedValues.annualSalary) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("annualSalary")}
                error={errors.annualSalary?.message}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Account purpose{" "}
                {shouldShowAsterisk(watchedValues.accountPurpose) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("accountPurpose")}
                error={errors.accountPurpose?.message}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Monthly volume{" "}
                {shouldShowAsterisk(watchedValues.expectedMonthlyVolume) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("expectedMonthlyVolume")}
                error={errors.expectedMonthlyVolume?.message}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Country / Region{" "}
                {shouldShowAsterisk(watchedValues.countryId) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Select
                {...register("countryId")}
                error={errors.countryId?.message}
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
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                State / Province{" "}
                {shouldShowAsterisk(watchedValues.state) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input {...register("state")} error={errors.state?.message} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                City{" "}
                {shouldShowAsterisk(watchedValues.city) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input {...register("city")} error={errors.city?.message} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Address{" "}
                {shouldShowAsterisk(watchedValues.address) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input {...register("address")} error={errors.address?.message} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Post code{" "}
                {shouldShowAsterisk(watchedValues.postCode) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("postCode")}
                error={errors.postCode?.message}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--paragraph)">
                  Code{" "}
                  {shouldShowAsterisk(watchedValues.areaCode) ? (
                    <span className="text-red-500">
                      <sup>*required</sup>
                    </span>
                  ) : null}
                </label>
                <Select
                  {...register("areaCode")}
                  error={errors.areaCode?.message}
                >
                  <option value="">Code</option>
                  {phoneCodes.map((c) => (
                    <option key={resolveId(c)} value={c.code ?? ""}>
                      +{c.code}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-(--paragraph)">
                  Phone{" "}
                  {shouldShowAsterisk(watchedValues.phone) ? (
                    <span className="text-red-500">
                      <sup>*required</sup>
                    </span>
                  ) : null}
                </label>
                <Input {...register("phone")} error={errors.phone?.message} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                ID type{" "}
                {shouldShowAsterisk(watchedValues.idType) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Select {...register("idType")} error={errors.idType?.message}>
                {idTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                ID number{" "}
                {shouldShowAsterisk(watchedValues.idNumber) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                {...register("idNumber")}
                error={errors.idNumber?.message}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label
              htmlFor={frontId}
              className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background)/50 transition hover:bg-(--background) hover:border-(--brand)/50"
            >
              {idFrontUrl ? (
                <img
                  src={idFrontUrl}
                  alt="ID front preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta)">
                    +
                  </span>
                  <span className="text-xs text-(--paragraph)">
                    Upload ID front
                  </span>
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
                <span className="absolute bottom-2 left-2 text-[10px] text-red-400">
                  {String(errors.idFrontId.message)}
                </span>
              ) : null}
            </label>

            <label
              htmlFor={backId}
              className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background)/50 transition hover:bg-(--background) hover:border-(--brand)/50 ${
                idType === "PASSPORT" ? "opacity-60 pointer-events-none" : ""
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
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta)">
                    +
                  </span>
                  <span className="text-xs text-(--paragraph)">
                    Upload ID back
                  </span>
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
                <span className="absolute bottom-2 left-2 text-[10px] text-red-400">
                  {String(errors.idBackId.message)}
                </span>
              ) : null}
            </label>

            <label
              htmlFor={holdId}
              className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background)/50 transition hover:bg-(--background) hover:border-(--brand)/50"
            >
              {idHoldUrl ? (
                <img
                  src={idHoldUrl}
                  alt="Holding ID preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) bg-(--basic-cta)">
                    +
                  </span>
                  <span className="text-xs text-(--paragraph)">
                    Upload holding ID
                  </span>
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
                <span className="absolute bottom-2 left-2 text-[10px] text-red-400">
                  {String(errors.idHoldId.message)}
                </span>
              ) : null}
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Date of birth{" "}
                {shouldShowAsterisk(watchedValues.birthday) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                type="date"
                error={errors.birthday?.message}
                value={toDateInputValue(watch("birthday") ?? "")}
                onChange={(e) =>
                  setValue("birthday", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Issuing date{" "}
                {shouldShowAsterisk(watchedValues.startTime) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                type="date"
                error={errors.startTime?.message}
                value={toDateInputValue(watch("startTime") ?? "")}
                onChange={(e) =>
                  setValue("startTime", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-(--paragraph)">
                Expiry date{" "}
                {shouldShowAsterisk(watchedValues.endTime) ? (
                  <span className="text-red-500">
                    <sup>*required</sup>
                  </span>
                ) : null}
              </label>
              <Input
                type="date"
                error={errors.endTime?.message}
                value={toDateInputValue(watch("endTime") ?? "")}
                onChange={(e) =>
                  setValue("endTime", e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        disabled={pageLoading || submitLoading}
        className="w-full"
      >
        {submitLoading ? "Submitting..." : "Submit KYC Application"}
      </Button>
      {/* <span className="text-xs text-red-500">* Input Field is required</span> */}
    </form>
  );
}
