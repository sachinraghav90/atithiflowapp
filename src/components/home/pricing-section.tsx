import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const pricingPoints = [
  "Tailored to your property size and needs",
  "Pay for the modules you use",
  "No hidden fees or surprise add-ons",
  "Flexible scaling as you grow",
];

const PricingSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-card rounded-[5px] border border-border p-8 md:p-12 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Simple, predictable pricing
              </h2>
              <p className="mt-4 text-muted-foreground">
                We believe in transparent pricing that scales with your business. No surprises, just value.
              </p>
              <ul className="mt-6 space-y-3">
                {pricingPoints.map((point, index) => (
                  <li 
                    key={index} 
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/30 group-hover:scale-110 transition-all duration-200">
                      <Check className="h-3 w-3 text-secondary" />
                    </div>
                    <span className="text-foreground group-hover:text-primary transition-colors duration-200">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center md:text-right">
              <div className="inline-block bg-primary/10 rounded-[5px] p-8 hover:bg-primary/15 hover:scale-[1.02] transition-all duration-300">
                <p className="text-muted-foreground mb-2">Starting from</p>
                <p className="text-4xl font-bold text-foreground">Custom</p>
                <p className="text-muted-foreground mt-2">per property/month</p>
                <Link to="/contact" className="block mt-6">
                  <Button variant="hero" size="lg" className="w-full">
                    Contact us for pricing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
