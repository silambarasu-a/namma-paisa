let logoIdCounter = 0

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>

      {/* Background circle with gradient */}
      <circle cx="16" cy="16" r="16" fill="url(#logo-gradient)" />

      {/* Indian Rupee symbol */}
      <path
        d="M9 10h10M9 14h10M14 10c3 0 5 2 5 4c0 2-2 4-5 4l-4 0l6 6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function LogoMini({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="16" fill="url(#logo-mini-gradient)" />
      <g transform="translate(8, 8)">
        <path d="M2 2h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 6h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M7 2c3 0 5 1.5 5 4c0 2.5-2 4-5 4H4l5 5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <defs>
        <linearGradient
          id="logo-mini-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  )
}
