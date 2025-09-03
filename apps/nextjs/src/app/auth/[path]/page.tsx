// AGENT: Dynamic authentication page
// PURPOSE: Handle all auth views (sign-in, sign-up, forgot-password, etc.)
// ROUTES:
//   - /auth/sign-in - Sign in via email/password and social providers
//   - /auth/sign-up - New account registration
//   - /auth/magic-link - Email login without a password
//   - /auth/forgot-password - Trigger email to reset forgotten password
//   - /auth/two-factor – Two-factor authentication
//   - /auth/recover-account – Recover account via backup code
//   - /auth/reset-password – Set new password after receiving reset link
//   - /auth/sign-out – Log the user out of the application
//   - /auth/callback – Internal route to handle Auth callbacks
//   - /auth/accept-invitation – Accept an invitation to an organization
// FEATURES: Static generation for all auth paths
// SEARCHABLE: auth page, login page, signup page, authentication views

import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";

export const dynamicParams = false;

// AGENT: Generate static params for all auth views
// PURPOSE: Pre-render all authentication pages at build time
export function generateStaticParams() {
  return Object.values(authViewPaths).map((authView) => ({ authView }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return <AuthView pathname={path} />;
}
