"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClient } from "./ClientContext";
import { useAuth } from "./AuthContext";
import { fetchCars, mapApiCarToCar, fetchMyReservations, CarFromApi } from "@/lib/api";
import {
  User,
  Calendar,
  PlusCircle,
  CreditCard,
  Settings,
  Car,
  Clock,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit3,
  Save,
  Settings2,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertCircle,
  ScrollText,
  Banknote,
  Info,
  ShieldCheck,
  Package,
  ArrowRight,
  Send,
} from "lucide-react";

export function ClientContent() {
  const { activeTab } = useClient();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === "accueil" && <AccueilView />}
        {activeTab === "profil" && <ProfilView />}
        {activeTab === "reservations" && <ReservationsView />}
        {activeTab === "reserver" && <ReserverView />}
        {activeTab === "paiements" && <PaiementsView />}
        {activeTab === "parametres" && <ParametresView />}
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
    </div>
  );
}

function AccueilView() {
  const { setActiveTab } = useClient();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "client";
  const initial = (user?.full_name?.[0] || "C").toUpperCase();
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Bonjour, {firstName} 👋
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Voici un aperçu de votre espace personnel.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Calendar} value="3" label="Réservations" color="brand" />
        <StatCard icon={Car} value="1" label="Véhicule actif" color="green" />
        <StatCard icon={Clock} value="12" label="Jours restants" color="orange" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 lg:col-span-2">
          <SectionHeader icon={Calendar} title="Dernières réservations" />
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-slate-200" />
                  <div>
                    <div className="font-bold text-slate-900">Audi A4</div>
                    <div className="text-sm text-slate-500">Du 12 au 18 juillet 2026</div>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50">
          <SectionHeader icon={User} title="Mon profil" />
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">
                {initial}
              </div>
              <div className="mt-3 font-bold text-slate-900">{user?.full_name || "Client MYLOC"}</div>
              <div className="text-sm text-slate-500">{user?.email || "client@myloc.dz"}</div>
            </div>
            <button
              onClick={() => setActiveTab("profil")}
              className="w-full rounded-xl bg-brand px-4 py-3 font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Modifier le profil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilView() {
  const { user } = useAuth();
  const initial = (user?.full_name?.[0] || "C").toUpperCase();
  const firstName = user?.full_name?.split(" ")[0] || "";
  const lastName = user?.full_name?.split(" ").slice(1).join(" ") || "";
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "juillet 2026";
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader icon={User} title="Mon profil" />

      <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-4xl font-bold text-slate-500">
              {initial}
            </div>
            <button className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md">
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-slate-900">{user?.full_name || "Client MYLOC"}</h3>
            <p className="mt-1 text-slate-500">Membre depuis {joined}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                <Shield className="h-4 w-4" /> Compte vérifié
              </span>
            </div>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prénom" defaultValue={firstName || "Client"} />
            <Field label="Nom" defaultValue={lastName || "MYLOC"} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  defaultValue={user?.email || "client@myloc.dz"}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Téléphone</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Phone className="h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  defaultValue={user?.phone || "+213 555 00 00 00"}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Adresse</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                defaultValue="Alger, Algérie"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover sm:w-auto"
          >
            <Save className="h-5 w-5" />
            Enregistrer les modifications
          </button>
        </form>
      </div>
    </div>
  );
}

interface ReservationFromApi {
  id: number;
  car_id?: number;
  car_name?: string;
  car_category?: string;
  start_date?: string;
  end_date?: string;
  status?: "pending" | "confirmed" | "rejected" | "cancelled";
  admin_note?: string;
  total_price?: string | number;
}

