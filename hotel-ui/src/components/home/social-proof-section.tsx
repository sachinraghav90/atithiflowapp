import { Building2, Star, Globe, Award } from "lucide-react";

const SocialProofSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">
            Chosen by hotels that put guests first
          </h2>
          <p className="mt-2 text-muted-foreground">
            Modern properties trust AtithiFlow for reliable, unified operations.
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          <div className="flex items-center gap-3 text-muted-foreground/60">
            <Building2 className="h-8 w-8" />
            <span className="text-lg font-semibold">Luxury Resorts</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground/60">
            <Star className="h-8 w-8" />
            <span className="text-lg font-semibold">Boutique Hotels</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground/60">
            <Globe className="h-8 w-8" />
            <span className="text-lg font-semibold">Hotel Groups</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground/60">
            <Award className="h-8 w-8" />
            <span className="text-lg font-semibold">Award Winners</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
