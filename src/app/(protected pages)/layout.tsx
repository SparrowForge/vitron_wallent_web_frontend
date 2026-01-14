import DashboardShell from "@/features/dashboard/components/DashboardShell";
import AuthGuard from "@/features/auth/components/AuthGuard";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <AuthGuard />
      {children}
    </DashboardShell>
  );
}
