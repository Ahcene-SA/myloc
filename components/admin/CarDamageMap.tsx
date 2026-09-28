"use client";

import { zoneLabels, type DamageZone } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/**
 * Voiture vue de dessus : on touche une zone pour signaler un dommage.
 * Rouge = dommage noté ; orange (retour) = nouveau par rapport au départ.
 */
const shapes: { zone: DamageZone; d: string }[] = [
  { zone: "avant", d: "M52 20 Q100 4 148 20 L152 44 L48 44 Z" },
  { zone: "capot", d: "M48 48 L152 48 L150 122 L50 122 Z" },
  { zone: "pare-brise", d: "M52 126 L148 126 L140 156 L60 156 Z" },
  { zone: "toit", d: "M60 160 L140 160 L140 262 L60 262 Z" },
  { zone: "coffre", d: "M60 266 L140 266 L150 336 L50 336 Z" },
  { zone: "arriere", d: "M48 340 L152 340 L148 368 Q100 384 52 368 Z" },
  { zone: "flanc-gauche", d: "M22 70 L44 58 L44 342 L22 330 Z" },
  { zone: "flanc-droit", d: "M178 70 L156 58 L156 342 L178 330 Z" },
];

const wheels = [
  { x: 6, y: 78 },
  { x: 178, y: 78 },
  { x: 6, y: 272 },
  { x: 178, y: 272 },
];

export function CarDamageMap({
  marked,
  highlight = [],
  onToggle,
  className,
}: {
  marked: DamageZone[];
  /** Zones à mettre en avant (nouveaux dommages au retour) */
  highlight?: DamageZone[];
  onToggle?: (z: DamageZone) => void;
  className?: string;
}) {
  const { t } = useLang();
  const isOn = (z: DamageZone) => marked.includes(z);
  const fill = (z: DamageZone) => (highlight.includes(z) ? "#f59e0b" : isOn(z) ? "#ef4444" : "#e8eef5");
  const interactive = !!onToggle;

  const zoneProps = (z: DamageZone) =>
    interactive
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-pressed": isOn(z),
          "aria-label": `${t(zoneLabels[z])}${isOn(z) ? ` : ${t("dommage signalé")}` : ""}`,
          onClick: () => onToggle?.(z),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle?.(z);
            }
          },
          className: "cursor-pointer outline-none transition-[fill] hover:opacity-80 focus-visible:stroke-sky focus-visible:[stroke-width:3]",
        }
      : { "aria-hidden": true as const };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg viewBox="0 0 200 390" className="h-72 w-auto select-none" role="group" aria-label={t("Carrosserie vue de dessus")}>
        <text x="100" y="0" dy="-2" textAnchor="middle" className="fill-muted text-[10px] font-bold" style={{ letterSpacing: 2 }}>
          {t("AVANT")}
        </text>
        {wheels.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width="16"
            height="44"
            rx="6"
            fill={fill("jantes")}
            stroke="#0f1b2d"
            strokeWidth="1.5"
            {...zoneProps("jantes")}
          />
        ))}
        <path d="M50 16 Q100 -2 150 16 L182 70 L182 330 L150 372 Q100 392 50 372 L18 330 L18 70 Z" fill="#fff" stroke="#0f1b2d" strokeWidth="2" />
        {shapes.map((s) => (
          <path key={s.zone} d={s.d} fill={fill(s.zone)} stroke="#0f1b2d" strokeWidth="1.2" strokeLinejoin="round" {...zoneProps(s.zone)} />
        ))}
        {/* rétroviseurs */}
        <rect x="8" y="140" width="12" height="8" rx="3" fill="#0f1b2d" aria-hidden="true" />
        <rect x="180" y="140" width="12" height="8" rx="3" fill="#0f1b2d" aria-hidden="true" />
      </svg>
      {interactive && (
        <button
          type="button"
          onClick={() => onToggle?.("interieur")}
          aria-pressed={isOn("interieur")}
          className={cn(
            "rounded-full border-2 px-4 py-1.5 text-xs font-bold",
            isOn("interieur") ? "border-red-500 bg-red-50 text-red-700" : "border-line text-navy hover:border-navy"
          )}
        >
          {t("Intérieur")} {isOn("interieur") ? `· ${t("dommage signalé")}` : ""}
        </button>
      )}
      {!interactive && isOn("interieur") && <p className="text-xs font-bold text-red-700">{t("Dommage intérieur signalé")}</p>}
    </div>
  );
}

/** Jauge de carburant en huitièmes. */
export function FuelGauge({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2" role={onChange ? "radiogroup" : undefined} aria-label={t("Niveau de carburant")}>
      <span className="text-xs font-bold text-muted">{t("V")}</span>
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => {
          const level = i + 1;
          const on = value !== null && level <= value;
          const Tag = onChange ? "button" : "span";
          return (
            <Tag
              key={level}
              {...(onChange
                ? { type: "button" as const, onClick: () => onChange(level), role: "radio", "aria-checked": value === level, "aria-label": `${level}/8` }
                : {})}
              className={cn(
                "block h-7 w-5 rounded-md border-2 transition-colors",
                on ? (value !== null && value <= 2 ? "border-red-500 bg-red-500" : "border-sky bg-sky") : "border-line bg-white",
                onChange && "hover:border-navy"
              )}
            />
          );
        })}
      </div>
      <span className="text-xs font-bold text-muted">{t("P")}</span>
      <span className="ms-2 text-sm font-extrabold text-navy">{value !== null ? `${value}/8` : "—"}</span>
    </div>
  );
}
