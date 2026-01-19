"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { withdrawSchema } from "@/lib/validationSchemas";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import LoadingOverlay from "@/shared/components/ui/LoadingOverlay";
import ModalShell from "@/shared/components/ui/ModalShell";
import PasswordInput from "@/shared/components/ui/PasswordInput";
import { useToastMessages } from "@/shared/hooks/useToastMessages";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type WithdrawModalProps = {
  open: boolean;
  walletName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type WithdrawConfigResponse = {
  code?: number | string;
  msg?: string;
  data?: {
    amount?: string | number;
    minWithdraw?: string | number;
    ratio?: string | number;
  };
};

type WithdrawApplyResponse = {
  code?: number | string;
  msg?: string;
};

type VerifyCodeResponse = {
  code?: number | string;
  msg?: string;
};

const withdrawFormSchema = withdrawSchema
  .extend({
    verifyType: z.enum(["email", "google"]),
    verifyCode: z.string().trim().optional(),
    googleCode: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.verifyType === "email" && !data.verifyCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email code is required.",
        path: ["verifyCode"],
      });
    }
    if (data.verifyType === "google" && !data.googleCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Google code is required.",
        path: ["googleCode"],
      });
    }
  });

type WithdrawFormValues = z.infer<typeof withdrawFormSchema>;

