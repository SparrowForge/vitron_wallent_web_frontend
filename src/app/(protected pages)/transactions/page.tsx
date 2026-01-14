import DataTable, { type DataTableColumn } from "@/shared/components/DataTable";

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

export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--paragraph)">
          Transactions
        </p>
        <h1 className="text-3xl font-semibold text-(--foreground)">
          Review your latest activity.
        </h1>
      </header>

      <DataTable title="Recent transactions" columns={columns} data={rows} />
    </div>
  );
}
