import Image from "next/image";

const LOGO_SIZE = {
  sm: 28,
  md: 40,
  lg: 72,
} as const;

const TEXT_SIZE = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl sm:text-4xl",
} as const;

/**
 * App identity mark — official FIFA World Cup 26 trophy logo + the
 * eXFormation wordmark. One shared component so every surface (Home,
 * Login, Draft, Admin) renders identical branding.
 */
export function AppBrand({
  size = "md",
  subtitle,
}: {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}) {
  const px = LOGO_SIZE[size];
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/fifa-wc-logo.png"
        alt="FIFA World Cup 26"
        width={px}
        height={px}
        className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
        priority
      />
      <div className="leading-tight">
        <p className={`font-black tracking-tight text-white ${TEXT_SIZE[size]}`}>eXFormation</p>
        {subtitle && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
