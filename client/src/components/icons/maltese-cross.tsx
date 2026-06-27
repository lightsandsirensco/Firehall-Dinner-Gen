import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

/**
 * Fire service Maltese Cross — outline, lucide-compatible stroke icon.
 * Optimized for 16–20px display; use text-primary for Firehall red accent.
 */
export const MalteseCross = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-hidden"] ?? true}
      {...props}
    >
      <path d="M12 2.5 13.75 8.5 19.5 8.5 14.75 12.75 16.75 19.5 12 15.75 7.25 19.5 9.25 12.75 4.5 8.5 10.25 8.5Z" />
    </svg>
  ),
);

MalteseCross.displayName = "MalteseCross";
