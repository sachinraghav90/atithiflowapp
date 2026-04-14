import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import atithiflowLogo from "@/assets/atithiflow-logo.png";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Platform & Solutions", path: "/platform" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (path: string) => {
    if (path === "/") {
      // Always refresh for home page
      window.location.href = "/";
    } else {
      // Scroll to top for other pages
      window.scrollTo(0, 0);
    }
  };

  const handleLogoClick = () => {
    window.location.href = "/";
  };

  const isRibbonVisible = useScrollVisibility(24);
  const isLoginPage = location.pathname === "/login";

  return (
    <header
      className="sticky z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border transition-[top] duration-200 motion-reduce:transition-none"
      style={{ top: isRibbonVisible && !isLoginPage ? "40px" : "0px", background: "white" }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a onClick={handleLogoClick} className="flex items-center cursor-pointer">
            <img src={atithiflowLogo} alt="AtithiFlow" className="h-10 w-auto" />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-foreground"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          {!isLoginPage ? (
            <div className="hidden md:flex items-center">
              <Link to="/contact" onClick={() => handleNavClick("/contact")}>
                <Button variant="hero" size="default">
                  Request Demo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center w-[120px]" />
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-primary px-2 py-1 ${isActive(item.path) ? "text-primary" : "text-foreground"
                    }`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavClick(item.path);
                  }}
                >
                  {item.name}
                </Link>
              ))}
              {!isLoginPage && (
                <Link
                  to="/contact"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavClick("/contact");
                  }}
                >
                  <Button variant="hero" size="default" className="w-full mt-2">
                    Request Demo
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
