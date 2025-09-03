"use client";

import { siteConfig } from "@acme/config";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return <div className={className}>{siteConfig.name}</div>;
}
