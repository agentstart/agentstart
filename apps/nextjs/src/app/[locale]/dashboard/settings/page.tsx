/* agent-frontmatter:start
AGENT: User account settings page
PURPOSE: Comprehensive user account management interface
FEATURES:
  - Update avatar and display name
  - Change email address
  - Update password
  - Manage OAuth providers
  - View active sessions
  - Delete account
ROUTE: /dashboard/settings
SEARCHABLE: settings page, account settings, user profile
agent-frontmatter:end */

import {
  UpdateAvatarCard,
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  ProvidersCard,
  SessionsCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

/* agent-frontmatter:start
AGENT: User settings page with all account management cards
CUSTOMIZATION: Add or remove cards based on required features
agent-frontmatter:end */
export default function UserSettingsPage() {
  return (
    <div className="container flex max-w-3xl flex-col gap-6 px-4 py-12">
      <UpdateAvatarCard />
      <UpdateNameCard />
      <ChangeEmailCard />
      <ChangePasswordCard />
      <ProvidersCard />
      <SessionsCard />
      <DeleteAccountCard />
    </div>
  );
}
