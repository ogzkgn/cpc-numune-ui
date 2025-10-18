import type { ReactNode } from "react";
import { clsx } from "clsx";

export interface TableColumn<T> {
  id: string;
  header: ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  emptyState?: ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  selectableRows?: boolean;
  selectedRowIds?: Set<number | string>;
  onRowSelectChange?: (row: T, selected: boolean) => void;
}

const Table = <T,>({
  columns,
  data,
  keyExtractor,
  emptyState,
  loading,
  onRowClick,
  rowClassName,
  selectableRows,
  selectedRowIds,
  onRowSelectChange
}: TableProps<T>) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {selectableRows ? <th className="w-12 px-4 py-3"></th> : null}
            {columns.map((column) => (
              <th
                key={column.id}
                style={column.width ? { width: column.width } : undefined}
                className={clsx(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center"
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectableRows ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                Yükleniyor...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectableRows ? 1 : 0)} className="px-4 py-10 text-center text-slate-500">
                {emptyState ?? "Kayıt bulunamadı"}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = keyExtractor ? keyExtractor(row, index) : index;
              const selected = selectableRows && selectedRowIds?.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    "transition hover:bg-slate-50",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row),
                    selected && "bg-brand-primary/5"
                  )}
                >
                  {selectableRows ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => onRowSelectChange?.(row, event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/50"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx("px-4 py-3", column.className, {
                        "text-right": column.align === "right",
                        "text-center": column.align === "center"
                      })}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;