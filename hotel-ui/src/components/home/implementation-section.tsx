import { ClipboardList, Settings, Rocket } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    step: "Step 1",
    title: "Understand your property",
    description: "We analyze your workflows and operational needs to design the perfect setup.",
  },
  {
    icon: Settings,
    step: "Step 2",
    title: "Configure & train",
    description: "We configure your modules and train your team for a seamless transition.",
  },
  {
    icon: Rocket,
    step: "Step 3",
    title: "Go live & refine",
    description: "Launch with confidence and continuously improve with real-time insights.",
  },
];

const ImplementationSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Getting started is easy
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Our implementation team ensures a smooth transition with minimal disruption.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-border -translate-x-1/2 z-0" />
              )}
              <div className="relative z-10 text-center transition-all duration-300 group-hover:-translate-y-2">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <step.icon className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <span className="inline-block px-3 py-1 bg-secondary/20 text-secondary text-xs font-semibold rounded-full mb-3 transition-colors duration-300 group-hover:bg-secondary/30">
                  {step.step}
                </span>
                <h3 className="text-lg font-bold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImplementationSection;
