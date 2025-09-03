// AGENT: Pricing section with monthly/annual toggle
// PURPOSE: Display pricing plans with Stripe checkout integration
// USAGE: <PricingSection /> - typically on pricing page or landing
// FEATURES:
//   - Monthly/annual billing toggle
//   - Stripe checkout integration
//   - Auth-aware (shows current plan)
//   - Animated cards with MagicCard
//   - BorderBeam effect on popular plan
// REQUIRES: Stripe configured, pricing plans in @acme/config
// SEARCHABLE: pricing section, subscription plans, stripe checkout

"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import type { PricingPlan } from "@acme/config";
import { pricingConfig, pricingPlans } from "@acme/config";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { CornerBorders } from "./corner-borders";

interface PricingCardProps {
  plan: PricingPlan;
  price: number;
  isCurrentPlan: boolean;
  handleCheckout: (plan: PricingPlan) => void;
  isLoading: string | null;
}

function PricingCard({
  plan,
  price,
  isCurrentPlan,
  handleCheckout,
  isLoading,
}: PricingCardProps) {
  const isPopular = plan.label === "Popular";
  const isEnterprise = plan.isEnterprise;
  const isFree = plan.name === "hobby" || plan.monthlyPrice === 0;
  const { theme } = useTheme();

  return (
    <MagicCard
      gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
      className={cn(
        "relative overflow-hidden",
        isEnterprise ? "bg-card" : "bg-card/50",
      )}
      containerClassName="bg-accent/20 h-full"
    >
      {isPopular && <BorderBeam />}
      <div className="flex h-full flex-col p-8">
        {/* Popular Badge */}

        {/* Plan Name */}
        <h3 className="mb-4 text-2xl">{plan.title}</h3>

        {/* Price */}
        <div className="mb-2">
          {isEnterprise ? (
            <div className="text-4xl font-bold">Custom</div>
          ) : (
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">${price}</span>
              <span className="text-muted-foreground ml-2 text-base">/mo</span>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Tagline */}
        <div className={cn("text-muted-foreground mb-4 text-sm font-semibold")}>
          {plan.tagline}
        </div>

        {/* Features */}
        <ul className="mb-8 flex-1 space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check
                className={cn(
                  "mt-1 size-4 flex-shrink-0",
                  isEnterprise ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-base",
                  isEnterprise ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          onClick={() => handleCheckout(plan)}
          disabled={isLoading === plan.priceId || isCurrentPlan}
          className="w-full rounded-none"
          variant={isFree ? "outline" : "default"}
        >
          {isLoading === plan.priceId ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading...
            </span>
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : (
            plan.button.title
          )}
        </Button>
      </div>
    </MagicCard>
  );
}

export function PricingSection() {
  const router = useRouter();
  const { user, activeSubscription, currentPlan } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: PricingPlan) => {
    try {
      if (!user) {
        router.push("/sign-in?redirect=/pricing");
        return;
      }

      if (plan.name === "free") {
        router.push("/");
        return;
      }

      if (plan.isEnterprise) {
        router.push("/contact");
        return;
      }

      setIsLoading(plan.priceId!);

      const result = await authClient.subscription.upgrade({
        plan: plan.name,
        successUrl: `/?success=true&plan=${plan.name}`,
        cancelUrl: "/pricing",
        annual: billingInterval === "annual",
        subscriptionId: activeSubscription?.stripeSubscriptionId,
      });

      if (result.error) {
        toast.error(
          result.error.message || "Failed to create checkout session",
        );
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <section
      id={pricingConfig.name}
      className="relative border-b py-24 sm:py-32"
    >
      <CornerBorders position="all" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-5xl font-bold">{pricingConfig.title}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            {pricingConfig.description}
          </p>
        </div>

        {/* Billing Toggle using Tabs */}
        <Tabs
          value={billingInterval}
          onValueChange={(value) =>
            setBillingInterval(value as "monthly" | "annual")
          }
          className="mb-12"
        >
          <div className="flex justify-center">
            <TabsList className="rounded-none">
              <TabsTrigger value="monthly" className="rounded-none px-4 py-2">
                Monthly
              </TabsTrigger>
              <TabsTrigger
                value="annual"
                className="flex items-center gap-2 rounded-none px-4 py-2"
              >
                Annual
                <Badge variant="secondary" className="ml-1">
                  {pricingConfig.annualDiscount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly" className="mt-8">
            {/* Pricing Cards */}
            <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
              {pricingPlans.map((plan) => {
                const price = plan.monthlyPrice;

                return (
                  <PricingCard
                    key={`monthly-${plan.title}`}
                    plan={plan}
                    price={price}
                    handleCheckout={handleCheckout}
                    isLoading={isLoading}
                    isCurrentPlan={currentPlan?.name === plan.name}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="annual" className="mt-8">
            {/* Pricing Cards */}
            <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
              {pricingPlans.map((plan) => {
                const price = Math.round(plan.annualPrice / 12);

                return (
                  <PricingCard
                    key={`annual-${plan.title}`}
                    plan={plan}
                    price={price}
                    handleCheckout={handleCheckout}
                    isLoading={isLoading}
                    isCurrentPlan={currentPlan?.name === plan.name}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
