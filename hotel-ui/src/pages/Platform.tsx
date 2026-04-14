import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import CalendlyModal from "@/components/CalendlyModal";
import TopRibbon from "@/components/layout/TopRibbon";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Calendar,
  UserCheck,
  Sparkles,
  UtensilsCrossed,
  BarChart3,
  Plug,
  Cloud,
  Shield,
  RefreshCw,
  Check,
  Headphones,
} from "lucide-react";

const Platform = () => {
  const location = useLocation();
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false);

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopRibbon />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              The unified hotel operations platform
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              AtithiFlow is a cloud-based, guest-centric platform designed for modern hospitality. Unify your operations, empower your team, and deliver exceptional experiences.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button variant="hero" size="xl">
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="heroOutline" size="xl">
                  Contact us for pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Platform Philosophy */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Built for modern hospitality
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Cloud, title: "Cloud-first", desc: "Always up-to-date, accessible from anywhere, no servers to maintain." },
                { icon: RefreshCw, title: "Unified platform", desc: "Replace patchwork tools with one seamless system." },
                { icon: UserCheck, title: "Guest-centric design", desc: "Every feature built around the guest experience." },
                { icon: BarChart3, title: "Scales with you", desc: "From single properties to multi-property groups." },
              ].map((item, i) => (
                <div key={i} className="group bg-card p-6 rounded-[3px] border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reservations */}
        <section id="reservations" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mb-6">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Reservations & Channel Management
                </h2>
                <p className="text-muted-foreground mb-6">
                  Synchronize availability across all booking channels in real-time. Manage direct bookings, OTAs, and group reservations from a single dashboard.
                </p>
                <ul className="space-y-3">
                  {[
                    "Multi-channel sync with real-time availability",
                    "Dynamic pricing based on demand and occupancy",
                    "Pre-arrival communications and upselling",
                    "Group booking and event management",
                    "Automated confirmation and reminder emails",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-primary font-medium">
                  Outcome: Fewer errors, higher occupancy, smoother bookings.
                </p>
              </div>
              <div className="bg-muted rounded-[5px] p-8">
                <img
                  src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Hotel reservation system interface"
                  className="rounded-[3px] shadow-lg w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Front Office */}
        <section id="front-office" className="py-20 bg-muted scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 bg-card rounded-[5px] p-8">
                <img
                  src="https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Hotel front desk operations"
                  className="rounded-[3px] shadow-lg w-full"
                />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mb-6">
                  <UserCheck className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Front Office
                </h2>
                <p className="text-muted-foreground mb-6">
                  Streamline check-ins, manage guest profiles, and automate communications. Give your front desk team the tools to deliver personalized service.
                </p>
                <ul className="space-y-3">
                  {[
                    "Fast check-in/check-out with mobile options",
                    "Unified guest profiles with preferences and history",
                    "Real-time room status and availability",
                    "Automated guest communications",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-primary font-medium">
                  Outcome: Shorter wait times, personalized service at scale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Housekeeping */}
        <section id="housekeeping" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mb-6">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Housekeeping
                </h2>
                <p className="text-muted-foreground mb-6">
                  Real-time room visibility, mobile task lists, and seamless handoffs between housekeeping and front office for faster room turnover.
                </p>
                <ul className="space-y-3">
                  {[
                    "Real-time room status updates",
                    "Mobile task lists for cleaning staff",
                    "Inspection checklists and quality tracking",
                    "Instant handoff notifications to front desk",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-primary font-medium">
                  Outcome: Faster room turnover, consistent quality standards.
                </p>
              </div>
              <div className="bg-muted rounded-[5px] p-8">
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Clean hotel room"
                  className="rounded-[3px] shadow-lg w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* F&B */}
        <section id="fnb" className="py-20 bg-muted scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 bg-card rounded-[5px] p-8">
                <img
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Hotel restaurant and dining"
                  className="rounded-[3px] shadow-lg w-full"
                />
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mb-6">
                  <UtensilsCrossed className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  F&B & Dining
                </h2>
                <p className="text-muted-foreground mb-6">
                  Manage tables, waitlists, and reservations. Integrate with POS systems and track guest preferences for personalized dining experiences.
                </p>
                <ul className="space-y-3">
                  {[
                    "Table and waitlist management",
                    "POS integration for seamless billing",
                    "Room-charge support for guest convenience",
                    "Guest preference and dietary tracking",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-primary font-medium">
                  Outcome: Better guest dining experiences, improved revenue control.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Analytics */}
        <section id="analytics" className="py-20 bg-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mb-6">
                  <BarChart3 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Analytics & Reporting
                </h2>
                <p className="text-muted-foreground mb-6">
                  Real-time dashboards, custom reports, and automated alerts give you complete visibility into your property's performance.
                </p>
                <ul className="space-y-3">
                  {[
                    "Real-time operational dashboards",
                    "Custom report builder",
                    "Automated alerts and scheduled reports",
                    "Full property view across all departments",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-primary font-medium">
                  Outcome: Data-backed decisions, proactive management.
                </p>
              </div>
              <div className="bg-muted rounded-[5px] p-8">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Analytics dashboard"
                  className="rounded-[3px] shadow-lg w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="py-20 bg-muted scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Plug className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Integrations & Ecosystem
              </h2>
              <p className="text-muted-foreground">
                AtithiFlow connects seamlessly with your existing tools. Open APIs and pre-built connectors make integration easy.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                "Payment Gateways",
                "Keycard & Lock Systems",
                "Accounting Software",
                "CRM Platforms",
                "Channel Managers",
                "POS Systems",
                "Revenue Management",
                "Guest Messaging",
              ].map((item, i) => (
                <div key={i} className="group bg-card p-4 rounded-[3px] border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-center">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data & Security */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-14 h-14 rounded-[3px] bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Your data is safe and secure
              </h2>
              <p className="text-muted-foreground mb-8">
                We take security seriously. Your data is protected with industry-standard practices.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-left">
                {[
                  "End-to-end encryption for all data",
                  "Regular automated backups",
                  "99.9% uptime guarantee",
                  "Compliance with data protection regulations",
                ].map((item, i) => (
                  <div key={i} className="group flex items-center gap-3 bg-muted p-4 rounded-lg border border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                    <Check className="h-5 w-5 text-secondary flex-shrink-0 group-hover:text-primary transition-colors" />
                    <span className="text-foreground group-hover:text-primary transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[3px] bg-secondary/20 flex items-center justify-center">
                  <Headphones className="h-7 w-7 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Responsive support</h3>
                  <p className="text-muted-foreground">Our team is here to help you succeed.</p>
                </div>
              </div>
              <a href="tel:+918562882887">
                <Button variant="heroOutline">
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              See the full platform in action
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get a personalized demo tailored to your property's needs. See how AtithiFlow can transform your operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                Talk to our team
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <CalendlyModal open={isCalendlyOpen} onOpenChange={setIsCalendlyOpen} />
    </div>
  );
};

export default Platform;
