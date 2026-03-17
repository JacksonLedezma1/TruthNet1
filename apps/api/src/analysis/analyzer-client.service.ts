import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Tipos que reflejan exactamente los schemas de Pydantic del microservicio Python.
 * Si cambias un schema en Python, debes actualizarlo aquí también.
 * En la Fase 4 estos tipos se moverán a packages/types/ para compartirlos con Next.js.
 */
export interface Claim {
    id: string;
    text: string;
    entities: string[];
    claim_type: string;
    verifiable: boolean;
}

export interface Source {
    url: string;
    title: string;
    snippet: string;
    relevance_score: number;
    supports_claim: boolean | null;
}

export interface ClaimExtractResponse {
    claims: Claim[];
    total: number;
    language_bias_score: number;
    bias_indicators: string[];
}

export interface SourceSearchResponse {
    sources_by_claim: Record<string, Source[]>;
}

export interface ClaimVerdict {
    claim_id: string;
    claim_text: string;
    confidence_score: number;
    verdict: string;
    explanation: string;
    supporting_sources: string[];
    contradicting_sources: string[];
}

export interface VerdictResponse {
    overall_score: number;
    overall_verdict: string;
    claim_verdicts: ClaimVerdict[];
    summary: string;
}

@Injectable()
export class AnalyzerClientService {
    private readonly logger = new Logger(AnalyzerClientService.name);
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('ANALYZER_URL', 'http://localhost:8000');
    }

    /**
     * Paso 1 — EXTRACTING
     * Llama a Python para extraer claims verificables del texto.
     */
    async extractClaims(text: string): Promise<ClaimExtractResponse> {
        return this.post<ClaimExtractResponse>('/claims/extract', { text });
    }

    /**
     * Paso 2 — SCRAPING
     * Llama a Python para buscar fuentes cruzadas por cada claim.
     */
    async searchSources(
        claims: Claim[],
        maxSourcesPerClaim = 3,
    ): Promise<SourceSearchResponse> {
        return this.post<SourceSearchResponse>('/sources/search', {
            claims,
            max_sources_per_claim: maxSourcesPerClaim,
        });
    }

    /**
     * Pasos 3 y 4 — ANALYZING + SCORING
     * Llama a Python para que el LLM evalúe cada claim contra sus fuentes
     * y genere el veredicto final con scores.
     */
    async analyzeVerdict(
        originalText: string,
        claims: Claim[],
        sourcesByClaim: Record<string, Source[]>,
    ): Promise<VerdictResponse> {
        return this.post<VerdictResponse>('/verdict/analyze', {
            original_text: originalText,
            claims,
            sources_by_claim: sourcesByClaim,
        });
    }

    /**
     * Health check: NestJS verifica que Python está vivo antes de encolar jobs.
     * Si el microservicio no responde, fallamos rápido con un error claro.
     */
    async isHealthy(): Promise<boolean> {
        try {
            await this.post<{ status: string }>('/health', {});
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Método privado que centraliza todas las llamadas HTTP.
     * Ventaja: el manejo de errores y el logging están en un solo lugar.
     * Si mañana queremos agregar retry logic o timeouts, solo cambiamos aquí.
     */
    private async post<T>(path: string, body: unknown): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        try {
            const response = await firstValueFrom(
                this.httpService.post<T>(url, body, {
                    timeout: 60000, // 60s — el scraping y el LLM pueden tardar
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
            return response.data;

        } catch (error) {
            /**
             * AxiosError tiene información detallada del fallo HTTP.
             * La separamos del caso de error de red (sin respuesta del servidor).
             */
            if (error instanceof AxiosError) {
                const status = error.response?.status;
                const detail = error.response?.data?.detail ?? error.message;

                this.logger.error(`Error llamando a Python ${path}: [${status}] ${detail}`);
                throw new InternalServerErrorException(
                    `El microservicio de análisis falló: ${detail}`,
                );
            }

            this.logger.error(`Error de red con Python ${path}: ${error}`);
            throw new InternalServerErrorException(
                'No se pudo conectar con el microservicio de análisis',
            );
        }
    }
}