interface GovSchemeLogoProps {
  size?: number;
  className?: string;
}

export default function GovSchemeLogo({ size = 36, className }: GovSchemeLogoProps) {
  const id = `logo-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c0e848" />
          <stop offset="100%" stopColor="#5a8006" />
        </linearGradient>
      </defs>

      {/* Rounded background */}
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />

      {/* Parliament dome (arc) */}
      <path
        d="M10 18 Q20 8 30 18"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />

      {/* Center flagpole / spire */}
      <rect x="19" y="9" width="2" height="5" rx="1" fill="white" opacity="0.9" />

      {/* Three pillars */}
      <rect x="10" y="18" width="4"  height="12" rx="1.5" fill="white" opacity="0.85" />
      <rect x="18" y="18" width="4"  height="12" rx="1.5" fill="white" />
      <rect x="26" y="18" width="4"  height="12" rx="1.5" fill="white" opacity="0.85" />

      {/* Base / ground line */}
      <rect x="8" y="30" width="24" height="2.5" rx="1.25" fill="white" opacity="0.9" />

      {/* Capital tops on pillars (small horizontal bars) */}
      <rect x="9"  y="17" width="6"  height="1.5" rx="0.75" fill="white" opacity="0.7" />
      <rect x="17" y="17" width="6"  height="1.5" rx="0.75" fill="white" opacity="0.7" />
      <rect x="25" y="17" width="6"  height="1.5" rx="0.75" fill="white" opacity="0.7" />

      {/* Tiny star / dot on top of spire */}
      <circle cx="20" cy="8.5" r="1.2" fill="white" opacity="0.95" />
    </svg>
  );
}
