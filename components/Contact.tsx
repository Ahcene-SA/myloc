"use client";

import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";

const contacts = [
  {
    icon: Phone,
    label: "Téléphone",
    value: "+213 555 00 00 00",
    href: "tel:+213555000000",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+213 555 00 00 00",
    href: "https://wa.me/213555000000",
  },
  {
    icon: Mail,
    label: "Email",
    value: "contact@myloc.dz",
    href: "mailto:contact@myloc.dz",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "Alger, Algérie",
    href: "#",
  },
];

export function Contact() {
  return (
    <section id="contact" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-brand-dark">
          <div className="grid lg:grid-cols-2">
            {/* Left: CTA + info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 text-white sm:p-12 lg:p-16"
            >
              <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
                Contactez-nous
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Prêt à prendre la route ?
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-300">
                Notre équipe vous répond en quelques minutes. Appelez, envoyez un message
                ou réservez directement en ligne.
              </p>

              <div className="mt-8 space-y-4">
                {contacts.map((contact, index) => (
                  <motion.a
                    key={contact.label}
                    href={contact.href}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 transition-colors hover:bg-white/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <contact.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {contact.label}
                      </div>
                      <div className="font-semibold text-white">{contact.value}</div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Right: Hours + final CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col justify-between bg-brand p-8 sm:p-12 lg:p-16"
            >
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Clock className="h-7 w-7" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Horaires d’ouverture</h3>
                <ul className="mt-6 space-y-3 text-white/90">
                  <li className="flex justify-between">
                    <span>Lundi – Samedi</span>
                    <span className="font-semibold">08h00 – 20h00</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Dimanche</span>
                    <span className="font-semibold">09h00 – 18h00</span>
                  </li>
                  <li className="flex justify-between border-t border-white/20 pt-3">
                    <span>Assistance</span>
                    <span className="font-semibold">24h/24 – 7j/7</span>
                  </li>
                </ul>
              </div>

              <a
                href="#"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-4 text-center text-lg font-bold text-brand shadow-lg transition-transform hover:scale-[1.02]"
              >
                Créer un compte pour réserver
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
