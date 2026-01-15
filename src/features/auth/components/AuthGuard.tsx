"use client";

import { apiRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import Spinner from "@/shared/components/ui/Spinner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("vtron_access_token") ?? "";
};

const getRefreshToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("vtron_refresh_token") ?? "";
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      if (!token && !refreshToken) {
        if (typeof window !== "undefined") {
          const search = searchParams.toString();
          const returnTo = search ? `${pathname}?${search}` : pathname;
          sessionStorage.setItem("vtron_return_to", returnTo);
        }
        router.replace("/");
        if (active) {
          setIsChecking(false);
          setIsAuthed(false);
        }
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
        if (!response.data) {
          // clearAuthTokens();
          if (typeof window !== "undefined") {
            const search = searchParams.toString();
            const returnTo = search ? `${pathname}?${search}` : pathname;
            sessionStorage.setItem("vtron_return_to", returnTo);
          }
          router.replace("/");
          if (active) {
            setIsChecking(false);
            setIsAuthed(false);
          }
          return;
        }
        if (active) {
          setIsAuthed(true);
          setIsChecking(false);
        }
      } catch (err) {
        // clearAuthTokens();
        if (typeof window !== "undefined") {
          const search = searchParams.toString();
          const returnTo = search ? `${pathname}?${search}` : pathname;
          sessionStorage.setItem("vtron_return_to", returnTo);
        }
        router.replace("/");
        if (active) {
          setIsChecking(false);
          setIsAuthed(false);
        }
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, [router, pathname, searchParams]);

  if (isChecking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-(--paragraph)">
        <span className="inline-flex items-center gap-2">
          <Spinner size={16} />
        </span>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}
