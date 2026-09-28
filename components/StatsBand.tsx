"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Car, Clock3, Headphones, MapPin } from "lucide-react";
import { fetchCars } from "@/lib/api";
import { site } from "@/lib/site";
import { useLang } from "@/lib/i18n";

/** Nombre qui défile de 0 à sa valeur quand il apparaît à l'écran. */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = `${to}${suffix}`;
      return;
    }
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, suffix, reduce]);

  return (
    <span ref={ref}>
      0{suffix}
    </span>
  );
}

export function StatsBand() {
  const [fleet, setFleet] = useState(7);
  const { t } = useLang();

  useEffect(() => {
    let cancelled = false;
    fetchCars()
      .then((c) => !cancelled && c.length > 0 && setFleet(c.length))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { icon: Car, value: fleet, suffix: "", label: t("véhicules récents") },
    { icon: MapPin, value: site.agencies.length, suffix: "", label: t("points de retrait") },
    // « 24/7 » est un libellé, pas une quantité : affiché tel quel (pas de 21/7, 22/7…)
    { icon: Headphones, value: 24, suffix: "/7", label: t("assistance"), fixed: true },
    { icon: Clock3, value: 2, suffix: ` ${t("min")}`, label: t("pour réserver") },
  ];

  return (
    <section aria-label={t("MYLOC.DZ en chiffres")} className="relative overflow-hidden bg-navy py-12 text-white lg:py-16">
      <div aria-hidden="true" className="absolute -left-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-sky/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-32 -top-20 h-64 w-64 rounded-full bg-sky/10 blur-3xl" />
      <ul className="relative mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map(({ icon: Icon, value, suffix, label, fixed }, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="flex flex-col items-center gap-2 text-center lg:border-s lg:border-white/10 lg:first:border-0"
          >
            <Icon className="h-6 w-6 text-sky" strokeWidth={1.8} />
            <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              {fixed ? (
                <bdi dir="ltr">
                  {value}
                  {suffix}
                </bdi>
              ) : (
                <Counter to={value} suffix={suffix} />
              )}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
