import { LucideProps } from "lucide-react";
import { forwardRef } from "react";

export const ErrorIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <g>
  <circle cx="11" cy="8" r="1"/>
  <circle cx="11" cy="16" r="1"/>
  <circle cx="11" cy="24" r="1"/>
  <path d="M24,3H8A2,2,0,0,0,6,5V27a2,2,0,0,0,2,2H18V27H8V21H26V5A2,2,0,0,0,24,3Zm0,16H8V13H24Zm0-8H8V5H24Z"/>
  <polygon points="29 24.415 27.586 23 25 25.587 22.414 23 21 24.415 23.586 27 21 29.586 22.414 31 25 28.414 27.586 31 29 29.586 26.414 27 29 24.415"/>
      </g>
    </svg>
  )
);

ErrorIcon.displayName = "ErrorIcon";


