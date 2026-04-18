import { cn } from "@/lib/utils";
import { Check, X, Minus, ExternalLink } from "lucide-react";

export interface Source {
  domain: string;
  title: string;
  relevance: number;
  stance: "supports" | "contradicts" | "neutral";
  url?: string;
}

interface SourceItemProps {
  source: Source;
  className?: string;
}

export function SourceItem({ source, className }: SourceItemProps) {
  const stanceConfig = {
    supports: { icon: Check, color: "text-accent", label: "Apoya" },
    contradicts: { icon: X, color: "text-destructive", label: "Contradice" },
    neutral: { icon: Minus, color: "text-muted-foreground", label: "Neutral" },
  };

  const cfg = stanceConfig[source.stance];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">[{source.domain}]</span>
        </div>
        <div className="flex items-center gap-1.5 group/link">
          <p className="text-sm text-foreground truncate flex-1">
            {source.url ? (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center gap-1.5"
              >
                {source.title}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
              </a>
            ) : source.title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1 flex-1 max-w-[100px] rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${source.relevance * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{source.relevance.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
