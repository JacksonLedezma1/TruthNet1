import { useState, useEffect, useCallback } from 'react';
import { AnalysisStatus, AnalysisResult, AnalysisStatusEvent } from '../types/analysis.types';
import { getAccessToken } from '../api/client';
import { getAnalysisStreamUrl } from '../api/analysis.api';

interface UseAnalysisStreamReturn {
  status: AnalysisStatus | null;
  message: string;
  result: AnalysisResult | null;
  isConnected: boolean;
  error: string | null;
}

export const useAnalysisStream = (analysisId: string | undefined): UseAnalysisStreamReturn => {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [message, setMessage] = useState('Conectando...');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;

    const token = getAccessToken();
    const url = new URL(getAnalysisStreamUrl(analysisId));
    if (token) {
      url.searchParams.append('token', token);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.addEventListener('analysis.status', (event) => {
      const payload: AnalysisStatusEvent = JSON.parse(event.data);
      setStatus(payload.status);
      setMessage(payload.message);
      
      if (payload.data) {
        setResult(payload.data as AnalysisResult);
      }

      if (payload.status === AnalysisStatus.DONE || payload.status === AnalysisStatus.FAILED) {
        eventSource.close();
        setIsConnected(false);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setError('Error en la conexión en tiempo real');
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [analysisId]);

  return {
    status,
    message,
    result,
    isConnected,
    error,
  };
};
