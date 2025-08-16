import {
  UpdateAvatarCard,
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  ProvidersCard,
  SessionsCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

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
