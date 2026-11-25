import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface CciLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "mark-red" | "mark-white";
  className?: string;
}

const badgeSizes = {
  sm: { px: 32, cls: "h-8 w-8 rounded-lg" },
  md: { px: 36, cls: "h-9 w-9 rounded-lg" },
  lg: { px: 48, cls: "h-12 w-12 rounded-xl" },
};

export function CciLogo({ size = "md", variant = "badge", className }: CciLogoProps) {
  if (variant === "mark-red" || variant === "mark-white") {
    const src = variant === "mark-red" ? "/cci-mark-red.png" : "/cci-mark-white.png";
    const h = size === "sm" ? 20 : size === "lg" ? 32 : 24;
    const w = Math.round(h * 2.9);
    return (
      <Image
        src={src}
        alt="CCI STEM Connect logo"
        width={w}
        height={h}
        priority
        className={cn("object-contain", className)}
      />
    );
  }

  const cfg = badgeSizes[size];
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[#D41B23] shadow-sm ring-1 ring-black/5",
        cfg.cls,
        className
      )}
    >
      <Image
        src="/cci-logo.png"
        alt="CCI STEM Connect logo"
        width={cfg.px}
        height={cfg.px}
        priority
        className="h-full w-full object-cover"
      />
    </div>
  );
}
