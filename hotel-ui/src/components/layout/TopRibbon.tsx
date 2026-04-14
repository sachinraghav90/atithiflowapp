import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Linkedin, Facebook, Instagram, Phone, Mail } from "lucide-react";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";
import { cn } from "@/lib/utils";

// X (Twitter) icon - not available in lucide-react, using custom SVG
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const TopRibbon = () => {
  const isVisible = useScrollVisibility(24);

  return (
    <>
      {/* Fixed ribbon */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] bg-[hsl(0,0%,100%)] border-b border-border transition-all duration-200 ease-out",
          "motion-reduce:transition-none ",
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        )}
        // style={{background: "white"}}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10">
            {/* Left side - Social Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="https://www.linkedin.com/company/atithiflow/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on LinkedIn"
                className="text-foreground hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <Linkedin className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <a
                href="https://facebook.com/atithiflow"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Facebook"
                className="text-foreground hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <Facebook className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <a
                href="https://instagram.com/atithiflow"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className="text-foreground hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
              </a>
              <a
                href="https://x.com/atithiflow"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on X"
                className="text-foreground hover:text-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <XIcon className="h-4 w-4" />
              </a>
            </div>

            {/* Right side - Contact info + CTA */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 ml-auto">
              {/* Phone */}
              <a
                href="tel:+918562882887"
                className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                aria-label="Call us"
              >
                <Phone className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden md:inline relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100">+91 85628 82887</span>
              </a>

              {/* Email */}
              <a
                href="mailto:support@atithiflow.com"
                className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                aria-label="Email us"
              >
                <Mail className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden md:inline relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100">support@atithiflow.com</span>
              </a>

              {/* CTA Button */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 px-3 text-xs font-medium border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
              >
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer to prevent content jump */}
      <div 
        className={cn(
          "transition-all duration-200 motion-reduce:transition-none bg-white",
          isVisible ? "h-10" : "h-0"
        )}
      />
    </>
  );
};

export default TopRibbon;
