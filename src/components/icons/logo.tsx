export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with gradient */}
      <circle cx="24" cy="24" r="24" fill="url(#logo-gradient)" />

      {/* Indian Rupee symbol - stylized */}
      <g transform="translate(12, 12)">
        {/* Top line */}
        <path
          d="M4 4h16"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Middle line */}
        <path
          d="M4 10h16"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Rupee curve */}
        <path
          d="M10 4c4 0 7 2.5 7 6c0 3.5-3 6-7 6H6l8 8"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Gradient definition */}
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
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
