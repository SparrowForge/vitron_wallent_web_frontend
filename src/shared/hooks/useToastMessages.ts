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
  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (warningMessage) {
      toast.warning(warningMessage);
    }
  }, [warningMessage]);

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
    }
  }, [successMessage]);

  useEffect(() => {
    if (infoMessage) {
      toast.success(infoMessage);
    }
  }, [infoMessage]);
}
