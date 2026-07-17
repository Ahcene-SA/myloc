"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#accueil", label: "Accueil" },
  { href: "#vehicules", label: "Véhicules" },
  { href: "#avantages", label: "Avantages" },
  { href: "#a-propos", label: "À propos" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#accueil" className="flex items-center gap-2">
          <Image
            src="images/logo.svg"
            alt="MYLOC.DZ Car Rental"
            width={220}
            height={60}
            className="h-14 w-auto"
            priority
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 rounded-full bg-slate-100/80 px-2 py-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a
            href="admin.html"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand"
          >
            Admin
          </a>
          <a
            href="login.html"
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Log in
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 md:hidden"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        className={cn(
          "overflow-hidden border-b border-slate-200/60 bg-white transition-all duration-300 md:hidden",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
          <a
            href="admin.html"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Admin
          </a>
          <a
            href="login.html"
            onClick={() => setIsOpen(false)}
            className="mt-2 rounded-full bg-brand px-4 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Log in
          </a>
        </nav>
      </div>
    </header>
  );
}
