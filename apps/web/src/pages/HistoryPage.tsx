import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnalysisCard, type AnalysisItem } from "@/components/truthnet/AnalysisCard";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/truthnet/AppSidebar";
import { FileSearch, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useAnalyses } from "@/hooks/useAnalyses";
import { Skeleton } from "@/components/ui/skeleton";

type Filter = "all" | "TRUE" | "MISLEADING" | "FALSE" | "FAILED";

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { data: analyses, isLoading } = useAnalyses();
  const navigate = useNavigate();

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "TRUE", label: "Confiable" },
    { key: "MISLEADING", label: "Sospechoso" },
    { key: "FALSE", label: "Falso" },
    { key: "FAILED", label: "Fallido" },
  ];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "hace poco";
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `hace ${Math.floor(diffInSeconds / 86400)} d`;
  };

  // Helper para extraer veredicto de forma segura
  const getVerdict = (a: any) => {
    if (a.status === "FAILED") return "FAILED";
    const res = a.result || {};
    return res.overall_verdict || res.overallVerdict || "unverifiable";
  };

  const filteredAnalyses = analyses
    ? (filter === "all"
        ? analyses
        : analyses.filter((a) => getVerdict(a) === filter))
    : [];

  // Paginación
  const totalPages = Math.ceil(filteredAnalyses.length / itemsPerPage);
  const paginatedAnalyses = [...filteredAnalyses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const mappedAnalyses: AnalysisItem[] = paginatedAnalyses.map(a => {
    return {
      id: a.id,
      text: a.input,
      verdict: getVerdict(a) as any,
      score: (a.result as any)?.overall_score || (a.result as any)?.overallScore || 0,
      claimCount: ((a.result as any)?.claims || (a.result as any)?.claim_verdicts || (a.result as any)?.claimVerdicts || []).length,
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
            <h1 className="text-lg font-semibold">Historial de Verificaciones</h1>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
              ) : analyses?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <FileSearch className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-4">Aún no has analizado ningún texto</p>
                  <Button onClick={() => navigate("/analysis/new")}>Analizar tu primer texto</Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Archivo de Verificaciones</h2>
                      <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest mt-1">Explora tus consultas pasadas</p>
                    </div>
                    <Button onClick={() => navigate("/analysis/new")} className="shadow-lg shadow-primary/20">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Nuevo Análisis
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                    {filters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => { setFilter(f.key); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          filter === f.key
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {mappedAnalyses.map((analysis) => (
                      <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-12 border-t pt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                      </Button>
                      <div className="flex gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl"
                      >
                        Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
