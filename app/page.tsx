import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AgenciesBand } from "@/components/AgenciesBand";
import { Fleet } from "@/components/Fleet";
import { StatsBand } from "@/components/StatsBand";
import { Showroom } from "@/components/Showroom";
import { Features } from "@/components/Features";
import { Steps } from "@/components/Steps";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-white">
        <Hero />
        <AgenciesBand />
        <Showroom />
        <Fleet />
        <StatsBand />
        <Features />
        <Steps />
        <About />
        <Contact />
      </main>
      <FloatingWhatsApp />
      <Footer />
    </>
  );
}
