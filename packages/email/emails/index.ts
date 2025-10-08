/* agent-frontmatter:start
AGENT: Email templates export
PURPOSE: Central export for all email templates
TEMPLATES:
  - SignInEmail: Magic link sign-in email
  - EmailVerificationEmail: Email verification template
  - ForgotPasswordEmail: Password reset email
USAGE: import { SignInEmail, EmailVerificationEmail } from '@acme/email/templates'
SEARCHABLE: email templates, email exports
agent-frontmatter:end */

export { SignInEmail } from "./sign-in";
export { EmailVerificationEmail } from "./email-verification";
export { ForgotPasswordEmail } from "./forgot-password";
