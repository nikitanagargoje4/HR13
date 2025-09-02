import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  globalFilter?: boolean;
  employees?: any[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Search...",
  globalFilter = false,
  employees = []
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilterValue, setGlobalFilterValue] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilterValue,
    onPaginationChange: setPagination,
    globalFilterFn: (row, columnId, value) => {
      if (!value) return true;
      
      const search = value.toLowerCase();
      const rowData = row.original as any;
      
      // Custom search function that searches across multiple fields
      const firstName = rowData?.firstName?.toLowerCase() || '';
      const lastName = rowData?.lastName?.toLowerCase() || '';
      const email = rowData?.email?.toLowerCase() || '';
      const username = rowData?.username?.toLowerCase() || '';
      const position = rowData?.position?.toLowerCase() || '';
      const type = rowData?.type?.toLowerCase() || '';
      const reason = rowData?.reason?.toLowerCase() || '';
      const status = rowData?.status?.toLowerCase() || '';
      
      // For leave requests, also search by rendered employee name
      let employeeName = '';
      if (rowData?.userId && employees?.length > 0) {
        const employee = employees.find((emp: any) => emp.id === rowData.userId);
        if (employee) {
          employeeName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        }
      }
      
      // For reports data with nested user object
      let userFirstName = '';
      let userLastName = '';
      let userEmail = '';
      let userPosition = '';
      if (rowData?.user) {
        userFirstName = rowData.user.firstName?.toLowerCase() || '';
        userLastName = rowData.user.lastName?.toLowerCase() || '';
        userEmail = rowData.user.email?.toLowerCase() || '';
        userPosition = rowData.user.position?.toLowerCase() || '';
      }
      
      return firstName.includes(search) || 
             lastName.includes(search) || 
             email.includes(search) || 
             username.includes(search) ||
             position.includes(search) ||
             type.includes(search) ||
             reason.includes(search) ||
             status.includes(search) ||
             employeeName.includes(search) ||
             userFirstName.includes(search) ||
             userLastName.includes(search) ||
             userEmail.includes(search) ||
             userPosition.includes(search) ||
             `${firstName} ${lastName}`.includes(search) ||
             `${userFirstName} ${userLastName}`.includes(search);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter: globalFilterValue,
      pagination,
    },
  });

  return (
    <div>
      {/* Table search and filters */}
      {(searchColumn || globalFilter) && (
        <div className="flex items-center py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ? table.getState().globalFilter ?? "" : (table.getColumn(searchColumn!)?.getFilterValue() as string) ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (globalFilter) {
                  table.setGlobalFilter(value);
                } else {
                  table.getColumn(searchColumn!)?.setFilterValue(value);
                }
              }}
              className="max-w-sm pl-8"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-slate-700">
            Rows per page:
          </p>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(parseInt(value));
            }}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder={pagination.pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-slate-700">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
