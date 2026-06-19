/** Soft pastel stars only — lightweight SVG, no other motifs */
const STAR =
  "M0 -14 L4.2 -4.2 L14.5 -4.2 L6.5 3.2 L9.5 14 L0 7.8 L-9.5 14 L-6.5 3.2 L-14.5 -4.2 L-4.2 -4.2 Z"

const STARS = [
  { x: 1280, y: 220, scale: 1, opacity: 0.42, motion: "auth-float-gentle" },
  { x: 110, y: 190, scale: 0.82, opacity: 0.36, motion: "auth-float-slow" },
  { x: 320, y: 710, scale: 0.68, opacity: 0.3, motion: "auth-float-gentle" },
  { x: 1080, y: 760, scale: 0.58, opacity: 0.28, motion: "auth-float-slow" },
  { x: 720, y: 140, scale: 0.48, opacity: 0.24, motion: "auth-float-gentle" },
] as const

export function AuthHeroBackdrop() {
  return (
    <svg
      className="auth-hero-svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {STARS.map((star, index) => (
        <g
          key={index}
          className={star.motion}
          transform={`translate(${star.x} ${star.y}) scale(${star.scale})`}
          opacity={star.opacity}
        >
          <path d={STAR} fill="#aedff7" />
        </g>
      ))}
    </svg>
  )
}
