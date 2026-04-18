import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalysisMutations } from "@/hooks/useAnalysisMutations";
import { ArrowLeft, Send, Sparkles } from "lucide-react";

const analysisSchema = z.object({
  input: z.string().min(20, "El texto debe tener al menos 20 caracteres").max(5000, "El texto es demasiado largo"),
});

type AnalysisFormValues = z.infer<typeof analysisSchema>;

const EXAMPLES = [
  "¿Francia devolvió las obras del Louvre?",
  "Argentina ganó la última Copa América en 2024",
  "Beneficios del café para el cerebro según Oxford",
  "Nueva ciudad de SpaceX en la Luna para 2028"
];

export default function NewAnalysisPage() {
  const { createAnalysisMutation } = useAnalysisMutations();
  
  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      input: "",
    },
  });

  const onSubmit = (data: AnalysisFormValues) => {
    createAnalysisMutation.mutate(data as any);
  };

  const inputValue = form.watch("input");

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al dashboard
          </Link>
        </div>

        <div className="mb-8 p-6 bg-primary/10 rounded-2xl border border-primary/20">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Inicia tu Verificación</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Pega una noticia, un tuit o cualquier afirmación que hayas escuchado. 
            Nuestra IA analizará cada dato por separado para darte un veredicto real.
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Contenido a analizar
              </CardTitle>
              <CardDescription>
                Puedes usar ejemplos rápidos:
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => form.setValue("input", ex)}
                    className="text-[10px] px-3 py-1 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition-all border border-border"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input">Texto del artículo o noticia</Label>
                <Textarea
                  id="input"
                  placeholder="Pega aquí el texto que quieres analizar..."
                  className="min-h-[250px] resize-none focus-visible:ring-primary"
                  {...form.register("input")}
                />
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className={form.formState.errors.input ? "text-destructive" : "text-muted-foreground"}>
                      {form.formState.errors.input?.message || "Progreso de escritura"}
                    </span>
                    <span className="text-muted-foreground">
                      {inputValue.length} / 5000
                    </span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300",
                        inputValue.length < 20 ? "bg-destructive w-[10%]" : "bg-primary w-full",
                        inputValue.length >= 20 && `w-[${Math.min((inputValue.length / 5000) * 100, 100)}%]`
                      )}
                      style={{ width: `${Math.min((Math.max(inputValue.length, 5) / 5000) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button 
                type="submit" 
                size="lg" 
                className="gap-2"
                disabled={createAnalysisMutation.isPending}
              >
                {createAnalysisMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Iniciar análisis
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h3 className="font-medium text-sm mb-1">Extracción</h3>
            <p className="text-xs text-muted-foreground">Extraemos automáticamente las afirmaciones clave del texto.</p>
          </div>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
            <h3 className="font-medium text-sm mb-1">Verificación</h3>
            <p className="text-xs text-muted-foreground">Contrastamos cada dato con nuestra base de conocimiento y web.</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h3 className="font-medium text-sm mb-1">Veredicto</h3>
            <p className="text-xs text-muted-foreground">Obtén un informe detallado con puntuación de confianza.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
