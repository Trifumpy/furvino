import { LucideProps } from "lucide-react";
import { forwardRef } from "react";

export const WindowsIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12V3h9v9H3z" />
      <path d="M12 3v9h9V3h-9z" />
      <path d="M3 21h9v-9H3v9z" />
      <path d="M12 12v9h9v-9h-9z" />
    </svg>
  )
);

WindowsIcon.displayName = "WindowsIcon";
