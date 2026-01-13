"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("vtron_access_token") ?? "";
};

export default function AuthGuard() {
  const router = useRouter();
  useEffect(() => {
    const verify = async () => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/");
        return;
      }
      try {
        const response = await apiRequest<{
          code?: number | string;
          data?: unknown;
        }>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });
        if (Number(response.code) !== 200 || !response.data) {
          router.replace("/");
          return;
        }
      } catch (err) {
        router.replace("/");
      }
    };

    void verify();
  }, [router]);

  return null;
}
