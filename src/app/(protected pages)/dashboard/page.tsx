import DataTable, { type DataTableColumn } from "@/components/DataTable";

type TransactionRow = {
  name: string;
  amount: string;
  status: string;
};

const columns: DataTableColumn<TransactionRow>[] = [
  { key: "name", label: "Merchant" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status", className: "text-right" },
];

const rows: TransactionRow[] = [
  { name: "Coinbase", amount: "$1,280.00", status: "Completed" },
  { name: "Ramp", amount: "$540.20", status: "Pending" },
  { name: "Uniswap", amount: "$2,130.75", status: "Completed" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Wallet Snapshot
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Track balances and monitor activity.
        </h1>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          { label: "Total Balance", value: "$24,920.40" },
          { label: "Monthly Flow", value: "+$3,120.55" },
          { label: "Active Cards", value: "4" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-(--stroke) bg-(--basic-cta) p-6"
          >
            <p className="text-sm text-(--paragraph)">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-(--foreground)">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <DataTable title="Latest transactions" columns={columns} data={rows} />
    </div>
  );
}
