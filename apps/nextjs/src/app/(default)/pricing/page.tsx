import { Navbar } from "@/components/layout/sections/navbar";
import { PricingSection } from "@/components/layout/sections/pricing";
import { FooterSection } from "@/components/layout/sections/footer";

export default function Pricing() {
  return (
    <div className="bg-background relative min-h-screen">
      <Navbar />

      <PricingSection />

      <FooterSection />
    </div>
  );
}
