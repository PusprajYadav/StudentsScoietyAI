import type { RoomVariant, ToolWorkspace } from "../data/workspaceApps";

export function RoomIllustration({ variant }: { variant: RoomVariant }) {
  if (variant === "resume") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="12" width="128" height="96" rx="18" fill="rgba(255,255,255,0.14)" />
        <rect x="32" y="26" width="42" height="10" rx="5" fill="rgba(255,255,255,0.9)" />
        <rect x="32" y="44" width="96" height="8" rx="4" fill="rgba(255,255,255,0.28)" />
        <rect x="32" y="58" width="88" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
        <rect x="32" y="72" width="74" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
        <rect x="96" y="24" width="30" height="30" rx="10" fill="rgba(255,255,255,0.18)" />
        <rect x="96" y="62" width="30" height="26" rx="10" fill="rgba(255,255,255,0.12)" />
      </svg>
    );
  }

  if (variant === "interview") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="48" height="48" rx="16" fill="rgba(255,255,255,0.16)" />
        <rect x="94" y="16" width="48" height="48" rx="16" fill="rgba(255,255,255,0.1)" />
        <rect x="28" y="76" width="104" height="10" rx="5" fill="rgba(255,255,255,0.24)" />
        <rect x="40" y="92" width="78" height="8" rx="4" fill="rgba(255,255,255,0.14)" />
        <circle cx="42" cy="34" r="10" fill="rgba(255,255,255,0.85)" />
        <circle cx="118" cy="34" r="10" fill="rgba(255,255,255,0.65)" />
      </svg>
    );
  }

  if (variant === "portfolio") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="86" rx="18" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="28" width="40" height="28" rx="10" fill="rgba(255,255,255,0.72)" />
        <rect x="78" y="28" width="50" height="8" rx="4" fill="rgba(255,255,255,0.26)" />
        <rect x="78" y="42" width="38" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
        <rect x="30" y="66" width="98" height="8" rx="4" fill="rgba(255,255,255,0.24)" />
        <rect x="30" y="80" width="84" height="8" rx="4" fill="rgba(255,255,255,0.16)" />
      </svg>
    );
  }

  if (variant === "notes") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="24" y="12" width="52" height="96" rx="16" fill="rgba(255,255,255,0.16)" />
        <rect x="86" y="24" width="50" height="10" rx="5" fill="rgba(255,255,255,0.8)" />
        <rect x="86" y="44" width="42" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
        <rect x="86" y="58" width="48" height="8" rx="4" fill="rgba(255,255,255,0.16)" />
        <rect x="86" y="76" width="36" height="22" rx="10" fill="rgba(255,255,255,0.12)" />
      </svg>
    );
  }

  if (variant === "tracker") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="88" rx="20" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="28" width="40" height="40" rx="14" fill="rgba(255,255,255,0.16)" />
        <path d="M42 56L52 46L60 52L72 38" stroke="rgba(255,255,255,0.82)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="82" y="30" width="46" height="8" rx="4" fill="rgba(255,255,255,0.84)" />
        <rect x="82" y="46" width="38" height="8" rx="4" fill="rgba(255,255,255,0.26)" />
        <rect x="30" y="80" width="96" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
        <rect x="30" y="92" width="74" height="8" rx="4" fill="rgba(255,255,255,0.12)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="18" width="120" height="84" rx="18" fill="rgba(255,255,255,0.12)" />
      <path d="M48 78C48 61.4315 61.4315 48 78 48H112V78C112 84.6274 106.627 90 100 90H60C53.3726 90 48 84.6274 48 78Z" fill="rgba(255,255,255,0.18)" />
      <rect x="38" y="28" width="54" height="10" rx="5" fill="rgba(255,255,255,0.82)" />
      <rect x="100" y="28" width="22" height="22" rx="8" fill="rgba(255,255,255,0.2)" />
      <rect x="38" y="46" width="48" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

