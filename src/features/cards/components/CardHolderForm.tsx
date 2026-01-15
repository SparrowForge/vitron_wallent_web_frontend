"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cardHolderSchema } from "@/lib/validationSchemas";
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

type HolderDetailResponse = {
  code?: number | string;
  msg?: string;
  data?: Record<string, unknown>;
};

type KycDetailResponse = {
  code?: number | string;
  msg?: string;
  data?: { kyc?: Record<string, unknown>; country?: Country; city?: string };
};

type ListResponse<T> = {
  code?: number | string;
  msg?: string;
  data?: T[];
};

type CardHolderFormProps = {
  cardBin: string;
  holderStatus?: string;
};

const getAuthHeader = () => {
  if (typeof window === "undefined") return "";
  const token = localStorage.getItem("vtron_access_token") ?? "";
  const tokenType = localStorage.getItem("vtron_token_type") ?? "";
  if (!token) return "";
  const trimmed = tokenType.trim();
  return trimmed ? `${trimmed}${token}` : token;
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

const getHolderStatusLabel = (status?: string) => {
  if (!status) return "Not submitted";
  if (status === "PENDING") return "In review";
  if (status === "ACTIVE") return "Approved";
  if (status === "INACTIVE") return "Rejected";
  return status;
};

// Infer RHF type from your Zod schema
type CardHolderFormValues = z.infer<typeof cardHolderSchema>;

export default function CardHolderForm({
  cardBin,
  holderStatus,
}: CardHolderFormProps) {
  const router = useRouter();
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
  const [isEdit, setIsEdit] = useState(false);

  const [uploading, setUploading] = useState({
    idFrontId: false,
    idBackId: false,
    idHoldId: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CardHolderFormValues>({
    resolver: zodResolver(cardHolderSchema),
    defaultValues: {
      id: "",
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
      idType: "PASSPORT",
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

    const loadData = async () => {
      setPageLoading(true);
      setErrorMessage("");

      try {
        // 1) Load dropdown lists (never block each other)
        const [countryRes, occupationRes, phoneRes] = await Promise.allSettled([
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
        ]);

        if (!mounted) return;

        if (
          countryRes.status === "fulfilled" &&
          Number(countryRes.value.code) === 200
        ) {
          setCountries(countryRes.value.data ?? []);
        }
        if (
          occupationRes.status === "fulfilled" &&
          Number(occupationRes.value.code) === 200
        ) {
          setOccupations(occupationRes.value.data ?? []);
        }
        if (
          phoneRes.status === "fulfilled" &&
          Number(phoneRes.value.code) === 200
        ) {
          setPhoneCodes(phoneRes.value.data ?? []);
        }

        // Optional: show a soft error if any dropdown API failed
        const listFailed =
          countryRes.status === "rejected" ||
          occupationRes.status === "rejected" ||
          phoneRes.status === "rejected";

        if (listFailed) {
          setErrorMessage("Some dropdown data couldn't be loaded.");
        }

        // 2) Load detail (this can fail without killing the dropdowns)
        if (holderStatus === "INACTIVE") {
          const detail = await apiRequest<HolderDetailResponse>({
            path: API_ENDPOINTS.cardHolderDetail,
            method: "POST",
            body: JSON.stringify({ bin: cardBin }),
          });

          if (!mounted) return;

          if (Number(detail.code) === 200 && detail.data) {
            const data = detail.data as any;
            setIsEdit(true);

            reset((prev) => ({
              ...prev,
              ...data,
              id: String(data.id ?? ""),
              countryId: String(data.country?.id ?? data.countryId ?? ""),
              city: String(data.city ?? ""),
              occupation: String(data.occupationValue ?? data.occupation ?? ""),
              areaCode: String(data.areaCode ?? ""),
              birthday: toDateInputValue(String(data.birthday ?? "")),
              startTime: toDateInputValue(String(data.startTime ?? "")),
              endTime: toDateInputValue(String(data.endTime ?? "")),
            }));
          }
        } else {
          const detail = await apiRequest<KycDetailResponse>({
            path: API_ENDPOINTS.kycDetail,
            method: "POST",
            body: JSON.stringify({}),
          });

          if (!mounted) return;

          if (Number(detail.code) === 200 && detail.data?.kyc) {
            const kyc = detail.data.kyc as Record<string, any>;

            reset((prev) => ({
              ...prev,
              ...kyc,
              countryId: String(
                detail.data?.country?.id ?? kyc.countryId ?? ""
              ),
              city: String(detail.data?.city ?? kyc.city ?? ""),
              occupation: String(kyc.occupationValue ?? kyc.occupation ?? ""),
              areaCode: String(kyc.areaCode ?? prev.areaCode ?? ""),
              birthday: toDateInputValue(String(kyc.birthday ?? "")),
              startTime: toDateInputValue(String(kyc.startTime ?? "")),
              endTime: toDateInputValue(String(kyc.endTime ?? "")),
            }));
          }
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load holder data."
        );
      } finally {
        if (mounted) setPageLoading(false);
      }
    };

    if (cardBin) void loadData();

    return () => {
      mounted = false;
    };
  }, [cardBin, holderStatus, reset]);

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
        headers: {
          Authorization: getAuthHeader(),
        },
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse;
      if (Number(payload.code) !== 200 || !payload.data) {
        throw new Error(payload.msg || "Upload failed.");
      }

      // set file id + url into RHF
      const newId = String(payload.data.id ?? "");
      const newUrl = payload.data.fileUrl ?? "";

      setValue(target, newId, { shouldValidate: true, shouldDirty: true });
      // idFrontId -> idFrontUrl, etc
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

  const onSubmit = async (values: CardHolderFormValues) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitLoading(true);

    try {
      const payload = {
        ...values,
        cardBin,
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
        path: isEdit
          ? API_ENDPOINTS.cardHolderEdit
          : API_ENDPOINTS.cardHolderAdd,
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (Number(response.code) !== 200) {
        throw new Error(response.msg || "Holder submit failed.");
      }

      setSuccessMessage(
        isEdit
          ? "Holder info updated. Awaiting review."
          : "Holder info submitted. Awaiting review."
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("vtron_refresh_card_bins", "1");
      }

      setTimeout(() => {
        router.push("/cards");
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Holder submit failed."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-xl border border-(--stroke) bg-(--background) px-4 py-2 text-sm text-(--paragraph)">
        Holder status: {getHolderStatusLabel(holderStatus)}
        {pageLoading ? (
          <span className="ml-2 text-xs">(loading...)</span>
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
          {errors.lastName?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.lastName.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            First name
          </label>
          <input
            {...register("firstName")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.firstName?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.firstName.message)}
            </p>
          ) : null}
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
          {errors.gender?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.gender.message)}
            </p>
          ) : null}
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
          {errors.occupation?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.occupation.message)}
            </p>
          ) : null}
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
          {errors.annualSalary?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.annualSalary.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Account purpose
          </label>
          <input
            {...register("accountPurpose")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.accountPurpose?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.accountPurpose.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Monthly volume
          </label>
          <input
            {...register("expectedMonthlyVolume")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.expectedMonthlyVolume?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.expectedMonthlyVolume.message)}
            </p>
          ) : null}
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
              const nextOptions = getIdTypeOptions(value);
              const nextHasMatch = nextOptions.some(
                (option) => option.value === idType
              );
              if (!nextHasMatch) {
                setValue("idType", nextOptions[0]?.value ?? "PASSPORT", {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
            }}
          >
            <option value="">Please choose</option>
            {countries.map((c) => (
              <option key={resolveId(c)} value={resolveId(c)}>
                {resolveCountryLabel(c)}
              </option>
            ))}
          </select>
          {errors.countryId?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.countryId.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            State / Province
          </label>
          <input
            {...register("state")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.state?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.state.message)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">City</label>
          <input
            {...register("city")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.city?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.city.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Address
          </label>
          <input
            {...register("address")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.address?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.address.message)}
            </p>
          ) : null}
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
          {errors.postCode?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.postCode.message)}
            </p>
          ) : null}
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
            {errors.areaCode?.message ? (
              <p className="text-xs text-red-500">
                {String(errors.areaCode.message)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--paragraph)">
              Phone
            </label>
            <input
              {...register("phone")}
              className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            />
            {errors.phone?.message ? (
              <p className="text-xs text-red-500">
                {String(errors.phone.message)}
              </p>
            ) : null}
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
            {idTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.idType?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.idType.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            ID number
          </label>
          <input
            {...register("idNumber")}
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
          {errors.idNumber?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.idNumber.message)}
            </p>
          ) : null}
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
          {errors.birthday?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.birthday.message)}
            </p>
          ) : null}
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
          {errors.startTime?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.startTime.message)}
            </p>
          ) : null}
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
          {errors.endTime?.message ? (
            <p className="text-xs text-red-500">
              {String(errors.endTime.message)}
            </p>
          ) : null}
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
        {submitLoading
          ? "Submitting..."
          : isEdit
          ? "Update holder"
          : "Submit holder"}
      </button>
    </form>
  );
}
