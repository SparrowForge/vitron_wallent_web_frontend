"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { cardHolderSchema } from "@/lib/validationSchemas";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

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
  if (typeof window === "undefined") {
    return "";
  }
  const token = localStorage.getItem("vtron_access_token") ?? "";
  const tokenType = localStorage.getItem("vtron_token_type") ?? "";
  if (!token) {
    return "";
  }
  return `${tokenType}${token}`;
};

const toDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  return value.includes(" ") ? value : `${value} 00:00:00`;
};

const toDateInputValue = (value: string) => {
  if (!value) {
    return "";
  }
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  if (value.includes(" ")) {
    return value.split(" ")[0];
  }
  return value;
};

const resolveId = (item?: Country) =>
  String(item?.id ?? item?.ID ?? "");

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
  if (!status) {
    return "Not submitted";
  }
  if (status === "PENDING") {
    return "In review";
  }
  if (status === "ACTIVE") {
    return "Approved";
  }
  if (status === "INACTIVE") {
    return "Rejected";
  }
  return status;
};

export default function CardHolderForm({
  cardBin,
  holderStatus,
}: CardHolderFormProps) {
  const router = useRouter();
  const frontId = useId();
  const backId = useId();
  const holdId = useId();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useToastMessages({ errorMessage, successMessage });
  const [countries, setCountries] = useState<Country[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [phoneCodes, setPhoneCodes] = useState<Country[]>([]);
  const [isEdit, setIsEdit] = useState(false);

  const [form, setForm] = useState({
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
  });
  const [uploading, setUploading] = useState({
    idFrontId: false,
    idBackId: false,
    idHoldId: false,
  });

  const idTypeOptions = useMemo(
    () => getIdTypeOptions(form.countryId),
    [form.countryId]
  );

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [countryResponse, occupationResponse, phoneResponse] =
          await Promise.all([
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

        if (!mounted) {
          return;
        }

        if (Number(countryResponse.code) === 200) {
          setCountries(countryResponse.data ?? []);
        }
        if (Number(occupationResponse.code) === 200) {
          setOccupations(occupationResponse.data ?? []);
        }
        if (Number(phoneResponse.code) === 200) {
          setPhoneCodes(phoneResponse.data ?? []);
        }

        if (holderStatus === "INACTIVE") {
          const detail = await apiRequest<HolderDetailResponse>({
            path: API_ENDPOINTS.cardHolderDetail,
            method: "POST",
            body: JSON.stringify({ bin: cardBin }),
          });
          if (Number(detail.code) === 200 && detail.data) {
            const data = detail.data as Record<string, string>;
            if (!mounted) {
              return;
            }
            setIsEdit(true);
            setForm((prev) => ({
              ...prev,
              ...data,
              id: String(data.id ?? ""),
              countryId: String(data.country?.id ?? data.countryId ?? ""),
              city: String(data.city ?? ""),
              occupation: String(data.occupationValue ?? data.occupation ?? ""),
              areaCode: String(data.areaCode ?? ""),
            }));
          }
        } else {
          const detail = await apiRequest<KycDetailResponse>({
            path: API_ENDPOINTS.kycDetail,
            method: "POST",
            body: JSON.stringify({}),
          });
          if (Number(detail.code) === 200 && detail.data?.kyc) {
            const kyc = detail.data.kyc as Record<string, string>;
            if (!mounted) {
              return;
            }
            setForm((prev) => ({
              ...prev,
              ...kyc,
              countryId: String(detail.data?.country?.id ?? kyc.countryId ?? ""),
              city: String(detail.data?.city ?? kyc.city ?? ""),
              occupation: String(kyc.occupationValue ?? kyc.occupation ?? ""),
              areaCode: String(kyc.areaCode ?? prev.areaCode),
            }));
          }
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load holder data."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (cardBin) {
      loadData();
    }
    return () => {
      mounted = false;
    };
  }, [cardBin, holderStatus]);

  const handleUpload = async (file: File, target: string) => {
    setLoading(true);
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
      setForm((prev) => ({
        ...prev,
        [target]: String(payload.data?.id ?? ""),
        [`${target.replace("Id", "Url")}`]: payload.data?.fileUrl ?? "",
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setUploading((prev) => ({ ...prev, [target]: false }));
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const validation = cardHolderSchema.safeParse(form);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message ?? "Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        cardBin,
        birthday: toDateTime(form.birthday),
        startTime: toDateTime(form.startTime),
        endTime: toDateTime(form.endTime),
        idBackId: form.idType === "PASSPORT" ? form.idFrontId : form.idBackId,
      };
      const response = await apiRequest<{ code?: number | string; msg?: string }>(
        {
          path: isEdit ? API_ENDPOINTS.cardHolderEdit : API_ENDPOINTS.cardHolderAdd,
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
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
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6">
      <div className="rounded-xl border border-(--stroke) bg-(--background) px-4 py-2 text-sm text-(--paragraph)">
        Holder status: {getHolderStatusLabel(holderStatus)}
      </div>
      {null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Last name
          </label>
          <input
            value={form.lastName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, lastName: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            First name
          </label>
          <input
            value={form.firstName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, firstName: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Gender
          </label>
          <select
            value={form.gender}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, gender: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            <option value="">Please choose</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Occupation
          </label>
          <select
            value={form.occupation}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, occupation: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            <option value="">Please choose</option>
            {occupations.map((occupation) => (
              <option key={occupation.value} value={occupation.value}>
                {occupation.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Annual salary
          </label>
          <input
            value={form.annualSalary}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, annualSalary: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Account purpose
          </label>
          <input
            value={form.accountPurpose}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, accountPurpose: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Monthly volume
          </label>
          <input
            value={form.expectedMonthlyVolume}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                expectedMonthlyVolume: event.target.value,
              }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Country / Region
          </label>
          <select
            value={form.countryId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                countryId: event.target.value,
                idType: "PASSPORT",
              }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            <option value="">Please choose</option>
            {countries.map((country) => (
              <option key={resolveId(country)} value={resolveId(country)}>
                {resolveCountryLabel(country)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            State / Province
          </label>
          <input
            value={form.state}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, state: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            City
          </label>
          <input
            value={form.city}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, city: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Address
          </label>
          <input
            value={form.address}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, address: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Post code
          </label>
          <input
            value={form.postCode}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, postCode: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-(--paragraph)">
              Code
            </label>
            <select
              value={form.areaCode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, areaCode: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            >
              <option value="">Code</option>
              {phoneCodes.map((code) => (
                <option key={resolveId(code)} value={code.code ?? ""}>
                  +{code.code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-(--paragraph)">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            ID type
          </label>
          <select
            value={form.idType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, idType: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          >
            {idTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            ID number
          </label>
          <input
            value={form.idNumber}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, idNumber: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label
          htmlFor={frontId}
          className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph)"
        >
          {form.idFrontUrl ? (
            <img
              src={form.idFrontUrl}
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
          {form.idFrontUrl ? (
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file, "idFrontId");
              }
            }}
          />
        </label>
        <label
          htmlFor={backId}
          className={`relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph) ${
            form.idType === "PASSPORT" ? "opacity-60" : ""
          }`}
        >
          {form.idBackUrl && form.idType !== "PASSPORT" ? (
            <img
              src={form.idBackUrl}
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
          {form.idType !== "PASSPORT" && form.idBackUrl ? (
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
            disabled={form.idType === "PASSPORT"}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file, "idBackId");
              }
            }}
          />
        </label>
        <label
          htmlFor={holdId}
          className="relative flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-(--stroke) bg-(--background) text-xs text-(--paragraph)"
        >
          {form.idHoldUrl ? (
            <img
              src={form.idHoldUrl}
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
          {form.idHoldUrl ? (
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file, "idHoldId");
              }
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Date of birth
          </label>
          <input
            type="date"
            value={toDateInputValue(form.birthday)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, birthday: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Issuing date
          </label>
          <input
            type="date"
            value={toDateInputValue(form.startTime)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, startTime: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-(--paragraph)">
            Expiry date
          </label>
          <input
            type="date"
            value={toDateInputValue(form.endTime)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, endTime: event.target.value }))
            }
            className="h-11 w-full rounded-xl border border-(--stroke) bg-(--background) px-3 text-sm text-(--foreground)"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleSubmit()}
        className={`h-11 w-full rounded-xl text-sm font-semibold ${
          loading
            ? "bg-(--stroke) text-(--placeholder)"
            : "bg-(--brand) text-(--background)"
        }`}
      >
        {isEdit ? "Update holder" : "Submit holder"}
      </button>
    </form>
  );
}
