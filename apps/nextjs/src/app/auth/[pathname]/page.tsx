import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { AuthCard } from "@daveyplate/better-auth-ui";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((pathname) => ({ pathname }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string }>;
}) {
  const { pathname } = await params;

  return <AuthCard pathname={pathname} />;
}
