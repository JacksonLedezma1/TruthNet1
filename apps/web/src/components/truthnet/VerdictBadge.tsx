import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Info } from "lucide-react";

export type VerdictType = 
  | 'TRUE' 
  | 'FALSE' 
  | 'PARTIALLY_TRUE' 
  | 'PARTIALLY_FALSE' 
  | 'UNVERIFIABLE' 
  | 'MISLEADING' 
  | 'INACCURATE'
  | 'FAILED'
  | "verified" | "misleading" | "false" | "unverifiable" | "suspicious" | "failed";

const verdictConfig: Record<string, { label: string; classes: string }> = {
  // Backend types
  // Backend types
  'TRUE': { label: "VERIFICADO", classes: "bg-gradient-to-r from-accent to-emerald-500 text-white border-accent shadow-[0_0_15px_rgba(var(--color-accent),0.4)]" },
  'FALSE': { label: "FALSO", classes: "bg-destructive text-white border-destructive" },
  'PARTIALLY_TRUE': { label: "PARCIALMENTE VERDADERO", classes: "bg-warning text-black border-warning" },
  'PARTIALLY_FALSE': { label: "PARCIALMENTE FALSO", classes: "bg-warning text-black border-warning" },
  'UNVERIFIABLE': { label: "NO VERIFICABLE", classes: "bg-unverifiable text-white border-unverifiable" },
  'MISLEADING': { label: "ENGAÑOSO", classes: "bg-warning text-black border-warning" },
  'INACCURATE': { label: "INEXACTO", classes: "bg-destructive text-white border-destructive" },
  'FAILED': { label: "FALLIDO", classes: "bg-muted text-muted-foreground border-border" },
  
  // Legacy types
  verified: { label: "VERIFICADO", classes: "bg-gradient-to-r from-accent to-emerald-500 text-white border-accent shadow-[0_0_15px_rgba(var(--color-accent),0.4)]" },
  misleading: { label: "ENGAÑOSO", classes: "bg-warning text-black border-warning" },
  false: { label: "FALSO", classes: "bg-destructive text-white border-destructive" },
  unverifiable: { label: "NO VERIFICABLE", classes: "bg-unverifiable text-white border-unverifiable" },
  suspicious: { label: "SOSPECHOSO", classes: "bg-warning text-black border-warning" },
};

interface VerdictBadgeProps {
  verdict: VerdictType;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function VerdictBadge({ verdict, className, size = "md" }: VerdictBadgeProps) {
  const config = verdictConfig[verdict] || { 
    label: verdict?.toString() || "DESCONOCIDO", 
    classes: "bg-muted text-muted-foreground border-border" 
  };
  
  const iconMap: Record<string, any> = {
    'TRUE': CheckCircle2,
    'verified': CheckCircle2,
    'FALSE': XCircle,
    'false': XCircle,
    'INACCURATE': XCircle,
    'MISLEADING': AlertTriangle,
    'misleading': AlertTriangle,
    'suspicious': AlertTriangle,
    'PARTIALLY_TRUE': Info,
    'PARTIALLY_FALSE': Info,
    'UNVERIFIABLE': HelpCircle,
    'unverifiable': HelpCircle,
  };

  const Icon = iconMap[verdict] || Info;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
    xl: "text-xl px-10 py-3 shadow-[0_0_30px_rgba(var(--color-primary),0.3)] border-2 gap-3",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
    xl: "w-6 h-6",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold font-mono tracking-wider",
        config.classes,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}
