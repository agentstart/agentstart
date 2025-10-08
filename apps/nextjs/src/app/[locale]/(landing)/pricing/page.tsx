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

import { Navbar } from "@/components/sections/navbar";
import { PricingSection } from "@/components/sections/pricing";
import { FooterSection } from "@/components/sections/footer";

export default function Pricing() {
  return (
    <div className="bg-background relative min-h-screen">
      <Navbar />

      <PricingSection />

      <FooterSection />
    </div>
  );
}
