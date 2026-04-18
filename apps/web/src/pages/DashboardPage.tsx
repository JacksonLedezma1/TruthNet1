import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnalysisCard, type AnalysisItem } from "@/components/truthnet/AnalysisCard";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/truthnet/AppSidebar";
import { 
  FileSearch, 
  PlusCircle, 
  ShieldCheck, 
  AlertTriangle, 
  XOctagon, 
  TrendingUp,
  Search,
  History
} from "lucide-react";
import { useAnalyses } from "@/hooks/useAnalyses";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data: analyses, isLoading } = useAnalyses();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper para extraer veredicto de forma segura (soporta camelCase y snake_case)
  const getVerdict = (a: any) => {
    if (a.status === "FAILED") return "FAILED";
    const res = a.result || {};
    return res.overall_verdict || res.overallVerdict || "unverifiable";
  };

  // Estadísticas básicas
  const total = analyses?.length || 0;
  const reliable = analyses?.filter(a => ['verified', 'reliable', 'TRUE', 'verified'].includes(getVerdict(a))).length || 0;
  const fake = analyses?.filter(a => ['false', 'FALSE', 'INACCURATE'].includes(getVerdict(a))).length || 0;
  const questionable = total - reliable - fake;

  const trustScore = total > 0 ? Math.round((reliable / total) * 100) : 0;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "hace poco";
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `hace ${Math.floor(diffInSeconds / 86400)} d`;
  };

  const recentAnalyses: AnalysisItem[] = (analyses || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map(a => {
      const res = (a.result as any) || {};
      return {
        id: a.id,
        text: a.input,
        verdict: getVerdict(a) as any,
        score: res.overall_score || res.overallScore || 0,
        claimCount: (res.claims || res.claim_verdicts || res.claimVerdicts || []).length,
        timeAgo: formatTimeAgo(a.createdAt)
      };
    });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-4 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Resumen de Verificación</h1>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Welcome & Quick Action */}
              <div className="bg-gradient-to-br from-primary/15 via-background to-background p-8 rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Hola{user ? `, ${user.name}` : ' verificado'}! 👋</h2>
                    <p className="text-muted-foreground max-w-md">¿Tienes una duda hoy? No dejes que las fake news ganen. Nuestro motor de IA está listo para investigar por ti.</p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/analysis/new")} 
                    className="h-16 px-8 text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform gap-3"
                  >
                    <Search className="w-6 h-6" />
                    Nueva Verificación
                  </Button>
                </div>
                {/* Decorative element */}
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border/50 p-6 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-accent/20 text-accent rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confiables</p>
                    <p className="text-2xl font-black">{reliable}</p>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-destructive/20 text-destructive rounded-xl">
                    <XOctagon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Falsos</p>
                    <p className="text-2xl font-black">{fake}</p>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-warning/20 text-warning rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sospechosos</p>
                    <p className="text-2xl font-black">{questionable}</p>
                  </div>
                </div>

                <div className="bg-card border border-primary/20 p-6 rounded-2xl flex items-center gap-4 bg-primary/[0.02]">
                  <div className="p-3 bg-primary/20 text-primary rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confianza IA</p>
                    <p className="text-2xl font-black">{trustScore}%</p>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <History className="w-5 h-5 text-primary" />
                      Actividad Reciente
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-primary font-bold text-xs uppercase tracking-tighter">
                      Ver todo el historial 
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-32 rounded-2xl w-full" />
                      <Skeleton className="h-32 rounded-2xl w-full" />
                    </div>
                  ) : recentAnalyses.length > 0 ? (
                    <div className="grid gap-4">
                      {recentAnalyses.map(analysis => (
                        <AnalysisCard key={analysis.id} analysis={analysis} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                      <FileSearch className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No hay análisis recientes</p>
                    </div>
                  )}
                </div>

                {/* Info / Tips Sidebar */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold">Resumen de Impacto</h3>
                  <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Salud de Información</span>
                          <span>{trustScore}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${trustScore}%` }}
                            className="h-full bg-gradient-to-r from-destructive via-warning to-accent transition-all duration-1000" 
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">Nivel Seguro</p>
                            <p className="text-xs text-muted-foreground">La mayoría de tus consultas son veraces. Buen juicio!</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <PlusCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">Consejo TruthNet</p>
                            <p className="text-xs text-muted-foreground">Verifica noticias sobre salud antes de compartirlas.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
