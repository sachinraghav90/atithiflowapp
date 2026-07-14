import { AlertCircle, Database, Clock, Users } from "lucide-react";

const painPoints = [
  {
    icon: Database,
    title: "Disconnected systems & siloed data",
    description: "Departments can't share information, leading to miscommunication.",
  },
  {
    icon: Clock,
    title: "Manual overhead and spreadsheets",
    description: "Staff waste time on repetitive tasks instead of serving guests.",
  },
  {
    icon: AlertCircle,
    title: "No real-time visibility",
    description: "Managers lack instant insights across departments and properties.",
  },
  {
    icon: Users,
    title: "Inconsistent guest experiences",
    description: "Without unified data, personalization becomes nearly impossible.",
  },
];

const PainPointsSection = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Is your hotel tech holding you back?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Legacy systems and fragmented tools create friction for your team and your guests.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="bg-card p-6 rounded-[3px] border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <point.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PainPointsSection;
