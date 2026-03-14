import { AnalysisStatus } from '../analysis.entity';

/**
 * Evento que viaja a través del EventEmitter interno de NestJS.
 * El Processor lo emite → el Controller lo recibe → lo envía por SSE al cliente.
 *
 * Usamos una clase en lugar de un objeto plano para tener tipado completo
 * y poder agregar métodos en el futuro si es necesario.
 */
export class AnalysisStatusEvent {
    constructor(
        public readonly analysisId: string,
        public readonly status: AnalysisStatus,
        public readonly message: string,
        public readonly data?: Record<string, unknown>,
    ) { }
}

// Nombre del evento — constante para evitar strings mágicos en el código
export const ANALYSIS_STATUS_EVENT = 'analysis.status';