"use client";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return <div className={className}>AgentStack</div>;
}
