import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ValidationTooltipProps {
  isValid: boolean;
  message?: string;
  children: React.ReactNode;
}

export function ValidationTooltip({
  isValid,
  message = "Required field",
  children
}: ValidationTooltipProps) {
  if (isValid) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="w-full">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-white text-black border-border shadow-md px-3 py-1.5 text-xs font-medium z-50">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
