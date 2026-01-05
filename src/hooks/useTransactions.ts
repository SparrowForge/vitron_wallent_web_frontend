"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Transaction = {
  id: string;
  merchant: string;
  amount: string;
  status: string;
};

type TransactionState = {
  data: Transaction[];
  isLoading: boolean;
  error: string | null;
};

export function useTransactions() {
  const [state, setState] = useState<TransactionState>({
    data: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    apiGet<Transaction[]>("/api/transactions")
      .then((data) => {
        if (isMounted) {
          setState({ data, isLoading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (isMounted) {
          setState({ data: [], isLoading: false, error: error.message });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
