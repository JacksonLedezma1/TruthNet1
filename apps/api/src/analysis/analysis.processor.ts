import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bull';
import { AnalysisService } from './analysis.service';
import { AnalyzerClientService } from './analyzer-client.service';
import { AnalysisStatus } from './analysis.entity';
import {
    AnalysisStatusEvent,
    ANALYSIS_STATUS_EVENT,
} from './events/analysis-status.event';

interface AnalysisJobData {
    analysisId: string;
    input: string; // Pasamos el input en el job para no hacer un SELECT extra
}

@Processor('analysis')
export class AnalysisProcessor {
    private readonly logger = new Logger(AnalysisProcessor.name);

    constructor(
        private readonly analysisService: AnalysisService,
        private readonly analyzerClient: AnalyzerClientService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    @Process('process')
    async handleAnalysis(job: Job<AnalysisJobData>): Promise<void> {
        const { analysisId, input } = job.data;
        this.logger.log(`Iniciando análisis ${analysisId}`);

        try {
            // ── Paso 1: EXTRACTING ──────────────────────────────────────────────
            await this.emitAndUpdate(analysisId, AnalysisStatus.EXTRACTING, 'Extrayendo afirmaciones del texto...');
            await job.progress(20);

            const { claims, language_bias_score, bias_indicators } =
                await this.analyzerClient.extractClaims(input);

            this.logger.log(`${claims.length} claims extraídos para ${analysisId}`);

            // ── Paso 2: SCRAPING ────────────────────────────────────────────────
            await this.emitAndUpdate(analysisId, AnalysisStatus.SCRAPING, 'Buscando fuentes cruzadas...');
            await job.progress(45);

            const { sources_by_claim } = await this.analyzerClient.searchSources(claims);

            // ── Paso 3: ANALYZING ───────────────────────────────────────────────
            await this.emitAndUpdate(analysisId, AnalysisStatus.ANALYZING, 'Analizando cada afirmación con IA...');
            await job.progress(70);

            const verdict = await this.analyzerClient.analyzeVerdict(
                input,
                claims,
                sources_by_claim,
            );

            // ── Paso 4: SCORING ─────────────────────────────────────────────────
            await this.emitAndUpdate(analysisId, AnalysisStatus.SCORING, 'Calculando puntuación de confianza...');
            await job.progress(90);

            // Ensamblamos el resultado final que se guarda en la BD
            const result = {
                overallScore: verdict.overall_score,
                overallVerdict: verdict.overall_verdict,
                summary: verdict.summary,
                claimVerdicts: verdict.claim_verdicts,
                metadata: {
                    totalClaims: claims.length,
                    languageBiasScore: language_bias_score,
                    biasIndicators: bias_indicators,
                    analyzedAt: new Date().toISOString(),
                },
            };

            // ── Paso 5: DONE ────────────────────────────────────────────────────
            await this.analysisService.updateStatus(analysisId, AnalysisStatus.DONE, { result });
            await this.emitAndUpdate(analysisId, AnalysisStatus.DONE, 'Análisis completado', result);
            await job.progress(100);

            this.logger.log(`Análisis ${analysisId} completado. Score: ${verdict.overall_score}`);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Análisis ${analysisId} falló: ${message}`);

            await this.analysisService.updateStatus(analysisId, AnalysisStatus.FAILED, {
                errorMessage: message,
            });
            await this.emitAndUpdate(analysisId, AnalysisStatus.FAILED, `Error: ${message}`);

            throw error; // Bull necesita que relancemos para activar los reintentos
        }
    }

    private async emitAndUpdate(
        analysisId: string,
        status: AnalysisStatus,
        message: string,
        data?: Record<string, unknown>,
    ): Promise<void> {
        // Actualizamos BD y emitimos el evento al SSE en paralelo
        await Promise.all([
            this.analysisService.updateStatus(analysisId, status),
            Promise.resolve(
                this.eventEmitter.emit(
                    ANALYSIS_STATUS_EVENT,
                    new AnalysisStatusEvent(analysisId, status, message, data),
                ),
            ),
        ]);
    }
}