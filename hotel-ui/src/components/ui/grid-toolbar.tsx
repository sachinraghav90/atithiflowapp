import { useId, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import DatePicker from "react-datepicker";

/* ================= TYPES ================= */

type ToolbarOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

type GridToolbarProps = {
  children: ReactNode;
  className?: string;
};

type GridToolbarRowProps = {
  children: ReactNode;
  className?: string;
};

type GridToolbarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
};

type GridToolbarSelectProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: ToolbarOption[];
  className?: string;
};

type GridToolbarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  buttonClassName?: string;
};

type GridToolbarActionsProps = {
  actions: GridToolbarAction[];
  className?: string;
};

/* ================= ROOT ================= */

export function GridToolbar({ children, className }: GridToolbarProps) {
  return (
    <div
      className={cn(
        "w-full border-b border-border pt-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ================= ROW (GRID BASED) ================= */

export function GridToolbarRow({ children, className }: GridToolbarRowProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-2 px-2 pb-1.5 pt-0 w-full",
        // Standard 4-Column Symmetry: 3 equal fluid columns + 1 compact action column
        "grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ================= SEARCH ================= */

export function GridToolbarSearch({
  value,
  onChange,
  onSearch,
  placeholder = "search here...",
  className,
}: GridToolbarSearchProps) {
  return (
    <div className={cn("flex items-center h-8 w-full", className)}>
      <div className="flex items-center w-full">
        {/* INPUT */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4  h-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch?.();
              }
            }}
            placeholder={placeholder}
            className="pl-9 h-8 text-sm rounded-lg border border-border bg-background shadow-sm w-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border"
          />
        </div>

        {/* BUTTON */}
        <Button
          onClick={onSearch}
          className="h-8 px-3 text-xs ml-0.5 rounded-lg border border-primary text-primary bg-transparent hover:bg-primary/10 font-medium whitespace-nowrap"
        >
          SEARCH
        </Button>
      </div>
    </div>
  );
}

/* ================= SELECT ================= */

export function GridToolbarSelect({
  label,
  value,
  onChange,
  options,
  className,
}: GridToolbarSelectProps) {
  const generatedId = useId();
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, "-");
  const selectId = `${normalizedLabel}-${generatedId}`;

  return (
    <div
      className={cn(
        "flex items-center h-8 border border-border bg-background rounded-lg text-sm overflow-hidden shadow-sm",
        className
      )}
    >
      {/* LABEL */}
      <label
        htmlFor={selectId}
        className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[80px] justify-center"
      >
        {label}
      </label>

      {/* SELECT */}
      <NativeSelect
        id={selectId}
        name={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent px-2 text-sm h-full truncate cursor-pointer focus:outline-none"
      >
        {options.map((option) => (
          <option
            key={`${label}-${option.value}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/* ================= ACTIONS ================= */

export function GridToolbarActions({
  actions,
  className,
}: GridToolbarActionsProps) {
  return (
    <div className={cn("flex items-center h-8 gap-1 justify-end", className)}>
      {actions.map((action) => (
        <Tooltip key={action.key}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg hover:bg-muted/50 transition-colors bg-background shadow-sm",
                action.buttonClassName
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/* ================= DATE PICKER ================= */

type GridToolbarDatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
};

export function GridToolbarDatePicker({
  label,
  value,
  onChange,
  className,
  placeholder = "dd-mm-yyyy",
  minDate,
  disabled
}: GridToolbarDatePickerProps) {
  return (
    <div
      className={cn(
        "flex items-center h-8 border border-border bg-background rounded-lg text-sm overflow-hidden shadow-sm w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[80px] justify-center">
        {label}
      </span>
      <DatePicker
        selected={value}
        onChange={onChange}
        placeholderText={placeholder}
        dateFormat="dd-MM-yyyy"
        minDate={minDate}
        disabled={disabled}
        customInput={
          <Input
            readOnly
            className="h-full border-0 rounded-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0 w-full cursor-pointer"
          />
        }
      />
    </div>
  );
}

/* ================= SPACER ================= */

type GridToolbarSpacerProps = {
  type?: "fluid" | "actions";
  className?: string;
};

export function GridToolbarSpacer({ type = "fluid", className }: GridToolbarSpacerProps) {
  return (
    <div 
      className={cn(
        type === "fluid" ? "w-full" : "w-[104px]", 
        className
      )} 
    />
  );
}

