import { cn } from "@/lib/utils";

/* ───────────────────────── Logo ─────────────────────────
   Reproduction du logo MYLOC.DZ (photo de profil Instagram) :
   icône voiture au trait bleu ciel · séparateur · MYLOC.DZ / CAR RENTAL.
   ➜ Remplacer par le fichier officiel (SVG/PNG) dès que le client le fournit. */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M62 5C47 4 33 7 21 15" strokeWidth="2.6" />
      <path d="M62 10C49 10 37 12 27 18" strokeWidth="1.6" />
      <path d="M21 15C15 19 9 21 3 22" strokeWidth="2.6" />
      <path d="M3 22c0 7 2 13 5 19" strokeWidth="2.2" />
      <path d="M5 23.5l10 3.5" strokeWidth="3.4" />
      <path d="M15 31h47" strokeWidth="1.4" />
      <path d="M11 37h51" strokeWidth="4.2" />
      <path d="M9 43.5h53" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo({ light = false, compact = false, className }: { light?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-12 flex-shrink-0 text-sky" />
      <span className={cn("h-9 w-px", light ? "bg-white/25" : "bg-sky/40")} />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[22px] font-extrabold tracking-[0.02em]", light ? "text-white" : "text-navy")}>
          MYLOC<span className="text-sky">.DZ</span>
        </span>
        {!compact && (
          <>
            {/* Slogan traduit par CSS (variante rtl, basée sur :lang : pas d'attribut lang ici) : le logo reste utilisable hors du contexte de langue */}
            <span className={cn("mt-1 text-[9.5px] font-medium tracking-[0.34em] rtl:hidden", light ? "text-white/70" : "text-navy/75")}>
              CAR RENTAL
            </span>
            <span className={cn("mt-1 hidden text-[12px] font-semibold rtl:block", light ? "text-white/70" : "text-navy/75")}>
              تأجير السيارات
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/* ─────────────────── Éléments de la charte ─────────────────── */

/** Surtitre + titre en majuscules avec mot bleu + petit trait, comme les posts Instagram. */
export function BrandHeading({
  overline,
  children,
  className,
  align = "left",
  light = false,
  as: Tag = "h2",
}: {
  overline?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
  light?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" && "items-center text-center", className)}>
      {overline && <span className={cn("kicker", light ? "text-white/80" : "text-navy/80")}>{overline}</span>}
      <Tag
        className={cn(
          "text-balance text-[34px] font-extrabold uppercase leading-[1.02] tracking-[-0.01em] sm:text-5xl lg:text-[56px]",
          light ? "text-white" : "text-navy"
        )}
      >
        {children}
      </Tag>
      <BlueBar />
    </div>
  );
}

export function BlueBar({ className }: { className?: string }) {
  return <span className={cn("block h-[3px] w-14 rounded-full bg-sky", className)} aria-hidden="true" />;
}

/** Mot mis en avant en bleu dégradé. */
export function Sky({ children }: { children: React.ReactNode }) {
  return <span className="text-sky-gradient">{children}</span>;
}

/** Ombre de feuilles de palmier (décor des visuels Instagram). */
export function PalmShadow({ className, flip = false }: { className?: string; flip?: boolean }) {
  const leaflets = Array.from({ length: 15 }, (_, i) => {
    const t = (i + 1) / 16;
    // point sur la nervure (courbe quadratique)
    const x = (1 - t) * (1 - t) * 20 + 2 * (1 - t) * t * 170 + t * t * 380;
    const y = (1 - t) * (1 - t) * 30 + 2 * (1 - t) * t * 40 + t * t * 230;
    const len = 150 - i * 7;
    return { x, y, len, i };
  });
  return (
    <svg
      viewBox="0 0 420 320"
      className={cn("pointer-events-none absolute", flip && "-scale-x-100", className)}
      aria-hidden="true"
    >
      <defs>
        <filter id="palm-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g filter="url(#palm-blur)" fill="#8C9AAB">
        <path d="M20 30 Q170 40 380 230" stroke="#8C9AAB" strokeWidth="6" fill="none" />
        {leaflets.map(({ x, y, len, i }) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M0 0 Q ${len * 0.5} ${-len * 0.35} ${len * 0.95} ${-len * 0.62} Q ${len * 0.45} ${-len * 0.2} 0 5 Z`} />
            <path d={`M0 0 Q ${-len * 0.1} ${len * 0.55} ${-len * 0.15} ${len * 0.95} Q ${len * 0.1} ${len * 0.45} 6 2 Z`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Silhouette d'Alger avec le Maqam Echahid, en filigrane. */
export function AlgiersSkyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" className={cn("pointer-events-none absolute", className)} aria-hidden="true">
      <g fill="currentColor">
        {/* immeubles */}
        <path d="M0 260V200h40v-22h30v22h26v-40h38v40h22v-28h34v28h30v-54h44v54h20v-32h36v32h24v-18h28v18h40V260Z" />
        <path d="M720 260v-44h30v-26h40v26h22v-50h36v50h28v-30h40v30h24v-60h44v60h26v-24h34v24h36v-40h40v40h30v-20h50v84Z" />
        {/* Maqam Echahid : trois palmes qui se rejoignent */}
        <path d="M560 260 C 566 170, 588 90, 604 22 L 610 22 C 600 96, 588 176, 590 260 Z" />
        <path d="M660 260 C 654 170, 632 90, 616 22 L 610 22 C 620 96, 632 176, 630 260 Z" />
        <path d="M603 260 C 604 170, 606 90, 608 30 L 612 30 C 614 90, 616 170, 617 260 Z" opacity="0.8" />
        <rect x="596" y="130" width="28" height="7" rx="2" />
        <path d="M600 22 h20 l-4 -10 h-12 Z" />
        {/* socle */}
        <path d="M520 260v-14h180v14Z" />
      </g>
    </svg>
  );
}

/** Grand cercle bleu ciel en transparence (décor). */
export function SkyCircle({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("pointer-events-none absolute rounded-full border-[42px] border-sky/10", className)} />;
}
