import TopRibbon from "@/components/layout/top-ribbon";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import HeroSection from "@/components/home/hero-section";
import PainPointsSection from "@/components/home/pain-points-section";
import DifferenceSection from "@/components/home/difference-section";
import ModulesSection from "@/components/home/modules-section";
import SocialProofSection from "@/components/home/social-proof-section";
import PricingSection from "@/components/home/pricing-section";
import ImplementationSection from "@/components/home/implementation-section";
import FinalCTASection from "@/components/home/final-cta-section";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopRibbon />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <PainPointsSection />
        <DifferenceSection />
        <ModulesSection />
        <SocialProofSection />
        <PricingSection />
        <ImplementationSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
