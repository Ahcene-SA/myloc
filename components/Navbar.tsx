"use client";

import { useState, useEffect } from "react";
import { Menu, X, UserRound } from "lucide-react";
import { Logo } from "./Brand";
import { WhatsAppIcon } from "./FloatingWhatsApp";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { pageUrl } from "@/lib/routes";
import { LangSwitch, useLang } from "@/lib/i18n";

const mainLinks = [
  { href: "#vehicules", label: "Véhicules" },
  { href: "#avantages", label: "Avantages" },
  { href: "#agences", label: "Agences" },
  { href: "#a-propos", label: "À propos" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("accueil");
  const { t } = useLang();

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

  // Menu mobile ouvert : page bloquée derrière, fermeture avec Échap
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <>
    {/* Voile sombre derrière le menu mobile : un clic le referme */}
    <div
      aria-hidden="true"
      onClick={() => setIsOpen(false)}
      className={cn(
        "fixed inset-0 z-[65] bg-navy/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    />
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[70] transition-all duration-500",
        scrolled || isOpen ? "bg-white/90 shadow-[0_1px_0_var(--line)] backdrop-blur-md" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-22 lg:px-8">
        <a href="#accueil" aria-label={t("MYLOC.DZ, retour à l'accueil")} className="flex-shrink-0">
          <Logo />
        </a>

        <nav className="hidden items-center gap-8 lg:flex" aria-label={t("Navigation principale")}>
          {mainLinks.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "nav-link relative text-[13px] font-bold uppercase tracking-[0.12em] transition-colors hover:text-sky-text",
                  isActive ? "text-sky-text" : "text-navy"
                )}
              >
                {t(link.label)}
                <span
                  className={cn(
                    "absolute -bottom-2 start-0 h-[3px] rounded-full bg-sky transition-all duration-300",
                    isActive ? "w-6" : "w-0"
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LangSwitch />
          <a
            href={pageUrl("client")}
            className="flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-bold text-navy transition-colors hover:text-sky-text"
          >
            <UserRound className="h-4 w-4" />
            {t("Mon espace")}
          </a>
          <a
            href={site.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-full bg-sky px-5 text-[13px] font-bold text-navy transition-colors hover:bg-sky-mid hover:text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t("Réserver")}
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
        <LangSwitch />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white lg:hidden"
          aria-label={isOpen ? t("Fermer le menu") : t("Ouvrir le menu")}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden bg-white transition-all duration-300 lg:hidden",
          isOpen
            ? "max-h-[calc(100svh-4.5rem)] overflow-y-auto rounded-b-3xl opacity-100 shadow-[0_24px_40px_-12px_rgba(15,27,45,0.35)]"
            : "pointer-events-none max-h-0 opacity-0"
        )}
      >
        <nav className="flex flex-col px-4 pb-6 pt-2" aria-label={t("Navigation mobile")}>
          {mainLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="border-b border-line py-4 text-lg font-extrabold uppercase tracking-wide text-navy"
            >
              {t(link.label)}
            </a>
          ))}
          <a
            href={pageUrl("client")}
            onClick={() => setIsOpen(false)}
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full border-2 border-navy text-sm font-bold text-navy"
          >
            <UserRound className="h-4 w-4" />
            {t("Mon espace")}
          </a>
          <a
            href={site.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="mt-2 flex h-13 items-center justify-center gap-2 rounded-full bg-sky text-base font-bold text-navy"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t("Réserver sur WhatsApp")}
          </a>
        </nav>
      </div>
    </header>
    </>
  );
}
