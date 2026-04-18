import { cn } from "@/lib/utils";
import { VerdictBadge, type VerdictType } from "./VerdictBadge";
import { ScoreCircle } from "./ScoreCircle";
import { useNavigate } from "react-router-dom";

export interface AnalysisItem {
  id: string;
  text: string;
  verdict: VerdictType;
  score: number;
  claimCount: number;
  timeAgo: string;
}

interface AnalysisCardProps {
  analysis: AnalysisItem;
  className?: string;
}

export function AnalysisCard({ analysis, className }: AnalysisCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/analysis/${analysis.id}`)}
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 cursor-pointer transition-all hover:border-primary/30 group",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <ScoreCircle score={analysis.score} size={56} strokeWidth={5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <VerdictBadge verdict={analysis.verdict} size="sm" />
          </div>
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{analysis.text}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {analysis.timeAgo} · {analysis.claimCount} claims
          </p>
        </div>
      </div>
    </div>
  );
}
