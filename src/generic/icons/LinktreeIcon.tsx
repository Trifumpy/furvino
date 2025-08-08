import { LucideProps } from "lucide-react";
import { forwardRef } from "react";

export const LinktreeIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, ...props }, ref) => 
    <svg 
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 80 98" 
      fill="currentColor"
      stroke="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <g>
        <path d="M0.2,33.1h24.2L7.1,16.7l9.5-9.6L33,23.8V0h14.2v23.8L63.6,7.1l9.5,9.6L55.8,33H80v13.5H55.7l17.3,16.7l-9.5,9.4L40,49.1L16.5,72.7L7,63.2l17.3-16.7H0V33.1H0.2z M33.1,65.8h14.2v32H33.1V65.8z"/>
      </g>
    </svg>
  )
;

LinktreeIcon.displayName = "LinktreeIcon";