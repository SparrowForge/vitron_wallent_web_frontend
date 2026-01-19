"use client";

import { apiRequest, refreshToken } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import { clearAuthTokens } from "@/lib/auth";
import Spinner from "@/shared/components/ui/Spinner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      // Skip verification on public routes
      const publicPaths = ["/", "/auth", "/contact", "/notice"];
      const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith("/auth/"));

      if (isPublic) {
        setIsChecking(false);
        setIsAuthed(false);
        // We set isAuthed false here because AuthGuard implies "Guard".
        // If it's public, we don't block, but we also don't assert "Authed".
        // Actually, if AuthGuard wraps public pages, it should just render children.
        // But typically AuthGuard blocks unauthenticated access.
        // If we are on public page, we shouldn't block.
        return;
      }

      // Middleware handles initial protection.
      // We double check logic here via API if needed, or just let it pass.
      // For now, we perform the check to ensure token validity beyond just cookie existence.
      const fetchMerchantInfo = async () =>
        apiRequest<{
          code?: number | string;
          data?: unknown;
        }>({
          path: API_ENDPOINTS.merchantInfo,
          method: "POST",
          body: JSON.stringify({}),
        });

      const handleAuthFailure = async () => {
        await clearAuthTokens();
        router.replace("/");
        if (active) {
          setIsChecking(false);
          setIsAuthed(false);
        }
      };

      try {
        const response = await fetchMerchantInfo();
        if (!response.data) {
          const refreshed = await refreshToken();
          if (refreshed) {
            const retryResponse = await fetchMerchantInfo();
            if (retryResponse.data) {
              if (active) {
                setIsAuthed(true);
                setIsChecking(false);
              }
              return;
            }
          }
          await handleAuthFailure();
          return;
        }
        if (active) {
          setIsAuthed(true);
          setIsChecking(false);
        }
      } catch (err) {
        const refreshed = await refreshToken();
        if (refreshed) {
          try {
            const retryResponse = await fetchMerchantInfo();
            if (retryResponse.data) {
              if (active) {
                setIsAuthed(true);
                setIsChecking(false);
              }
              return;
            }
          } catch {
            // Fall through to failure handling.
          }
        }
        await handleAuthFailure();
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-(--paragraph)">
        <span className="inline-flex items-center gap-2">
          <Spinner size={16} />
        </span>
      </div>
    );
  }

  const publicPaths = ["/", "/auth", "/contact", "/notice"];
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith("/auth/"));

  if (!isAuthed && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
