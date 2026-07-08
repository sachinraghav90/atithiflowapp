import { motion } from "framer-motion";
import { BarChart3, CalendarCheck, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    text: "Live dashboards for your teams",
  },
  {
    icon: CalendarCheck,
    text: "Centralized reservations & housekeeping",
  },
  {
    icon: ShieldCheck,
    text: "Secure, role-based access for staff",
  },
];

const LoginBrandPanel = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent overflow-hidden ${className}`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 max-w-md text-center"
      >
        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="text-3xl font-bold text-foreground mb-4"
        >
          Elevate every guest touchpoint.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-lg mb-10"
        >
          One platform to manage reservations, operations, and guest experiences — built for modern hospitality.
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="space-y-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1, ease: "easeOut" }}
              className="flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-[3px] border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground font-medium text-left">
                {feature.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Decorative illustration hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
          className="mt-12 flex items-center justify-center gap-6 text-muted-foreground/60"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-sm">Enterprise-ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm">99.9% uptime</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginBrandPanel;
