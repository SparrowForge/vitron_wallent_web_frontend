"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Card = {
  id: string;
  brand: string;
  last4: string;
  status: string;
};

type CardState = {
  data: Card[];
  isLoading: boolean;
  error: string | null;
};

export function useCards() {
  const [state, setState] = useState<CardState>({
    data: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    apiGet<Card[]>("/api/cards")
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
