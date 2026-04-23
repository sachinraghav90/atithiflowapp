import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"

/* ------------------------------------------------------------------ */
/*  Base Primitives                                                    */
/* ------------------------------------------------------------------ */

const DataGrid = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  )
)
DataGrid.displayName = "DataGrid"

const DataGridHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children)
    const shouldWrapInRow = childArray.length > 0 && childArray.every((child) => {
      return React.isValidElement(child) && child.type !== "tr"
    })

    return (
      <thead ref={ref} className={cn("bg-primary text-primary-foreground font-semibold border-b border-border", className)} {...props}>
        {shouldWrapInRow ? <tr>{children}</tr> : children}
      </thead>
    )
  }
)
DataGridHeader.displayName = "DataGridHeader"

const DataGridRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-colors",
        "even:bg-green-100/50 odd:bg-background", // Green for even rows, white/background for odd
        "hover:none", // White background on hover
        className
      )}
      {...props}
    />
  )
)
DataGridRow.displayName = "DataGridRow"

const DataGridHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("px-3 py-3 border-r border-border last:border-r-0 font-semibold whitespace-nowrap text-left", className)}
      {...props}
    />
  )
)
DataGridHead.displayName = "DataGridHead"

const DataGridCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-2 py-3 border-r border-border last:border-r-0 align-middle", className)}
      {...props}
    />
  )
)
DataGridCell.displayName = "DataGridCell"

/* ------------------------------------------------------------------ */
/*  Types — Column definitions & pagination                            */
/* ------------------------------------------------------------------ */

export type ColumnDef<T = Record<string, unknown>> = {
    /** Column header label */
    label: string
    /** Property key on the row object (used when `render` is not provided) */
    key?: string
    /** Optional className applied to both <DataGridHead> and <DataGridCell> */
    className?: string
    /** Optional className applied only to <DataGridHead> */
    headClassName?: string
    /** Optional className applied only to <DataGridCell> */
    cellClassName?: string
    /** Custom cell renderer — receives the row and its index */
    render?: (row: T, index: number) => React.ReactNode
}

export type PaginationProps = {
    page: number
    totalPages: number
    setPage: (fn: ((p: number) => number) | number) => void
    totalRecords?: number
    limit?: number
    onLimitChange?: (limit: number) => void
    /** Additional disabled flag (e.g. while fetching) */
    disabled?: boolean
}

