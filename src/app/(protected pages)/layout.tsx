import AuthGuard from "@/features/auth/components/AuthGuard";
import DashboardShell from "@/features/dashboard/components/DashboardShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