export function ToolIllustration({ variant }: { variant: ToolWorkspace }) {
  if (variant === "teacher") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="88" rx="22" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="28" width="48" height="64" rx="16" fill="rgba(255,255,255,0.16)" />
        <rect x="88" y="30" width="38" height="10" rx="5" fill="rgba(255,255,255,0.84)" />
        <rect x="88" y="48" width="28" height="8" rx="4" fill="rgba(255,255,255,0.24)" />
        <rect x="88" y="62" width="34" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
        <path d="M54 48C48.4772 48 44 52.4772 44 58V62C44 67.5228 48.4772 72 54 72C59.5228 72 64 67.5228 64 62V58C64 52.4772 59.5228 48 54 48Z" fill="rgba(255,255,255,0.78)" />
        <path d="M44 80C47.6 74.6667 51.3333 72 55.2 72C59.0667 72 62.6667 74.6667 66 80" stroke="rgba(255,255,255,0.78)" strokeWidth="5.5" strokeLinecap="round" />
        <circle cx="116" cy="80" r="16" fill="rgba(255,255,255,0.16)" />
        <path d="M108 80H124" stroke="rgba(255,255,255,0.82)" strokeWidth="5" strokeLinecap="round" />
        <path d="M116 72V88" stroke="rgba(255,255,255,0.82)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "audio") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="88" rx="22" fill="rgba(255,255,255,0.12)" />
        <path d="M50 60C50 51.1634 57.1634 44 66 44H72V76H66C57.1634 76 50 68.8366 50 60Z" fill="rgba(255,255,255,0.78)" />
        <path d="M110 44H94V76H110C118.837 76 126 68.8366 126 60C126 51.1634 118.837 44 110 44Z" fill="rgba(255,255,255,0.22)" />
        <path d="M80 34V86" stroke="rgba(255,255,255,0.92)" strokeWidth="6" strokeLinecap="round" />
        <path d="M30 70C34 62 38 58 42 58" stroke="rgba(255,255,255,0.24)" strokeWidth="6" strokeLinecap="round" />
        <path d="M30 50C36 40 44 34 52 34" stroke="rgba(255,255,255,0.16)" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === "image") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="16" width="128" height="88" rx="20" fill="rgba(255,255,255,0.12)" />
        <rect x="28" y="28" width="104" height="52" rx="14" fill="rgba(255,255,255,0.16)" />
        <circle cx="48" cy="46" r="8" fill="rgba(255,255,255,0.82)" />
        <path
          d="M36 78L62 54C65.351 50.907 70.52 51.0697 73.67 54.3672L85.2 66.4375C88.3658 69.7521 93.576 69.8971 96.9215 66.7641L111 53.5833L124 78H36Z"
          fill="rgba(255,255,255,0.26)"
        />
        <rect x="36" y="88" width="56" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
      </svg>
    );
  }

  if (variant === "code") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="88" rx="20" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="28" width="100" height="54" rx="14" fill="rgba(255,255,255,0.16)" />
        <path d="M54 45L42 55L54 65" stroke="rgba(255,255,255,0.82)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M106 45L118 55L106 65" stroke="rgba(255,255,255,0.82)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M84 42L74 68" stroke="rgba(255,255,255,0.68)" strokeWidth="6" strokeLinecap="round" />
        <rect x="36" y="90" width="50" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
      </svg>
    );
  }

  if (variant === "notes") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="24" y="12" width="112" height="96" rx="20" fill="rgba(255,255,255,0.12)" />
        <rect x="38" y="24" width="36" height="72" rx="14" fill="rgba(255,255,255,0.16)" />
        <rect x="84" y="28" width="36" height="8" rx="4" fill="rgba(255,255,255,0.82)" />
        <rect x="84" y="44" width="30" height="8" rx="4" fill="rgba(255,255,255,0.26)" />
        <rect x="84" y="60" width="34" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
        <rect x="84" y="78" width="28" height="20" rx="10" fill="rgba(255,255,255,0.16)" />
      </svg>
    );
  }

  if (variant === "bugfix") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="124" height="84" rx="22" fill="rgba(255,255,255,0.12)" />
        <rect x="32" y="30" width="62" height="10" rx="5" fill="rgba(255,255,255,0.84)" />
        <rect x="32" y="50" width="54" height="8" rx="4" fill="rgba(255,255,255,0.24)" />
        <rect x="32" y="64" width="44" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
        <path
          d="M111 42C103.82 42 98 47.8203 98 55C98 60.5646 101.496 65.3125 106.414 67.1827V75.5C106.414 78.5376 108.877 81 111.914 81H112.086C115.123 81 117.586 78.5376 117.586 75.5V67.1827C122.504 65.3125 126 60.5646 126 55C126 47.8203 120.18 42 113 42H111Z"
          fill="rgba(255,255,255,0.2)"
        />
        <circle cx="107" cy="54" r="3" fill="rgba(255,255,255,0.9)" />
        <circle cx="117" cy="54" r="3" fill="rgba(255,255,255,0.9)" />
      </svg>
    );
  }

  if (variant === "qr") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="16" width="124" height="88" rx="22" fill="rgba(255,255,255,0.12)" />
        <rect x="30" y="28" width="34" height="34" rx="8" fill="rgba(255,255,255,0.82)" />
        <rect x="96" y="28" width="34" height="34" rx="8" fill="rgba(255,255,255,0.22)" />
        <rect x="30" y="70" width="34" height="22" rx="8" fill="rgba(255,255,255,0.2)" />
        <rect x="74" y="70" width="18" height="18" rx="5" fill="rgba(255,255,255,0.84)" />
        <rect x="100" y="76" width="10" height="10" rx="3" fill="rgba(255,255,255,0.74)" />
        <rect x="116" y="70" width="14" height="14" rx="4" fill="rgba(255,255,255,0.36)" />
        <rect x="82" y="40" width="10" height="10" rx="3" fill="rgba(255,255,255,0.58)" />
        <rect x="82" y="54" width="22" height="10" rx="3" fill="rgba(255,255,255,0.16)" />
      </svg>
    );
  }

  if (variant === "barcode") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="124" height="84" rx="22" fill="rgba(255,255,255,0.12)" />
        <rect x="32" y="28" width="4" height="52" rx="2" fill="rgba(255,255,255,0.84)" />
        <rect x="40" y="28" width="8" height="52" rx="2" fill="rgba(255,255,255,0.22)" />
        <rect x="52" y="28" width="3" height="52" rx="1.5" fill="rgba(255,255,255,0.82)" />
        <rect x="59" y="28" width="6" height="52" rx="2" fill="rgba(255,255,255,0.34)" />
        <rect x="69" y="28" width="4" height="52" rx="2" fill="rgba(255,255,255,0.76)" />
        <rect x="77" y="28" width="10" height="52" rx="2" fill="rgba(255,255,255,0.18)" />
        <rect x="91" y="28" width="5" height="52" rx="2" fill="rgba(255,255,255,0.88)" />
        <rect x="100" y="28" width="4" height="52" rx="2" fill="rgba(255,255,255,0.28)" />
        <rect x="108" y="28" width="11" height="52" rx="2" fill="rgba(255,255,255,0.72)" />
        <rect x="123" y="28" width="5" height="52" rx="2" fill="rgba(255,255,255,0.22)" />
        <rect x="42" y="88" width="76" height="8" rx="4" fill="rgba(255,255,255,0.16)" />
      </svg>
    );
  }

  if (variant === "mailer") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="124" height="84" rx="22" fill="rgba(255,255,255,0.12)" />
        <path d="M32 38C32 31.3726 37.3726 26 44 26H116C122.627 26 128 31.3726 128 38V82C128 88.6274 122.627 94 116 94H44C37.3726 94 32 88.6274 32 82V38Z" fill="rgba(255,255,255,0.16)" />
        <path d="M32 42L74.9408 68.3404C77.9911 70.2114 81.8281 70.2208 84.8874 68.3648L128 42" stroke="rgba(255,255,255,0.86)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="74" width="34" height="8" rx="4" fill="rgba(255,255,255,0.26)" />
        <rect x="84" y="74" width="24" height="8" rx="4" fill="rgba(255,255,255,0.18)" />
      </svg>
    );
  }

  if (variant === "instagram") {
    return (
      <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="18" width="124" height="84" rx="22" fill="rgba(255,255,255,0.12)" />
        <rect x="34" y="24" width="92" height="72" rx="24" fill="rgba(255,255,255,0.18)" />
        <rect x="44" y="34" width="72" height="52" rx="18" fill="rgba(255,255,255,0.12)" />
        <circle cx="80" cy="60" r="16" fill="rgba(255,255,255,0.82)" />
        <circle cx="80" cy="60" r="8" fill="rgba(67,21,110,0.28)" />
        <circle cx="104" cy="40" r="5" fill="rgba(255,255,255,0.88)" />
        <path d="M52 92H108" stroke="rgba(255,255,255,0.24)" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 120" className="h-16 w-full sm:h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="12" width="82" height="96" rx="18" fill="rgba(255,255,255,0.14)" />
      <rect x="42" y="28" width="50" height="10" rx="5" fill="rgba(255,255,255,0.86)" />
      <rect x="42" y="48" width="54" height="8" rx="4" fill="rgba(255,255,255,0.26)" />
      <rect x="42" y="62" width="46" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
      <rect x="42" y="76" width="40" height="8" rx="4" fill="rgba(255,255,255,0.16)" />
      <rect x="98" y="26" width="36" height="68" rx="14" fill="rgba(255,255,255,0.1)" />
      <rect x="106" y="38" width="20" height="20" rx="8" fill="rgba(255,255,255,0.18)" />
      <rect x="106" y="68" width="20" height="8" rx="4" fill="rgba(255,255,255,0.24)" />
    </svg>
  );
}