export type AppDataGridProps<T = Record<string, unknown>> = {
    /** Column definitions */
    columns: ColumnDef<T>[]
    /** Array of data rows */
    data: T[]
    /** Unique key extractor — defaults to `row.id` */
    rowKey?: (row: T, index: number) => React.Key
    /** Show a loading placeholder */
    loading?: boolean
    /** Text to show when data is empty */
    emptyText?: string
    /** Optional action column renderer */
    actions?: (row: T, index: number) => React.ReactNode
    /** Action column header label (defaults to "Action") */
    actionLabel?: string
    /** Render action column at the beginning of the table instead of the end */
    prefixActions?: boolean
    /** Action column header/cell className */
    actionClassName?: string;
    /** Optional flag to show/hide the actions column */
    showActions?: boolean;
    /** Enable pagination */
    enablePagination?: boolean
    /** Pagination props */
    paginationProps?: PaginationProps
    /** Minimum table width for horizontal scroll */
    minWidth?: string
    /** Extra className on the outermost wrapper */
    className?: string
    /** Extra className on the DataGrid (table) */
    tableClassName?: string
    /** Row click handler */
    onRowClick?: (row: T, index: number) => void
    /** Extra props to spread on each DataGridRow */
    rowProps?: (row: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>
}

/* ------------------------------------------------------------------ */
/*  DataGridPagination                                                 */
/*  Matches the OrderManagement Pagination pattern:                    */
/*  ‹‹  Page [input] of N  ››  |  X records                          */
/* ------------------------------------------------------------------ */

function DataGridPagination({
    page,
    totalPages,
    setPage,
    totalRecords,
    limit = 10,
    onLimitChange,
    disabled = false,
}: PaginationProps) {
    const [inputValue, setInputValue] = useState(String(page))
    const menuRef = useRef<HTMLDivElement>(null)
    const [rowsMenuOpen, setRowsMenuOpen] = useState(false)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setRowsMenuOpen(false)
            }
        }
        if (rowsMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [rowsMenuOpen])

    useEffect(() => {
        setInputValue(String(page))
    }, [page])

    useEffect(() => {
        setRowsMenuOpen(false)
    }, [limit])

    const handleInputBlur = () => {
        const parsed = parseInt(inputValue)
        if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
            setPage(parsed)
        } else {
            setInputValue(String(page))
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleInputBlur()
    }

    const handleLimitSelect = (value: string) => {
        setRowsMenuOpen(false)
        onLimitChange?.(Number(value))
    }

    return (
        <div className="flex items-center justify-end gap-2 px-3 py-2 text-xs text-foreground bg-[#E1F3F8]">
            {onLimitChange && (
                <div className="relative flex items-center" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setRowsMenuOpen((open) => !open)}
                        disabled={disabled}
                        className="flex items-center gap-1.5 h-7 rounded-[3px] border border-[#5EB5C9]/50 bg-background px-2.5 text-[11px] font-bold text-foreground shadow-sm hover:bg-muted/50 transition-colors disabled:cursor-not-allowed"
                        aria-label="Change rows per page"
                    >
                        <span className="text-foreground/70 uppercase tracking-tight">Rows:</span>
                        <span>{limit}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3.5 h-3.5 text-foreground/50 ml-0.5"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {rowsMenuOpen && (
                        <div className="absolute bottom-9 left-0 z-20 w-[160px] rounded-none border border-border bg-background shadow-lg animate-in slide-in-from-bottom-1 duration-200">
                            <div className="grid grid-cols-4 items-center">
                                {[10, 25, 50, 100].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleLimitSelect(String(value))}
                                        className={cn(
                                            "h-7 w-full rounded-none text-[10px] font-bold transition-all border-r border-border/40 last:border-r-0",
                                            limit === value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background text-foreground hover:bg-muted"
                                        )}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-4 w-px bg-foreground/20 ml-1.5 mr-0.5" />
                </div>
            )}

            {/* Prev */}
            <Button
                size="sm"
                variant="outline"
                className="h-7 w-8 rounded-[3px] text-xs bg-background text-foreground border-border hover:bg-muted transition-colors shadow-sm font-bold"
                disabled={page === 1 || disabled}
                onClick={() => setPage((p: number) => p - 1)}
            >
                {"<<"}
            </Button>

            {/* Page X of Y */}
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-tight text-foreground/70 mr-1">Page</span>
                <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleKeyDown}
                    className="w-11 h-7 text-center border-[#5EB5C9]/50 rounded-[3px] text-xs font-bold bg-background text-foreground shadow-inner p-0 focus-visible:ring-1 focus-visible:ring-primary"
                />
                <span className="text-[11px] font-bold uppercase tracking-tight text-foreground/70 ml-1">of {totalPages}</span>
            </div>

            {/* Next */}
            <Button
                size="sm"
                variant="outline"
                className="h-7 w-8 rounded-[3px] text-xs bg-background text-foreground border-border hover:bg-muted transition-colors shadow-sm font-bold"
                disabled={page >= totalPages || disabled}
                onClick={() => setPage((p: number) => p + 1)}
            >
                {">>"}
            </Button>

            {/* Divider + Record count */}
            {typeof totalRecords === "number" && (
                <>
                    <div className="h-4 w-px bg-foreground/20 ml-1 mr-1" />
                    <span className="inline-flex items-center h-7 px-3 rounded-[3px] border border-[#5EB5C9]/50 bg-background text-[11px] font-bold text-[#2A9AB7] shadow-sm">
                         Total {totalRecords}
                    </span>
                </>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  AppDataGrid                                                        */
/*  Follows the OrderManagement reference layout:                      */
/*  grid-header-inside-table → overflow-x/y-auto → min-width → DataGrid */
/* ------------------------------------------------------------------ */

function AppDataGrid<T extends Record<string, unknown>>({
    columns,
    data,
    rowKey,
    loading = false,
    emptyText = "No data found",
    actions,
    actionLabel = "",
    prefixActions = true,
    actionClassName,
    enablePagination = false,
    paginationProps,
    minWidth = "800px",
    className,
    tableClassName,
    onRowClick,
    rowProps,
    showActions = true,
}: AppDataGridProps<T>) {
    const hasActions = Boolean(actions && showActions)
    const totalCols = columns.length + (hasActions ? 1 : 0)

    return (
        <div
            className={cn(
                "grid-header-inside-table border rounded-[5px] overflow-hidden mt-0 flex flex-col flex-1 min-h-0 bg-background",
                className
            )}
        >
            {/* Scrollable area — matches OrderManagement pattern */}
            <div className="overflow-x-auto overflow-y-auto scrollbar-hide w-full flex-1 min-h-0 bg-background">
                <div className="w-full" style={{ minWidth }}>
                    <DataGrid className={tableClassName}>
                        {/* ---- HEAD ---- */}
                        <DataGridHeader>
                            <tr>
                                {hasActions && prefixActions && (
                                    <DataGridHead className={cn(actionClassName)}>
                                        {actionLabel}
                                    </DataGridHead>
                                )}
                                {columns.map((col, i) => (
                                    <DataGridHead
                                        key={col.key ?? `col-${i}`}
                                        className={cn(col.className, col.headClassName)}
                                    >
                                        {col.label}
                                    </DataGridHead>
                                ))}
                                {hasActions && !prefixActions && (
                                    <DataGridHead className={cn(actionClassName)}>
                                        {actionLabel}
                                    </DataGridHead>
                                )}
                            </tr>
                        </DataGridHeader>

                        {/* ---- BODY ---- */}
                        <tbody>
                            {/* Loading state (Skeletons) */}
                            {loading && (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <DataGridRow key={`skeleton-${i}`} className="animate-pulse">
                                        {Array.from({ length: totalCols }).map((__, j) => (
                                            <DataGridCell key={`sk-cell-${j}`} className="py-4">
                                                <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                                            </DataGridCell>
                                        ))}
                                    </DataGridRow>
                                ))
                            )}

                            {/* Empty state */}
                            {!loading && data.length === 0 && (
                                <DataGridRow>
                                    <DataGridCell
                                        colSpan={totalCols}
                                        className="text-center text-muted-foreground py-6"
                                    >
                                        {emptyText}
                                    </DataGridCell>
                                </DataGridRow>
                            )}

                            {/* Data rows */}
                            {!loading &&
                                data.map((row, idx) => {
                                    const key = rowKey
                                        ? rowKey(row, idx)
                                        : (row as Record<string, unknown>).id as React.Key ?? idx
                                    const extraProps = rowProps?.(row, idx) ?? {}

                                    return (
                                        <DataGridRow
                                            key={key}
                                            onClick={
                                                onRowClick
                                                    ? () => onRowClick(row, idx)
                                                    : undefined
                                            }
                                            className={cn(
                                                onRowClick && "cursor-pointer",
                                                extraProps.className
                                            )}
                                            {...extraProps}
                                        >
                                            {hasActions && prefixActions && (
                                                <DataGridCell className={cn(actionClassName)}>
                                                    {actions(row, idx)}
                                                </DataGridCell>
                                            )}
                                            {columns.map((col, ci) => (
                                                <DataGridCell
                                                    key={col.key ?? `cell-${ci}`}
                                                    className={cn(
                                                        col.className,
                                                        col.cellClassName
                                                    )}
                                                >
                                                    {col.render
                                                        ? col.render(row, idx)
                                                        : col.key
                                                            ? String(row[col.key] ?? "—")
                                                            : "—"}
                                                </DataGridCell>
                                            ))}
                                            {hasActions && !prefixActions && (
                                                <DataGridCell
                                                    className={cn(actionClassName)}
                                                >
                                                    {actions(row, idx)}
                                                </DataGridCell>
                                            )}
                                        </DataGridRow>
                                    )
                                })}
                        </tbody>
                    </DataGrid>
                </div>
            </div>

            {/* Pagination — sits below scroll area, inside the border */}
            {enablePagination && paginationProps && (
                <DataGridPagination {...paginationProps} />
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export {
    DataGrid,
    DataGridHeader,
    DataGridRow,
    DataGridHead,
    DataGridCell,
    DataGridPagination,
    AppDataGrid,
}
