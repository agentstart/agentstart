/* agent-frontmatter:start
AGENT: Landing page component
PURPOSE: Main marketing landing page with all sections
SECTIONS:
  - Navbar - Navigation menu
  - HeroSection - Main hero with CTA
  - FeaturesSection - Product features grid
  - ShowcaseSection - Product showcase
  - PricingSection - Pricing plans
  - FAQSection - Frequently asked questions
  - CTASection - Call to action
  - FooterSection - Footer with links
SEARCHABLE: landing page, homepage, marketing page
agent-frontmatter:end */

import { CTASection } from "@/components/sections/cta";
import { FAQSection } from "@/components/sections/faq";
import { FeaturesSection } from "@/components/sections/features";
import { FooterSection } from "@/components/sections/footer";
import { HeroSection } from "@/components/sections/hero";
import { Navbar } from "@/components/sections/navbar";
import { PricingSection } from "@/components/sections/pricing";
import { ShowcaseSection } from "@/components/sections/showcase";

export default function Home() {
  return (
    <div className="relative">
      {/* bg */}
      <div className="absolute inset-0 bg-[size:10px_10px] bg-neutral-100 text-border/20 [background-image:repeating-linear-gradient(45deg,currentColor_0_1px,#0000_50%)] dark:bg-transparent"></div>

      <div className="container relative min-h-screen w-[calc(100%-2rem)] border-border border-x bg-background sm:w-full">
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
