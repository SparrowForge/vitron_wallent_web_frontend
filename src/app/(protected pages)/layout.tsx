import AuthGuard from "@/features/auth/components/AuthGuard";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import Spinner from "@/shared/components/ui/Spinner";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </Suspense>
  );
}
