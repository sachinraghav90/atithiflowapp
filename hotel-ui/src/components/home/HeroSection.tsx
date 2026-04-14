import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-white py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Elevate Guest Experiences
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Unified operations for happier guests and smoother stays. One platform to manage reservations, front office, housekeeping, dining, and more.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/contact">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/platform">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  Explore Platform
                </Button>
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative rounded-[5px] overflow-hidden shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Modern hotel lobby with elegant interior design"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
            </div>
            {/* Floating Dashboard Card */}
            <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-[3px] shadow-lg border border-border hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <span className="text-secondary font-bold text-lg">98%</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Guest Satisfaction</p>
                  <p className="text-xs text-muted-foreground">↑ 12% this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-accent/30 to-transparent" />
    </section>
  );
};

export default HeroSection;
