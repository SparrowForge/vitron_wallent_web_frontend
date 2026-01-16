"use client";

import { errorMessageMap, ignoreMessages } from "@/errorMap";
import { useEffect } from "react";
import { toast } from "react-toastify";

type ToastMessagesOptions = {
  errorMessage?: string | null;
  infoMessage?: string | null;
  successMessage?: string | null;
  warningMessage?: string | null;
};

export function useToastMessages({
  errorMessage,
  infoMessage,
  successMessage,
  warningMessage,
}: ToastMessagesOptions) {
  const sanitizeMessage = (message: string) => message.replace("[api] ", "");

  const resolveErrorMessage = (message: string) => {
    const sanitized = sanitizeMessage(message).trim();
    const key = sanitized.toLowerCase();
    return errorMessageMap[key] ?? sanitized;
  };

  useEffect(() => {
    if (errorMessage?.startsWith("[api] ")) {
      const toastId = "toast-error";
      const message = resolveErrorMessage(errorMessage);
      console.log(
        "Resolved error message:",
        message,
        ignoreMessages,
        errorMessage,
        ignoreMessages.some((key) => errorMessage.includes(key))
      );
      if (!ignoreMessages.some((key) => errorMessage.includes(key))) {
        if (toast.isActive(toastId)) {
          toast.update(toastId, {
            render: message,
            type: "error",
            autoClose: 5000,
          });
        } else {
          toast.error(message, { toastId });
        }
      }
    }
  }, [errorMessage]);

  useEffect(() => {
    if (warningMessage) {
      const toastId = "toast-warning";
      if (toast.isActive(toastId)) {
        toast.update(toastId, {
          render: warningMessage,
          type: "warning",
          autoClose: 5000,
        });
      } else {
        toast.warning(warningMessage, { toastId });
      }
    }
  }, [warningMessage]);

  useEffect(() => {
    if (successMessage) {
      const toastId = "toast-success";
      if (toast.isActive(toastId)) {
        toast.update(toastId, {
          render: successMessage,
          type: "success",
          autoClose: 5000,
        });
      } else {
        toast.success(successMessage, { toastId });
      }
    }
  }, [successMessage]);

  useEffect(() => {
    if (infoMessage) {
      const toastId = "toast-info";
      if (toast.isActive(toastId)) {
        toast.update(toastId, {
          render: infoMessage,
          type: "info",
          autoClose: 5000,
        });
      } else {
        toast.info(infoMessage, { toastId });
      }
    }
  }, [infoMessage]);
}
