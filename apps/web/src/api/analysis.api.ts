import apiClient from './client';
import { Analysis, CreateAnalysisDto } from '../types/analysis.types';

export const createAnalysis = async (data: CreateAnalysisDto): Promise<{ analysisId: string; status: string }> => {
  const response = await apiClient.post<{ analysisId: string; status: string }>('/analysis', data);
  return response.data;
};

export const getAnalyses = async (): Promise<Analysis[]> => {
  const response = await apiClient.get<Analysis[]>('/analysis');
  return response.data;
};

export const getAnalysisById = async (id: string): Promise<Analysis> => {
  const response = await apiClient.get<Analysis>(`/analysis/${id}`);
  return response.data;
};

export const getAnalysisStreamUrl = (id: string): string => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
  return `${API_URL}/analysis/${id}/stream`;
};
