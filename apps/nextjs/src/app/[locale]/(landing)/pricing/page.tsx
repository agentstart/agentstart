/* agent-frontmatter:start
AGENT: Pricing page
PURPOSE: Dedicated page for displaying pricing plans
ROUTE: /pricing
SECTIONS:
  - Navbar: Navigation menu
  - PricingSection: Pricing plans with Stripe integration
  - FooterSection: Site footer
SEARCHABLE: pricing page, subscription plans page
agent-frontmatter:end */

import { FooterSection } from "@/components/sections/footer";
import { Navbar } from "@/components/sections/navbar";
import { PricingSection } from "@/components/sections/pricing";

export default function Pricing() {
  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />

      <PricingSection />

      <FooterSection />
    </div>
  );
}
