"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const mainLinks = [
  { href: "#accueil", label: "Accueil" },
  { href: "#vehicules", label: "Réserver" },
  { href: "#avantages", label: "Comment ça marche" },
  { href: "#a-propos", label: "À Propos" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        isTransparent
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
      )}
    >
      <div className="mx-auto flex h-16 md:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#accueil" className="flex items-center flex-shrink-0 group">
          <Image
            src="images/logo.svg"
            alt="MYLOC.DZ Car Rental"
            width={220}
            height={60}
            className={cn(
              "h-12 md:h-16 w-auto transition-all duration-300",
              isTransparent && "brightness-0 invert"
            )}
            priority
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Main nav pill */}
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-1.5 rounded-full transition-all duration-300 border",
              isTransparent
                ? "bg-white/10 backdrop-blur-md border-white/20"
                : "bg-gray-100 border-gray-200"
            )}
          >
            {mainLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[11px] xl:text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200",
                  isTransparent
                    ? "text-white/75 hover:text-white hover:bg-white/15"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white",
                  link.href === "#vehicules" &&
                    (isTransparent
                      ? "bg-white/20 text-white shadow-sm"
                      : "bg-white text-[#00bf63] shadow-sm")
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Utility nav pill */}
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-1.5 rounded-full transition-all duration-300 border",
              isTransparent
                ? "bg-white/10 backdrop-blur-md border-white/20"
                : "bg-gray-100 border-gray-200"
            )}
          >
            <a
              href="admin.html"
              className={cn(
                "flex items-center gap-1.5 text-[11px] xl:text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200",
                isTransparent
                  ? "text-white/75 hover:text-white hover:bg-white/15"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              )}
            >
              <FileText className="w-3 h-3" />
              Admin
            </a>
            <span
              className={cn(
                "w-px h-4 mx-0.5",
                isTransparent ? "bg-white/20" : "bg-gray-300"
              )}
            />
            <a
              href="client.html"
              className={cn(
                "flex items-center gap-1.5 text-[11px] xl:text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200",
                isTransparent
                  ? "text-white/75 hover:text-white hover:bg-white/15"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
              )}
            >
              <User className="w-3 h-3" />
              Mon espace
            </a>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "lg:hidden p-2.5 rounded-xl transition-colors",
            isTransparent
              ? "text-white hover:bg-white/10"
              : "text-gray-700 hover:bg-gray-100"
          )}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        className={cn(
          "lg:hidden transition-all duration-300 overflow-hidden border-t border-gray-100 bg-white",
          isOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {mainLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center py-2.5 px-3 rounded-xl text-sm font-medium transition-colors",
                link.href === "#vehicules"
                  ? "text-[#00bf63] bg-[#00bf63]/5"
                  : "text-gray-700 hover:text-[#00bf63] hover:bg-gray-50"
              )}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <a
              href="admin.html"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 py-2.5 px-3 rounded-xl hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Admin
            </a>
            <a
              href="client.html"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 py-2.5 px-3 rounded-xl hover:bg-gray-50"
            >
              <User className="w-4 h-4" />
              Mon Espace
            </a>
            <a
              href="#vehicules"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 text-sm font-bold text-white py-3 px-4 rounded-xl bg-[#00bf63] hover:opacity-90 transition-opacity"
            >
              Réserver maintenant →
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
