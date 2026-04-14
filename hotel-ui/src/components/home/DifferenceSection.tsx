import { Layers, Zap, Heart } from "lucide-react";

const pillars = [
  {
    icon: Layers,
    title: "Unified",
    description: "All departments in one platform. No more switching between tools or manually syncing data.",
  },
  {
    icon: Zap,
    title: "Intelligent",
    description: "Real-time dashboards and smart automations that help you make data-driven decisions.",
  },
  {
    icon: Heart,
    title: "Guest-first",
    description: "Every feature is designed around delivering exceptional guest experiences.",
  },
];

const DifferenceSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            One platform. Unified operations. Elevated experiences.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            AtithiFlow brings together everything your hotel needs in one intelligent platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="group text-center p-8 rounded-[5px] bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-16 h-16 rounded-[5px] bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <pillar.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{pillar.title}</h3>
              <p className="text-muted-foreground">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferenceSection;
