import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Globe, Bot, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { VerdictBadge } from "@/components/truthnet/VerdictBadge";
import { ScoreCircle } from "@/components/truthnet/ScoreCircle";
import { ClaimCard, type Claim } from "@/components/truthnet/ClaimCard";

const demoClaims: Claim[] = [
  {
    id: "1",
    text: "Colombia registró un crecimiento del 3.2% en 2024",
    verdict: "misleading",
    score: 45,
    explanation: "Las fuentes indican un crecimiento de 2.8%, no 3.2% como afirma el texto.",
    sources: [
      { domain: "Bloomberg", title: "Colombia GDP growth 2024...", relevance: 0.87, stance: "supports" },
      { domain: "Banco de la República", title: "Informe trimestral...", relevance: 0.92, stance: "contradicts" },
      { domain: "DANE", title: "Boletín de crecimiento...", relevance: 0.88, stance: "contradicts" },
    ],
  },
  {
    id: "2",
    text: "La inflación se redujo al 5.1% interanual",
    verdict: "verified",
    score: 89,
    explanation: "Múltiples fuentes oficiales confirman esta cifra.",
    sources: [
      { domain: "DANE", title: "IPC Diciembre 2024", relevance: 0.95, stance: "supports" },
      { domain: "Reuters", title: "Colombia inflation drops...", relevance: 0.82, stance: "supports" },
    ],
  },
];

const features = [
  { icon: Search, title: "Extrae las afirmaciones", desc: "spaCy identifica qué es verificable en el texto" },
  { icon: Globe, title: "Busca fuentes reales", desc: "Wikipedia, noticias, fuentes primarias verificadas" },
  { icon: Bot, title: "Veredicto con IA", desc: "Groq LLM evalúa cada claim con las fuentes encontradas" },
];

const steps = [
  "Pegas el texto",
  "El sistema extrae los claims",
  "Busca fuentes automáticamente",
  "El LLM emite veredicto",
  "Recibes el reporte completo",
];

export default function LandingPage() {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Truth<span className="text-primary">Net</span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Iniciar sesión</Button>
            <Button size="sm" onClick={() => navigate("/register")}>Registrarse</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4"
        >
          Verifica cualquier noticia{" "}
          <span className="text-primary">en segundos</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-xl mx-auto mb-8"
        >
          TruthNet usa IA para analizar afirmaciones, buscar fuentes cruzadas y decirte qué tan confiable es un texto.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto o noticia que quieres verificar..."
            className="w-full h-32 rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <Button
            size="lg"
            className="mt-4 w-full sm:w-auto px-8 text-base font-semibold"
            onClick={() => navigate("/analysis/demo")}
            disabled={!text.trim()}
          >
            Analizar ahora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            o <button onClick={() => navigate("/register")} className="text-primary hover:underline">regístrate</button> para guardar tus análisis
          </p>
        </motion.div>
      </section>

      {/* Demo */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Ejemplo de análisis</p>
            <ScoreCircle score={67} size={100} strokeWidth={6} />
            <VerdictBadge verdict="suspicious" size="lg" className="mt-3" />
          </div>
          <div className="space-y-4">
            {demoClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <f.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">Cómo funciona</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 sm:flex-col sm:text-center flex-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-mono text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="text-center pb-24 px-4">
        <Button size="lg" className="px-10 text-base font-semibold" onClick={() => navigate("/register")}>
          Empieza gratis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>TruthNet © 2026 — Verifica antes de compartir.</p>
      </footer>
    </div>
  );
}
