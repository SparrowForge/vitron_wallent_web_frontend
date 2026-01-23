import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: keyof T;
  label: string;
  className?: string;
};

type DataTableProps<T> = {
  title?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: ReactNode;
  onRowClick?: (row: T) => void;
};

export default function DataTable<T extends Record<string, any>>({
  title,
  columns,
  data,
  emptyMessage = "No records yet.",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <section className="max-w-[90vw] overflow-hidden rounded-2xl border border-(--stroke) bg-(--basic-cta)/50 shadow-sm backdrop-blur-xl transition-all hover:bg-(--basic-cta)/80">
      {title ? (
        <div className="border-b border-(--stroke) px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-(--foreground)">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-(--background)/50 text-(--paragraph)">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`border-b border-(--stroke) px-4 py-3 font-medium uppercase tracking-wider text-[11px] sm:px-6 ${column.className ?? ""
                    }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--stroke)">
            {data.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-sm text-(--paragraph) sm:px-6"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={`row-${index}`}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors hover:bg-(--stroke)/10 ${onRowClick ? "cursor-pointer active:bg-(--stroke)/20" : ""
                    }`}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-4 text-(--foreground) sm:px-6 ${column.className ?? ""
                        }`}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
