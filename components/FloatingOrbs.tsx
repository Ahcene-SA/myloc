"use client";

import { motion } from "framer-motion";

export function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 2 }}
        className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 40, 0],
          x: [0, 20, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        className="absolute top-1/4 -left-32 h-80 w-80 rounded-full bg-brand/5 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, -50, 0],
          x: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-0 right-1/4 h-[28rem] w-[28rem] rounded-full bg-slate-300/40 blur-3xl"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(67,176,230,0.08),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(203,213,225,0.4),transparent_50%)]" />
    </div>
  );
}
