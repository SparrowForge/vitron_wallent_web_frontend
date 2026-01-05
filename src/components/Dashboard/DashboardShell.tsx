import Header from "@/components/Navigation/Header";
import Sidebar from "@/components/Navigation/Sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-(--background) text-(--foreground)">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-(--basic-cta) m-2 rounded-2xl">
        <Header />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
