import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    Sse,
    MessageEvent,
    ParseUUIDPipe,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalysisService } from './analysis.service';
import { CreateAnalysisDto } from './DTO/create-analysis.dto';
import { AnalysisStatus } from './analysis.entity';
import {
    AnalysisStatusEvent,
    ANALYSIS_STATUS_EVENT,
} from './events/analysis-status.event';

@Controller('analysis')
@UseGuards(JwtAuthGuard) // Todos los endpoints de análisis requieren login
export class AnalysisController {
    /**
     * Map de Subjects activos: analysisId → Subject de RxJS.
     * Cada Subject es un canal SSE abierto con un cliente específico.
     * Cuando el Processor emite un evento, buscamos el Subject del análisis
     * y le empujamos el dato — el cliente lo recibe instantáneamente.
     *
     * Map en lugar de un Subject global para soportar múltiples análisis
     * simultáneos de diferentes usuarios sin mezclar los streams.
     */
    private readonly streams = new Map<string, Subject<MessageEvent>>();

    constructor(private readonly analysisService: AnalysisService) { }

    // POST /api/v1/analysis
    @Post()
    async create(
        @Request() req: { user: { id: string } },
        @Body() dto: CreateAnalysisDto,
    ) {
        const analysis = await this.analysisService.create(req.user.id, dto);
        return {
            message: 'Análisis iniciado',
            analysisId: analysis.id,
            status: analysis.status,
        };
    }

    /**
     * GET /api/v1/analysis/:id/stream
     * @Sse convierte este endpoint en un Server-Sent Events stream.
     * El cliente lo abre una vez y recibe eventos push del servidor.
     *
     * SSE vs WebSockets: SSE es unidireccional (servidor → cliente), más simple,
     * funciona sobre HTTP normal, y es perfecto para este caso donde el cliente
     * solo necesita escuchar el progreso, no enviar datos.
     *
     * ParseUUIDPipe valida que el :id es un UUID válido antes de continuar.
     */
    @Sse(':id/stream')
    streamStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: { user: { id: string } },
    ): Observable<MessageEvent> {
        const subject = new Subject<MessageEvent>();
        this.streams.set(id, subject);

        /**
         * Replay asíncrono: consultamos la BD al momento de conectarse.
         * Usamos una IIFE async para no bloquear el retorno del Observable.
         *
         * El flujo es:
         * - Retornamos el Observable inmediatamente (la conexión SSE queda abierta)
         * - En paralelo, consultamos la BD y emitimos el estado actual
         * - Si ya terminó, cerramos el stream después del replay
         * - Si sigue en proceso, dejamos el stream abierto para eventos futuros
         */
        (async () => {
            try {
                const analysis = await this.analysisService.findOne(id, req.user.id);

                // Emitimos el estado actual como primer evento — el cliente
                // siempre sabe en qué punto está el análisis al conectarse
                subject.next(
                    this.buildMessageEvent(id, analysis.status, this.statusMessage(analysis.status), analysis.result ?? undefined),
                );

                // Si el análisis ya terminó (bien o mal), no tiene sentido
                // dejar el stream abierto — cerramos limpiamente
                if (analysis.status === AnalysisStatus.DONE || analysis.status === AnalysisStatus.FAILED) {
                    subject.complete();
                    this.streams.delete(id);
                }
            } catch {
                // El análisis no existe o no pertenece al usuario
                subject.error({ message: 'Análisis no encontrado' });
                this.streams.delete(id);
            }
        })();

        return new Observable((subscriber) => {
            subject.subscribe(subscriber);
            return () => {
                this.streams.delete(id);
            };
        });
    }

    /**
     * Construye el MessageEvent estándar SSE.
     * Extraído a un método privado para no repetir la estructura
     * en streamStatus y en handleStatusEvent.
     */
    private buildMessageEvent(
        analysisId: string,
        status: AnalysisStatus,
        message: string,
        data?: Record<string, unknown>,
    ): MessageEvent {
        return {
            type: ANALYSIS_STATUS_EVENT,
            data: JSON.stringify({
                analysisId,
                status,
                message,
                data: data ?? null,
                timestamp: new Date().toISOString(),
            }),
        };
    }

    /**
     * Mensaje legible para cada estado.
     * Usado en el replay para que el cliente tenga contexto
     * aunque no haya estado presente cuando el Processor emitió el evento original.
     */
    private statusMessage(status: AnalysisStatus): string {
        const messages: Record<AnalysisStatus, string> = {
            [AnalysisStatus.PENDING]: 'En cola, esperando procesamiento...',
            [AnalysisStatus.EXTRACTING]: 'Extrayendo afirmaciones del texto...',
            [AnalysisStatus.SCRAPING]: 'Buscando fuentes cruzadas...',
            [AnalysisStatus.ANALYZING]: 'Analizando cada afirmación con IA...',
            [AnalysisStatus.SCORING]: 'Calculando puntuación de confianza...',
            [AnalysisStatus.DONE]: 'Análisis completado',
            [AnalysisStatus.FAILED]: 'El análisis encontró un error',
        };
        return messages[status];
    }

    /**
     * @OnEvent escucha el evento emitido por el Processor.
     * NestJS llama a este método automáticamente cada vez que
     * EventEmitter2 emite un 'analysis.status'.
     *
     * Este método NO es un endpoint HTTP — es un listener interno.
     * El decorador lo registra en el EventEmitter al iniciar la app.
     */
    @OnEvent(ANALYSIS_STATUS_EVENT)
    handleStatusEvent(event: AnalysisStatusEvent): void {
        const subject = this.streams.get(event.analysisId);

        if (!subject) return; // El cliente no tiene stream abierto

        subject.next(
            this.buildMessageEvent(event.analysisId, event.status, event.message, event.data),
        );

        // Si el análisis terminó (bien o mal), cerramos el stream
        if (event.status === AnalysisStatus.DONE || event.status === AnalysisStatus.FAILED) {
            subject.complete();
            this.streams.delete(event.analysisId);
        }
    }

    // GET /api/v1/analysis
    @Get()
    findAll(@Request() req: { user: { id: string } }) {
        return this.analysisService.findByUser(req.user.id);
    }

    // GET /api/v1/analysis/:id
    @Get(':id')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: { user: { id: string } },
    ) {
        return this.analysisService.findOne(id, req.user.id);
    }
}