import { Navbar } from "@/components/sections/navbar";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { ShowcaseSection } from "@/components/sections/showcase";
import { PricingSection } from "@/components/sections/pricing";
import { CTASection } from "@/components/sections/cta";
import { FAQSection } from "@/components/sections/faq";
import { FooterSection } from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="relative">
      {/* bg */}
      <div className="text-border/10 absolute inset-0 [background-image:repeating-linear-gradient(45deg,currentColor_0_1px,#0000_50%)] bg-[size:10px_10px]"></div>

      <div className="bg-background border-border relative container min-h-screen w-[calc(100%-2rem)] border-x sm:w-full">
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
        <FooterSection />
      </div>
    </div>
  );
}
