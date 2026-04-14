import { useState } from "react";
import { Link } from "react-router-dom";
import { Linkedin, Facebook, Instagram, Phone, Mail, ArrowUp } from "lucide-react";
import atithiflowLogo from "@/assets/atithiflow-logo.png";
import CalendlyModal from "@/components/CalendlyModal";

// X (Twitter) icon - consistent with TopRibbon
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

// Reusable animated link class for center-out underline
const animatedLinkClass = "relative inline-block text-muted-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100";

const Footer = () => {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  };

  return (
    <>
      <footer className="bg-white border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <Link to="/" className="flex items-center mb-4">
                <img src={atithiflowLogo} alt="AtithiFlow" className="h-10 w-auto" />
              </Link>
              <p className="text-muted-foreground text-sm max-w-md">
                The unified hotel operations platform that helps you deliver exceptional guest experiences while streamlining your operations.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Navigation</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className={`text-sm ${animatedLinkClass}`}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/platform" className={`text-sm ${animatedLinkClass}`}>
                    Platform & Solutions
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className={`text-sm ${animatedLinkClass}`}>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy-policy" className={`text-sm ${animatedLinkClass}`}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className={`text-sm ${animatedLinkClass}`}>
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Get in touch */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Get in touch</h4>
              <ul className="space-y-1.5">
                <li>
                  <a 
                    href="tel:+918562882887" 
                    className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm group"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                    <span className="relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:group-hover:after:scale-x-100">+91 85628 82887</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:support@atithiflow.com" 
                    className="text-sm flex items-center gap-2 text-muted-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm group"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                    <span className="relative inline-block after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:group-hover:after:scale-x-100">support@atithiflow.com</span>
                  </a>
                </li>
              </ul>

              {/* Social icons */}
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://www.linkedin.com/company/atithiflow/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on LinkedIn"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Linkedin className="h-4 w-4" strokeWidth={1.5} />
                </a>
                <a
                  href="https://facebook.com/atithiflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Facebook className="h-4 w-4" strokeWidth={1.5} />
                </a>
                <a
                  href="https://instagram.com/atithiflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Instagram className="h-4 w-4" strokeWidth={1.5} />
                </a>
                <a
                  href="https://x.com/atithiflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on X"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <XIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                © {new Date().getFullYear()} AtithiFlow by{" "}
                <a
                  href="https://systechnosoft.in/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="About Systechnosoft (opens in new tab)"
                  className={animatedLinkClass}
                >
                  Systechnosoft
                </a>
                . All rights reserved.
              </p>
              <button
                onClick={scrollToTop}
                className={`text-sm flex items-center gap-1 ${animatedLinkClass}`}
                aria-label="Back to top"
              >
                <span>Back to top</span>
                <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Calendly Modal */}
      <CalendlyModal open={isCalendlyOpen} onOpenChange={setIsCalendlyOpen} />
    </>
  );
};

export default Footer;
