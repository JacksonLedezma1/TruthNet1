import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as analysisApi from '../api/analysis.api';
import { useToast } from './use-toast';
import { CreateAnalysisDto } from '../types/analysis.types';

export const useAnalysisMutations = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createAnalysisMutation = useMutation({
    mutationFn: (data: CreateAnalysisDto) => analysisApi.createAnalysis(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast({
        title: 'Análisis iniciado',
        description: 'Estamos procesando tu solicitud...',
      });
      navigate(`/analysis/${data.analysisId}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al crear análisis',
        description: error.response?.data?.message || 'Algo salió mal',
        variant: 'destructive',
      });
    },
  });

  return {
    createAnalysisMutation,
  };
};
