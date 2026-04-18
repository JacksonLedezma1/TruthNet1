import { useQuery } from '@tanstack/react-query';
import * as analysisApi from '../api/analysis.api';

export const useAnalyses = () => {
  return useQuery({
    queryKey: ['analyses'],
    queryFn: analysisApi.getAnalyses,
  });
};

export const useAnalysis = (id: string | undefined) => {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisApi.getAnalysisById(id!),
    enabled: !!id,
  });
};
