import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Analysis, AnalysisStatus } from './analysis.entity';
import { CreateAnalysisDto } from './DTO/create-analysis.dto';

export const ANALYSIS_QUEUE = 'analysis';

@Injectable()
export class AnalysisService {
    constructor(
        @InjectRepository(Analysis)
        private readonly analysisRepository: Repository<Analysis>,

        /**
         * @InjectQueue inyecta la cola de Bull por nombre.
         * El mismo nombre debe usarse en el módulo (BullModule.registerQueue)
         * y en el Processor (@Processor('analysis')).
         */
        @InjectQueue(ANALYSIS_QUEUE)
        private readonly analysisQueue: Queue,
    ) { }

    async create(userId: string, dto: CreateAnalysisDto): Promise<Analysis> {
        // 1. Persistimos el análisis en BD con estado PENDING
        const analysis = this.analysisRepository.create({
            userId,
            input: dto.input,
            status: AnalysisStatus.PENDING,
            result: null,
            errorMessage: null,
        });
        const saved = await this.analysisRepository.save(analysis);

        /**
         * 2. Encolar el job en Bull (Redis).
         * Bull garantiza que el job se procesa aunque la app se reinicie.
         * Si no usáramos una cola y la app cayera durante el análisis,
         * el usuario nunca recibiría resultado.
         *
         * attempts: 3 → reintenta hasta 3 veces si el Processor falla
         * backoff: espera exponencial entre reintentos (no spamear al microservicio)
         * removeOnComplete: limpia la cola cuando el job termina (ahorramos memoria Redis)
         */
        await this.analysisQueue.add(
            'process',
            { analysisId: saved.id },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true,
                removeOnFail: false, // los fallidos los guardamos para debug
            },
        );

        return saved;
    }

    async findByUser(userId: string): Promise<Analysis[]> {
        return this.analysisRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, userId: string): Promise<Analysis> {
        const analysis = await this.analysisRepository.findOne({
            where: { id, userId }, // userId evita que un usuario vea análisis de otro
        });

        if (!analysis) {
            throw new NotFoundException('Análisis no encontrado');
        }

        return analysis;
    }

    async updateStatus(
        id: string,
        status: AnalysisStatus,
        extras?: { result?: Record<string, unknown>; errorMessage?: string },
    ): Promise<void> {
        const updatePayload: Partial<Analysis> = { status };
        if (extras?.result !== undefined) {
            updatePayload.result = extras.result;
        }
        if (extras?.errorMessage !== undefined) {
            updatePayload.errorMessage = extras.errorMessage;
        }
        await this.analysisRepository.update(id, updatePayload as any);
    }
}