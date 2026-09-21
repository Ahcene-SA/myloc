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
    <section id="contact" className="mx-3 sm:mx-4 mt-6 bg-white rounded-[2.5rem] overflow-hidden shadow-2xl py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
            Contactez-nous
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Prêt à prendre la route ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Notre équipe vous répond en quelques minutes. Appelez, envoyez un message
            ou réservez directement en ligne.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {contacts.map((contact, index) => (
              <motion.a
                key={contact.label}
                href={contact.href}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="flex items-center gap-4 rounded-2xl bg-slate-50 p-5 transition-all duration-300 hover:bg-slate-100"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors">
                  <contact.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {contact.label}
                  </div>
                  <div className="font-semibold text-slate-800">{contact.value}</div>
                </div>
              </motion.a>
            ))}
          </motion.div>

          {/* Hours Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-[2rem] bg-brand p-8 sm:p-12"
          >
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-white">Horaires d'ouverture</h3>
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

            <a
              href="#vehicules"
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-4 text-center text-lg font-bold text-brand shadow-lg transition-transform hover:scale-[1.02]"
            >
              Créer un compte pour réserver
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
