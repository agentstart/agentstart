import { Navbar } from "@/components/layout/sections/navbar";
import { HeroSection } from "@/components/layout/sections/hero";
import { FeaturesGrid } from "@/components/layout/sections/features-grid";
import { ShowcaseSection } from "@/components/layout/sections/showcase";
import { StatsSection } from "@/components/layout/sections/stats";
import { PricingSection } from "@/components/layout/sections/pricing";
import { CTASection } from "@/components/layout/sections/cta";
import { FAQSection } from "@/components/layout/sections/faq";
import { FooterSection } from "@/components/layout/sections/footer";

export default function Home() {
  return (
    <div className="bg-background relative min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <ShowcaseSection />
      <StatsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
