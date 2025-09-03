// AGENT: Landing page component
// PURPOSE: Main marketing landing page with all sections
// SECTIONS:
//   - Navbar - Navigation menu
//   - HeroSection - Main hero with CTA
//   - FeaturesSection - Product features grid
//   - ShowcaseSection - Product showcase
//   - PricingSection - Pricing plans
//   - FAQSection - Frequently asked questions
//   - CTASection - Call to action
//   - FooterSection - Footer with links
// SEARCHABLE: landing page, homepage, marketing page

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
      <div className="text-border/20 absolute inset-0 bg-neutral-100 [background-image:repeating-linear-gradient(45deg,currentColor_0_1px,#0000_50%)] bg-[size:10px_10px] dark:bg-transparent"></div>

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
