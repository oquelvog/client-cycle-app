interface Props {
  /** Tailwind size classes for the SVG icon, e.g. "w-5 h-5" */
  iconSize?: string;
  /** Tailwind text classes for the wordmark, e.g. "text-lg" */
  textSize?: string;
  /** Extra classes on the flex wrapper */
  className?: string;
}

/**
 * Annua logotype — arc icon + wordmark.
 *
 * Icon anatomy:
 *   • 270° clockwise arc (12 o'clock → 3 o'clock) — the recurring cycle
 *   • Filled circle at 12 o'clock — the milestone marker
 *   • Two-line chevron at 3 o'clock pointing upward — cycle continues
 */
export function AnnuaLogo({
  iconSize = "w-5 h-5",
  textSize = "text-lg",
  className = "",
}: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* ── Icon ── */}
      <svg
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} text-indigo-600 dark:text-indigo-400 shrink-0`}
        aria-hidden="true"
      >
        {/*
          Arc: center (10,10) r=7
          Start  = 12 o'clock  → (10, 3)   at angle 270°
          End    =  3 o'clock  → (17, 10)  at angle   0°
          Sweep  = 270° clockwise  → large-arc=1, sweep-flag=1
        */}
        <path
          d="M10 3A7 7 0 1 1 17 10"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Milestone dot at 12 o'clock */}
        <circle cx="10" cy="3" r="1.65" fill="currentColor" />

        {/*
          Arrowhead at 3 o'clock (17, 10).
          Clockwise tangent at 0° points upward in SVG (-y).
          Tip at (17, 10); wings below at y ≈ 12.2.
        */}
        <path
          d="M15.5 12.2L17 10L18.5 12.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* ── Wordmark ── */}
      <span
        className={`${textSize} font-bold tracking-tight text-gray-900 dark:text-white`}
      >
        Annua
      </span>
    </span>
  );
}
