// AGENT: User account dropdown menu component
// PURPOSE: Display user avatar with dropdown for account actions
// USAGE: <UserDropmenu size="default" />
// FEATURES:
//   - User avatar with fallback
//   - Dashboard link
//   - Theme switcher
//   - Sign out action
//   - Loading skeleton state
// SEARCHABLE: user menu, account dropdown, avatar menu, logout

"use client";

import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { match } from "ts-pattern";

import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSwitch } from "./theme-switch";

interface UserDropmenuProps {
  size?: "icon" | "default";
}

export function UserDropmenu({ size = "default" }: UserDropmenuProps) {
  const router = useRouter();

  const { user, isLoading } = useAuth();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  // Get initials for avatar fallback
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0]?.toUpperCase() ?? "U";
    }
    return "U";
  };

  if (isLoading) {
    return match({ size })
      .with({ size: "icon" }, () => (
        <Skeleton className="size-9 rounded-full" />
      ))
      .otherwise(() => (
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ));
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {match({ size })
          .with({ size: "icon" }, () => (
            <Button variant="ghost" className="relative size-9 rounded-full">
              <Avatar className="size-9">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? "User avatar"}
                />
                <AvatarFallback className="bg-primary/10">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          ))
          .otherwise(() => (
            <Button
              variant="outline"
              className="relative h-12 justify-start gap-3 text-left"
            >
              <Avatar className="size-9">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? "User avatar"}
                />
                <AvatarFallback className="bg-primary/10">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">
                  {user.name ?? "User"}
                </p>
                <p className="text-muted-foreground text-xs leading-none">
                  {user.email}
                </p>
              </div>
            </Button>
          ))}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[270px] text-base"
        side="bottom"
        align="end"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-base leading-none font-medium">
              {user.name ?? "User"}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer justify-between">
              <span className="text-base">Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="cursor-pointer justify-between"
            >
              <span className="text-base">Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="text-base">Theme</span>
            <ThemeSwitch />
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/" className="cursor-pointer justify-between">
              <span className="text-base">Home Page</span>
              <Home className="size-4" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer justify-between"
          >
            <span className="text-base">Log out</span>
            <LogOut className="size-4" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
