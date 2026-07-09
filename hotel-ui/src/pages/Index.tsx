import TopRibbon from "@/components/layout/TopRibbon";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import PainPointsSection from "@/components/home/PainPointsSection";
import DifferenceSection from "@/components/home/DifferenceSection";
import ModulesSection from "@/components/home/ModulesSection";
import SocialProofSection from "@/components/home/SocialProofSection";
import PricingSection from "@/components/home/PricingSection";
import ImplementationSection from "@/components/home/ImplementationSection";
import FinalCTASection from "@/components/home/FinalCTASection";

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
