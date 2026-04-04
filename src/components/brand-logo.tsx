"use client";

import Image from "next/image";

export function BrandMark({
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

export function BrandLogo({
  width = 92,
  priority,
  className = "",
}: {
  width?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width, aspectRatio: "337 / 240" }}
    >
      <Image
        src="/branding/leapseed-logo.png"
        alt="LeapSeed"
        fill
        priority={priority}
        sizes={`${width}px`}
        className="object-contain object-center"
      />
    </span>
  );
}
