import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendlyModal = ({ open, onOpenChange }: CalendlyModalProps) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        />
        
        {/* Modal Content - truly centered */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[101] bg-background shadow-lg border border-border",
            "focus:outline-none",
            // Centering
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            // Mobile: full screen
            "w-[100vw] h-[100dvh] rounded-none",
            // Desktop: near-fullscreen with margins
            "sm:w-[min(1100px,94vw)] sm:h-[90vh] sm:rounded-lg",
            // Layout: flex column, no gaps
            "flex flex-col overflow-hidden",
            // Animation
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "motion-reduce:animate-none"
          )}
          aria-describedby={undefined}
        >
          {/* Compact Header - exactly 56px */}
          <div className="h-14 min-h-[56px] max-h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border shrink-0 bg-background">
            <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
              Schedule a 30-minute call
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          
          {/* Calendly Embed - fills remaining space */}
          <div className="flex-1 w-full min-h-0 overflow-hidden">
            <iframe
              src="https://calendly.com/systechnosoft-info/30min?hide_gdpr_banner=1"
              width="100%"
              height="100%"
              frameBorder="0"
              title="Schedule a 30-minute call"
              className="border-0 block"
              style={{ minHeight: '100%' }}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default CalendlyModal;
