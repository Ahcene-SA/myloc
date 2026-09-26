import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AgenciesBand } from "@/components/AgenciesBand";
import { Fleet } from "@/components/Fleet";
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
      <main className="flex-1 bg-sand">
        <Hero />
        <AgenciesBand />
        <Fleet />
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
