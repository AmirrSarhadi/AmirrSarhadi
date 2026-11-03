import { createElement, useMemo, useState } from "react";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";

// Compatibility with the existing table markup while using the React 19 engine.
export function useTable({ columns, data }) {
  const [sorting, setSorting] = useState([]);
  const definitions = useMemo(() => columns.map((column, index) => ({
    id: column.id || (typeof column.accessor === "string" ? column.accessor : String(index)),
    accessorKey: typeof column.accessor === "string" ? column.accessor : undefined,
    accessorFn: typeof column.accessor === "function" ? column.accessor : undefined,
    enableSorting: !column.disableSortBy && Boolean(column.accessor),
    meta: column,
  })), [columns]);
  const table = useReactTable({ data, columns: definitions, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  const rows = table.getRowModel().rows.map((row) => ({
    original: row.original, index: row.index,
    getRowProps: () => ({ key: row.id }),
    cells: row.getVisibleCells().map((cell) => ({
      getCellProps: () => ({ key: cell.id }),
      render: () => {
        const renderer = cell.column.columnDef.meta.Cell;
        return renderer ? createElement(renderer, { row, value: cell.getValue(), cell, column: cell.column }) : (cell.getValue() ?? "");
      },
    })),
  }));
  return {
    getTableProps: () => ({}), getTableBodyProps: () => ({}), prepareRow: () => {}, rows,
    headerGroups: table.getHeaderGroups().map((group) => ({
      getHeaderGroupProps: () => ({ key: group.id }),
      headers: group.headers.map((header) => ({
        getHeaderProps: (props = {}) => ({ key: header.id, ...props }),
        getSortByToggleProps: () => header.column.getCanSort() ? ({
          onClick: header.column.getToggleSortingHandler(), tabIndex: 0,
          onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); header.column.toggleSorting(); } },
          "aria-sort": header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none",
        }) : {},
        isSorted: Boolean(header.column.getIsSorted()), isSortedDesc: header.column.getIsSorted() === "desc",
        render: () => header.column.columnDef.meta.Header,
      })),
    })),
  };
}

export const useSortBy = undefined;
