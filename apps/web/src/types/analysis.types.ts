export enum AnalysisStatus {
  PENDING = 'PENDING',
  EXTRACTING = 'EXTRACTING',
  SCRAPING = 'SCRAPING',
  ANALYZING = 'ANALYZING',
  SCORING = 'SCORING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export type VerdictType = 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'PARTIALLY_FALSE' | 'UNVERIFIABLE' | 'MISLEADING' | 'INACCURATE';

export interface AnalysisSource {
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
  stance: "supports" | "contradicts" | "neutral";
}

export interface AnalysisClaim {
  id: string;
  claim_text: string;
  verdict: VerdictType;
  explanation: string;
  confidence_score: number;
  sources: AnalysisSource[];
}

export interface AnalysisResult {
  overall_score: number;
  overallScore?: number;
  overall_verdict: VerdictType;
  overallVerdict?: VerdictType;
  summary: string;
  claims?: AnalysisClaim[];
  claim_verdicts?: AnalysisClaim[];
  claimVerdicts?: AnalysisClaim[];
}

export interface Analysis {
  id: string;
  input: string;
  status: AnalysisStatus;
  userId: string;
  result: AnalysisResult | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisStatusEvent {
  analysisId: string;
  status: AnalysisStatus;
  message: string;
  data?: any;
  timestamp: string;
}

export interface CreateAnalysisDto {
  input: string;
}
