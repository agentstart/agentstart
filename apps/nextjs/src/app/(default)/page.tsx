import { Navbar } from "@/components/sections/navbar";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesGrid } from "@/components/sections/features-grid";
import { ShowcaseSection } from "@/components/sections/showcase";
import { PricingSection } from "@/components/sections/pricing";
import { CTASection } from "@/components/sections/cta";
import { FAQSection } from "@/components/sections/faq";
import { FooterSection } from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="bg-background relative min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <ShowcaseSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
