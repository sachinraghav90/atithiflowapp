import { useId, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";

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
  placeholder: string;
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
        "w-full border-b border-border",
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
        "grid items-center gap-3 p-2 w-full",
        // Desktop grid alignment: 4 equal columns + 1 auto column for icons
        "grid-cols-1 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]",
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
  placeholder,
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
        className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full"
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
    <div className={cn("flex items-center h-8 gap-2 justify-end", className)}>
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
