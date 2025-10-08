/* agent-frontmatter:start
AGENT: Universal authentication and subscription state management hook
USAGE: import { useAuth } from '@/hooks/use-auth'
PROVIDES: User info, subscription status, plan details, permission checks
agent-frontmatter:end */

import { authClient } from "@/lib/auth/client";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { pricingPlans } from "@acme/config";

/**
 * React Query options for fetching user subscription information
 * Only executes when user is authenticated for better performance
 */
export const subscriptionsOptions = queryOptions({
  queryKey: ["subscriptions"],
  queryFn: async () => {
    const { data, error } = await authClient.subscription.list();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },
});

/**
 * Universal authentication and subscription state management hook
 *
 * Features:
 * 1. Get user authentication status and basic information
 * 2. Get user subscription information and current plan
 * 3. Provide convenient permission checks and feature validation methods
 *
 * @example
 * ```tsx
 * const {
 *   user,
 *   isAuthenticated,
 *   isSubscribed,
 *   currentPlan,
 *   hasFeature,
 *   canAccess
 * } = useAuth();
 *
 * // Check if user is logged in
 * if (!isAuthenticated) return <LoginPrompt />;
 *
 * // Check if user has a specific feature
 * if (hasFeature("API access")) {
 *   // Show API related features
 * }
 *
 * // Check if user can access a specific plan level feature
 * if (canAccess("pro")) {
 *   // Show Pro level features
 * }
 * ```
 */
export function useAuth() {
  // Fetch user session information (includes basic user data)
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Fetch user subscription information (only when user is authenticated for performance)
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    ...subscriptionsOptions,
    enabled: !!session?.user, // Only query subscriptions for authenticated users
  });

  // Find currently active subscription (status is active or trialing)
  const activeSubscription = subscriptions?.find(
    (sub) => sub.status === "active" || sub.status === "trialing",
  );

  // Get current plan details based on subscription, default to hobby plan if no subscription
  const currentPlan = activeSubscription?.plan
    ? pricingPlans.find((plan) => plan.name === activeSubscription.plan) || null
    : pricingPlans.find((plan) => plan.name === "hobby") || null;

  // ============ Computed derived state ============
  const isAuthenticated = !!session?.user; // Whether user is logged in
  const isLoading = sessionLoading || (isAuthenticated && subscriptionsLoading); // Whether data is loading
  const isSubscribed =
    !!activeSubscription && activeSubscription.status === "active"; // Whether user has paid subscription
  const isTrialing =
    !!activeSubscription && activeSubscription.status === "trialing"; // Whether user is in trial period
  const planName = currentPlan?.name || null; // Current plan name
  const planLimits = currentPlan?.limits || null; // Current plan limits

  // ============ Utility functions ============

  /**
   * Check if current plan includes a specific feature
   * @param feature - Feature name (case insensitive)
   * @returns Whether the feature is included
   *
   * @example
   * hasFeature("API access") // Check if user has API access
   * hasFeature("unlimited") // Check if user has unlimited features
   */
  const hasFeature = (feature: string): boolean => {
    if (!currentPlan) return false;
    return currentPlan.features.some((f) =>
      f.toLowerCase().includes(feature.toLowerCase()),
    );
  };

  /**
   * Check if current user can access features of a specific plan level
   * Based on plan hierarchy: hobby < pro < ultra
   * @param requiredPlan - Required minimum plan level
   * @returns Whether user has access permission
   *
   * @example
   * canAccess("pro") // Check if user is Pro level or higher
   * canAccess("hobby") // All users can access hobby level features
   */
  const canAccess = (requiredPlan: string): boolean => {
    if (!currentPlan) return requiredPlan === "hobby";

    const planHierarchy = ["hobby", "pro", "ultra"];
    const currentIndex = planHierarchy.indexOf(currentPlan.name);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);

    return currentIndex >= requiredIndex;
  };

  /**
   * Get user's remaining credits count
   * @returns Remaining credits, or null if unavailable
   *
   * @todo Implement based on actual credit tracking system
   * Currently returns plan limit as example
   */
  const getRemainingCredits = (): number | null => {
    if (!activeSubscription || !planLimits) return null;

    // This needs to be implemented based on your credit tracking system
    // Currently returns plan limit as example
    return planLimits.credits || null;
  };

  return {
    // ============ Basic authentication info ============
    session, // Complete session object (includes user and session data)
    user: session?.user, // Basic user information (id, email, name, image, etc.)
    isAuthenticated, // Whether user is logged in
    isLoading, // Whether data is currently loading

    // ============ Subscription info ============
    subscriptions, // All subscription records
    activeSubscription, // Currently active subscription
    isSubscribed, // Whether user has paid subscription (status is active)
    isTrialing, // Whether user is in trial period (status is trialing)

    // ============ Plan info ============
    currentPlan, // Complete current plan information (from config)
    planName, // Current plan name (\"hobby\" | \"pro\" | \"ultra\")
    planLimits, // Current plan limits (credits, projects, etc.)

    // ============ Utility functions ============
    hasFeature, // Check if user has a specific feature
    canAccess, // Check if user can access a specific plan level
    getRemainingCredits, // Get remaining credits count
  };
}
