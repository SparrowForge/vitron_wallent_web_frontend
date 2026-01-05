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
  emptyMessage?: string;
};

export default function DataTable<T extends Record<string, ReactNode>>({
  title,
  columns,
  data,
  emptyMessage = "No records yet.",
}: DataTableProps<T>) {
  return (
    <section className="rounded-2xl border border-(--stroke) bg-(--basic-cta) shadow-sm">
      {title ? (
        <div className="border-b border-(--stroke) px-6 py-4">
          <h2 className="text-base font-semibold text-(--foreground)">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--basic-cta) text-(--paragraph)">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 font-medium ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-10 text-center text-sm text-(--paragraph)"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={`row-${index}`}
                  className="border-t border-(--stroke)"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-6 py-4 ${column.className ?? ""}`}
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
