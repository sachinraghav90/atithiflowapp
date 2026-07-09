import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { type StatusColorType, getStatusColor } from "@/constants/statusColors";
import { cn } from "@/lib/utils";
import { formatReadableLabel } from "@/utils/formatString";

type GridBadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const GRID_BADGE_TONES: Record<GridBadgeTone, string> = {
  neutral: "border-slate-300/80 bg-slate-100/90 text-slate-700",
  info: "border-primary/20 bg-primary/10 text-primary",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  warning: "border-amber-500/20 bg-amber-500/12 text-amber-700",
  danger: "border-red-500/20 bg-red-500/10 text-red-700",
  accent: "border-violet-500/20 bg-violet-500/10 text-violet-700",
};

type GridBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  status?: string | null;
  statusType?: StatusColorType;
  tone?: GridBadgeTone;
  uppercase?: boolean;
};

function GridBadge({
  className,
  children,
  status,
  statusType,
  tone = "neutral",
  uppercase = false,
  ...props
}: GridBadgeProps) {
  const colorClass = status && statusType ? getStatusColor(status, statusType) : GRID_BADGE_TONES[tone];
  const badgeContent = typeof children === "string" ? formatReadableLabel(children) : children;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md border px-2.5 py-0 text-[11px] font-semibold leading-none shadow-sm",
        uppercase ? "uppercase tracking-[0.08em]" : "tracking-normal",
        colorClass,
        className,
      )}
      {...props}
    >
      {badgeContent}
    </Badge>
  );
}

export { GridBadge };