function ReservationsView() {
  const [reservations, setReservations] = useState<ReservationFromApi[]>([]);
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchMyReservations().then((data) => setReservations(data as ReservationFromApi[])),
      fetchCars().then((data) => setCars(data)),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmée";
      case "rejected":
        return "Refusée";
      case "cancelled":
        return "Annulée";
      case "pending":
        return "En attente";
      default:
        return status || "Inconnue";
    }
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "cancelled":
        return "bg-slate-100 text-slate-600";
      case "pending":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const findCar = (carId?: number) => cars.find((c) => c.id === carId);

  return (
    <div>
      <SectionHeader icon={Calendar} title="Mes réservations" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        </div>
      ) : (
        <div className="space-y-6">
          {reservations.map((res) => {
            const car = findCar(res.car_id);
            const mapped = car ? mapApiCarToCar(car) : null;
            return (
              <div
                key={res.id}
                className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-gradient-to-b from-white to-slate-100 p-5 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:shadow-2xl hover:shadow-slate-300/60 sm:p-6"
              >
                {/* Top row: car info + status */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                      {res.car_category || mapped?.category || "Véhicule"}
                    </span>
                    <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                      {res.car_name || mapped?.name || "Véhicule"}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-brand sm:text-4xl">
                      {mapped?.price || res.total_price || "?"}€
                    </div>
                    <div className="text-xs font-medium text-slate-500">/{mapped?.priceUnit || "jour"}</div>
                  </div>
                </div>

                {/* Car image */}
                <div className="relative flex items-start justify-center h-auto -mt-2 -mb-2">
                  <div className="relative w-full">
                    {mapped?.image ? (
                      <img
                        src={mapped.image}
                        alt={res.car_name || mapped.name}
                        className="mx-auto h-auto max-h-60 w-full object-contain drop-shadow-[0_25px_50px_rgba(15,23,42,0.35)]"
                      />
                    ) : (
                      <div className="mx-auto h-32 w-32 rounded-2xl bg-slate-200" />
                    )}
                  </div>
                </div>

                {/* Specs + dates + status */}
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/60 bg-white/80 p-3 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Settings2 className="h-5 w-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700">{mapped?.transmission || "Auto"}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Users className="h-5 w-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700">{mapped?.seats || "5"} places</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Calendar className="h-5 w-5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700">{mapped?.year || "2024"}</span>
                    </div>
                  </div>

                  {/* Dates + status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Du {res.start_date || "?"}</span>
                      {" "}au{" "}
                      <span className="font-semibold text-slate-900">{res.end_date || "?"}</span>
                    </div>
                    <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusClass(res.status)}`}>
                      {statusLabel(res.status)}
                    </span>
                  </div>
                </div>

                {res.admin_note && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    <span className="font-semibold">Réponse de l’administrateur : {" "}</span>
                    {res.admin_note}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">
                    Détails
                  </button>
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                    Télécharger la facture
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && reservations.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucune réservation pour le moment.</p>
      )}
    </div>
  );
}

const AGENCY_PLACES = [
  "Agence MYLOC — Alger Centre",
  "Agence MYLOC — Aéroport Houari Boumediene",
  "Agence MYLOC — Oran",
];
const HOME_DELIVERY = "Livraison / reprise à mon adresse";
const PLACE_OPTIONS = [...AGENCY_PLACES, HOME_DELIVERY];
const DELIVERY_FEE_EUR = 25;
const DEPOSIT_EUR = 350;
const RENTAL_STEPS = [
  { id: 1, label: "Véhicule & location", icon: Car },
  { id: 2, label: "Vos informations", icon: User },
  { id: 3, label: "Assurance", icon: ShieldCheck },
  { id: 4, label: "Paiement", icon: CreditCard },
];
const REQUIRED_DOCUMENTS = [
  {
    icon: Car,
    title: "Permis de conduire valide",
    desc: "Original, titulaire depuis au moins 1 an, à présenter le jour de la prise en charge.",
  },
  {
    icon: User,
    title: "Pièce d'identité",
    desc: "CIN ou passeport en cours de validité, au nom du locataire.",
  },
  {
    icon: CreditCard,
    title: "Carte bancaire",
    desc: "Au nom du locataire, nécessaire pour le dépôt de garantie.",
  },
];
const INSURANCE_COVERED = [
  {
    title: "Responsabilité civile obligatoire",
    desc: "Couvre les dégâts causés à d'autres véhicules, piétons, etc. si vous êtes responsable.",
  },
  {
    title: "Vol du véhicule",
    desc: "Pris en charge si plainte déposée et dossier remis aux autorités compétentes.",
  },
  {
    title: "Incendie",
    desc: "Pris en charge si non volontaire et constaté par les pompiers ou la police.",
  },
  {
    title: "Dommages matériels importants (> 50 000 DA)",
    desc: "Pris en charge uniquement si le locataire n'est pas responsable, qu'un tiers identifié est reconnu fautif, et après expertise validée par l'assurance.",
  },
];
const INSURANCE_EXCLUDED = [
  {
    title: "Dommages dont vous êtes responsable",
    desc: "Tous les dégâts que vous causez au véhicule loué, quelle que soit la situation.",
  },
  {
    title: "Tiers non identifiable",
    desc: "Sans témoin, constat ou preuve : rayure sur parking, collision avec un animal, délit de fuite — vous assumez les réparations.",
  },
  {
    title: "Amendes, erreurs de carburant & perte de clés",
    desc: "Perte ou casse de clés, mauvaise utilisation du carburant, amendes et infractions routières : toujours à la charge du locataire.",
  },
  {
    title: "Dommages matériels mineurs (< 50 000 DA)",
    desc: "Rayures, pare-chocs frotté, intérieur abîmé — considérés comme usure, non pris en charge.",
  },
  {
    title: "Pneus, crevaisons & jantes",
    desc: "Crevaison, éclatement, jante endommagée ou pneu usé : frais à la charge du locataire, sauf accident avéré avec tiers identifié déclaré.",
  },
];
const PAYMENT_METHODS = [
  {
    id: "especes",
    label: "Espèces à la prise en charge",
    desc: "Payez le total en espèces lorsque vous récupérez le véhicule.",
  },
  {
    id: "virement",
    label: "Virement bancaire",
    desc: "Nous vous transmettons le RIB après validation de votre demande.",
  },
  {
    id: "carte",
    label: "Carte bancaire",
    desc: "Paiement par carte le jour de la prise en charge du véhicule.",
  },
];

interface ReservationFormState {
  pickup_date: string;
  pickup_time: string;
  pickup_place: string;
  return_date: string;
  return_time: string;
  return_place: string;
  delivery_address: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  eligibility_confirmed: boolean;
  payment_method: string;
  cgl_accepted: boolean;
}

const wizardInputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand";

function WizardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function WizardCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
      />
      <span className="text-sm text-slate-600">{children}</span>
    </label>
  );
}

function formatEuro(value: number): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
}

function formatReservationDateTime(date: string, time: string): string {
  if (!date) return "—";
  return new Date(`${date}T${time || "00:00"}`).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReserverView() {
  const [cars, setCars] = useState<CarFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState<"" | number>("");
  const [selectedCar, setSelectedCar] = useState<CarFromApi | null>(null);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<ReservationFormState>(() => {
    let full_name = "";
    let email = "";
    let phone = "";
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("myloc_user");
        if (raw) {
          const u = JSON.parse(raw) as { full_name?: string; email?: string; phone?: string };
          full_name = u.full_name || "";
          email = u.email || "";
          phone = u.phone || "";
        }
      } catch {}
    }
    return {
      pickup_date: "",
      pickup_time: "09:00",
      pickup_place: AGENCY_PLACES[0],
      return_date: "",
      return_time: "09:00",
      return_place: AGENCY_PLACES[0],
      delivery_address: "",
      full_name,
      email,
      phone,
      license_number: "",
      eligibility_confirmed: false,
      payment_method: PAYMENT_METHODS[0].id,
      cgl_accepted: false,
    };
  });

  useEffect(() => {
    fetchCars()
      .then((data) => setCars(data.filter((c) => c.status === "available")))
      .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger les véhicules."))
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (patch: Partial<ReservationFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const filteredCars = cars.filter((car) => {
    const mapped = mapApiCarToCar(car);
    const matchesName = car.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesPrice = priceFilter === "" || mapped.price <= Number(priceFilter);
    return matchesName && matchesPrice;
  });

  // Pricing of the static reservation, computed from the selected car.
  const mapped = selectedCar ? mapApiCarToCar(selectedCar) : null;
  const pickupDateTime = form.pickup_date
    ? new Date(`${form.pickup_date}T${form.pickup_time || "09:00"}`)
    : null;
  const returnDateTime = form.return_date
    ? new Date(`${form.return_date}T${form.return_time || "09:00"}`)
    : null;
  const rentalDays =
    pickupDateTime && returnDateTime && returnDateTime.getTime() > pickupDateTime.getTime()
      ? Math.max(1, Math.ceil((returnDateTime.getTime() - pickupDateTime.getTime()) / 86_400_000))
      : 0;
  const deliveryLegs = selectedCar
    ? [form.pickup_place, form.return_place].filter((p) => p === HOME_DELIVERY).length
    : 0;
  const deliveryFee = deliveryLegs * DELIVERY_FEE_EUR;
  const rentalTotal = mapped ? rentalDays * mapped.price : 0;
  const grandTotal = rentalTotal + deliveryFee;

  const today = new Date().toISOString().split("T")[0];

  const openWizard = (car: CarFromApi) => {
    setSelectedCar(car);
    setStep(1);
    setSent(false);
    setStepError("");
  };

  const backToList = () => {
    setSelectedCar(null);
    setSent(false);
    setStepError("");
  };

  const validateStep = (current: number): string => {
    if (current === 1) {
      if (!form.pickup_date || !form.pickup_time || !form.return_date || !form.return_time) {
        return "Veuillez choisir les dates et heures de prise en charge et de retour.";
      }
      if (!pickupDateTime || !returnDateTime || returnDateTime <= pickupDateTime) {
        return "La date de retour doit être postérieure à la date de prise en charge.";
      }
      if ([form.pickup_place, form.return_place].includes(HOME_DELIVERY) && !form.delivery_address.trim()) {
        return "Veuillez indiquer votre adresse de livraison.";
      }
    }
    if (current === 2) {
      if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
        return "Veuillez renseigner votre nom, votre email et votre téléphone.";
      }
      if (!form.eligibility_confirmed) {
        return "Veuillez confirmer que vous remplissez les conditions de location.";
      }
    }
    return "";
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) {
      setStepError(message);
      return;
    }
    setStepError("");
    setStep(step + 1);
  };

  const goBack = () => {
    setStepError("");
    if (step === 1) {
      backToList();
    } else {
      setStep(step - 1);
    }
  };

  const sendRequest = () => {
    if (!form.cgl_accepted) {
      setStepError(
        "Veuillez lire et accepter les Conditions Générales de Location (CGL) avant d'envoyer votre demande."
      );
      return;
    }
    setStepError("");
    setSent(true);
  };

  if (selectedCar && mapped && sent) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm shadow-slate-200/50 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle className="h-9 w-9" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-slate-900">Demande envoyée !</h3>
          <p className="mt-2 text-slate-500">
            Votre demande de réservation pour{" "}
            <span className="font-semibold text-slate-700">{selectedCar.name}</span> a bien été transmise.
            Notre équipe vous contactera très rapidement pour la confirmer.
          </p>
          <div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-5 text-left text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-800">Véhicule</span>
              <span className="text-slate-600">{selectedCar.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-800">Prise en charge</span>
              <span className="text-right text-slate-600">
                {formatReservationDateTime(form.pickup_date, form.pickup_time)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-800">Retour</span>
              <span className="text-right text-slate-600">
                {formatReservationDateTime(form.return_date, form.return_time)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-800">Durée</span>
              <span className="text-slate-600">
                {rentalDays} jour{rentalDays > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-800">Total à payer</span>
              <span className="font-extrabold text-brand">{formatEuro(grandTotal)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={backToList}
            className="mt-6 w-full rounded-xl bg-brand px-4 py-3 font-bold text-white transition-colors hover:bg-brand-hover sm:w-auto"
          >
            Retour aux véhicules
          </button>
        </div>
      </div>
    );
  }

  if (selectedCar && mapped) {
    return (
      <div>
        <button
          type="button"
          onClick={backToList}
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition-colors hover:text-brand"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux véhicules
        </button>

        <SectionHeader icon={PlusCircle} title="Réservation de véhicule" />

        <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50 sm:flex-row sm:items-center">
          {RENTAL_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-brand text-white"
                      : done
                        ? "bg-green-100 text-green-600"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold ${
                      active ? "text-brand" : done ? "text-green-600" : "text-slate-400"
                    }`}
                  >
                    Étape {s.id}
                  </div>
                  <div className={`truncate text-xs ${active ? "text-slate-900" : "text-slate-400"}`}>
                    {s.label}
                  </div>
                </div>
                {i < RENTAL_STEPS.length - 1 && (
                  <div className="hidden h-0.5 flex-1 rounded-full bg-slate-100 sm:block" />
                )}
              </div>
            );
          })}
        </div>

        {stepError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {stepError}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-200">
                  <img
                    src={mapped.image}
                    alt={selectedCar.name}
                    className="mx-auto h-full max-h-64 w-full object-contain p-3 drop-shadow-[0_25px_50px_rgba(15,23,42,0.35)]"
                  />
                </div>
                <div>
                  <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                    {selectedCar.category}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedCar.name}</h3>
                  <div className="mt-1">
                    <span className="text-3xl font-extrabold text-brand">{formatEuro(mapped.price)}</span>
                    <span className="ml-1 text-sm font-medium text-slate-500">/ jour</span>
                  </div>
                  {selectedCar.description && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      {selectedCar.description}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-center">
                      <Settings2 className="mx-auto h-5 w-5 text-slate-400" />
                      <div className="mt-1 text-xs font-semibold text-slate-600">
                        {selectedCar.transmission}
                      </div>
                    </div>
                    <div className="text-center">
                      <Users className="mx-auto h-5 w-5 text-slate-400" />
                      <div className="mt-1 text-xs font-semibold text-slate-600">
                        {selectedCar.seats} places
                      </div>
                    </div>
                    <div className="text-center">
                      <Calendar className="mx-auto h-5 w-5 text-slate-400" />
                      <div className="mt-1 text-xs font-semibold text-slate-600">{selectedCar.year}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Calendar className="h-5 w-5 text-brand" />
                Dates & lieux de location
              </h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <WizardField label="Date de prise en charge">
                  <input
                    type="date"
                    min={today}
                    value={form.pickup_date}
                    onChange={(e) => updateForm({ pickup_date: e.target.value })}
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Heure de prise en charge">
                  <input
                    type="time"
                    value={form.pickup_time}
                    onChange={(e) => updateForm({ pickup_time: e.target.value })}
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Lieu de prise en charge">
                  <select
                    value={form.pickup_place}
                    onChange={(e) => updateForm({ pickup_place: e.target.value })}
                    className={wizardInputClass}
                  >
                    {PLACE_OPTIONS.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                </WizardField>
                <WizardField label="Date de retour">
                  <input
                    type="date"
                    min={form.pickup_date || today}
                    value={form.return_date}
                    onChange={(e) => updateForm({ return_date: e.target.value })}
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Heure de retour">
                  <input
                    type="time"
                    value={form.return_time}
                    onChange={(e) => updateForm({ return_time: e.target.value })}
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Lieu de retour">
                  <select
                    value={form.return_place}
                    onChange={(e) => updateForm({ return_place: e.target.value })}
                    className={wizardInputClass}
                  >
                    {PLACE_OPTIONS.map((place) => (
                      <option key={place} value={place}>
                        {place}
                      </option>
                    ))}
                  </select>
                </WizardField>
              </div>

              {[form.pickup_place, form.return_place].includes(HOME_DELIVERY) && (
                <div className="mt-5">
                  <WizardField label="Adresse de livraison / reprise">
                    <textarea
                      rows={2}
                      value={form.delivery_address}
                      onChange={(e) => updateForm({ delivery_address: e.target.value })}
                      placeholder="Ex : Cité 1200 logements, Bt B, Alger"
                      className={wizardInputClass}
                    />
                  </WizardField>
                </div>
              )}

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-slate-600">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  Livraison et reprise à domicile possibles : {formatEuro(DELIVERY_FEE_EUR)} par trajet,
                  incluses automatiquement dans le récapitulatif de paiement.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <User className="h-5 w-5 text-brand" />
                Vos informations
              </h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <WizardField label="Nom complet">
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => updateForm({ full_name: e.target.value })}
                    placeholder="Ex : Ahmed Benali"
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Téléphone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder="+213 ..."
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder="vous@exemple.com"
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Numéro de permis de conduire (optionnel)">
                  <input
                    type="text"
                    value={form.license_number}
                    onChange={(e) => updateForm({ license_number: e.target.value })}
                    placeholder="Ex : 123456789"
                    className={wizardInputClass}
                  />
                </WizardField>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-orange-800">
                <FileText className="h-5 w-5" />
                Documents requis pour la location
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                Préparez les documents suivants : ils vous seront demandés le jour de la prise en charge du
                véhicule.
              </p>
              <ul className="mt-4 space-y-3">
                {REQUIRED_DOCUMENTS.map((doc) => {
                  const DocIcon = doc.icon;
                  return (
                    <li key={doc.title} className="flex items-start gap-3 rounded-2xl bg-white/70 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <DocIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-orange-900">{doc.title}</div>
                        <p className="mt-0.5 text-sm text-orange-700">{doc.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <WizardCheckbox
              checked={form.eligibility_confirmed}
              onChange={(checked) => updateForm({ eligibility_confirmed: checked })}
            >
              Je certifie être majeur(e) (18 ans ou plus), être titulaire d&apos;un permis de conduire valide
              et avoir une expérience suffisante en conduite.
            </WizardCheckbox>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-brand" />
              Votre couverture assurance
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Récapitulatif de la police d&apos;assurance incluse
            </p>

            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
              <h4 className="flex items-center gap-2 font-bold text-green-700">
                <Shield className="h-5 w-5" />
                Garanties incluses
              </h4>
              <ul className="mt-4 space-y-4">
                {INSURANCE_COVERED.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.title}</div>
                      <p className="mt-0.5 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h4 className="flex items-center gap-2 font-bold text-red-700">
                <AlertCircle className="h-5 w-5" />
                Exclusions — à votre charge
              </h4>
              <ul className="mt-4 space-y-4">
                {INSURANCE_EXCLUDED.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.title}</div>
                      <p className="mt-0.5 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <p>
                <span className="font-bold">Note :</span> En cas de sinistre, des frais annexes peuvent être
                facturés — gestion du dossier, déplacement d&apos;un agent, immobilisation du véhicule ou
                expertise. La caution de {formatEuro(DEPOSIT_EUR)} couvre ces frais et est restituée
                intégralement si aucun incident.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Banknote className="h-5 w-5 text-brand" />
                Détails du paiement
              </h3>

              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <div className="font-bold text-slate-900">Prise en charge</div>
                    <div className="text-slate-600">
                      {formatReservationDateTime(form.pickup_date, form.pickup_time)}
                    </div>
                    <div className="text-slate-500">{form.pickup_place}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <div className="font-bold text-slate-900">Retour</div>
                    <div className="text-slate-600">
                      {formatReservationDateTime(form.return_date, form.return_time)}
                    </div>
                    <div className="text-slate-500">{form.return_place}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-600">
                    Location {selectedCar.name} — {rentalDays} jour{rentalDays > 1 ? "s" : ""} ×{" "}
                    {formatEuro(mapped.price)}
                  </span>
                  <span className="font-bold text-slate-900">{formatEuro(rentalTotal)}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-600">
                    Livraison / reprise à domicile
                    {deliveryLegs > 0 ? ` (${deliveryLegs} trajet${deliveryLegs > 1 ? "s" : ""})` : ""}
                  </span>
                  <span
                    className={`font-bold ${deliveryLegs > 0 ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {deliveryLegs > 0 ? formatEuro(deliveryFee) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-600">Caution (restituée si aucun incident)</span>
                  <span className="font-bold text-slate-400">{formatEuro(DEPOSIT_EUR)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand/5 px-5 py-4">
                <span className="font-bold text-slate-900">Total à payer</span>
                <span className="text-3xl font-extrabold text-brand">{formatEuro(grandTotal)}</span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <CreditCard className="h-5 w-5 text-brand" />
                Moyen de paiement
              </h3>
              <div className="mt-4 grid gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      form.payment_method === method.id
                        ? "border-brand bg-brand/5"
                        : "border-slate-200 bg-slate-50 hover:border-brand/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="moyen-paiement"
                      checked={form.payment_method === method.id}
                      onChange={() => updateForm({ payment_method: method.id })}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{method.label}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{method.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <WizardCheckbox
              checked={form.cgl_accepted}
              onChange={(checked) => updateForm({ cgl_accepted: checked })}
            >
              Je confirme avoir lu les{" "}
              <span className="font-semibold text-brand">Conditions Générales de Location (CGL)</span> et je
              les accepte.
            </WizardCheckbox>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-6 py-3.5 text-base font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-5 w-5" />
            Retour
          </button>
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-hover"
            >
              Continuer
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={sendRequest}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-hover"
            >
              <Send className="h-5 w-5" />
              Envoyer la demande
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={PlusCircle} title="Réserver un véhicule" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nom du véhicule</label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Ex : Audi"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Prix max (€/jour)</label>
          <input
            type="number"
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Ex : 100"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCars.map((car) => {
            const mapped = mapApiCarToCar(car);
            return (
              <div
                key={car.id}
                className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-200">
                  <img
                    src={mapped.image}
                    alt={car.name}
                    className="mx-auto h-full w-auto object-contain p-2"
                  />
                </div>
                <div className="mt-4">
                  <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                    {car.category}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{car.name}</h3>
                  <div className="mt-1 text-2xl font-extrabold text-brand">{mapped.price}€</div>
                  <div className="text-xs text-slate-500">/{"jour"}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-center text-xs font-semibold text-slate-600">{car.transmission}</div>
                  <div className="text-center text-xs font-semibold text-slate-600">{car.seats} places</div>
                  <div className="text-center text-xs font-semibold text-slate-600">{car.year}</div>
                </div>
                <button
                  onClick={() => openWizard(car)}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
                >
                  Réserver
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredCars.length === 0 && (
        <p className="mt-8 text-center text-slate-500">Aucun véhicule ne correspond à votre recherche.</p>
      )}
    </div>
  );
}

function PaiementsView() {
  return (
    <div>
      <SectionHeader icon={CreditCard} title="Mes paiements" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50"
          >
            <div className="text-sm font-semibold text-slate-500">Facture #{2026 + i}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{i === 0 ? "350 €" : i === 1 ? "210 €" : "540 €"}</div>
            <div className="mt-1 text-sm text-slate-500">{i === 0 ? "Payée" : i === 1 ? "En attente" : "Remboursée"}</div>
            <button className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Télécharger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParametresView() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader icon={Settings} title="Paramètres" />
      <div className="space-y-4">
        <SettingRow title="Notifications par email" description="Recevoir les offres et confirmations." />
        <SettingRow title="Notifications SMS" description="Recevoir les rappels de réservation." />
        <SettingRow title="Mode sombre" description="Activer l’apparence sombre." />
        <SettingRow title="Langue" description="Français" />
      </div>

      <div className="mt-8 rounded-3xl border border-red-100 bg-white p-6 shadow-sm shadow-slate-200/50">
        <h3 className="text-lg font-bold text-red-600">Zone dangereuse</h3>
        <p className="mt-2 text-sm text-slate-500">
          Supprimer votre compte effacera toutes vos données définitivement.
        </p>
        <button className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  color: "brand" | "green" | "orange" | "yellow";
}) {
  const colors = {
    brand: "bg-brand/10 text-brand",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="text"
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
      />
    </div>
  );
}

function SettingRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/50">
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" />
        <div className="h-7 w-12 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand" />
        <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}
