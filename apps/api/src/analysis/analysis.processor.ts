import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bull';
import { AnalysisService } from './analysis.service';
import { AnalysisStatus } from './analysis.entity';
import {
    AnalysisStatusEvent,
    ANALYSIS_STATUS_EVENT,
} from './events/analysis-status.event';

interface AnalysisJobData {
    analysisId: string;
}

/**
 * @Processor('analysis') registra esta clase como el worker de la cola 'analysis'.
 * Bull la instancia automáticamente y le entrega los jobs de la cola.
 *
 * El Processor corre en el mismo proceso de Node.js pero de forma asíncrona,
 * sin bloquear el event loop del servidor HTTP.
 */
@Processor('analysis')
export class AnalysisProcessor {
    private readonly logger = new Logger(AnalysisProcessor.name);

    constructor(
        private readonly analysisService: AnalysisService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * @Process('process') maneja los jobs que lleguen con el nombre 'process'.
     * El mismo nombre que usamos en analysisQueue.add('process', ...) en el service.
     */
    @Process('process')
    async handleAnalysis(job: Job<AnalysisJobData>): Promise<void> {
        const { analysisId } = job.data;
        this.logger.log(`Procesando análisis ${analysisId}`);

        try {
            // ── Paso 1: EXTRACTING ──────────────────────────────────────────────
            await this.emitStatus(analysisId, AnalysisStatus.EXTRACTING, 'Extrayendo afirmaciones del texto...');
            await job.progress(20);
            // TODO Fase 2: llamar a Python → extractClaims(analysisId)
            await this.simulateWork(1500); // placeholder hasta tener Python

            // ── Paso 2: SCRAPING ────────────────────────────────────────────────
            await this.emitStatus(analysisId, AnalysisStatus.SCRAPING, 'Buscando fuentes cruzadas...');
            await job.progress(45);
            // TODO Fase 2: llamar a Python → scrapeSources(analysisId)
            await this.simulateWork(2000);

            // ── Paso 3: ANALYZING ───────────────────────────────────────────────
            await this.emitStatus(analysisId, AnalysisStatus.ANALYZING, 'Analizando cada afirmación con IA...');
            await job.progress(70);
            // TODO Fase 2: llamar a Python → analyzeClaims(analysisId)
            await this.simulateWork(2000);

            // ── Paso 4: SCORING ─────────────────────────────────────────────────
            await this.emitStatus(analysisId, AnalysisStatus.SCORING, 'Calculando puntuación de confianza...');
            await job.progress(90);
            await this.simulateWork(1000);

            // ── Paso 5: DONE ────────────────────────────────────────────────────
            const mockResult = {
                overallScore: 72,
                claims: [],
                completedAt: new Date().toISOString(),
            };

            await this.analysisService.updateStatus(analysisId, AnalysisStatus.DONE, {
                result: mockResult,
            });

            await this.emitStatus(analysisId, AnalysisStatus.DONE, 'Análisis completado', mockResult);
            await job.progress(100);

            this.logger.log(`Análisis ${analysisId} completado`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Análisis ${analysisId} falló: ${message}`);

            await this.analysisService.updateStatus(analysisId, AnalysisStatus.FAILED, {
                errorMessage: message,
            });

            await this.emitStatus(analysisId, AnalysisStatus.FAILED, `Error: ${message}`);

            // Re-lanzamos el error para que Bull registre el job como fallido
            // y active el mecanismo de reintentos (attempts: 3 en el service)
            throw error;
        }
    }

    /**
     * Emite el evento al EventEmitter interno de NestJS.
     * El Controller está suscrito a este evento y lo reenvía por SSE al cliente.
     * Desacoplamiento: el Processor no sabe nada del SSE.
     */
    private async emitStatus(
        analysisId: string,
        status: AnalysisStatus,
        message: string,
        data?: Record<string, unknown>,
    ): Promise<void> {
        const event = new AnalysisStatusEvent(analysisId, status, message, data);
        this.eventEmitter.emit(ANALYSIS_STATUS_EVENT, event);

        // También actualizamos la BD para que el estado persista
        // (si el usuario recarga la página, puede ver el último estado conocido)
        await this.analysisService.updateStatus(analysisId, status);
    }

    /**
     * Simula trabajo asíncrono mientras no tenemos el microservicio Python.
     * Se elimina en la Fase 2 cuando conectamos las llamadas HTTP reales.
     */
    private simulateWork(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}