import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { VerdictBadge, type VerdictType } from "./VerdictBadge";
import { SourceItem, type Source } from "./SourceItem";
import { motion, AnimatePresence } from "framer-motion";

export interface Claim {
  id: string;
  text: string;
  verdict: VerdictType;
  score: number;
  explanation: string;
  sources: any[]; // Generalized for now, can be Source[] if updated
}

interface ClaimCardProps {
  claim: Claim;
  className?: string;
}

const borderColors: Record<string, string> = {
  // Backend types
  'TRUE': "border-l-accent",
  'FALSE': "border-l-destructive",
  'PARTIALLY_TRUE': "border-l-warning",
  'PARTIALLY_FALSE': "border-l-warning",
  'UNVERIFIABLE': "border-l-unverifiable",
  'MISLEADING': "border-l-warning",
  'INACCURATE': "border-l-destructive",
  
  // Legacy types
  verified: "border-l-accent",
  misleading: "border-l-warning",
  false: "border-l-destructive",
  unverifiable: "border-l-unverifiable",
  suspicious: "border-l-warning",
};

export function ClaimCard({ claim, className }: ClaimCardProps) {
  const [open, setOpen] = useState(false);

  const supporting = claim.sources.filter((s) => s.stance === "supports");
  const contradicting = claim.sources.filter((s) => s.stance === "contradicts");
  const neutral = claim.sources.filter((s) => s.stance === "neutral");

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card overflow-hidden border-l-4 animate-fade-in-up",
        borderColors[claim.verdict],
        className
      )}
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <VerdictBadge verdict={claim.verdict} size="sm" />
          <span className="font-mono text-sm font-bold text-foreground">
            {claim.score}<span className="text-muted-foreground font-normal">/100</span>
          </span>
        </div>

        {/* Claim text */}
        <p className="text-sm text-foreground leading-relaxed mb-2">"{claim.text}"</p>

        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">{claim.explanation}</p>

        {/* Sources toggle */}
        {claim.sources.length > 0 && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary-hover transition-colors"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
            Ver fuentes ({claim.sources.length})
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 border-t border-border pt-3 space-y-3">
              {supporting.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-accent mb-1">Fuentes que apoyan:</p>
                  {supporting.map((s, i) => <SourceItem key={i} source={s} />)}
                </div>
              )}
              {contradicting.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Fuentes que contradicen:</p>
                  {contradicting.map((s, i) => <SourceItem key={i} source={s} />)}
                </div>
              )}
              {neutral.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fuentes neutrales:</p>
                  {neutral.map((s, i) => <SourceItem key={i} source={s} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
