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