export default function WithdrawModal({
  open,
  walletName,
  onClose,
  onSuccess,
}: WithdrawModalProps) {
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] =
    useState<WithdrawConfigResponse["data"]>(undefined);
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      network: "",
      address: "",
      amount: 0,
      payPassword: "",
      verifyType: "email",
      verifyCode: "",
      googleCode: "",
    },
  });

  useToastMessages({ errorMessage, infoMessage });

  const verifyType = watch("verifyType");
  const amountInput = watch("amount");
  const networkValue = watch("network");
  const addressValue = watch("address");
  const payPasswordValue = watch("payPassword");
  const verifyCodeValue = watch("verifyCode");
  const googleCodeValue = watch("googleCode");

  const availableAmount = Number(config?.amount ?? 0);
  const minWithdraw = Number(config?.minWithdraw ?? 0);
  const ratio = Number(config?.ratio ?? 0);
  const amountValue = Number(amountInput || 0);

  const safeAvailable = Number.isFinite(availableAmount) ? availableAmount : 0;
  const safeMinWithdraw = Number.isFinite(minWithdraw) ? minWithdraw : 0;
  const safeRatio = Number.isFinite(ratio) ? ratio : 0;
  const safeAmount = Number.isFinite(amountValue) ? amountValue : 0;

  const feeValue = safeAmount * (safeRatio / 100);
  const estimateValue = safeAmount - feeValue;

  const canSubmit = useMemo(() => {
    if (!networkValue || !addressValue || !payPasswordValue) return false;
    if (!amountInput || safeAmount <= 0) return false;
    if (safeAmount < safeMinWithdraw || safeAmount > safeAvailable)
      return false;
    if (verifyType === "email" && !verifyCodeValue) return false;
    if (verifyType === "google" && !googleCodeValue) return false;
    return true;
  }, [
    networkValue,
    addressValue,
    payPasswordValue,
    amountInput,
    safeAmount,
    safeMinWithdraw,
    safeAvailable,
    verifyType,
    verifyCodeValue,
    googleCodeValue,
  ]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return;

    const loadConfig = async () => {
      setLoading(true);
      setErrorMessage("");
      setInfoMessage("");
      try {
        const response = await apiRequest<WithdrawConfigResponse>({
          path: API_ENDPOINTS.withdrawConfig,
          method: "GET",
        });

        if (!response.data) {
          setErrorMessage(response.msg || "Unable to load withdraw config.");
          return;
        }

        setConfig(response.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load withdraw config.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, [open]);

  // ✅ Put this AFTER hooks
  if (!open) return null;

  const handleMax = () => {
    if (!availableAmount) return;
    setValue("amount", availableAmount, { shouldValidate: true });
  };

  const resetForm = () => {
    reset({
      network: "",
      address: "",
      amount: 0,
      payPassword: "",
      verifyType: "email",
      verifyCode: "",
      googleCode: "",
    });
    setErrorMessage("");
    setInfoMessage("");
    setCooldown(0);
  };

  const onSubmit = async (values: WithdrawFormValues) => {
    setErrorMessage("");
    setInfoMessage("");
    if (safeAmount < safeMinWithdraw) {
      setError("amount", {
        type: "validate",
        message: `Minimum ${safeMinWithdraw.toFixed(2)} USD`,
      });
      return;
    }
    if (safeAmount > safeAvailable) {
      setError("amount", {
        type: "validate",
        message: "Amount exceeds available balance.",
      });
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        addressChain: values.network,
        amount: String(values.amount),
        address: values.address,
        payPassword: values.payPassword,
      };
      if (values.verifyType === "email") {
        payload.code = values.verifyCode ?? "";
      } else {
        payload.googleCode = values.googleCode ?? "";
      }

      await apiRequest<WithdrawApplyResponse>({
        path: API_ENDPOINTS.withdrawApply,
        method: "POST",
        body: JSON.stringify(payload),
      });

      setInfoMessage("Withdrawal submitted successfully.");
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Withdraw request failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setErrorMessage("");
    setInfoMessage("");
    if (cooldown > 0) {
      return;
    }
    setLoading(true);
    try {
      await apiRequest<VerifyCodeResponse>({
        path: `${API_ENDPOINTS.sendVerifyCode}?type=withdraw`,
        method: "GET",
      });
      setCooldown(60);
      setInfoMessage("Code sent to your email.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Withdrawal"
      className="max-w-md relative overflow-hidden"
    >
      <LoadingOverlay loading={loading} />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          Back
        </Button>
        <div className="text-sm font-semibold text-(--foreground)">
          Withdrawal
        </div>
        <span className="text-xs text-(--paragraph)">{walletName}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Currency
          <div className="rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
            USDT
          </div>
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Network{" "}
          {!networkValue && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <div className="flex items-center justify-between rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
            <select
              {...register("network")}
              className="w-full text-sm bg-(--background) text-(--foreground) focus:outline-none"
            >
              <option value="">Please choose</option>
              <option value="USDT-ERC20">USDT-ERC20</option>
              <option value="USDT-TRC20">USDT-TRC20</option>
            </select>
            <span className="text-(--placeholder)">▾</span>
          </div>
          {errors.network ? (
            <p className="text-[11px] text-red-500">{errors.network.message}</p>
          ) : null}
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Payment address{" "}
          {!addressValue && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <Input
            placeholder="Please input"
            {...register("address")}
            error={errors.address?.message}
          />
        </label>

        <label className="space-y-2 text-xs font-medium text-(--paragraph)">
          Withdrawal amount{" "}
          {!amountValue && (
            <span className="text-red-500">
              <sup>*required</sup>
            </span>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={`Minimum ${safeMinWithdraw || 0}`}
              {...register("amount")}
              error={errors.amount?.message}
            />
            <span className="text-sm text-(--double-foreground)">USD</span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleMax}
              className="text-(--brand)"
            >
              Max
            </Button>
          </div>
          <div className="text-xs text-(--paragraph)">
            Available: {safeAvailable.toFixed(2)} USD
          </div>
        </label>

        <div className="mt-6 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-xs text-(--paragraph)">
          <div className="flex items-center justify-between">
            <span>Fee</span>
            <span className="text-(--double-foreground)">
              {feeValue.toFixed(2)} USD
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Received amount</span>
            <span className="text-(--double-foreground)">
              {estimateValue.toFixed(2)} USDT
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Payment password{" "}
            {!payPasswordValue && (
              <span className="text-red-500">
                <sup>*required</sup>
              </span>
            )}
            <Controller
              control={control}
              name="payPassword"
              render={({ field }) => (
                <PasswordInput
                  className="h-12"
                  inputClassName="h-12 w-full rounded-2xl border border-(--stroke) bg-(--background) px-4 text-sm text-(--foreground) placeholder:text-(--placeholder)"
                  placeholder="Enter payment password"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.payPassword ? (
              <p className="text-[11px] text-red-500">
                {errors.payPassword.message}
              </p>
            ) : null}
          </label>

          <label className="space-y-2 text-xs font-medium text-(--paragraph)">
            Verification method
            <div className="flex items-center gap-3 rounded-2xl border border-(--stroke) bg-(--background) px-4 py-3 text-sm text-(--double-foreground)">
              <label className="flex items-center gap-2">
                <input type="radio" value="email" {...register("verifyType")} />
                Email
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="google"
                  {...register("verifyType")}
                />
                Google
              </label>
            </div>
          </label>

          {verifyType === "email" ? (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Email code{" "}
              {!verifyCodeValue && (
                <span className="text-red-500">
                  <sup>*required</sup>
                </span>
              )}
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Enter code"
                  {...register("verifyCode")}
                  error={errors.verifyCode?.message}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  className="min-w-[120px]"
                  disabled={cooldown > 0 || loading}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Send code"}
                </Button>
              </div>
            </label>
          ) : (
            <label className="space-y-2 text-xs font-medium text-(--paragraph)">
              Google code{" "}
              {!googleCodeValue && (
                <span className="text-red-500">
                  <sup>*required</sup>
                </span>
              )}
              <Input
                placeholder="Enter Google code"
                {...register("googleCode")}
                error={errors.googleCode?.message}
              />
            </label>
          )}
        </div>
        <Button
          type="submit"
          className="w-full mt-4"
          disabled={!canSubmit || loading}
        >
          Withdrawal
        </Button>
        <span className="text-xs text-red-500">* Input Field is required</span>
      </form>
      {null}
    </ModalShell>
  );
}
