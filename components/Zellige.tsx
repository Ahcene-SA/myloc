import { useId } from "react";
import { cn } from "@/lib/utils";

interface ZelligeProps {
  /** Taille d'un motif en px */
  size?: number;
  /** Couleur du trait */
  color?: string;
  className?: string;
  /** Ajoute un petit cercle au centre de chaque étoile */
  withDot?: boolean;
}

/**
 * Motif zellige : étoile à 8 branches (deux carrés superposés), répétée en fond.
 * Décoratif uniquement (aria-hidden).
 */
export function Zellige({ size = 56, color = "#D9C6A8", className, withDot = false }: ZelligeProps) {
  const id = useId().replace(/:/g, "");
  const a = size * 0.29;
  const b = size * 0.71;
  const m = size / 2;
  const r = size * 0.3;

  return (
    <svg className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden="true">
      <defs>
        <pattern id={`zellige-${id}`} width={size} height={size} patternUnits="userSpaceOnUse">
          <polygon points={`${a},${a} ${b},${a} ${b},${b} ${a},${b}`} fill="none" stroke={color} strokeWidth="1.2" />
          <polygon points={`${m},${m - r} ${m + r},${m} ${m},${m + r} ${m - r},${m}`} fill="none" stroke={color} strokeWidth="1.2" />
          {withDot && <circle cx={m} cy={m} r={size * 0.055} fill="none" stroke={color} strokeWidth="1.2" />}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#zellige-${id})`} />
    </svg>
  );
}

/** Une seule étoile à 8 branches, utilisée comme séparateur ou ornement. */
export function Star8({ className, color = "currentColor", strokeWidth = 1.6 }: { className?: string; color?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon points="6,6 18,6 18,18 6,18" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <polygon points="12,3.5 20.5,12 12,20.5 3.5,12" fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

/** Vague de séparation entre deux sections. */
export function Wave({ flip = false, className, color = "var(--sea)" }: { flip?: boolean; className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={cn("block h-10 w-full sm:h-16 lg:h-20", className)} aria-hidden="true">
      {flip ? (
        <path d="M0 0 L1440 0 L1440 40 C 1260 80, 1080 80, 900 40 S 540 0, 360 40 S 80 70, 0 50 Z" fill={color} />
      ) : (
        <path d="M0 40 C 180 0, 360 0, 540 40 S 900 80, 1080 40 S 1360 0, 1440 30 L1440 80 L0 80 Z" fill={color} />
      )}
    </svg>
  );
}
