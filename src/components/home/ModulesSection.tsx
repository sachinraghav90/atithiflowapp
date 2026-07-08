import { Link } from "react-router-dom";
import { Calendar, UserCheck, Sparkles, UtensilsCrossed, BarChart3, Plug, ArrowRight } from "lucide-react";

const modules = [
  {
    icon: Calendar,
    title: "Reservations & Channel Management",
    description: "Sync availability across all channels in real-time. Manage bookings effortlessly.",
    anchor: "reservations",
  },
  {
    icon: UserCheck,
    title: "Front Office",
    description: "Streamline check-ins, guest profiles, and communications from one dashboard.",
    anchor: "front-office",
  },
  {
    icon: Sparkles,
    title: "Housekeeping",
    description: "Real-time room status, mobile task lists, and seamless handoffs to front desk.",
    anchor: "housekeeping",
  },
  {
    icon: UtensilsCrossed,
    title: "F&B & Dining",
    description: "Table management, POS integration, and guest preference tracking.",
    anchor: "fnb",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Dashboards, custom reports, and alerts for data-driven decisions.",
    anchor: "analytics",
  },
  {
    icon: Plug,
    title: "Integrations & Ecosystem",
    description: "Connect with payment gateways, keycard systems, accounting, and more.",
    anchor: "integrations",
  },
];

const ModulesSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Explore AtithiFlow's core modules
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Each module is designed to work seamlessly together, giving you complete control over your operations.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <Link
              key={index}
              to={`/platform#${module.anchor}`}
              className="group bg-card p-6 rounded-[3px] border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <module.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
              <span className="inline-flex items-center text-sm font-medium text-primary">
                Learn more
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;
