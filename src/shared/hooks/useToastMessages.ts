"use client";

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
  const sanitizeMessage = (message: string) =>
    message.replace("[api] ", "");

  useEffect(() => {
    if (errorMessage?.startsWith("[api] ")) {
      const toastId = "toast-error";
      const message = sanitizeMessage(errorMessage);
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
