"use client";

import { Badge } from "@ssms/components/ui/badge";
import { DataTableColumnHeader } from "@ssms/components/ui/data-table/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

export type MutatedSubCategory = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export const useSubCategoriesColumns = (data: MutatedSubCategory[] | undefined) => {
  const [subCategoriesColumns, setSubCategoriesColumns] = useState<ColumnDef<MutatedSubCategory>[]>([]);

  useEffect(() => {
    const cols: ColumnDef<MutatedSubCategory>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sub Category" />,
        cell: ({ row }) => <div>{row.original.name}</div>,
        enableHiding: false,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => <div>{row.original.category}</div>,
        enableHiding: false,
      },
      {
        accessorKey: "description",
        accessorFn: (row) => (
          <>{!row.description ? <Badge variant="outline">None</Badge> : row.description}</>
        ),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
        cell: ({ row }) => <div>{row.getValue("description")}</div>,
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: "createdAt",
        accessorFn: (row) => <>{format(row.createdAt, "EEEE, MMMM d, yyyy")}</>,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date Created" />,
        cell: ({ row }) => <div>{row.getValue("createdAt")}</div>,
        enableHiding: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: "updatedAt",
        accessorFn: (row) => (
          <>{row.updatedAt ? formatDistanceToNow(row.updatedAt, { addSuffix: true }) : ""}</>
        ),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last Update" />,
        cell: ({ row }) => <div>{row.getValue("updatedAt")}</div>,
        sortingFn: "datetime",
        enableSorting: true,
        enableHiding: false,
        enableColumnFilter: false,
      },
    ];

    setSubCategoriesColumns(cols);
  }, [data]);

  return subCategoriesColumns;
};
