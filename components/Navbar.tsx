"use client";

import { useState, useEffect } from "react";
import { Menu, X, UserRound, LayoutDashboard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const mainLinks = [
  { href: "#vehicules", label: "Nos véhicules" },
  { href: "#avantages", label: "Pourquoi nous" },
  { href: "#agences", label: "Agences" },
  { href: "#a-propos", label: "À propos" },
  { href: "#contact", label: "Contact" },
];

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline font-display text-[28px] leading-none", className)}>
      <span className={cn("font-bold tracking-tight", light ? "text-sand" : "text-ink")}>MYLOC</span>
      <span className={cn("font-semibold italic", light ? "text-terra-light" : "text-terra")}>.dz</span>
    </span>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );
    ["accueil", "vehicules", "avantages", "agences", "a-propos", "contact"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Bloque le scroll de la page quand le menu mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[70] transition-all duration-500",
        scrolled || isOpen ? "bg-cream/90 shadow-[0_1px_0_#E6D6BC] backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-22 lg:px-8">
        <a href="#accueil" aria-label="MYLOC.DZ, retour à l'accueil" className="flex-shrink-0">
          <Logo />
        </a>

        {/* Navigation desktop */}
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Navigation principale">
          {mainLinks.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative text-[15px] font-semibold transition-colors hover:text-terra",
                  isActive ? "text-terra" : "text-ink"
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1.5 left-0 h-[2px] rounded-full bg-terra transition-all duration-300",
                    isActive ? "w-full" : "w-0"
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href="admin.html"
            className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </a>
          <a
            href="client.html"
            className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-sand"
          >
            <UserRound className="h-4 w-4" />
            Mon espace
          </a>
        </div>

        {/* Bouton menu mobile */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sand lg:hidden"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={cn(
          "overflow-hidden bg-cream transition-all duration-300 lg:hidden",
          isOpen ? "max-h-[36rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        )}
      >
        <nav className="flex flex-col px-4 pb-6 pt-2" aria-label="Navigation mobile">
          {mainLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="border-b border-sand-deep py-4 font-display text-2xl font-semibold text-ink"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a
              href="client.html"
              onClick={() => setIsOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink text-sm font-bold text-ink"
            >
              <UserRound className="h-4 w-4" />
              Mon espace
            </a>
            <a
              href="admin.html"
              onClick={() => setIsOpen(false)}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-sand-deep text-sm font-bold text-ink"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </a>
          </div>
          <a
            href="#vehicules"
            onClick={() => setIsOpen(false)}
            className="mt-2 flex h-13 items-center justify-center gap-2 rounded-full bg-terra text-base font-bold text-white"
          >
            Réserver maintenant
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}
