import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import CalendlyModal from "@/components/CalendlyModal";

const FinalCTASection = () => {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);

  return (
    <section className="py-20 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ready to transform your hotel operations?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See AtithiFlow in action with a tailored demo for your property. No commitment, just a conversation about how we can help.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact#hero">
              <Button variant="hero" size="xl">
                Book a Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="heroOutline" 
              size="xl"
              onClick={() => setIsCalendlyOpen(true)}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Talk to our team
            </Button>
          </div>
        </div>
      </div>

      <CalendlyModal open={isCalendlyOpen} onOpenChange={setIsCalendlyOpen} />
    </section>
  );
};

export default FinalCTASection;
