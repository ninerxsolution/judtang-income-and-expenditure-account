/**
 * Floating finance doodles for public / information pages (sketchy paper background).
 */
export function LandingDoodleBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden dark:hidden"
    >
      {/* Money bag */}
      <svg
        className="landing-doodle-float absolute left-[8%] top-[10%] h-24 w-24 text-[#52796F] opacity-20"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30,30 C20,50 10,80 50,90 C90,80 80,50 70,30 C60,30 65,10 50,15 C35,10 40,30 30,30 Z" />
        <path d="M35,35 L65,35" strokeWidth="4" />
        <path
          d="M50,45 L50,75 M40,55 C55,50 60,60 50,60 C40,60 45,70 60,65"
          strokeWidth="4"
        />
      </svg>

      {/* Coin */}
      <svg
        className="landing-doodle-float-delayed absolute right-[15%] top-[18%] h-20 w-20 rotate-12 text-yellow-500 opacity-30"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="50" cy="50" r="40" strokeWidth="3" strokeDasharray="8 4" />
        <circle cx="50" cy="50" r="30" strokeWidth="3" />
        <path d="M50,35 L50,65 M40,45 L60,45 M40,55 L60,55" strokeWidth="3" />
      </svg>

      {/* Banknote */}
      <svg
        className="landing-doodle-float absolute bottom-[20%] right-[10%] h-28 w-28 -rotate-12 text-[#52796F] opacity-25"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10,30 L90,25 L85,70 L15,75 Z" strokeWidth="3" />
        <circle cx="50" cy="50" r="12" strokeWidth="3" />
        <path
          d="M20,40 L30,40 M70,60 L80,60 M20,60 L30,60 M70,40 L80,40"
          strokeWidth="3"
        />
      </svg>

      {/* Wallet */}
      <svg
        className="landing-doodle-float-delayed absolute bottom-[25%] left-[10%] h-24 w-24 rotate-15 text-gray-400 opacity-30"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M15,35 L85,35 C90,35 90,75 85,75 L15,75 C10,75 10,35 15,35 Z"
          strokeWidth="3"
        />
        <path d="M15,35 C15,25 40,25 85,35" strokeWidth="3" />
        <rect x="65" y="45" width="25" height="20" rx="4" strokeWidth="3" />
        <circle cx="77" cy="55" r="3" fill="currentColor" />
      </svg>

      {/* Growth chart */}
      <svg
        className="landing-doodle-float absolute right-[25%] top-[60%] h-20 w-20 text-gray-300 opacity-50"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15,90 L15,15 M15,90 L90,90" />
        <path d="M25,75 L45,50 L65,60 L85,25" />
        <path d="M65,25 L85,25 L85,45" />
      </svg>

      {/* Star */}
      <svg
        className="landing-doodle-float-delayed absolute left-[25%] top-[45%] h-8 w-8 text-yellow-400 opacity-50"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50,10 L60,40 L90,50 L60,60 L50,90 L40,60 L10,50 L40,40 Z" />
      </svg>

      {/* Soft blob */}
      <svg
        className="landing-doodle-float absolute left-[-5%] top-[60%] h-56 w-56 text-[#CAD2C5] opacity-20"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path
          d="M50,10 C75,12 90,30 85,55 C80,85 45,95 20,75 C-5,55 10,20 50,10 Z"
          fill="#CAD2C5"
          opacity="0.4"
        />
        <path
          d="M50,10 C75,12 90,30 85,55 C80,85 45,95 20,75 C-5,55 10,20 50,10 Z"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
      </svg>
    </div>
  );
}
