import DashboardShell from "@/components/Dashboard/DashboardShell";
import AuthGuard from "@/components/Auth/AuthGuard";

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
