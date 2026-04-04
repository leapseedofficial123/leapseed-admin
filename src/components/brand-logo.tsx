"use client";

import Image from "next/image";

export function BrandLogo({
  size = 44,
  priority,
  className = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-xl ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/branding/leapseed-mark.png"
        alt="LeapSeed"
        fill
        priority={priority}
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}
