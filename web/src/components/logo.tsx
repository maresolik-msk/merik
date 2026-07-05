export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Merik">
      <path fill="#D93A31" d="M10 14 L30 14 L50 44 L44 60 L28 36 L28 86 L10 86 Z" />
      <path fill="#D93A31" d="M90 14 L70 14 L50 44 L56 60 L72 36 L72 86 L90 86 Z" />
      <path fill="#D93A31" d="M38 62 L50 80 L62 62 L54 50 L50 56 L46 50 Z" />
    </svg>
  );
}
