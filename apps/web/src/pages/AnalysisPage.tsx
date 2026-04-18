import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, AlertCircle } from "lucide-react";
import { ProgressTimeline, type TimelineStep } from "@/components/truthnet/ProgressTimeline";
import { ScoreCircle } from "@/components/truthnet/ScoreCircle";
import { VerdictBadge } from "@/components/truthnet/VerdictBadge";
import { ClaimCard, type Claim } from "@/components/truthnet/ClaimCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAnalysis } from "@/hooks/useAnalyses";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { AnalysisStatus } from "@/types/analysis.types";
import { cn } from "@/lib/utils";

const stepLabels = [
  { label: "Extrayendo afirmaciones", status: AnalysisStatus.EXTRACTING },
  { label: "Buscando fuentes", status: AnalysisStatus.SCRAPING },
  { label: "Analizando con IA", status: AnalysisStatus.ANALYZING },
  { label: "Calculando score", status: AnalysisStatus.SCORING },
  { label: "Completado", status: AnalysisStatus.DONE },
];

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: analysis, isLoading, isError } = useAnalysis(id);
  const { status, message, result, error } = useAnalysisStream(id);

  const currentStatus = status || analysis?.status || AnalysisStatus.PENDING;
  const currentResult = result || analysis?.result;

  const getStepStatus = (stepStatus: AnalysisStatus): "completed" | "active" | "pending" | "failed" => {
    const statusOrder = [
      AnalysisStatus.PENDING,
      AnalysisStatus.EXTRACTING,
      AnalysisStatus.SCRAPING,
      AnalysisStatus.ANALYZING,
      AnalysisStatus.SCORING,
      AnalysisStatus.DONE
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (currentStatus === AnalysisStatus.FAILED && stepIndex === currentIndex) return "failed";
    if (stepIndex < currentIndex || currentStatus === AnalysisStatus.DONE) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const steps: TimelineStep[] = stepLabels.map((s) => ({
    label: s.label,
    description: s.status === currentStatus ? message : "",
    status: getStepStatus(s.status),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-10 w-48 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (isError || (error && currentStatus === AnalysisStatus.FAILED)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Error en el análisis</h2>
          <p className="text-muted-foreground">{error || analysis?.errorMessage || "No se pudo cargar el análisis"}</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
            Volver al dashboard
          </Button>
        </div>
      </div>
    );
  }

  const done = currentStatus === AnalysisStatus.DONE;

  if (done && currentResult) {
    const safeParseUrl = (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        return url.hostname.replace("www.", "");
      } catch {
        return "fuente externa";
      }
    };

    const result = currentResult as any;
    const finalClaims: Claim[] = (result?.claims || result?.claim_verdicts || result?.claimVerdicts || []).map((c: any) => ({
      id: c.id || c.claim_id,
      text: c.text || c.claim_text,
      verdict: c.verdict,
      score: c.score ?? c.confidence_score ?? 0,
      explanation: c.explanation,
      sources: (c.sources || []).map((s: any) => {
        if (typeof s === 'object' && s !== null) {
          return {
            domain: safeParseUrl(s.url),
            title: s.title,
            relevance: s.relevance_score ?? s.relevance ?? 0.5,
            stance: s.stance ?? "neutral",
            url: s.url
          };
        }
        return typeof s === 'string' 
          ? { domain: safeParseUrl(s), title: "Fuente externa", url: s, relevance: 0.5, stance: "neutral" } 
          : s;
      })
    }));

    const overallScore = result?.overall_score ?? result?.overallScore ?? 0;
    const overallVerdict = result?.overall_verdict ?? result?.overallVerdict ?? "unverifiable";
    const summary = currentResult?.summary || "No hay resumen disponible.";

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>

          {/* Analysis Header */}
          <div className="mb-8 p-6 rounded-2xl bg-card border border-border shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Texto analizado</span>
            <h1 className="text-xl font-medium text-foreground leading-relaxed italic">
              "{analysis?.input}"
            </h1>
          </div>

          {/* Hero Result Section with dynamic glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center mb-12 relative py-10"
          >
            {/* Background Glow */}
            <div 
              className={cn(
                "absolute inset-0 -z-10 blur-[100px] opacity-20 rounded-full w-2/3 h-2/3 mx-auto transition-colors duration-1000",
                overallVerdict === 'reliable' || overallVerdict === 'verified' || overallVerdict === 'TRUE' ? "bg-accent" :
                overallVerdict === 'false' || overallVerdict === 'FALSE' ? "bg-destructive" :
                "bg-warning"
              )}
            />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <VerdictBadge verdict={overallVerdict as any} size="xl" />
            </motion.div>
            
            <div className="relative mb-8">
              <ScoreCircle score={overallScore} size={160} strokeWidth={12} />
              <div className="absolute inset-x-0 bottom-[-10px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Confianza
              </div>
            </div>
            
            <p className="text-foreground/80 text-base max-w-xl leading-relaxed bg-background/40 backdrop-blur-sm p-4 rounded-xl border border-border/50">
              {summary}
            </p>
          </motion.div>

          {/* Metrics Grid - More intuitive with better spacing */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { label: "Datos extraídos", value: finalClaims.length },
              { label: "Análisis finalizado", value: new Date(analysis?.createdAt || "").toLocaleDateString() },
              { label: "Fuentes consultadas", value: Array.from(new Set(finalClaims.flatMap(c => c.sources.map(s => s.url)))).length },
            ].map((m, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card/50 p-5 text-center flex flex-col justify-center gap-1">
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] uppercase font-bold tracking-tighter text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Claims Section with clear separation */}
          <div className="space-y-6 mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground shrink-0">Desglose de Hallazgos</h3>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <div className="grid gap-6">
              {finalClaims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">Analizado el {new Date(analysis?.createdAt || "").toLocaleString()}</p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">Compartir resultado</Button>
              <Button size="sm" onClick={() => navigate("/analysis/new")}>Nuevo análisis</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading/Progress state
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>

        <h1 className="text-2xl font-bold mb-2">Analizando tu texto...</h1>
        <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{analysis?.input}</p>

        <ProgressTimeline steps={steps} className="mb-10" />

        {/* Partial results (claims extraídos) */}
        {currentResult?.claims && currentResult.claims.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Claims extraídos:</p>
            {currentResult.claims.map((claim, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm text-foreground">"{claim.claim_text}"</p>
                {!done && <Skeleton className="h-4 w-24 mt-2" />}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
