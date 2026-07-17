"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CarFront,
  MessageSquare,
  Send,
} from "lucide-react";

const categories = [
  { value: "", label: "Catégorie préférée" },
  { value: "citadine", label: "Citadine" },
  { value: "suv", label: "SUV" },
  { value: "berline", label: "Berline" },
];

export function Booking() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    pickup: "",
    return: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    category: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines = [
      `Nouvelle demande de réservation MYLOC.DZ`,
      ``,
      `Nom : ${form.name}`,
      `Téléphone : ${form.phone}`,
      `Email : ${form.email || "Non renseigné"}`,
      ``,
      `Prise en charge : ${form.pickup}`,
      `Retour : ${form.return}`,
      `Départ : ${form.startDate} à ${form.startTime}`,
      `Retour : ${form.endDate} à ${form.endTime}`,
      `Catégorie : ${form.category || "Non précisée"}`,
      ``,
      `Message :`,
      form.message || "Aucun message complémentaire",
    ];

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/213555000000?text=${text}`, "_blank");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section id="reserver" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-brand/10 p-10"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
              <Send className="h-7 w-7" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              Votre demande est prête à être envoyée
            </h2>
            <p className="mt-3 text-slate-600">
              WhatsApp devrait s’être ouvert avec vos informations. Si ce n’est pas le cas,
              vous pouvez réessayer ou nous contacter directement.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Nouvelle réservation
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="reserver" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-brand">
            Réservation
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Réservez votre véhicule
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Remplissez le formulaire ci-dessous. Nous vous recontacterons dans les plus brefs
            délais pour confirmer votre location.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-12 max-w-4xl space-y-5 rounded-3xl bg-slate-50 p-6 shadow-lg shadow-slate-200/50 sm:p-10"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nom complet"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Téléphone"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email (optionnel)"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <CarFront className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="text"
                name="pickup"
                value={form.pickup}
                onChange={handleChange}
                placeholder="Adresse de prise en charge"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="text"
                name="return"
                value={form.return}
                onChange={handleChange}
                placeholder="Adresse de retour"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                required
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                placeholder="Heure de retour"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              required
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder="Message complémentaire (optionnel)"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover hover:shadow-brand/40"
          >
            <Send className="h-5 w-5" />
            Envoyer la demande via WhatsApp
          </button>

          <p className="text-center text-xs text-slate-500">
            En envoyant, vous serez redirigé vers WhatsApp avec un récapitulatif de votre
            demande.
          </p>
        </motion.form>
      </div>
    </section>
  );
}
