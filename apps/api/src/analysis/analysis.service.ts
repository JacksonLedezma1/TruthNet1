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
        @InjectQueue(ANALYSIS_QUEUE)
        private readonly analysisQueue: Queue,
    ) { }

    async create(userId: string, dto: CreateAnalysisDto): Promise<Analysis> {
        const analysis = this.analysisRepository.create({
            userId,
            input: dto.input,
            status: AnalysisStatus.PENDING,
            result: null,
            errorMessage: null,
        });
        const saved = await this.analysisRepository.save(analysis);

        await this.analysisQueue.add(
            'process',
            /**
             * Pasamos el input directamente en el job data.
             * Así el Processor no necesita hacer un SELECT a la BD
             * solo para obtener el texto — ya lo tiene en el job.
             * Pequeña optimización que evita una query innecesaria.
             */
            { analysisId: saved.id, input: saved.input },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true,
                removeOnFail: false,
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
            where: { id, userId },
        });

        if (!analysis) {
            throw new NotFoundException('Análisis no encontrado');
        }

        return analysis;
    }

    async updateStatus(
        id: string,
        status: AnalysisStatus,
        extras?: { result?: Record<string, unknown>; errorMessage?: string | null },
    ): Promise<void> {
        await this.analysisRepository.update(id, {
            status,
            ...extras,
        } as any);
    }
}