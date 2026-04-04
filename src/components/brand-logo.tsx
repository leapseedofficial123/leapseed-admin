"use client";

import Image from "next/image";

export function BrandLogo({
  width = 152,
  height = 82,
  priority,
}: {
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/branding/leapseed-logo.png"
      alt="LeapSeed"
      width={width}
      height={height}
      priority={priority}
      className="h-auto w-auto object-contain"
    />
  );
}
